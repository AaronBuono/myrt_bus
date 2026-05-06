import React from "react";
import { getBookingDetail } from "@/lib/queries/admin";
import StatusBadge from "@/components/admin/StatusBadge";
import CancelBookingBtn from "@/components/admin/CancelBookingBtn";

function fmtDate(d: unknown) {
  if (!d) return "—";
  return new Date(d as string).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(d: unknown) {
  if (!d) return "—";
  return new Date(d as string).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtAUD(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
}

function fmt12h(t: unknown) {
  if (!t) return "—";
  const s = String(t).slice(0, 5); // "HH:MM"
  const [h, m] = s.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-2.5 border-b border-[#F0F1F4] last:border-0">
      <span className="text-xs font-semibold text-[#5E6470] uppercase tracking-wide w-40 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-[#1A1D23] flex-1">{value || "—"}</span>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-5 py-3 bg-[#F8F9FC] border-b border-[#DDE1EA]">
        <h3 className="text-sm font-bold text-brand-blue">{title}</h3>
      </div>
      <div className="px-5 py-1">{children}</div>
    </div>
  );
}

type Props = {
  bookingId: string;
  canCancel?: boolean;
};

export default async function BookingDetailSection({ bookingId, canCancel = true }: Props) {
  const b = await getBookingDetail(bookingId);

  if (!b) {
    return (
      <div className="card text-center py-12 text-[#5E6470]">
        <p className="font-semibold">Booking not found.</p>
        <a href="?section=bookings" className="text-brand-blue hover:underline text-sm mt-2 inline-block">← Back to Bookings</a>
      </div>
    );
  }

  const startDate = b.start_date as string;
  const endDate = b.end_date as string;
  const days = Math.round(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000
  ) + 1;
  const canCancelThis = canCancel && b.status !== "cancelled" && b.status !== "complete";

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <a href="?section=bookings" className="btn-secondary text-sm">← Back</a>
          <h2 className="font-mono text-lg font-bold text-brand-blue">{b.reference as string}</h2>
          <StatusBadge status={b.status as string} />
        </div>
        {canCancelThis && (
          <CancelBookingBtn bookingId={b.id as string} />
        )}
      </div>

      {/* Booking */}
      <SectionCard title="Booking">
        <Row label="Dates" value={
          startDate === endDate
            ? fmtDate(startDate)
            : <>{fmtDate(startDate)} → {fmtDate(endDate)} <span className="text-[#5E6470]">({days} day{days !== 1 ? "s" : ""})</span></>
        } />
        <Row label="Pick-up time" value={fmt12h(b.pickup_time)} />
        <Row label="Drop-off time" value={fmt12h(b.dropoff_time)} />
        <Row label="Zone" value={b.zone_name as string} />
        <Row label="Destination" value={b.destination as string} />
        {!!b.purpose && <Row label="Purpose" value={b.purpose as string} />}
        <Row label="Passengers" value={b.passenger_count ? String(b.passenger_count) : "—"} />
      </SectionCard>

      {/* Financials */}
      <SectionCard title="Financials">
        <Row label="Category" value={
          (b.category as string) === "c"
            ? "Cat C — No Charge"
            : (b.is_invoiced_org ? "Cat A — Invoiced Org" : "Cat A — Standard")
        } />
        <Row label="Rate (snapshotted)" value={`${fmtAUD(Number(b.rate_per_day))}/day`} />
        <Row label="Amount due" value={<span className="font-semibold">{fmtAUD(Number(b.amount_due))}</span>} />
        <Row label="Payment method" value={b.payment_method ? String(b.payment_method) : "—"} />
        <Row label="Paid at" value={fmtDateTime(b.paid_at)} />
      </SectionCard>

      {/* Booker */}
      <SectionCard title="Booker">
        <Row label="Name / Org" value={b.booker_name as string} />
        <Row label="Contact person" value={b.contact_person as string} />
        <Row label="Phone" value={b.contact_phone as string} />
        <Row label="Email" value={b.booker_email as string} />
      </SectionCard>

      {/* Driver */}
      <SectionCard title="Driver">
        <Row label="Full name" value={b.driver_name as string} />
        <Row label="Mobile" value={b.driver_mobile as string} />
        <Row label="Licence number" value={b.licence_number as string} />
        <Row label="Licence expiry" value={fmtDate(b.licence_expiry)} />
        <Row label="Home address" value={b.home_address as string} />
        <Row label="Age confirmed" value={(b.age_confirmed as boolean) ? "Yes — 21 or older" : "Not confirmed"} />
      </SectionCard>

      {/* Timeline */}
      <SectionCard title="Timeline">
        <Row label="Booking created" value={fmtDateTime(b.created_at)} />
        <Row label="Conditions accepted" value={fmtDateTime(b.conditions_accepted_at)} />
        <Row label="Keys collected" value={fmtDateTime(b.keys_collected_at)} />
        <Row label="Keys returned" value={fmtDateTime(b.keys_returned_at)} />
        {!!b.cancelled_at && <Row label="Cancelled at" value={fmtDateTime(b.cancelled_at)} />}
      </SectionCard>
    </div>
  );
}
