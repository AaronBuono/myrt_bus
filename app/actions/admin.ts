"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, createNeonAuthUser, sendNeonAuthPasswordReset } from "@/lib/auth";
import {
  cancelBooking,
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
import { sendStaffInvite } from "@/lib/email";

export async function cancelBookingAction(formData: FormData) {
  const user = await requireRole("admin");
  const id = formData.get("bookingId") as string;
  if (!id) return;
  await cancelBooking(id, user.id);
  revalidatePath("/admin");
  revalidatePath("/coordinator");
}

export async function updateZoneRateAction(formData: FormData) {
  const user = await requireRole("admin");
  const zoneId = formData.get("zoneId") as string;
  const rate = parseFloat(formData.get("rate") as string);
  if (!zoneId || isNaN(rate) || rate < 0) return;
  await updateZoneRate(zoneId, rate, user.id);
  revalidatePath("/admin");
}

export async function publishConditionsAction(formData: FormData) {
  const user = await requireRole("admin");
  const content = (formData.get("content") as string)?.trim();
  if (!content) return;
  await publishNewConditions(content, user.id);
  revalidatePath("/admin");
}

export async function updateSystemSettingsAction(formData: FormData) {
  await requireRole("admin");
  await updateSystemSettings({
    registeredName: (formData.get("registered_name") as string) || undefined,
    registrationNumber: (formData.get("registration_number") as string) || undefined,
    abn: (formData.get("abn") as string) || undefined,
    postalAddress: (formData.get("postal_address") as string) || undefined,
    treasurerName: (formData.get("treasurer_name") as string) || undefined,
    treasurerMobile: (formData.get("treasurer_mobile") as string) || undefined,
    emailFromAddress: (formData.get("email_from_address") as string) || undefined,
    emailReplyTo: (formData.get("email_reply_to") as string) || undefined,
  });
  revalidatePath("/admin");
}

export async function updateBankAction(formData: FormData) {
  await requireRole("admin");
  const bankId = formData.get("bankId") as string;
  if (!bankId) return;
  await updateBankRecord(bankId, {
    bankName: (formData.get("bank_name") as string) || undefined,
    streetAddress: (formData.get("street_address") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    bsb: (formData.get("bsb") as string) || undefined,
    accountNumber: (formData.get("account_number") as string) || undefined,
  });
  revalidatePath("/admin");
  revalidatePath("/waw");
}

export async function updateOpeningHourAction(formData: FormData) {
  await requireRole("admin");
  const bankId = formData.get("bankId") as string;
  const dayOfWeek = parseInt(formData.get("day_of_week") as string);
  const isOpen = formData.get("is_open") === "true";
  const openTime = (formData.get("opening_time") as string) || null;
  const closeTime = (formData.get("closing_time") as string) || null;
  if (!bankId || isNaN(dayOfWeek)) return;
  await updateOpeningHour(bankId, dayOfWeek, isOpen, openTime, closeTime);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function upsertOrgAction(formData: FormData) {
  await requireRole("admin");
  const id = (formData.get("id") as string) || undefined;
  await upsertOrganisation({
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
  });
  redirect("/admin?section=orgs");
}

export async function deleteOrgAction(formData: FormData) {
  await requireRole("admin");
  const id = formData.get("id") as string;
  if (!id) return;
  await deleteOrganisation(id);
  revalidatePath("/admin");
}

export async function toggleUserActiveAction(formData: FormData) {
  await requireRole("admin");
  const userId = formData.get("userId") as string;
  const isActive = formData.get("isActive") === "true";
  if (!userId) return;
  await setUserActive(userId, isActive);
  revalidatePath("/admin");
}

export async function updateStaffUserAction(formData: FormData) {
  await requireRole("admin");
  const userId = formData.get("userId") as string;
  if (!userId) return;
  await updateStaffUser(userId, {
    displayName: (formData.get("display_name") as string) || undefined,
    email: (formData.get("email") as string) || undefined,
    role: (formData.get("role") as string) || undefined,
  });
  redirect("/admin?section=staff");
}

export async function createStaffUserAction(formData: FormData) {
  await requireRole("admin");
  const email = formData.get("email") as string;
  const displayName = formData.get("display_name") as string;
  const role = formData.get("role") as string;
  const sendInvite = formData.get("send_invite") === "true";

  // Create the Neon Auth user immediately so staff don't need to self-register.
  // Falls back to null if the logged-in admin doesn't have Neon Auth admin role yet
  // (fix: Neon Console → Auth → Users → your account → ⋯ → "Make admin").
  const neonAuthUserId = await createNeonAuthUser(email, displayName);
  await createStaffUser({ neonAuthUserId, displayName, email, role });

  if (sendInvite) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://myrtlefordcommunitybus.com.au";
    const loginUrl = `${appUrl}/login`;
    await sendStaffInvite({
      to: email,
      name: displayName,
      loginUrl,
      authAccountExists: !!neonAuthUserId,
    }).catch(console.error);
  }

  redirect("/admin?section=staff");
}

export async function sendStaffInviteAction(formData: FormData) {
  await requireRole("admin");
  const userId = formData.get("userId") as string;
  if (!userId) return;
  const user = await getStaffUserById(userId);
  if (!user) return;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://myrtlefordcommunitybus.com.au";
  const loginUrl = `${appUrl}/login`;

  await sendStaffInvite({
    to: user.email as string,
    name: user.display_name as string,
    loginUrl,
    authAccountExists: !!user.neon_auth_user_id,
  });
  revalidatePath("/admin");
}
