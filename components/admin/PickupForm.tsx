"use client";

import { useActionState } from "react";
import { recordPickupAction, type CounterState } from "@/app/actions/counter";

export default function PickupForm({ bookingId }: { bookingId: string }) {
  const [state, formAction, pending] = useActionState<CounterState, FormData>(recordPickupAction, null);

  if (state?.ok) {
    return <p className="counter-ok">✓ Pickup recorded</p>;
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <label className="counter-check">
        <input type="checkbox" name="licence_sighted" className="form-checkbox" />
        <span>I have seen the driver&apos;s licence and it matches the booking</span>
      </label>
      <div>
        <label htmlFor={`odo-out-${bookingId}`} className="field-label">Odometer out (km)</label>
        <input id={`odo-out-${bookingId}`} name="odometer_out" inputMode="numeric" pattern="[0-9 ,]*" autoComplete="off" className="form-input form-input-lg" />
      </div>
      <label className="counter-check">
        <input type="checkbox" name="key_handed_over" className="form-checkbox" />
        <span>Key handed over</span>
      </label>
      {state?.error && <p className="field-error" role="alert">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary btn-lg w-full">
        {pending ? "Saving…" : "Confirm pickup"}
      </button>
    </form>
  );
}
