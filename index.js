const express = require('express');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

const corsOptions = {
  origin: 'https://feather-storefront-client.onrender.com',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // <-- handle preflight

app.use(express.json());

app.use(session({
  name: 'feather.sid',
  secret: process.env.SESSION_SECRET || 'feathersecret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'none'
  }
}));

// Dummy data
const distributors = [
  { id: 'dist001', name: 'Sunshine Distributors' },
  { id: 'dist002', name: 'Northwind Wholesalers' }
];

const accounts = [
  { id: 'acct101', distributor_id: 'dist001', name: 'Joe\'s Grocery' },
  { id: 'acct102', distributor_id: 'dist001', name: 'Fresh Farm Market' },
  { id: 'acct201', distributor_id: 'dist002', name: 'City Mini Mart' }
];

const products = [
  { id: 'p001', distributor_id: 'dist001', name: 'Organic Bananas', sku: 'BAN001', unitPrice: 1.99 },
  { id: 'p002', distributor_id: 'dist001', name: 'Almond Milk', sku: 'ALM002', unitPrice: 3.49 },
  { id: 'p003', distributor_id: 'dist002', name: 'Sparkling Water', sku: 'SPK003', unitPrice: 0.99 }
];

// Routes
app.post('/login', (req, res) => {
  const { distributorId, accountId } = req.body;
  if (!distributorId) return res.status(400).send('distributorId is required');
  req.session.distributor_id = distributorId;
  req.session.account_id = accountId || null;
  res.send({ status: 'logged_in', distributorId, accountId });
});

app.get('/api/items', (req, res) => {
  console.log('Session state:', req.session);
  const distributorId = req.session.distributor_id;
  if (!distributorId) return res.status(401).json([]);  // Return empty array instead of error object
  const filtered = products.filter(p => p.distributor_id === distributorId);
  res.json(filtered);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));