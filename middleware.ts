import { NextResponse, type NextRequest } from "next/server";
import { neonAuthMiddleware } from "@neondatabase/auth/next/server";

// Redirects unauthenticated requests on protected routes to /login
const authMiddleware = neonAuthMiddleware({ loginUrl: "/login" });

const PROTECTED = /^\/(waw|coordinator|admin)(\/|$)|^\/dashboard$/;

/**
 * One canonical origin in production. Any other host that reaches the production
 * deployment (the old *.vercel.app domain, www.) gets a permanent redirect.
 * Preview deployments are left alone so they keep working on their own URLs.
 */
function canonicalRedirect(req: NextRequest): NextResponse | null {
  const canonical = process.env.CANONICAL_HOST;
  if (!canonical || process.env.VERCEL_ENV !== "production") return null;
  const host = req.headers.get("host");
  if (!host || host === canonical) return null;
  // Webhooks are server-to-server and shouldn't depend on following redirects.
  if (req.nextUrl.pathname.startsWith("/api/webhooks/")) return null;

  const url = req.nextUrl.clone();
  url.protocol = "https:";
  url.host = canonical;
  url.port = "";
  return NextResponse.redirect(url, 308);
}

export default async function middleware(req: NextRequest) {
  const redirect = canonicalRedirect(req);
  if (redirect) return redirect;
  if (PROTECTED.test(req.nextUrl.pathname)) return authMiddleware(req);
  return NextResponse.next();
}

export const config = {
  // Everything except static assets, so the canonical redirect covers every page.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|.*\\.(?:png|jpg|jpeg|svg|webp|ico|webmanifest)$).*)"],
};
