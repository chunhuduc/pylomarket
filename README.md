# PyloMarket - HarperDB + Next.js Prediction Market Platform

Decentralized prediction market platform built with HarperDB and Next.js.

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
│   ├── actions/          # Server Actions (business logic)
│   │   ├── auth.ts      # Authentication
│   │   ├── wallet.ts    # Wallet & balance
│   │   ├── markets.ts   # Markets CRUD
│   │   ├── orders.ts    # Order book
│   │   ├── solana.ts    # Solana integration
│   │   └── index.ts     # Exports
│   ├── api/             # REST API routes
│   │   ├── auth/        # Login & register
│   │   ├── markets/     # Markets endpoints
│   │   ├── orders/      # Orders endpoints
│   │   └── wallet/      # Wallet endpoints
│   ├── components/      # React components
│   ├── auth/           # Auth pages
│   ├── markets/        # Market pages
│   └── wallet/         # Wallet pages
├── config.yaml          # HarperDB configuration
├── schema.graphql       # Database schema
├── seed/                # Seed data (JSON files)
├── scripts/             # Utility scripts
└── patches/             # HarperDB patches
```

## 🏗️ Architecture

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database**: HarperDB 4.7
- **Blockchain**: Solana (deposit integration)
- **Auth**: JWT tokens
- **Styling**: Tailwind CSS

### Data Flow
```
Client Component → API Route → Server Action → HarperDB
                     ↓
                  Response
```

**Pattern:**
- **Server Components**: Call Server Actions directly
- **Client Components**: Call API Routes → API Routes call Server Actions
- **Server Actions**: Access HarperDB via global `harperdb` object

## 🎯 Features

- ✅ **User Authentication** - JWT-based auth with bcrypt
- ✅ **Prediction Markets** - Create and trade on markets
- ✅ **Order Book** - Limit orders with automatic matching
- ✅ **Wallet System** - Virtual balance management
- ✅ **Solana Integration** - Crypto deposits via polling
- ✅ **Real-time Updates** - Live market data

## 📖 Usage Examples

### Server Actions (from Server Components)

```typescript
import { listMarkets, placeOrder } from '@/actions';

// In a Server Component
async function MarketsPage() {
  const { markets } = await listMarkets({ resolved: false });
  
  return <div>{/* render markets */}</div>;
}
```

### API Routes (from Client Components)

```typescript
'use client';

// In a Client Component
async function fetchMarkets() {
  const response = await fetch('/api/markets?resolved=false');
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
- `listMarkets(filters)`
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
  prebuilt: false
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

const SCHEMA = "pylomarket";

declare global {
  var harperdb: any;
}

export async function doSomething(param: string) {
  try {
    const result = await harperdb.sql(
      `SELECT * FROM ${SCHEMA}.table WHERE field = ?`,
      [param]
    );
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

3. Use in API route (for client components):
```typescript
// app/api/newfeature/route.ts
import { doSomething } from '@/actions';

export async function GET(request: NextRequest) {
  const param = request.nextUrl.searchParams.get('param');
  const result = await doSomething(param);
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

### Using HarperDB CLI

```bash
# Build production
npm run build

# Update config.yaml
'@harperdb/nextjs':
  prebuilt: true

# Deploy
harperdb deploy \
  target="https://your-instance.harperdbcloud.com" \
  username="admin" \
  password="password" \
  project=pylomarket \
  replicated=true \
  restart=true
```

### Docker

```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 9926
lsof -ti:9926 | xargs kill -9
```

### HarperDB Connection Issues
```bash
# Check HarperDB is running
curl http://localhost:9926

# Check logs
docker-compose logs harperdb
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
- Make sure all Server Actions use `declare global { var harperdb: any; }`
- Don't use `import('harperdb')` in Server Actions
- Use `@/actions` path alias for imports

## 📊 Project Status

**Status**: ✅ Production Ready

**Recent Changes:**
- ✅ Migrated from HarperDB Resources to Next.js Server Actions
- ✅ Fixed WebSocket errors (removed jsResource conflicts)
- ✅ Cleaned up legacy code (~30KB removed)
- ✅ Simplified architecture (single data access pattern)

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

---

Built with ❤️ using HarperDB + Next.js
