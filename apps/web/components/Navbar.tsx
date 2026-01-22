"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-[#1a1a1a] bg-[#0a0a0a] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-white">
              PyloMarket
            </Link>
            <div className="hidden md:flex space-x-6">
              <Link
                href="/"
                className={`text-sm font-medium transition-colors ${
                  pathname === "/"
                    ? "text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Markets
              </Link>
              <Link
                href="/wallet"
                className={`text-sm font-medium transition-colors ${
                  pathname === "/wallet"
                    ? "text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Wallet
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              Login
            </Link>
            <Link
              href="/auth/register"
              className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
