const express = require("express");
const createError = require("http-errors");
const { authenticate } = require("../middleware/auth");
const { Niche, User } = require("../db/sequelize");

const router = express.Router();

// Get all niches (public endpoint for listing available niches)
router.get("/niches", authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = search ? {
      name: {
        [require('sequelize').Op.iLike]: `%${search}%`
      }
    } : {};

    const { count, rows: niches } = await Niche.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['name', 'ASC']]
    });

    res.json({
      niches,
      totalCount: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page)
    });
  } catch (e) {
    next(e);
  }
});

// Get a specific niche by ID
router.get("/niches/:id", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const niche = await Niche.findByPk(id);
    
    if (!niche) {
      throw createError(404, "Niche not found.");
    }
    
    res.json(niche);
  } catch (e) {
    next(e);
  }
});

// Create a new niche (admin functionality)
router.post("/niches", authenticate, async (req, res, next) => {
  try {
    const { name } = req.body;
    
    if (!name || typeof name !== "string") {
      throw createError(400, "A niche 'name' is required.");
    }

    const normalizedName = name.trim().toLowerCase();
    if (!normalizedName) {
      throw createError(400, "A niche 'name' cannot be empty.");
    }

    // Check if niche already exists
    const existingNiche = await Niche.findOne({ where: { name: normalizedName } });
    if (existingNiche) {
      throw createError(409, "A niche with this name already exists.");
    }

    const niche = await Niche.create({ name: normalizedName });
    res.status(201).json(niche);
  } catch (e) {
    next(e);
  }
});

// Update a niche by ID
router.put("/niches/:id", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name || typeof name !== "string") {
      throw createError(400, "A niche 'name' is required.");
    }

    const normalizedName = name.trim().toLowerCase();
    if (!normalizedName) {
      throw createError(400, "A niche 'name' cannot be empty.");
    }

    const niche = await Niche.findByPk(id);
    if (!niche) {
      throw createError(404, "Niche not found.");
    }

    // Check if another niche with the same name exists (excluding current niche)
    const existingNiche = await Niche.findOne({ 
      where: { 
        name: normalizedName,
        id: { [require('sequelize').Op.ne]: id }
      } 
    });
    
    if (existingNiche) {
      throw createError(409, "A niche with this name already exists.");
    }

    await niche.update({ name: normalizedName });
    res.json(niche);
  } catch (e) {
    next(e);
  }
});

// Delete a niche by ID
router.delete("/niches/:id", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const niche = await Niche.findByPk(id);
    
    if (!niche) {
      throw createError(404, "Niche not found.");
    }

    // Get count of users associated with this niche
    const userCount = await niche.countUsers();
    
    if (userCount > 0) {
      // Option 1: Prevent deletion if niche has users
      throw createError(400, `Cannot delete niche. It is currently used by ${userCount} user(s). Remove all associations first.`);
      
      // Option 2: Alternatively, you could force delete and remove all associations:
      // await niche.setUsers([]);
      // await niche.destroy();
    } else {
      await niche.destroy();
    }
    
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

// Force delete a niche and remove all associations
router.delete("/niches/:id/force", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const niche = await Niche.findByPk(id);
    
    if (!niche) {
      throw createError(404, "Niche not found.");
    }

    // Remove all user associations first
    await niche.setUsers([]);
    
    // Then delete the niche
    await niche.destroy();
    
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

module.exports = router;
