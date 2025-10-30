const express = require("express");
const { authenticate } = require("../middleware/auth");
const { CreatorProfile, User, Niche } = require("../db/sequelize");
const createError = require("http-errors");

const router = express.Router();

// Helper function to add niches to the niches table and associate with user
async function addNichesToUser(user, nicheNames) {
  if (!Array.isArray(nicheNames) || nicheNames.length === 0) {
    return;
  }

  for (const nicheName of nicheNames) {
    try {
      const normalizedName = nicheName.trim().toLowerCase();
      if (!normalizedName) continue;

      // Find or create the niche in the niches table
      const [niche] = await Niche.findOrCreate({
        where: { name: normalizedName },
        defaults: { name: normalizedName },
      });

      // Check if association already exists
      const existingNiches = await user.getNiches({
        where: { id: niche.id },
        joinTableAttributes: []
      });

      // Add association only if it doesn't exist
      if (existingNiches.length === 0) {
        await user.addNiches(niche);
      }
    } catch (error) {
      console.error(`Error adding niche "${nicheName}" to user:`, error);
      // Continue with other niches even if one fails
    }
  }
}

// Get creator profile
router.get("/creator-profile", authenticate, async (req, res, next) => {
  try {
    const profile = await CreatorProfile.findOne({
      where: { user_id: req.user.id }
    });

    if (!profile) {
      return res.json({ data: null });
    }

    res.json({ data: profile });
  } catch (error) {
    next(error);
  }
});

// Create or update creator profile
router.post("/creator-profile", authenticate, async (req, res, next) => {
  try {
    const {
      country,
      timezone,
      primary_language,
      content_languages,
      primary_platforms,
      audience_sizes,
      average_views,
      top_niches,
      brand_categories,
      deal_types,
      minimum_rates,
      preferred_currency,
      accepts_international_brands,
      shipping_preferences,
      company_name,
      tax_id,
      billing_address,
      onboarding_completed
    } = req.body;

    // Validate required fields
    if (!country || !timezone || !primary_language || !primary_platforms || 
        !audience_sizes || !average_views || !top_niches || !brand_categories || 
        !deal_types || !preferred_currency) {
      throw createError(400, "Missing required fields");
    }

    // Validate data types and constraints
    if (!Array.isArray(primary_language) || primary_language.length === 0) {
      throw createError(400, "Primary language must be a non-empty array");
    }

    if (!Array.isArray(primary_platforms) || primary_platforms.length === 0) {
      throw createError(400, "Primary platforms must be a non-empty array");
    }

    if (!Array.isArray(top_niches) || top_niches.length === 0 || top_niches.length > 3) {
      throw createError(400, "Top niches must be an array with 1-3 items");
    }

    if (!Array.isArray(brand_categories) || brand_categories.length === 0) {
      throw createError(400, "Brand categories must be a non-empty array");
    }

    if (!Array.isArray(deal_types) || deal_types.length === 0) {
      throw createError(400, "Deal types must be a non-empty array");
    }

    // Check if profile exists
    let profile = await CreatorProfile.findOne({
      where: { user_id: req.user.id }
    });

    // Sanitize JSON fields to ensure they're valid
    const sanitizedData = {
      user_id: req.user.id,
      country,
      timezone,
      primary_language: Array.isArray(primary_language) ? primary_language : [],
      content_languages: Array.isArray(content_languages) ? content_languages : [],
      primary_platforms: Array.isArray(primary_platforms) ? primary_platforms : [],
      audience_sizes: typeof audience_sizes === 'object' && audience_sizes !== null ? audience_sizes : {},
      average_views: typeof average_views === 'object' && average_views !== null ? average_views : {},
      top_niches: Array.isArray(top_niches) ? top_niches : [],
      brand_categories: Array.isArray(brand_categories) ? brand_categories : [],
      deal_types: Array.isArray(deal_types) ? deal_types : [],
      minimum_rates: typeof minimum_rates === 'object' && minimum_rates !== null ? minimum_rates : {},
      preferred_currency,
      accepts_international_brands: Boolean(accepts_international_brands),
      shipping_preferences,
      company_name,
      tax_id,
      billing_address: typeof billing_address === 'object' && billing_address !== null ? billing_address : null,
      onboarding_completed: onboarding_completed !== undefined ? onboarding_completed : false
    };


    if (profile) {
      // Update existing profile
      await profile.update(sanitizedData);
    } else {
      // Create new profile
      profile = await CreatorProfile.create(sanitizedData);
    }

    // Add the top niches to the niches table and associate with user
    if (top_niches && Array.isArray(top_niches) && top_niches.length > 0) {
      await addNichesToUser(req.user, top_niches);
    }

    res.json({ 
      data: profile,
      message: "Creator profile saved successfully. Niches have been added to your account."
    });
  } catch (error) {
    console.error('Creator profile save error:', error);
    next(error);
  }
});

// Complete onboarding
router.post("/complete-onboarding", authenticate, async (req, res, next) => {
  try {
    const profile = await CreatorProfile.findOne({
      where: { user_id: req.user.id }
    });

    if (!profile) {
      throw createError(404, "Creator profile not found. Please complete onboarding first.");
    }

    await profile.update({ onboarding_completed: true });

    // Ensure niches are added to the user's niche list when completing onboarding
    if (profile.top_niches && Array.isArray(profile.top_niches) && profile.top_niches.length > 0) {
      await addNichesToUser(req.user, profile.top_niches);
    }

    res.json({ 
      data: profile,
      message: "Onboarding completed successfully. Your niches are now available for brand matching."
    });
  } catch (error) {
    next(error);
  }
});

// Get onboarding status
router.get("/onboarding-status", authenticate, async (req, res, next) => {
  try {
    const profile = await CreatorProfile.findOne({
      where: { user_id: req.user.id }
    });

    const status = {
      hasProfile: !!profile,
      isCompleted: profile ? profile.onboarding_completed : false,
      profile: profile || null
    };

    res.json({ data: status });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
