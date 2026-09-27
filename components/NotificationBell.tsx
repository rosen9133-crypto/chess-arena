"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ChallengeNotification = {
  id: string;
  timeControl: string;
  initialTimeSeconds: number;
  incrementSeconds: number;
  rated: boolean;
  createdAt: string;
  challenger: {
    id: string;
    username: string;
    avatarUrl: string | null;
    bulletRating: number;
    blitzRating: number;
    rapidRating: number;
  };
};

type NotificationsResponse = {
  gameChallenge?: ChallengeNotification | null;
  error?: string;
};

function getTimeControlLabel(
  initialTimeSeconds: number,
  incrementSeconds: number,
) {
  const initialMinutes = Math.floor(initialTimeSeconds / 60);

  return `${initialMinutes}+${incrementSeconds}`;
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [challenge, setChallenge] =
    useState<ChallengeNotification | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [panelPosition, setPanelPosition] = useState<{
    left: number;
    bottom: number;
    width: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await fetch("/api/notifications", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        if (response.status !== 401) {
          console.error(
            "Unable to load notification bell:",
            response.status,
          );
        }

        return;
      }

      const data =
        (await response.json()) as NotificationsResponse;

      setChallenge(data.gameChallenge ?? null);
    } catch (error) {
      console.error(
        "Notification bell load error:",
        error,
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();

    function handleNotificationsUpdated() {
      void loadNotifications();
    }

    window.addEventListener(
      "chess-arena:notifications-updated",
      handleNotificationsUpdated,
    );

    function handleWindowFocus() {
      void loadNotifications();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void loadNotifications();
      }
    }

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      window.removeEventListener(
        "chess-arena:notifications-updated",
        handleNotificationsUpdated,
      );

      window.removeEventListener(
        "focus",
        handleWindowFocus,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;

      if (
        target instanceof Node &&
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown,
    );

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown,
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPanelPosition(null);
      return;
    }

    function updatePanelPosition() {
      const container = containerRef.current;

      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();

      const viewportPadding = Math.max(
        8,
        Math.min(16, window.innerWidth * 0.012),
      );
      const preferredWidth = 320;
      const availableWidth = window.innerWidth - viewportPadding * 2;
      const panelWidth = Math.min(preferredWidth, availableWidth);

      const sidebarLeft = Math.max(
        viewportPadding,
        rect.left - Math.max(0, 224 - rect.width),
      );

      const preferredLeft =
        window.innerWidth >= 1280
          ? sidebarLeft
          : Math.max(
              viewportPadding,
              Math.min(
                rect.right - panelWidth,
                window.innerWidth - panelWidth - viewportPadding,
              ),
            );

      setPanelPosition({
        left: Math.min(
          preferredLeft,
          window.innerWidth - panelWidth - viewportPadding,
        ),
        bottom: Math.max(
          viewportPadding,
          window.innerHeight - rect.top + 10,
        ),
        width: panelWidth,
      });
    }

    updatePanelPosition();

    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);

    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [isOpen]);

  const notificationCount = challenge ? 1 : 0;

  return (
    <div
      ref={containerRef}
      className="relative ml-auto shrink-0"
    >
      <button
        type="button"
        onClick={() => {
          setIsOpen((current) => !current);
        }}
        aria-label="Notifications"
        aria-expanded={isOpen}
        className="relative flex h-[clamp(2rem,3.7vh,2.25rem)] w-[clamp(2rem,3.7vh,2.25rem)] items-center justify-center rounded-lg border border-amber-400/30 bg-slate-950/60 text-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.06)] transition hover:border-amber-400/55 hover:bg-amber-400/10 hover:text-amber-300 hover:shadow-[0_0_18px_rgba(251,191,36,0.12)]"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-[clamp(16px,1.8vh,18px)] w-[clamp(16px,1.8vh,18px)]"
          fill="currentColor"
        >
          <path d="M12 22a2.35 2.35 0 0 0 2.25-1.67h-4.5A2.35 2.35 0 0 0 12 22Zm7-6.5V10a7 7 0 0 0-5.25-6.78V2.5a1.75 1.75 0 0 0-3.5 0v.72A7 7 0 0 0 5 10v5.5l-2 2V19h18v-1.5l-2-2Z" />
        </svg>

        {notificationCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-[#080d15] bg-amber-400 px-1 text-[9px] font-black leading-none text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.35)]">
            {notificationCount}
          </span>
        ) : null}
      </button>

      {isOpen && panelPosition && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed z-[9999] overflow-hidden rounded-2xl border border-amber-400/25 bg-[#080d15]/98 shadow-[0_24px_80px_rgba(0,0,0,0.7),0_0_35px_rgba(245,158,11,0.07)] backdrop-blur-xl"
              style={{
                left: panelPosition.left,
                bottom: panelPosition.bottom,
                width: panelPosition.width,
              }}
            >
          <div className="h-[2px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />

          <div className="border-b border-slate-800/80 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-400">
                  Notifications
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Your Chess Arena activity
                </p>
              </div>

              {notificationCount > 0 ? (
                <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-300">
                  {notificationCount} New
                </span>
              ) : null}
            </div>
          </div>

          <div className="max-h-[340px] overflow-y-auto">
            {isLoading && !challenge ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs font-semibold text-slate-500">
                  Loading notifications...
                </p>
              </div>
            ) : challenge ? (
              <div className="p-3">
                <div className="rounded-xl border border-amber-400/20 bg-gradient-to-br from-amber-400/[0.08] via-slate-950/40 to-slate-950/70 p-3">
                  <div className="flex items-center gap-3">
                    {challenge.challenger.avatarUrl ? (
                      <img
                        src={challenge.challenger.avatarUrl}
                        alt={`${challenge.challenger.username} avatar`}
                        className="h-10 w-10 shrink-0 rounded-lg border border-amber-400/25 object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-400/10 text-sm font-black text-amber-300">
                        {challenge.challenger.username
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-white">
                        {challenge.challenger.username}
                      </p>

                      <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                        Game Challenge
                      </p>
                    </div>

                    <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.7)]" />
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-300">
                      {getTimeControlLabel(
                        challenge.initialTimeSeconds,
                        challenge.incrementSeconds,
                      )}{" "}
                      · {challenge.timeControl}
                    </span>

                    <span className="rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-amber-300">
                      {challenge.rated
                        ? "Rated"
                        : "Casual"}
                    </span>
                  </div>

                  <p className="mt-3 text-[11px] leading-4 text-slate-500">
                    Open the live challenge popup to
                    accept or decline this game.
                  </p>
                </div>
              </div>
            ) : (
              <div className="px-5 py-7 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-amber-400/20 bg-amber-400/[0.06] text-amber-400/70">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-5 w-5"
                    fill="currentColor"
                  >
                    <path d="M12 22a2.35 2.35 0 0 0 2.25-1.67h-4.5A2.35 2.35 0 0 0 12 22Zm7-6.5V10a7 7 0 0 0-5.25-6.78V2.5a1.75 1.75 0 0 0-3.5 0v.72A7 7 0 0 0 5 10v5.5l-2 2V19h18v-1.5l-2-2Z" />
                  </svg>
                </div>

                <p className="mt-3 text-sm font-bold text-slate-300">
                  No notifications
                </p>

                <p className="mt-1 text-[11px] leading-4 text-slate-600">
                  New challenges and activity will
                  appear here.
                </p>
              </div>
            )}
          </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
