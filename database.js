// Simplified database.js fix - just focusing on connection
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Print current working directory for debugging
console.log('Current working directory:', process.cwd());

// Try multiple potential database paths
const possiblePaths = [
  path.resolve(process.cwd(), 'featherstorefront.db'),
  path.resolve(process.cwd(), '../featherstorefront.db'),
  path.resolve('/opt/render/project/src/featherstorefront.db')
];

let db;
let dbFound = false;

// Try each path until we find the database
for (const dbPath of possiblePaths) {
  console.log('Trying database path:', dbPath);
  
  if (fs.existsSync(dbPath)) {
    console.log('Database file found at:', dbPath);
    try {
      db = new Database(dbPath);
      console.log('Successfully connected to database');
      dbFound = true;
      break;
    } catch (err) {
      console.error(`Failed to connect to database at ${dbPath}:`, err.message);
    }
  } else {
    console.log('Database file not found at:', dbPath);
  }
}

if (!dbFound) {
  console.error('Could not find or connect to database file in any expected location');
  throw new Error('Database connection failed');
}

// User functions - no change to these existing functions
function getUserByUsername(username) {
  try {
    console.log(`Looking up user: ${username}`);
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    const user = stmt.get(username);
    console.log('User lookup result:', user || 'Not found');
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