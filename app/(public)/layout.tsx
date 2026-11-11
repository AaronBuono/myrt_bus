import PublicHeader from "@/components/PublicHeader";
import { BOOKINGS_OPEN } from "@/lib/site";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {!BOOKINGS_OPEN && (
        <div role="status" className="bg-brand-amber text-white text-center font-semibold px-4 py-3" style={{ fontSize: 16 }}>
          Online booking isn&apos;t open yet. We&apos;ll be taking bookings here soon.
        </div>
      )}
      <PublicHeader />
      <main>{children}</main>
    </>
  );
}
