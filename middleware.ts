import { neonAuthMiddleware } from "@neondatabase/auth/next/server";

// Redirects unauthenticated requests on protected routes to /login
export default neonAuthMiddleware({ loginUrl: "/login" });

export const config = {
  matcher: ["/waw/:path*", "/coordinator/:path*", "/admin/:path*", "/dashboard"],
};
