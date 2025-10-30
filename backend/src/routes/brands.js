const express = require("express");
const createError = require("http-errors");
const { authenticate } = require("../middleware/auth");
const { Brand, BrandMatch } = require("../db/sequelize");
const { Op } = require("sequelize");

const router = express.Router();

// Get all brands with pagination and search
router.get("/brands", authenticate, async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      industry, 
      category, 
      companySize,
      isActive = true 
    } = req.query;
    
    const offset = (page - 1) * limit;
    const whereClause = {};
    
    // Filter by active status
    if (isActive !== 'all') {
      whereClause.isActive = isActive === 'true';
    }
    
    // Search functionality
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { industry: { [Op.iLike]: `%${search}%` } },
        { category: { [Op.iLike]: `%${search}%` } },
        { tags: { [Op.contains]: [search] } }
      ];
    }
    
    // Filter by industry
    if (industry) {
      whereClause.industry = { [Op.iLike]: `%${industry}%` };
    }
    
    // Filter by category
    if (category) {
      whereClause.category = { [Op.iLike]: `%${category}%` };
    }
    
    // Filter by company size
    if (companySize) {
      whereClause.companySize = companySize;
    }
    
    const { count, rows: brands } = await Brand.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['name', 'ASC']],
      include: [
        {
          model: BrandMatch,
          as: 'matches',
          attributes: ['id', 'status', 'createdAt'],
          limit: 5,
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    res.json({
      brands,
      totalCount: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      pageSize: parseInt(limit)
    });
  } catch (e) {
    next(e);
  }
});

// Get a specific brand by ID
router.get("/brands/:id", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const brand = await Brand.findByPk(id, {
      include: [
        {
          model: BrandMatch,
          as: 'matches',
          include: [
            {
              model: require('../db/sequelize').User,
              attributes: ['id', 'name', 'email']
            }
          ]
        }
      ]
    });
    
    if (!brand) {
      throw createError(404, "Brand not found.");
    }
    
    res.json(brand);
  } catch (e) {
    next(e);
  }
});

// Create a new brand
router.post("/brands", authenticate, async (req, res, next) => {
  try {
    const brandData = req.body;
    
    if (!brandData.name || typeof brandData.name !== "string") {
      throw createError(400, "Brand name is required.");
    }

    const normalizedName = brandData.name.trim();
    if (!normalizedName) {
      throw createError(400, "Brand name cannot be empty.");
    }

    // Check if brand already exists
    const existingBrand = await Brand.findOne({ 
      where: { name: { [Op.iLike]: normalizedName } } 
    });
    
    if (existingBrand) {
      throw createError(409, "A brand with this name already exists.");
    }

    const brand = await Brand.create({
      ...brandData,
      name: normalizedName,
      lastUpdated: new Date()
    });
    
    res.status(201).json(brand);
  } catch (e) {
    next(e);
  }
});

// Update a brand by ID
router.put("/brands/:id", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const brand = await Brand.findByPk(id);
    if (!brand) {
      throw createError(404, "Brand not found.");
    }

    // If name is being updated, check for duplicates
    if (updateData.name && updateData.name !== brand.name) {
      const normalizedName = updateData.name.trim();
      const existingBrand = await Brand.findOne({ 
        where: { 
          name: { [Op.iLike]: normalizedName },
          id: { [Op.ne]: id }
        } 
      });
      
      if (existingBrand) {
        throw createError(409, "A brand with this name already exists.");
      }
      
      updateData.name = normalizedName;
    }

    updateData.lastUpdated = new Date();
    await brand.update(updateData);
    
    res.json(brand);
  } catch (e) {
    next(e);
  }
});

// Delete/deactivate a brand by ID
router.delete("/brands/:id", authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { force = false } = req.query;
    
    const brand = await Brand.findByPk(id);
    if (!brand) {
      throw createError(404, "Brand not found.");
    }

    // Check if brand has associated matches
    const matchCount = await BrandMatch.count({ where: { brandId: id } });
    
    if (force === 'true') {
      // Hard delete: remove brand and all associated matches
      await BrandMatch.destroy({ where: { brandId: id } });
      await brand.destroy();
      res.status(204).send();
    } else if (matchCount > 0) {
      // Soft delete: just deactivate the brand
      await brand.update({ 
        isActive: false,
        lastUpdated: new Date() 
      });
      res.json({ 
        message: `Brand deactivated. ${matchCount} associated matches remain.`,
        brand 
      });
    } else {
      // No matches, safe to delete
      await brand.destroy();
      res.status(204).send();
    }
  } catch (e) {
    next(e);
  }
});

// Find or create brand (useful for AI services)
router.post("/brands/find-or-create", authenticate, async (req, res, next) => {
  try {
    const brandData = req.body;
    
    if (!brandData.name) {
      throw createError(400, "Brand name is required.");
    }

    const normalizedName = brandData.name.trim();
    
    const [brand, created] = await Brand.findOrCreate({
      where: { name: { [Op.iLike]: normalizedName } },
      defaults: {
        ...brandData,
        name: normalizedName,
        lastUpdated: new Date()
      }
    });

    res.json({ 
      brand, 
      created,
      message: created ? 'Brand created' : 'Brand found' 
    });
  } catch (e) {
    next(e);
  }
});

// Get brand statistics
router.get("/brands/stats/overview", authenticate, async (req, res, next) => {
  try {
    const totalBrands = await Brand.count();
    const activeBrands = await Brand.count({ where: { isActive: true } });
    const inactiveBrands = totalBrands - activeBrands;
    
    const brandsWithMatches = await Brand.count({
      include: [
        {
          model: BrandMatch,
          as: 'matches',
          required: true
        }
      ]
    });
    
    const industryStats = await Brand.findAll({
      attributes: [
        'industry',
        [require('sequelize').fn('COUNT', '*'), 'count']
      ],
      where: { 
        industry: { [Op.not]: null },
        isActive: true 
      },
      group: ['industry'],
      order: [[require('sequelize').literal('count'), 'DESC']],
      limit: 10
    });

    res.json({
      totalBrands,
      activeBrands,
      inactiveBrands,
      brandsWithMatches,
      topIndustries: industryStats
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
