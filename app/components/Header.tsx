"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthModal from "./AuthModal";
import { getBalance, getCurrentUserInfo, logout } from "@/actions";

interface Balance {
  balance: number;
  currency: string;
}

interface User {
  id: string;
  email: string;
  username: string;
}

export default function Header() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    checkAuth();
    
    // Listen for login events
    const handleUserLoggedIn = () => {
      checkAuth();
    };
    
    window.addEventListener('userLoggedIn', handleUserLoggedIn);
    
    return () => {
      window.removeEventListener('userLoggedIn', handleUserLoggedIn);
    };
  }, []);

  async function checkAuth() {
    try {
      // Check auth using Server Action (reads from HttpOnly cookie)
      const userResult = await getCurrentUserInfo();
      
      if (userResult.success && userResult.user) {
        setUser(userResult.user);
        setIsAuthenticated(true);
        await fetchBalance();
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setBalance(null);
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      setIsAuthenticated(false);
      setUser(null);
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBalance() {
    try {
      // Use Server Action (reads from HttpOnly cookie)
      const result = await getBalance();
      
      if (result.success && result.balance) {
        setBalance(result.balance);
      } else {
        setBalance({ balance: 0, currency: "SOL" });
      }
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalance({ balance: 0, currency: "SOL" });
    }
  }

  async function handleLogout() {
    try {
      await logout();
      setIsAuthenticated(false);
      setUser(null);
      setBalance(null);
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  }

  const openAuthModal = () => {
    setAuthModalOpen(true);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#0D1117] border-b border-[#30363D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 bg-[#3b82f6] rounded flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold text-white">PyloMarket</span>
            </Link>

            {/* Search Bar - Centered - Hidden on mobile */}
            <div className="hidden md:flex flex-1 max-w-2xl mx-4">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Search polymarket"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 bg-[#161B22] border border-[#30363D] rounded-lg text-white placeholder-[#8B949E] focus:outline-none focus:border-[#3b82f6] transition-colors"
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#9ca3af]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 ml-auto">
              {loading ? (
                // Loading state
                <div className="w-20 h-6 bg-[#161B22] rounded animate-pulse"></div>
              ) : isAuthenticated ? (
                // Authenticated state
                <>
                  {/* Balance */}
                  <div className="hidden md:flex flex-col items-end">
                    <span className="text-xs text-[#8B949E]">Balance</span>
                    <span className="text-sm font-medium text-[#4ade80]">
                      ${balance?.balance.toFixed(2) || "0.00"}
                    </span>
                  </div>

                  {/* Deposit Button */}
                  <Link
                    href="/wallet"
                    className="px-3 sm:px-4 py-2 bg-[#3b82f6] text-white text-sm font-medium rounded-lg hover:bg-[#2563eb] transition-colors whitespace-nowrap"
                  >
                    Deposit
                  </Link>

                  {/* Notification Icon */}
                  <button
                    className="p-2 text-[#C9D1D9] hover:text-white transition-colors relative"
                    aria-label="Notifications"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                  </button>

                  {/* User Profile Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-2"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 002 2 2 2 0 002-2v-1a2 2 0 012-2h1.945M11 20v-1a8 8 0 00-8-8H3m8 9a8 8 0 008-8h-2a8 8 0 00-8 8z"
                          />
                        </svg>
                      </div>
                      <svg
                        className="w-4 h-4 text-[#C9D1D9]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {showUserMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowUserMenu(false)}
                        ></div>
                        <div className="absolute right-0 mt-2 w-48 bg-[#161B22] border border-[#30363D] rounded-lg shadow-lg z-20">
                          <div className="py-1">
                            <div className="px-4 py-2 border-b border-[#30363D]">
                              <p className="text-sm font-medium text-white">
                                {user?.username || user?.email}
                              </p>
                              <p className="text-xs text-[#8B949E] truncate">
                                {user?.email}
                              </p>
                            </div>
                            <Link
                              href="/wallet"
                              className="block px-4 py-2 text-sm text-[#C9D1D9] hover:bg-[#21262D] hover:text-white transition-colors"
                              onClick={() => setShowUserMenu(false)}
                            >
                              Wallet
                            </Link>
                            <button
                              onClick={() => {
                                setShowUserMenu(false);
                                handleLogout();
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-[#C9D1D9] hover:bg-[#21262D] hover:text-white transition-colors"
                            >
                              Log Out
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                // Not authenticated state
                <>
                  {/* How it works */}
                  <Link
                    href="/how-it-works"
                    className="hidden md:flex items-center gap-2 text-sm text-[#C9D1D9] hover:text-white transition-colors"
                  >
                    <div className="w-2 h-2 bg-[#3b82f6] rounded-full"></div>
                    <span>How it works</span>
                  </Link>

                  {/* Log In */}
                  <button
                    onClick={openAuthModal}
                    className="text-sm font-medium text-[#C9D1D9] hover:text-white transition-colors whitespace-nowrap"
                  >
                    Log In
                  </button>

                  {/* Sign Up */}
                  <button
                    onClick={openAuthModal}
                    className="px-3 sm:px-4 py-2 bg-[#3b82f6] text-white text-sm font-medium rounded-lg hover:bg-[#2563eb] transition-colors whitespace-nowrap"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          // Refresh auth state after modal closes (in case user logged in)
          checkAuth();
        }}
      />
    </>
  );
}
