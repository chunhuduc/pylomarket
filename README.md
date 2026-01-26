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
- **Auth**: JWT tokens with bcrypt
- **Styling**: Tailwind CSS
- **Deployment**: Docker + GitHub Actions → Digital Ocean Container Registry → VPS

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
- **Client Components**: Call API Routes → API Routes call Server Actions
- **Server Actions**: Access HarperDB via `import { databases } from "harperdb"`

## 🎯 Features

- ✅ **User Authentication** - JWT-based auth with bcrypt
- ✅ **Prediction Markets** - Create and trade on markets
- ✅ **Order Book** - Limit orders with automatic matching
- ✅ **Wallet System** - Virtual balance management
- ✅ **Solana Integration** - Crypto deposits via polling
- ✅ **Polymarket-style UI** - Modern, responsive design with infinite scroll
- ✅ **Category Navigation** - Filter markets by category
- ✅ **Real-time Updates** - Live market data

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
- `createWallet(userId, solanaAddress)`
- `getWallet(userId)`
- `getBalance(userId)`
- `updateBalance(userId, amount, type)`
- `getTransactions(userId, limit)`

**Solana:**
- `pollDeposits(address)`
- `pollUserDeposits(userId)`

## 🔧 Configuration

### Environment Variables

```env
# JWT Secret
JWT_SECRET=your-secret-key-change-in-production

# Solana RPC
SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# HarperDB (optional, defaults in config.yaml)
HARPERDB_USERNAME=HDB_ADMIN
HARPERDB_PASSWORD=password
```

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
- `SOLANA_RPC_URL` - Solana RPC endpoint
- `NEXT_PUBLIC_SOLANA_NETWORK` - Solana network (devnet/mainnet)

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
- Verify all required secrets are set in GitHub repository settings
- Ensure VPS has Docker installed and SSH access is configured
- Check Docker logs on VPS: `docker logs pylomarket-app-prod`

## 📊 Project Status

**Status**: ✅ Production Ready

**Recent Changes:**
- ✅ Migrated from HarperDB Resources to Next.js Server Actions
- ✅ Fixed WebSocket errors (removed jsResource conflicts)
- ✅ Redesigned UI with Polymarket-inspired layout
- ✅ Implemented infinite scroll for markets
- ✅ Added category navigation and filtering
- ✅ Automated deployment via GitHub Actions
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
