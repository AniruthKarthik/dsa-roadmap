const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // This requires the site to be linked and a NETLIFY_ACCESS_TOKEN or Admin Token available
  // In a real scenario, you might need a Personal Access Token stored in env vars
  const { SITE_ID, NETLIFY_ACCESS_TOKEN } = process.env;

  if (!SITE_ID || !NETLIFY_ACCESS_TOKEN) {
    console.log("Missing configuration for leaderboard.");
    // Return mock data for demonstration if config is missing
    return {
      statusCode: 200,
      body: JSON.stringify([
        { name: "Demo User 1", score: 45 },
        { name: "Demo User 2", score: 32 },
        { name: "You (Example)", score: 10 },
        { name: "Configuration Needed", score: 0 }
      ])
    };
  }

  try {
    // Fetch users from Netlify API
    // Note: This endpoint might vary based on your team/plan. 
    // Standard endpoint: https://api.netlify.com/api/v1/sites/{site_id}/identity/users
    const response = await fetch(`https://api.netlify.com/api/v1/sites/${SITE_ID}/identity/users`, {
      headers: {
        "Authorization": `Bearer ${NETLIFY_ACCESS_TOKEN}`
      }
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

    const users = await response.json();

    const leaderboard = users.map(user => {
      const completed = (user.user_metadata && user.user_metadata.completed) ? user.user_metadata.completed.length : 0;
      return {
        name: user.user_metadata.full_name || user.email.split('@')[0],
        score: completed
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

    return {
      statusCode: 200,
      body: JSON.stringify(leaderboard)
    };

  } catch (error) {
    console.error("Leaderboard error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch leaderboard" })
    };
  }
};
