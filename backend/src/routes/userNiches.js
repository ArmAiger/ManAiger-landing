const express = require("express");
const createError = require("http-errors");
const { authenticate } = require("../middleware/auth");
const { Niche, User } = require("../db/sequelize");

const router = express.Router();

router.get("/me/niches", authenticate, async (req, res, next) => {
  try {
    const niches = await req.user.getNiches({ joinTableAttributes: [] }); // Exclude join table attributes
    res.json(niches);
  } catch (e) {
    next(e);
  }
});

router.post("/me/niches", authenticate, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string") {
      throw createError(400, "A niche 'name' is required.");
    }

    const normalizedName = name.trim().toLowerCase();
    if (!normalizedName) {
      throw createError(400, "A niche 'name' cannot be empty.");
    }

    const [niche] = await Niche.findOrCreate({
      where: { name: normalizedName },
      defaults: { name: normalizedName },
    });

    // Use req.user directly - it's already a Sequelize instance from authenticate middleware
    const user = req.user;

    // Check if association already exists using getNiches
    const existingNiches = await user.getNiches({
      where: { id: niche.id },
      joinTableAttributes: []
    });

    // Add association only if it doesn't exist
    if (existingNiches.length === 0) {
      await user.addNiches(niche);
    }

    res.status(201).json(niche);
  } catch (e) {
    next(e);
  }
});

router.delete("/me/niches/:nicheId", authenticate, async (req, res, next) => {
  try {
    const { nicheId } = req.params;

    // Use req.user directly - it's already a Sequelize instance
    const user = req.user;
    const niche = await Niche.findByPk(nicheId);

    if (!niche) {
      throw createError(404, "Niche not found.");
    }

    // Check if association exists before trying to remove
    const existingNiches = await user.getNiches({ 
      where: { id: niche.id }, 
      joinTableAttributes: [] 
    });

    if (existingNiches.length === 0) {
      throw createError(404, "Niche not associated with user.");
    }

    // Remove the association
    await user.removeNiches(niche);

    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

// Update user's niche association - replace one niche with another
router.put("/me/niches/:oldNicheId", authenticate, async (req, res, next) => {
  try {
    const { oldNicheId } = req.params;
    const { newNicheName } = req.body;

    if (!newNicheName || typeof newNicheName !== "string") {
      throw createError(400, "A new niche 'newNicheName' is required.");
    }

    const normalizedName = newNicheName.trim().toLowerCase();
    if (!normalizedName) {
      throw createError(400, "A niche name cannot be empty.");
    }

    const user = req.user;
    const oldNiche = await Niche.findByPk(oldNicheId);

    if (!oldNiche) {
      throw createError(404, "Old niche not found.");
    }

    // Check if user has this niche
    const existingNiches = await user.getNiches({ 
      where: { id: oldNiche.id }, 
      joinTableAttributes: [] 
    });

    if (existingNiches.length === 0) {
      throw createError(404, "Niche not associated with user.");
    }

    // If the name is the same, just return the existing niche
    if (oldNiche.name === normalizedName) {
      return res.json(oldNiche);
    }

    // Check if a niche with the new name already exists
    const existingNiche = await Niche.findOne({ where: { name: normalizedName } });
    
    if (existingNiche) {
      // Check if user already has this existing niche
      const hasNewNiche = await user.getNiches({
        where: { id: existingNiche.id },
        joinTableAttributes: []
      });

      if (hasNewNiche.length > 0) {
        throw createError(409, "You already have this niche.");
      }

      // Remove old niche and add existing niche
      await user.removeNiches(oldNiche);
      await user.addNiches(existingNiche);
      
      return res.json(existingNiche);
    } else {
      // Check if this is the only user using the old niche
      const nicheUserCount = await oldNiche.countUsers();
      
      if (nicheUserCount === 1) {
        // This user is the only one using this niche, so we can update it directly
        await oldNiche.update({ name: normalizedName });
        return res.json(oldNiche);
      } else {
        // Multiple users are using this niche, so create a new one
        const newNiche = await Niche.create({ name: normalizedName });
        
        // Remove old association and add new one
        await user.removeNiches(oldNiche);
        await user.addNiches(newNiche);
        
        return res.json(newNiche);
      }
    }
  } catch (e) {
    next(e);
  }
});

module.exports = router;
