const express = require('express');
const cors = require('cors');
const db = require('./database');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

const corsOptions = {
  origin: 'https://www.featherstorefront.com',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // <-- handle preflight

app.use(express.json());

app.set('trust proxy', 1); 

app.use(session({
  store: new MemoryStore({ checkPeriod: 86400000 }), // clean-up every 24h
  name: 'feather.sid',
  secret: process.env.SESSION_SECRET || 'feathersecret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,            // ok for dev
    httpOnly: true,
    sameSite: 'none'
  }
}));

// Dummy data
const distributors = [
  { id: 'dist001', name: 'Sunshine Distributors' },
  { id: 'dist002', name: 'Northwind Wholesalers' }
];
 
const categories = [
  'Produce', 'Dairy', 'Bakery', 'Meat', 'Beverages', 'Snacks', 'Frozen', 'Pantry'
];

// Routes
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const dbUser = db.getUserByUsername(username);

  if (!dbUser || dbUser.password !== password) {
    return res.status(401).send('Invalid username or password');
  }

  req.session.distributor_id = dbUser.distributor_id;
  req.session.distributorName = dbUser.distributor_name;

  req.session.save(() => {
    console.log('🔐 Session saved:', req.session);
    res.send({ status: 'logged_in' });
  });
});


app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('feather.sid', {
      path: '/',
      sameSite: 'none',
      secure: true
    });
    res.send({ status: 'logged_out' });
  });
});

app.get('/api/items', (req, res) => {
  const distributorId = req.session.distributor_id;
  if (!distributorId) return res.status(401).json([]);
  const products = db.getProductsByDistributor(distributorId);
  res.json(products);
});

app.get('/api/accounts', (req, res) => {
  const distributorId = req.session.distributor_id;
  if (!distributorId) return res.status(401).json([]);
  const accounts = db.getAccountsByDistributor(distributorId);
  res.json(accounts);
});

app.get('/api/me', (req, res) => {
  const distributorId = req.session.distributor_id;
  let distributorName = 'Storefront';
  if (distributorId === 'dist001') distributorName = 'Ocean Wave Foods';
  if (distributorId === 'dist002') distributorName = 'Palma Cigars';
  res.json({ distributorId, distributorName });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));