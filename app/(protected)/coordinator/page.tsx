import { requireRole } from "@/lib/auth";
import Link from "next/link";
import DashboardSection from "../admin/sections/DashboardSection";
import BookingsSection from "../admin/sections/BookingsSection";

type SearchParams = Promise<{
  section?: string;
  status?: string;
  category?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  bookingId?: string;
}>;

const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "bookings", label: "Bookings" },
] as const;

type CoordSection = (typeof TABS)[number]["key"];

export default async function CoordinatorPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("bus_coordinator", "waw_staff", "lions_staff");
  const params = await searchParams;
  const section = (params.section ?? "dashboard") as CoordSection;

  return (
    <>
      {/* Tab nav */}
      <nav className="bg-white border-b border-[#DDE1EA] sticky top-14 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex overflow-x-auto gap-0">
            {TABS.map((tab) => {
              const active = tab.key === section;
              return (
                <Link
                  key={tab.key}
                  href={`/coordinator?section=${tab.key}`}
                  className={[
                    "flex-shrink-0 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap",
                    active
                      ? "border-brand-blue text-brand-blue"
                      : "border-transparent text-[#5E6470] hover:text-brand-blue hover:border-brand-blue/30",
                  ].join(" ")}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {section === "dashboard" && <DashboardSection />}
        {section === "bookings" && (
          <BookingsSection
            status={params.status}
            category={params.category}
            search={params.search}
            dateFrom={params.dateFrom}
            dateTo={params.dateTo}
            bookingId={params.bookingId}
            canCancel={false}
          />
        )}
      </div>
    </>
  );
}
