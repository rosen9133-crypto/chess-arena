"use client";

import { useState } from "react";

type BoardStyle = "classic" | "roman";
type ArenaEffects = "off" | "low" | "high";

type Props = {
  initialBoardStyle: BoardStyle;
  initialEffects: ArenaEffects;
};

export default function ArenaCustomizeButton({ initialBoardStyle, initialEffects }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [boardStyle, setBoardStyle] = useState<BoardStyle>(initialBoardStyle);
  const [effects, setEffects] = useState<ArenaEffects>(initialEffects);
  const [draftBoardStyle, setDraftBoardStyle] = useState<BoardStyle>(initialBoardStyle);
  const [draftEffects, setDraftEffects] = useState<ArenaEffects>(initialEffects);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  function openCustomize() {
    setDraftBoardStyle(boardStyle);
    setDraftEffects(effects);
    setError("");
    setIsOpen(true);
  }

  async function apply() {
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch("/api/arena-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ romanBoardStyle: draftBoardStyle, romanArenaEffects: draftEffects }),
      });
      if (!response.ok) throw new Error("Unable to save Arena preferences.");
      const data = (await response.json()) as { romanBoardStyle?: string; romanArenaEffects?: string };
      const savedBoard: BoardStyle = data.romanBoardStyle === "classic" ? "classic" : "roman";
      const savedEffects: ArenaEffects = data.romanArenaEffects === "off" || data.romanArenaEffects === "low" ? data.romanArenaEffects : "high";
      setBoardStyle(savedBoard);
      setEffects(savedEffects);
      setIsOpen(false);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save Arena preferences.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <button type="button" onClick={openCustomize} className="inline-flex min-h-11 items-center justify-center rounded-md bg-gradient-to-r from-amber-300 to-amber-500 px-6 font-black uppercase tracking-wide text-slate-950 transition hover:brightness-105">
        Customize
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) setIsOpen(false); }}>
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-amber-400/30 bg-[#090e16] shadow-2xl shadow-black/60">
            <div className="border-b border-slate-800 px-6 py-5">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-400">Roman Colosseum</p>
              <div className="mt-1 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-black text-white">Customize Arena</h2>
                <button type="button" disabled={isSaving} onClick={() => setIsOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-lg text-slate-400 transition hover:border-slate-500 hover:text-white disabled:opacity-50">×</button>
              </div>
            </div>

            <div className="space-y-6 p-6">
              <section>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Board Style</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {([['classic','Classic','Original Chess Arena board'],['roman','Roman Arena','Warm marble and bronze board']] as const).map(([value,title,subtitle]) => (
                    <button key={value} type="button" onClick={() => setDraftBoardStyle(value)} className={`rounded-xl border p-4 text-left transition ${draftBoardStyle === value ? "border-amber-400 bg-amber-400/10 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.15)]" : "border-slate-700 bg-slate-950/60 hover:border-slate-500"}`}>
                      <span className={`block font-black ${draftBoardStyle === value ? "text-amber-300" : "text-white"}`}>{title}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-400">{subtitle}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Arena Effects</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {([['off','Off'],['low','Low'],['high','High']] as const).map(([value,label]) => (
                    <button key={value} type="button" onClick={() => setDraftEffects(value)} className={`min-h-11 rounded-lg border px-3 font-black uppercase transition ${draftEffects === value ? "border-amber-400 bg-amber-400/15 text-amber-300" : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-slate-500"}`}>{label}</button>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">Off keeps the scene static. Low enables the main flame. High enables the full Roman Arena effects.</p>
              </section>

              {error ? <p className="rounded-lg border border-rose-500/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">{error}</p> : null}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800 px-6 py-5">
              <button type="button" disabled={isSaving} onClick={() => setIsOpen(false)} className="min-h-11 rounded-md border border-slate-600 px-5 font-black uppercase text-slate-200 transition hover:border-slate-400 disabled:opacity-50">Cancel</button>
              <button type="button" disabled={isSaving} onClick={apply} className="min-h-11 rounded-md bg-gradient-to-r from-amber-300 to-amber-500 px-6 font-black uppercase text-slate-950 transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60">{isSaving ? "Saving..." : "Apply"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
