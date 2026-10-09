export const dynamic = "force-dynamic";

import type { Metadata } from "next";

import { getPricingSnapshot, getUnavailableDates, getCurrentConditions } from "@/lib/queries/booking";
import BookingWizard from "@/components/booking/BookingWizard";

export const metadata: Metadata = { title: "Book the bus" };

export default async function BookPage() {
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
