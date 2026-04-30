import Image from "next/image";
import Link from "next/link";

export default function PublicHeader() {
  return (
    <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-50 h-16 flex items-center justify-between px-4 sm:px-6">
      <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Image src="/logo-lions.png" alt="Myrtleford Lions Club" width={34} height={34} className="rounded-full flex-shrink-0" />
        <div className="w-px h-6 bg-[#E2E8F0] flex-shrink-0" />
        <Image src="/logo-alpine.png" alt="Alpine Shire Council" width={26} height={26} className="rounded-full flex-shrink-0" />
        <span className="text-sm font-bold text-brand-blue ml-1 hidden sm:block">Community Bus</span>
      </Link>
      <nav className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        <Link href="/book" className="btn-cta text-sm px-3 py-2 sm:px-4">Book the Bus</Link>
        <Link href="/login" className="hidden sm:block text-sm text-slate-500 hover:text-brand-blue transition-colors">
          Staff Login
        </Link>
      </nav>
    </header>
  );
}
