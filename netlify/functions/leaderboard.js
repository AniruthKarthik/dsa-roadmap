const https = require('https');

exports.handler = async (event, context) => {
  const { MY_SITE_ID, NETLIFY_ACCESS_TOKEN } = process.env;

  if (!MY_SITE_ID || !NETLIFY_ACCESS_TOKEN) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Zero solvers? Everyone must be in 'stealth mode' because heaven forbid anyone knows you're actually putting in the effort.",
        users: []
      })
    };
  }

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.netlify.com',
      path: `/api/v1/sites/${MY_SITE_ID}/identity/users`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${NETLIFY_ACCESS_TOKEN}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          resolve({
            statusCode: res.statusCode,
            body: JSON.stringify({ error: "Failed to fetch users from Netlify API" })
          });
          return;
        }

        try {
          const users = JSON.parse(data);
          const leaderboard = users.map(user => {
            const completed = (user.user_metadata && user.user_metadata.completed) ? user.user_metadata.completed.length : 0;
            return {
              name: user.user_metadata.full_name || user.email.split('@')[0],
              score: completed
            };
          })
          .filter(user => user.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);

          resolve({
            statusCode: 200,
            body: JSON.stringify({
              message: leaderboard.length === 0 ? "Zero solvers? Everyone must be in 'stealth mode' because heaven forbid anyone knows you're actually putting in the effort." : "",
              users: leaderboard
            })
          });
        } catch (e) {
          resolve({ statusCode: 500, body: JSON.stringify({ error: "Parsing error" }) });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ statusCode: 500, body: JSON.stringify({ error: e.message }) });
    });

    req.end();
  });
};