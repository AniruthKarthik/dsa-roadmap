const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // This requires the site to be linked and a NETLIFY_ACCESS_TOKEN or Admin Token available
  const { MY_SITE_ID, NETLIFY_ACCESS_TOKEN } = process.env;

  if (!MY_SITE_ID || !NETLIFY_ACCESS_TOKEN) {
    console.log("Missing configuration for leaderboard.");
    // Return empty state with a funny quote if config is missing or no users found
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Zero solvers? Everyone must be in 'stealth mode' because heaven forbid anyone knows you're actually putting in the effort.",
        users: []
      })
    };
  }

  try {
    // Fetch users from Netlify API
    const response = await fetch(`https://api.netlify.com/api/v1/sites/${MY_SITE_ID}/identity/users`, {
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
    .filter(user => user.score > 0) // Only show users who solved something
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: leaderboard.length === 0 ? "Zero solvers? Everyone must be in 'stealth mode' because heaven forbid anyone knows you're actually putting in the effort." : "",
        users: leaderboard
      })
    };

  } catch (error) {
    console.error("Leaderboard error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch leaderboard" })
    };
  }
};
