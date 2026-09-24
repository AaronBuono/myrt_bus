export const dynamic = "force-dynamic";

import Link from "next/link";
import { getHomePageData } from "@/lib/queries/home";
import { summariseHours } from "@/lib/hours";
import { HeroReveal, StaggerList, StaggerItem, PressScale } from "@/components/home/Motion";
import BusIllustration from "@/components/home/BusIllustration";
import { OPERATOR_NAME } from "@/lib/site";

const STEPS = [
  {
    title: "Book online",
    body: "Pick your dates, tell us where you're going, and you'll get a booking reference by email straight away.",
  },
  {
    title: "Pick up the key at WAW",
    body: "Collect the key from WAW Credit Union in Myrtleford. Bring the driver's licence.",
  },
  {
    title: "Return and refuel",
    body: "Bring the bus back clean with a full tank, and drop the key back at WAW.",
  },
];

const CONDITIONS_SUMMARY = [
  "For community use only, not for profit.",
  "The driver must be 21 or over with a full Australian or New Zealand car licence.",
  "Up to 12 people including the driver. Seatbelts on at all times.",
  "No smoking or alcohol on board.",
  "Return the bus clean and with a full tank, or fees apply.",
  "Report any damage or incident straight away.",
];

function SectionHeading({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 8 }}>{eyebrow}</p>
      <h2 id={id} style={{ fontFamily: "var(--font-heading)", fontSize: 30, fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>{title}</h2>
    </div>
  );
}

export default async function HomePage() {
  const { zones, bank, hours, contactEmail } = await getHomePageData();
  const hoursText = hours.length ? summariseHours(hours) : null;

  return (
    <div>
      {/* ── 1. Hero ── */}
      <section aria-labelledby="hero-title" style={{ background: "var(--navy)", overflow: "hidden" }}>
        <div className="home-hero">
          <div>
            <HeroReveal>
              <h1 id="hero-title" style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 700, color: "#fff", lineHeight: 1.1, marginBottom: 16 }}>
                Alpine Community Bus
              </h1>
              <p style={{ fontSize: 19, color: "rgba(255,255,255,0.85)", lineHeight: 1.6, maxWidth: 480, marginBottom: 32 }}>
                A 12-seat bus for community groups and residents across the Alpine Shire.
              </p>
            </HeroReveal>
            {/* Outside the reveal so it's visible and clickable from the first paint */}
            <PressScale>
              <Link href="/book" className="btn-cta btn-lg" style={{ display: "inline-block", textDecoration: "none", fontSize: 18, padding: "16px 36px" }}>
                Book the bus
              </Link>
            </PressScale>
          </div>
          <BusIllustration className="home-hero-art" />
        </div>
      </section>

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 20px" }}>

        {/* ── 2. How it works ── */}
        <section aria-labelledby="how-title" style={{ padding: "64px 0 16px" }}>
          <SectionHeading eyebrow="Getting started" title="How it works" id="how-title" />
          <StaggerList className="home-steps">
            {STEPS.map(({ title, body }, i) => (
              <StaggerItem key={title} className="card" >
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--navy)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, fontWeight: 700, marginBottom: 14 }}>{i + 1}</div>
                <h3 style={{ fontSize: 19, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>{title}</h3>
                <p style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.6 }}>{body}</p>
              </StaggerItem>
            ))}
          </StaggerList>
        </section>

        {/* ── 3. Pricing ── */}
        <section aria-labelledby="pricing-title" style={{ padding: "48px 0 16px" }}>
          <SectionHeading eyebrow="Pricing" title="Daily rates" id="pricing-title" />
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <caption className="sr-only">Daily hire rate by destination</caption>
              <thead>
                <tr style={{ background: "var(--navy)" }}>
                  <th scope="col" style={{ textAlign: "left", padding: "14px 20px", fontSize: 14, fontWeight: 600, color: "#fff" }}>Going to</th>
                  <th scope="col" style={{ textAlign: "right", padding: "14px 20px", fontSize: 14, fontWeight: 600, color: "#fff", whiteSpace: "nowrap" }}>Per day</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((z, i) => (
                  <tr key={z.id} style={{ background: i % 2 === 0 ? "#fff" : "var(--cream)" }}>
                    <td style={{ padding: "14px 20px" }}>
                      <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>{z.zoneName}</p>
                      {z.examples && <p style={{ fontSize: 14, color: "var(--muted)", marginTop: 2 }}>{z.examples}</p>}
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 18, fontWeight: 700, color: "var(--navy)", textAlign: "right", whiteSpace: "nowrap" }}>${z.ratePerDay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ padding: "14px 20px", fontSize: 15, color: "var(--muted)", borderTop: "1px solid var(--border)", background: "var(--cream)" }}>
              Pay when you pick up the key. Some community organisations aren&apos;t charged; we&apos;ll let you know when you book.
            </p>
          </div>
        </section>

        {/* ── 4. Conditions ── */}
        <section aria-labelledby="conditions-title" style={{ padding: "48px 0 16px" }}>
          <SectionHeading eyebrow="Before you book" title="Conditions of use" id="conditions-title" />
          <div className="card">
            <ul style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {CONDITIONS_SUMMARY.map((c) => (
                <li key={c} style={{ display: "flex", gap: 12, fontSize: 16, lineHeight: 1.6 }}>
                  <span aria-hidden style={{ color: "var(--gold)", fontWeight: 700 }}>✓</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
            <p style={{ marginTop: 18 }}>
              <Link href="/conditions" style={{ fontSize: 16, fontWeight: 600, color: "var(--navy)", textDecoration: "underline" }}>
                Read the full conditions of use
              </Link>
            </p>
          </div>
        </section>

        {/* ── 5. Contact ── */}
        <section aria-labelledby="contact-title" style={{ padding: "48px 0 72px" }}>
          <SectionHeading eyebrow="Contact" title="Key pickup and questions" id="contact-title" />
          <div className="home-contact">
            {bank && (
              <div className="card">
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>{bank.bankName}</h3>
                <p style={{ fontSize: 16, lineHeight: 1.6 }}>{bank.streetAddress}</p>
                {bank.phone && (
                  <p style={{ fontSize: 16, marginTop: 4 }}>
                    <a href={`tel:${bank.phone.replace(/\s/g, "")}`} style={{ color: "var(--navy)", textDecoration: "underline" }}>{bank.phone}</a>
                  </p>
                )}
                {hoursText && <p style={{ fontSize: 15, color: "var(--muted)", marginTop: 10, lineHeight: 1.6 }}>{hoursText}</p>}
              </div>
            )}
            <div className="card">
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>Booking questions</h3>
              {contactEmail ? (
                <p style={{ fontSize: 16, lineHeight: 1.6 }}>
                  Email <a href={`mailto:${contactEmail}`} style={{ color: "var(--navy)", textDecoration: "underline", wordBreak: "break-all" }}>{contactEmail}</a>
                </p>
              ) : (
                <p style={{ fontSize: 16, lineHeight: 1.6 }}>Ask at WAW Credit Union when you visit.</p>
              )}
              <p style={{ fontSize: 15, color: "var(--muted)", marginTop: 10, lineHeight: 1.6 }}>
                To change or cancel, use the link in your confirmation email.
              </p>
            </div>
          </div>
          <p style={{ fontSize: 14, color: "var(--muted)", marginTop: 28, textAlign: "center" }}>
            Operated by the {OPERATOR_NAME}.
          </p>
        </section>
      </div>
    </div>
  );
}
