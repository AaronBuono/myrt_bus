import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  lookupOrganisation,
  getPricingSnapshot,
  getCurrentConditions,
  generateReference,
} from "@/lib/queries/booking";
import { sendBookingConfirmation } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      // Step 1
      selectedDates,   // string[] "YYYY-MM-DD"
      zoneId,
      // Step 2 — Section A
      bookerName,
      contactPerson,
      contactPhone,
      bookerEmail,
      // Section B
      driverName,
      driverMobile,
      licenceNumber,
      licenceExpiry,   // "YYYY-MM-DD"
      homeAddress,
      ageConfirmed,
      // Section C
      pickupTime,      // "HH:MM"
      dropoffTime,     // "HH:MM"
      destination,
      purpose,
      passengerCount,
    } = body;

    // Basic validation
    if (
      !selectedDates?.length || !zoneId || !bookerName || !contactPerson ||
      !contactPhone || !bookerEmail || !driverName || !driverMobile ||
      !licenceNumber || !licenceExpiry || !homeAddress || !ageConfirmed ||
      !pickupTime || !dropoffTime || !destination
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sortedDates = [...selectedDates].sort();
    const startDate = sortedDates[0];
    const endDate = sortedDates[sortedDates.length - 1];

    // Fetch pricing + conditions in parallel
    const [{ zones, additionalDayRate }, conditions, org] = await Promise.all([
      getPricingSnapshot(),
      getCurrentConditions(),
      lookupOrganisation(bookerName),
    ]);

    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return NextResponse.json({ error: "Invalid zone" }, { status: 400 });

    const category: "a" | "c" = org?.category ?? "a";
    const isInvoicedOrg = org?.isInvoicedOrg ?? false;
    const days = selectedDates.length;
    const amountDue =
      category === "c" ? 0 : zone.ratePerDay + (days - 1) * additionalDayRate;

    const reference = await generateReference();

    type Row = Record<string, unknown>;

    // Insert booking + driver in a transaction
    await sql`BEGIN`;
    try {
      const bookingRows = (await sql`
        INSERT INTO bookings (
          reference, organisation_id, booker_name, contact_person, contact_phone,
          booker_email, category, is_invoiced_org, status,
          zone_id, zone_name, rate_per_day, additional_day_rate,
          start_date, end_date, pickup_time, dropoff_time,
          destination, purpose, passenger_count,
          amount_due, conditions_version_id, conditions_accepted_at
        ) VALUES (
          ${reference}, ${org?.id ?? null}, ${bookerName}, ${contactPerson}, ${contactPhone},
          ${bookerEmail}, ${category}, ${isInvoicedOrg}, 'confirmed',
          ${zoneId}, ${zone.zoneName}, ${zone.ratePerDay}, ${additionalDayRate},
          ${startDate}, ${endDate}, ${pickupTime}, ${dropoffTime},
          ${destination}, ${purpose ?? null}, ${passengerCount ?? null},
          ${amountDue}, ${conditions?.id ?? null}, NOW()
        )
        RETURNING id
      ` as Row[]);

      const bookingId = bookingRows[0].id as string;

      await sql`
        INSERT INTO booking_drivers (
          booking_id, full_name, mobile, licence_number,
          licence_expiry, home_address, age_confirmed
        ) VALUES (
          ${bookingId}, ${driverName}, ${driverMobile}, ${licenceNumber},
          ${licenceExpiry}, ${homeAddress}, ${ageConfirmed}
        )
      `;

      await sql`COMMIT`;

      // Send confirmation email (non-blocking)
      sendBookingConfirmation({
        to: bookerEmail,
        bookerName,
        reference,
        startDate,
        endDate,
        destination,
        amountDue,
        category,
        isInvoicedOrg,
      }).catch(console.error);

      return NextResponse.json({
        reference,
        amountDue,
        category,
        isInvoicedOrg,
        startDate,
        endDate,
        destination,
        zoneName: zone.zoneName,
      });
    } catch (err) {
      await sql`ROLLBACK`;
      throw err;
    }
  } catch (err) {
    console.error("Booking error:", err);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
