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

```
┌─────────────┐
│  Next.js    │
│    App      │
└──────┬──────┘
       │ HTTP/REST
       ▼
┌─────────────┐
│  HarperDB    │
│ Custom Funcs │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  HarperDB    │
│  Database   │
└─────────────┘
```

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

### 4. Bootstrap HarperDB schema

Before starting the services, you need to create the database schema. You can do this by:

1. Starting HarperDB first:
```bash
docker-compose up harperdb -d
```

2. Wait for HarperDB to be ready, then run the bootstrap script:
```bash
node scripts/bootstrap.js
```

Or use the HarperDB Studio (available at http://localhost:9926) to create the schema manually.

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
│       │   ├── api/       # API routes
│       │   ├── auth/      # Authentication pages
│       │   ├── markets/   # Market pages
│       │   └── wallet/    # Wallet page
│       ├── components/    # React components
│       └── lib/           # Utility functions
├── harperdb/
│   ├── functions/         # HarperDB custom functions
│   └── schema/           # Schema definitions
├── scripts/
│   └── bootstrap.js      # Database bootstrap script
└── docker-compose.yml    # Docker configuration
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

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Markets
- `GET /api/markets` - List markets
- `POST /api/markets` - Create market
- `GET /api/markets/[id]` - Get market details

### Orders
- `POST /api/orders` - Place order
- `GET /api/orders` - Get user orders

### Wallet
- `GET /api/wallet/balance` - Get user balance
- `POST /api/wallet/deposit` - Record deposit
- `GET /api/wallet/solana/address` - Get Solana deposit address
- `POST /api/wallet/solana/poll` - Poll for Solana deposits

## Development

### Running in Development Mode

1. Start HarperDB:
```bash
docker-compose up harperdb -d
```

2. Run Next.js dev server:
```bash
cd apps/web
npm run dev
```

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

## Known Limitations (MVP)

- Simplified order matching (not production-ready)
- Fixed SOL/USD conversion rate (100 USD per SOL)
- Manual deposit polling (not automated)
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
