type CapturedPiecesProps = {
  whiteCaptured: string[];
  blackCaptured: string[];
};

export default function CapturedPieces({
  whiteCaptured,
  blackCaptured,
}: CapturedPiecesProps) {
  return (
    <div className="w-72 rounded-xl bg-slate-800 p-5 text-white shadow-lg">
      <h2 className="mb-5 text-2xl font-bold text-yellow-400">
        🏆 Captured Pieces
      </h2>

      <div className="mb-6">
        <p className="mb-2 text-slate-400">
          White captured
        </p>

        <div className="flex min-h-[44px] flex-wrap items-center gap-2 text-4xl">
          {whiteCaptured.length === 0 ? (
            <span className="text-base text-slate-500">
              —
            </span>
          ) : (
            whiteCaptured.map((piece, index) => (
              <span
                key={`${piece}-${index}`}
                className="text-slate-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.35)]"
              >
                {piece}
              </span>
            ))
          )}
        </div>
      </div>

      <hr className="mb-6 border-slate-700" />

      <div>
        <p className="mb-2 text-slate-400">
          Black captured
        </p>

        <div className="flex min-h-[44px] flex-wrap items-center gap-2 text-4xl">
          {blackCaptured.length === 0 ? (
            <span className="text-base text-slate-500">
              —
            </span>
          ) : (
            blackCaptured.map((piece, index) => (
              <span
                key={`${piece}-${index}`}
                className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
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