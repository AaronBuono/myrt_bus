import { getBookingsList } from "@/lib/queries/admin";
import StatusBadge from "@/components/admin/StatusBadge";
import CancelBookingBtn from "@/components/admin/CancelBookingBtn";
import BookingDetailSection from "./BookingDetailSection";

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

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_use", label: "In Use" },
  { value: "pending_inspection", label: "Pending Inspection" },
  { value: "complete", label: "Complete" },
  { value: "cancelled", label: "Cancelled" },
];

const CAT_OPTIONS = [
  { value: "", label: "All categories" },
  { value: "a", label: "Cat A — Standard" },
  { value: "c", label: "Cat C — No Charge" },
];

type Props = {
  status?: string;
  category?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  canCancel?: boolean;
  bookingId?: string;
};

export default async function BookingsSection({
  status,
  category,
  search,
  dateFrom,
  dateTo,
  canCancel = true,
  bookingId,
}: Props) {
  if (bookingId) {
    return <BookingDetailSection bookingId={bookingId} canCancel={canCancel} />;
  }

  const bookings = await getBookingsList({ status, category, search, dateFrom, dateTo });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <form method="GET" className="card p-4">
        <input type="hidden" name="section" value="bookings" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="form-label">Search</label>
            <input
              name="search"
              defaultValue={search}
              placeholder="Name, ref, email…"
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Status</label>
            <select name="status" defaultValue={status} className="form-input">
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Category</label>
            <select name="category" defaultValue={category} className="form-input">
              {CAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">From Date</label>
            <input
              type="date"
              name="dateFrom"
              defaultValue={dateFrom}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">To Date</label>
            <input
              type="date"
              name="dateTo"
              defaultValue={dateTo}
              className="form-input"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button type="submit" className="btn-primary">Filter</button>
          <a href="?section=bookings" className="btn-secondary">Clear</a>
        </div>
      </form>

      {/* Results count */}
      <p className="text-sm text-[#5E6470] font-medium">
        {bookings.length} booking{bookings.length !== 1 ? "s" : ""} found
        {bookings.length === 200 && " (showing first 200)"}
      </p>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8F9FC] border-b border-[#DDE1EA]">
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide">Ref</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide">Booker</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide hidden lg:table-cell">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide">Dates</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide hidden md:table-cell">Zone</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide hidden md:table-cell">Driver</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide">Status</th>
                {canCancel && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F1F4]">
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={canCancel ? 9 : 8} className="px-4 py-10 text-center text-[#5E6470]">
                    No bookings match the current filters.
                  </td>
                </tr>
              )}
              {bookings.map((b) => (
                <tr key={b.id as string} className="hover:bg-[#F8F9FC] transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-blue whitespace-nowrap">
                    <a href={`?section=bookings&bookingId=${b.id as string}`} className="hover:underline">
                      {b.reference as string}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{b.booker_name as string}</p>
                    {!!b.booker_email && (
                      <p className="text-xs text-[#5E6470]">{b.booker_email as string}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-[#5E6470]">
                    {b.contact_phone as string}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-[#5E6470]">
                    {fmtDate(b.start_date)}
                    {!!b.end_date && b.end_date !== b.start_date && (
                      <span> – {fmtDate(b.end_date)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-[#5E6470]">
                    {b.zone_name as string}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {b.driver_name ? (
                      <>
                        <p className="font-medium text-xs">{b.driver_name as string}</p>
                        <p className="text-xs text-[#5E6470]">{b.driver_mobile as string}</p>
                      </>
                    ) : (
                      <span className="text-[#5E6470]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">
                    {fmtAUD(Number(b.amount_due))}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status as string} />
                  </td>
                  {canCancel && (
                    <td className="px-4 py-3">
                      {(b.status !== "cancelled" && b.status !== "complete") && (
                        <CancelBookingBtn bookingId={b.id as string} />
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
