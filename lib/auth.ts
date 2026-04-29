import { createAuthServer } from "@neondatabase/auth/next/server";
import { redirect } from "next/navigation";
import { sql } from "./db";

export type UserRole = "waw_staff" | "bus_coordinator" | "lions_admin";

export interface AppUser {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
}

// Lazily initialised so build-time static analysis doesn't fail without env vars.
let _authServer: ReturnType<typeof createAuthServer> | null = null;
function getAuthServer() {
  if (!_authServer) _authServer = createAuthServer();
  return _authServer;
}

/**
 * Returns the current logged-in app user, or null if not authenticated.
 */
export async function getUser(): Promise<AppUser | null> {
  const { data: session } = await getAuthServer().getSession();
  if (!session?.user?.id) return null;
  return getUserByAuthId(session.user.id);
}

/**
 * Asserts the current user has one of the given roles.
 * Redirects to /login if unauthenticated, or /unauthorized if wrong role.
 */
export async function requireRole(...roles: UserRole[]): Promise<AppUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  if (!roles.includes(user.role)) redirect("/unauthorized");
  return user;
}

/**
 * Looks up the app user record by their Neon Auth user ID.
 */
export async function getUserByAuthId(authId: string): Promise<AppUser | null> {
  const rows = (await sql`
    SELECT id, display_name, email, role
    FROM users
    WHERE neon_auth_user_id = ${authId}
      AND is_active = TRUE
    LIMIT 1
  `) as Array<Record<string, string>>;
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: r.id,
    displayName: r.display_name,
    email: r.email,
    role: r.role as UserRole,
  };
}
