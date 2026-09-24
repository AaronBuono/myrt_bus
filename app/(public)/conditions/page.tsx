export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentConditions } from "@/lib/queries/booking";

export const metadata: Metadata = { title: "Conditions of use" };

export default async function ConditionsPage() {
  const conditions = await getCurrentConditions();

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px 72px" }}>
      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 32, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>
        Conditions of use
      </h1>
      {conditions && (
        <p style={{ fontSize: 15, color: "var(--muted)", marginBottom: 24 }}>Version {conditions.version}</p>
      )}
      <div className="card" style={{ fontSize: 17, lineHeight: 1.8, whiteSpace: "pre-line", padding: "24px 28px" }}>
        {conditions?.content ?? "The conditions of use are shown when you make a booking."}
      </div>
      <div style={{ marginTop: 28, textAlign: "center" }}>
        <Link href="/book" className="btn-cta btn-lg" style={{ display: "inline-block", textDecoration: "none" }}>Book the bus</Link>
      </div>
    </div>
  );
}
