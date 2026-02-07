exports.handler = async (event, context) => {
  const { MY_SITE_ID, NETLIFY_ACCESS_TOKEN } = process.env;

  // 1. Check for missing vars
  if (!MY_SITE_ID || !NETLIFY_ACCESS_TOKEN) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        error: "Configuration Missing",
        message: "Zero solvers? Everyone must be in 'stealth mode' because heaven forbid anyone knows you're actually putting in the effort."
      })
    };
  }

  try {
    // 2. Fetch from Netlify API
    const response = await fetch(`https://api.netlify.com/api/v1/sites/${MY_SITE_ID.trim()}/identity/users`, {
      headers: {
        'Authorization': `Bearer ${NETLIFY_ACCESS_TOKEN.trim()}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Netlify API Error:", response.status, errorText);
      return {
        statusCode: response.status,
        body: JSON.stringify({ 
          error: `Netlify API Error ${response.status}`,
          details: errorText
        })
      };
    }

    const users = await response.json();
    
    // 3. Process Leaderboard
    // The API might return an array or an object with a users array
    const userList = Array.isArray(users) ? users : (users.users || []);
    
    const leaderboard = userList.map(user => {
      const completed = (user.user_metadata && user.user_metadata.completed) ? user.user_metadata.completed.length : 0;
      return {
        name: (user.user_metadata && user.user_metadata.full_name) || user.email.split('@')[0],
        score: completed
      };
    })
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
    console.error("Function Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error", details: error.message })
    };
  }
};
