"use client";

export type PlayerColorChoice =
  | "white"
  | "black"
  | "random";

type PlayerColorSelectorProps = {
  selectedColor: PlayerColorChoice;
  onSelect: (color: PlayerColorChoice) => void;
  disabled?: boolean;
};

const COLOR_OPTIONS: {
  id: PlayerColorChoice;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    id: "white",
    label: "White",
    icon: "⚪",
    description: "You move first",
  },
  {
    id: "black",
    label: "Black",
    icon: "⚫",
    description: "Computer moves first",
  },
  {
    id: "random",
    label: "Random",
    icon: "🎲",
    description: "Surprise me",
  },
];

export default function PlayerColorSelector({
  selectedColor,
  onSelect,
  disabled = false,
}: PlayerColorSelectorProps) {
  return (
    <div className="rounded-2xl border border-slate-700/90 bg-slate-900/90 p-4 shadow-xl">
      <div className="mb-4 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
          Your Color
        </p>

        <h2 className="mt-1 text-xl font-bold text-white">
          Choose Side
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {COLOR_OPTIONS.map((option) => {
          const isSelected = selectedColor === option.id;

          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(option.id)}
              className={[
                "min-w-0 rounded-xl border px-1.5 py-4 text-center transition",
                "active:scale-[0.98]",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isSelected
                  ? "border-yellow-400 bg-yellow-400/10 shadow-lg shadow-yellow-400/10"
                  : "border-slate-700 bg-slate-800/70 hover:border-slate-500 hover:bg-slate-800",
              ].join(" ")}
            >
              <div
                className={[
                  "truncate text-sm font-bold sm:text-base",
                  isSelected ? "text-yellow-400" : "text-white",
                ].join(" ")}
              >
                {option.label}
              </div>

              <div className="mt-3 flex min-h-[76px] flex-col items-center justify-center">
                <span className="text-xl leading-none">
                  {option.icon}
                </span>

                <span className="mt-2 block w-full px-1 text-center text-[11px] leading-[15px] text-slate-400">
                  {option.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {disabled && (
        <p className="mt-4 text-center text-xs text-slate-400">
          Start a new game to change your color.
        </p>
      )}
    </div>
  );
}