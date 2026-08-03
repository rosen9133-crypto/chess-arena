type CapturedPiecesProps = {
  whiteCaptured: string[];
  blackCaptured: string[];
};

const pieceValues: Record<string, number> = {
  "♙": 1,
  "♟": 1,
  "♘": 3,
  "♞": 3,
  "♗": 3,
  "♝": 3,
  "♖": 5,
  "♜": 5,
  "♕": 9,
  "♛": 9,
};

function getMaterialValue(pieces: string[]) {
  return pieces.reduce(
    (total, piece) =>
      total + (pieceValues[piece] ?? 0),
    0,
  );
}

export default function CapturedPieces({
  whiteCaptured,
  blackCaptured,
}: CapturedPiecesProps) {
  const whiteMaterial =
    getMaterialValue(whiteCaptured);

  const blackMaterial =
    getMaterialValue(blackCaptured);

  const whiteAdvantage = Math.max(
    whiteMaterial - blackMaterial,
    0,
  );

  const blackAdvantage = Math.max(
    blackMaterial - whiteMaterial,
    0,
  );

  return (
    <div className="w-72 rounded-xl bg-slate-800 p-5 text-white shadow-lg">
      <h2 className="mb-5 text-2xl font-bold text-yellow-400">
        🏆 Captured Pieces
      </h2>

      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-slate-400">
            White captured
          </p>

          {whiteAdvantage > 0 && (
            <span className="rounded-md bg-yellow-400/10 px-2 py-0.5 text-sm font-bold text-yellow-300">
              +{whiteAdvantage}
            </span>
          )}
        </div>

        <div className="flex min-h-[44px] flex-wrap items-center gap-1 text-4xl">
          {whiteCaptured.length === 0 ? (
            <span className="text-base text-slate-500">
              —
            </span>
          ) : (
            whiteCaptured.map((piece, index) => (
              <span
                key={`${piece}-${index}`}
                className="text-slate-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]"
              >
                {piece}
              </span>
            ))
          )}
        </div>
      </div>

      <hr className="mb-6 border-slate-700" />

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-slate-400">
            Black captured
          </p>

          {blackAdvantage > 0 && (
            <span className="rounded-md bg-yellow-400/10 px-2 py-0.5 text-sm font-bold text-yellow-300">
              +{blackAdvantage}
            </span>
          )}
        </div>

        <div className="flex min-h-[44px] flex-wrap items-center gap-1 text-4xl">
          {blackCaptured.length === 0 ? (
            <span className="text-base text-slate-500">
              —
            </span>
          ) : (
            blackCaptured.map((piece, index) => (
              <span
                key={`${piece}-${index}`}
                className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
              >
                {piece}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}