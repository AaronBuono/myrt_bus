"use client";

import { useActionState, useState } from "react";
import { modifyBookingAction, type ActionState } from "@/app/actions/admin";
import TimeSelect from "@/components/booking/TimeSelect";

export default function ModifyDatesForm({ bookingId, startDate, endDate, pickupTime, returnTime, cancelHref }: {
  bookingId: string;
  startDate: string;
  endDate: string;
  pickupTime: string;
  returnTime: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(modifyBookingAction, null);
  const [pt, setPt] = useState(pickupTime);
  const [rt, setRt] = useState(returnTime);

  return (
    <form action={formAction} className="card space-y-4 border-brand-blue">
      <input type="hidden" name="bookingId" value={bookingId} />
      <div>
        <h3 className="text-base font-bold text-brand-blue">Change dates</h3>
        <p className="text-sm text-[#5E6470]">
          Creates a new reference and manage link; this booking is kept as cancelled so the old confirmation can be recognised.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="m-start" className="form-label">Pick-up date</label>
          <input id="m-start" type="date" name="startDate" defaultValue={startDate} required className="form-input" />
        </div>
        <div>
          <label htmlFor="m-pt" className="form-label">Pick-up time</label>
          <TimeSelect id="m-pt" name="pickupTime" value={pt} onChange={setPt} />
        </div>
        <div>
          <label htmlFor="m-end" className="form-label">Return date</label>
          <input id="m-end" type="date" name="endDate" defaultValue={endDate} required className="form-input" />
        </div>
        <div>
          <label htmlFor="m-rt" className="form-label">Return time</label>
          <TimeSelect id="m-rt" name="returnTime" value={rt} onChange={setRt} />
        </div>
      </div>
      <label className="checkbox-label">
        <input type="checkbox" name="notify" value="true" defaultChecked className="form-checkbox" />
        <span>Email the customer the new confirmation</span>
      </label>
      {/* Unticked checkboxes aren't submitted; this makes "don't notify" explicit. */}
      <input type="hidden" name="notify" value="false" />
      {state?.error && <p className="field-error">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary">{pending ? "Saving…" : "Save new dates"}</button>
        <a href={cancelHref} className="btn-secondary">Cancel</a>
      </div>
    </form>
  );
}
