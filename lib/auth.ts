import { createAuthServer } from "@neondatabase/auth/next/server";
import { redirect } from "next/navigation";
import { sql } from "./db";

export type UserRole = "admin" | "lions_staff" | "bus_coordinator" | "waw_staff";

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
 * Auto-links the Neon Auth user ID to the staff record on first login if emails match.
 */
export async function getUser(): Promise<AppUser | null> {
  const { data: session } = await getAuthServer().getSession();
  if (!session?.user?.id) return null;
  return getUserByAuthId(session.user.id, session.user.email ?? undefined);
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
 * Creates a Neon Auth user via the admin API and returns the new user's auth ID.
 * Returns null if the API call fails (e.g. the logged-in user doesn't have Neon Auth admin role yet).
 * To enable: Neon Console → Auth → Users → your account → ⋯ → "Make admin".
 */
export async function createNeonAuthUser(email: string, name: string): Promise<string | null> {
  try {
    const randomPassword = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const res = await getAuthServer().admin.createUser({ email, name, password: randomPassword });
    return (res.data as any)?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Sends a Neon Auth password-reset email to the given address.
 * Used as the invite mechanism: staff click the link, set their password, and are in.
 * Silently no-ops if Neon Auth email is not configured.
 */
export async function sendNeonAuthPasswordReset(email: string, appUrl: string): Promise<void> {
  try {
    await (getAuthServer() as any).requestPasswordReset({
      email,
      redirectTo: `${appUrl}/reset-password`,
    });
  } catch {
    // Non-fatal — falls back to Resend invite email
  }
}

/**
 * Looks up the app user record by their Neon Auth user ID.
 * If not found by ID but email is provided, auto-links an unlinked staff record with a matching email.
 */
export async function getUserByAuthId(authId: string, email?: string): Promise<AppUser | null> {
  const rows = (await sql`
    SELECT id, display_name, email, role
    FROM users
    WHERE neon_auth_user_id = ${authId}
      AND is_active = TRUE
    LIMIT 1
  `) as Array<Record<string, string>>;

  if (rows[0]) {
    const r = rows[0];
    return { id: r.id, displayName: r.display_name, email: r.email, role: r.role as UserRole };
  }

  // Auto-link: if the admin pre-created a staff record with this email but no auth ID yet
  if (email) {
    await sql`
      UPDATE users
      SET neon_auth_user_id = ${authId}
      WHERE neon_auth_user_id IS NULL
        AND LOWER(email) = LOWER(${email})
        AND is_active = TRUE
    `;
    const linked = (await sql`
      SELECT id, display_name, email, role
      FROM users
      WHERE neon_auth_user_id = ${authId}
        AND is_active = TRUE
      LIMIT 1
    `) as Array<Record<string, string>>;
    if (!linked[0]) return null;
    const r = linked[0];
    return { id: r.id, displayName: r.display_name, email: r.email, role: r.role as UserRole };
  }

  return null;
}
