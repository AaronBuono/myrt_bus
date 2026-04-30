import Image from "next/image";
import Link from "next/link";

export default function PublicHeader() {
  return (
    <header className="bg-white border-b border-[#DDE1EA] sticky top-0 z-50 h-14 flex items-center justify-between px-4 sm:px-6">
      <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Image src="/logo-lions.png" alt="Myrtleford Lions Club" width={34} height={34} className="rounded-full flex-shrink-0" />
        <div className="w-px h-6 bg-[#DDE1EA] flex-shrink-0" />
        <Image src="/logo-alpine.png" alt="Alpine Shire Council" width={26} height={26} className="rounded-full flex-shrink-0" />
        <span className="text-sm font-bold text-brand-blue ml-1 hidden sm:block">Community Bus</span>
      </Link>
      <nav className="flex items-center gap-2 flex-shrink-0">
        <Link href="/" className="hidden sm:block btn-primary text-xs py-1.5 px-3">Home</Link>
        <Link href="/book" className="btn-secondary text-xs py-1.5 px-3">Book the Bus</Link>
        <Link href="/login" className="hidden sm:block text-xs text-[#5E6470] border border-[#DDE1EA] rounded-lg px-3 py-1.5 hover:border-brand-blue transition-colors">
          Login
        </Link>
      </nav>
    </header>
  );
}
