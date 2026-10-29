"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { crossExaminers, type CaseFile, type CaseSubmission, type JurorVote, type Party, type Witness } from "@/lib/case";
import { COURT_ERRORS, COURT_NAME, COURT_TAGLINE, FINAL_WORDS_LINES } from "@/lib/court";
import { buildRecord, type RecordSources } from "@/lib/record";
import { isVerdict, type Verdict } from "@/lib/verdict";
import { useCourt } from "@/state/courtStore";
import { CourtRecord } from "./CourtRecord";
import { COVERS_LABELS } from "./Pinned";
import { ProgressBar, STEPS, type Step } from "./ProgressBar";
import { SceneOverlay } from "./SceneOverlay";
import { StepNav } from "./StepNav";
import type { CourtFocus } from "./scene/CameraRig";
import type { Speaker } from "./scene/Courtroom";
import type { SeatState } from "./scene/Furniture";
import { DefensePanel } from "./panels/DefensePanel";
import { DeliberationPanel } from "./panels/DeliberationPanel";
import { FileCasePanel } from "./panels/FileCasePanel";
import {
  EMPTY_FINAL_DRAFT,
  FinalWordsPanel,
  isFinalDraftReady,
  type FinalWordsDraft,
  type Participant,
} from "./panels/FinalWordsPanel";
import { JuryPanel, type JurorDraft } from "./panels/JuryPanel";
import { MistrialPanel, VerdictPanel } from "./panels/VerdictPanel";
import {
  CrossExaminationPanel,
  EMPTY_CROSS_DRAFT,
  emptyWitness,
  isCrossDraftReady,
  isWitnessComplete,
  sideLabel,
  WitnessesPanel,
  WitnessForm,
  type CrossDraft,
  type CrossStage,
  type WitnessDraft,
} from "./panels/WitnessesPanel";
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

// Final words: the judge asks, then each participant answers in turn ("turn"),
// and the judge either asks again or closes and hands over to the jury.
type FinalPhase = "ask" | "turn" | "close";

/** One participant's answer in a round of final words: their statement, or null for "nothing to say". */
type FinalAnswer = string | null;

// The witness step: the list of witnesses, one witness's form, or a side
// cross-examining a witness (choosing, asking, then the witness answering).
type WitnessView =
  | { kind: "list" }
  | { kind: "form"; index: number }
  | { kind: "cross"; index: number; side: Party; stage: CrossStage };

type CrossView = Extract<WitnessView, { kind: "cross" }>;

const WITNESS_LIST: WitnessView = { kind: "list" };

// The questioner while they choose and ask; the witness stand while the witness answers.
const witnessViewFocus = (view: WitnessView): CourtFocus =>
  view.kind === "cross" && view.stage !== "answer" ? view.side : "witness";

const FOCUS_BY_STEP: Record<Exclude<Step, "final">, CourtFocus> = {
  file: "petitioner",
  defense: "defendant",
  witnesses: "witness",
  jury: "jury",
  deliberation: "bench",
  verdict: "bench",
};

const FOCUS_BY_ROLE: Record<Participant["role"], CourtFocus> = {
  petitioner: "petitioner",
  defendant: "defendant",
  witness: "witness",
};

const NAV_STEPS: Step[] = ["file", "defense", "witnesses", "final", "jury"];

const stepIndex = (step: Step) => STEPS.findIndex((s) => s.id === step);

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

/**
 * What a panel shows. Final words and the witness step also pin which
 * participant / witness view they show, so a panel fading out keeps its own.
 */
type PanelView = { step: Step; final?: { round: number; index: number }; witness?: WitnessView };

/** The panel on screen, which lags the step while the camera moves between shots. */
type PanelState = (PanelView & { leaving: boolean }) | null;

export function CourtApp() {
  const lampOn = useCourt((s) => s.lampOn);
  const [opening, setOpening] = useState<Opening>("lit");
  const [startReady, setStartReady] = useState(false);
  const [lookHint, setLookHint] = useState(false);

  const [step, setStep] = useState<Step>("file");
  const [caseFile, setCaseFile] = useState<CaseFile>(EMPTY_CASE);
  const [defendantStatement, setDefendantStatement] = useState("");
  const [witnesses, setWitnesses] = useState<WitnessDraft[]>([]);
  const [witnessView, setWitnessView] = useState<WitnessView>(WITNESS_LIST);
  const [crossDraft, setCrossDraft] = useState<CrossDraft>(EMPTY_CROSS_DRAFT);
  // Every round's answers, in participant order; the last round is the one in progress.
  const [finalRounds, setFinalRounds] = useState<FinalAnswer[][]>([[]]);
  const [finalPhase, setFinalPhase] = useState<FinalPhase>("ask");
  const [finalDraft, setFinalDraft] = useState<FinalWordsDraft>(EMPTY_FINAL_DRAFT);
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
  const [arrivedAt, setArrivedAt] = useState<CourtFocus | null>(null);
  const [panel, setPanel] = useState<PanelState>(null);
  const shotRef = useRef<CourtFocus>("wide");
  const panelRef = useRef<PanelState>(null);
  const pendingPanel = useRef<PanelView | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showPanel = useCallback((next: PanelState) => {
    panelRef.current = next;
    setPanel(next);
  }, []);

  const goTo = useCallback(
    (nextShot: CourtFocus, nextPanel: PanelView | null) => {
      clearTimeout(fadeTimer.current);
      if (nextShot === shotRef.current) {
        // Same camera position: swap the panel in place.
        pendingPanel.current = null;
        showPanel(nextPanel ? { ...nextPanel, leaving: false } : null);
        return;
      }
      pendingPanel.current = nextPanel;
      const moveCamera = () => {
        showPanel(null);
        shotRef.current = nextShot;
        setShot(nextShot);
        setArrivedAt(null);
      };
      const current = panelRef.current;
      if (current && !current.leaving) {
        showPanel({ ...current, leaving: true });
        fadeTimer.current = setTimeout(moveCamera, PANEL_FADE_MS);
      } else {
        moveCamera();
      }
    },
    [showPanel],
  );

  const handleArrive = useCallback(
    (arrived: CourtFocus) => {
      if (arrived !== shotRef.current) return;
      setArrivedAt(arrived);
      if (!pendingPanel.current) return;
      const next = pendingPanel.current;
      pendingPanel.current = null;
      showPanel({ ...next, leaving: false });
    },
    [showPanel],
  );

  const changeStep = (next: Exclude<Step, "final">) => {
    setStep(next);
    goTo(FOCUS_BY_STEP[next], { step: next });
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
    goTo(FOCUS_BY_STEP.file, { step: "file" });
  }, [goTo]);

  const updateCase = (patch: Partial<CaseFile>) => {
    setCaseFile((c) => ({ ...c, ...patch }));
    if (patch.jurorCount !== undefined) {
      const count = patch.jurorCount;
      setJurors((js) => Array.from({ length: count }, (_, i) => js[i] ?? emptyJuror()));
    }
  };

  // ---- Witnesses ----

  const showWitnessView = (view: WitnessView) => {
    setStep("witnesses");
    setWitnessView(view);
    goTo(witnessViewFocus(view), { step: "witnesses", witness: view });
  };

  const patchWitness = (index: number, patch: Partial<WitnessDraft>) =>
    setWitnesses((ws) => ws.map((w, i) => (i === index ? { ...w, ...patch } : w)));

  const addWitness = () => {
    setWitnesses((ws) => [...ws, emptyWitness()]);
    showWitnessView({ kind: "form", index: witnesses.length });
  };

  // Leaving a witness's form without saving drops it if it was never completed.
  const closeWitnessForm = (index: number) => {
    setWitnesses((ws) => ws.filter((w, i) => i !== index || isWitnessComplete(w)));
    showWitnessView(WITNESS_LIST);
  };

  // A saved witness goes straight to cross-examination by the other side (or both, if neutral).
  const saveWitness = (index: number) => {
    const examiners = crossExaminers(witnesses[index].side!);
    // Questions from a side that may no longer cross-examine (the witness changed sides) are dropped.
    const cross = witnesses[index].cross;
    patchWitness(index, {
      cross: {
        petitioner: examiners.includes("petitioner") ? cross.petitioner : [],
        defendant: examiners.includes("defendant") ? cross.defendant : [],
      },
    });
    setCrossDraft(EMPTY_CROSS_DRAFT);
    showWitnessView({ kind: "cross", index, side: examiners[0], stage: "choose" });
  };

  const submitCross = (view: CrossView) => {
    const { index, side, stage } = view;
    if (stage === "question") {
      showWitnessView({ ...view, stage: "answer" });
    } else if (stage === "answer") {
      const exchange = { question: crossDraft.question.trim(), answer: crossDraft.answer.trim() };
      const cross = witnesses[index].cross;
      patchWitness(index, { cross: { ...cross, [side]: [...cross[side], exchange] } });
      setCrossDraft(EMPTY_CROSS_DRAFT);
      showWitnessView({ ...view, stage: "choose" });
    } else if (crossDraft.choice === "ask") {
      setCrossDraft(EMPTY_CROSS_DRAFT);
      showWitnessView({ ...view, stage: "question" });
    } else {
      // This side is done: the next side may cross-examine, or it's back to the witness list.
      const examiners = crossExaminers(witnesses[index].side!);
      const next = examiners[examiners.indexOf(side) + 1];
      setCrossDraft(EMPTY_CROSS_DRAFT);
      showWitnessView(next ? { kind: "cross", index, side: next, stage: "choose" } : WITNESS_LIST);
    }
  };

  // Back through cross-examination: answer -> question -> choice -> the previous
  // exchange (reopened for editing) -> the previous side -> the witness's form.
  const backCross = (view: CrossView) => {
    const { index, side, stage } = view;
    if (stage === "answer") return showWitnessView({ ...view, stage: "question" });
    if (stage === "question") {
      setCrossDraft((d) => ({ ...d, choice: "ask" }));
      return showWitnessView({ ...view, stage: "choose" });
    }
    const witness = witnesses[index];
    const examiners = crossExaminers(witness.side!);
    const reopen = (party: Party) => {
      const exchanges = witness.cross[party];
      const last = exchanges.at(-1);
      if (!last) return false;
      patchWitness(index, { cross: { ...witness.cross, [party]: exchanges.slice(0, -1) } });
      setCrossDraft({ choice: "ask", ...last });
      showWitnessView({ kind: "cross", index, side: party, stage: "answer" });
      return true;
    };
    if (reopen(side)) return;
    const previous = examiners[examiners.indexOf(side) - 1];
    if (!previous) return showWitnessView({ kind: "form", index });
    if (reopen(previous)) return;
    setCrossDraft({ ...EMPTY_CROSS_DRAFT, choice: "stop" });
    showWitnessView({ kind: "cross", index, side: previous, stage: "choose" });
  };

  // ---- Final words ----

  const savedWitnesses: Witness[] = witnesses.filter(isWitnessComplete).map((w) => ({
    name: w.name.trim(),
    side: w.side!,
    relationship: w.relationship.trim(),
    statement: w.statement.trim(),
  }));

  const participants: Participant[] = [
    { role: "petitioner", name: caseFile.petitioner.trim(), title: "Petitioner" },
    { role: "defendant", name: caseFile.defendant.trim(), title: "Defendant" },
    ...savedWitnesses.map((w) => ({ role: "witness" as const, name: w.name, title: `Witness · ${sideLabel(w.side, caseFile)}` })),
  ];

  const finalRound = finalRounds.length - 1;
  const finalTurn = finalRounds[finalRound].length;
  const asking = step === "final" && finalPhase === "turn" ? participants[finalTurn] : undefined;

  const askParticipant = (round: number, index: number) => {
    setStep("final");
    setFinalPhase("turn");
    goTo(FOCUS_BY_ROLE[participants[index].role], { step: "final", final: { round, index } });
  };

  const startFinalWords = () => {
    setFinalRounds([[]]);
    setFinalPhase("ask");
    setFinalDraft(EMPTY_FINAL_DRAFT);
    setStep("final");
    goTo("judge", null);
  };

  const answerFinalWords = () => {
    const answer: FinalAnswer = finalDraft.choice === "speak" ? finalDraft.text.trim() : null;
    const answers = [...finalRounds[finalRound], answer];
    const rounds = [...finalRounds.slice(0, -1), answers];
    setFinalDraft(EMPTY_FINAL_DRAFT);
    if (answers.length < participants.length) {
      setFinalRounds(rounds);
      askParticipant(finalRound, answers.length);
      return;
    }
    // Everyone has answered: anything new means the judge asks again.
    const anyoneSpoke = answers.some((a) => a !== null);
    setFinalRounds(anyoneSpoke ? [...rounds, []] : rounds);
    setFinalPhase(anyoneSpoke ? "ask" : "close");
    goTo("judge", null);
  };

  // Steps back to the most recent answer so it can be changed. False if nobody has answered yet.
  const undoFinalAnswer = () => {
    // An empty trailing round means the judge was about to ask again: undo into the round before it.
    const rounds = finalRounds.length > 1 && finalRounds[finalRound].length === 0 ? finalRounds.slice(0, -1) : finalRounds;
    const last = rounds[rounds.length - 1];
    if (!last.length) return false;
    const answer = last[last.length - 1];
    setFinalRounds([...rounds.slice(0, -1), last.slice(0, -1)]);
    setFinalDraft(answer === null ? { choice: "nothing", text: "" } : { choice: "speak", text: answer });
    askParticipant(rounds.length - 1, last.length - 1);
    return true;
  };

  const finalWords: RecordSources["finalWords"] = finalRounds.flatMap((answers, round) =>
    answers.flatMap((text, i) =>
      text === null ? [] : [{ speaker: participants[i].name, role: participants[i].role, round: round + 1, text }],
    ),
  );

  // ---- Court record ----

  const recordSources = (votes: RecordSources["votes"]): RecordSources => ({
    petitioner: caseFile.petitioner,
    defendant: caseFile.defendant,
    petitionerStatement: caseFile.petitionerStatement,
    defendantStatement,
    witnesses: witnesses.filter(isWitnessComplete).map((w) => ({ name: w.name, side: w.side!, statement: w.statement, cross: w.cross })),
    finalWords,
    votes,
  });

  const jurorVotes = (count: number): JurorVote[] =>
    jurors.slice(0, count).map((j, i) => ({
      name: j.name.trim() || `Juror #${i + 1}`,
      vote: j.vote ?? "not_guilty",
      reason: j.reason.trim(),
    }));

  // The transcript so far: jurors appear once they have voted and moved on.
  const votesSoFar = step === "jury" ? jurorIndex : stepIndex(step) > stepIndex("jury") ? jurors.length : 0;
  const courtRecord = buildRecord(recordSources(jurorVotes(votesSoFar)));

  const finalSpeech =
    step === "final" && finalPhase !== "turn" && arrivedAt === "judge"
      ? finalPhase === "ask"
        ? {
            key: `ask-${finalRound}`,
            text:
              finalRound === 0
                ? FINAL_WORDS_LINES.firstAsk
                : FINAL_WORDS_LINES.askAgain[(finalRound - 1) % FINAL_WORDS_LINES.askAgain.length],
          }
        : { key: `close-${finalRound}`, text: FINAL_WORDS_LINES.close[finalRound % FINAL_WORDS_LINES.close.length] }
      : null;

  // ---- Jury and verdict ----

  const updateJuror = (patch: Partial<JurorDraft>) =>
    setJurors((js) => js.map((j, i) => (i === jurorIndex ? { ...j, ...patch } : j)));

  const startJury = () => {
    setJurorIndex(0);
    changeStep("jury");
  };

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
    const votes = jurorVotes(jurors.length);
    deliberate({
      ...caseFile,
      defendantStatement,
      witnesses: savedWitnesses,
      jurors: votes,
      record: buildRecord(recordSources(votes)),
    });
  };

  // The judge's line has finished: move on to whoever is next.
  const onJudgeSpeechDone = () => {
    if (opening === "intro") finishIntro();
    else if (finalPhase === "ask") askParticipant(finalRound, 0);
    else if (finalPhase === "close") startJury();
  };
  // SpeechBubble restarts its closing pause if this callback changes, so hand it a stable one.
  const speechDone = useRef(onJudgeSpeechDone);
  useEffect(() => {
    speechDone.current = onJudgeSpeechDone;
  });
  const handleSpeechDone = useCallback(() => speechDone.current(), []);

  const back = () => {
    if (step === "defense") changeStep("file");
    else if (step === "witnesses") {
      if (witnessView.kind === "form") closeWitnessForm(witnessView.index);
      else if (witnessView.kind === "cross") backCross(witnessView);
      else changeStep("defense");
    } else if (step === "final") {
      if (!undoFinalAnswer()) showWitnessView(WITNESS_LIST);
    } else if (step === "jury") {
      if (jurorIndex > 0) setJurorIndex(jurorIndex - 1);
      else undoFinalAnswer();
    }
  };

  const startNewCase = () => {
    trialId.current++;
    setCaseFile(EMPTY_CASE);
    setDefendantStatement("");
    setWitnesses([]);
    setWitnessView(WITNESS_LIST);
    setCrossDraft(EMPTY_CROSS_DRAFT);
    setFinalRounds([[]]);
    setFinalPhase("ask");
    setFinalDraft(EMPTY_FINAL_DRAFT);
    setJurors(Array.from({ length: EMPTY_CASE.jurorCount }, emptyJuror));
    setJurorIndex(0);
    setSubmission(null);
    setVerdict(null);
    setError(null);
    changeStep("file");
  };

  const juror = jurors[jurorIndex];
  const crossView = step === "witnesses" && witnessView.kind === "cross" ? witnessView : undefined;
  // The witness being entered or cross-examined.
  const activeWitness = step === "witnesses" && witnessView.kind !== "list" ? witnesses[witnessView.index] : undefined;
  const editingWitness = witnessView.kind === "form" ? activeWitness : undefined;
  const canNext =
    step === "file"
      ? filled(caseFile.title, caseFile.petitioner, caseFile.defendant, caseFile.petitionerStatement, caseFile.punishmentRequested)
      : step === "defense"
        ? filled(defendantStatement)
        : step === "witnesses"
          ? crossView
            ? isCrossDraftReady(crossView.stage, crossDraft)
            : !editingWitness || isWitnessComplete(editingWitness)
          : step === "final"
            ? isFinalDraftReady(finalDraft)
            : step === "jury"
              ? filled(juror.name, juror.reason) && juror.vote !== null
              : false;
  const nextLabel =
    step === "witnesses"
      ? crossView
        ? crossView.stage === "question"
          ? "Ask"
          : crossView.stage === "answer"
            ? "Record answer"
            : "Next"
        : editingWitness
          ? "Save witness"
          : witnesses.length
          ? "To final words"
          : "No witnesses"
      : step === "jury" && jurorIndex === jurors.length - 1
        ? "To deliberation"
        : "Next";

  const inCase = opening === "case";
  // Once the case has moved past the witness step with nobody called, the stand stays empty.
  const witnessPresent = !(inCase && stepIndex(step) > stepIndex("witnesses") && savedWitnesses.length === 0);
  // The witness on the stand: whoever is being entered or asked, otherwise the last one called.
  // (Participants are the petitioner, the defendant, then the witnesses in order.)
  const standingWitness: Pick<WitnessDraft, "name" | "side"> | undefined =
    activeWitness ?? (asking?.role === "witness" ? savedWitnesses[finalTurn - 2] : savedWitnesses.at(-1));

  const speaker: Speaker | null =
    opening === "intro"
      ? "judge"
      : !inCase
        ? null
        : step === "file"
          ? "petitioner"
          : step === "defense"
            ? "defendant"
            : step === "witnesses"
              ? // In cross-examination the questioner speaks, then the witness answers.
                crossView && crossView.stage !== "answer"
                ? crossView.side
                : "witness"
              : step === "final"
                ? (asking?.role ?? "judge")
                : step === "jury"
                  ? `juror-${jurorIndex}`
                  : "judge";

  const seats: SeatState[] = jurors.map((j, i) => {
    if (!inCase || stepIndex(step) < stepIndex("jury")) return "pending";
    if (step === "jury" && i === jurorIndex) return "current";
    return j.vote ?? "pending";
  });

  const panelStep = panel?.step;
  const panelFinal = panel?.final;
  const showNav =
    !!panel && !panel.leaving && panel.step === step && NAV_STEPS.includes(step) && (step !== "final" || finalPhase === "turn");
  const panelWitness = panel?.witness ?? WITNESS_LIST;
  const panelKey = `${panel?.step}-${panelStep === "witnesses" ? JSON.stringify(panelWitness) : ""}-${panelFinal?.round ?? ""}-${panelFinal?.index ?? ""}`;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#0a0605] text-stone-100">
      <div className="absolute inset-0">
        <Courtroom
          focus={shot}
          onArrive={handleArrive}
          seats={seats}
          gavelActive={inCase && step === "deliberation"}
          speaker={speaker}
          witnessPresent={witnessPresent}
        />
      </div>
      <SceneOverlay
        names={{
          petitioner: caseFile.petitioner.trim(),
          defendant: caseFile.defendant.trim(),
          witness: standingWitness?.name.trim() ?? "",
          jurors: jurors.map((j) => j.name.trim()),
        }}
        witnessSubtitle={standingWitness?.side ? `Witness · ${sideLabel(standingWitness.side, caseFile)}` : undefined}
        witnessPresent={witnessPresent}
        jurorCount={jurors.length}
        speaker={speaker}
        judgeSpeech={opening === "intro" ? { key: "opening", text: OPENING_LINE } : finalSpeech}
        onJudgeSpeechDone={handleSpeechDone}
      />

      {/* Darken the edges and the panel side so the cards stay readable */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.55)_100%)]" />
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-700 lg:inset-y-0 lg:left-auto lg:right-0 lg:h-auto lg:w-[640px] lg:bg-gradient-to-l lg:from-black/75 ${
          inCase ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Above the step panel (so the court record can open over it), below Back/Next. */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-[15] bg-gradient-to-b from-black/85 via-black/50 to-transparent px-4 pt-4 pb-8 sm:px-8 sm:pt-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <div className="shrink-0">
            <h1 className="font-display text-xl font-bold tracking-wide text-amber-100 drop-shadow sm:text-2xl">
              ⚖ {COURT_NAME}
            </h1>
            <p className="hidden text-xs text-stone-400 sm:block">{COURT_TAGLINE}</p>
            {inCase && <CourtRecord entries={courtRecord} />}
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
        <section className="absolute inset-x-0 bottom-0 z-10 flex max-h-[58dvh] flex-col overflow-y-auto px-4 pt-2 pb-24 sm:px-6 lg:top-32 lg:right-0 lg:bottom-0 lg:left-auto lg:max-h-none lg:w-[560px] lg:pt-0 lg:pr-8 lg:pb-24 lg:pl-0">
          <div key={panelKey} {...COVERS_LABELS} className={`my-auto w-full ${panel.leaving ? "panel-out" : "panel-in"}`}>
            {panelStep === "file" && (
              <FileCasePanel value={caseFile} onChange={updateCase} onSubmit={() => changeStep("defense")} />
            )}
            {panelStep === "defense" && (
              <DefensePanel
                caseFile={caseFile}
                value={defendantStatement}
                onChange={setDefendantStatement}
                onSubmit={() => showWitnessView(WITNESS_LIST)}
              />
            )}
            {panelStep === "witnesses" && panelWitness.kind === "form" && witnesses[panelWitness.index] && (
              <WitnessForm
                caseFile={caseFile}
                witness={witnesses[panelWitness.index]}
                index={panelWitness.index}
                onChange={(patch) => patchWitness(panelWitness.index, patch)}
                onSave={() => saveWitness(panelWitness.index)}
              />
            )}
            {panelStep === "witnesses" && panelWitness.kind === "cross" && witnesses[panelWitness.index] && (
              <CrossExaminationPanel
                witness={witnesses[panelWitness.index]}
                questioner={panelWitness.side === "petitioner" ? caseFile.petitioner : caseFile.defendant}
                side={panelWitness.side}
                stage={panelWitness.stage}
                value={crossDraft}
                onChange={(patch) => setCrossDraft((d) => ({ ...d, ...patch }))}
                onSubmit={() => submitCross(panelWitness)}
              />
            )}
            {panelStep === "witnesses" && panelWitness.kind === "list" && (
              <WitnessesPanel
                caseFile={caseFile}
                witnesses={witnesses}
                onAdd={addWitness}
                onEdit={(index) => showWitnessView({ kind: "form", index })}
                onRemove={(index) => setWitnesses((ws) => ws.filter((_, i) => i !== index))}
                onDone={startFinalWords}
              />
            )}
            {panelStep === "final" && panelFinal && participants[panelFinal.index] && (
              <FinalWordsPanel
                participant={participants[panelFinal.index]}
                round={panelFinal.round}
                index={panelFinal.index}
                total={participants.length}
                value={finalDraft}
                onChange={(patch) => setFinalDraft((d) => ({ ...d, ...patch }))}
                onSubmit={answerFinalWords}
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
