import { Chess } from "chess.js";

type GameInfoProps = {
  game: Chess;
  hasGameStarted: boolean;
  isGameOver: boolean;
  finalScore: string;
  finalTitle: string;
};

export default function GameInfo({
  game,
  hasGameStarted,
  isGameOver,
  finalScore,
  finalTitle,
}: GameInfoProps) {
  const turn = game.turn();

  let status = hasGameStarted
    ? "Game in progress"
    : "Ready to play";
  let statusColor = hasGameStarted
    ? "text-green-400"
    : "text-sky-400";

  if (isGameOver) {
    if (game.isCheckmate()) {
      status = "♛ Checkmate";
      statusColor = "text-red-400";
    } else if (game.isDraw()) {
      status = "🤝 Draw";
      statusColor = "text-sky-400";
    } else {
      status = finalTitle || "Game finished";
      statusColor = "text-yellow-400";
    }
  } else if (hasGameStarted && game.inCheck()) {
    status = "⚠️ Check";
    statusColor = "text-yellow-400";
  }

  let winner = "—";

  if (isGameOver) {
    if (finalScore === "1–0") {
      winner = "⚪ White";
    } else if (finalScore === "0–1") {
      winner = "⚫ Black";
    } else if (finalScore === "½–½") {
      winner = "🤝 Draw";
    }
  }

  const result = isGameOver ? finalScore : "—";

  return (
    <div className="w-72 rounded-xl bg-slate-800 p-5 shadow-lg">
      <h2 className="mb-5 text-2xl font-bold text-yellow-400">
        🎮 Game Info
      </h2>

      <div className="space-y-4">
        <div>
          <p className="text-slate-400">
            {isGameOver
              ? "Winner"
              : hasGameStarted
              ? "Turn"
              : "Game"}
          </p>

          <p className="text-xl font-bold text-white">
            {isGameOver
              ? winner
              : !hasGameStarted
              ? "Set up your game"
              : turn === "w"
              ? "⚪ White"
              : "⚫ Black"}
          </p>
        </div>

        <hr className="border-slate-700" />

        <div>
          <p className="text-slate-400">Result</p>

          <p className="text-2xl font-extrabold text-yellow-400">
            {result}
          </p>
        </div>

        <hr className="border-slate-700" />

        <div>
          <p className="text-slate-400">Status</p>

          <p className={`font-semibold ${statusColor}`}>
            {status}
          </p>
        </div>
      </div>
    </div>
  );
}