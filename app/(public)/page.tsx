export const dynamic = "force-dynamic";

import Link from "next/link";
import { getHomePageData } from "@/lib/queries/home";
import type { OpeningHour } from "@/lib/queries/home";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function fmt12h(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function HoursRow({ hour }: { hour: OpeningHour }) {
  const day = DAYS[hour.dayOfWeek];
  if (!hour.isOpen) {
    return (
      <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 text-sm font-semibold px-3 py-1 rounded">
        {day} <span className="font-normal opacity-70">Closed</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-[#E2E8F0] text-brand-blue text-sm font-semibold px-3 py-1 rounded">
      {day} <span className="font-normal opacity-80">{fmt12h(hour.openingTime)} – {fmt12h(hour.closingTime)}</span>
    </span>
  );
}

export default async function HomePage() {
  const { zones, bank, hours } = await getHomePageData();

  return (
    <div>
      {/* ── Hero ── */}
      <div className="border-t-4 border-brand-blue" />
      <div className="max-w-3xl mx-auto px-6 py-16 border-b border-[#E2E8F0]">
        <h1 className="text-4xl font-bold text-brand-blue mb-4 tracking-tight">
          Myrtleford Lions Club<br />Community Bus
        </h1>
        <p className="text-lg text-slate-600 max-w-lg mb-8 leading-relaxed">
          Available to community groups and residents across the Alpine Shire region.
        </p>
        <Link href="/book" className="btn-cta text-base px-10 py-3">
          Book the Bus
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">

        {/* ── How it works ── */}
        <section>
          <h2 className="text-2xl font-bold text-brand-blue mb-2">How it works</h2>
          <p className="text-base text-slate-500 mb-8">Four steps from booking to collecting the keys.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { n: 1, title: "Check dates", body: "Browse the calendar for an available date." },
              { n: 2, title: "Fill in details", body: "Enter your driver details and agree to the conditions." },
              { n: 3, title: "Get your reference", body: "Receive a booking reference and confirmation by email." },
              { n: 4, title: "Pay & collect keys", body: "Pay at WAW Credit Union and pick up the keys." },
            ].map(({ n, title, body }) => (
              <div key={n}>
                <p aria-hidden="true" className="text-5xl font-bold text-[#E2E8F0] leading-none mb-2 select-none">{n}</p>
                <p className="text-base font-bold text-brand-blue mb-1">{title}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing ── */}
        <section>
          <h2 className="text-2xl font-bold text-brand-blue mb-2">Pricing</h2>
          <p className="text-base text-slate-500 mb-5">
            Community rate — per 24-hour period. An additional $68 applies for each extra day or part thereof.
            Payment is made in person at WAW Credit Union when you collect the keys.
          </p>
          <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-brand-blue text-white">
                  <th className="text-left px-4 py-3 text-base font-semibold">Destination</th>
                  <th className="text-left px-4 py-3 text-base font-semibold hidden sm:table-cell">Examples</th>
                  <th className="text-right px-4 py-3 text-base font-semibold">Rate per day</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((z) => (
                  <tr key={z.id} className="border-t border-[#E2E8F0]">
                    <td className="px-4 py-3 text-base font-semibold text-[#1A1A1A]">{z.zoneName}</td>
                    <td className="px-4 py-3 text-base text-slate-500 hidden sm:table-cell">{z.examples ?? "—"}</td>
                    <td className="px-4 py-3 text-base font-bold text-brand-blue text-right">${z.ratePerDay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 border-l-4 border-brand-blue pl-4 py-1">
            <p className="text-sm text-slate-600">A $100 cleaning fee applies if the vehicle is returned unsatisfactorily. The tank must be returned full.</p>
          </div>
        </section>

        {/* ── WAW callout ── */}
        {bank && (
          <section className="border-l-4 border-brand-amber pl-5 py-2">
            <p className="text-lg font-bold text-brand-blue mb-1">Keys and payment — {bank.bankName}</p>
            <p className="text-base text-slate-500 mb-4">{bank.streetAddress}</p>
            {hours.length > 0 && (
              <>
                <p className="text-sm font-bold text-brand-blue mb-2">Opening hours</p>
                <div className="flex flex-wrap gap-2">
                  {hours.map((h) => <HoursRow key={h.dayOfWeek} hour={h} />)}
                </div>
              </>
            )}
          </section>
        )}

        {/* ── Book CTA ── */}
        <section className="text-center py-4 border-t border-[#E2E8F0]">
          <p className="text-base text-slate-500 mb-5">Ready to make a booking?</p>
          <Link href="/book" className="btn-cta text-base px-10 py-3">
            Book the Bus
          </Link>
        </section>

      </div>
    </div>
  );
}
