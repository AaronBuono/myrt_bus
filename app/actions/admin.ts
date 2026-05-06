"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import {
  cancelBooking,
  updateZoneRate,
  updateAdditionalDayRate,
  publishNewConditions,
  updateSystemSettings,
  updateBankRecord,
  updateOpeningHour,
  upsertOrganisation,
  deleteOrganisation,
  setUserActive,
  updateStaffUser,
  createStaffUser,
} from "@/lib/queries/admin";

export async function cancelBookingAction(formData: FormData) {
  const user = await requireRole("lions_admin", "bus_coordinator");
  const id = formData.get("bookingId") as string;
  if (!id) return;
  await cancelBooking(id, user.id);
  revalidatePath("/admin");
  revalidatePath("/coordinator");
}

export async function updateZoneRateAction(formData: FormData) {
  const user = await requireRole("lions_admin");
  const zoneId = formData.get("zoneId") as string;
  const rate = parseFloat(formData.get("rate") as string);
  if (!zoneId || isNaN(rate) || rate < 0) return;
  await updateZoneRate(zoneId, rate, user.id);
  revalidatePath("/admin");
}

export async function updateAdditionalDayRateAction(formData: FormData) {
  await requireRole("lions_admin");
  const rate = parseFloat(formData.get("rate") as string);
  if (isNaN(rate) || rate < 0) return;
  await updateAdditionalDayRate(rate);
  revalidatePath("/admin");
}

export async function publishConditionsAction(formData: FormData) {
  const user = await requireRole("lions_admin");
  const content = (formData.get("content") as string)?.trim();
  if (!content) return;
  await publishNewConditions(content, user.id);
  revalidatePath("/admin");
}

export async function updateSystemSettingsAction(formData: FormData) {
  await requireRole("lions_admin");
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
  await requireRole("lions_admin");
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
  await requireRole("lions_admin");
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
  await requireRole("lions_admin");
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
  await requireRole("lions_admin");
  const id = formData.get("id") as string;
  if (!id) return;
  await deleteOrganisation(id);
  revalidatePath("/admin");
}

export async function toggleUserActiveAction(formData: FormData) {
  await requireRole("lions_admin");
  const userId = formData.get("userId") as string;
  const isActive = formData.get("isActive") === "true";
  if (!userId) return;
  await setUserActive(userId, isActive);
  revalidatePath("/admin");
}

export async function updateStaffUserAction(formData: FormData) {
  await requireRole("lions_admin");
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
  await requireRole("lions_admin");
  await createStaffUser({
    neonAuthUserId: (formData.get("neon_auth_user_id") as string) || null,
    displayName: formData.get("display_name") as string,
    email: formData.get("email") as string,
    role: formData.get("role") as string,
  });
  redirect("/admin?section=staff");
}
