import { Suspense } from "react";
import GoogleAuthCallbackClient from "@/auth/google/callback/GoogleAuthCallbackClient";

export default function GoogleAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0D1117] flex items-center justify-center px-4">
          <div className="text-[#C9D1D9] text-sm">Signing you in…</div>
        </div>
      }
    >
      <GoogleAuthCallbackClient />
    </Suspense>
  );
}

