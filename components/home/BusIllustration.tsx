// Placeholder bus illustration until there's a photo of the rewrapped bus.
// Deliberately generic: no operator branding from the bus's previous livery.

export default function BusIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 480 240" role="img" aria-label="Illustration of the Alpine Community Bus" xmlns="http://www.w3.org/2000/svg">
      {/* Hills */}
      <path d="M0 150 L70 95 L120 130 L200 60 L290 140 L360 90 L480 160 L480 240 L0 240 Z" fill="#0B3A80" />
      <path d="M0 175 L90 135 L170 165 L260 120 L350 160 L480 130 L480 240 L0 240 Z" fill="#12489A" />
      <path d="M190 69 L200 60 L214 73 L205 70 L199 76 Z" fill="#ffffff" opacity="0.8" />
      {/* Road */}
      <rect x="0" y="206" width="480" height="34" fill="#1C2433" />
      <rect x="40" y="221" width="46" height="4" rx="2" fill="#C97B0A" />
      <rect x="140" y="221" width="46" height="4" rx="2" fill="#C97B0A" />
      <rect x="240" y="221" width="46" height="4" rx="2" fill="#C97B0A" />
      <rect x="340" y="221" width="46" height="4" rx="2" fill="#C97B0A" />
      {/* Bus body */}
      <rect x="92" y="106" width="300" height="96" rx="16" fill="#ffffff" />
      <path d="M362 106 h14 a16 16 0 0 1 16 16 v80 h-30 z" fill="#F5F0E8" />
      {/* Windows */}
      <rect x="110" y="120" width="52" height="36" rx="5" fill="#002868" />
      <rect x="172" y="120" width="52" height="36" rx="5" fill="#002868" />
      <rect x="234" y="120" width="52" height="36" rx="5" fill="#002868" />
      <rect x="296" y="120" width="52" height="36" rx="5" fill="#002868" />
      <rect x="362" y="120" width="22" height="50" rx="5" fill="#002868" />
      {/* Livery stripe */}
      <path d="M92 170 H392 V182 H92 Z" fill="#C97B0A" />
      {/* Wheels */}
      <circle cx="152" cy="202" r="21" fill="#1C2433" />
      <circle cx="152" cy="202" r="9" fill="#DDE1EA" />
      <circle cx="332" cy="202" r="21" fill="#1C2433" />
      <circle cx="332" cy="202" r="9" fill="#DDE1EA" />
      {/* Lights */}
      <rect x="386" y="176" width="8" height="10" rx="2" fill="#FFD700" />
    </svg>
  );
}
