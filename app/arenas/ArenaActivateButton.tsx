"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  arenaId: "roman-colosseum";
  isActive: boolean;
};

export default function ArenaActivateButton({ arenaId, isActive }: Props) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function activateArena() {
    if (isActive || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/arena-preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          activeArena: arenaId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to activate Arena");
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      setIsSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={activateArena}
      disabled={isActive || isSaving}
      className={
        isActive
          ? "inline-flex min-h-11 cursor-default items-center justify-center rounded-md border border-amber-400/60 bg-amber-400/15 px-6 font-black uppercase tracking-wide text-amber-300"
          : "inline-flex min-h-11 items-center justify-center rounded-md border border-amber-400/60 bg-amber-400 px-6 font-black uppercase tracking-wide text-black transition hover:bg-amber-300 disabled:cursor-wait disabled:opacity-70"
      }
    >
      {isActive ? "Active Arena" : isSaving ? "Activating..." : "Set Active"}
    </button>
  );
}
