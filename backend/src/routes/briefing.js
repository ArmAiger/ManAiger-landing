const express = require("express");
const { authenticate } = require("../middleware/auth");
const { generateBriefing } = require("../services/AiBriefingService");
const router = express.Router();

router.get("/dashboard/briefing", authenticate, async (req, res) => {
  const data = await generateBriefing({ user: req.user });
  res.json(data);
});
module.exports = router;
