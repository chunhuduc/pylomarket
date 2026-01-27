"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function base64UrlDecode(input: string) {
  // Convert base64url -> base64
  let str = input.replace(/-/g, "+").replace(/_/g, "/");
  // Pad to multiple of 4
  while (str.length % 4) str += "=";
  return atob(str);
}

export default function GoogleAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    const error = searchParams.get("error");
    const token = searchParams.get("token");
    const userEncoded = searchParams.get("user");
    const returnTo = searchParams.get("returnTo") || "/";

    if (error) {
      setMessage(`Google sign-in failed: ${error}`);
      return;
    }

    if (!token || !userEncoded) {
      setMessage("Google sign-in failed: missing session data");
      return;
    }

    try {
      const userJson = base64UrlDecode(userEncoded);
      const user = JSON.parse(userJson);

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      router.replace(returnTo);
      router.refresh();
    } catch (e) {
      setMessage("Google sign-in failed: invalid session data");
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#0D1117] flex items-center justify-center px-4">
      <div className="text-[#C9D1D9] text-sm">{message}</div>
    </div>
  );
}

