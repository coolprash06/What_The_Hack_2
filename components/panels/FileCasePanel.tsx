import type { FormEvent } from "react";
import { LIMITS, MAX_JURORS, MIN_JURORS, type CaseFile } from "@/lib/case";
import { STEP_FORM_ID } from "../StepNav";
import { stepNumber } from "../ProgressBar";
import { Card, Field, PanelHeading, inputClass } from "../ui";

const JUROR_OPTIONS = Array.from({ length: MAX_JURORS - MIN_JURORS + 1 }, (_, i) => MIN_JURORS + i);

export function FileCasePanel({
  value,
  onChange,
  onSubmit,
}: {
  value: CaseFile;
  onChange: (patch: Partial<CaseFile>) => void;
  onSubmit: () => void;
}) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Card>
      <PanelHeading eyebrow={`Step ${stepNumber("file")} · The Petitioner`} title="File the Case">
        State your grievance before the court. Spare no detail; the court sees all.
      </PanelHeading>
      <form id={STEP_FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        <Field label="Case title" htmlFor="title">
          <input
            id="title"
            required
            maxLength={LIMITS.title}
            className={inputClass}
            placeholder="The People v. The Last Slice of Pizza"
            value={value.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Petitioner" htmlFor="petitioner">
            <input
              id="petitioner"
              required
              maxLength={LIMITS.name}
              className={inputClass}
              placeholder="Who is accusing?"
              value={value.petitioner}
              onChange={(e) => onChange({ petitioner: e.target.value })}
            />
          </Field>
          <Field label="Defendant" htmlFor="defendant">
            <input
              id="defendant"
              required
              maxLength={LIMITS.name}
              className={inputClass}
              placeholder="Who stands accused?"
              value={value.defendant}
              onChange={(e) => onChange({ defendant: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Petitioner's statement" htmlFor="petitionerStatement">
          <textarea
            id="petitionerStatement"
            required
            rows={4}
            maxLength={LIMITS.statement}
            className={`${inputClass} resize-y`}
            placeholder="Tell the court exactly what happened…"
            value={value.petitionerStatement}
            onChange={(e) => onChange({ petitionerStatement: e.target.value })}
          />
        </Field>
        <Field label="Punishment requested" htmlFor="punishmentRequested">
          <input
            id="punishmentRequested"
            required
            maxLength={LIMITS.punishment}
            className={inputClass}
            placeholder="e.g. Buys the whole group bubble tea"
            value={value.punishmentRequested}
            onChange={(e) => onChange({ punishmentRequested: e.target.value })}
          />
        </Field>
        <Field label="Number of jurors">
          <div role="radiogroup" aria-label="Number of jurors" className="grid grid-cols-6 gap-2">
            {JUROR_OPTIONS.map((n) => {
              const selected = value.jurorCount === n;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange({ jurorCount: n })}
                  className={`rounded-lg border py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                    selected
                      ? "border-amber-400 bg-amber-500/20 text-amber-100"
                      : "border-stone-700 bg-stone-900/80 text-stone-300 hover:border-stone-500"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </Field>
      </form>
    </Card>
  );
}
