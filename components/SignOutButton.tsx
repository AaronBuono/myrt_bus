"use client";

import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/signout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    router.push("/");
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-xs text-[#5E6470] border border-[#DDE1EA] rounded-lg px-3 py-1.5 hover:border-brand-blue transition-colors"
    >
      Sign out
    </button>
  );
}
