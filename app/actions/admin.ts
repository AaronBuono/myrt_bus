"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireRole, createNeonAuthUser } from "@/lib/auth";
import {
  updateZoneRate,
  publishNewConditions,
  updateSystemSettings,
  updateBankRecord,
  updateOpeningHour,
  upsertOrganisation,
  deleteOrganisation,
  setUserActive,
  updateStaffUser,
  createStaffUser,
  getStaffUserById,
} from "@/lib/queries/admin";
import { cancelBooking, modifyBookingDates, rotateManageToken } from "@/lib/queries/booking";
import { periodSchema, fieldErrors } from "@/lib/validation/booking";
import { isOverlapViolation } from "@/lib/reference";
import { logAudit } from "@/lib/audit";
import { sendStaffInvite } from "@/lib/email";
import { sendConfirmationFor, notifyCancelled } from "@/lib/notifications";
import { SITE_URL } from "@/lib/site";

function revalidateBookings() {
  revalidatePath("/admin");
  revalidatePath("/coordinator");
  revalidatePath("/waw");
}

// ── Bookings (admin override) ────────────────────────────────

export async function cancelBookingAction(formData: FormData) {
  const user = await requireRole("admin");
  const id = formData.get("bookingId") as string;
  if (!id) return;
  const reason = ((formData.get("reason") as string) || "").trim() || "Cancelled by admin";
  const ok = await cancelBooking(id, user, { reason, allowPickedUp: true });
  if (ok && formData.get("notify") !== "false") {
    after(() => notifyCancelled(id, "staff"));
  }
  revalidateBookings();
}

export type ActionState = { ok?: boolean; error?: string; message?: string } | null;

export async function resendConfirmationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("admin");
  const id = formData.get("bookingId") as string;
  if (!id) return { error: "Missing booking" };

  // Only the token hash is stored, so resending means issuing a new link (the old one stops working).
  const token = await rotateManageToken(id);
  if (!token) return { error: "Only confirmed bookings can have their confirmation resent." };

  await logAudit({ actor: user, entityType: "booking", entityId: id, bookingId: id, action: "confirmation_resent" });
  await sendConfirmationFor(id, token);
  revalidateBookings();
  return { ok: true, message: "Confirmation sent with a new manage link. Any older link no longer works." };
}

export async function modifyBookingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("admin");
  const id = formData.get("bookingId") as string;
  const parsed = periodSchema.safeParse({
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    pickupTime: formData.get("pickupTime"),
    returnTime: formData.get("returnTime"),
  });
  if (!id) return { error: "Missing booking" };
  if (!parsed.success) return { error: Object.values(fieldErrors(parsed.error))[0] };

  let result;
  try {
    result = await modifyBookingDates(id, parsed.data, user);
  } catch (err) {
    if (isOverlapViolation(err)) return { error: "Those dates overlap another booking." };
    throw err;
  }
  if (!result.ok) return { error: "Only confirmed bookings can have their dates changed." };

  const { bookingId, token } = result;
  if (formData.get("notify") !== "false") {
    after(() => sendConfirmationFor(bookingId, token, { isChange: true }));
  }
  revalidateBookings();
  redirect(`/admin?section=bookings&bookingId=${bookingId}`);
}

// ── Pricing & conditions ─────────────────────────────────────

export async function updateZoneRateAction(formData: FormData) {
  const user = await requireRole("admin");
  const zoneId = formData.get("zoneId") as string;
  const rate = parseFloat(formData.get("rate") as string);
  if (!zoneId || isNaN(rate) || rate < 0) return;
  await updateZoneRate(zoneId, rate, user.id);
  await logAudit({ actor: user, entityType: "pricing_zone", entityId: zoneId, action: "rate_updated", details: { rate } });
  revalidatePath("/admin");
}

export async function publishConditionsAction(formData: FormData) {
  const user = await requireRole("admin");
  const content = (formData.get("content") as string)?.trim();
  if (!content) return;
  const version = await publishNewConditions(content, user.id);
  await logAudit({ actor: user, entityType: "conditions", entityId: String(version), action: "published", details: { version } });
  revalidatePath("/admin");
}

// ── Settings ─────────────────────────────────────────────────

export async function updateSystemSettingsAction(formData: FormData) {
  const user = await requireRole("admin");
  const cutoff = parseInt(formData.get("self_cancel_cutoff_hours") as string);
  const data = {
    registeredName: (formData.get("registered_name") as string) || undefined,
    registrationNumber: (formData.get("registration_number") as string) || undefined,
    abn: (formData.get("abn") as string) || undefined,
    postalAddress: (formData.get("postal_address") as string) || undefined,
    treasurerName: (formData.get("treasurer_name") as string) || undefined,
    treasurerMobile: (formData.get("treasurer_mobile") as string) || undefined,
    emailFromAddress: (formData.get("email_from_address") as string) || undefined,
    emailReplyTo: (formData.get("email_reply_to") as string) || undefined,
    selfCancelCutoffHours: isNaN(cutoff) || cutoff < 0 ? undefined : cutoff,
    adminNotifyEmail: ((formData.get("admin_notify_email") as string) || "").trim() || undefined,
  };
  await updateSystemSettings(data);
  await logAudit({ actor: user, entityType: "settings", action: "updated", details: data });
  revalidatePath("/admin");
}

export async function updateBankAction(formData: FormData) {
  const user = await requireRole("admin");
  const bankId = formData.get("bankId") as string;
  if (!bankId) return;
  const data = {
    bankName: (formData.get("bank_name") as string) || undefined,
    streetAddress: (formData.get("street_address") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    bsb: (formData.get("bsb") as string) || undefined,
    accountNumber: (formData.get("account_number") as string) || undefined,
  };
  await updateBankRecord(bankId, data);
  await logAudit({
    actor: user, entityType: "bank", entityId: bankId, action: "updated",
    // Record which fields changed, not the account details themselves.
    details: { fields: Object.entries(data).filter(([, v]) => v !== undefined).map(([k]) => k) },
  });
  revalidatePath("/admin");
  revalidatePath("/waw");
}

export async function updateOpeningHourAction(formData: FormData) {
  const user = await requireRole("admin");
  const bankId = formData.get("bankId") as string;
  const dayOfWeek = parseInt(formData.get("day_of_week") as string);
  const isOpen = formData.get("is_open") === "true";
  const openTime = (formData.get("opening_time") as string) || null;
  const closeTime = (formData.get("closing_time") as string) || null;
  if (!bankId || isNaN(dayOfWeek)) return;
  await updateOpeningHour(bankId, dayOfWeek, isOpen, openTime, closeTime);
  await logAudit({
    actor: user, entityType: "opening_hours", entityId: `${bankId}:${dayOfWeek}`, action: "updated",
    details: { dayOfWeek, isOpen, openTime, closeTime },
  });
  revalidatePath("/admin");
  revalidatePath("/");
}

// ── Organisations ────────────────────────────────────────────

export async function upsertOrgAction(formData: FormData) {
  const user = await requireRole("admin");
  const id = (formData.get("id") as string) || undefined;
  const data = {
    id,
    name: formData.get("name") as string,
    category: formData.get("category") as string,
    authorisedContact: formData.get("authorised_contact") as string,
    contactPhone: formData.get("contact_phone") as string,
    contactEmail: formData.get("contact_email") as string,
    invoicingFrequency: (formData.get("invoicing_frequency") as string) || null,
    hasPublicLiability: formData.get("has_public_liability") === "true",
    insurerName: (formData.get("insurer_name") as string) || null,
    policyNumber: (formData.get("policy_number") as string) || null,
    policyExpiryDate: (formData.get("policy_expiry_date") as string) || null,
    notes: (formData.get("notes") as string) || null,
  };
  await upsertOrganisation(data);
  await logAudit({ actor: user, entityType: "organisation", entityId: id ?? null, action: id ? "updated" : "created", details: data });
  redirect("/admin?section=orgs");
}

export async function deleteOrgAction(formData: FormData) {
  const user = await requireRole("admin");
  const id = formData.get("id") as string;
  if (!id) return;
  await deleteOrganisation(id);
  await logAudit({ actor: user, entityType: "organisation", entityId: id, action: "deleted" });
  revalidatePath("/admin");
}

// ── Staff ────────────────────────────────────────────────────

export async function toggleUserActiveAction(formData: FormData) {
  const user = await requireRole("admin");
  const userId = formData.get("userId") as string;
  const isActive = formData.get("isActive") === "true";
  if (!userId) return;
  await setUserActive(userId, isActive);
  await logAudit({ actor: user, entityType: "user", entityId: userId, action: isActive ? "activated" : "deactivated" });
  revalidatePath("/admin");
}

export async function updateStaffUserAction(formData: FormData) {
  const user = await requireRole("admin");
  const userId = formData.get("userId") as string;
  if (!userId) return;
  const data = {
    displayName: (formData.get("display_name") as string) || undefined,
    email: (formData.get("email") as string) || undefined,
    role: (formData.get("role") as string) || undefined,
  };
  await updateStaffUser(userId, data);
  await logAudit({ actor: user, entityType: "user", entityId: userId, action: "updated", details: data });
  redirect("/admin?section=staff");
}

export async function createStaffUserAction(formData: FormData) {
  const user = await requireRole("admin");
  const email = formData.get("email") as string;
  const displayName = formData.get("display_name") as string;
  const role = formData.get("role") as string;
  const sendInvite = formData.get("send_invite") === "true";

  // Create the Neon Auth user immediately so staff don't need to self-register.
  // Falls back to null if the logged-in admin doesn't have Neon Auth admin role yet
  // (fix: Neon Console → Auth → Users → your account → ⋯ → "Make admin").
  const neonAuthUserId = await createNeonAuthUser(email, displayName);
  await createStaffUser({ neonAuthUserId, displayName, email, role });
  await logAudit({ actor: user, entityType: "user", entityId: email, action: "created", details: { email, displayName, role } });

  if (sendInvite) {
    await sendStaffInvite({
      to: email,
      name: displayName,
      loginUrl: `${SITE_URL}/login`,
      authAccountExists: !!neonAuthUserId,
    }).catch(console.error);
  }

  redirect("/admin?section=staff");
}

export async function sendStaffInviteAction(formData: FormData) {
  await requireRole("admin");
  const userId = formData.get("userId") as string;
  if (!userId) return;
  const staff = await getStaffUserById(userId);
  if (!staff) return;

  await sendStaffInvite({
    to: staff.email as string,
    name: staff.display_name as string,
    loginUrl: `${SITE_URL}/login`,
    authAccountExists: !!staff.neon_auth_user_id,
  });
  revalidatePath("/admin");
}
