/**
 * Server Actions Index
 * Central export for all server actions
 * 
 * Usage in components/pages:
 * import { loginUser, getMarkets, placeOrder } from '@/app/actions';
 */

// Auth actions
export { registerUser, loginUser, sendVerificationCode, verifyEmailCode, logout, getCurrentUserInfo } from './auth';

// Wallet actions
export { 
  // New functions using HttpOnly cookies
  getWallet, 
  getBalance, 
  createWallet,
  getTransactions,
  checkDeposits,
  withdraw,
  exportPrivateKey,
  markKeyAsExported,
  getAllWallets,
  addExternalWallet,
  deleteWallet,
  setPrimaryWallet,
  // Functions with userId parameter (for API routes)
  getWalletWithUserId,
  getBalanceWithUserId,
  createWalletWithUserId,
  getTransactionsWithUserId,
  // Internal functions
  ensureWalletExists 
} from './wallet';

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
