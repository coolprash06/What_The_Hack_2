import type { FormEvent } from "react";
import { LIMITS, MAX_WITNESSES, type CaseFile, type CrossExchange, type Party, type WitnessSide } from "@/lib/case";
import { stepNumber } from "../ProgressBar";
import { STEP_FORM_ID } from "../StepNav";
import { Button, Card, Field, PanelHeading, inputClass } from "../ui";

export interface WitnessDraft {
  name: string;
  side: WitnessSide | null;
  relationship: string;
  statement: string;
  /** Cross-examination, by the side asking. */
  cross: Record<Party, CrossExchange[]>;
}

export const emptyWitness = (): WitnessDraft => ({
  name: "",
  side: null,
  relationship: "",
  statement: "",
  cross: { petitioner: [], defendant: [] },
});

export const isWitnessComplete = (w: WitnessDraft) =>
  w.side !== null && [w.name, w.relationship, w.statement].every((v) => v.trim().length > 0);

export function sideLabel(side: WitnessSide, caseFile: CaseFile) {
  if (side === "petitioner") return `Supports ${caseFile.petitioner || "the petitioner"}`;
  if (side === "defendant") return `Supports ${caseFile.defendant || "the defendant"}`;
  return "Neutral";
}

const SIDE_OPTIONS: { side: WitnessSide; selectedClass: string }[] = [
  { side: "petitioner", selectedClass: "border-sky-400 bg-sky-500/20 text-sky-100" },
  { side: "defendant", selectedClass: "border-rose-400 bg-rose-500/20 text-rose-100" },
  { side: "neutral", selectedClass: "border-amber-300 bg-amber-500/15 text-amber-100" },
];

const SIDE_DOT: Record<WitnessSide, string> = {
  petitioner: "bg-sky-400",
  defendant: "bg-rose-400",
  neutral: "bg-amber-300",
};

/** Lists the witnesses called so far, with the choice to call (another) one or move on. */
export function WitnessesPanel({
  caseFile,
  witnesses,
  onAdd,
  onEdit,
  onRemove,
  onDone,
}: {
  caseFile: CaseFile;
  witnesses: WitnessDraft[];
  onAdd: () => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onDone: () => void;
}) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onDone();
  };
  const none = witnesses.length === 0;

  return (
    <Card>
      <PanelHeading eyebrow={`Step ${stepNumber("witnesses")} · Witnesses`} title="Call your witnesses">
        {none
          ? "Does anyone else have something to tell the court? Witnesses are optional, and the judge trusts none of them."
          : "The witness stand awaits. Call another, or let the court move on to final words."}
      </PanelHeading>

      {/* Next submits this form: "No witnesses" when none were called, otherwise "Done". */}
      <form id={STEP_FORM_ID} onSubmit={handleSubmit}>
        {none ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="submit"
              className="rounded-xl border border-stone-700 bg-stone-900/80 px-4 py-4 text-left transition hover:border-stone-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <span className="block font-display text-base font-bold text-stone-100">No witnesses</span>
              <span className="mt-1 block text-xs text-stone-400">Skip straight to final words.</span>
            </button>
            <button
              type="button"
              onClick={onAdd}
              className="rounded-xl border border-amber-400/70 bg-amber-500/15 px-4 py-4 text-left transition hover:bg-amber-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <span className="block font-display text-base font-bold text-amber-100">Add witness</span>
              <span className="mt-1 block text-xs text-amber-100/70">Call someone to the stand.</span>
            </button>
          </div>
        ) : (
          <>
            <ul className="space-y-2">
              {witnesses.map((w, i) => (
                <li key={i} className="flex items-start gap-3 rounded-lg border border-stone-700/80 bg-stone-900/70 px-3.5 py-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${w.side ? SIDE_DOT[w.side] : "bg-stone-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-amber-50">{w.name}</p>
                    <p className="truncate text-xs text-stone-400">
                      {w.side && sideLabel(w.side, caseFile)} · {w.relationship}
                    </p>
                    {w.cross.petitioner.length + w.cross.defendant.length > 0 && (
                      <p className="text-xs text-amber-200/70">
                        Cross-examined · {w.cross.petitioner.length + w.cross.defendant.length} question(s)
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => onEdit(i)}>
                      Edit
                    </Button>
                    <Button variant="ghost" className="px-2.5 py-1 text-xs" onClick={() => onRemove(i)}>
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <Button variant="ghost" className="mt-3 w-full" onClick={onAdd} disabled={witnesses.length >= MAX_WITNESSES}>
              + Add another witness
            </Button>
          </>
        )}
      </form>
    </Card>
  );
}

/** One witness's testimony. Next saves it. */
export function WitnessForm({
  caseFile,
  witness,
  index,
  onChange,
  onSave,
}: {
  caseFile: CaseFile;
  witness: WitnessDraft;
  index: number;
  onChange: (patch: Partial<WitnessDraft>) => void;
  onSave: () => void;
}) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isWitnessComplete(witness)) onSave();
  };

  return (
    <Card>
      <PanelHeading eyebrow={`Step ${stepNumber("witnesses")} · Witness ${index + 1}`} title="Take the stand">
        Do you swear to tell the truth, the whole truth, and nothing but the truth? The court will be the judge of that.
      </PanelHeading>
      {/* Keyed by index so each witness gets a fresh form (and fresh validation). */}
      <form key={index} id={STEP_FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        <Field label="Witness name" htmlFor="witnessName">
          <input
            id="witnessName"
            required
            autoFocus
            maxLength={LIMITS.name}
            className={inputClass}
            placeholder="Who takes the stand?"
            value={witness.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </Field>
        <Field label="Which side do they support?">
          <div role="radiogroup" aria-label="Which side do they support?" className="grid grid-cols-3 gap-2">
            {SIDE_OPTIONS.map((o) => {
              const selected = witness.side === o.side;
              return (
                <button
                  key={o.side}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange({ side: o.side })}
                  className={`truncate rounded-lg border px-2 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                    selected ? o.selectedClass : "border-stone-700 bg-stone-900/80 text-stone-300 hover:border-stone-500"
                  }`}
                >
                  {o.side === "petitioner" ? "Petitioner" : o.side === "defendant" ? "Defendant" : "Neutral"}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Relationship to the parties" htmlFor="witnessRelationship">
          <input
            id="witnessRelationship"
            required
            maxLength={LIMITS.relationship}
            className={inputClass}
            placeholder={`e.g. ${caseFile.petitioner || "the petitioner"}'s best friend`}
            value={witness.relationship}
            onChange={(e) => onChange({ relationship: e.target.value })}
          />
        </Field>
        <Field label="Statement" htmlFor="witnessStatement">
          <textarea
            id="witnessStatement"
            required
            rows={4}
            maxLength={LIMITS.statement}
            className={`${inputClass} resize-y`}
            placeholder="I saw everything, Your Honor…"
            value={witness.statement}
            onChange={(e) => onChange({ statement: e.target.value })}
          />
        </Field>
        {!witness.side && <p className="text-xs text-stone-400">Choose a side to continue.</p>}
      </form>
    </Card>
  );
}

export type CrossStage = "choose" | "question" | "answer";

export interface CrossDraft {
  /** At the "choose" stage: ask (another) question, or stop. */
  choice: "ask" | "stop" | null;
  question: string;
  answer: string;
}

export const EMPTY_CROSS_DRAFT: CrossDraft = { choice: null, question: "", answer: "" };

export function isCrossDraftReady(stage: CrossStage, d: CrossDraft) {
  if (stage === "choose") return d.choice !== null;
  return (stage === "question" ? d.question : d.answer).trim().length > 0;
}

/**
 * One side cross-examines a witness: choose to ask or not, type the question
 * (as that side), then the witness's answer. Repeats until they are done.
 */
export function CrossExaminationPanel({
  witness,
  questioner,
  side,
  stage,
  value,
  onChange,
  onSubmit,
}: {
  witness: WitnessDraft;
  /** The questioning party's name. */
  questioner: string;
  side: Party;
  stage: CrossStage;
  value: CrossDraft;
  onChange: (patch: Partial<CrossDraft>) => void;
  onSubmit: () => void;
}) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isCrossDraftReady(stage, value)) onSubmit();
  };
  const exchanges = witness.cross[side];
  const asked = exchanges.length > 0;
  const options = [
    { choice: "stop" as const, label: asked ? "Done questioning" : "No questions" },
    { choice: "ask" as const, label: asked ? "Ask another question" : "Ask a question" },
  ];
  const role = side === "petitioner" ? "Petitioner" : "Defendant";

  return (
    <Card>
      <PanelHeading
        eyebrow={`Step ${stepNumber("witnesses")} · Cross-examination`}
        title={stage === "answer" ? `${witness.name} answers` : `${questioner} questions ${witness.name}`}
      >
        {stage === "answer"
          ? "The witness must answer under oath. The court is watching for contradictions."
          : `${role} ${questioner} may now cross-examine the witness.`}
      </PanelHeading>

      {asked && (
        <ol className="mb-5 max-h-40 space-y-2 overflow-y-auto rounded-lg border-l-2 border-amber-400/50 bg-stone-900/70 px-4 py-3 text-sm leading-relaxed">
          {exchanges.map((x, i) => (
            <li key={i}>
              <p className="text-stone-300">
                <span className="font-semibold text-amber-200/90">Q:</span> {x.question}
              </p>
              <p className="text-stone-400">
                <span className="font-semibold text-stone-300">A:</span> {x.answer}
              </p>
            </li>
          ))}
        </ol>
      )}

      <form id={STEP_FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        {stage === "choose" && (
          <div role="radiogroup" aria-label={`${questioner}'s cross-examination`} className="grid grid-cols-2 gap-3">
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
        )}
        {stage === "question" && (
          <Field label={`${questioner}'s question`} htmlFor="crossQuestion">
            <textarea
              id="crossQuestion"
              required
              autoFocus
              rows={3}
              maxLength={LIMITS.statement}
              className={`${inputClass} resize-y`}
              placeholder="Isn't it true that…"
              value={value.question}
              onChange={(e) => onChange({ question: e.target.value })}
            />
          </Field>
        )}
        {stage === "answer" && (
          <>
            <blockquote className="rounded-lg border-l-2 border-amber-400/60 bg-stone-900/70 px-4 py-3 text-sm leading-relaxed text-stone-300">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-300/80">{questioner} asks</p>
              {value.question}
            </blockquote>
            <Field label={`${witness.name}'s answer`} htmlFor="crossAnswer">
              <textarea
                id="crossAnswer"
                required
                autoFocus
                rows={3}
                maxLength={LIMITS.statement}
                className={`${inputClass} resize-y`}
                placeholder="Well, Your Honor…"
                value={value.answer}
                onChange={(e) => onChange({ answer: e.target.value })}
              />
            </Field>
          </>
        )}
        {stage === "choose" && !value.choice && <p className="text-xs text-stone-400">Choose an option to continue.</p>}
      </form>
    </Card>
  );
}
