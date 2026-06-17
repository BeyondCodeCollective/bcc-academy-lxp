"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteLandingPageAction } from "./actions";
import { buttonClass } from "@/components/ui";

export function DeleteLandingButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    const res = await deleteLandingPageAction(slug);
    if (res.success) {
      router.push("/dashboard/admin/landing");
      router.refresh();
    } else {
      setPending(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={buttonClass("ghost", "sm")}
      >
        Delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className={`${buttonClass("primary", "sm")} bg-red-600 hover:bg-red-700`}
      >
        {pending ? "Deleting…" : "Confirm delete"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className={buttonClass("ghost", "sm")}
      >
        Cancel
      </button>
    </div>
  );
}
