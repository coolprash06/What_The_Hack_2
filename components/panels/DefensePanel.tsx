import type { FormEvent } from "react";
import { LIMITS, type CaseFile } from "@/lib/case";
import { STEP_FORM_ID } from "../StepNav";
import { Card, Field, PanelHeading, inputClass } from "../ui";

export function DefensePanel({
  caseFile,
  value,
  onChange,
  onSubmit,
}: {
  caseFile: CaseFile;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Card>
      <PanelHeading eyebrow="Step 2 · The Defendant" title={`${caseFile.defendant}, rise.`}>
        You stand accused in the matter of <span className="text-amber-200">“{caseFile.title}”</span>. How do you
        answer these charges?
      </PanelHeading>
      <blockquote className="mb-5 max-h-32 overflow-y-auto rounded-lg border-l-2 border-sky-500/60 bg-stone-900/70 px-4 py-3 text-sm leading-relaxed text-stone-300">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-sky-300/80">
          {caseFile.petitioner} alleges
        </p>
        {caseFile.petitionerStatement}
      </blockquote>
      <form id={STEP_FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        <Field label="Defendant's statement" htmlFor="defendantStatement">
          <textarea
            id="defendantStatement"
            required
            rows={6}
            maxLength={LIMITS.statement}
            className={`${inputClass} resize-y`}
            placeholder="Your Honor, I can explain…"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      </form>
    </Card>
  );
}
