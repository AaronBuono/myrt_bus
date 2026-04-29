import Image from "next/image";
import NeonAuthLoginWrapper from "@/components/NeonAuthLoginWrapper";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F6F8] px-4">
      <div className="w-full max-w-sm space-y-5">
        <div className="flex items-center justify-center gap-3">
          <Image src="/logo-lions.png" alt="Myrtleford Lions Club" width={44} height={44} className="rounded-full border-2 border-brand-gold" />
          <div>
            <p className="text-sm font-bold text-brand-blue">Community Bus</p>
            <p className="text-xs text-[#5E6470]">Staff login</p>
          </div>
        </div>
        <NeonAuthLoginWrapper />
      </div>
    </div>
  );
}
