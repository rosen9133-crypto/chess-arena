"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

type FriendsRealtimeSyncProps = {
  userId: string;
};

export default function FriendsRealtimeSync({
  userId,
}: FriendsRealtimeSyncProps) {
  const router = useRouter();

  useEffect(() => {
    let hasSubscribedOnce = false;

    const channel = supabase
      .channel(`friends:${userId}`)
      .on("broadcast", { event: "friends-updated" }, () => {
        router.refresh();
      })
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") {
          return;
        }

        if (hasSubscribedOnce) {
          router.refresh();
          return;
        }

        hasSubscribedOnce = true;
      });

    function refreshAfterReturning() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }

    function refreshAfterReconnect() {
      router.refresh();
    }

    document.addEventListener("visibilitychange", refreshAfterReturning);
    window.addEventListener("online", refreshAfterReconnect);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        refreshAfterReturning,
      );
      window.removeEventListener("online", refreshAfterReconnect);

      void supabase.removeChannel(channel);
    };
  }, [router, userId]);

  return null;
}