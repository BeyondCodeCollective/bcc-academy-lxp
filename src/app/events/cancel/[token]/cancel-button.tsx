"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { cancelAttendee } from "./actions";

export function CancelButton({ token, attendeeName }: { token: string; attendeeName: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  if (state === "done") {
    return (
      <p className="mt-6 rounded-lg bg-paper-tint px-4 py-3 text-sm text-ink">
        {attendeeName}&apos;s ticket is cancelled.
      </p>
    );
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        disabled={state === "busy"}
        className={buttonClass("dark", "md")}
        onClick={async () => {
          setState("busy");
          setError(null);
          const res = await cancelAttendee(token);
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
            Canceling...
          </>
        ) : (
          "Cancel ticket"
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
