/**
 * Server Actions Index
 * Central export for all server actions
 * 
 * Usage in components/pages:
 * import { loginUser, getMarkets, placeOrder } from '@/app/actions';
 */

// Auth actions
export { registerUser, loginUser, verifyToken, sendVerificationCode, verifyEmailCode } from './auth';

// Wallet actions
export { getWallet, getBalance, updateBalance, getTransactions, createWallet } from './wallet';

// Market actions
export { listMarkets, getMarket, createMarket, resolveMarket } from './markets';

// Order actions
export { placeOrder, cancelOrder, getOrders, getOrderbook } from './orders';

// Solana actions
export { 
  pollDeposits, 
  pollUserDeposits, 
  generateSolanaWallet,
  checkNewDeposits,
  sendSOL,
  recordDepositTransaction
} from './solana';

// Wallet actions - additional exports
export { creditDeposit, debitWithdrawal } from './wallet';
