const express = require("express");
const { Op } = require("sequelize");
const createError = require("http-errors");
const { authenticate } = require("../middleware/auth");
const { BrandMatch, SystemEvent, User } = require("../db/sequelize");
const { suggestBrandsFromNiche, suggestBrandsFromMultipleNiches, generateBrandsFromCreatorProfile } = require("../services/OpenAIService");

const router = express.Router();

async function getBrandMatchLimit(user) {
  switch (user.plan) {
    case 'free':
      return 3;
    case 'starter':
      return 15;
    case 'pro':
      return 40;
    case 'vip':
      return Infinity;
    default:
      return 3;
  }
}

async function enforceBrandMatchLimit(user) {
  const limit = await getBrandMatchLimit(user);
  if (limit === Infinity) return limit;
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setMonth(end.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);

  const count = await BrandMatch.count({
    where: {
      userId: user.id,
      createdAt: { [Op.between]: [start, end] }
    },
  });

  if (count >= limit) {
    const upgradeMsg = user.plan === 'free' ?
      'Upgrade to Starter for 15 matches, Pro for 40, or VIP for unlimited.' :
      (user.plan === 'starter' ? 'Upgrade to Pro for 40 matches or VIP for unlimited.' : 'Upgrade to VIP for unlimited matches.');
    throw createError(
      402,
      `${user.plan.toUpperCase()} plan limit reached: ${limit} Brand Matches per month. ${upgradeMsg}`
    );
  }
  return limit - count;
}

router.post("/suggest-brands", authenticate, async (req, res, next) => {
  try {
    const { niche, existingBrands = [] } = req.body;
    if (!niche) {
      throw createError(400, "A 'niche' is required to generate suggestions.");
    }
    let creatorProfile = null;
    try {
      const { CreatorProfile } = require('../db/sequelize');
      creatorProfile = await CreatorProfile.findOne({
        where: { user_id: req.user.id }
      });
    } catch (error) {
    }

    let suggestions;
    if (creatorProfile) {
      suggestions = await generateBrandsFromCreatorProfile({
        ...creatorProfile.dataValues,
        top_niches: [niche]
      }, 5, existingBrands);
    } else {
      suggestions = await suggestBrandsFromNiche(niche, 5, existingBrands);
    }

    if (!suggestions || suggestions.length === 0) {
      return res.json({
        message: "AI could not generate suggestions for this niche.",
        data: [],
      });
    }

    await enforceBrandMatchLimit(req.user);

    const createdMatches = [];
    for (const suggestion of suggestions) {
      const match = await BrandMatch.create({
        userId: req.user.id,
        source: creatorProfile ? 'creator_ai_enhanced' : niche,
        brandName: suggestion.brandName || suggestion.name,
        fitReason: suggestion.fitReason || suggestion.description,
        outreachDraft: suggestion.outreachDraft || '',
        status: "draft",
        matchScore: suggestion.matchScore || 0.8,
        // Enhanced AI fields
        dealType: suggestion.dealType || null,
        estimatedRate: suggestion.estimatedRate || null,
        brandCountry: suggestion.brandCountry || null,
        requiresShipping: suggestion.requiresShipping || null,
        brandWebsite: suggestion.brandWebsite || null,
        brandEmail: suggestion.brandEmail || null,
      });
      createdMatches.push(match);
    }

    await SystemEvent.create({
      user_id: req.user.id,
      type: "ai.brands.suggested",
      metadata: { 
        niche, 
        count: createdMatches.length,
        enhanced: !!creatorProfile
      },
    });

    res.status(201).json({
      message: `Successfully generated ${createdMatches.length} brand matches${creatorProfile ? ' using your creator profile' : ''}.`,
      data: createdMatches,
    });
  } catch (e) {
    next(e);
  }
});

router.post("/suggest-brands-from-my-niches", authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    const { existingBrands = [] } = req.body;
    const userNiches = await user.getNiches({ joinTableAttributes: [] });

    if (!userNiches || userNiches.length === 0) {
      throw createError(400, "You must have at least one niche to generate brand suggestions. Please add niches first.");
    }

    const nicheNames = userNiches.map(niche => niche.name);

    let creatorProfile = null;
    try {
      const { CreatorProfile } = require('../db/sequelize');
      creatorProfile = await CreatorProfile.findOne({
        where: { user_id: req.user.id }
      });
    } catch (error) {
      console.error(`Error fetching creator profile for user ${req.user.id}:`, error.message);
    }

    const matchLimit = await getBrandMatchLimit(user);

    let desiredMatches;
    if (matchLimit === Infinity) {
      desiredMatches = 5;
    } else {
      const remainingMatches = await enforceBrandMatchLimit(req.user);
      desiredMatches = Math.min(remainingMatches, matchLimit);
      // Cap per-request generation size for Pro users
      if (user.plan === 'pro') {
        desiredMatches = Math.min(desiredMatches, 10);
      }
    }

    if (desiredMatches <= 0) {
      const upgradeMsg = user.plan === 'free' ?
        'Upgrade to Pro for up to 40 matches or VIP for unlimited matches.' :
        'Upgrade to VIP for unlimited matches.';
      throw createError(402, `${user.plan.toUpperCase()} plan limit reached for this month. ${upgradeMsg}`);
    }

    const existingMatches = await BrandMatch.findAll({
      where: { userId: user.id },
      attributes: ['brandName'],
    });
    const existingBrandNames = new Set(existingMatches.map(match => match.brandName.toLowerCase()));

    let allSuggestions = [];
    let attempts = 0;
    const maxAttempts = 3;
    let totalDuplicatesFiltered = 0;

    while (allSuggestions.length < desiredMatches && attempts < maxAttempts) {
      attempts++;
      const needed = desiredMatches - allSuggestions.length;
      const requestCount = Math.max(needed, Math.min(needed * 2, 10));

      let suggestions;
      try {
        if (creatorProfile) {
          suggestions = await generateBrandsFromCreatorProfile({
            ...creatorProfile.dataValues,
            top_niches: nicheNames
          }, requestCount, existingBrands);
        } else {
          const totalNiches = nicheNames.length;
          const brandsPerNiche = Math.ceil(requestCount / totalNiches);
        suggestions = await suggestBrandsFromMultipleNiches(nicheNames, brandsPerNiche, existingBrands);
        }
      } catch (aiError) {
        console.error(`AI generation attempt ${attempts} failed:`, aiError.message);
        if (attempts >= maxAttempts) {
          console.error('All AI generation attempts failed, returning partial results');
          break;
        }
        continue;
      }

      if (!suggestions || suggestions.length === 0) {
        break;
      }

      const newUniqueSuggestions = suggestions.filter(suggestion => {
        const brandName = (suggestion.brandName || suggestion.name || '').toLowerCase();
        if (existingBrandNames.has(brandName)) {
          totalDuplicatesFiltered++;
          return false;
        }
        existingBrandNames.add(brandName);
        return true;
      });

      allSuggestions.push(...newUniqueSuggestions);

      if (newUniqueSuggestions.length < needed * 0.2) {
        break;
      }

      if (allSuggestions.length >= desiredMatches * 0.8) {
        break;
      }
    }

    const finalSuggestions = allSuggestions.slice(0, desiredMatches);

    if (finalSuggestions.length === 0) {
      return res.json({
        message: "All suggested brands are already in your matches. Try adding new niches for fresh suggestions.",
        data: [],
        userNiches: nicheNames,
        duplicatesFiltered: totalDuplicatesFiltered,
        attemptsUsed: attempts
      });
    }

    const createdMatches = [];
    for (const suggestion of finalSuggestions) {
      const match = await BrandMatch.create({
        userId: req.user.id,
        source: suggestion.sourceNiche || 'creator_ai_enhanced',
        brandName: suggestion.brandName || suggestion.name,
        fitReason: suggestion.fitReason || suggestion.description,
        outreachDraft: suggestion.outreachDraft || '',
        status: "draft",
        matchScore: suggestion.matchScore || 0.8,
        dealType: suggestion.dealType || null,
        estimatedRate: suggestion.estimatedRate || null,
        brandCountry: suggestion.brandCountry || null,
        requiresShipping: suggestion.requiresShipping || null,
        brandWebsite: suggestion.brandWebsite || null,
        brandEmail: suggestion.brandEmail || null,
      });
      createdMatches.push(match);
    }

    await SystemEvent.create({
      user_id: req.user.id,
      type: "brand_match.generated",
      metadata: {
        niches: nicheNames,
        desiredMatches,
        count: createdMatches.length,
        duplicatesFiltered: totalDuplicatesFiltered,
        attemptsUsed: attempts,
        enhanced: !!creatorProfile
      },
    });

    const duplicateMessage = totalDuplicatesFiltered > 0 
      ? ` (${totalDuplicatesFiltered} duplicates filtered out)`
      : '';

    const enhancedMessage = creatorProfile ? ' using your creator profile' : '';

    res.status(201).json({
      message: `Successfully generated ${createdMatches.length} new brand matches from your ${nicheNames.length} niche(s)${enhancedMessage}${duplicateMessage}.`,
      data: createdMatches,
      userNiches: nicheNames,
      duplicatesFiltered: totalDuplicatesFiltered,
      attemptsUsed: attempts,
      enhanced: !!creatorProfile
    });
  } catch (e) {
    next(e);
  }
});

router.post("/generate-monthly-brand-matches", authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    const { existingBrands = [] } = req.body;
    const userNiches = await user.getNiches({ joinTableAttributes: [] });

    if (!userNiches || userNiches.length === 0) {
      throw createError(400, "You must have at least one niche to generate brand suggestions. Please add niches first.");
    }

    const nicheNames = userNiches.map(niche => niche.name);
    const matchLimit = await getBrandMatchLimit(user);

      let targetMatches;
      if (matchLimit === Infinity) {
        targetMatches = 5;
      } else {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      
      const currentCount = await BrandMatch.count({
        where: { 
          userId: user.id, 
          createdAt: { [Op.between]: [start, end] }
        },
      });
      
      targetMatches = matchLimit - currentCount;
      // Cap per-request generation size for Pro users
      if (user.plan === 'pro') {
        targetMatches = Math.min(targetMatches, 15);
      }
      
      if (targetMatches <= 0) {
        const upgradeMsg = user.plan === 'free' ? 
          'Upgrade to Pro for up to 15 matches or VIP for unlimited matches.' :
          'Upgrade to VIP for unlimited matches.';
        throw createError(402, `You've already reached your monthly limit of ${matchLimit} brand matches. ${upgradeMsg}`);
      }
    }

    let creatorProfile = null;
    try {
      const { CreatorProfile } = require('../db/sequelize');
      creatorProfile = await CreatorProfile.findOne({
        where: { user_id: req.user.id }
      });
    } catch (error) {
      console.error(`Error fetching creator profile for user ${req.user.id}:`, error.message);
    }

    const existingMatches = await BrandMatch.findAll({
      where: { userId: user.id },
      attributes: ['brandName'],
    });
    const dbBrandNames = existingMatches.map(match => match.brandName.toLowerCase());
    
    const allExistingBrands = [...new Set([
      ...dbBrandNames,
      ...existingBrands.map(name => name.toLowerCase())
    ])];
    const existingBrandNames = new Set(allExistingBrands);

    let createdMatches = [];
    let attempts = 0;
    const maxAttempts = 4;
    let totalDuplicatesFiltered = 0;
    let totalSuggestionsGenerated = 0;

    while (createdMatches.length < targetMatches && attempts < maxAttempts) {
      attempts++;
      
      const needed = targetMatches - createdMatches.length;
      const requestCount = Math.min(needed * 2, 12);
      
      let suggestions;
      try {
        if (creatorProfile) {
          suggestions = await generateBrandsFromCreatorProfile({
            ...creatorProfile.dataValues,
            top_niches: nicheNames
          }, requestCount, existingBrands);
        } else {
          const totalNiches = nicheNames.length;
          const brandsPerNiche = Math.ceil(requestCount / totalNiches);
          suggestions = await suggestBrandsFromMultipleNiches(nicheNames, brandsPerNiche, existingBrands);
        }
      } catch (aiError) {
        console.error(`AI generation attempt ${attempts} failed:`, aiError.message);
        if (attempts >= maxAttempts) {
          console.error('All AI generation attempts failed, returning partial results');
          break;
        }
        continue;
      }

      if (!suggestions || suggestions.length === 0) {
        break;
      }

      totalSuggestionsGenerated += suggestions.length;

      for (const suggestion of suggestions) {
        if (createdMatches.length >= targetMatches) break;
        
        const brandName = (suggestion.brandName || suggestion.name || '').toLowerCase();
        if (!existingBrandNames.has(brandName)) {
          existingBrandNames.add(brandName);
          
          const match = await BrandMatch.create({
            userId: req.user.id,
            source: suggestion.sourceNiche || 'monthly_ai_generation',
            brandName: suggestion.brandName || suggestion.name,
            fitReason: suggestion.fitReason || suggestion.description,
            outreachDraft: suggestion.outreachDraft || '',
            status: "draft",
            matchScore: suggestion.matchScore || 0.8,
            dealType: suggestion.dealType || null,
            estimatedRate: suggestion.estimatedRate || null,
            brandCountry: suggestion.brandCountry || null,
            requiresShipping: suggestion.requiresShipping || null,
            brandWebsite: suggestion.brandWebsite || null,
            brandEmail: suggestion.brandEmail || null,
          });
          createdMatches.push(match);
        } else {
          totalDuplicatesFiltered++;
        }
      }
      if (attempts > 1 && totalDuplicatesFiltered > totalSuggestionsGenerated * 0.6) {
        break;
      }
      if (createdMatches.length >= targetMatches * 0.8) {
        break;
      }
    }

    if (createdMatches.length === 0) {
      return res.json({
        message: "No new unique brand matches could be generated. All suggested brands are already in your matches.",
        data: [],
        duplicatesFiltered: totalDuplicatesFiltered,
        attemptsUsed: attempts,
        totalSuggestionsGenerated
      });
    }

    await SystemEvent.create({
      user_id: req.user.id,
      type: "brand_match.monthly_generated",
      metadata: {
        niches: nicheNames,
        targetMatches,
        count: createdMatches.length,
        duplicatesFiltered: totalDuplicatesFiltered,
        attemptsUsed: attempts,
        totalSuggestionsGenerated,
        enhanced: !!creatorProfile
      },
    });

    const successMessage = createdMatches.length === targetMatches 
      ? `Successfully generated your full quota of ${createdMatches.length} brand matches for this month!`
      : `Generated ${createdMatches.length} new brand matches (${targetMatches - createdMatches.length} fewer than target due to limited unique options).`;

    const duplicateMessage = totalDuplicatesFiltered > 0 
      ? ` ${totalDuplicatesFiltered} duplicates were filtered out to ensure you only get new brands.`
      : '';

    res.status(201).json({
      message: successMessage + duplicateMessage,
      data: createdMatches,
      targetMatches,
      actualMatches: createdMatches.length,
      duplicatesFiltered: totalDuplicatesFiltered,
      attemptsUsed: attempts,
      enhanced: !!creatorProfile
    });
  } catch (e) {
    next(e);
  }
});

router.post("/ai/analytics-insights", authenticate, async (req, res, next) => {
  try {
    const { analyticsData } = req.body;

    if (!analyticsData || !analyticsData.youtube) {
      return res.status(400).json({ error: 'YouTube analytics data is required' });
    }

    const { youtube } = analyticsData;
    const { stats, videos } = youtube;

    const insights = [];

    if (stats.subscriberCount < 1000) {
      insights.push("Focus on consistent content creation to reach the 1,000 subscriber milestone for YouTube monetization.");
    } else if (stats.subscriberCount < 10000) {
      insights.push("Great progress! Consider creating more engaging thumbnails and titles to accelerate growth beyond 10K subscribers.");
    } else {
      insights.push("Excellent subscriber base! Focus on engagement and retention to maximize your reach and impact.");
    }

    if (videos && videos.length > 0) {
      const totalViews = videos.reduce((sum, video) => sum + video.views, 0);
      const avgViews = totalViews / videos.length;
      const avgLikes = videos.reduce((sum, video) => sum + video.likes, 0) / videos.length;
      const engagementRate = avgLikes / avgViews;

      if (engagementRate > 0.04) {
        insights.push("Your videos have excellent engagement rates! Your audience is highly engaged with your content.");
      } else if (engagementRate > 0.02) {
        insights.push("Good engagement on your videos. Consider asking more questions or calls-to-action to boost interaction.");
      } else {
        insights.push("Your engagement could be improved. Try creating more interactive content and responding to comments.");
      }

      const bestVideo = videos.reduce((prev, current) => 
        (prev.views > current.views) ? prev : current
      );

      if (bestVideo) {
        insights.push(`Your best performing recent video "${bestVideo.title}" has ${bestVideo.views.toLocaleString()} views. Analyze what made it successful for future content.`);
      }
    }

    if (videos && videos.length > 0) {
      const daysSinceLastVideo = Math.floor((new Date() - new Date(videos[0].publishedAt)) / (1000 * 60 * 60 * 24));

      if (daysSinceLastVideo > 14) {
        insights.push("It's been a while since your last upload. Consistent posting is key to maintaining audience engagement and growth.");
      } else if (daysSinceLastVideo < 3) {
        insights.push("Great posting frequency! Consistent uploads help maintain audience engagement and improve algorithm visibility.");
      }
    }

    res.json({ insights });
  } catch (e) {
    next(e);
  }
});

router.post("/ai/generate-outreach", authenticate, async (req, res, next) => {
  try {
    const { brandName, brandData } = req.body;
    
    if (!brandName) {
      throw createError(400, "Brand name is required");
    }

    const user = req.user;
    
    const { CreatorProfile } = require("../db/sequelize");
    let creatorProfile = null;
    try {
      creatorProfile = await CreatorProfile.findOne({
        where: { user_id: user.id }
      });
    } catch (error) {
      console.error(`Error fetching creator profile for user ${user.id}:`, error.message);
    }
    
    const { getStoredChannelStats } = require("../services/YouTubeService");
    let youtubeStats = null;
    try {
      youtubeStats = await getStoredChannelStats(user.id);
    } catch (error) {
      console.error(`Error fetching YouTube stats for user ${user.id}:`, error.message);
    }

    const { getLatestUserAnalytics } = require("../services/AnalyticsCollectionService");
    let analyticsData = null;
    try {
      analyticsData = await getLatestUserAnalytics(user.id);
    } catch (error) {
      console.error(`Error fetching analytics data for user ${user.id}:`, error.message);
    }

    const { generatePersonalizedOutreach } = require("../services/OpenAIService");
    const outreach = await generatePersonalizedOutreach({
      brandName,
      brandData,
      user: {
        name: user.name,
        email: user.email,
        plan: user.plan
      },
      creatorProfile: creatorProfile ? creatorProfile.dataValues : null,
      youtubeStats,
      analyticsData
    });

    res.json({ data: outreach });
  } catch (e) {
    next(e);
  }
});

router.post("/ai/generate-reply", authenticate, async (req, res, next) => {
  try {
    const { dealId, brandMessage, context } = req.body;
    if (!dealId || !brandMessage) {
      throw createError(400, "Deal ID and brand message are required");
    }

    const user = req.user;
    const { Deal, Brand } = require("../db/sequelize");
    const deal = await Deal.findByPk(dealId, {
      include: [
        {
          model: Brand,
          as: 'brand',
          attributes: ['name', 'contactInfo', 'description', 'website']
        }
      ]
    });

    if (!deal) {
      throw createError(404, "Deal not found");
    }

    const { CreatorProfile } = require("../db/sequelize");
    let creatorProfile = null;
    try {
      creatorProfile = await CreatorProfile.findOne({
        where: { user_id: user.id }
      });
    } catch (error) {
      console.error(`Error fetching creator profile for user ${user.id}:`, error.message);
    }

    const { getStoredChannelStats } = require("../services/YouTubeService");
    let youtubeStats = null;
    try {
      youtubeStats = await getStoredChannelStats(user.id);
    } catch (error) {
      console.error(`Error fetching YouTube stats for user ${user.id}:`, error.message);
    }

    const { ConversationLog } = require("../db/sequelize");
    let conversationHistory = [];
    try {
      conversationHistory = await ConversationLog.findAll({
        where: { deal_id: dealId },
        order: [['timestamp', 'ASC']],
        limit: 10
      });
    } catch (error) {
      console.error(`Error fetching conversation history for deal ${dealId}:`, error.message);
    }

    const { generateConversationReply } = require("../services/OpenAIService");
    
    const reply = await generateConversationReply({
      deal: {
        id: deal.id,
        title: deal.title,
        status: deal.status,
        proposedAmount: deal.proposed_amount,
        agreedAmount: deal.agreed_amount,
        termsSnapshot: deal.terms_snapshot
      },
      brand: deal.brand ? {
        name: deal.brand.name,
        contactName: deal.brand.contactInfo?.contactPerson || null,
        contactEmail: deal.brand.contactInfo?.email || null,
        description: deal.brand.description,
        website: deal.brand.website
      } : null,
      brandMessage,
      context,
      user: {
        name: user.name,
        email: user.email,
        plan: user.plan
      },
      creatorProfile: creatorProfile ? creatorProfile.dataValues : null,
      youtubeStats,
      conversationHistory: conversationHistory.map(conv => ({
        direction: conv.direction,
        summary: conv.summary,
        timestamp: conv.timestamp,
        disposition: conv.disposition,
        amount: conv.amount,
        terms_delta: conv.terms_delta,
        channel: conv.channel
      }))
    });

    res.json({ 
      reply: reply.reply,
      context: reply.context
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
