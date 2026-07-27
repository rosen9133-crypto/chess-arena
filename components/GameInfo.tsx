import { Chess } from "chess.js";

type GameInfoProps = {
  game: Chess;
};

export default function GameInfo({
  game,
}: GameInfoProps) {
  const turn = game.turn();

  let status = "Game in progress";
  let statusColor = "text-green-400";

  if (game.isCheckmate()) {
    status = "♛ Checkmate";
    statusColor = "text-red-400";
  } else if (game.isDraw()) {
    status = "🤝 Draw";
    statusColor = "text-sky-400";
  } else if (game.inCheck()) {
    status = "⚠️ Check";
    statusColor = "text-yellow-400";
  }

  let winner = "—";
  let result = "—";

  if (game.isCheckmate()) {
    if (game.turn() === "w") {
      winner = "⚫ Black";
      result = "0–1";
    } else {
      winner = "⚪ White";
      result = "1–0";
    }
  } else if (game.isDraw()) {
    winner = "🤝 Draw";
    result = "½–½";
  }

  return (
    <div className="w-72 rounded-xl bg-slate-800 p-5 shadow-lg">
      <h2 className="mb-5 text-2xl font-bold text-yellow-400">
        🎮 Game Info
      </h2>

      <div className="space-y-4">

        <div>
          <p className="text-slate-400">
            {game.isGameOver() ? "Winner" : "Turn"}
          </p>

          <p className="text-xl font-bold text-white">
            {game.isGameOver()
              ? winner
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