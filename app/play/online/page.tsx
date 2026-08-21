"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type TimeControl = {
  id: string;
  label: string;
  description: string;
  category: "BULLET" | "BLITZ" | "RAPID";
  initialTimeSeconds: number;
  incrementSeconds: number;
};

type MatchmakingResponse = {
  success?: boolean;
  status?: "SEARCHING" | "MATCHED" | "CANCELLED";
  error?: string;
  game?: {
    id: string;
    status: string;
    result: string | null;
    timeControl: "BULLET" | "BLITZ" | "RAPID";
    rated: boolean;
    initialTimeSeconds: number;
    incrementSeconds: number;
    startedAt: string;
    endedAt: string | null;
    whitePlayer: {
      id: string;
      username: string;
    };
    blackPlayer: {
      id: string;
      username: string;
    };
  };
};

const timeControls: TimeControl[] = [
  {
    id: "1+0",
    label: "1+0",
    description: "Bullet",
    category: "BULLET",
    initialTimeSeconds: 60,
    incrementSeconds: 0,
  },
  {
    id: "2+1",
    label: "2+1",
    description: "Bullet",
    category: "BULLET",
    initialTimeSeconds: 120,
    incrementSeconds: 1,
  },
  {
    id: "3+0",
    label: "3+0",
    description: "Blitz",
    category: "BLITZ",
    initialTimeSeconds: 180,
    incrementSeconds: 0,
  },
  {
    id: "3+2",
    label: "3+2",
    description: "Blitz",
    category: "BLITZ",
    initialTimeSeconds: 180,
    incrementSeconds: 2,
  },
  {
    id: "5+0",
    label: "5+0",
    description: "Blitz",
    category: "BLITZ",
    initialTimeSeconds: 300,
    incrementSeconds: 0,
  },
  {
    id: "5+3",
    label: "5+3",
    description: "Blitz",
    category: "BLITZ",
    initialTimeSeconds: 300,
    incrementSeconds: 3,
  },
  {
    id: "10+0",
    label: "10+0",
    description: "Rapid",
    category: "RAPID",
    initialTimeSeconds: 600,
    incrementSeconds: 0,
  },
  {
    id: "15+10",
    label: "15+10",
    description: "Rapid",
    category: "RAPID",
    initialTimeSeconds: 900,
    incrementSeconds: 10,
  },
  {
    id: "30+0",
    label: "30+0",
    description: "Rapid",
    category: "RAPID",
    initialTimeSeconds: 1800,
    incrementSeconds: 0,
  },
];

export default function OnlineArenaPage() {
  const router = useRouter();

  const [selectedTimeControl, setSelectedTimeControl] =
    useState<TimeControl>(timeControls[6]);

  const [rated, setRated] = useState(true);

  const [matchmakingStatus, setMatchmakingStatus] = useState<
    "IDLE" | "SEARCHING" | "MATCHED"
  >("IDLE");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [matchedGame, setMatchedGame] =
    useState<MatchmakingResponse["game"]>(undefined);

  useEffect(() => {
    if (matchmakingStatus !== "SEARCHING") {
      return;
    }

    let cancelled = false;

    const checkMatchmakingStatus = async () => {
      try {
        const response = await fetch("/api/matchmaking", {
          method: "GET",
          cache: "no-store",
        });

        const data = (await response.json()) as MatchmakingResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          return;
        }

        if (data.status === "MATCHED" && data.game) {
          setMatchedGame(data.game);
          setMatchmakingStatus("MATCHED");
          setErrorMessage("");
          router.push(`/play/online/game/${data.game.id}`);
        }
      } catch (error) {
        console.error("MATCHMAKING STATUS ERROR:", error);
      }
    };

    void checkMatchmakingStatus();

    const intervalId = window.setInterval(() => {
      void checkMatchmakingStatus();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [matchmakingStatus, router]);

  const handleFindOpponent = async () => {
    if (isLoading || matchmakingStatus === "SEARCHING") {
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setMatchedGame(undefined);

    try {
      const response = await fetch("/api/matchmaking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeControl: selectedTimeControl.category,
          initialTimeSeconds: selectedTimeControl.initialTimeSeconds,
          incrementSeconds: selectedTimeControl.incrementSeconds,
          rated,
        }),
      });

      const data = (await response.json()) as MatchmakingResponse;

      if (!response.ok) {
        setErrorMessage(data.error || "Unable to start matchmaking.");
        setMatchmakingStatus("IDLE");
        return;
      }

      if (data.status === "MATCHED" && data.game) {
        setMatchedGame(data.game);
        setMatchmakingStatus("MATCHED");
        router.push(`/play/online/game/${data.game.id}`);
        return;
      }

      if (data.status === "SEARCHING") {
        setMatchmakingStatus("SEARCHING");
        return;
      }

      setErrorMessage("Unexpected matchmaking response.");
      setMatchmakingStatus("IDLE");
    } catch (error) {
      console.error("MATCHMAKING ERROR:", error);
      setErrorMessage("Could not connect to matchmaking.");
      setMatchmakingStatus("IDLE");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSearch = async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/matchmaking", {
        method: "DELETE",
      });

      const data = (await response.json()) as MatchmakingResponse;

      if (!response.ok) {
        setErrorMessage(data.error || "Unable to cancel matchmaking.");
        return;
      }

      setMatchmakingStatus("IDLE");
      setMatchedGame(undefined);
    } catch (error) {
      console.error("CANCEL MATCHMAKING ERROR:", error);
      setErrorMessage("Could not cancel matchmaking.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeControlChange = (control: TimeControl) => {
    if (matchmakingStatus !== "IDLE" || isLoading) {
      return;
    }

    setSelectedTimeControl(control);
  };

  const handleRatedChange = (value: boolean) => {
    if (matchmakingStatus !== "IDLE" || isLoading) {
      return;
    }

    setRated(value);
  };

  const isSearching = matchmakingStatus === "SEARCHING";
  const isMatched = matchmakingStatus === "MATCHED";
  const selectionLocked = isSearching || isMatched || isLoading;

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #172554 0%, #0f172a 45%, #020617 100%)",
        color: "#f8fafc",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <header
          style={{
            textAlign: "center",
            marginBottom: "36px",
          }}
        >
          <div
            style={{
              fontSize: "52px",
              marginBottom: "8px",
            }}
          >
            🌐
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "42px",
              fontWeight: 900,
              color: "#facc15",
            }}
          >
            Online Arena
          </h1>

          <p
            style={{
              marginTop: "10px",
              marginBottom: 0,
              color: "#94a3b8",
              fontSize: "17px",
            }}
          >
            Challenge real players and climb the Chess Arena rankings.
          </p>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 340px",
            gap: "24px",
            alignItems: "start",
          }}
        >
          {/* LEFT SIDE */}
          <section
            style={{
              background:
                "linear-gradient(145deg, rgba(30, 64, 175, 0.34), rgba(15, 23, 42, 0.92))",
              border: "1px solid rgba(96, 165, 250, 0.35)",
              borderRadius: "22px",
              padding: "26px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.35)",
            }}
          >
            <div
              style={{
                marginBottom: "26px",
              }}
            >
              <h2
                style={{
                  margin: "0 0 6px 0",
                  fontSize: "25px",
                }}
              >
                ♟️ Find an Opponent
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#94a3b8",
                  lineHeight: 1.6,
                }}
              >
                Choose your preferred time control and game type.
              </p>
            </div>

            {/* TIME CONTROLS */}
            <div>
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: "14px",
                  color: "#e2e8f0",
                  fontSize: "16px",
                }}
              >
                ⏱️ Time Control
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: "12px",
                }}
              >
                {timeControls.map((control) => {
                  const selected =
                    selectedTimeControl.id === control.id;

                  return (
                    <button
                      key={control.id}
                      type="button"
                      disabled={selectionLocked}
                      onClick={() => handleTimeControlChange(control)}
                      style={{
                        border: selected
                          ? "2px solid #facc15"
                          : "1px solid rgba(148, 163, 184, 0.25)",
                        borderRadius: "14px",
                        padding: "16px 10px",
                        cursor: selectionLocked
                          ? "not-allowed"
                          : "pointer",
                        background: selected
                          ? "linear-gradient(145deg, #ca8a04, #eab308)"
                          : "rgba(15, 23, 42, 0.78)",
                        color: selected ? "#111827" : "#f8fafc",
                        transition: "all 0.2s ease",
                        minHeight: "84px",
                        opacity: selectionLocked ? 0.75 : 1,
                      }}
                    >
                      <div
                        style={{
                          fontSize: "21px",
                          fontWeight: 900,
                        }}
                      >
                        {control.label}
                      </div>

                      <div
                        style={{
                          marginTop: "5px",
                          fontSize: "13px",
                          fontWeight: 700,
                          opacity: selected ? 0.8 : 0.65,
                        }}
                      >
                        {control.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* GAME TYPE */}
            <div
              style={{
                marginTop: "28px",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: "14px",
                  color: "#e2e8f0",
                  fontSize: "16px",
                }}
              >
                🏆 Game Type
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <button
                  type="button"
                  disabled={selectionLocked}
                  onClick={() => handleRatedChange(true)}
                  style={{
                    border: rated
                      ? "2px solid #facc15"
                      : "1px solid rgba(148, 163, 184, 0.25)",
                    borderRadius: "14px",
                    padding: "18px",
                    cursor: selectionLocked
                      ? "not-allowed"
                      : "pointer",
                    background: rated
                      ? "rgba(234, 179, 8, 0.16)"
                      : "rgba(15, 23, 42, 0.78)",
                    color: "#f8fafc",
                    textAlign: "left",
                    opacity: selectionLocked ? 0.75 : 1,
                  }}
                >
                  <div
                    style={{
                      fontSize: "17px",
                      fontWeight: 800,
                      color: rated ? "#facc15" : "#f8fafc",
                    }}
                  >
                    ⭐ Rated
                  </div>

                  <div
                    style={{
                      marginTop: "6px",
                      color: "#94a3b8",
                      fontSize: "13px",
                      lineHeight: 1.5,
                    }}
                  >
                    Your online rating will change after the game.
                  </div>
                </button>

                <button
                  type="button"
                  disabled={selectionLocked}
                  onClick={() => handleRatedChange(false)}
                  style={{
                    border: !rated
                      ? "2px solid #38bdf8"
                      : "1px solid rgba(148, 163, 184, 0.25)",
                    borderRadius: "14px",
                    padding: "18px",
                    cursor: selectionLocked
                      ? "not-allowed"
                      : "pointer",
                    background: !rated
                      ? "rgba(14, 165, 233, 0.16)"
                      : "rgba(15, 23, 42, 0.78)",
                    color: "#f8fafc",
                    textAlign: "left",
                    opacity: selectionLocked ? 0.75 : 1,
                  }}
                >
                  <div
                    style={{
                      fontSize: "17px",
                      fontWeight: 800,
                      color: !rated ? "#38bdf8" : "#f8fafc",
                    }}
                  >
                    🎮 Casual
                  </div>

                  <div
                    style={{
                      marginTop: "6px",
                      color: "#94a3b8",
                      fontSize: "13px",
                      lineHeight: 1.5,
                    }}
                  >
                    Play without affecting your online rating.
                  </div>
                </button>
              </div>
            </div>

            {/* MATCHMAKING BUTTON */}
            <div
              style={{
                marginTop: "30px",
              }}
            >
              {!isSearching && !isMatched && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleFindOpponent}
                  style={{
                    width: "100%",
                    border: "1px solid rgba(250, 204, 21, 0.55)",
                    borderRadius: "14px",
                    padding: "18px",
                    background:
                      "linear-gradient(90deg, #ca8a04, #facc15)",
                    color: "#111827",
                    fontWeight: 900,
                    fontSize: "18px",
                    cursor: isLoading ? "wait" : "pointer",
                    opacity: isLoading ? 0.75 : 1,
                  }}
                >
                  {isLoading
                    ? "⏳ Joining Matchmaking..."
                    : "🔍 Find Opponent"}
                </button>
              )}

              {isSearching && (
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleCancelSearch}
                  style={{
                    width: "100%",
                    border: "1px solid rgba(248, 113, 113, 0.5)",
                    borderRadius: "14px",
                    padding: "18px",
                    background:
                      "linear-gradient(90deg, rgba(153, 27, 27, 0.9), rgba(220, 38, 38, 0.9))",
                    color: "#f8fafc",
                    fontWeight: 900,
                    fontSize: "18px",
                    cursor: isLoading ? "wait" : "pointer",
                    opacity: isLoading ? 0.75 : 1,
                  }}
                >
                  {isLoading
                    ? "⏳ Cancelling..."
                    : "✖ Cancel Search"}
                </button>
              )}

              {isMatched && (
                <div
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid rgba(74, 222, 128, 0.45)",
                    borderRadius: "14px",
                    padding: "18px",
                    background: "rgba(22, 101, 52, 0.2)",
                    color: "#86efac",
                    fontWeight: 900,
                    fontSize: "18px",
                    textAlign: "center",
                  }}
                >
                  ⚔️ Opponent Found!
                </div>
              )}

              {errorMessage && (
                <p
                  style={{
                    textAlign: "center",
                    color: "#fca5a5",
                    fontSize: "13px",
                    marginBottom: 0,
                    marginTop: "12px",
                    fontWeight: 700,
                  }}
                >
                  {errorMessage}
                </p>
              )}

              {!errorMessage && matchmakingStatus === "IDLE" && (
                <p
                  style={{
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: "12px",
                    marginBottom: 0,
                    marginTop: "10px",
                  }}
                >
                  Choose your settings and enter the matchmaking queue.
                </p>
              )}

              {isSearching && (
                <p
                  style={{
                    textAlign: "center",
                    color: "#93c5fd",
                    fontSize: "13px",
                    marginBottom: 0,
                    marginTop: "12px",
                    fontWeight: 700,
                  }}
                >
                  Searching for an opponent with the same game settings...
                </p>
              )}
            </div>
          </section>

          {/* RIGHT SIDE */}
          <aside
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            {/* CURRENT SELECTION */}
            <div
              style={{
                background: "rgba(15, 23, 42, 0.88)",
                border: "1px solid rgba(96, 165, 250, 0.25)",
                borderRadius: "18px",
                padding: "22px",
                boxShadow: "0 15px 45px rgba(0, 0, 0, 0.28)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 18px 0",
                  color: "#facc15",
                  fontSize: "18px",
                }}
              >
                ⚔️ Your Game
              </h3>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginBottom: "14px",
                }}
              >
                <span style={{ color: "#94a3b8" }}>Time</span>

                <strong>{selectedTimeControl.label}</strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  marginBottom: "14px",
                }}
              >
                <span style={{ color: "#94a3b8" }}>Category</span>

                <strong>
                  {selectedTimeControl.description}
                </strong>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <span style={{ color: "#94a3b8" }}>Mode</span>

                <strong
                  style={{
                    color: rated ? "#facc15" : "#38bdf8",
                  }}
                >
                  {rated ? "Rated" : "Casual"}
                </strong>
              </div>
            </div>

            {/* STATUS */}
            <div
              style={{
                background:
                  "linear-gradient(145deg, rgba(30, 64, 175, 0.2), rgba(15, 23, 42, 0.9))",
                border: isMatched
                  ? "1px solid rgba(74, 222, 128, 0.4)"
                  : isSearching
                    ? "1px solid rgba(250, 204, 21, 0.35)"
                    : "1px solid rgba(96, 165, 250, 0.2)",
                borderRadius: "18px",
                padding: "22px",
              }}
            >
              <h3
                style={{
                  margin: "0 0 10px 0",
                  fontSize: "17px",
                  color: isMatched
                    ? "#86efac"
                    : isSearching
                      ? "#facc15"
                      : "#f8fafc",
                }}
              >
                {isMatched
                  ? "⚔️ Match Found"
                  : isSearching
                    ? "🔎 Searching..."
                    : "🌐 Online Matchmaking"}
              </h3>

              {matchmakingStatus === "IDLE" && (
                <p
                  style={{
                    margin: 0,
                    color: "#94a3b8",
                    fontSize: "14px",
                    lineHeight: 1.6,
                  }}
                >
                  Select your preferred game settings and press Find
                  Opponent to enter the Chess Arena matchmaking queue.
                </p>
              )}

              {isSearching && (
                <p
                  style={{
                    margin: 0,
                    color: "#cbd5e1",
                    fontSize: "14px",
                    lineHeight: 1.6,
                  }}
                >
                  You are now in the matchmaking queue. Chess Arena is
                  looking for another player with the same time control
                  and game type.
                </p>
              )}

              {isMatched && matchedGame && (
                <div>
                  <p
                    style={{
                      margin: "0 0 14px 0",
                      color: "#86efac",
                      fontSize: "14px",
                      lineHeight: 1.6,
                      fontWeight: 700,
                    }}
                  >
                    An opponent has been found and your online game has
                    been created.
                  </p>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "9px",
                      fontSize: "14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                      }}
                    >
                      <span style={{ color: "#94a3b8" }}>
                        White
                      </span>

                      <strong>
                        {matchedGame.whitePlayer.username}
                      </strong>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                      }}
                    >
                      <span style={{ color: "#94a3b8" }}>
                        Black
                      </span>

                      <strong>
                        {matchedGame.blackPlayer.username}
                      </strong>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                      }}
                    >
                      <span style={{ color: "#94a3b8" }}>
                        Game ID
                      </span>

                      <strong
                        style={{
                          maxWidth: "180px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={matchedGame.id}
                      >
                        {matchedGame.id}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* BACK */}
            <Link
              href="/play"
              style={{
                display: "block",
                textAlign: "center",
                textDecoration: "none",
                background: "rgba(30, 41, 59, 0.9)",
                border: "1px solid rgba(148, 163, 184, 0.25)",
                borderRadius: "13px",
                padding: "14px",
                color: "#e2e8f0",
                fontWeight: 700,
                pointerEvents: selectionLocked ? "none" : "auto",
                opacity: selectionLocked ? 0.55 : 1,
              }}
            >
              ← Back to Play
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}