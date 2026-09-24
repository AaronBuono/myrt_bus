import { NextRequest, NextResponse } from "next/server";
import { lookupOrganisation } from "@/lib/queries/booking";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  if (!(await rateLimit(`lookup:${clientKey(req.headers)}`, 30, 60))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const name = (req.nextUrl.searchParams.get("name") ?? "").slice(0, 200);
  if (!name.trim()) return NextResponse.json({ category: "a" });

  const org = await lookupOrganisation(name);
  if (!org) return NextResponse.json({ category: "a" }, { status: 404 });

  return NextResponse.json({ category: org.category, isInvoicedOrg: org.isInvoicedOrg });
}
