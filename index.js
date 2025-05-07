const express = require('express');
const cors = require('cors');
const database = require('./database');
const session = require('express-session');
const MemoryStore = require('memorystore')(session);
require('dotenv').config();

// Get the db object from the database module
const db = database.db;

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 4000;

// Log the application startup for debugging
console.log('Starting Feather API server...');
console.log('Environment:', process.env.NODE_ENV || 'development');

const corsOptions = {
  origin: ['https://www.featherstorefront.com', 'https://featherstorefront.com'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // <-- handle preflight

app.use(express.json());

app.set('trust proxy', 1); 

// Session configuration with detailed logging
console.log('Configuring session middleware...');
const sessionConfig = {
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
};
console.log('Session configuration:', {
  secret: sessionConfig.secret ? '[present]' : '[missing]',
  cookieSecure: sessionConfig.cookie.secure,
  cookieSameSite: sessionConfig.cookie.sameSite
});

app.use(session(sessionConfig));

// Diagnostic endpoint to check database status
app.get('/api/diagnostic', (req, res) => {
  try {
    console.log('Running diagnostic...');
    
    // Check connection and tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables in database:', tables.map(t => t.name).join(', '));
    
    // Get users count
    const usersCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
    console.log('Users count:', usersCount.count);
    
    // Get sample user (without password)
    const sampleUser = db.prepare("SELECT id, username, distributor_id, distributor_name, type, account_id FROM users LIMIT 1").get();
    console.log('Sample user:', sampleUser || 'None found');
    
    // Get all users for debugging (without passwords)
    const allUsers = db.prepare("SELECT id, username, distributor_id, distributor_name, type, account_id FROM users").all();
    console.log('All users:', JSON.stringify(allUsers));
    
    // Get direct password for specific test accounts for debugging
    const oceanwavePassword = db.prepare("SELECT password FROM users WHERE username = 'OceanWaveAdmin'").get();
    const palmaPassword = db.prepare("SELECT password FROM users WHERE username = 'PalmaCigarsAdmin'").get();
    
    console.log('Test account passwords:', {
      OceanWaveAdmin: oceanwavePassword ? oceanwavePassword.password : 'not found',
      PalmaCigarsAdmin: palmaPassword ? palmaPassword.password : 'not found'
    });
    
    res.json({
      status: 'ok',
      databaseConnected: true,
      tables: tables.map(t => t.name),
      usersCount: usersCount.count,
      sampleUser: sampleUser || null,
      allUsers: allUsers,
      testPasswords: {
        OceanWaveAdmin: oceanwavePassword ? oceanwavePassword.password : 'not found',
        PalmaCigarsAdmin: palmaPassword ? palmaPassword.password : 'not found'
      }
    });
  } catch (error) {
    console.error('Diagnostic error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: error.stack
    });
  }
});

// Login route with detailed debugging
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', { username, passwordLength: password ? password.length : 0 });
  
  try {
    // Try to get user from database
    const dbUser = database.getUserByUsername(username);
    
    // Debug output for user lookup
    if (dbUser) {
      console.log('User found:', {
        id: dbUser.id,
        username: dbUser.username,
        distributor_id: dbUser.distributor_id,
        distributor_name: dbUser.distributor_name,
        type: dbUser.type || 'Admin', // Default to Admin if not set
        account_id: dbUser.account_id,
        hasPassword: !!dbUser.password,
        passwordLength: dbUser.password ? dbUser.password.length : 0
      });
    } else {
      console.log('No user found with username:', username);
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Password comparison with detailed logging
    console.log('Password comparison:', {
      providedPassword: password,
      storedPassword: dbUser.password,
      match: password === dbUser.password,
      providedLength: password ? password.length : 0,
      storedLength: dbUser.password ? dbUser.password.length : 0
    });
    
    if (password !== dbUser.password) {
      console.log('Password mismatch');
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Authentication successful
    console.log('Authentication successful for user:', username);
    
    // Set session data - now including user_id
    req.session.user_id = dbUser.id;
    req.session.distributor_id = dbUser.distributor_id;
    req.session.distributorName = dbUser.distributor_name;
    req.session.userType = dbUser.type || 'Admin'; // Default to Admin if not set
    req.session.accountId = dbUser.account_id; // Include account ID if available
    
    console.log('Setting session data:', {
      user_id: dbUser.id,
      distributor_id: dbUser.distributor_id,
      distributorName: dbUser.distributor_name,
      userType: dbUser.type || 'Admin',
      accountId: dbUser.account_id
    });
    
    // Save session and respond
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Error saving session' });
      }
      
      console.log('Session saved successfully:', {
        id: req.session.id,
        cookie: req.session.cookie ? 'present' : 'missing'
      });
      
      res.json({ 
        status: 'logged_in',
        user_id: dbUser.id,
        distributorName: dbUser.distributor_name,
        userType: dbUser.type || 'Admin'
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Logout route
app.post('/api/logout', (req, res) => {
  console.log('Logout request received');
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    
    res.clearCookie('feather.sid', {
      path: '/',
      sameSite: 'none',
      secure: true
    });
    
    console.log('Session destroyed and cookie cleared');
    res.send({ status: 'logged_out' });
  });
});

// Session check endpoint
app.get('/api/session-check', (req, res) => {
  console.log('Session check request');
  console.log('Session data:', req.session);
  
  res.json({
    sessionExists: !!req.session.distributor_id,
    distributorId: req.session.distributor_id || 'none',
    distributorName: req.session.distributorName || 'none',
    userType: req.session.userType || 'Admin',
    userId: req.session.user_id || 'none'
  });
});

app.get('/api/connected-accounts', (req, res) => {
  console.log('Connected accounts request');
  
  // Check if user is logged in
  if (!req.session.distributor_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    // Get all users with account_id for this distributor
    const connectedAccounts = db.prepare(`
      SELECT account_id FROM users 
      WHERE distributor_id = ? AND account_id IS NOT NULL
    `).all(req.session.distributor_id);
    
    res.json(connectedAccounts);
  } catch (error) {
    console.error('Error fetching connected accounts:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Connect account for ordering
app.post('/api/connect-account', (req, res) => {
  console.log('Connect account request');
  
  // Check if user is logged in and is Admin
  if (!req.session.distributor_id || req.session.userType !== 'Admin') {
    return res.status(401).json({ error: 'Not authorized' });
  }
  
  const { accountId, email } = req.body;
  
  if (!accountId || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    // Check if user already exists with this email
    const existingUser = db.prepare(`
      SELECT * FROM users WHERE username = ?
    `).get(email);
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }
    
    // Generate random 6-digit password
    const password = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Insert new user
    db.prepare(`
      INSERT INTO users (username, password, distributor_id, distributor_name, type, account_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      email,
      password,
      req.session.distributor_id,
      req.session.distributorName,
      'Customer',
      accountId
    );
    
    console.log(`Created user for account ${accountId} with email ${email}`);
    
    // Return success with password so admin can provide it to customer
    res.json({ 
      success: true,
      password
    });
  } catch (error) {
    console.error('Error connecting account:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// User info endpoint
app.get('/api/me', (req, res) => {
  console.log('User info request');
  console.log('Session data:', req.session);
  
  const distributorId = req.session.distributor_id;
  if (!distributorId) {
    console.log('No distributor_id in session, returning 401');
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  console.log('Found distributor_id in session:', distributorId);
  
  const distributorName = req.session.distributorName || 'Storefront';
  const userType = req.session.userType || 'Admin';
  const accountId = req.session.accountId || null;
  const userId = req.session.user_id || null;
  
  console.log('Responding with user info:', { 
    distributorId,
    distributorName,
    userType,
    accountId,
    userId
  });
  
  res.json({ 
    distributorId, 
    distributorName,
    userType,
    accountId,
    userId
  });
});

// Items endpoint
app.get('/api/items', (req, res) => {
  console.log('Items request');
  console.log('Session data:', req.session);
  
  const distributorId = req.session.distributor_id;
  if (!distributorId) {
    console.log('No distributor_id in session, returning empty array');
    return res.status(401).json([]);
  }
  
  console.log('Getting products for distributor:', distributorId);
  const products = database.getProductsByDistributor(distributorId);
  console.log('Found products count:', products.length);
  
  res.json(products);
});

// Accounts endpoint
app.get('/api/accounts', (req, res) => {
  console.log('Accounts request');
  console.log('Session data:', req.session);
  
  const distributorId = req.session.distributor_id;
  if (!distributorId) {
    console.log('No distributor_id in session, returning empty array');
    return res.status(401).json([]);
  }
  
  console.log('Getting accounts for distributor:', distributorId);
  const accounts = database.getAccountsByDistributor(distributorId);
  console.log('Found accounts count:', accounts.length);
  
  res.json(accounts);
});

// CART ENDPOINTS

// Get cart items for current user
app.get('/api/cart', (req, res) => {
  console.log('Cart request');
  console.log('Session data:', req.session);
  
  // Check if user is logged in
  if (!req.session.user_id) {
    console.log('No user_id in session, returning 401');
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    // Get cart items with product details
    const cartItems = db.prepare(`
      SELECT ci.id as cart_item_id, ci.quantity, p.*
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = ?
    `).all(req.session.user_id);
    
    console.log(`Found ${cartItems.length} cart items for user ${req.session.user_id}`);
    res.json(cartItems);
  } catch (error) {
    console.error('Error fetching cart items:', error);
    res.status(500).json({ error: 'Error fetching cart items' });
  }
});

// Add item to cart
app.post('/api/cart', (req, res) => {
  console.log('Add to cart request');
  console.log('Session data:', req.session);
  
  // Check if user is logged in
  if (!req.session.user_id) {
    console.log('No user_id in session, returning 401');
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { product_id, quantity } = req.body;
  
  if (!product_id || !quantity || quantity < 1) {
    return res.status(400).json({ error: 'Invalid product_id or quantity' });
  }
  
  try {
    // Check if item is already in cart
    const existingItem = db.prepare(`
      SELECT * FROM cart_items 
      WHERE user_id = ? AND product_id = ?
    `).get(req.session.user_id, product_id);
    
    if (existingItem) {
      // Update quantity
      db.prepare(`
        UPDATE cart_items
        SET quantity = ?
        WHERE user_id = ? AND product_id = ?
      `).run(quantity, req.session.user_id, product_id);
      
      console.log(`Updated cart item for user ${req.session.user_id}, product ${product_id}, quantity ${quantity}`);
    } else {
      // Insert new item
      db.prepare(`
        INSERT INTO cart_items (user_id, product_id, quantity)
        VALUES (?, ?, ?)
      `).run(req.session.user_id, product_id, quantity);
      
      console.log(`Added new cart item for user ${req.session.user_id}, product ${product_id}, quantity ${quantity}`);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({ error: 'Error adding item to cart' });
  }
});

// Update cart item quantity
app.put('/api/cart/:itemId', (req, res) => {
  console.log('Update cart item request');
  console.log('Session data:', req.session);
  
  // Check if user is logged in
  if (!req.session.user_id) {
    console.log('No user_id in session, returning 401');
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { itemId } = req.params;
  const { quantity } = req.body;
  
  if (!quantity || quantity < 1) {
    return res.status(400).json({ error: 'Invalid quantity' });
  }
  
  try {
    // Verify item belongs to user
    const item = db.prepare(`
      SELECT * FROM cart_items 
      WHERE id = ? AND user_id = ?
    `).get(itemId, req.session.user_id);
    
    if (!item) {
      return res.status(404).json({ error: 'Cart item not found' });
    }
    
    // Update quantity
    db.prepare(`
      UPDATE cart_items
      SET quantity = ?
      WHERE id = ?
    `).run(quantity, itemId);
    
    console.log(`Updated cart item ${itemId} for user ${req.session.user_id}, new quantity ${quantity}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({ error: 'Error updating cart item' });
  }
});

// Remove item from cart
app.delete('/api/cart/:itemId', (req, res) => {
  console.log('Remove cart item request');
  console.log('Session data:', req.session);
  
  // Check if user is logged in
  if (!req.session.user_id) {
    console.log('No user_id in session, returning 401');
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { itemId } = req.params;
  
  try {
    // Verify item belongs to user
    const item = db.prepare(`
      SELECT * FROM cart_items 
      WHERE id = ? AND user_id = ?
    `).get(itemId, req.session.user_id);
    
    if (!item) {
      return res.status(404).json({ error: 'Cart item not found' });
    }
    
    // Delete item
    db.prepare(`
      DELETE FROM cart_items
      WHERE id = ?
    `).run(itemId);
    
    console.log(`Removed cart item ${itemId} for user ${req.session.user_id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing cart item:', error);
    res.status(500).json({ error: 'Error removing cart item' });
  }
});

// Clear entire cart
app.delete('/api/cart', (req, res) => {
  console.log('Clear cart request');
  console.log('Session data:', req.session);
  
  // Check if user is logged in
  if (!req.session.user_id) {
    console.log('No user_id in session, returning 401');
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    // Delete all cart items for user
    db.prepare(`
      DELETE FROM cart_items
      WHERE user_id = ?
    `).run(req.session.user_id);
    
    console.log(`Cleared cart for user ${req.session.user_id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ error: 'Error clearing cart' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}`);
});