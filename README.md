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
- **Database**: HarperDB (with Applications/Resources support)
- **Blockchain**: Solana (Devnet)
- **Deployment**: Docker Compose

## Architecture

**HarperDB 4.7 Applications Architecture:**

```
┌─────────────────────────────┐
│  Next.js App (localhost:3000)│
│  ┌─────────────────────────┐ │
│  │  API Routes (Proxy)     │ │
│  └───────────┬──────────────┘ │
└──────────────┼───────────────┘
               │
               ▼
┌─────────────────────────────┐
│  HarperDB Container         │
│  ┌─────────────────────────┐ │
│  │  Application Resources  │ │
│  │  (AuthResource, etc.)   │ │
│  └───────────┬──────────────┘ │
│              │                │
│              ▼                │
│       ┌──────────┐           │
│       │ HarperDB │           │
│       │ Database │           │
│       └──────────┘           │
└─────────────────────────────┘
```

**Benefits:**
- **HarperDB 4.7 Applications**: Uses modern Resource-based architecture (custom_functions deprecated)
- **Auto-detection**: HarperDB auto-detects file changes and auto-restarts
- **Schema-first**: Tables defined via GraphQL schema
- **RESTful endpoints**: Resources automatically generate REST endpoints
- **Studio UI**: Visual schema management via HarperDB Studio
- **Built-in integration**: Next.js can run separately or be built-in with HarperDB container

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
# Install root dependencies (HarperDB app dependencies: bcryptjs, jsonwebtoken, @solana/web3.js)
npm install

# Note: Next.js app dependencies should be installed separately if app/package.json exists
# Otherwise, dependencies are managed at root level
```

### 4. Setup HarperDB Schema

**Recommended: Use HarperDB Studio** (visual, easier to manage):

1. Start HarperDB:
```bash
docker-compose up harperdb -d
```

2. Access HarperDB Studio: http://localhost:9925
   - Login with credentials (default: HDB_ADMIN / password)
   - Create schema: `pylomarket`
   - Create tables: `users`, `wallets`, `balances`, `markets`, `orders`, `trades`, `transactions`

**Note**: HarperDB Application files (`schema.graphql`, `resources.js`, `config.yaml`) are automatically detected when HarperDB starts. Next.js app is built-in with HarperDB.


**Seed Initial Data** (optional, for testing):
```bash
# After creating schema and tables
node scripts/seed.js
```
This will populate sample users, markets, and balances for testing. The script is idempotent (safe to run multiple times).

**Verify Setup** (recommended):
```bash
# Verify HarperDB connection, schema, tables, and Resources
node scripts/verify-setup.js
```
This will check if everything is configured correctly before starting the Next.js app.

**Install Application Dependencies** (if needed):
```bash
# Install dependencies for HarperDB application (bcryptjs, jsonwebtoken, @solana/web3.js)
# These are defined in root package.json
npm install

# If running in Docker, install in container:
docker exec pylomarket-harperdb sh -c 'cd /opt/harperdb/applications/pylomarket && npm install'

# Restart HarperDB (auto-detects changes)
docker restart pylomarket-harperdb
```

HarperDB automatically detects the application files (`schema.graphql`, `resources.js`, `config.yaml`) mounted to `/opt/harperdb/applications/pylomarket/` and loads Resources defined in `resources.js`. Next.js app is served from the same application directory when using integrated container.

### 5. Start the application

**Option A: Integrated Container (Production-like)**
```bash
# Build and run integrated container (HarperDB + Next.js in one)
docker-compose up integrated -d
```
- Access Next.js app: https://localhost:9926 (HTTPS)
- Access HarperDB Studio: http://localhost:9925

**Option B: Separate Services (Development)**
```bash
# Terminal 1: Start HarperDB
docker-compose up harperdb -d

# Terminal 2: Run Next.js dev server (auto-connects to HarperDB)
npm run dev
# Or if app/package.json exists: cd app && npm run dev
```
- Access Next.js app: http://localhost:3000
- Next.js will auto-detect and connect to HarperDB at http://localhost:9925

The application will be available at:
- **Integrated Container** (Production):
  - Next.js app: https://localhost:9926 (HTTPS)
  - HarperDB Studio: http://localhost:9925
- **Development Mode**:
  - Next.js app: http://localhost:3000 (auto-connects to HarperDB)
  - HarperDB Studio: http://localhost:9925
- **HarperDB Ports**:
  - 9925: HTTP Operations API and Studio UI
  - 9926: HTTPS, WebSocket, MQTT WSS (also serves Next.js app in integrated mode)

## Project Structure

```
pylomarket/
├── app/                     # Next.js application
│   ├── app/                # App router pages
│   │   ├── api/            # API routes (call Resources)
│   │   ├── auth/           # Authentication pages
│   │   ├── markets/        # Market pages
│   │   └── wallet/         # Wallet page
│   ├── components/         # React components
│   │   └── Navbar.tsx
│   ├── lib/                # Utility functions
│   │   ├── harperdb.ts     # HarperDB REST client (for direct DB access if needed)
│   │   ├── harperdb-functions.ts # Resource helpers (recommended)
│   │   ├── harperdb-connection.ts # Connection utilities
│   │   └── solana.ts       # Solana utility functions
│   ├── favicon.ico
│   ├── globals.css
│   └── layout.tsx
├── config.yaml             # HarperDB application configuration
├── schema.graphql          # GraphQL schema (table definitions)
├── resources.js            # Resource classes (AuthResource, WalletResource, etc.)
├── package.json            # Root package.json (HarperDB app dependencies)
├── seed/                   # Seed data for initial population
│   └── data.json          # Sample data (users, markets, balances)
├── scripts/                # Utility scripts
│   ├── seed.js            # Seed data script
│   ├── verify-setup.js    # Setup verification script
│   └── verify-application.js # Application verification script
├── Dockerfile.integrated   # Integrated Docker image (HarperDB + Next.js)
├── docker-compose.yml      # Docker configuration (development)
└── docker-compose.prod.yml # Docker configuration (production)
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

All API routes call HarperDB Resources automatically.

### Authentication
- `POST /api/auth/register` - Register new user (calls `AuthResource`)
- `POST /api/auth/login` - Login user (calls `AuthResource`)

### Markets
- `GET /api/markets` - List markets (calls `MarketResource`)
- `POST /api/markets` - Create market (calls `MarketResource`)
- `GET /api/markets/[id]` - Get market details (calls `MarketResource`)

### Orders
- `POST /api/orders` - Place order (calls `OrderResource`)
- `GET /api/orders` - Get user orders (calls `OrderResource`)

### Wallet
- `GET /api/wallet/balance` - Get user balance (calls `WalletResource`)
- `POST /api/wallet/deposit` - Record deposit (uses direct HarperDB access)
- `GET /api/wallet/solana/address` - Get Solana deposit address (uses direct HarperDB access)
- `POST /api/wallet/solana/poll` - Poll for Solana deposits (calls `SolanaResource`)

### Resources (Direct Access)

You can also call Resources directly:
- `POST http://localhost:9925/AuthResource` (with `action: 'login'` or `'register'`)
- `POST http://localhost:9925/WalletResource` (with `action: 'get_balance'`, etc.)

## Development

### Running in Development Mode

1. **Start HarperDB** (Application auto-detects from root files):
```bash
docker-compose up harperdb -d
```

2. **Setup schema via HarperDB Studio** (one-time setup):
   - Access http://localhost:9925
   - Login (default: HDB_ADMIN / password)
   - Create schema `pylomarket` and all tables

3. **Run Next.js app** (choose one):

   **Option A: Integrated Container** (Production):
   ```bash
   docker-compose up integrated -d
   ```
   - Single container with HarperDB + Next.js app
   - Next.js app is built into the image
   - Access via: `https://localhost:9926` (HTTPS)
   - No separate startup script needed - uses HarperDB's native capabilities

   **Option B: Development Mode** (Recommended for dev):
   ```bash
   # From root directory
   npm run dev
   # Or if app/package.json exists:
   cd app && npm run dev
   ```
   - Access via: `http://localhost:3000`

4. **Application hot reload**:
   - Edit files in root: `schema.graphql`, `resources.js`, `config.yaml`
   - HarperDB auto-detects changes and auto-restarts
   - No need to manually restart HarperDB container

### Building for Production

**Using Docker (Recommended):**
```bash
# Build and run integrated container
docker-compose -f docker-compose.prod.yml up -d --build
```

**Or manually:**
```bash
# Build Next.js app (if app/package.json exists)
cd app
npm run build
npm start
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

You can test the API endpoints using:

- Postman
- curl
- The Next.js frontend
- HarperDB Studio (http://localhost:9925)

## Deployment

### Manual Deployment

**Production Deployment:**

1. **On VPS/Server:**
   ```bash
   # Clone repository
   git clone <repository-url>
   cd pylomarket
   
   # Create .env file with production values
   # Set strong passwords and secrets
   
   # Build and run
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

2. **Environment Variables for Production:**
   Create `.env` file with:
   - Strong `HARPERDB_PASSWORD`
   - Strong `JWT_SECRET`
   - Production Solana RPC URL (if using mainnet)
   - Update `NEXT_PUBLIC_HARPERDB_URL` for production domain
   - Set `NODE_ENV=production`

**Files:**
- `docker-compose.prod.yml` - Production Docker Compose config
- `Dockerfile.integrated` - Integrated Docker image (HarperDB + Next.js)

## HarperDB Builtin Features Used

✅ **Applications Architecture**: Uses HarperDB 4.7 Applications (Resources) instead of deprecated custom_functions
✅ **Auto-Detection**: Application files (`schema.graphql`, `resources.js`, `config.yaml`) in root are automatically detected and loaded
✅ **Hot Reload**: Changes to Resources reflect immediately (HarperDB auto-restarts)
✅ **Schema Management**: Visual schema management via HarperDB Studio
✅ **Integrated API**: Resources accessible via HTTP endpoints (e.g., `/AuthResource`, `/WalletResource`)
✅ **Scheduled Jobs**: Can set up scheduled jobs for Solana polling
✅ **Integrated Container**: Single Docker image with HarperDB + Next.js app (see `Dockerfile.integrated`)
✅ **Dev Auto-Connect**: Next.js automatically detects and connects to HarperDB in development mode

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
