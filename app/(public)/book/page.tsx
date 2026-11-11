export const dynamic = "force-dynamic";

import type { Metadata } from "next";

import { getPricingSnapshot, getUnavailableDates, getCurrentConditions } from "@/lib/queries/booking";
import BookingWizard from "@/components/booking/BookingWizard";
import { BOOKINGS_OPEN, OPERATOR_NAME } from "@/lib/site";

export const metadata: Metadata = { title: "Book the bus" };

export default async function BookPage() {
  if (!BOOKINGS_OPEN) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "64px 20px", textAlign: "center" }}>
        <h1 className="text-brand-blue font-bold" style={{ fontSize: 28 }}>Online booking opens soon</h1>
        <p style={{ fontSize: 18, marginTop: 16 }}>
          We&apos;re still getting the {OPERATOR_NAME}&apos;s booking system ready, so we can&apos;t take bookings online yet.
          Please check back soon.
        </p>
      </div>
    );
  }

  const [{ zones }, unavailableDates, conditions] = await Promise.all([
    getPricingSnapshot(),
    getUnavailableDates(),
    getCurrentConditions(),
  ]);

  return (
    <div>
      <BookingWizard
        zones={zones}
        unavailableDates={unavailableDates}
        conditions={
          conditions
            ? { id: conditions.id, version: conditions.version, content: conditions.content }
            : { id: null, version: null, content: "The conditions of use couldn't be loaded. Please contact us before booking." }
        }
      />
    </div>
  );
}
