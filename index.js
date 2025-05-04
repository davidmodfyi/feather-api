const express = require('express');
const cors = require('cors');
const db = require('./database');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
require('dotenv').config();

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4000;

const corsOptions = {
  origin: ['https://www.featherstorefront.com', 'https://featherstorefront.com'],
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
 
const categories = [
  'Produce', 'Dairy', 'Bakery', 'Meat', 'Beverages', 'Snacks', 'Frozen', 'Pantry'
];

// Routes
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', username, 'with password:', password);
  
  try {
    // Get user from database
    const dbUser = db.getUserByUsername(username);
    console.log('User from DB:', dbUser ? JSON.stringify(dbUser) : 'Not found');
    
    // If user not found or password doesn't match
    if (!dbUser) {
      console.log('User not found in database');
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Explicit password comparison with debug logging
    console.log('Comparing passwords:', {
      provided: password,
      stored: dbUser.password,
      match: password === dbUser.password
    });
    
    if (password !== dbUser.password) {
      console.log('Password mismatch');
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Authentication successful
    req.session.distributor_id = dbUser.distributor_id;
    req.session.distributorName = dbUser.distributor_name;
    
    console.log('Login successful for:', username);
    console.log('Setting session:', {
      distributor_id: dbUser.distributor_id,
      distributorName: dbUser.distributor_name
    });
    
    req.session.save(() => {
      console.log('Session saved:', req.session);
      res.json({ 
        status: 'logged_in',
        distributorName: dbUser.distributor_name 
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
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
  if (!distributorId) return res.status(401).json({ error: 'Not authenticated' });
  
  let distributorName = 'Storefront';
  if (distributorId === 'dist001') distributorName = 'Ocean Wave Foods';
  if (distributorId === 'dist002') distributorName = 'Palma Cigars';
  
  res.json({ distributorId, distributorName });
});

// Add debug endpoint to check session status
app.get('/api/session-check', (req, res) => {
  res.json({
    sessionExists: !!req.session.distributor_id,
    distributorId: req.session.distributor_id || 'none',
    distributorName: req.session.distributorName || 'none'
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));