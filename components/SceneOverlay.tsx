"use client";

import { useEffect, useState } from "react";
import { useCourt } from "@/state/courtStore";
import { Pinned } from "./Pinned";
import type { Speaker } from "./scene/Courtroom";

function NameTag({ id, title, subtitle, active, show }: { id: string; title: string; subtitle?: string; active: boolean; show: boolean }) {
  return (
    <Pinned id={id} avoidUi className="-translate-x-1/2 -translate-y-full">
      <div
        className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-center text-[11px] font-semibold leading-tight shadow-lg shadow-black/60 transition-[opacity,background-color,color] duration-500 ${
          show ? "opacity-100" : "opacity-0"
        } ${active ? "border-amber-300 bg-amber-400 text-stone-950" : "border-amber-100/20 bg-stone-950/85 text-amber-50"}`}
      >
        {title}
        {subtitle && (
          <span className={`block text-[9px] font-medium uppercase tracking-wider ${active ? "text-stone-800" : "text-amber-200/70"}`}>
            {subtitle}
          </span>
        )}
      </div>
    </Pinned>
  );
}

// The judge's line, typed out letter by letter.
function SpeechBubble({ text, onDone }: { text: string; onDone?: () => void }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (count >= text.length) {
      const id = setTimeout(() => onDone?.(), 1400);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setCount((c) => c + 1), 42);
    return () => clearTimeout(id);
  }, [count, text, onDone]);

  return (
    <div className="fade-in relative w-64 rounded-2xl border border-amber-200/40 bg-stone-50 px-4 py-3 font-display text-[15px] font-semibold leading-snug text-stone-900 shadow-2xl shadow-black/60">
      {text.slice(0, count)}
      <span className="invisible">{text.slice(count)}</span>
      <span className="absolute -bottom-2 right-8 h-4 w-4 rotate-45 border-r border-b border-amber-200/40 bg-stone-50" />
    </div>
  );
}

/** Everything drawn over the 3D scene and pinned to it: name tags, hints, the judge's speech. */
export function SceneOverlay({
  names,
  witnessSubtitle,
  witnessPresent,
  jurorCount,
  speaker,
  judgeSpeech,
  onJudgeSpeechDone,
}: {
  names: { petitioner: string; defendant: string; witness: string; jurors: string[] };
  /** Shown under the witness's name, e.g. which side they support. */
  witnessSubtitle?: string;
  /** False once the case has gone ahead without witnesses. */
  witnessPresent: boolean;
  jurorCount: number;
  speaker: Speaker | null;
  /** The key restarts the typing whenever the judge says a new line. */
  judgeSpeech: { key: string; text: string } | null;
  onJudgeSpeechDone?: () => void;
}) {
  const lampOn = useCourt((s) => s.lampOn);
  const pulling = useCourt((s) => s.pulling);
  const dark = !lampOn && !pulling;

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] overflow-hidden">
      <NameTag id="judge-tag" title="The Honorable AI Judge" active={speaker === "judge"} show={lampOn && !judgeSpeech} />
      <NameTag
        id="tag-petitioner"
        title={names.petitioner || "Petitioner"}
        subtitle={names.petitioner ? "Petitioner" : undefined}
        active={speaker === "petitioner"}
        show={lampOn}
      />
      <NameTag
        id="tag-defendant"
        title={names.defendant || "Defendant"}
        subtitle={names.defendant ? "Defendant" : undefined}
        active={speaker === "defendant"}
        show={lampOn}
      />
      <NameTag
        id="tag-witness"
        title={names.witness || "Witness"}
        subtitle={names.witness ? witnessSubtitle || "Witness" : undefined}
        active={speaker === "witness"}
        show={lampOn && witnessPresent}
      />
      {Array.from({ length: jurorCount }, (_, i) => (
        <NameTag
          key={i}
          id={`tag-juror-${i}`}
          title={names.jurors[i] || `Juror ${i + 1}`}
          subtitle={names.jurors[i] ? `Juror ${i + 1}` : undefined}
          active={speaker === `juror-${i}`}
          show={lampOn}
        />
      ))}

      {dark && (
        <>
          <Pinned id="lamp-hint" className="-translate-x-1/2 -translate-y-full">
            <p className="lamp-hint whitespace-nowrap font-display text-sm tracking-wide text-amber-200/90">Pull the lamp to open court</p>
          </Pinned>
          <Pinned id="pull-cue" className="-translate-x-1/2 -translate-y-1/2">
            <div className="pull-cue" aria-hidden="true">
              <svg viewBox="0 0 16 22" width="14" height="19">
                <path
                  d="M8 1v16M2.5 12L8 18.5 13.5 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </Pinned>
        </>
      )}

      {judgeSpeech && (
        <Pinned id="judge-speech" className="-translate-x-full -translate-y-full">
          <SpeechBubble key={judgeSpeech.key} text={judgeSpeech.text} onDone={onJudgeSpeechDone} />
        </Pinned>
      )}
    </div>
  );
}
