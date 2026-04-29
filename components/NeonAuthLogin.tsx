"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAuthClient } from "@neondatabase/auth/next";

const authClient = createAuthClient();

type View = "signin" | "forgot" | "forgot-sent";

export function NeonAuthLogin() {
  const router = useRouter();
  const [view, setView] = useState<View>("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authClient.signIn.email({ email, password });
      if (res.error) {
        setError("Incorrect email or password.");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await (authClient as any).requestPasswordReset({
        email: resetEmail,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setView("forgot-sent");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (view === "forgot-sent") {
    return (
      <div className="card space-y-4 text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <p className="text-sm font-bold text-[#1A1A1A]">Check your email</p>
        <p className="text-sm text-[#5E6470]">
          A password reset link has been sent to <span className="font-semibold text-[#1A1A1A]">{resetEmail}</span>.
        </p>
        <button onClick={() => { setView("signin"); setResetEmail(""); }} className="text-xs text-brand-blue hover:underline">
          Back to sign in
        </button>
      </div>
    );
  }

  if (view === "forgot") {
    return (
      <div className="card space-y-4">
        <div>
          <p className="text-base font-bold text-[#1A1A1A]">Reset your password</p>
          <p className="text-sm text-[#5E6470] mt-0.5">Enter your email and we&apos;ll send you a reset link.</p>
        </div>
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div>
            <label className="form-label">Email</label>
            <input
              type="email"
              required
              autoFocus
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              className="form-input"
              placeholder="you@example.com"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
        <button onClick={() => { setView("signin"); setError(""); }} className="text-xs text-[#5E6470] hover:underline block text-center w-full">
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      <p className="text-base font-bold text-[#1A1A1A]">Staff sign in</p>
      <form onSubmit={handleSignIn} className="space-y-4">
        <div>
          <label className="form-label">Email</label>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="form-label mb-0">Password</label>
            <button
              type="button"
              onClick={() => { setView("forgot"); setResetEmail(email); setError(""); }}
              className="text-[11px] text-brand-blue hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
            placeholder="Password"
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
