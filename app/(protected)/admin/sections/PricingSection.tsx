import { getPricingZones } from "@/lib/queries/admin";
import { updateZoneRateAction } from "@/app/actions/admin";

function fmtAUD(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
}

export default async function PricingSection() {
  const zones = await getPricingZones();

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="card">
        <h2 className="text-base font-bold text-brand-blue mb-1">Zone Rates (per day)</h2>
        <p className="text-sm text-[#5E6470] mb-4">
          Changes apply to new bookings only — existing bookings retain their snapshotted rate.
        </p>
        <div className="divide-y divide-[#F0F1F4]">
          {zones.map((zone) => (
            <form key={zone.id as string} action={updateZoneRateAction} className="flex items-center gap-4 py-4">
              <input type="hidden" name="zoneId" value={zone.id as string} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{zone.zone_name as string}</p>
                <p className="text-xs text-[#5E6470] mt-0.5">{zone.examples as string}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm text-[#5E6470]">$</span>
                <input
                  type="number"
                  name="rate"
                  step="0.01"
                  min="0"
                  defaultValue={Number(zone.rate_per_day).toFixed(2)}
                  className="form-input w-24 text-right font-semibold"
                  required
                />
                <button type="submit" className="btn-primary text-xs px-3 py-2">
                  Save
                </button>
              </div>
            </form>
          ))}
        </div>
      </div>

      <div className="card bg-[#EEF2FF] border-brand-blue/20">
        <h3 className="text-sm font-bold text-brand-blue mb-2">Current Rates Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {zones.map((zone) => (
            <div key={zone.id as string} className="flex justify-between text-sm">
              <span className="text-[#5E6470]">{zone.zone_name as string}</span>
              <span className="font-semibold">{fmtAUD(Number(zone.rate_per_day))}/day</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
