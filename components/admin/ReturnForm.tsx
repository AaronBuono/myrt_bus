"use client";

import { useActionState, useState } from "react";
import { recordReturnAction, type CounterState } from "@/app/actions/counter";

const MAX_EDGE = 1600;

/** Shrinks a phone photo to a ~1600px JPEG so it fits comfortably under the upload limit. */
async function shrinkImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
    return blob ? new File([blob], "damage.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

function YesNo({ name, label, id }: { name: string; label: string; id: string }) {
  return (
    <fieldset>
      <legend className="field-label">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {["yes", "no"].map((v) => (
          <label key={v} className="counter-choice">
            <input type="radio" name={name} value={v} id={`${id}-${v}`} />
            <span>{v === "yes" ? "Yes" : "No"}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function ReturnForm({ bookingId }: { bookingId: string }) {
  const [state, formAction, pending] = useActionState<CounterState, FormData>(recordReturnAction, null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [shrinking, setShrinking] = useState(false);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) { setPhoto(null); setPreview(null); return; }
    setShrinking(true);
    const small = await shrinkImage(f);
    setPhoto(small);
    setPreview(URL.createObjectURL(small));
    setShrinking(false);
  }

  function submit(fd: FormData) {
    fd.delete("damage_photo_input");
    if (photo) fd.set("damage_photo", photo, photo.name);
    return formAction(fd);
  }

  if (state?.ok) {
    return <p className="counter-ok">✓ Return recorded</p>;
  }

  return (
    <form action={submit} className="space-y-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <div>
        <label htmlFor={`odo-in-${bookingId}`} className="field-label">Odometer in (km)</label>
        <input id={`odo-in-${bookingId}`} name="odometer_in" inputMode="numeric" pattern="[0-9 ,]*" autoComplete="off" className="form-input form-input-lg" />
      </div>
      <YesNo name="fuel_full" label="Fuel tank full?" id={`fuel-${bookingId}`} />
      <YesNo name="bus_cleaned" label="Bus cleaned?" id={`clean-${bookingId}`} />
      <div>
        <label htmlFor={`damage-${bookingId}`} className="field-label">Damage notes <span className="font-normal text-[#5E6470]">(if any)</span></label>
        <textarea id={`damage-${bookingId}`} name="damage_notes" rows={3} className="form-input form-input-lg resize-y" />
      </div>
      <div>
        <label htmlFor={`photo-${bookingId}`} className="field-label">Damage photo <span className="font-normal text-[#5E6470]">(optional)</span></label>
        <input id={`photo-${bookingId}`} name="damage_photo_input" type="file" accept="image/*" capture="environment" onChange={onPhoto} className="block w-full text-base" />
        {shrinking && <p className="field-hint mt-1">Preparing photo…</p>}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {preview && <img src={preview} alt="Damage photo preview" className="mt-2 max-h-48 rounded-lg border border-[#DDE1EA]" />}
      </div>
      {state?.error && <p className="field-error" role="alert">{state.error}</p>}
      <button type="submit" disabled={pending || shrinking} className="btn-primary btn-lg w-full">
        {pending ? "Saving…" : "Confirm return"}
      </button>
    </form>
  );
}
