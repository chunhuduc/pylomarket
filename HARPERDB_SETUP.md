# HarperDB Builtin Next.js App Setup Guide

This guide explains how to use HarperDB's builtin Next.js app features for PyloMarket.

## Custom Functions

Custom functions are located in the `custom_functions/` folder and are automatically deployed by HarperDB when the container starts.

### Available Custom Functions

1. **auth.js** - User authentication (register, login, verify token)
2. **wallet.js** - Wallet management (create wallet, get balance, update balance)
3. **markets.js** - Market management (create, list, get, resolve markets)
4. **orderbook.js** - Order book operations (place order, cancel, match orders)
5. **solana_poll.js** - Solana deposit polling (scheduled job)

### Deploying Custom Functions

Custom functions are automatically synced when placed in the `custom_functions/` folder. HarperDB will:

- Auto-detect new functions
- Hot reload in development mode
- Deploy to production automatically

### Calling Custom Functions

Custom functions are accessible via HTTP endpoints:

```
POST http://localhost:9925/custom_function/{function_name}
```

Example:
```javascript
// Call auth function
const response = await fetch('http://localhost:9925/custom_function/auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    operation: 'login',
    data: { email: 'user@example.com', password: 'password' }
  })
});
```

## Schema Management via HarperDB Studio

Instead of using bootstrap scripts, manage your schema through HarperDB Studio:

1. **Access HarperDB Studio**: http://localhost:9926
2. **Login** with your credentials (default: HDB_ADMIN / password)
3. **Create Schema**: 
   - Click "Add Schema"
   - Name: `pylomarket`
4. **Create Tables**:
   - Click "Add Table" in the schema
   - Tables to create:
     - `users` (hash_attribute: `id`)
     - `wallets` (hash_attribute: `id`)
     - `balances` (hash_attribute: `id`)
     - `markets` (hash_attribute: `id`)
     - `orders` (hash_attribute: `id`)
     - `trades` (hash_attribute: `id`)
     - `transactions` (hash_attribute: `id`)

### Table Attributes

Each table should have these attributes defined in Studio:

**users:**
- id (string)
- email (string)
- password_hash (string)
- username (string)
- created_at (datetime)
- updated_at (datetime)

**wallets:**
- id (string)
- user_id (string)
- solana_address (string)
- created_at (datetime)
- updated_at (datetime)

**balances:**
- id (string)
- user_id (string)
- balance (number)
- currency (string)
- updated_at (datetime)

**markets:**
- id (string)
- title (string)
- description (string)
- category (string)
- end_date (datetime)
- resolved (boolean)
- resolution (string)
- created_at (datetime)
- updated_at (datetime)

**orders:**
- id (string)
- market_id (string)
- user_id (string)
- side (string)
- outcome (string)
- price (number)
- quantity (number)
- filled_quantity (number)
- status (string)
- created_at (datetime)
- updated_at (datetime)

**trades:**
- id (string)
- market_id (string)
- buy_order_id (string)
- sell_order_id (string)
- buyer_id (string)
- seller_id (string)
- outcome (string)
- price (number)
- quantity (number)
- created_at (datetime)

**transactions:**
- id (string)
- user_id (string)
- type (string)
- amount (number)
- currency (string)
- status (string)
- solana_signature (string)
- metadata (string)
- created_at (datetime)

## Development Workflow

1. **Start HarperDB**:
   ```bash
   docker-compose up harperdb -d
   ```

2. **Access HarperDB Studio**: http://localhost:9926
   - Create schema and tables as described above

3. **Custom Functions**:
   - Edit files in `custom_functions/` folder
   - Changes are auto-synced (hot reload in dev mode)

4. **Next.js App**:
   - If using HarperDB's builtin Next.js, it's served from HarperDB container
   - Otherwise, run separately: `cd apps/web && npm run dev`

## API Integration

The Next.js app can call custom functions directly:

```typescript
// In your Next.js API routes or components
const response = await fetch(`${process.env.NEXT_PUBLIC_HARPERDB_URL}/custom_function/auth`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    operation: 'login',
    data: { email, password }
  })
});
```

## Scheduled Jobs

For Solana deposit polling, you can set up a scheduled job in HarperDB:

1. Go to HarperDB Studio
2. Navigate to "Scheduled Jobs"
3. Create a new job:
   - Function: `solana_poll`
   - Schedule: Every 5 minutes (or as needed)
   - Operation: `poll_deposits`

Or call it manually via API when user clicks "Check for Deposits".

## Benefits of This Approach

1. **Auto-deployment**: Custom functions auto-sync
2. **Hot reload**: Changes reflect immediately in dev
3. **Integrated**: Everything in one container
4. **Studio UI**: Visual schema management
5. **Simplified**: No need for separate API service
