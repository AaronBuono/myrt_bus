import "server-only";
import { sql } from "@/lib/db";
import type { AppUser } from "@/lib/auth";

export type AuditActor = AppUser | "customer" | "system";

export function actorId(actor: AuditActor): string | null {
  return typeof actor === "string" ? null : actor.id;
}

export function actorLabel(actor: AuditActor): string {
  if (actor === "customer") return "Customer";
  if (actor === "system") return "System";
  return actor.displayName;
}

/**
 * Records who changed what. Never throws: a failed audit write is logged
 * but doesn't undo the change it describes.
 */
export async function logAudit(entry: {
  actor: AuditActor;
  entityType: string;
  entityId?: string | null;
  bookingId?: string | null;
  action: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await sql`
      INSERT INTO audit_log (entity_type, entity_id, booking_id, action, actor_user_id, actor_label, details)
      VALUES (
        ${entry.entityType},
        ${entry.entityId ?? null}::text,
        ${entry.bookingId ?? null}::uuid,
        ${entry.action},
        ${actorId(entry.actor)}::uuid,
        ${actorLabel(entry.actor)},
        ${JSON.stringify(entry.details ?? {})}::jsonb
      )
    `;
  } catch (err) {
    console.error("logAudit failed:", err, entry);
  }
}
