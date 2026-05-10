import { requireRole } from "@/lib/auth";
import { getActiveBankWithHours, getBookingsList } from "@/lib/queries/admin";
import StatusBadge from "@/components/admin/StatusBadge";

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

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function fmtTime(t: unknown) {
  if (!t) return "";
  const [h, m] = (t as string).split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "pm" : "am";
  const h12 = hour % 12 || 12;
  return `${h12}:${m}${ampm}`;
}

export default async function WAWPage() {
  await requireRole("admin");

  const [bankData, upcoming] = await Promise.all([
    getActiveBankWithHours(),
    getBookingsList({ status: "confirmed" }),
  ]);

  const inUse = await getBookingsList({ status: "in_use" });
  const bank = bankData?.bank;
  const hours = bankData?.hours ?? [];

  const today = new Date().getDay();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Bank details */}
      {bank && (
        <div className="card">
          <h2 className="text-base font-bold text-brand-blue mb-3">Payment Details</h2>
          <p className="text-sm text-[#5E6470] mb-4">
            Direct bookers to pay at the branch or via EFT before or on the day of hire.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div>
                <p className="form-label">Bank</p>
                <p className="text-sm font-semibold">{bank.bank_name as string}</p>
              </div>
              <div>
                <p className="form-label">Address</p>
                <p className="text-sm">{bank.street_address as string}</p>
              </div>
              <div>
                <p className="form-label">Phone</p>
                <p className="text-sm">{bank.phone as string}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <p className="form-label">BSB</p>
                <p className="text-sm font-mono font-semibold">{bank.bsb as string}</p>
              </div>
              <div>
                <p className="form-label">Account Number</p>
                <p className="text-sm font-mono font-semibold">{bank.account_number as string}</p>
              </div>
            </div>
          </div>

          {/* Opening hours */}
          <div className="mt-4 border-t border-[#DDE1EA] pt-4">
            <p className="form-label mb-2">Branch Hours</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
              {hours.map((h) => (
                <div
                  key={h.day_of_week as number}
                  className={`text-xs rounded-lg px-3 py-2 ${
                    (h.day_of_week as number) === today
                      ? "bg-brand-blue text-white font-bold"
                      : "bg-[#F8F9FC] text-[#5E6470]"
                  }`}
                >
                  <p className="font-semibold">{DAYS[h.day_of_week as number].slice(0, 3)}</p>
                  {h.is_open ? (
                    <p>{fmtTime(h.opening_time)} – {fmtTime(h.closing_time)}</p>
                  ) : (
                    <p>Closed</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Currently in use */}
      {inUse.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-[#DDE1EA] flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-base font-bold text-brand-blue">Bus Currently Out ({inUse.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F8F9FC] border-b border-[#DDE1EA]">
                  <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide">Ref</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide">Booker</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide">Return</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F1F4]">
                {inUse.map((b) => (
                  <tr key={b.id as string} className="hover:bg-[#F8F9FC]">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-blue">{b.reference as string}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{b.booker_name as string}</p>
                      <p className="text-xs text-[#5E6470]">{b.contact_phone as string}</p>
                    </td>
                    <td className="px-4 py-3 text-[#5E6470]">{fmtDate(b.end_date)}</td>
                    <td className="px-4 py-3 font-semibold">{fmtAUD(Number(b.amount_due))}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status as string} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upcoming confirmed bookings */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-[#DDE1EA]">
          <h2 className="text-base font-bold text-brand-blue">Upcoming Bookings — Awaiting Payment</h2>
          <p className="text-sm text-[#5E6470] mt-0.5">
            Confirmed bookings where payment has not yet been received.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8F9FC] border-b border-[#DDE1EA]">
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide">Ref</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide">Booker</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide">Hire Dates</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide hidden md:table-cell">Destination</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide">Amount Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F1F4]">
              {upcoming.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[#5E6470]">
                    No upcoming bookings.
                  </td>
                </tr>
              )}
              {upcoming.map((b) => (
                <tr key={b.id as string} className="hover:bg-[#F8F9FC]">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-blue">{b.reference as string}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{b.booker_name as string}</p>
                    <p className="text-xs text-[#5E6470]">{b.contact_phone as string}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-[#5E6470]">
                    {fmtDate(b.start_date)}
                    {!!b.end_date && b.end_date !== b.start_date && ` – ${fmtDate(b.end_date)}`}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-[#5E6470]">{b.destination as string}</td>
                  <td className="px-4 py-3 font-bold text-brand-blue">{fmtAUD(Number(b.amount_due))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
