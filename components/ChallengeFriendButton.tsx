"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ChallengeFriendButtonProps = {
  currentUserId: string;
  friendUserId: string;
  username: string;
};

type TimeControlOption = {
  label: string;
  description: string;
  initialSeconds: number;
  incrementSeconds: number;
};

const TIME_CONTROLS: TimeControlOption[] = [
  {
    label: "1+0",
    description: "Bullet",
    initialSeconds: 60,
    incrementSeconds: 0,
  },
  {
    label: "3+0",
    description: "Blitz",
    initialSeconds: 180,
    incrementSeconds: 0,
  },
  {
    label: "3+2",
    description: "Blitz",
    initialSeconds: 180,
    incrementSeconds: 2,
  },
  {
    label: "5+0",
    description: "Blitz",
    initialSeconds: 300,
    incrementSeconds: 0,
  },
  {
    label: "10+0",
    description: "Rapid",
    initialSeconds: 600,
    incrementSeconds: 0,
  },
  {
    label: "15+10",
    description: "Rapid",
    initialSeconds: 900,
    incrementSeconds: 10,
  },
];

export default function ChallengeFriendButton({
  currentUserId,
  friendUserId,
  username,
}: ChallengeFriendButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTimeControl, setSelectedTimeControl] =
    useState<TimeControlOption>(TIME_CONTROLS[3]);
  const [isRated, setIsRated] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [challengeStatus, setChallengeStatus] = useState<"IDLE" | "PENDING" | "DECLINED" | "ACCEPTED">("IDLE");

  useEffect(() => {
    const channel = supabase
      .channel(`friends:${currentUserId}`)
      .on("broadcast", { event: "friends-updated" }, ({ payload }) => {
        const update = payload as {
          kind?: string;
          challengeId?: string;
          status?: string;
          gameId?: string;
        };

        if (
          update.kind !== "game-challenge" ||
          update.challengeId !== challengeId
        ) {
          return;
        }

        if (update.status === "DECLINED") {
          setSuccess(false);
          setChallengeStatus("DECLINED");
          return;
        }

        if (update.status === "ACCEPTED" && update.gameId) {
          setSuccess(false);
          setChallengeStatus("ACCEPTED");
          router.push(`/play/online/game/${update.gameId}`);
        }
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [challengeId, currentUserId, router]);

  function closeModal() {
    setIsOpen(false);
  }

  async function handleSendChallenge() {
    if (isSending) return;

    setIsSending(true);
    setError(null);
    setSuccess(false);
    setChallengeStatus("IDLE");

    try {
      const response = await fetch("/api/friends/challenge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          challengedId: friendUserId,
          timeControl: selectedTimeControl.description.toUpperCase(),
          initialTimeSeconds: selectedTimeControl.initialSeconds,
          incrementSeconds: selectedTimeControl.incrementSeconds,
          rated: isRated,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        message?: string;
        challenge?: { id?: string };
      };

      if (!response.ok) {
        setError(data.error ?? "Could not send challenge.");
        return;
      }

      const createdChallengeId = data.challenge?.id;
      if (!createdChallengeId) {
        setError("Challenge was created, but its ID was not returned.");
        return;
      }

      setChallengeId(createdChallengeId);
      setChallengeStatus("PENDING");
      setSuccess(true);

      const channel = supabase.channel(`friends:${friendUserId}`);
      await new Promise<void>((resolve, reject) => {
        channel.subscribe((status, channelError) => {
          if (status === "SUBSCRIBED") resolve();
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            reject(channelError ?? new Error("Could not connect to Challenge Realtime."));
          }
        });
      });

      try {
        await channel.send({
          type: "broadcast",
          event: "friends-updated",
          payload: { kind: "game-challenge", challengeId: createdChallengeId, status: "PENDING" },
        });
      } finally {
        await supabase.removeChannel(channel);
      }
    } catch {
      setError("Could not send challenge. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setSuccess(false);
          setChallengeId(null);
          setChallengeStatus("IDLE");
          setIsOpen(true);
        }}
        className="inline-flex items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-amber-300 transition hover:border-amber-300/55 hover:bg-amber-400/15"
      >
        Challenge
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="challenge-friend-title"
            className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl border border-amber-400/25 bg-[#080d15] shadow-[0_28px_90px_rgba(0,0,0,0.7)] sm:max-h-[calc(100dvh-2rem)]"
          >
            <div className="shrink-0 border-b border-slate-800 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.13),transparent_42%)] px-4 py-3 sm:px-6 sm:py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">
                    Chess Arena Challenge
                  </p>
                  <h2
                    id="challenge-friend-title"
                    className="mt-1 text-2xl font-black text-white"
                  >
                    Challenge {username}
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Choose the time control for your game.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Close challenge dialog"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/70 text-lg font-bold text-slate-400 transition hover:border-slate-600 hover:text-white"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="challenge-modal-scroll min-h-0 overflow-y-auto p-4 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Time Control
              </p>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {TIME_CONTROLS.map((option) => {
                  const isSelected =
                    selectedTimeControl.label === option.label;

                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => setSelectedTimeControl(option)}
                      className={`rounded-xl border px-4 py-4 text-left transition ${
                        isSelected
                          ? "border-amber-400/60 bg-amber-400/12 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.12)]"
                          : "border-slate-800 bg-slate-950/55 hover:border-slate-700 hover:bg-slate-900/70"
                      }`}
                    >
                      <span
                        className={`block text-xl font-black ${
                          isSelected ? "text-amber-300" : "text-slate-100"
                        }`}
                      >
                        {option.label}
                      </span>
                      <span className="mt-1 block text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                        {option.description}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  Game Type
                </p>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRated(true)}
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      isRated
                        ? "border-amber-400/60 bg-amber-400/12 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.12)]"
                        : "border-slate-800 bg-slate-950/55 hover:border-slate-700 hover:bg-slate-900/70"
                    }`}
                  >
                    <span
                      className={`block font-black ${
                        isRated ? "text-amber-300" : "text-slate-100"
                      }`}
                    >
                      Rated
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      Rating changes
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRated(false)}
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      !isRated
                        ? "border-amber-400/60 bg-amber-400/12 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.12)]"
                        : "border-slate-800 bg-slate-950/55 hover:border-slate-700 hover:bg-slate-900/70"
                    }`}
                  >
                    <span
                      className={`block font-black ${
                        !isRated ? "text-amber-300" : "text-slate-100"
                      }`}
                    >
                      Casual
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      No rating change
                    </span>
                  </button>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/45 px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                    Selected
                  </span>
                  <span className="text-right font-black text-amber-300">
                    {selectedTimeControl.label} ·{" "}
                    {selectedTimeControl.description} ·{" "}
                    {isRated ? "Rated" : "Casual"}
                  </span>
                </div>
              </div>

              {error ? (
                <div className="mt-5 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300">
                  Challenge sent to {username}.
                </div>
              ) : null}

              {challengeStatus === "DECLINED" ? (
                <div className="mt-5 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
                  Challenge declined by {username}.
                </div>
              ) : null}

              {challengeStatus === "ACCEPTED" ? (
                <div className="mt-5 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300">
                  Challenge accepted by {username}. Opening game...
                </div>
              ) : null}


              <style jsx>{`
                .challenge-modal-scroll {
                  scrollbar-width: thin;
                  scrollbar-color: transparent transparent;
                }

                .challenge-modal-scroll:hover {
                  scrollbar-color: rgba(245, 158, 11, 0.45)
                    rgba(15, 23, 42, 0.32);
                }

                .challenge-modal-scroll::-webkit-scrollbar {
                  width: 7px;
                }

                .challenge-modal-scroll::-webkit-scrollbar-track {
                  background: transparent;
                }

                .challenge-modal-scroll::-webkit-scrollbar-thumb {
                  border: 2px solid transparent;
                  border-radius: 999px;
                  background: transparent;
                  background-clip: padding-box;
                  transition: background 160ms ease;
                }

                .challenge-modal-scroll:hover::-webkit-scrollbar-track {
                  background: rgba(15, 23, 42, 0.32);
                }

                .challenge-modal-scroll:hover::-webkit-scrollbar-thumb {
                  background: rgba(245, 158, 11, 0.45);
                  background-clip: padding-box;
                }

                .challenge-modal-scroll:hover::-webkit-scrollbar-thumb:hover {
                  background: rgba(251, 191, 36, 0.72);
                  background-clip: padding-box;
                }
              `}</style>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-black text-slate-300 transition hover:border-slate-600 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSendChallenge}
                  disabled={isSending || success || challengeStatus === "DECLINED" || challengeStatus === "ACCEPTED"}
                  className="rounded-xl border border-amber-400/35 bg-amber-400/12 px-5 py-3 text-sm font-black text-amber-300 transition hover:border-amber-300/60 hover:bg-amber-400/18 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {isSending
                    ? "Sending..."
                    : success
                      ? "Challenge Sent"
                      : challengeStatus === "DECLINED"
                        ? "Declined"
                        : challengeStatus === "ACCEPTED"
                          ? "Accepted"
                          : "Send Challenge"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
