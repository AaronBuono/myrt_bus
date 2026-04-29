import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-cream px-4">
      <div className="text-center space-y-4">
        <p className="text-4xl font-bold text-brand-blue">403</p>
        <p className="text-base font-semibold text-[#1A1A1A]">Access denied</p>
        <p className="text-sm text-[#5E6470]">You don&apos;t have permission to view this page.</p>
        <Link href="/login" className="btn-primary inline-block mt-2">Back to sign in</Link>
      </div>
    </div>
  );
}
