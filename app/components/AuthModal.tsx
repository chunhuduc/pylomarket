"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import EmailVerificationModal from "./EmailVerificationModal";
import { sendVerificationCode } from "@/actions";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "login" | "signup";
}

export default function AuthModal({ isOpen, onClose, mode }: AuthModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showVerification, setShowVerification] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setError("");
      setShowVerification(false);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  async function handleGoogleSignIn() {
    // TODO: Implement Google OAuth
    console.log("Google sign in clicked");
  }

  async function handleEmailContinue() {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Send verification code using Server Action
      const result = await sendVerificationCode(email);

      if (result.success) {
        // Show verification modal
        setShowVerification(true);
      } else {
        setError(result.error || "Failed to send verification code");
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleEmailVerified() {
    // After email is verified, redirect to register/login page
    if (mode === "login") {
      router.push(`/auth/login?email=${encodeURIComponent(email)}&verified=true`);
    } else {
      router.push(`/auth/register?email=${encodeURIComponent(email)}&verified=true`);
    }
    onClose();
  }

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        {/* Modal */}
        <div
          className="relative w-full max-w-md bg-[#161B22] border border-[#30363D] rounded-lg shadow-2xl mx-auto"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#C9D1D9] hover:text-white transition-colors z-10"
          aria-label="Close"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="p-4 sm:p-6 md:p-8">
          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center">
            Welcome to PyloMarket
          </h2>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700/60 rounded-lg text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-50 transition-colors mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* OR Separator */}
          <div className="relative flex items-center justify-center my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#2a2a2a]"></div>
            </div>
            <div className="relative bg-[#161B22] px-4">
              <span className="text-sm text-[#8B949E]">OR</span>
            </div>
          </div>

          {/* Email Input */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#C9D1D9] mb-2">
                Email address
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleEmailContinue();
                    }
                  }}
                  className="flex-1 min-w-0 px-4 py-3 bg-[#0D1117] border border-[#30363D] rounded-lg text-white placeholder-[#8B949E] focus:outline-none focus:border-[#3b82f6] transition-colors"
                />
                <button
                  onClick={handleEmailContinue}
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-3 bg-[#3b82f6] text-white font-medium rounded-lg hover:bg-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {loading ? "..." : "Continue"}
                </button>
              </div>
            </div>
          </div>

          {/* Terms and Privacy */}
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-[#8B949E]">
            <a
              href="/terms"
              className="hover:text-white transition-colors"
              onClick={(e) => {
                e.preventDefault();
                // TODO: Open terms page
              }}
            >
              Terms
            </a>
            <span>•</span>
            <a
              href="/privacy"
              className="hover:text-white transition-colors"
              onClick={(e) => {
                e.preventDefault();
                // TODO: Open privacy page
              }}
            >
              Privacy
            </a>
          </div>
        </div>
      </div>
      </div>

      {/* Email Verification Modal */}
      <EmailVerificationModal
        isOpen={showVerification}
        onClose={() => setShowVerification(false)}
        email={email}
        onVerified={handleEmailVerified}
      />
    </>
  );
}
