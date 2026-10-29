import type { FormEvent } from "react";
import { LIMITS, type Vote } from "@/lib/case";
import { STEP_FORM_ID } from "../StepNav";
import { stepNumber } from "../ProgressBar";
import { Card, Field, PanelHeading, inputClass } from "../ui";

export interface JurorDraft {
  name: string;
  vote: Vote | null;
  reason: string;
}

const VOTE_OPTIONS: { vote: Vote; label: string; selectedClass: string }[] = [
  { vote: "guilty", label: "Guilty", selectedClass: "border-red-400 bg-red-500/20 text-red-100" },
  { vote: "not_guilty", label: "Not Guilty", selectedClass: "border-emerald-400 bg-emerald-500/20 text-emerald-100" },
];

export function JuryPanel({
  jurors,
  index,
  onChange,
  onNext,
}: {
  jurors: JurorDraft[];
  index: number;
  onChange: (patch: Partial<JurorDraft>) => void;
  onNext: () => void;
}) {
  const juror = jurors[index];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (juror.vote) onNext();
  };

  return (
    <Card>
      <PanelHeading eyebrow={`Step ${stepNumber("jury")} · Juror ${index + 1} of ${jurors.length}`} title="The Jury Speaks">
        Each juror must cast their vote under the solemn gaze of the court.
      </PanelHeading>

      <div className="mb-5 flex gap-2" aria-hidden>
        {jurors.map((j, i) => (
          <span
            key={i}
            className={`h-2 flex-1 rounded-full transition-colors ${
              i === index
                ? "bg-amber-300"
                : j.vote === "guilty"
                  ? "bg-red-500/80"
                  : j.vote === "not_guilty"
                    ? "bg-emerald-500/80"
                    : "bg-stone-700"
            }`}
          />
        ))}
      </div>

      {/* Keyed by index so each juror gets a fresh form (and fresh validation). */}
      <form key={index} id={STEP_FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        <Field label="Juror name" htmlFor="jurorName">
          <input
            id="jurorName"
            required
            autoFocus
            maxLength={LIMITS.name}
            className={inputClass}
            placeholder={`Juror #${index + 1}`}
            value={juror.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </Field>
        <Field label="Vote">
          <div role="radiogroup" aria-label="Vote" className="grid grid-cols-2 gap-3">
            {VOTE_OPTIONS.map((o) => {
              const selected = juror.vote === o.vote;
              return (
                <button
                  key={o.vote}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange({ vote: o.vote })}
                  className={`rounded-lg border py-3 font-display text-base font-bold tracking-wider transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                    selected ? o.selectedClass : "border-stone-700 bg-stone-900/80 text-stone-300 hover:border-stone-500"
                  }`}
                >
                  {o.label.toUpperCase()}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Reason" htmlFor="jurorReason" hint={`A short reason, up to ${LIMITS.reason} characters.`}>
          <textarea
            id="jurorReason"
            required
            rows={2}
            maxLength={LIMITS.reason}
            className={`${inputClass} resize-none`}
            placeholder="The evidence is overwhelming…"
            value={juror.reason}
            onChange={(e) => onChange({ reason: e.target.value })}
          />
        </Field>
        {!juror.vote && <p className="text-xs text-stone-400">Cast a vote to continue.</p>}
      </form>
    </Card>
  );
}
