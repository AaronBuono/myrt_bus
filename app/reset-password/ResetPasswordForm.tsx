"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createAuthClient } from "@neondatabase/auth/next";

const authClient = createAuthClient();

export default function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) setError("Invalid or expired reset link. Please request a new one.");
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const res = await (authClient as any).resetPassword({ newPassword: password, token });
      if (res?.error) {
        setError("Reset link is invalid or has expired. Please request a new one.");
      } else {
        setDone(true);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="card space-y-4 text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <p className="text-sm font-bold text-[#1A1A1A]">Password updated</p>
        <p className="text-sm text-[#5E6470]">Your password has been set. You can now sign in.</p>
        <button onClick={() => router.push("/login")} className="btn-primary w-full py-2.5">
          Go to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <div>
        <p className="text-base font-bold text-[#1A1A1A]">Set your password</p>
        <p className="text-sm text-[#5E6470] mt-0.5">Choose a new password for your account.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="form-label">New password</label>
          <input
            type="password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
            placeholder="At least 8 characters"
            disabled={!token}
          />
        </div>
        <div>
          <label className="form-label">Confirm password</label>
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="form-input"
            placeholder="Repeat password"
            disabled={!token}
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button type="submit" disabled={loading || !token} className="btn-primary w-full py-2.5">
          {loading ? "Saving…" : "Set password"}
        </button>
      </form>
      <button onClick={() => router.push("/login")} className="text-xs text-[#5E6470] hover:underline block text-center w-full">
        Back to sign in
      </button>
    </div>
  );
}
