import { NextRequest, NextResponse } from "next/server";
import { lookupOrganisation, getPricingSnapshot } from "@/lib/queries/booking";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") ?? "";
  if (!name) return NextResponse.json({ category: "a" });

  const [org, { zones, additionalDayRate }] = await Promise.all([
    lookupOrganisation(name),
    getPricingSnapshot(),
  ]);

  if (!org) return NextResponse.json({ category: "a" }, { status: 404 });

  // Return category and a placeholder estimate (zone unknown at this point)
  return NextResponse.json({ category: org.category, isInvoicedOrg: org.isInvoicedOrg });
}
