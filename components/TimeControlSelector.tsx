"use client";

import type { Dispatch, SetStateAction } from "react";

export type TimeControl = {
  id: string;
  label: string;
  category: string;
  initialMinutes: number;
  incrementSeconds: number;
};

type TimeControlSelectorProps = {
  controls: readonly TimeControl[];
  selectedControlId: string;
  onSelect: Dispatch<SetStateAction<string>>;
};

export default function TimeControlSelector({
  controls,
  selectedControlId,
  onSelect,
}: TimeControlSelectorProps) {
  return (
    <div className="w-72 rounded-xl bg-slate-800 p-5 shadow-lg">
      <h2 className="mb-5 text-2xl font-bold text-yellow-400">
        ⏱ Time Control
      </h2>

      <div className="space-y-3">
        {controls.map((control) => {
          const isSelected =
            control.id === selectedControlId;

          return (
            <button
              key={control.id}
              type="button"
              onClick={() => onSelect(control.id)}
              className={`w-full rounded-lg border p-4 text-left transition-all ${
                isSelected
                  ? "border-yellow-400 bg-yellow-400/10"
                  : "border-slate-700 bg-slate-900 hover:border-slate-500 hover:bg-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">
                  {control.label}
                </span>

                {isSelected && (
                  <span className="text-yellow-400">
                    ✓
                  </span>
                )}
              </div>

              <p className="mt-1 text-sm text-slate-400">
                {control.category}
              </p>

              <p className="mt-2 text-xs text-slate-500">
                {control.initialMinutes}+{control.incrementSeconds}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}