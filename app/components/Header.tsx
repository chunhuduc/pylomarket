"use client";

import Link from "next/link";
import { useState } from "react";
import AuthModal from "./AuthModal";

export default function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const [authModalOpen, setAuthModalOpen] = useState(false);

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
            </div>
          </div>
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </>
  );
}
