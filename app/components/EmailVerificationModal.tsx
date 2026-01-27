"use client";

import { useState, useRef, useEffect } from "react";
import { sendVerificationCode, verifyEmailCode } from "@/actions";

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  onVerified: () => void;
}

export default function EmailVerificationModal({
  isOpen,
  onClose,
  email,
  onVerified,
}: EmailVerificationModalProps) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset code when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setCode(["", "", "", "", "", ""]);
      setError("");
    } else {
      // Focus first input when modal opens
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

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

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError("");

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (newCode.every((digit) => digit !== "") && index === 5) {
      handleVerify(newCode.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Handle paste
    if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then((text) => {
        const digits = text.replace(/\D/g, "").slice(0, 6).split("");
        const newCode = [...code];
        digits.forEach((digit, i) => {
          if (i < 6) newCode[i] = digit;
        });
        setCode(newCode);
        if (digits.length === 6) {
          handleVerify(newCode.join(""));
        } else {
          inputRefs.current[Math.min(digits.length, 5)]?.focus();
        }
      });
    }
  };

  const handleVerify = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join("");
    
    if (codeToVerify.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Verify email code using Server Action
      const result = await verifyEmailCode(email, codeToVerify);

      if (result.success) {
        onVerified();
      } else {
        setError(result.error || "Invalid verification code");
        // Clear code on error
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setSending(true);
    setError("");

    try {
      // Resend verification code using Server Action
      const result = await sendVerificationCode(email);

      if (result.success) {
        // Show success message (could be a toast)
        setError(""); // Clear any previous errors
      } else {
        setError(result.error || "Failed to send verification code");
      }
    } catch (error) {
      setError("Failed to send verification code. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md bg-white rounded-lg shadow-2xl mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors z-10"
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
          {/* Email Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-[#3b82f6] rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>

          {/* Instructions */}
          <div className="text-center mb-6">
            <p className="text-gray-700 mb-2">Please enter the code sent to</p>
            <p className="text-lg font-semibold text-gray-900">{email}</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Code Input Fields */}
          <div className="flex justify-center gap-1.5 sm:gap-2 mb-6 px-2">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-semibold border-2 rounded-lg focus:outline-none transition-colors ${
                  index === 0 && digit === ""
                    ? "border-[#3b82f6]"
                    : digit
                    ? "border-gray-300"
                    : "border-gray-200"
                } ${
                  error ? "border-red-300" : ""
                }`}
                disabled={loading}
              />
            ))}
          </div>

          {/* Resend Code */}
          <div className="text-center mb-6">
            <button
              onClick={handleResend}
              disabled={sending}
              className="text-sm text-[#3b82f6] hover:text-[#2563eb] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? "Sending..." : "Resend code"}
            </button>
          </div>

          {/* Phishing Warning */}
          <div className="text-xs text-gray-500 text-center leading-relaxed">
            The PyloMarket Staff will NEVER give you a code to enter. If someone
            gives you a code to enter this is a <strong>phishing</strong> attempt
            and should be <strong>reported</strong> to PyloMarket.
          </div>
        </div>
      </div>
    </div>
  );
}
