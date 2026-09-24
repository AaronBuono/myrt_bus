"use client";

import { useActionState } from "react";
import { resendConfirmationAction, type ActionState } from "@/app/actions/admin";

export default function ResendConfirmationBtn({ bookingId }: { bookingId: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(resendConfirmationAction, null);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="bookingId" value={bookingId} />
      <button type="submit" disabled={pending} className="btn-secondary text-sm disabled:opacity-40">
        {pending ? "Sending…" : "Resend confirmation"}
      </button>
      {state?.message && <span className="text-sm font-semibold text-green-700">{state.message}</span>}
      {state?.error && <span className="text-sm font-semibold text-red-700">{state.error}</span>}
    </form>
  );
}
