import { COVERS_LABELS } from "./Pinned";

export type Step = "file" | "defense" | "witnesses" | "final" | "jury" | "deliberation" | "verdict";

export const STEPS: { id: Step; label: string }[] = [
  { id: "file", label: "File the case" },
  { id: "defense", label: "Defense" },
  { id: "witnesses", label: "Witnesses" },
  { id: "final", label: "Final words" },
  { id: "jury", label: "Jury" },
  { id: "deliberation", label: "Deliberation" },
  { id: "verdict", label: "Verdict" },
];

/** 1-based position of a step in the flow, for panel headings. */
export const stepNumber = (step: Step) => STEPS.findIndex((s) => s.id === step) + 1;

export function ProgressBar({ step }: { step: Step }) {
  const current = STEPS.findIndex((s) => s.id === step);
  return (
    <ol {...COVERS_LABELS} className="flex w-full max-w-3xl items-start gap-1.5 sm:gap-2" aria-label="Trial progress">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.id} className="flex-1" aria-current={active ? "step" : undefined}>
            <div
              className={`h-1.5 rounded-full transition-colors duration-500 ${
                done ? "bg-amber-500" : active ? "bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.7)]" : "bg-stone-700/80"
              }`}
            />
            <p
              className={`mt-1.5 hidden text-[11px] font-medium uppercase leading-tight tracking-wider sm:block ${
                active ? "text-amber-200" : done ? "text-amber-500/80" : "text-stone-500"
              }`}
            >
              {i + 1}. {s.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
