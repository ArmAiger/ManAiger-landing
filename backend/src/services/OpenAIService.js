const fetch = require('node-fetch');
const { Headers, Request, Response } = require('node-fetch');
const FormData = require('form-data');

if (!globalThis.fetch) {
  globalThis.fetch = fetch;
  globalThis.Headers = Headers;
  globalThis.Request = Request;
  globalThis.Response = Response;
}

if (!globalThis.FormData) {
  globalThis.FormData = FormData;
}

if (!globalThis.Blob) {
  try {
    const { Blob } = require('blob-polyfill');
    globalThis.Blob = Blob;
  } catch (e) {
    globalThis.Blob = class Blob {
      constructor(parts = [], options = {}) {
        this.size = 0;
        this.type = options.type || '';
      }
    };
  }
}

const OpenAI = require('openai');
const { openai: openaiConfig } = require('../config');

const openai = new OpenAI({
  apiKey: openaiConfig.key,
});

async function suggestBrandsFromNiche(niche, count = 5, existingBrands = []) {
  try {
    if (!niche || typeof niche !== 'string') {
      throw new Error('Niche must be a non-empty string');
    }

    const existingBrandsText = existingBrands.length > 0 
      ? `\n\nIMPORTANT: Do NOT suggest any of these brands as the user already has them: ${existingBrands.join(', ')}`
      : '';

    const prompt = `You are a brand partnership expert. Generate ${count} potential brand partnerships for content creators in the "${niche}" niche.${existingBrandsText}

For each brand, provide:
1. brandName: The actual brand name
2. fitReason: Why this brand is a good fit for ${niche} content creators (2-3 sentences)
3. outreachDraft: A brand-focused outreach message that acknowledges what the brand does, explains how ${niche} content aligns with their target market, and proposes mutual benefit. Keep it professional and concise (100-150 words).
4. matchScore: A score from 1-100 indicating how good the fit is

Focus on:
- Brands that actually exist and are known to work with content creators
- Brands that align with the ${niche} audience
- Include a mix of large brands and niche-specific companies
- Avoid controversial or inappropriate brands
- Outreach messages should lead with the brand, not the creator

CRITICAL: Return ONLY a valid JSON array with exactly ${count} objects. No text, no markdown, no explanations - just the JSON array starting with [ and ending with ].`;

    const completion = await Promise.race([
      openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that generates brand partnership suggestions for content creators. Always respond with valid JSON arrays only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
        max_tokens: 1200,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('OpenAI request timeout after 30 seconds')), 30000)
      )
    ]);

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    let suggestions;
    try {
      suggestions = JSON.parse(response);
    } catch (parseError) {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          suggestions = JSON.parse(jsonMatch[0]);
        } catch (e) {
          // salvage partial objects
          const objectMatches = (jsonMatch[0].match(/\{[\s\S]*?\}/g) || []);
          const partial = [];
          for (const raw of objectMatches) {
            try { partial.push(JSON.parse(raw)); } catch (_) {}
          }
          suggestions = partial;
        }
      } else {
        // salvage partial from entire response
        const objectMatches = (response.match(/\{[\s\S]*?\}/g) || []);
        const partial = [];
        for (const raw of objectMatches) {
          try { partial.push(JSON.parse(raw)); } catch (_) {}
        }
        suggestions = partial;
      }
    }

    if (!Array.isArray(suggestions)) {
      suggestions = [];
    }

    const validSuggestions = suggestions.filter(suggestion => {
      return suggestion.brandName &&
             suggestion.fitReason &&
             suggestion.outreachDraft &&
             typeof suggestion.matchScore === 'number';
    });

    return validSuggestions;

  } catch (error) {
    console.error('Error in suggestBrandsFromNiche:', error);
    // Return empty array to allow caller to continue attempts gracefully
    return [];
  }
}

async function suggestBrandsFromMultipleNiches(niches, brandsPerNiche = 3, existingBrands = []) {
  try {
    const allSuggestions = [];

    for (const niche of niches) {
      try {
        const suggestions = await suggestBrandsFromNiche(niche, brandsPerNiche, existingBrands);
        const suggestionsWithNiche = suggestions.map(suggestion => ({
          ...suggestion,
          sourceNiche: niche
        }));
        allSuggestions.push(...suggestionsWithNiche);

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing niche "${niche}":`, error);
      }
    }

    return allSuggestions;
  } catch (error) {
    console.error('Error in suggestBrandsFromMultipleNiches:', error);
    throw new Error(`Failed to generate brand suggestions for multiple niches: ${error.message}`);
  }
}

async function generatePersonalizedOutreach({ brandName, brandData, user, creatorProfile, youtubeStats, analyticsData }) {
  try {
    let userContext = `Content creator: ${user.name}`;
    
    // Add creator profile information if available
    if (creatorProfile) {
      userContext += `\nCreator Profile:`;
      userContext += `\n- Location: ${creatorProfile.country}`;
      userContext += `\n- Primary Platforms: ${creatorProfile.primary_platforms ? creatorProfile.primary_platforms.join(', ') : 'Not specified'}`;
      
      if (creatorProfile.audience_sizes) {
        const audienceSizes = creatorProfile.audience_sizes;
        const platforms = Object.keys(audienceSizes);
        userContext += `\n- Audience Sizes:`;
        platforms.forEach(platform => {
          const size = audienceSizes[platform];
          if (size) {
            userContext += `\n  • ${platform}: ${size}`;
          }
        });
      }
      
      if (creatorProfile.average_views) {
        const avgViews = creatorProfile.average_views;
        const platforms = Object.keys(avgViews);
        userContext += `\n- Average Views:`;
        platforms.forEach(platform => {
          const views = avgViews[platform];
          if (views) {
            userContext += `\n  • ${platform}: ${views}`;
          }
        });
      }
      
      if (creatorProfile.top_niches && creatorProfile.top_niches.length > 0) {
        userContext += `\n- Content Niches: ${creatorProfile.top_niches.join(', ')}`;
      }
      
      if (creatorProfile.primary_language && creatorProfile.primary_language.length > 0) {
        userContext += `\n- Languages: ${creatorProfile.primary_language.join(', ')}`;
      }
      
      if (creatorProfile.deal_types && creatorProfile.deal_types.length > 0) {
        userContext += `\n- Preferred Deal Types: ${creatorProfile.deal_types.join(', ')}`;
      }
    }
    
    if (youtubeStats) {
      userContext += `\nYouTube Channel Stats:`;
      userContext += `\n- Channel: ${youtubeStats.channelName || 'Not available'}`;
      userContext += `\n- Subscribers: ${youtubeStats.subscriberCount ? Number(youtubeStats.subscriberCount).toLocaleString() : 'Not available'}`;
      userContext += `\n- Total Views: ${youtubeStats.viewCount ? Number(youtubeStats.viewCount).toLocaleString() : 'Not available'}`;
      userContext += `\n- Videos: ${youtubeStats.videoCount ? Number(youtubeStats.videoCount).toLocaleString() : 'Not available'}`;
    }

    if (analyticsData && analyticsData.demographics) {
      userContext += `\nAudience Demographics:`;
      if (analyticsData.demographics.ageGroups) {
        const topAgeGroup = Object.entries(analyticsData.demographics.ageGroups)
          .sort(([,a], [,b]) => b - a)[0];
        if (topAgeGroup) {
          userContext += `\n- Primary Age Group: ${topAgeGroup[0]} (${topAgeGroup[1]}%)`;
        }
      }
      if (analyticsData.demographics.gender) {
        userContext += `\n- Gender Distribution: ${JSON.stringify(analyticsData.demographics.gender)}`;
      }
      if (analyticsData.demographics.countries) {
        const topCountry = Object.entries(analyticsData.demographics.countries)
          .sort(([,a], [,b]) => b - a)[0];
        if (topCountry) {
          userContext += `\n- Top Country: ${topCountry[0]} (${topCountry[1]}%)`;
        }
      }
    }

    // Build brand context
    let brandContext = `Brand: ${brandName}`;
    if (brandData) {
      if (brandData.description) brandContext += `\nDescription: ${brandData.description}`;
      if (brandData.industry) brandContext += `\nIndustry: ${brandData.industry}`;
      if (brandData.targetAudience) brandContext += `\nTarget Audience: ${brandData.targetAudience}`;
      if (brandData.averageCampaignBudget) brandContext += `\nBudget Range: ${brandData.averageCampaignBudget}`;
    }

    const prompt = `You are an expert at writing professional partnership outreach emails for content creators that focus on mutual benefit and brand alignment.

Create a personalized outreach email for the following:

${userContext}

${brandContext}

Email Structure Requirements:
1. START with acknowledging the brand - mention what they do and why you're reaching out specifically to them
2. ALIGNMENT - explain how your content/audience aligns with their brand values, target market, or industry
3. BRIEF STATS - include 2-3 key statistics that matter to brands (audience size, engagement, relevant demographics from the creator profile data above)
4. MUTUAL BENEFIT - clearly articulate what value you can provide to them and how this partnership benefits their goals
5. PROFESSIONAL CLOSE - end with a clear call-to-action and professional sign-off

Content Guidelines:
- Lead with the brand, not yourself
- Show you've researched them and understand their business
- Use the specific platform and audience size information from the creator profile
- Reference the creator's niches and content focus areas
- Mention relevant engagement metrics, not just follower counts
- Focus on ROI and business value for the brand
- Keep it concise (250-350 words max)
- Sound consultative, not just promotional
- Demonstrate industry knowledge and professionalism
- Make sure to mention specific follower counts and platforms from the creator profile data

IMPORTANT: Return ONLY a valid JSON object with this exact structure:
{
  "subject": "A compelling, brand-focused subject line that shows value proposition",
  "message": "The full email body following the structure above"
}

Do not include any additional text, explanations, or code block formatting. Just the raw JSON object.

The email should sound like a business proposal from ${user.name} to ${brandName}, focusing on how this partnership strategically benefits their brand objectives and should reference the specific audience sizes and platforms from the creator profile.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional marketing copywriter who specializes in influencer partnership outreach. You must respond with valid JSON only, no additional text or formatting."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    let outreach;
    try {
      // First try to parse the response directly
      outreach = JSON.parse(response);
    } catch (parseError) {
      try {
        // Try to extract JSON from the response using multiple patterns
        let jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          // Try looking for quoted JSON
          jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            jsonMatch[0] = jsonMatch[1];
          }
        }
        if (!jsonMatch) {
          // Try looking for JSON between any code blocks
          jsonMatch = response.match(/```\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            jsonMatch[0] = jsonMatch[1];
          }
        }
        
        if (jsonMatch) {
          outreach = JSON.parse(jsonMatch[0]);
        } else {
          // If no JSON found, try to create a fallback response
          outreach = {
            subject: `Partnership Opportunity - Let's Collaborate!`,
            message: response.replace(/```json|```/g, '').trim()
          };
        }
      } catch (secondParseError) {
        throw new Error(`Invalid JSON response from OpenAI: ${parseError.message}. Raw response: ${response.substring(0, 200)}...`);
      }
    }

    if (!outreach.subject || !outreach.message) {
      throw new Error('Invalid outreach response format - missing subject or message');
    }

    return outreach;
  } catch (error) {
    console.error('Error generating personalized outreach:', error);
    throw new Error(`Failed to generate personalized outreach: ${error.message}`);
  }
}

async function generateBrandsFromCreatorProfile(creatorProfile, count = 10, existingBrands = []) {
  try {
    const profileContext = `
Creator Profile:
- Location: ${creatorProfile.country} (${creatorProfile.timezone})
- Primary Languages: ${creatorProfile.primary_language.join(', ')}
- Content Languages: ${creatorProfile.content_languages?.length ? creatorProfile.content_languages.join(', ') : 'Same as primary'}
- Platforms: ${creatorProfile.primary_platforms.join(', ')}
- Audience Sizes: ${JSON.stringify(creatorProfile.audience_sizes)}
- Average Views: ${JSON.stringify(creatorProfile.average_views)}
- Top Niches: ${creatorProfile.top_niches.join(', ')} [CURRENT ACTIVE NICHES FOR AI]
- Brand Categories of Interest: ${creatorProfile.brand_categories.join(', ')}
- Preferred Deal Types: ${creatorProfile.deal_types.join(', ')}
- Minimum Rates: ${JSON.stringify(creatorProfile.minimum_rates)}
- Currency: ${creatorProfile.preferred_currency}
- Accepts International Brands: ${creatorProfile.accepts_international_brands}
- Shipping Preferences: ${creatorProfile.shipping_preferences}
`;

    const existingBrandsContext = existingBrands.length > 0 
      ? `\n\nIMPORTANT: The creator already has partnerships/matches with these brands - DO NOT suggest any of these:\n${existingBrands.join(', ')}\n\nOnly suggest NEW brands that are NOT in the above list.`
      : '';

    const prompt = `You are a brand partnership expert specializing in international creator collaborations. 
Generate ${count} highly targeted brand partnership opportunities based on the creator's comprehensive profile using our advanced matching algorithm.

${profileContext}${existingBrandsContext}

CRITICAL MATCHING LOGIC - Follow this exact scoring methodology:

Match Score Calculation (0-100):
match_score = 0.35*geo + 0.25*niche + 0.15*deal_type + 0.15*language_currency + 0.10*rate_fit

Scoring Components:
1. GEOGRAPHIC MATCHING (35% weight - 0-35 points):
   - Same Country: 35 points
   - Same Region: 25 points
   - Global (if creator accepts international): 15 points
   - Global (if creator doesn't accept international): 5 points

2. NICHE MATCHING (25% weight - 0-25 points):
   - Exact niche match: 25 points
   - Adjacent/related category: 15-20 points
   - Somewhat related: 5-10 points

3. DEAL TYPE COMPATIBILITY (15% weight - 0-15 points):
   - Perfect match with creator's preferred types: 15 points
   - Partial compatibility: 8-12 points
   - No compatibility: 0 points

4. LANGUAGE & CURRENCY (15% weight - 0-15 points):
   - Same language + same currency: 15 points
   - Same language OR same currency: 10 points
   - International compatibility: 5-8 points

5. RATE COMPATIBILITY (10% weight - 0-10 points):
   - Above creator's minimum rates: 10 points
   - Meets minimum rates: 8 points
   - Below minimum but negotiable: 5 points
   - Below minimum, non-negotiable: 0 points

For each brand, provide:
1. brandName: An actual brand name that exists and works with creators
2. fitReason: MUST explain the match using the 5 scoring criteria above. Start with the strongest matching factors (geographic, niche, deal type, language/currency, rate fit). Be specific about WHY each factor scores well.
3. outreachDraft: A brand-focused outreach message that: (a) acknowledges what the brand does, (b) explains audience/content alignment, (c) mentions 1-2 key creator stats, (d) articulates mutual benefit and value proposition for the brand. Keep it professional and concise (150-200 words).
4. matchScore: Calculate using the exact formula above (70-100 range only)
5. dealType: The most likely deal type for this brand (from creator's preferred types)
6. estimatedRate: Estimated compensation in creator's preferred currency (consider their minimum rates and audience size)
7. brandCountry: Brand's primary country/region (prioritize creator's country first, then regional matches)
8. requiresShipping: true/false if physical products are involved
9. brandWebsite: Official website URL of the brand
10. brandEmail: Try to find realistic contact emails like partnerships@brandname.com, marketing@brandname.com, or collabs@brandname.com. If uncertain, use "contact@brandname.com"

EXAMPLE fitReason format:
"Perfect geographic match (35/35) as [Brand] is based in [Creator's Country]. Strong niche alignment (22/25) between creator's [niche] content and brand's [category] focus. Excellent deal type compatibility (15/15) with creator's preference for [deal types]. Language and currency alignment (15/15) with [language] content and [currency] payments. Rate compatibility (8/10) with estimated rates meeting creator's minimums."

Focus on:
- PRIORITIZE GEOGRAPHIC MATCHES: First suggest brands from creator's country (${creatorProfile.country}), then regional matches, then international only if creator accepts them
- Only suggest brands scoring 70+ using the formula
- Real brands that actively work with content creators
- Hide offers below creator's minimum rates unless negotiable
- Exact or adjacent niche matches only
- For creators in ${creatorProfile.country}, prioritize local and regional brands that understand the market

CRITICAL: Return ONLY a valid JSON array with exactly ${count} objects. No text, no markdown, no explanations - just the JSON array starting with [ and ending with ].`;

    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a brand partnership specialist with deep knowledge of global creator marketing. CRITICAL: You must respond with ONLY a valid JSON array. No text before or after. No markdown code blocks. No explanations. Just pure JSON starting with [ and ending with ]. Each object must have valid JSON syntax with proper quotes and comma separation."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2200,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('OpenAI request timeout after 45 seconds')), 45000)
      )
    ]);

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    let suggestions;
    try {
      suggestions = JSON.parse(response);
    } catch (parseError) {
      try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          suggestions = JSON.parse(jsonMatch[0]);
        } else {
          const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (codeBlockMatch) {
            suggestions = JSON.parse(codeBlockMatch[1]);
          } else {
            // Attempt salvage: parse individual JSON objects and build a partial array
            const objectMatches = response.match(/\{[\s\S]*?\}/g) || [];
            const partial = [];
            for (const raw of objectMatches) {
              try {
                const obj = JSON.parse(raw);
                partial.push(obj);
              } catch (_) {
                // ignore individual parse failures
              }
            }
            if (partial.length > 0) {
              suggestions = partial;
            } else {
              throw new Error(`Could not extract valid JSON from OpenAI response`);
            }
          }
        }
      } catch (secondParseError) {
        console.error('JSON parsing completely failed:', secondParseError.message);
        // Return empty array to allow caller to continue rather than hard-fail
        return [];
      }
    }

    if (!Array.isArray(suggestions)) {
      console.error('OpenAI response is not an array:', typeof suggestions, suggestions);
      throw new Error('OpenAI response is not an array');
    }

    const validSuggestions = suggestions.filter(suggestion => {
      return suggestion &&
             typeof suggestion === 'object' &&
             (suggestion.brandName || suggestion.name);
    });

    if (validSuggestions.length === 0) {
      console.warn('No valid suggestions found after filtering invalid entries');
      return [];
    }

    const scoredSuggestions = validSuggestions.map(suggestion => {
      const sanitizedSuggestion = {
        brandName: suggestion.brandName || suggestion.name || 'Unknown Brand',
        fitReason: typeof suggestion.fitReason === 'string' ? suggestion.fitReason : 'No description available',
        outreachDraft: typeof suggestion.outreachDraft === 'string' ? suggestion.outreachDraft : '',
        matchScore: typeof suggestion.matchScore === 'number' ? suggestion.matchScore : 70,
        dealType: suggestion.dealType || 'sponsored_post',
        estimatedRate: typeof suggestion.estimatedRate === 'string' ? suggestion.estimatedRate : 
                      typeof suggestion.estimatedRate === 'number' ? `$${suggestion.estimatedRate}` : 
                      '$500',
        brandCountry: suggestion.brandCountry || 'USA',
        requiresShipping: Boolean(suggestion.requiresShipping),
        brandWebsite: suggestion.brandWebsite || '',
        brandEmail: suggestion.brandEmail || '',
        ...suggestion
      };
      
      const matchScore = calculateMatchScore(sanitizedSuggestion, creatorProfile);
      return { ...sanitizedSuggestion, calculatedMatchScore: matchScore };
    });

    return scoredSuggestions
      .sort((a, b) => b.calculatedMatchScore - a.calculatedMatchScore)
      .slice(0, count);

  } catch (error) {
    console.error('Error generating brands from creator profile:', error);
    throw new Error(`Failed to generate brand suggestions: ${error.message}`);
  }
}

function calculateMatchScore(brandSuggestion, creatorProfile) {
  let geoScore = 0;

  const normalizeBrandCountry = brandSuggestion.brandCountry?.toLowerCase().trim();
  const normalizeCreatorCountry = creatorProfile.country?.toLowerCase().trim();

  if (normalizeBrandCountry === normalizeCreatorCountry) {
    geoScore = 35;
  } else if (isRegionalMatch(brandSuggestion.brandCountry, creatorProfile.country)) {
    geoScore = 25;
  } else if (creatorProfile.accepts_international_brands) {
    geoScore = 15;
  } else {
    geoScore = 5;
  }

  // 2. NICHE MATCHING (25 points max)
  let nicheScore = 0;
  const brandNiche = extractBrandNiche(brandSuggestion);
  if (creatorProfile.top_niches.some(niche => niche.toLowerCase() === brandNiche.toLowerCase())) {
    nicheScore = 25; // Exact match
  } else if (creatorProfile.brand_categories.some(category => 
    category.toLowerCase().includes(brandNiche.toLowerCase()) || 
    brandNiche.toLowerCase().includes(category.toLowerCase()))) {
    nicheScore = 20; // Adjacent category
  } else if (isRelatedNiche(brandNiche, creatorProfile.top_niches.concat(creatorProfile.brand_categories))) {
    nicheScore = 10; // Somewhat related
  }

  // 3. DEAL TYPE COMPATIBILITY (15 points max)
  let dealTypeScore = 0;
  if (creatorProfile.deal_types.includes(brandSuggestion.dealType)) {
    dealTypeScore = 15; // Perfect match
  } else if (isCompatibleDealType(brandSuggestion.dealType, creatorProfile.deal_types)) {
    dealTypeScore = 10; // Partial compatibility
  }

  // 4. LANGUAGE & CURRENCY (15 points max)
  let languageCurrencyScore = 0;
  const hasLanguageMatch = hasLanguageCompatibility(brandSuggestion, creatorProfile);
  const hasCurrencyMatch = brandSuggestion.estimatedRate && 
    typeof brandSuggestion.estimatedRate === 'string' &&
    brandSuggestion.estimatedRate.includes(creatorProfile.preferred_currency);
  
  if (hasLanguageMatch && hasCurrencyMatch) {
    languageCurrencyScore = 15; // Both match
  } else if (hasLanguageMatch || hasCurrencyMatch) {
    languageCurrencyScore = 10; // One matches
  } else if (creatorProfile.accepts_international_brands) {
    languageCurrencyScore = 5; // International compatibility
  }

  // 5. RATE COMPATIBILITY (10 points max)
  let rateScore = 0;
  const estimatedAmount = extractRateAmount(brandSuggestion.estimatedRate);
  const platformMinimum = getMinimumRateForBrand(brandSuggestion, creatorProfile);
  
  if (estimatedAmount && platformMinimum) {
    if (estimatedAmount > platformMinimum * 1.2) {
      rateScore = 10; // Above minimum
    } else if (estimatedAmount >= platformMinimum) {
      rateScore = 8; // Meets minimum
    } else if (estimatedAmount >= platformMinimum * 0.8) {
      rateScore = 5; // Below but negotiable
    }
  } else if (!platformMinimum) {
    rateScore = 8; // No minimum set
  }

  // Calculate final score using the exact formula
  const finalScore = geoScore + nicheScore + dealTypeScore + languageCurrencyScore + rateScore;
  
  return Math.min(100, Math.max(0, finalScore));
}

// Helper functions for the new scoring system
function extractBrandNiche(brandSuggestion) {
  // Try to extract niche from brand name or fit reason
  if (brandSuggestion.fitReason && typeof brandSuggestion.fitReason === 'string') {
    const commonNiches = ['Technology', 'Gaming', 'Beauty', 'Fashion', 'Fitness', 'Food', 'Travel', 'Lifestyle'];
    for (const niche of commonNiches) {
      if (brandSuggestion.fitReason.toLowerCase().includes(niche.toLowerCase())) {
        return niche;
      }
    }
  }
  return 'General';
}

function isRelatedNiche(brandNiche, creatorNiches) {
  const nicheRelations = {
    'Technology': ['Gaming', 'Gadgets', 'Electronics'],
    'Gaming': ['Technology', 'Entertainment'],
    'Beauty': ['Fashion', 'Lifestyle', 'Wellness'],
    'Fashion': ['Beauty', 'Lifestyle'],
    'Fitness': ['Health', 'Wellness', 'Sports'],
    'Food': ['Lifestyle', 'Health']
  };
  
  const relatedNiches = nicheRelations[brandNiche] || [];
  return creatorNiches.some(niche => 
    relatedNiches.some(related => related.toLowerCase() === niche.toLowerCase())
  );
}

function isCompatibleDealType(brandDealType, creatorDealTypes) {
  const dealTypeCompatibility = {
    'Sponsored Posts': ['Content Creation', 'Flat Fee'],
    'Affiliate': ['Affiliate Marketing', 'Rev-Share'],
    'Product Reviews': ['Gifted', 'Content Creation'],
    'Brand Ambassadorship': ['Flat Fee', 'Affiliate']
  };
  
  const compatible = dealTypeCompatibility[brandDealType] || [];
  return creatorDealTypes.some(type => compatible.includes(type));
}

function hasLanguageCompatibility(brandSuggestion, creatorProfile) {
  // For now, assume brands in same country have language compatibility
  if (brandSuggestion.brandCountry === creatorProfile.country) return true;
  
  // Check if brand operates in creator's primary languages
  const globalLanguages = ['English', 'Spanish', 'French'];
  return creatorProfile.primary_language.some(lang => globalLanguages.includes(lang));
}

function extractRateAmount(rateString) {
  if (!rateString || typeof rateString !== 'string') return null;
  const match = rateString.match(/[\d,]+/);
  return match ? parseInt(match[0].replace(/,/g, '')) : null;
}

function getMinimumRateForBrand(brandSuggestion, creatorProfile) {
  // Try to match brand's likely platform with creator's minimum rates
  const primaryPlatform = creatorProfile.primary_platforms[0];
  return creatorProfile.minimum_rates && creatorProfile.minimum_rates[primaryPlatform] 
    ? creatorProfile.minimum_rates[primaryPlatform] 
    : null;
}

function isRegionalMatch(brandCountry, creatorCountry) {
  // Map full country names to country codes for comparison
  const countryToCode = {
    'United States': 'USA',
    'Canada': 'CAN', 
    'Mexico': 'MEX',
    'United Kingdom': 'GBR',
    'Germany': 'DEU',
    'France': 'FRA',
    'Spain': 'ESP',
    'Italy': 'ITA',
    'Netherlands': 'NLD',
    'Sweden': 'SWE',
    'Norway': 'NOR',
    'Denmark': 'DNK',
    'Japan': 'JPN',
    'South Korea': 'KOR',
    'Singapore': 'SGP',
    'Australia': 'AUS',
    'Brazil': 'BRA',
    'Argentina': 'ARG',
    'Chile': 'CHL',
    'India': 'IND',
    'Pakistan': 'PAK',
    'Bangladesh': 'BGD',
    'South Africa': 'ZAF',
    'UAE': 'ARE',
    'Saudi Arabia': 'SAU',
    'Turkey': 'TUR',
    'Russia': 'RUS',
    'China': 'CHN'
  };

  // Convert country names to codes
  const brandCode = countryToCode[brandCountry] || brandCountry;
  const creatorCode = countryToCode[creatorCountry] || creatorCountry;

  const regions = {
    'North America': ['USA', 'CAN', 'MEX'],
    'Europe': ['GBR', 'DEU', 'FRA', 'ESP', 'ITA', 'NLD', 'SWE', 'NOR', 'DNK', 'TUR', 'RUS'],
    'Asia Pacific': ['JPN', 'KOR', 'SGP', 'AUS', 'CHN'],
    'South Asia': ['IND', 'PAK', 'BGD'],
    'Middle East': ['ARE', 'SAU', 'TUR'],
    'Latin America': ['BRA', 'MEX', 'ARG', 'CHL'],
    'Africa': ['ZAF']
  };

  for (const region of Object.values(regions)) {
    if (region.includes(brandCode) && region.includes(creatorCode)) {
      return true;
    }
  }
  return false;
}

function calculateNicheAlignment(brandSuggestion, creatorNiches) {
  // This would ideally check against brand categories, but for now
  // we'll use a simplified approach based on the fitReason
  if (!brandSuggestion.fitReason || typeof brandSuggestion.fitReason !== 'string') {
    return 0;
  }
  
  const fitReason = brandSuggestion.fitReason.toLowerCase();
  let alignmentScore = 0;
  
  creatorNiches.forEach(niche => {
    if (fitReason.includes(niche.toLowerCase())) {
      alignmentScore += 25;
    }
  });
  
  return Math.min(alignmentScore, 25);
}

function calculateLanguageCurrencyScore(brandSuggestion, creatorProfile) {
  // Simplified scoring - in a real system, this would check brand's supported languages/currencies
  return 15; // Default good score for now
}

function calculateRateScore(brandSuggestion, creatorProfile) {
  // Check if the estimated rate meets minimum requirements
  if (!creatorProfile.minimum_rates || !brandSuggestion.estimatedRate) {
    return 10; // Default score if no rate info
  }

  // This would need platform-specific logic
  return 10; // Simplified for now
}

async function generateConversationReply({
  deal,
  brand,
  brandMessage,
  context,
  user,
  creatorProfile,
  youtubeStats,
  conversationHistory
}) {
  try {
    // Build creator information
    let creatorInfo = `Creator: ${user.name}\n`;
    creatorInfo += `Plan: ${user.plan}\n`;
    
    if (creatorProfile) {
      creatorInfo += `Bio: ${creatorProfile.bio || 'Not specified'}\n`;
      creatorInfo += `Platforms: ${creatorProfile.primary_platform || 'Not specified'}\n`;
      if (creatorProfile.follower_counts && typeof creatorProfile.follower_counts === 'object') {
        const platforms = Object.entries(creatorProfile.follower_counts)
          .filter(([_, count]) => count > 0)
          .map(([platform, count]) => `${platform}: ${count.toLocaleString()}`)
          .join(', ');
        if (platforms) {
          creatorInfo += `Followers: ${platforms}\n`;
        }
      }
      if (creatorProfile.content_categories) {
        creatorInfo += `Content Categories: ${creatorProfile.content_categories}\n`;
      }
      if (creatorProfile.minimum_rates && typeof creatorProfile.minimum_rates === 'object') {
        const rates = Object.entries(creatorProfile.minimum_rates)
          .filter(([_, rate]) => rate > 0)
          .map(([type, rate]) => `${type}: $${rate}`)
          .join(', ');
        if (rates) {
          creatorInfo += `Minimum Rates: ${rates}\n`;
        }
      }
    }

    if (youtubeStats) {
      creatorInfo += `YouTube Stats: ${youtubeStats.subscriber_count || 0} subscribers, ${youtubeStats.video_count || 0} videos\n`;
    }

    // Build deal context
    let dealInfo = `Deal: ${deal.title}\n`;
    dealInfo += `Status: ${deal.status}\n`;
    if (deal.proposedAmount) {
      dealInfo += `Proposed Amount: $${deal.proposedAmount.toLocaleString()}\n`;
    }
    if (deal.agreedAmount) {
      dealInfo += `Agreed Amount: $${deal.agreedAmount.toLocaleString()}\n`;
    }
    if (deal.termsSnapshot) {
      dealInfo += `Locked Agreement Terms:\n`;
      if (deal.termsSnapshot.price) {
        dealInfo += `  - Payment: ${new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: deal.termsSnapshot.price.currency || 'USD'
        }).format(deal.termsSnapshot.price.amount)}\n`;
      }
      if (deal.termsSnapshot.usage_rights) {
        dealInfo += `  - Usage Rights: ${deal.termsSnapshot.usage_rights}\n`;
      }
      if (deal.termsSnapshot.deliverables && deal.termsSnapshot.deliverables.length > 0) {
        dealInfo += `  - Deliverables:\n`;
        deal.termsSnapshot.deliverables.forEach(d => {
          dealInfo += `    • ${d.platform}: ${d.count} post(s)${d.notes ? ` - ${d.notes}` : ''}\n`;
        });
      }
      if (deal.termsSnapshot.due_dates) {
        if (deal.termsSnapshot.due_dates.content_due) {
          dealInfo += `  - Content Due: ${new Date(deal.termsSnapshot.due_dates.content_due).toLocaleDateString()}\n`;
        }
        if (deal.termsSnapshot.due_dates.go_live) {
          dealInfo += `  - Go Live Date: ${new Date(deal.termsSnapshot.due_dates.go_live).toLocaleDateString()}\n`;
        }
      }
      if (deal.termsSnapshot.brand_contact) {
        dealInfo += `  - Brand Contact: ${deal.termsSnapshot.brand_contact.name} (${deal.termsSnapshot.brand_contact.email})\n`;
      }
    }

    // Build brand context
    let brandInfo = '';
    if (brand) {
      brandInfo = `Brand: ${brand.name}\n`;
      if (brand.contactName) {
        brandInfo += `Contact: ${brand.contactName}\n`;
      }
    }

    // Build conversation history context
    let conversationContext = '';
    if (conversationHistory && conversationHistory.length > 0) {
      conversationContext = 'Recent Conversation History (chronological order):\n';
      conversationHistory.slice(-5).forEach((conv, index) => {
        const date = new Date(conv.timestamp).toLocaleDateString();
        conversationContext += `${index + 1}. [${date}] ${conv.direction}: ${conv.summary}\n`;
        conversationContext += `   → Disposition: ${conv.disposition}\n`;
        if (conv.amount) {
          conversationContext += `   → Amount discussed: $${conv.amount.toLocaleString()}\n`;
        }
        if (conv.terms_delta) {
          conversationContext += `   → Terms changes: ${conv.terms_delta}\n`;
        }
        conversationContext += '\n';
      });
    }

    const prompt = `You are an AI assistant helping a content creator respond to a brand partnership message. Generate a professional, strategic reply that advances the partnership while protecting the creator's interests.

CREATOR PROFILE:
${creatorInfo}

DEAL CONTEXT:
${dealInfo}

BRAND INFORMATION:
${brandInfo}

${conversationContext}

BRAND'S LATEST MESSAGE:
"${brandMessage}"

ADDITIONAL CONTEXT:
${context || 'No additional context provided'}

INSTRUCTIONS FOR RESPONSE:
Based on the deal status (${deal.status}) and conversation history, generate a response that:

1. **Acknowledges their message** professionally and shows appreciation
2. **Addresses specific points** they raised in their message
3. **References relevant deal context** (amounts, terms, timeline) when appropriate
4. **Maintains consistency** with previous conversations and agreed terms
5. **Suggests concrete next steps** based on current deal status
6. **Protects creator interests** regarding rates, usage rights, and deliverables
7. **Shows enthusiasm** while maintaining professionalism

TONE GUIDELINES:
- Professional but warm and collaborative
- Confident about your value proposition
- Respectful of their business needs
- Clear about your requirements and boundaries
- Forward-thinking about partnership success

RESPONSE SHOULD BE:
- 200-300 words maximum
- Email body only (no subject line or headers)
- Authentic to the creator's voice
- Action-oriented with clear next steps
- Specific to this deal and conversation history

Generate the response now:`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional content creator business manager specializing in brand partnership negotiations. You understand deal statuses, protect creator interests, and build strategic relationships. Generate responses that are professional, context-aware, and advance the partnership effectively."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 450,
      temperature: 0.7,
    });

    const reply = completion.choices[0].message.content.trim();
    
    return {
      reply,
      context: {
        dealId: deal.id,
        brandName: brand?.name || 'Unknown Brand',
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error generating conversation reply:', error);
    throw new Error('Failed to generate AI reply: ' + error.message);
  }
}

module.exports = {
  suggestBrandsFromNiche,
  suggestBrandsFromMultipleNiches,
  generatePersonalizedOutreach,
  generateBrandsFromCreatorProfile,
  generateConversationReply,
};