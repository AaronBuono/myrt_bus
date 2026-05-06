"use client";

import { cancelBookingAction } from "@/app/actions/admin";
import { useTransition } from "react";

export default function CancelBookingBtn({ bookingId }: { bookingId: string }) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!confirm("Cancel this booking? This cannot be undone.")) return;
    const form = e.currentTarget;
    startTransition(() => {
      cancelBookingAction(new FormData(form));
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs text-red-600 hover:text-red-800 font-semibold border border-red-200 rounded-lg px-2.5 py-1 hover:border-red-400 transition-colors disabled:opacity-40"
      >
        {pending ? "Cancelling…" : "Cancel"}
      </button>
    </form>
  );
}
