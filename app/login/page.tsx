import Image from "next/image";
import NeonAuthLoginWrapper from "@/components/NeonAuthLoginWrapper";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const initialMode = mode === "signup" ? "signup" : "signin";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F6F8] px-4">
      <div className="w-full max-w-sm space-y-5">
        <div className="flex items-center justify-center gap-3">
          <Image src="/logo-acb.svg" alt="" width={44} height={44} unoptimized />
          <div>
            <p className="text-sm font-bold text-brand-blue">Alpine Community Bus</p>
            <p className="text-xs text-[#5E6470]">Staff login</p>
          </div>
        </div>
        <NeonAuthLoginWrapper initialMode={initialMode} />
      </div>
    </div>
  );
}
