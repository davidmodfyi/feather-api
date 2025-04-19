# Feather Storefront API (v2 - Multi-Distributor Mock)

This version includes:
- Session-based login for Distributors (and optionally Accounts)
- In-memory mock data for Distributors, Accounts, and Products
- Filtered `/api/items` based on logged-in Distributor

## Endpoints

### POST /login
Body:
{
  "distributorId": "dist001",
  "accountId": "acct101" // optional
}

### GET /api/items
Returns products only for the authenticated Distributor

## Setup

1. Copy `.env.example` to `.env`
2. Run `npm install`
3. Start with `npm start`