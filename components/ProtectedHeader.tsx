import Link from "next/link";
import type { AppUser } from "@/lib/auth";

const ROLE_LABELS: Record<string, string> = {
  waw_staff: "WAW Staff",
  bus_coordinator: "Bus Coordinator",
  lions_admin: "Lions Admin",
};

export default function ProtectedHeader({ user }: { user: AppUser }) {
  return (
    <header className="bg-white border-b border-[#DDE1EA] sticky top-0 z-50 h-14 flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center border-2 border-brand-gold flex-shrink-0">
          <span className="text-brand-gold font-black text-sm">L</span>
        </div>
        <div className="w-px h-6 bg-[#DDE1EA] flex-shrink-0" />
        <span className="text-sm font-bold text-brand-blue hidden sm:block">Community Bus</span>
        <span className="badge-blue ml-1 hidden sm:inline-flex">{ROLE_LABELS[user.role] ?? user.role}</span>
        <span className="badge-blue ml-1 sm:hidden text-xs">{ROLE_LABELS[user.role]?.split(" ")[0] ?? user.role}</span>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <button
          aria-label="Notifications"
          className="relative w-8 h-8 flex items-center justify-center text-[#5E6470] hover:text-brand-blue transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>
        <span className="hidden sm:block text-xs text-[#5E6470]">{user.displayName}</span>
        <form action="/api/auth/signout" method="POST">
          <button className="text-xs text-[#5E6470] border border-[#DDE1EA] rounded-lg px-3 py-1.5 hover:border-brand-blue transition-colors">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
