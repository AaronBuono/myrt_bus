export const dynamic = "force-dynamic";

import Image from "next/image";
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
      <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 text-xs font-semibold px-3 py-1 rounded-full">
        {day} <span className="font-normal opacity-70">Closed</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 bg-[#EEF2FF] text-brand-blue text-xs font-semibold px-3 py-1 rounded-full">
      {day} <span className="font-normal opacity-80">{fmt12h(hour.openingTime)} – {fmt12h(hour.closingTime)}</span>
    </span>
  );
}

export default async function HomePage() {
  const { zones, bank, hours } = await getHomePageData();

  return (
    <div>
      {/* ── Hero ── */}
      <div className="bg-brand-blue py-16 px-6 text-center">
        <div className="flex items-center justify-center gap-8 mb-8">
          <Image src="/logo-lions.png" alt="Myrtleford Lions Club" width={72} height={72} className="rounded-full border-4 border-brand-gold" />
          <div className="w-px h-14 bg-white/20" />
          <div className="bg-white rounded-xl px-4 py-2 flex items-center gap-3">
            <Image src="/logo-alpine.png" alt="Alpine Shire Council" width={36} height={36} className="rounded-full" />
            <div className="text-left">
              <p className="text-sm font-bold text-[#1A1A1A]">ALPINE</p>
              <p className="text-[10px] text-[#5E6470] tracking-widest uppercase">Shire Council</p>
            </div>
          </div>
        </div>
        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Myrtleford Lions Club</h1>
        <p className="text-4xl font-bold text-white mb-2 tracking-tight">Community Bus</p>
        <p className="text-base text-white/60 max-w-md mx-auto mb-10 leading-relaxed">
          Available to community groups and residents across the Alpine Shire region.
        </p>
        <Link href="/book" className="btn-cta text-lg px-12 py-4">
          Book the Bus
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">

        {/* ── How it works ── */}
        <section>
          <h2 className="text-2xl font-bold text-brand-blue text-center mb-2">How it works</h2>
          <p className="text-sm text-[#5E6470] text-center mb-8">Four simple steps from booking to collecting the keys.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { n: 1, title: "Check dates", body: "Browse the calendar for an available date." },
              { n: 2, title: "Fill in details", body: "Enter your driver details and agree to the conditions." },
              { n: 3, title: "Get your reference", body: "Receive a booking reference and confirmation by email." },
              { n: 4, title: "Pay & collect keys", body: "Pay at WAW Credit Union and pick up the keys." },
            ].map(({ n, title, body }) => (
              <div key={n} className="card text-center">
                <div className="w-9 h-9 rounded-full bg-brand-blue text-white text-sm font-bold flex items-center justify-center mx-auto mb-3">
                  {n}
                </div>
                <p className="text-sm font-bold text-[#1A1A1A] mb-1">{title}</p>
                <p className="text-xs text-[#5E6470] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing ── */}
        <section className="card">
          <h2 className="text-xl font-bold text-brand-blue mb-1">Pricing</h2>
          <p className="text-sm text-[#5E6470] mb-5">
            Community rate — per 24-hour period. An additional $68 applies for each extra day or part thereof.
            Payment is made in person at WAW Credit Union when you collect the keys.
          </p>
          <table className="w-full border-collapse rounded-xl overflow-hidden border border-[#DDE1EA]">
            <thead>
              <tr className="bg-brand-blue text-white">
                <th className="text-left px-4 py-3 text-sm font-semibold">Destination</th>
                <th className="text-left px-4 py-3 text-sm font-semibold hidden sm:table-cell">Examples</th>
                <th className="text-right px-4 py-3 text-sm font-semibold">Rate per day</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((z, i) => (
                <tr key={z.id} className={i % 2 === 0 ? "bg-white" : "bg-[#F9F6F0]"}>
                  <td className="px-4 py-3 text-sm font-semibold text-[#1A1A1A]">{z.zoneName}</td>
                  <td className="px-4 py-3 text-sm text-[#5E6470] hidden sm:table-cell">{z.examples ?? "—"}</td>
                  <td className="px-4 py-3 text-sm font-bold text-brand-blue text-right">${z.ratePerDay}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 bg-[#EEF2FF] rounded-lg px-4 py-3 text-xs text-[#5E6470]">
            A $100 cleaning fee applies if the vehicle is returned unsatisfactorily. The tank must be returned full.
          </div>
        </section>

        {/* ── WAW callout ── */}
        {bank && (
          <section className="bg-[#EEF2FF] border border-[#C7D4F0] rounded-xl px-5 py-5">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-brand-blue flex items-center justify-center flex-shrink-0 text-xl">
                🔑
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-brand-blue mb-1">Keys and payment — {bank.bankName}</p>
                <p className="text-sm text-[#5E6470] mb-4">{bank.streetAddress}</p>
                {hours.length > 0 && (
                  <>
                    <p className="text-xs font-bold text-brand-blue mb-2">Opening hours</p>
                    <div className="flex flex-wrap gap-2">
                      {hours.map((h) => <HoursRow key={h.dayOfWeek} hour={h} />)}
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Book CTA ── */}
        <section className="text-center py-4">
          <p className="text-base text-[#5E6470] mb-5">Ready to make a booking?</p>
          <Link href="/book" className="btn-cta text-base px-10 py-3">
            Book the Bus
          </Link>
        </section>

      </div>
    </div>
  );
}
