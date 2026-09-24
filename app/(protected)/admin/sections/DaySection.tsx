import Link from "next/link";
import { getDayView } from "@/lib/queries/admin";
import StatusBadge from "@/components/admin/StatusBadge";
import PickupForm from "@/components/admin/PickupForm";
import ReturnForm from "@/components/admin/ReturnForm";
import { fmtInstantTime, fmtDateTime, fmtIsoDateLong, todayInMelbourne } from "@/lib/time";
import { formatAuMobile } from "@/lib/validation/booking";

type Row = Record<string, unknown>;

function shiftDate(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function fmtAUD(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5 text-[15px]">
      <span className="w-24 flex-shrink-0 text-[#5E6470]">{label}</span>
      <span className="min-w-0 break-words font-medium text-[#1A1A1A]">{children}</span>
    </div>
  );
}

function BookingCard({ b, mode, showPii, canAct, basePath }: {
  b: Row; mode: "pickup" | "return"; showPii: boolean; canAct: boolean; basePath: string;
}) {
  const status = b.status as string;
  const cancelled = status === "cancelled";
  const overdue = mode === "return" && status === "picked_up" && !b.is_return_day;
  const payable = b.category === "a" && !b.is_invoiced_org && Number(b.amount_due) > 0;
  const phone = b.contact_phone as string;
  const driverMobile = b.driver_mobile as string | null;

  return (
    <article className={`card space-y-3 ${cancelled ? "opacity-60 bg-[#F8F9FC]" : ""} ${overdue ? "border-red-300" : ""}`}>
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link href={`${basePath}?section=bookings&bookingId=${b.id as string}`} className="font-mono text-xl font-bold text-brand-blue hover:underline">
            {b.reference as string}
          </Link>
          <p className={`text-lg font-bold ${cancelled ? "line-through" : ""}`}>
            {mode === "pickup" ? "Pick up" : "Return"} {mode === "pickup" ? fmtInstantTime(b.pickup_at) : fmtInstantTime(b.return_at)}
            {overdue && <span className="ml-2 text-base text-red-700">overdue since {fmtDateTime(b.return_at)}</span>}
          </p>
        </div>
        <StatusBadge status={status} />
      </header>

      {cancelled && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[15px] text-red-800">
          <p className="font-bold">Cancelled {fmtDateTime(b.cancelled_at)}. Do not hand over the key.</p>
          {!!b.replaced_by_reference && <p>Replaced by booking {b.replaced_by_reference as string}.</p>}
          {!b.replaced_by_reference && !!b.cancellation_reason && <p>{b.cancellation_reason as string}</p>}
        </div>
      )}

      <div className="divide-y divide-[#F0F1F4]">
        <Detail label="Booker">{b.booker_name as string}</Detail>
        <Detail label="Contact">
          {b.contact_person as string} · <a href={`tel:${phone}`} className="text-brand-blue underline">{formatAuMobile(phone)}</a>
        </Detail>
        {!!b.driver_name && (
          <Detail label="Driver">
            {b.driver_name as string}
            {driverMobile && <> · <a href={`tel:${driverMobile}`} className="text-brand-blue underline">{formatAuMobile(driverMobile)}</a></>}
          </Detail>
        )}
        {showPii && !!b.licence_number && (
          <Detail label="Licence">
            {(b.licence_state as string) ?? "—"} {b.licence_number as string}, expires {fmtIsoDateLong(String(b.licence_expiry))}
          </Detail>
        )}
        {showPii && !!b.home_address && <Detail label="Address">{b.home_address as string}</Detail>}
        <Detail label="Trip">{b.destination as string} ({b.zone_name as string})</Detail>
        <Detail label={mode === "pickup" ? "Returns" : "Went out"}>
          {mode === "pickup" ? fmtDateTime(b.return_at) : fmtDateTime(b.keys_collected_at ?? b.pickup_at)}
        </Detail>
        {mode === "pickup" && !cancelled && (
          <Detail label="Payment">
            {b.category === "c" ? "No charge" : b.is_invoiced_org ? "Invoiced to organisation" : `${fmtAUD(Number(b.amount_due))} to pay`}
          </Detail>
        )}
        {status === "returned" && mode === "return" && (
          <Detail label="Returned">
            {fmtDateTime(b.keys_returned_at)} · {Number(b.odometer_in) - Number(b.odometer_out)} km ·
            fuel {b.fuel_full ? "full" : "NOT full"} · {b.bus_cleaned ? "cleaned" : "NOT cleaned"}
            {!!b.damage_notes && <> · damage: {b.damage_notes as string}</>}
          </Detail>
        )}
      </div>

      {canAct && mode === "pickup" && status === "confirmed" && b.is_pickup_day === true && (
        <details className="rounded-lg border border-[#DDE1EA] p-3 open:bg-[#F8F9FC]">
          <summary className="cursor-pointer text-base font-bold text-brand-blue">
            Record pickup{payable ? `: collect ${fmtAUD(Number(b.amount_due))}` : ""}
          </summary>
          <div className="mt-3"><PickupForm bookingId={b.id as string} /></div>
        </details>
      )}
      {canAct && mode === "return" && status === "picked_up" && (
        <details className="rounded-lg border border-[#DDE1EA] p-3 open:bg-[#F8F9FC]">
          <summary className="cursor-pointer text-base font-bold text-brand-blue">Record return</summary>
          <div className="mt-3"><ReturnForm bookingId={b.id as string} /></div>
        </details>
      )}
      {mode === "pickup" && status !== "confirmed" && !cancelled && (
        <p className="text-[15px] text-[#5E6470]">Picked up {fmtDateTime(b.keys_collected_at)}, odometer {String(b.odometer_out ?? "—")} km</p>
      )}
    </article>
  );
}

export default async function DaySection({ date, showPii, canAct, basePath }: {
  date?: string; showPii: boolean; canAct: boolean; basePath: string;
}) {
  const today = todayInMelbourne();
  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today;
  const rows = await getDayView(day);

  const pickups = rows.filter((b) => b.is_pickup_day === true);
  const returns = rows.filter(
    (b) =>
      (b.is_return_day === true || b.status === "picked_up") &&
      !(b.is_pickup_day === true && b.status === "confirmed") &&
      !(b.is_pickup_day === true && b.status === "cancelled"),
  );

  const nav = (d: string) => `${basePath}?section=day&date=${d}`;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="card space-y-3">
        <h2 className="text-xl font-bold text-brand-blue">{fmtIsoDateLong(day)}{day === today && " (today)"}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={nav(shiftDate(day, -1))} className="btn-secondary">← Prev</Link>
          {day !== today && <Link href={nav(today)} className="btn-secondary">Today</Link>}
          <Link href={nav(shiftDate(day, 1))} className="btn-secondary">Next →</Link>
          <form method="GET" action={basePath} className="flex items-center gap-2">
            <input type="hidden" name="section" value="day" />
            <label htmlFor="day-picker" className="sr-only">Go to date</label>
            <input id="day-picker" type="date" name="date" defaultValue={day} className="form-input form-input-lg w-auto" />
            <button type="submit" className="btn-primary">Go</button>
          </form>
        </div>
      </div>

      <section className="space-y-3">
        <h3 className="text-lg font-bold">Pickups ({pickups.length})</h3>
        {pickups.length === 0 && <p className="card text-[15px] text-[#5E6470]">No pickups on this day.</p>}
        {pickups.map((b) => (
          <BookingCard key={`p-${b.id as string}`} b={b} mode="pickup" showPii={showPii} canAct={canAct} basePath={basePath} />
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-bold">Returns ({returns.length})</h3>
        {returns.length === 0 && <p className="card text-[15px] text-[#5E6470]">No returns due on this day.</p>}
        {returns.map((b) => (
          <BookingCard key={`r-${b.id as string}`} b={b} mode="return" showPii={showPii} canAct={canAct} basePath={basePath} />
        ))}
      </section>
    </div>
  );
}
