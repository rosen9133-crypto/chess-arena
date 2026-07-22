import { Chess } from "chess.js";

type GameInfoProps = {
  game: Chess;
};

export default function GameInfo({
  game,
}: GameInfoProps) {
  const turn = game.turn();

  const status = game.isCheckmate()
    ? "♛ Checkmate"
    : game.isDraw()
    ? "🤝 Draw"
    : game.inCheck()
    ? "⚠️ Check"
    : "Game in progress";

  return (
    <div className="w-72 bg-slate-800 rounded-xl p-5 shadow-lg">
      <h2 className="text-2xl font-bold text-yellow-400 mb-5">
        🎮 Game Info
      </h2>

      <div className="space-y-4">

        <div>
          <p className="text-slate-400">Turn</p>

          <p className="text-white text-xl font-bold">
            {turn === "w" ? "⚪ White" : "⚫ Black"}
          </p>
        </div>

        <hr className="border-slate-700" />

        <div>
          <p className="text-slate-400">Status</p>

          <p className="text-green-400 font-semibold">
            {status}
          </p>
        </div>

      </div>
    </div>
  );
}