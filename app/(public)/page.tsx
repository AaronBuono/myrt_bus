export const dynamic = "force-dynamic";

import Image from "next/image";
import Link from "next/link";
import { getHomePageData } from "@/lib/queries/home";
import type { OpeningHour } from "@/lib/queries/home";

function fmt12h(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function HoursRow({ hour }: { hour: OpeningHour }) {
  const day = DAYS[hour.dayOfWeek];
  if (!hour.isOpen) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#FEF0EE", color: "#B91C1C", fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20, border: "1px solid #F5C6C0" }}>
        {day} <span style={{ fontWeight: 400, opacity: 0.8 }}>Closed</span>
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--navy-tint)", color: "var(--navy)", fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 20, border: "1px solid #C0CFE8" }}>
      {day} <span style={{ fontWeight: 400, opacity: 0.9 }}>{fmt12h(hour.openingTime)} – {fmt12h(hour.closingTime)}</span>
    </span>
  );
}

const HOW_IT_WORKS = [
  { n: 1, title: "Check availability", body: "Browse the calendar to find an open date that suits your group." },
  { n: 2, title: "Fill in your details", body: "Enter your driver details, destination and agree to the conditions of use." },
  { n: 3, title: "Receive your reference", body: "Get a booking reference and confirmation sent to your email address." },
  { n: 4, title: "Pay and collect keys", body: "Visit WAW Credit Union in Myrtleford to pay and pick up the keys." },
];

export default async function HomePage() {
  const { zones, bank, hours } = await getHomePageData();

  return (
    <div>
      {/* ── Hero ── */}
      <div style={{ background: "var(--navy)", padding: "72px 24px 80px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 36 }}>
          <Image
            src="/logo-lions.png"
            alt="Myrtleford Lions Club"
            width={72}
            height={72}
            style={{ borderRadius: "50%", border: "3px solid var(--gold)", flexShrink: 0 }}
          />
          <div style={{ width: 1, height: 48, background: "rgba(255,255,255,0.2)" }} />
          <div style={{ background: "#fff", borderRadius: 8, padding: "6px 12px", display: "flex", alignItems: "center" }}>
            <Image src="/logo-alpine.png" alt="Alpine Shire Council" width={125} height={30} style={{ display: "block" }} />
          </div>
        </div>

        <p style={{ fontFamily: "var(--font-heading)", fontSize: 13, fontWeight: 500, color: "var(--gold)", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 12 }}>
          Myrtleford Lions Club
        </p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(36px, 6vw, 58px)", fontWeight: 700, color: "#fff", lineHeight: 1.1, marginBottom: 16 }}>
          Community Bus
        </h1>
        <p style={{ fontSize: 17, color: "rgba(255,255,255,0.65)", maxWidth: 480, margin: "0 auto 40px", lineHeight: 1.7 }}>
          Available to community groups and residents across the Alpine Shire region.
        </p>
        <Link href="/book" className="btn-cta btn-lg" style={{ display: "inline-block", textDecoration: "none" }}>
          Book the Bus
        </Link>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "0 20px" }}>

        {/* ── How it works ── */}
        <section style={{ padding: "64px 0 48px" }}>
          <p style={{ fontFamily: "var(--font-heading)", fontSize: 11, fontWeight: 600, color: "var(--gold)", letterSpacing: "0.18em", textTransform: "uppercase", textAlign: "center", marginBottom: 10 }}>Getting started</p>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 32, fontWeight: 700, color: "var(--text)", textAlign: "center", marginBottom: 8 }}>How it works</h2>
          <p style={{ fontSize: 15, color: "var(--muted)", textAlign: "center", marginBottom: 44 }}>Four simple steps from booking to collecting the keys.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: 16 }}>
            {HOW_IT_WORKS.map(({ n, title, body }) => (
              <div key={n} style={{ textAlign: "center", padding: "28px 16px" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--gold-light)", border: "2px solid var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 700, color: "var(--gold)" }}>{n}</div>
                <p style={{ fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>{title}</p>
                <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.65 }}>{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing ── */}
        <section style={{ paddingBottom: 48 }}>
          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <div style={{ padding: "28px 28px 20px" }}>
              <p style={{ fontFamily: "var(--font-heading)", fontSize: 11, fontWeight: 600, color: "var(--gold)", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>Pricing</p>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Community rates</h2>
              <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.65 }}>
                Charged per 24-hour period. An additional $68 applies for each extra day or part thereof.
                Payment is made in person at WAW Credit Union when you collect the keys.
              </p>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--navy)" }}>
                  <th style={{ textAlign: "left", padding: "14px 28px", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Destination</th>
                  <th style={{ textAlign: "left", padding: "14px 28px", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)", letterSpacing: "0.06em", textTransform: "uppercase" }} className="pricing-examples-col">Examples</th>
                  <th style={{ textAlign: "right", padding: "14px 28px", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Rate / day</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((z, i) => (
                  <tr key={z.id} style={{ background: i % 2 === 0 ? "#fff" : "var(--cream)" }}>
                    <td style={{ padding: "14px 28px", fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{z.zoneName}</td>
                    <td style={{ padding: "14px 28px", fontSize: 13, color: "var(--muted)" }} className="pricing-examples-col">{z.examples ?? "—"}</td>
                    <td style={{ padding: "14px 28px", fontSize: 16, fontWeight: 700, color: "var(--navy)", textAlign: "right", fontFamily: "var(--font-heading)" }}>${z.ratePerDay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: "14px 28px 20px", background: "var(--cream)", borderTop: "1px solid var(--border)" }}>
              <p style={{ fontSize: 12, color: "var(--muted)" }}>A $100 cleaning fee applies if the vehicle is returned unsatisfactorily. The fuel tank must be returned full.</p>
            </div>
          </div>
        </section>

        {/* ── WAW callout ── */}
        {bank && (
          <section style={{ paddingBottom: 48 }}>
            <div style={{ background: "var(--navy-tint)", border: "1px solid #C0CFE8", borderRadius: 16, padding: "28px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 700, color: "var(--navy)", marginBottom: 4 }}>Keys and payment — {bank.bankName}</p>
                  <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 18 }}>{bank.streetAddress}</p>
                  {hours.length > 0 && (
                    <>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "var(--navy)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Opening hours</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {hours.map((h) => <HoursRow key={h.dayOfWeek} hour={h} />)}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Book CTA ── */}
        <section style={{ paddingBottom: 80, textAlign: "center" }}>
          <div style={{ background: "var(--navy)", borderRadius: 20, padding: "52px 32px" }}>
            <p style={{ fontFamily: "var(--font-heading)", fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 10 }}>Ready to make a booking?</p>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", marginBottom: 28 }}>Check availability and submit your booking in minutes.</p>
            <Link href="/book" className="btn-cta btn-lg" style={{ display: "inline-block", textDecoration: "none" }}>
              Book the Bus
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
