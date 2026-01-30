# PyloMarket - HarperDB + Next.js Prediction Market Platform

Decentralized prediction market platform built with HarperDB and Next.js, featuring a Polymarket-inspired UI.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Open [http://localhost:9926](http://localhost:9926)

## 📁 Project Structure

```
pylomarket/
├── app/
│   ├── actions/              # Server Actions (business logic)
│   │   ├── auth.ts           # Authentication
│   │   ├── wallet.ts         # Wallet & balance
│   │   ├── markets.ts        # Markets CRUD
│   │   ├── orders.ts         # Order book
│   │   ├── solana.ts         # Solana integration
│   │   └── index.ts          # Exports
│   ├── api/                  # REST API routes (for client components)
│   │   ├── auth/             # Login & register
│   │   ├── markets/          # Markets endpoints
│   │   ├── orders/           # Orders endpoints
│   │   └── wallet/           # Wallet endpoints
│   ├── components/          # React components
│   │   ├── Header.tsx        # Main header with logo & search
│   │   ├── MainNavigation.tsx # Category navigation
│   │   ├── FilterTags.tsx    # Filter tags (temporarily disabled)
│   │   ├── MarketCard.tsx    # Market card component
│   │   └── InfiniteMarketsList.tsx # Infinite scroll markets list
│   ├── auth/                # Auth pages
│   ├── markets/             # Market pages
│   └── wallet/              # Wallet pages
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Actions deployment workflow
├── seed/                    # Seed data (JSON files)
│   ├── users.json
│   ├── markets.json
│   ├── wallets.json
│   └── balances.json
├── config.yaml              # HarperDB configuration
├── schema.graphql           # Database schema
├── Dockerfile               # Integrated Docker build (HarperDB + Next.js)
└── package.json
```

## 🏗️ Architecture

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database**: HarperDB 4.7
- **Blockchain**: Solana (deposit integration)
- **Auth**: JWT tokens with HttpOnly Cookies (bcrypt for password hashing)
- **Styling**: Tailwind CSS
- **Deployment**: Docker + GitHub Actions → Digital Ocean Container Registry → VPS (using GitHub Environments)

### Data Flow

**Server Components:**
```
Server Component → Server Action → HarperDB (via databases import)
```

**Client Components:**
```
Client Component → API Route → Server Action → HarperDB
```

**Pattern:**
- **Server Components**: Call Server Actions directly (no HTTP overhead)
- **Client Components**: Call Server Actions directly (Next.js handles serialization automatically)
- **API Routes**: Legacy endpoints (still available, but prefer Server Actions for new code)
- **Server Actions**: Access HarperDB via `import { databases } from "harperdb"`
- **Authentication**: HttpOnly Cookies (automatic, no client-side token management needed)

## 🎯 Features

- ✅ **User Authentication** - JWT-based auth with HttpOnly Cookies (secure, scalable)
- ✅ **Prediction Markets** - Create and trade on markets
- ✅ **Order Book** - Limit orders with automatic matching
- ✅ **Wallet System** - System-managed encrypted wallets with Solana integration
- ✅ **Solana Integration** - Crypto deposits via polling, withdrawals via hot wallet
- ✅ **Polymarket-style UI** - Modern, responsive design with infinite scroll
- ✅ **Category Navigation** - Filter markets by category
- ✅ **Real-time Updates** - Live market data
- ✅ **Server Actions** - Modern Next.js Server Actions for all backend operations

## 📖 Usage Examples

### Server Actions (from Server Components)

```typescript
import { listMarkets } from '@/actions';

// In a Server Component
export default async function MarketsPage() {
  const result = await listMarkets({ 
    resolved: false, 
    limit: 20 
  });
  
  if (result.success) {
    return <div>{/* render markets */}</div>;
  }
}
```

### API Routes (from Client Components)

```typescript
'use client';

// In a Client Component
async function fetchMarkets() {
  const response = await fetch('/api/markets?resolved=false&limit=20');
  const data = await response.json();
  return data.markets;
}
```

### Available Server Actions

**Auth:**
- `registerUser(email, password, username)`
- `loginUser(email, password)`
- `verifyToken(token)`

**Markets:**
- `listMarkets({ category?, resolved?, limit?, offset? })`
- `getMarket(marketId)`
- `createMarket(data)`
- `resolveMarket(marketId, resolution)`

**Orders:**
- `placeOrder(userId, marketId, side, outcome, price, quantity)`
- `cancelOrder(orderId, userId)`
- `getOrders(filters)`
- `getOrderbook(marketId)`

**Wallet:**
- `getWallet()` - Get current user's wallet (uses HttpOnly cookie auth)
- `createWallet()` - Create wallet for current user (auto-called on login if needed)
- `getBalance()` - Get current user's balance
- `getTransactions(limit)` - Get transaction history for current user
- `checkDeposits()` - Check and credit Solana deposits for current user
- `withdraw(toAddress, amount)` - Withdraw SOL from current user's balance

**Solana:**
- `pollDeposits(address)`
- `pollUserDeposits(userId)`

## 🔧 Configuration

### Environment Variables

```env
# JWT Secret (required)
JWT_SECRET=your-secret-key-change-in-production

# Encryption Key (optional, falls back to JWT_SECRET if not set)
ENCRYPTION_KEY=your-encryption-key

# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# Hot Wallet (required for withdrawals)
HOT_WALLET_PRIVATE_KEY=your-hot-wallet-private-key-base64-or-array

# HarperDB (optional, defaults in config.yaml)
HARPERDB_USERNAME=HDB_ADMIN
HARPERDB_PASSWORD=password

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# SMTP Email Configuration (optional - if not set, emails will be logged to console)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false  # true for 465, false for 587/25
SMTP_USER=your-email@example.com
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@pylomarket.com  # Optional, defaults to SMTP_USER
```

**Note**: For production deployment, use GitHub Environments to manage secrets and variables. See `.github/SECRETS_SETUP.md` for details.

### HarperDB Config (`config.yaml`)

```yaml
# GraphQL Schema - defines database tables
graphqlSchema:
  files: './schema.graphql'

# Data Loader - seed data for initial population
dataLoader:
  files: './seed/*.json'

# Next.js Integration
'@harperdb/nextjs':
  package: '@harperdb/nextjs'
  files: '*'
  prebuilt: false  # Auto-set to true in Dockerfile for production
```

## 🗄️ Database Schema

The database schema is defined in `schema.graphql`:

- **users** - User accounts
- **wallets** - Solana wallet addresses
- **balances** - User balances
- **markets** - Prediction markets
- **orders** - Limit orders
- **trades** - Executed trades
- **transactions** - Balance transactions

All tables are automatically created by HarperDB when the app starts.

## 🚦 Development

### Add New Server Action

1. Create action file:
```typescript
// app/actions/newfeature.ts
'use server';

import { databases } from "harperdb";

const { YourTable } = databases.pylomarket;

export async function doSomething(param: string) {
  try {
    const result = await (YourTable as any).search({});
    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}
```

2. Export from index:
```typescript
// app/actions/index.ts
export { doSomething } from './newfeature';
```

3. Use in Server Component:
```typescript
import { doSomething } from '@/actions';

export default async function Page() {
  const result = await doSomething('param');
  // ...
}
```

4. Or use in API route (for client components):
```typescript
// app/api/newfeature/route.ts
import { doSomething } from '@/actions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const param = request.nextUrl.searchParams.get('param');
  const result = await doSomething(param || '');
  return NextResponse.json(result);
}
```

### Database Migration

```bash
# Update schema.graphql
# Restart dev server - HarperDB will auto-migrate
npm run dev
```

### Seed Data

```bash
# Edit files in seed/ directory
# Restart server to load new data
npm run dev
```

## 📦 Deployment

### GitHub Actions (Automated)

The project uses GitHub Actions to automatically build and deploy to Digital Ocean Container Registry and VPS.

**Workflow:** `.github/workflows/deploy.yml`

**Process:**
1. Build Docker image with integrated HarperDB + Next.js
2. Push to Digital Ocean Container Registry
3. Deploy to primary VPS node (sequential)
4. Deploy to replica nodes (peer-to-peer replication)

**Required GitHub Secrets:**
- `DOCR_USERNAME` - Digital Ocean Container Registry username
- `DOCR_PASSWORD` - Digital Ocean Container Registry password
- `DOCR_REGISTRY_NAME` - Registry name
- `VPS_SSH_PRIVATE_KEY` - SSH private key for VPS access
- `VPS_USER` - SSH user (default: root)
- `HARPERDB_USERNAME` - HarperDB admin username
- `HARPERDB_PASSWORD` - HarperDB admin password
- `JWT_SECRET` - JWT secret key
- `SOLANA_RPC_URL` - Solana RPC endpoint (optional)
- `APP_PORT` - External port mapping (default: 443)

See `.github/SECRETS_SETUP.md` for detailed setup instructions.

### Manual Docker Deployment

```bash
# Build Docker image
docker build -t pylomarket:latest .

# Run container
docker run -d \
  --name pylomarket-app \
  -p 9925:9925 \
  -p 9926:9926 \
  --env-file .env \
  -v harperdb_data:/opt/harperdb/hdb \
  --restart unless-stopped \
  pylomarket:latest
```

**Ports:**
- `9925` - HarperDB HTTP Operations API and Studio UI
- `9926` - HarperDB HTTPS (Next.js app served here)

**Environment Variables:**
- `HDB_ADMIN_USERNAME` - HarperDB admin username
- `HDB_ADMIN_PASSWORD` - HarperDB admin password
- `JWT_SECRET` - JWT secret key
- `ENCRYPTION_KEY` - Encryption key (optional, falls back to JWT_SECRET)
- `HOT_WALLET_PRIVATE_KEY` - Hot wallet private key (required for withdrawals)
- `SOLANA_RPC_URL` - Solana RPC endpoint
- `NEXT_PUBLIC_SOLANA_NETWORK` - Solana network (devnet/mainnet)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth (optional)
- `SMTP_*` - Email configuration (optional)

**Data Persistence:**
- HarperDB data is stored in Docker volume `harperdb_data`
- To backup: `docker run --rm -v harperdb_data:/data -v $(pwd):/backup alpine tar czf /backup/harperdb-backup.tar.gz /data`

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Windows (PowerShell)
netstat -ano | findstr :9926
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:9926 | xargs kill -9
```

### HarperDB Connection Issues
```bash
# Check HarperDB is running
curl http://localhost:9925

# Check Docker logs
docker logs pylomarket-app
```

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Module Not Found Errors
- Make sure all Server Actions use `'use server'` directive
- Use `import { databases } from "harperdb"` pattern
- Don't use `import('harperdb')` dynamic imports
- Use `@/actions` path alias for imports

### Deployment Issues
- Check GitHub Actions logs in `.github/workflows/deploy.yml`
- Verify all required secrets are set in GitHub Environment (`production`) and repository settings
- Ensure `production` environment is created and configured
- Check that environment variables use `vars.VARIABLE_NAME` and secrets use `secrets.SECRET_NAME`
- Ensure VPS has Docker installed and SSH access is configured
- Check Docker logs on VPS: `docker logs pylomarket-app-prod`
- Verify GitHub Environment protection rules (if enabled) don't block deployment

## 📊 Project Status

**Status**: ✅ Production Ready

**Recent Changes:**
- ✅ Migrated from HarperDB Resources to Next.js Server Actions
- ✅ Implemented HttpOnly Cookies authentication (secure, scalable)
- ✅ Migrated wallet operations to Server Actions (no REST API needed)
- ✅ Added automatic wallet creation on user login
- ✅ Implemented encrypted wallet private key storage
- ✅ Fixed WebSocket errors (removed jsResource conflicts)
- ✅ Redesigned UI with Polymarket-inspired layout
- ✅ Implemented infinite scroll for markets
- ✅ Added category navigation and filtering
- ✅ Automated deployment via GitHub Actions with GitHub Environments
- ✅ Docker-based deployment (integrated HarperDB + Next.js)
- ✅ Multi-VPS deployment with peer-to-peer replication

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

## 📄 License

MIT License

## 🙏 Acknowledgments

- [HarperDB](https://harperdb.io/) - Database platform
- [Next.js](https://nextjs.org/) - React framework
- [Solana](https://solana.com/) - Blockchain integration
- [Polymarket](https://polymarket.com/) - UI design inspiration

---

Built with ❤️ using HarperDB + Next.js
