const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Print current working directory for debugging
console.log('Current working directory:', process.cwd());

// Use absolute path to the database file
const dbPath = path.resolve(process.cwd(), 'featherstorefront.db');
console.log('Database path:', dbPath);

// Check if database file exists
const dbExists = fs.existsSync(dbPath);
console.log('Database file exists:', dbExists);

// Initialize database connection
let db;
try {
  db = new Database(dbPath);
  console.log('Database connection established');
} catch (err) {
  console.error('Failed to connect to database:', err.message);
  // Initialize with an in-memory database as fallback
  db = new Database(':memory:');
  console.log('Using in-memory database as fallback');
  
  // Create users table and add test users
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE,
      password TEXT,
      distributor_id TEXT,
      distributor_name TEXT
    );
    
    INSERT INTO users (username, password, distributor_id, distributor_name)
    VALUES 
      ('OceanWaveAdmin', 'secret123', 'dist001', 'Ocean Wave Foods'),
      ('PalmaCigarsAdmin', 'secret123', 'dist002', 'Palma Cigars');
  `);
}

// User functions
function getUserByUsername(username) {
  try {
    console.log(`Looking up user: ${username}`);
    
    // First try case-sensitive match
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    let user = stmt.get(username);
    
    if (!user) {
      // If not found, try case-insensitive match
      console.log('Case-sensitive match failed, trying case-insensitive');
      const insensitiveStmt = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)');
      user = insensitiveStmt.get(username);
    }
    
    console.log('User lookup result:', user || 'Not found');
    return user;
  } catch (error) {
    console.error('Error in getUserByUsername:', error);
    return null;
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