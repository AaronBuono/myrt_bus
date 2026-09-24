import React from "react";
import { getBookingDetail, getBookingAudit, getBookingEmails } from "@/lib/queries/admin";
import StatusBadge from "@/components/admin/StatusBadge";
import CancelBookingBtn from "@/components/admin/CancelBookingBtn";
import ResendConfirmationBtn from "@/components/admin/ResendConfirmationBtn";
import ModifyDatesForm from "@/components/admin/ModifyDatesForm";
import { fmtDateTime, fmtIsoDateLong, daysInclusive, isoDate } from "@/lib/time";
import { formatAuMobile } from "@/lib/validation/booking";
import type { BookingViewer } from "./BookingsSection";

function fmtAUD(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 border-b border-[#F0F1F4] last:border-0 sm:flex-row sm:gap-4">
      <span className="text-xs font-semibold text-[#5E6470] uppercase tracking-wide sm:w-40 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-[#1A1D23] flex-1 break-words">{value || "—"}</span>
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

const AUDIT_LABELS: Record<string, string> = {
  created: "Booking created",
  cancelled: "Cancelled",
  dates_changed: "Dates changed",
  picked_up: "Picked up",
  returned: "Returned",
  confirmation_resent: "Confirmation resent",
};

const EMAIL_STATUS_CLS: Record<string, string> = {
  sent: "badge-blue",
  delivered: "badge-green",
  delivery_delayed: "badge-amber",
  bounced: "badge-red",
  complained: "badge-red",
  failed: "badge-red",
};

function yesNo(v: unknown) {
  return v === null || v === undefined ? "—" : v ? "Yes" : "No";
}

type Props = {
  bookingId: string;
  viewer: BookingViewer;
  modify?: boolean;
};

export default async function BookingDetailSection({ bookingId, viewer, modify = false }: Props) {
  const back = `${viewer.basePath}?section=bookings`;
  const isUuid = /^[0-9a-f-]{36}$/i.test(bookingId);
  const [b, audit, emails] = isUuid
    ? await Promise.all([getBookingDetail(bookingId), getBookingAudit(bookingId), getBookingEmails(bookingId)])
    : [null, [], []];

  if (!b) {
    return (
      <div className="card text-center py-12 text-[#5E6470]">
        <p className="font-semibold">Booking not found.</p>
        <a href={back} className="text-brand-blue hover:underline text-sm mt-2 inline-block">← Back to Bookings</a>
      </div>
    );
  }

  const status = b.status as string;
  const startDate = b.start_date as string;
  const endDate = b.end_date as string;
  const days = daysInclusive(startDate, endDate);
  const self = `${viewer.basePath}?section=bookings&bookingId=${b.id as string}`;
  const canCancelThis = viewer.canManage && (status === "confirmed" || status === "picked_up");
  const canChangeThis = viewer.canManage && status === "confirmed";

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <a href={back} className="btn-secondary text-sm">← Back</a>
          <h2 className="font-mono text-lg font-bold text-brand-blue">{b.reference as string}</h2>
          <StatusBadge status={status} />
        </div>
        {canCancelThis && <CancelBookingBtn bookingId={b.id as string} />}
      </div>

      {(!!b.replaced_by_id || !!b.replaces_booking_id) && (
        <div className="rounded-xl border border-[#C0CFE8] bg-[#EEF2FF] px-4 py-3 text-sm text-brand-blue">
          {!!b.replaced_by_id && (
            <p>Dates were changed. Replaced by <a className="font-mono font-bold underline" href={`${viewer.basePath}?section=bookings&bookingId=${b.replaced_by_id as string}`}>{b.replaced_by_reference as string}</a>.</p>
          )}
          {!!b.replaces_booking_id && (
            <p>Replaces <a className="font-mono font-bold underline" href={`${viewer.basePath}?section=bookings&bookingId=${b.replaces_booking_id as string}`}>{b.replaces_reference as string}</a> (dates changed).</p>
          )}
        </div>
      )}

      {viewer.canManage && status === "confirmed" && (
        <div className="card flex flex-wrap items-center gap-3 py-3">
          {!modify && <a href={`${self}&modify=1`} className="btn-secondary text-sm">Change dates</a>}
          <ResendConfirmationBtn bookingId={b.id as string} />
        </div>
      )}

      {canChangeThis && modify && (
        <ModifyDatesForm
          bookingId={b.id as string}
          startDate={startDate}
          endDate={endDate}
          pickupTime={b.pickup_time as string}
          returnTime={b.dropoff_time as string}
          cancelHref={self}
        />
      )}

      {/* Booking */}
      <SectionCard title="Booking">
        <Row label="Pick up" value={fmtDateTime(b.pickup_at)} />
        <Row label="Return" value={<>{fmtDateTime(b.return_at)} <span className="text-[#5E6470]">({days} day{days !== 1 ? "s" : ""})</span></>} />
        <Row label="Zone" value={b.zone_name as string} />
        <Row label="Destination" value={b.destination as string} />
        {!!b.purpose && <Row label="Purpose (legacy)" value={b.purpose as string} />}
        {!!b.passenger_count && <Row label="Passengers (legacy)" value={String(b.passenger_count)} />}
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
        <Row label="Organisation" value={
          (b.organisation_name as string | null) ??
          (b.booker_name !== b.contact_person ? (b.booker_name as string) : "Individual")
        } />
        <Row label="Contact name" value={b.contact_person as string} />
        <Row label="Mobile" value={formatAuMobile(b.contact_phone as string)} />
        <Row label="Email" value={b.booker_email as string} />
        {viewer.showPii && <Row label="Address" value={b.contact_address as string} />}
      </SectionCard>

      {/* Driver */}
      <SectionCard title="Driver">
        <Row label="Full name" value={b.driver_name as string} />
        <Row label="Mobile" value={formatAuMobile(b.driver_mobile as string)} />
        {viewer.showPii && (
          <>
            <Row label="Licence" value={`${(b.licence_state as string) ?? ""} ${(b.licence_number as string) ?? ""}`.trim()} />
            <Row label="Licence expiry" value={b.licence_expiry ? fmtIsoDateLong(isoDate(b.licence_expiry)) : "—"} />
            <Row label="Home address" value={b.home_address as string} />
          </>
        )}
        <Row label="Age confirmed" value={(b.age_confirmed as boolean) ? "Yes — 21 or older" : "Not confirmed"} />
      </SectionCard>

      {/* Handover */}
      {(status === "picked_up" || status === "returned" || !!b.keys_collected_at) && (
        <SectionCard title="Pickup and return">
          <Row label="Picked up" value={b.keys_collected_at ? `${fmtDateTime(b.keys_collected_at)} by ${(b.picked_up_by as string) ?? "—"}` : "—"} />
          <Row label="Licence sighted" value={yesNo(b.licence_sighted)} />
          <Row label="Key handed over" value={yesNo(b.key_handed_over)} />
          <Row label="Odometer out" value={b.odometer_out !== null ? `${b.odometer_out} km` : "—"} />
          <Row label="Returned" value={b.keys_returned_at ? `${fmtDateTime(b.keys_returned_at)} by ${(b.returned_by as string) ?? "—"}` : "—"} />
          <Row label="Odometer in" value={b.odometer_in !== null ? `${b.odometer_in} km (${Number(b.odometer_in) - Number(b.odometer_out)} km travelled)` : "—"} />
          <Row label="Fuel full" value={yesNo(b.fuel_full)} />
          <Row label="Bus cleaned" value={yesNo(b.bus_cleaned)} />
          <Row label="Damage" value={b.damage_notes as string} />
          {!!b.damage_photo_url && (
            <Row label="Damage photo" value={<a href={b.damage_photo_url as string} target="_blank" rel="noreferrer" className="text-brand-blue underline">View photo</a>} />
          )}
        </SectionCard>
      )}

      {/* Timeline */}
      <SectionCard title="Timeline">
        <Row label="Booking created" value={fmtDateTime(b.created_at)} />
        <Row label="Conditions accepted" value={`${fmtDateTime(b.conditions_accepted_at)}${b.conditions_version ? ` (version ${b.conditions_version})` : ""}`} />
        {!!b.cancelled_at && (
          <Row label="Cancelled" value={`${fmtDateTime(b.cancelled_at)}${b.cancelled_by ? ` by ${b.cancelled_by}` : ""}${b.cancellation_reason ? `: ${b.cancellation_reason}` : ""}`} />
        )}
      </SectionCard>

      {/* Emails */}
      <SectionCard title="Emails">
        {emails.length === 0 && <p className="py-3 text-sm text-[#5E6470]">No emails recorded.</p>}
        {emails.map((e, i) => (
          <div key={i} className="py-2.5 border-b border-[#F0F1F4] last:border-0 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className={EMAIL_STATUS_CLS[e.status as string] ?? "badge-blue"}>{String(e.status).replace("_", " ")}</span>
              <span className="font-semibold">{e.subject as string}</span>
            </div>
            <p className="text-[#5E6470]">To {e.to_address as string} · {fmtDateTime(e.created_at)}</p>
            {!!e.error && <p className="text-red-700">{e.error as string}</p>}
          </div>
        ))}
      </SectionCard>

      {/* Audit */}
      <SectionCard title="History">
        {audit.length === 0 && <p className="py-3 text-sm text-[#5E6470]">No history recorded.</p>}
        {audit.map((a, i) => (
          <Row
            key={i}
            label={fmtDateTime(a.created_at)}
            value={<><span className="font-semibold">{AUDIT_LABELS[a.action as string] ?? (a.action as string)}</span> by {a.actor_label as string}</>}
          />
        ))}
      </SectionCard>
    </div>
  );
}
