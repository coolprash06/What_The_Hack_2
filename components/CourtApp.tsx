"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { CaseFile, CaseSubmission, JurorVote } from "@/lib/case";
import { COURT_ERRORS, COURT_NAME, COURT_TAGLINE } from "@/lib/court";
import { isVerdict, type Verdict } from "@/lib/verdict";
import { useCourt } from "@/state/courtStore";
import { ProgressBar, type Step } from "./ProgressBar";
import { SceneOverlay } from "./SceneOverlay";
import { StepNav } from "./StepNav";
import type { CourtFocus } from "./scene/CameraRig";
import type { Speaker } from "./scene/Courtroom";
import type { SeatState } from "./scene/Furniture";
import { DefensePanel } from "./panels/DefensePanel";
import { DeliberationPanel } from "./panels/DeliberationPanel";
import { FileCasePanel } from "./panels/FileCasePanel";
import { JuryPanel, type JurorDraft } from "./panels/JuryPanel";
import { MistrialPanel, VerdictPanel } from "./panels/VerdictPanel";
import { Button } from "./ui";

// WebGL only exists in the browser (and the scene reads device capabilities
// at module load), so the scene skips server rendering.
const Courtroom = dynamic(() => import("./scene/Courtroom"), { ssr: false });

const MIN_DELIBERATION_MS = 4500;
// The room takes ~1.2s to light up; the start button appears 3s after that.
const START_BUTTON_DELAY_MS = 1200 + 3000;
const LOOK_HINT_DELAY_MS = 1500;
const LOOK_HINT_MS = 6000;
/** Matches the .panel-out animation. */
const PANEL_FADE_MS = 280;
const OPENING_LINE = "Good morning all, let us begin the proceedings.";

// Before the lamp is pulled the room is dark; then "lit" while waiting for
// Start, "intro" while the judge speaks, then "case" for the step flow.
type Opening = "lit" | "intro" | "case";

const FOCUS_BY_STEP: Record<Step, CourtFocus> = {
  file: "petitioner",
  defense: "defendant",
  jury: "jury",
  deliberation: "bench",
  verdict: "bench",
};

const NAV_STEPS: Step[] = ["file", "defense", "jury"];

const EMPTY_CASE: CaseFile = {
  title: "",
  petitioner: "",
  defendant: "",
  petitionerStatement: "",
  punishmentRequested: "",
  jurorCount: 3,
};

const emptyJuror = (): JurorDraft => ({ name: "", vote: null, reason: "" });

const filled = (...values: string[]) => values.every((v) => v.trim().length > 0);

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestVerdict(submission: CaseSubmission): Promise<{ verdict: Verdict } | { error: string }> {
  try {
    const res = await fetch("/api/verdict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submission),
    });
    const data: unknown = await res.json().catch(() => null);
    if (res.ok && isVerdict(data)) return { verdict: data };
    const error = (data as { error?: unknown } | null)?.error;
    return { error: typeof error === "string" ? error : COURT_ERRORS.unavailable };
  } catch {
    return { error: COURT_ERRORS.unreachable };
  }
}

/** The panel on screen, which lags the step while the camera moves between shots. */
type PanelState = { step: Step; leaving: boolean } | null;

export function CourtApp() {
  const lampOn = useCourt((s) => s.lampOn);
  const [opening, setOpening] = useState<Opening>("lit");
  const [startReady, setStartReady] = useState(false);
  const [lookHint, setLookHint] = useState(false);

  const [step, setStep] = useState<Step>("file");
  const [caseFile, setCaseFile] = useState<CaseFile>(EMPTY_CASE);
  const [defendantStatement, setDefendantStatement] = useState("");
  const [jurors, setJurors] = useState<JurorDraft[]>(() => Array.from({ length: EMPTY_CASE.jurorCount }, emptyJuror));
  const [jurorIndex, setJurorIndex] = useState(0);
  const [submission, setSubmission] = useState<CaseSubmission | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Ignores a verdict that arrives after the operator has already started a new case.
  const trialId = useRef(0);

  // Shot transitions: the current panel fades out, then the camera moves, then
  // the next panel fades in once the camera has mostly arrived.
  const [shot, setShot] = useState<CourtFocus>("wide");
  const [panel, setPanel] = useState<PanelState>(null);
  const shotRef = useRef<CourtFocus>("wide");
  const panelRef = useRef<PanelState>(null);
  const pendingPanel = useRef<Step | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showPanel = useCallback((next: PanelState) => {
    panelRef.current = next;
    setPanel(next);
  }, []);

  const goTo = useCallback((nextShot: CourtFocus, nextPanel: Step | null) => {
    clearTimeout(fadeTimer.current);
    if (nextShot === shotRef.current) {
      // Same camera position: swap the panel in place.
      pendingPanel.current = null;
      showPanel(nextPanel ? { step: nextPanel, leaving: false } : null);
      return;
    }
    pendingPanel.current = nextPanel;
    const moveCamera = () => {
      showPanel(null);
      shotRef.current = nextShot;
      setShot(nextShot);
    };
    const current = panelRef.current;
    if (current && !current.leaving) {
      showPanel({ ...current, leaving: true });
      fadeTimer.current = setTimeout(moveCamera, PANEL_FADE_MS);
    } else {
      moveCamera();
    }
  }, [showPanel]);

  const handleArrive = useCallback(
    (arrived: CourtFocus) => {
      if (arrived !== shotRef.current || !pendingPanel.current) return;
      const next = pendingPanel.current;
      pendingPanel.current = null;
      showPanel({ step: next, leaving: false });
    },
    [showPanel],
  );

  const changeStep = (next: Step) => {
    setStep(next);
    goTo(FOCUS_BY_STEP[next], next);
  };

  useEffect(() => {
    if (!lampOn) return;
    const timers = [
      setTimeout(() => setStartReady(true), START_BUTTON_DELAY_MS),
      setTimeout(() => setLookHint(true), LOOK_HINT_DELAY_MS),
      setTimeout(() => setLookHint(false), LOOK_HINT_DELAY_MS + LOOK_HINT_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, [lampOn]);

  useEffect(() => () => clearTimeout(fadeTimer.current), []);

  const startProceedings = () => {
    setOpening("intro");
    goTo("judge", null);
  };

  const finishIntro = useCallback(() => {
    setOpening("case");
    goTo(FOCUS_BY_STEP.file, "file");
  }, [goTo]);

  const updateCase = (patch: Partial<CaseFile>) => {
    setCaseFile((c) => ({ ...c, ...patch }));
    if (patch.jurorCount !== undefined) {
      const count = patch.jurorCount;
      setJurors((js) => Array.from({ length: count }, (_, i) => js[i] ?? emptyJuror()));
    }
  };

  const updateJuror = (patch: Partial<JurorDraft>) =>
    setJurors((js) => js.map((j, i) => (i === jurorIndex ? { ...j, ...patch } : j)));

  const deliberate = async (s: CaseSubmission) => {
    const id = ++trialId.current;
    setSubmission(s);
    setVerdict(null);
    setError(null);
    changeStep("deliberation");
    const [result] = await Promise.all([requestVerdict(s), wait(MIN_DELIBERATION_MS)]);
    if (id !== trialId.current) return;
    if ("verdict" in result) setVerdict(result.verdict);
    else setError(result.error);
    changeStep("verdict");
  };

  const nextJuror = () => {
    if (jurorIndex < jurors.length - 1) {
      setJurorIndex(jurorIndex + 1);
      return;
    }
    const votes: JurorVote[] = jurors.map((j, i) => ({
      name: j.name.trim() || `Juror #${i + 1}`,
      vote: j.vote ?? "not_guilty",
      reason: j.reason.trim(),
    }));
    deliberate({ ...caseFile, defendantStatement, jurors: votes });
  };

  const back = () => {
    if (step === "defense") changeStep("file");
    else if (step === "jury") {
      if (jurorIndex > 0) setJurorIndex(jurorIndex - 1);
      else changeStep("defense");
    }
  };

  const startNewCase = () => {
    trialId.current++;
    setCaseFile(EMPTY_CASE);
    setDefendantStatement("");
    setJurors(Array.from({ length: EMPTY_CASE.jurorCount }, emptyJuror));
    setJurorIndex(0);
    setSubmission(null);
    setVerdict(null);
    setError(null);
    changeStep("file");
  };

  const juror = jurors[jurorIndex];
  const canNext =
    step === "file"
      ? filled(caseFile.title, caseFile.petitioner, caseFile.defendant, caseFile.petitionerStatement, caseFile.punishmentRequested)
      : step === "defense"
        ? filled(defendantStatement)
        : step === "jury"
          ? filled(juror.name, juror.reason) && juror.vote !== null
          : false;
  const nextLabel = step === "jury" && jurorIndex === jurors.length - 1 ? "To deliberation" : "Next";

  const inCase = opening === "case";
  const speaker: Speaker | null =
    opening === "intro"
      ? "judge"
      : !inCase
        ? null
        : step === "file"
          ? "petitioner"
          : step === "defense"
            ? "defendant"
            : step === "jury"
              ? `juror-${jurorIndex}`
              : "judge";

  const seats: SeatState[] = jurors.map((j, i) => {
    if (!inCase || step === "file" || step === "defense") return "pending";
    if (step === "jury" && i === jurorIndex) return "current";
    return j.vote ?? "pending";
  });

  const panelStep = panel?.step;
  const showNav = !!panel && !panel.leaving && panel.step === step && NAV_STEPS.includes(step);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#0a0605] text-stone-100">
      <div className="absolute inset-0">
        <Courtroom focus={shot} onArrive={handleArrive} seats={seats} gavelActive={inCase && step === "deliberation"} speaker={speaker} />
      </div>
      <SceneOverlay
        names={{
          petitioner: caseFile.petitioner.trim(),
          defendant: caseFile.defendant.trim(),
          jurors: jurors.map((j) => j.name.trim()),
        }}
        jurorCount={jurors.length}
        speaker={speaker}
        judgeSpeech={opening === "intro" ? OPENING_LINE : null}
        onJudgeSpeechDone={finishIntro}
      />

      {/* Darken the edges and the panel side so the cards stay readable */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.55)_100%)]" />
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-700 lg:inset-y-0 lg:left-auto lg:right-0 lg:h-auto lg:w-[640px] lg:bg-gradient-to-l lg:from-black/75 ${
          inCase ? "opacity-100" : "opacity-0"
        }`}
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/85 via-black/50 to-transparent px-4 pt-4 pb-8 sm:px-8 sm:pt-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <div>
            <h1 className="font-display text-xl font-bold tracking-wide text-amber-100 drop-shadow sm:text-2xl">
              ⚖ {COURT_NAME}
            </h1>
            <p className="hidden text-xs text-stone-400 sm:block">{COURT_TAGLINE}</p>
          </div>
          {inCase && <ProgressBar step={step} />}
        </div>
      </header>

      {lampOn && opening === "lit" && startReady && (
        <div className="absolute inset-x-0 bottom-10 z-10 flex justify-center">
          <Button className="fade-in pointer-events-auto px-6 py-3 text-base" onClick={startProceedings}>
            Start the proceedings
          </Button>
        </div>
      )}

      {lookHint && (
        <p className="look-hint pointer-events-none absolute bottom-6 left-4 z-10 rounded-full border border-amber-100/15 bg-stone-950/80 px-3 py-1.5 text-xs text-amber-100/80 sm:left-8">
          ⟲ Drag to look around
        </p>
      )}

      {panel && (
        <section className="absolute inset-x-0 bottom-0 z-10 flex max-h-[58dvh] flex-col overflow-y-auto px-4 pt-2 pb-24 sm:px-6 lg:inset-y-0 lg:right-0 lg:left-auto lg:max-h-none lg:w-[560px] lg:pt-32 lg:pr-8 lg:pb-24 lg:pl-0">
          <div key={panel.step} className={`my-auto w-full ${panel.leaving ? "panel-out" : "panel-in"}`}>
            {panelStep === "file" && (
              <FileCasePanel value={caseFile} onChange={updateCase} onSubmit={() => changeStep("defense")} />
            )}
            {panelStep === "defense" && (
              <DefensePanel
                caseFile={caseFile}
                value={defendantStatement}
                onChange={setDefendantStatement}
                onSubmit={() => {
                  setJurorIndex(0);
                  changeStep("jury");
                }}
              />
            )}
            {panelStep === "jury" && <JuryPanel jurors={jurors} index={jurorIndex} onChange={updateJuror} onNext={nextJuror} />}
            {panelStep === "deliberation" && <DeliberationPanel />}
            {panelStep === "verdict" && submission && verdict && (
              <VerdictPanel submission={submission} verdict={verdict} onNewCase={startNewCase} />
            )}
            {panelStep === "verdict" && submission && error && (
              <MistrialPanel message={error} onRetry={() => deliberate(submission)} onNewCase={startNewCase} />
            )}
          </div>
        </section>
      )}

      {showNav && <StepNav onBack={back} canBack={step !== "file"} canNext={canNext} nextLabel={nextLabel} />}
    </main>
  );
}
