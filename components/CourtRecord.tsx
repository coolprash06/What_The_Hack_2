"use client";

import { useEffect, useRef, useState } from "react";
import type { RecordEntry, RecordRole, RecordType } from "@/lib/case";
import { COVERS_LABELS } from "./Pinned";

const TYPE_LABEL: Record<RecordType, string> = {
  statement: "Opening statement",
  testimony: "Testimony",
  cross_question: "Cross-examination",
  cross_answer: "Answer under cross-examination",
  final_words: "Final words",
  vote: "Jury vote",
};

const ROLE_LABEL: Record<RecordRole, string> = {
  petitioner: "Petitioner",
  defendant: "Defendant",
  witness: "Witness",
  juror: "Juror",
};

const ROLE_COLOR: Record<RecordRole, string> = {
  petitioner: "text-sky-300",
  defendant: "text-rose-300",
  witness: "text-violet-300",
  juror: "text-amber-200",
};

function describe(e: RecordEntry) {
  if (e.type === "cross_question") return `${TYPE_LABEL[e.type]} of ${e.addressee}`;
  if (e.type === "final_words") return `${TYPE_LABEL[e.type]} · round ${e.round}`;
  if (e.type === "vote") return `${TYPE_LABEL[e.type]} · ${e.vote === "guilty" ? "Guilty" : "Not Guilty"}`;
  return TYPE_LABEL[e.type];
}

/**
 * A small button under the court's title that opens the transcript so far.
 * The panel sits on the left and stops above the bottom-right Back/Next control.
 */
export function CourtRecord({ entries }: { entries: RecordEntry[] }) {
  const [open, setOpen] = useState(false);
  const list = useRef<HTMLOListElement>(null);

  // Opens at the latest entry; Escape closes.
  useEffect(() => {
    if (!open) return;
    list.current?.lastElementChild?.scrollIntoView({ block: "end" });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="pointer-events-auto relative mt-2 w-fit">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="court-record"
        onClick={() => setOpen((o) => !o)}
        className={`rounded-full border px-3 py-1 text-xs font-semibold tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
          open
            ? "border-amber-300 bg-amber-400 text-stone-950"
            : "border-amber-100/20 bg-stone-950/85 text-amber-100/90 hover:border-amber-300/60"
        }`}
      >
        📜 Court record{entries.length > 0 && ` (${entries.length})`}
      </button>

      {open && (
        <div
          id="court-record"
          {...COVERS_LABELS}
          role="dialog"
          aria-label="Court record"
          className="fade-in absolute top-full left-0 mt-2 flex max-h-[calc(100dvh-15rem)] w-[min(400px,calc(100vw-2rem))] flex-col rounded-2xl border border-amber-200/15 bg-stone-950/97 shadow-2xl shadow-black/70 ring-1 ring-black/40"
        >
          <div className="flex items-center justify-between border-b border-amber-200/10 px-4 py-3">
            <h2 className="font-display text-base font-bold text-amber-50">Court record</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close the court record"
              className="rounded-md px-2 py-0.5 text-stone-400 transition hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              ✕
            </button>
          </div>
          {entries.length ? (
            <ol ref={list} className="space-y-3 overflow-y-auto px-4 py-3 text-sm leading-relaxed">
              {entries.map((e, i) => (
                <li key={i} className="border-b border-stone-800/80 pb-3 last:border-0 last:pb-0">
                  <p className="text-[11px] uppercase tracking-wider text-stone-500">
                    <span className={`font-semibold normal-case tracking-normal text-sm ${ROLE_COLOR[e.role]}`}>{e.speaker}</span>{" "}
                    · {ROLE_LABEL[e.role]} · {describe(e)}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-stone-200">{e.text}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="px-4 py-6 text-center text-sm italic text-stone-400">Nothing has been said yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
