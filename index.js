const express = require('express');
const cors = require('cors');
const session = require('express-session');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: 'https://feather-storefront-client.onrender.com',
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'feathersecret',
  resave: false,
  saveUninitialized: true
}));

app.get('/auth/qbo', (req, res) => {
  const redirectUri = encodeURIComponent(process.env.QBO_REDIRECT_URI);
  const url = \`https://appcenter.intuit.com/connect/oauth2?client_id=\${process.env.QBO_CLIENT_ID}&redirect_uri=\${redirectUri}&response_type=code&scope=com.intuit.quickbooks.accounting\`;
  res.redirect(url);
});

app.get('/auth/callback', async (req, res) => {
  const code = req.query.code;
  const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
  const creds = Buffer.from(\`\${process.env.QBO_CLIENT_ID}:\${process.env.QBO_CLIENT_SECRET}\`).toString('base64');

  try {
    const { data } = await axios.post(tokenUrl, new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.QBO_REDIRECT_URI
    }), {
      headers: {
        Authorization: \`Basic \${creds}\`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    req.session.qbo = data;
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:3000');
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).send('OAuth failed');
  }
});

app.get('/api/items', async (req, res) => {
  const accessToken = req.session.qbo?.access_token;
  const realmId = req.session.qbo?.realmId;
  if (!accessToken || !realmId) return res.status(401).send('Not authenticated');

  try {
    const { data } = await axios.get(\`https://quickbooks.api.intuit.com/v3/company/\${realmId}/query?query=SELECT * FROM Item\`, {
      headers: {
        Authorization: \`Bearer \${accessToken}\`,
        Accept: 'application/json'
      }
    });
    res.json(data.QueryResponse.Item || []);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching items');
  }
});

app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));