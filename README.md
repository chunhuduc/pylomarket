# PyloMarket

A prediction markets platform clone of Polymarket, built with Next.js, HarperDB, and Solana integration.

## Features

- **Prediction Markets**: Create and trade on prediction markets
- **Order Book**: Buy/sell YES/NO positions with order book matching
- **Wallet Management**: Solana devnet integration for crypto deposits
- **User Authentication**: Email/password authentication with JWT
- **Balance Tracking**: Internal ledger for user balances

## Tech Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Database**: HarperDB (with custom functions support)
- **Blockchain**: Solana (Devnet)
- **Deployment**: Docker Compose

## Architecture

**HarperDB Builtin Next.js App Architecture:**

```
┌─────────────────────────────┐
│  HarperDB Builtin Node      │
│  ┌──────────┐  ┌──────────┐ │
│  │ Next.js │  │ Custom   │ │
│  │   App   │  │Functions │ │
│  └────┬────┘  └────┬─────┘ │
│       │            │        │
│       └─────┬──────┘        │
│             ▼               │
│       ┌──────────┐          │
│       │ HarperDB │          │
│       │ Database │          │
│       └──────────┘          │
└─────────────────────────────┘
```

**Benefits:**
- **Auto-deployment**: Custom functions auto-sync from `custom_functions/` folder
- **Hot reload**: Changes reflect immediately in development
- **Integrated**: Everything in one container
- **Studio UI**: Visual schema management via HarperDB Studio
- **Simplified**: No need for separate API service

## Prerequisites

- Node.js 20+
- Docker and Docker Compose
- npm or yarn

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd pylomarket
```

### 2. Set up environment variables

Create a `.env` file in the root directory:

```env
# HarperDB Configuration
HARPERDB_USERNAME=HDB_ADMIN
HARPERDB_PASSWORD=password
HARPERDB_URL=http://localhost:9925

# Next.js Configuration
NEXT_PUBLIC_HARPERDB_URL=http://localhost:9925

# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# JWT Secret
JWT_SECRET=your-secret-key-change-in-production
```

### 3. Install dependencies

```bash
cd apps/web
npm install
```

### 4. Setup HarperDB Schema

**Recommended: Use HarperDB Studio** (visual, easier to manage):

1. Start HarperDB:
```bash
docker-compose up harperdb -d
```

2. Access HarperDB Studio: http://localhost:9926
   - Login with credentials (default: HDB_ADMIN / password)
   - Create schema: `pylomarket`
   - Create tables: `users`, `wallets`, `balances`, `markets`, `orders`, `trades`, `transactions`
   - See `HARPERDB_SETUP.md` for detailed table structure and attributes

**Note**: Custom functions in `custom_functions/` folder are automatically deployed when HarperDB starts.

**Alternative: Bootstrap Script** (if you prefer command-line):
```bash
# After starting HarperDB
node scripts/bootstrap.js
```

### 5. Start the application

```bash
# From root directory
docker-compose up
```

Or for development:

```bash
# Terminal 1: Start HarperDB
docker-compose up harperdb -d

# Terminal 2: Run Next.js dev server
cd apps/web
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- HarperDB Studio: http://localhost:9926
- HarperDB API: http://localhost:9925

## Project Structure

```
pylomarket/
├── apps/
│   └── web/                 # Next.js application
│       ├── app/            # App router pages
│       │   ├── api/       # API routes (call custom functions)
│       │   ├── auth/      # Authentication pages
│       │   ├── markets/   # Market pages
│       │   └── wallet/    # Wallet page
│       ├── components/    # React components
│       └── lib/           # Utility functions
│           ├── harperdb.ts          # HarperDB REST client
│           └── harperdb-functions.ts # Custom function helpers
├── custom_functions/      # HarperDB custom functions (auto-deployed)
│   ├── auth.js           # Authentication
│   ├── wallet.js         # Wallet management
│   ├── markets.js        # Market operations
│   ├── orderbook.js      # Order book matching
│   └── solana_poll.js    # Solana deposit polling
├── harperdb/             # Optional: Schema reference
│   └── schema/           # Schema definitions (reference only)
├── scripts/
│   └── bootstrap.js      # Database bootstrap script (optional, use Studio instead)
├── docker-compose.yml    # Docker configuration
└── HARPERDB_SETUP.md     # Detailed HarperDB setup guide
```

## Database Schema

The application uses the following tables in the `pylomarket` schema:

- **users**: User accounts
- **wallets**: Solana wallet addresses
- **balances**: User balances
- **markets**: Prediction markets
- **orders**: Order book orders
- **trades**: Executed trades
- **transactions**: Transaction history

## API Endpoints

All API routes call HarperDB custom functions automatically.

### Authentication
- `POST /api/auth/register` - Register new user (calls `custom_functions/auth.js`)
- `POST /api/auth/login` - Login user (calls `custom_functions/auth.js`)

### Markets
- `GET /api/markets` - List markets (calls `custom_functions/markets.js`)
- `POST /api/markets` - Create market (calls `custom_functions/markets.js`)
- `GET /api/markets/[id]` - Get market details (calls `custom_functions/markets.js`)

### Orders
- `POST /api/orders` - Place order (calls `custom_functions/orderbook.js`)
- `GET /api/orders` - Get user orders (calls `custom_functions/orderbook.js`)

### Wallet
- `GET /api/wallet/balance` - Get user balance (calls `custom_functions/wallet.js`)
- `POST /api/wallet/deposit` - Record deposit (uses direct HarperDB access)
- `GET /api/wallet/solana/address` - Get Solana deposit address (uses direct HarperDB access)
- `POST /api/wallet/solana/poll` - Poll for Solana deposits (calls `custom_functions/solana_poll.js`)

### Custom Functions (Direct Access)

You can also call custom functions directly:
- `POST http://localhost:9925/custom_function/{function_name}`
- See `HARPERDB_SETUP.md` for details

## Development

### Running in Development Mode

1. **Start HarperDB** (custom functions auto-deploy from `custom_functions/` folder):
```bash
docker-compose up harperdb -d
```

2. **Setup schema via HarperDB Studio** (one-time setup):
   - Access http://localhost:9926
   - Login (default: HDB_ADMIN / password)
   - Create schema `pylomarket` and all tables
   - See `HARPERDB_SETUP.md` for detailed instructions

3. **Run Next.js dev server**:
```bash
cd apps/web
npm run dev
```

4. **Custom functions hot reload**:
   - Edit files in `custom_functions/` folder
   - Changes are automatically deployed (hot reload in dev mode)
   - No need to restart HarperDB container

### Building for Production

```bash
cd apps/web
npm run build
npm start
```

Or use Docker:
```bash
docker-compose up --build
```

## Solana Integration

The application uses Solana Devnet for deposits:

1. Users can generate a Solana deposit address
2. Send SOL to the address on Devnet
3. Use the "Check for Deposits" button to poll for new deposits
4. Deposits are automatically credited to user balance

**Note**: This is for development only. In production, you would:
- Use mainnet or a production network
- Implement proper key management
- Set up automated polling/event listeners
- Use proper price oracles for SOL/USD conversion

## Testing

Basic API tests can be added in the `tests/` directory. For now, you can test the API endpoints using:

- Postman
- curl
- The Next.js frontend

## Deployment

### Docker Deployment

```bash
docker-compose up -d
```

### Environment Variables for Production

Make sure to set proper environment variables:
- Strong `HARPERDB_PASSWORD`
- Strong `JWT_SECRET`
- Production Solana RPC URL (if using mainnet)
- Update `NEXT_PUBLIC_HARPERDB_URL` for production

## HarperDB Builtin Features Used

✅ **Custom Functions Auto-Deployment**: Functions in `custom_functions/` are automatically deployed
✅ **Hot Reload**: Changes to custom functions reflect immediately in dev mode
✅ **Schema Management**: Visual schema management via HarperDB Studio
✅ **Integrated API**: Custom functions accessible via HTTP endpoints
✅ **Scheduled Jobs**: Can set up scheduled jobs for Solana polling (see `HARPERDB_SETUP.md`)

## Known Limitations (MVP)

- Simplified order matching (not production-ready)
- Fixed SOL/USD conversion rate (100 USD per SOL)
- Manual deposit polling (can be automated via scheduled jobs)
- Basic authentication (no 2FA, password reset, etc.)
- No market resolution automation
- No position tracking/settlement

## Future Enhancements

- Automated deposit detection
- Real-time order book updates
- Market resolution automation
- Position tracking and P&L
- Advanced order types (limit, market, stop-loss)
- User profiles and history
- Admin dashboard for market creation
- Mobile responsive improvements

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
