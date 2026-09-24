"use server";

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { requireRole, COUNTER_ROLES } from "@/lib/auth";
import { recordPickup, recordReturn } from "@/lib/queries/admin";

export type CounterState = { ok?: boolean; error?: string } | null;

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

function parseOdometer(v: FormDataEntryValue | null): number | null {
  const n = Number(String(v ?? "").replace(/[\s,]/g, ""));
  return Number.isInteger(n) && n >= 0 && n < 10_000_000 ? n : null;
}

function revalidateCounter() {
  revalidatePath("/admin");
  revalidatePath("/coordinator");
}

export async function recordPickupAction(_prev: CounterState, formData: FormData): Promise<CounterState> {
  const user = await requireRole(...COUNTER_ROLES);
  const bookingId = formData.get("bookingId") as string;
  const odometerOut = parseOdometer(formData.get("odometer_out"));
  const licenceSighted = formData.get("licence_sighted") === "on";
  const keyHandedOver = formData.get("key_handed_over") === "on";

  if (!bookingId) return { error: "Missing booking." };
  if (!licenceSighted) return { error: "Check the driver's licence before handing over the key." };
  if (odometerOut === null) return { error: "Enter the odometer reading (whole kilometres)." };
  if (!keyHandedOver) return { error: "Tick 'Key handed over' once the key is with the driver." };

  const ok = await recordPickup(bookingId, {
    userId: user.id, userLabel: user.displayName, odometerOut, licenceSighted, keyHandedOver,
  });
  if (!ok) return { error: "This booking can't be picked up. It may be cancelled or already out." };

  revalidateCounter();
  return { ok: true };
}

export async function recordReturnAction(_prev: CounterState, formData: FormData): Promise<CounterState> {
  const user = await requireRole(...COUNTER_ROLES);
  const bookingId = formData.get("bookingId") as string;
  const odometerIn = parseOdometer(formData.get("odometer_in"));
  const fuel = formData.get("fuel_full");
  const cleaned = formData.get("bus_cleaned");
  const damageNotes = ((formData.get("damage_notes") as string) || "").trim().slice(0, 2000) || null;
  const photo = formData.get("damage_photo");

  if (!bookingId) return { error: "Missing booking." };
  if (odometerIn === null) return { error: "Enter the odometer reading (whole kilometres)." };
  if (fuel !== "yes" && fuel !== "no") return { error: "Is the fuel tank full? Choose yes or no." };
  if (cleaned !== "yes" && cleaned !== "no") return { error: "Was the bus cleaned? Choose yes or no." };

  let damagePhotoUrl: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    if (!photo.type.startsWith("image/")) return { error: "The photo must be an image." };
    if (photo.size > MAX_PHOTO_BYTES) return { error: "That photo is too large. Try again; it should shrink automatically." };
    if (!process.env.BLOB_READ_WRITE_TOKEN) return { error: "Photo uploads aren't set up yet. Describe the damage in the notes instead." };
    try {
      const blob = await put(`damage/${bookingId}/${Date.now()}.jpg`, photo, {
        access: "public",
        addRandomSuffix: true,
        contentType: photo.type,
      });
      damagePhotoUrl = blob.url;
    } catch (err) {
      console.error("Damage photo upload failed:", err);
      return { error: "The photo didn't upload. Try again, or save without it and describe the damage in the notes." };
    }
  }

  const result = await recordReturn(bookingId, {
    userId: user.id,
    userLabel: user.displayName,
    odometerIn,
    fuelFull: fuel === "yes",
    busCleaned: cleaned === "yes",
    damageNotes,
    damagePhotoUrl,
  });
  if (result === "odometer") return { error: "The odometer reading is lower than when the bus went out. Check the number." };
  if (result === "not_out") return { error: "This booking isn't marked as picked up." };

  revalidateCounter();
  return { ok: true };
}
