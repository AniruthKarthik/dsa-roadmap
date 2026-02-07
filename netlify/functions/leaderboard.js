exports.handler = async (event, context) => {
  // CONFIGURATION:
  // 1. NETLIFY_ACCESS_TOKEN: Your Personal Access Token
  // 2. SITE_NAME_OVERRIDE: Optional subdomain override (e.g. "neon-lamington-800d68")
  const { NETLIFY_ACCESS_TOKEN, SITE_NAME_OVERRIDE } = process.env;

  // Use the override if provided, otherwise default to your site name
  const targetSiteName = SITE_NAME_OVERRIDE || 'neon-lamington-800d68';

  if (!NETLIFY_ACCESS_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Setup Error: NETLIFY_ACCESS_TOKEN is missing." })
    };
  }

  try {
    // STEP 1: Fetch list of sites to find the correct ID by Name
    console.log(`[Leaderboard] Looking up site: ${targetSiteName}...`);
    
    const sitesResponse = await fetch('https://api.netlify.com/api/v1/sites', {
      headers: { 'Authorization': `Bearer ${NETLIFY_ACCESS_TOKEN.trim()}` }
    });

    if (!sitesResponse.ok) {
      throw new Error(`Failed to list sites. API Status: ${sitesResponse.status}`);
    }

    const sites = await sitesResponse.json();
    const site = sites.find(s => s.name === targetSiteName || s.custom_domain === targetSiteName);

    if (!site) {
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          error: "Site Not Found", 
          details: `Could not find a site named '${targetSiteName}' in your account.` 
        })
      };
    }

    console.log(`[Leaderboard] Found site. ID: ${site.id}`);

    // STEP 2: Check if Identity is actually enabled (Hard Fail)
    // Note: Some API responses nest capabilities, others don't. We check safely.
    const identityStatus = site.capabilities?.identity?.status || 'unknown';
    
    // If we can read the status and it's not active/enabled
    if (identityStatus !== 'active' && identityStatus !== 'enabled') {
       return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: "Identity Not Enabled", 
          details: `Netlify Identity is '${identityStatus}' for this site. Enable it in the Dashboard.` 
        })
      };
    }

    // STEP 3: Fetch Users using the retrieved ID
    const usersResponse = await fetch(`https://api.netlify.com/api/v1/sites/${site.id}/identity/users`, {
      headers: { 'Authorization': `Bearer ${NETLIFY_ACCESS_TOKEN.trim()}` }
    });

    if (!usersResponse.ok) {
      throw new Error(`Failed to fetch users. API Status: ${usersResponse.status}`);
    }

    const usersData = await usersResponse.json();
    const userList = Array.isArray(usersData) ? usersData : (usersData.users || []);

    const leaderboard = userList
      .map(user => {
        const completed = (user.user_metadata && user.user_metadata.completed) ? user.user_metadata.completed.length : 0;
        return {
          name: (user.user_metadata && user.user_metadata.full_name) || user.email.split('@')[0],
          score: completed
        };
      })
      .filter(u => u.name)
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
    console.error("[Leaderboard Critical Error]:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error", details: error.message })
    };
  }
};
