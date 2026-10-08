"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { confirmSeat } from "./actions";

export function ConfirmButton({ token, attendeeName }: { token: string; attendeeName: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  if (state === "done") {
    return (
      <p className="mt-6 rounded-lg bg-paper-tint px-4 py-3 text-sm text-ink">
        {attendeeName}&apos;s seat is confirmed. A confirmation with the ticket is on its way.
      </p>
    );
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        disabled={state === "busy"}
        className={buttonClass("primary", "md")}
        onClick={async () => {
          setState("busy");
          setError(null);
          const res = await confirmSeat(token);
          if (res.ok) setState("done");
          else {
            setError(res.error);
            setState("idle");
          }
        }}
      >
        {state === "busy" ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Confirming...
          </>
        ) : (
          <>
            <Check size={16} />
            Confirm seat
          </>
        )}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
