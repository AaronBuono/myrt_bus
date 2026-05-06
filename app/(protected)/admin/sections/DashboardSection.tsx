import { getDashboardStats, getRecentBookings } from "@/lib/queries/admin";
import StatusBadge from "@/components/admin/StatusBadge";
import Link from "next/link";

function fmtDate(d: unknown) {
  if (!d) return "-";
  return new Date(d as string).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtAUD(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
}

export default async function DashboardSection() {
  const [stats, recent] = await Promise.all([
    getDashboardStats(),
    getRecentBookings(10),
  ]);

  const statCards = [
    { label: "Total Bookings", value: stats.totalBookings, color: "text-brand-blue" },
    { label: "This Month", value: stats.bookingsThisMonth, color: "text-brand-blue" },
    { label: "Revenue This Month", value: fmtAUD(stats.revenueThisMonth), color: "text-brand-green" },
    { label: "Confirmed", value: stats.confirmed, color: "text-blue-600" },
    { label: "Currently In Use", value: stats.currentlyInUse, color: "text-green-600" },
    { label: "Pending Inspection", value: stats.pendingInspections, color: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((c) => (
          <div key={c.label} className="card text-center">
            <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
            <p className="text-xs text-[#5E6470] mt-1 font-medium">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#DDE1EA]">
          <h2 className="text-base font-bold text-brand-blue">Recent Bookings</h2>
          <Link href="/admin?section=bookings" className="text-sm text-brand-blue hover:underline font-semibold">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8F9FC] border-b border-[#DDE1EA]">
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide">Reference</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide">Booker</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide hidden md:table-cell">Destination</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide">Dates</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide hidden sm:table-cell">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F1F4]">
              {recent.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#5E6470]">No bookings yet.</td>
                </tr>
              )}
              {recent.map((b) => (
                <tr key={b.id as string} className="hover:bg-[#F8F9FC] transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-blue">{b.reference as string}</td>
                  <td className="px-4 py-3 font-medium">{b.booker_name as string}</td>
                  <td className="px-4 py-3 text-[#5E6470] hidden md:table-cell">{b.destination as string}</td>
                  <td className="px-4 py-3 text-[#5E6470] whitespace-nowrap">
                    {fmtDate(b.start_date)} – {fmtDate(b.end_date)}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">{fmtAUD(Number(b.amount_due))}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status as string} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
