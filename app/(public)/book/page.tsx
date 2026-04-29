export const dynamic = "force-dynamic";

import { getPricingSnapshot, getUnavailableDates, getCurrentConditions } from "@/lib/queries/booking";
import BookingWizard from "@/components/booking/BookingWizard";

const DEFAULT_CONDITIONS = `1. For community use only — not for commercial or profit-making purposes.
2. Maximum 12 passengers including the driver at all times.
3. Driver must be 21 years of age or older.
4. A standard Victorian car licence is sufficient for this vehicle.
5. No smoking — prohibited by law in all vehicles.
6. No alcohol — strictly prohibited on board at any time.
7. Seatbelts must be worn by all passengers at all times when the vehicle is in motion.
8. The hirer is responsible for the conduct and behaviour of all passengers during the hire period.
9. The bus must be returned with a full tank of fuel.
10. If fuel is below full on return, the cost of refuelling plus a surcharge will be charged to the hirer.
11. The bus must be returned in a clean condition — a $100 cleaning fee applies if returned dirty.
12. Late returns are charged at $68 per 24-hour period or part thereof beyond the agreed drop-off time.
13. The hirer must submit fuel gauge and odometer photos via the QR code before departure and again on return.
14. Any accident or incident during the hire period must be reported immediately via the QR incident report.
15. The hirer accepts liability for any damage caused to the vehicle during the hire period.
16. To change booking dates, the existing booking must be cancelled and a new booking made.
17. Late cancellations and policy breaches are recorded against the hirer's booking history.
18. Lions Club of Myrtleford reserves the right to refuse future bookings based on hire history.`;

export default async function BookPage() {
  const [{ zones, additionalDayRate }, unavailableDates, conditions] = await Promise.all([
    getPricingSnapshot(),
    getUnavailableDates(),
    getCurrentConditions(),
  ]);

  return (
    <div>
      <div className="bg-brand-blue px-6 py-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-1">Book the Bus</h1>
        <p className="text-white/70 text-sm">Select your dates, fill in your details, and get a booking reference instantly.</p>
      </div>
      <BookingWizard
        zones={zones}
        unavailableDates={unavailableDates}
        additionalDayRate={additionalDayRate}
        conditionsText={conditions?.content ?? DEFAULT_CONDITIONS}
      />
    </div>
  );
}
