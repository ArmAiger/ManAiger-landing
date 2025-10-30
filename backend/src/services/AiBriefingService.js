async function generateBriefing({ user }) {
  return {
    title: `ManAIger Briefing for ${user.name || user.email}`,
    summary:
      "Weekly wins: +7% engagement, 2 brand replies pending. Focus: outreach to StreamSkinz & CreatorFuel. Content nudge: 2 short highlight clips.",
    recommendations: [
      "Send 2 follow-ups to pending brands",
      "Post highlight clip Tue/Thu 6pm",
      "Run poll to learn audience merch interest",
    ],
    generatedAt: new Date().toISOString(),
  };
}
module.exports = { generateBriefing };
