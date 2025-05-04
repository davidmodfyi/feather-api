const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Print current working directory for debugging
console.log('Current working directory:', process.cwd());

// Get the absolute path to the database file, handling Render deployment
let dbPath;

// Check if we're on Render (based on environment variables)
if (process.env.RENDER) {
  // On Render, use the full path where the repo is cloned
  dbPath = '/opt/render/project/src/featherstorefront.db';
} else {
  // In local development, use relative path
  dbPath = path.resolve(__dirname, 'featherstorefront.db');
}

console.log('Using database path:', dbPath);
console.log('Database file exists:', fs.existsSync(dbPath));

// Initialize database connection
let db;
try {
  db = new Database(dbPath);
  console.log('Database connection established');
} catch (err) {
  console.error('Failed to connect to database:', err.message);
  
  // Attempt an alternative path if the first one failed
  const altPath = path.resolve(process.cwd(), 'featherstorefront.db');
  console.log('Trying alternative path:', altPath);
  
  try {
    db = new Database(altPath);
    console.log('Database connection established with alternative path');
  } catch (altErr) {
    console.error('Failed to connect with alternative path:', altErr.message);
    throw new Error('Could not connect to database');
  }
}

// User functions - keep the original implementation
function getUserByUsername(username) {
  try {
    console.log(`Looking up user: ${username}`);
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    const user = stmt.get(username);
    console.log('User lookup result:', user ? 'Found' : 'Not found');
    return user;
  } catch (error) {
    console.error('Error in getUserByUsername:', error);
    throw error; // Re-throw to see the full error in logs
  }
}

// Products
function getProductsByDistributor(distributorId) {
  try {
    const stmt = db.prepare('SELECT * FROM products WHERE distributor_id = ?');
    return stmt.all(distributorId);
  } catch (error) {
    console.error('Error in getProductsByDistributor:', error);
    return [];
  }
}

// Accounts
function getAccountsByDistributor(distributorId) {
  try {
    const stmt = db.prepare('SELECT * FROM accounts WHERE distributor_id = ?');
    return stmt.all(distributorId);
  } catch (error) {
    console.error('Error in getAccountsByDistributor:', error);
    return [];
  }
}

module.exports = {
  getProductsByDistributor,
  getAccountsByDistributor,
  getUserByUsername
};