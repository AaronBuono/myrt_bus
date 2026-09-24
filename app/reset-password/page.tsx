import { Suspense } from "react";
import Image from "next/image";
import ResetPasswordForm from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-cream px-4">
      <div className="w-full max-w-sm space-y-5">
        <div className="flex items-center justify-center gap-3">
          <Image src="/logo-acb.svg" alt="" width={44} height={44} unoptimized />
          <div>
            <p className="text-sm font-bold text-brand-blue">Alpine Community Bus</p>
            <p className="text-xs text-[#5E6470]">Staff login</p>
          </div>
        </div>
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
