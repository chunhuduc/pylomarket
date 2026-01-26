// Shared OTP store for email verification
// In production, use Redis or database instead

interface OTPData {
  code: string;
  expiresAt: number;
}

const otpStore = new Map<string, OTPData>();

// Generate 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store OTP
export function setOTP(email: string, code: string, expiresInMinutes: number = 10): void {
  const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;
  otpStore.set(email.toLowerCase(), { code, expiresAt });
}

// Get OTP
export function getOTP(email: string): string | null {
  const data = otpStore.get(email.toLowerCase());
  if (!data) return null;
  if (data.expiresAt < Date.now()) {
    otpStore.delete(email.toLowerCase());
    return null;
  }
  return data.code;
}

// Delete OTP
export function deleteOTP(email: string): void {
  otpStore.delete(email.toLowerCase());
}

// Cleanup expired OTPs
export function cleanupExpiredOTPs(): void {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}

// Cleanup expired OTPs periodically
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredOTPs, 60000); // Cleanup every minute
}
