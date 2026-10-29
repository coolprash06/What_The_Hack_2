import type { FormEvent } from "react";
import { LIMITS, type FinalSpeakerRole } from "@/lib/case";
import { stepNumber } from "../ProgressBar";
import { STEP_FORM_ID } from "../StepNav";
import { Card, Field, PanelHeading, inputClass } from "../ui";

export interface FinalWordsDraft {
  choice: "nothing" | "speak" | null;
  text: string;
}

export const EMPTY_FINAL_DRAFT: FinalWordsDraft = { choice: null, text: "" };

export const isFinalDraftReady = (d: FinalWordsDraft) => d.choice === "nothing" || (d.choice === "speak" && d.text.trim().length > 0);

export interface Participant {
  role: FinalSpeakerRole;
  name: string;
  /** e.g. "Petitioner" or "Witness · Supports Sam" */
  title: string;
}

export function FinalWordsPanel({
  participant,
  round,
  index,
  total,
  value,
  onChange,
  onSubmit,
}: {
  participant: Participant;
  /** 0-based */
  round: number;
  /** 0-based position of this participant in the round */
  index: number;
  total: number;
  value: FinalWordsDraft;
  onChange: (patch: Partial<FinalWordsDraft>) => void;
  onSubmit: () => void;
}) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isFinalDraftReady(value)) onSubmit();
  };

  const options = [
    { choice: "nothing" as const, label: "Nothing to say" },
    { choice: "speak" as const, label: "Add a statement" },
  ];

  return (
    <Card>
      <PanelHeading
        eyebrow={`Step ${stepNumber("final")} · Final words · Round ${round + 1} · ${index + 1} of ${total}`}
        title={participant.name}
      >
        <span className="text-amber-200/80">{participant.title}.</span> The court asks: is there anything more you wish to say
        before the jury votes?
      </PanelHeading>

      <form id={STEP_FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        <div role="radiogroup" aria-label={`${participant.name}'s answer`} className="grid grid-cols-2 gap-3">
          {options.map((o) => {
            const selected = value.choice === o.choice;
            return (
              <button
                key={o.choice}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange({ choice: o.choice })}
                className={`rounded-lg border py-3 font-display text-base font-bold tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                  selected
                    ? "border-amber-400 bg-amber-500/20 text-amber-100"
                    : "border-stone-700 bg-stone-900/80 text-stone-300 hover:border-stone-500"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        {value.choice === "speak" && (
          <Field label={`${participant.name}'s statement`} htmlFor="finalWords">
            <textarea
              id="finalWords"
              required
              autoFocus
              rows={4}
              maxLength={LIMITS.statement}
              className={`${inputClass} resize-y`}
              placeholder="Your Honor, one more thing…"
              value={value.text}
              onChange={(e) => onChange({ text: e.target.value })}
            />
          </Field>
        )}
        {!value.choice && <p className="text-xs text-stone-400">Choose an answer to continue.</p>}
      </form>
    </Card>
  );
}
