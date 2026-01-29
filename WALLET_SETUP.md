# Wallet Setup Guide

## Overview

Hệ thống sử dụng **hot wallet tập trung** để quản lý withdrawals. Mỗi user có một Solana address riêng để nhận deposits, nhưng withdrawals được xử lý từ một hot wallet chung.

## Setup Hot Wallet

### 1. Generate Hot Wallet Keypair

Tạo một Solana keypair mới cho hot wallet:

```bash
# Sử dụng Solana CLI (nếu đã cài đặt)
solana-keygen new --outfile hot-wallet.json

# Hoặc sử dụng Node.js script
node -e "
const { Keypair } = require('@solana/web3.js');
const kp = Keypair.generate();
console.log('Public Key:', kp.publicKey.toBase58());
console.log('Private Key (base64):', Buffer.from(kp.secretKey).toString('base64'));
console.log('Private Key (array):', Array.from(kp.secretKey).join(','));
"
```

### 2. Fund Hot Wallet

**Devnet:**
```bash
# Request airdrop từ Solana faucet
solana airdrop 1 <HOT_WALLET_ADDRESS> --url devnet

# Hoặc sử dụng web faucet: https://faucet.solana.com/
```

**Mainnet:**
- Chuyển SOL từ exchange hoặc wallet khác vào hot wallet address
- Đảm bảo có đủ SOL để cover withdrawals và transaction fees

### 3. Configure Environment Variable

Thêm vào file `.env`:

```env
# Hot Wallet Private Key (base64 encoded hoặc comma-separated array)
HOT_WALLET_PRIVATE_KEY=<your-private-key-base64-or-array>

# Solana RPC URL
SOLANA_RPC_URL=https://api.devnet.solana.com  # Devnet
# SOLANA_RPC_URL=https://api.mainnet-beta.solana.com  # Mainnet
```

**Format options:**
- Base64: `HOT_WALLET_PRIVATE_KEY=base64encodedstring`
- Array: `HOT_WALLET_PRIVATE_KEY=123,45,67,...` (64 numbers)

### 4. Security Best Practices

⚠️ **QUAN TRỌNG:**

1. **Never commit private key to git**
   - Thêm `.env` vào `.gitignore`
   - Sử dụng environment variables trong production

2. **Hot wallet security:**
   - Chỉ fund hot wallet với số lượng SOL cần thiết
   - Monitor balance thường xuyên
   - Có thể setup alerts khi balance thấp

3. **Production:**
   - Sử dụng secure key management service (AWS Secrets Manager, HashiCorp Vault, etc.)
   - Rotate keys định kỳ
   - Implement rate limiting cho withdrawals

## How It Works

### Deposit Flow

1. User đăng ký → System tạo Solana address riêng cho user
2. User gửi SOL đến address của họ
3. User click "Check for Deposits" → System:
   - Poll Solana blockchain để tìm transactions mới
   - Verify transaction signatures
   - Credit balance vào account
   - Record transaction trong database

### Withdrawal Flow

1. User nhập withdrawal address và amount
2. System verify:
   - User có đủ balance
   - Amount >= minimum (0.01 SOL)
   - Address hợp lệ
3. System gửi SOL từ hot wallet đến user address
4. System debit balance và record transaction

## Testing

### Devnet Testing

1. Get test SOL từ faucet: https://faucet.solana.com/
2. Send SOL to your deposit address
3. Click "Check for Deposits" to credit balance
4. Test withdrawal to another devnet address

### Monitoring

- Check hot wallet balance: Monitor `HOT_WALLET_PRIVATE_KEY` address balance
- Transaction history: View in wallet page UI
- Logs: Check server logs for deposit/withdrawal operations

## Troubleshooting

### "Hot wallet not configured"
- Đảm bảo `HOT_WALLET_PRIVATE_KEY` đã được set trong `.env`
- Restart server sau khi thêm environment variable

### "Insufficient hot wallet balance"
- Fund hot wallet với SOL
- Check balance trên Solana explorer

### "Failed to send SOL"
- Verify RPC URL đúng (devnet vs mainnet)
- Check network connectivity
- Verify private key format đúng

### Deposits not detected
- Đảm bảo transaction đã confirmed trên blockchain
- Check address đúng
- Verify transaction signature trên Solana explorer

## API Endpoints

- `GET /api/wallet/balance` - Get user balance
- `GET /api/wallet/solana/address` - Get deposit address
- `POST /api/wallet/solana/check-deposits` - Check and credit deposits
- `POST /api/wallet/withdraw` - Withdraw SOL
- `GET /api/wallet/transactions` - Get transaction history

## Environment Variables Summary

```env
# JWT Secret
JWT_SECRET=your-secret-key

# Solana Configuration
SOLANA_RPC_URL=https://api.devnet.solana.com
HOT_WALLET_PRIVATE_KEY=<base64-or-array-format>

# Optional: Minimum withdrawal amount (default: 0.01)
MIN_WITHDRAWAL=0.01
```
