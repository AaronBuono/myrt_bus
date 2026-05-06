import Link from "next/link";

const TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "bookings", label: "Bookings" },
  { key: "pricing", label: "Pricing" },
  { key: "conditions", label: "Conditions" },
  { key: "orgs", label: "Organisations" },
  { key: "staff", label: "Staff" },
  { key: "settings", label: "Settings" },
] as const;

export type AdminSection = (typeof TABS)[number]["key"];

export default function AdminNav({ section }: { section: AdminSection }) {
  return (
    <nav className="bg-white border-b border-[#DDE1EA] sticky top-14 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex overflow-x-auto scrollbar-hide gap-0">
          {TABS.map((tab) => {
            const active = tab.key === section;
            return (
              <Link
                key={tab.key}
                href={`/admin?section=${tab.key}`}
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
  );
}
