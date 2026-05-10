"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-[#DDE1EA] sticky top-0 z-50">
      <div className="h-14 flex items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Image src="/logo-lions.png" alt="Myrtleford Lions Club" width={34} height={34} className="rounded-full flex-shrink-0" />
          <div className="w-px h-6 bg-[#DDE1EA] flex-shrink-0" />
          <Image src="/logo-alpine.png" alt="Alpine Shire Council" width={88} height={21} className="flex-shrink-0" />
          <span className="text-sm font-bold text-brand-blue ml-1 hidden sm:block">Community Bus</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2 flex-shrink-0">
          <Link href="/book" className="btn-cta text-xs py-1.5 px-3">Book the Bus</Link>
          <Link href="/login" className="text-xs text-[#5E6470] border border-[#DDE1EA] rounded-lg px-3 py-1.5 hover:border-brand-blue transition-colors">
            Login
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-md text-brand-blue hover:bg-[#F5F6F8] transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="md:hidden border-t border-[#DDE1EA] bg-white px-4 py-4 flex flex-col gap-3">
          <Link
            href="/book"
            className="btn-cta text-sm px-4 py-2.5 text-center"
            onClick={() => setMenuOpen(false)}
          >
            Book the Bus
          </Link>
          <Link
            href="/login"
            className="text-sm text-[#5E6470] border border-[#DDE1EA] rounded-lg text-center py-2 hover:border-brand-blue transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            Login
          </Link>
        </div>
      )}
    </header>
  );
}
