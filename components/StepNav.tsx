import { COVERS_LABELS } from "./Pinned";
import { Button } from "./ui";

// Each step's panel renders its <form> with this id; Next submits it from outside.
export const STEP_FORM_ID = "step-form";

export function StepNav({
  onBack,
  canBack,
  canNext,
  nextLabel = "Next",
}: {
  onBack: () => void;
  canBack: boolean;
  canNext: boolean;
  nextLabel?: string;
}) {
  return (
    <nav
      {...COVERS_LABELS}
      aria-label="Step navigation"
      className="pointer-events-auto fixed right-4 bottom-4 z-20 flex gap-2 rounded-xl border border-amber-200/15 bg-stone-950/95 p-1.5 shadow-xl shadow-black/60 sm:right-6 sm:bottom-6"
    >
      <Button variant="ghost" onClick={onBack} disabled={!canBack} className="px-4 py-2">
        ← Back
      </Button>
      <Button type="submit" form={STEP_FORM_ID} disabled={!canNext} className="px-4 py-2">
        {nextLabel} →
      </Button>
    </nav>
  );
}
