const Database = require('better-sqlite3');
const fs = require('fs');

// Make sure /data folder exists
if (!fs.existsSync('./data')) {
  fs.mkdirSync('./data');
}

// Connect to (or create) the SQLite database file
const db = new Database('./data/feather.db');

// Create tables if not existing
db.prepare(`
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  distributor_id TEXT,
  name TEXT,
  sku TEXT,
  unitPrice REAL,
  category TEXT
)`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  distributor_id TEXT,
  name TEXT,
  street TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  priceLevel INTEGER,
  paymentTerms TEXT,
  email TEXT
)`).run();

// Export simple functions to use
function getProductsByDistributor(distributorId) {
  return db.prepare('SELECT * FROM products WHERE distributor_id = ?').all(distributorId);
}

function getAccountsByDistributor(distributorId) {
  return db.prepare('SELECT * FROM accounts WHERE distributor_id = ?').all(distributorId);
}

function addProduct(product) {
  db.prepare('INSERT INTO products (id, distributor_id, name, sku, unitPrice, category) VALUES (?, ?, ?, ?, ?, ?)')
    .run(product.id, product.distributor_id, product.name, product.sku, product.unitPrice, product.category);
}

function addAccount(account) {
  db.prepare('INSERT INTO accounts (id, distributor_id, name, street, city, state, zip, priceLevel, paymentTerms, email)')
    .run(account.id, account.distributor_id, account.name, account.street, account.city, account.state, account.zip, account.priceLevel, account.paymentTerms, account.email);
}

module.exports = {
  getProductsByDistributor,
  getAccountsByDistributor,
  addProduct,
  addAccount
};