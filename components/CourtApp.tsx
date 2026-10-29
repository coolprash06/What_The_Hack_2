"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { CaseFile, CaseSubmission, JurorVote } from "@/lib/case";
import { COURT_ERRORS, COURT_NAME, COURT_TAGLINE } from "@/lib/court";
import { isVerdict, type Verdict } from "@/lib/verdict";
import { ProgressBar, type Step } from "./ProgressBar";
import type { CourtFocus } from "./scene/CameraRig";
import type { SeatState } from "./scene/Furniture";
import { DefensePanel } from "./panels/DefensePanel";
import { DeliberationPanel } from "./panels/DeliberationPanel";
import { FileCasePanel } from "./panels/FileCasePanel";
import { JuryPanel, type JurorDraft } from "./panels/JuryPanel";
import { MistrialPanel, VerdictPanel } from "./panels/VerdictPanel";

// WebGL only exists in the browser, so the scene skips server rendering.
const Courtroom = dynamic(() => import("./scene/Courtroom"), { ssr: false });

const MIN_DELIBERATION_MS = 4500;

const FOCUS_BY_STEP: Record<Step, CourtFocus> = {
  file: "petitioner",
  defense: "defendant",
  jury: "jury",
  deliberation: "bench",
  verdict: "bench",
};

const EMPTY_CASE: CaseFile = {
  title: "",
  petitioner: "",
  defendant: "",
  petitionerStatement: "",
  punishmentRequested: "",
  jurorCount: 3,
};

const emptyJuror = (): JurorDraft => ({ name: "", vote: null, reason: "" });

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

export function CourtApp() {
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
    setStep("deliberation");
    const [result] = await Promise.all([requestVerdict(s), wait(MIN_DELIBERATION_MS)]);
    if (id !== trialId.current) return;
    if ("verdict" in result) setVerdict(result.verdict);
    else setError(result.error);
    setStep("verdict");
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

  const startNewCase = () => {
    trialId.current++;
    setCaseFile(EMPTY_CASE);
    setDefendantStatement("");
    setJurors(Array.from({ length: EMPTY_CASE.jurorCount }, emptyJuror));
    setJurorIndex(0);
    setSubmission(null);
    setVerdict(null);
    setError(null);
    setStep("file");
  };

  const seats: SeatState[] = jurors.map((j, i) => {
    if (step === "file" || step === "defense") return "pending";
    if (step === "jury" && i === jurorIndex) return "current";
    return j.vote ?? "pending";
  });

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#0a0605] text-stone-100">
      <div className="absolute inset-0">
        <Courtroom focus={FOCUS_BY_STEP[step]} seats={seats} gavelActive={step === "deliberation"} />
      </div>

      {/* Darken the edges and the panel side so the cards stay readable */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.65)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 to-transparent lg:inset-y-0 lg:left-auto lg:right-0 lg:h-auto lg:w-[640px] lg:bg-gradient-to-l lg:from-black/75" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/85 via-black/50 to-transparent px-4 pt-4 pb-8 sm:px-8 sm:pt-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <div>
            <h1 className="font-display text-xl font-bold tracking-wide text-amber-100 drop-shadow sm:text-2xl">
              ⚖ {COURT_NAME}
            </h1>
            <p className="hidden text-xs text-stone-400 sm:block">{COURT_TAGLINE}</p>
          </div>
          <ProgressBar step={step} />
        </div>
      </header>

      <section className="absolute inset-x-0 bottom-0 z-10 flex max-h-[58dvh] flex-col overflow-y-auto px-4 pt-2 pb-4 sm:px-6 lg:inset-y-0 lg:right-0 lg:left-auto lg:max-h-none lg:w-[560px] lg:pt-32 lg:pr-8 lg:pb-8 lg:pl-0">
        <div className="my-auto w-full">
          {step === "file" && (
            <FileCasePanel value={caseFile} onChange={updateCase} onSubmit={() => setStep("defense")} />
          )}
          {step === "defense" && (
            <DefensePanel
              caseFile={caseFile}
              value={defendantStatement}
              onChange={setDefendantStatement}
              onBack={() => setStep("file")}
              onSubmit={() => {
                setJurorIndex(0);
                setStep("jury");
              }}
            />
          )}
          {step === "jury" && (
            <JuryPanel
              jurors={jurors}
              index={jurorIndex}
              onChange={updateJuror}
              onBack={() => (jurorIndex > 0 ? setJurorIndex(jurorIndex - 1) : setStep("defense"))}
              onNext={nextJuror}
            />
          )}
          {step === "deliberation" && <DeliberationPanel />}
          {step === "verdict" && submission && verdict && (
            <VerdictPanel submission={submission} verdict={verdict} onNewCase={startNewCase} />
          )}
          {step === "verdict" && submission && error && (
            <MistrialPanel message={error} onRetry={() => deliberate(submission)} onNewCase={startNewCase} />
          )}
        </div>
      </section>
    </main>
  );
}
