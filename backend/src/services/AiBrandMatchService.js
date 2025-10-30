async function generateBrandSuggestions({ niche, audience, goals }) {
  return [
    {
      brandName: "NeonStream Gear",
      fitReason: `Great fit for ${niche} creators`,
      matchScore: 82,
    },
    {
      brandName: "CreatorFuel Energy",
      fitReason: "High gamer overlap",
      matchScore: 78,
    },
    {
      brandName: "StreamSkinz",
      fitReason: "Aesthetic overlays for streamers",
      matchScore: 85,
    },
  ];
}
module.exports = { generateBrandSuggestions };
