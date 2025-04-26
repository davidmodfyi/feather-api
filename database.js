const Database = require('better-sqlite3');
const db = new Database('featherstorefront.db');

// Products
function getProductsByDistributor(distributorId) {
  const stmt = db.prepare('SELECT * FROM products WHERE distributor_id = ?');
  return stmt.all(distributorId);
}

// Accounts
function getAccountsByDistributor(distributorId) {
  const stmt = db.prepare('SELECT * FROM accounts WHERE distributor_id = ?');
  return stmt.all(distributorId);
}

function getUserByUsername(username) {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  return stmt.get(username);
}

module.exports = {
  getProductsByDistributor,
  getAccountsByDistributor,
  getUserByUsername
};

