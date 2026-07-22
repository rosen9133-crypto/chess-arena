type CapturedPiecesProps = {
  whiteCaptured: string[];
  blackCaptured: string[];
};

export default function CapturedPieces({
  whiteCaptured,
  blackCaptured,
}: CapturedPiecesProps) {
  return (
    <div className="w-72 bg-slate-800 rounded-xl p-5 shadow-lg text-white">
      <h2 className="text-2xl font-bold text-yellow-400 mb-5">
        🏆 Captured Pieces
      </h2>

      <div className="mb-6">
        <p className="text-slate-400 mb-2">White captured</p>

        <div className="flex flex-wrap gap-2 text-3xl min-h-[40px]">
          {whiteCaptured.length === 0 ? (
            <span className="text-slate-500 text-base">
              None
            </span>
          ) : (
            whiteCaptured.map((piece, index) => (
              <span key={index}>{piece}</span>
            ))
          )}
        </div>
      </div>

      <hr className="border-slate-700 mb-6" />

      <div>
        <p className="text-slate-400 mb-2">Black captured</p>

        <div className="flex flex-wrap gap-2 text-3xl min-h-[40px]">
          {blackCaptured.length === 0 ? (
            <span className="text-slate-500 text-base">
              None
            </span>
          ) : (
            blackCaptured.map((piece, index) => (
              <span key={index}>{piece}</span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}