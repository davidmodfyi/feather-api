const express = require('express');
const cors = require('cors');
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

const users = [
  { username: 'OceanWaveAdmin', password: 'secret123', distributor_id: 'dist001' },
  { username: 'PalmaCigarsAdmin', password: 'cigar123', distributor_id: 'dist002' }
];

const accounts = [
  { id: 'acct101', distributor_id: 'dist001', name: 'Joe\'s Grocery' },
  { id: 'acct102', distributor_id: 'dist001', name: 'Fresh Farm Market' },
  { id: 'acct201', distributor_id: 'dist002', name: 'City Mini Mart' }
];

const categories = [
  'Produce', 'Dairy', 'Bakery', 'Meat', 'Beverages', 'Snacks', 'Frozen', 'Pantry'
];

const products = [
  // 150 Ocean Wave products
  ...Array.from({ length: 150 }).map((_, i) => {
    const category = categories[i % categories.length];
    return {
      id: `p${String(i + 1).padStart(3, '0')}`,
      distributor_id: 'dist001',
      name: `${category} Item ${i + 1}`,
      sku: `${category.toUpperCase().slice(0, 3)}${i + 1}`,
      unitPrice: Number((Math.random() * 15 + 1).toFixed(2)),
      category
    };
  }),
  // Palma Cigars products
  { id: 'c001', distributor_id: 'dist002', name: 'Palma Classic Box', sku: 'PAL001', unitPrice: 89.99, category: 'Cigars' },
  { id: 'c002', distributor_id: 'dist002', name: 'Palma Maduro Box', sku: 'PAL002', unitPrice: 92.99, category: 'Cigars' },
  { id: 'c003', distributor_id: 'dist002', name: 'Palma Connecticut Box', sku: 'PAL003', unitPrice: 87.49, category: 'Cigars' },
  { id: 'c004', distributor_id: 'dist002', name: 'Palma Toro Box', sku: 'PAL004', unitPrice: 94.99, category: 'Cigars' },
  { id: 'c005', distributor_id: 'dist002', name: 'Palma Robusto Box', sku: 'PAL005', unitPrice: 91.50, category: 'Cigars' }
];


// Routes
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  req.session.distributor_id = user.distributor_id;
  req.session.account_id = null;

  req.session.save(() => {
    console.log('🔐 Session created:', req.session);
    res.json({ status: 'logged_in' });
  });
});

app.post('/logout', (req, res) => {
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

  const filtered = products.filter(p => p.distributor_id === distributorId);
  res.json(filtered);
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));