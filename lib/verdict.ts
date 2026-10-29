import { CONSTITUTION } from "./constitution";
import { tallyVotes, type CaseSubmission } from "./case";

export type VerdictOutcome = "GUILTY" | "NOT GUILTY";

export interface ViolatedArticle {
  number: number;
  title: string;
  explanation: string;
}

export const MAX_CREDIBILITY = 10;

export interface WitnessAssessment {
  name: string;
  /** 0 (a shameless liar) to MAX_CREDIBILITY (beyond reproach). */
  credibility: number;
  comment: string;
}

export type PunishmentAdjustmentType = "none" | "reduced" | "increased";

export interface PunishmentAdjustment {
  type: PunishmentAdjustmentType;
  /** What was reduced or increased, and why. Empty when type is "none". */
  reason: string;
}

export interface JuryOverruled {
  overruled: boolean;
  /** Why the judge went against the jury's majority. Empty when not overruled. */
  reason: string;
}

export interface Verdict {
  summary: { petitioner: string; defendant: string };
  juryTally: { guilty: number; notGuilty: number };
  verdict: VerdictOutcome;
  articlesViolated: ViolatedArticle[];
  /** One per witness, in the order they testified. Empty when there were none. */
  witnessAssessments: WitnessAssessment[];
  punishment: string;
  /** Article numbers the punishment is taken from. Empty when NOT GUILTY. */
  punishmentArticles: number[];
  punishmentAdjustment: PunishmentAdjustment;
  juryOverruled: JuryOverruled;
  closingRemark: string;
}

const ADJUSTMENT_TYPES: PunishmentAdjustmentType[] = ["none", "reduced", "increased"];

const isText = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
const isCredibility = (v: unknown): v is number => isCount(v) && v <= MAX_CREDIBILITY;
const asRecord = (v: unknown) =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

// Strict shape check, used by the client before rendering a verdict.
export function isVerdict(value: unknown): value is Verdict {
  const v = asRecord(value);
  const summary = asRecord(v?.summary);
  const tally = asRecord(v?.juryTally);
  const adjustment = asRecord(v?.punishmentAdjustment);
  const overruled = asRecord(v?.juryOverruled);
  return (
    !!v &&
    !!summary &&
    isText(summary.petitioner) &&
    isText(summary.defendant) &&
    !!tally &&
    isCount(tally.guilty) &&
    isCount(tally.notGuilty) &&
    (v.verdict === "GUILTY" || v.verdict === "NOT GUILTY") &&
    Array.isArray(v.articlesViolated) &&
    v.articlesViolated.every((a) => {
      const article = asRecord(a);
      return !!article && isCount(article.number) && isText(article.title) && isText(article.explanation);
    }) &&
    Array.isArray(v.witnessAssessments) &&
    v.witnessAssessments.every((w) => {
      const assessment = asRecord(w);
      return !!assessment && isText(assessment.name) && isCredibility(assessment.credibility) && isText(assessment.comment);
    }) &&
    isText(v.punishment) &&
    Array.isArray(v.punishmentArticles) &&
    v.punishmentArticles.every(isCount) &&
    !!adjustment &&
    ADJUSTMENT_TYPES.includes(adjustment.type as PunishmentAdjustmentType) &&
    (adjustment.type === "none" || isText(adjustment.reason)) &&
    !!overruled &&
    typeof overruled.overruled === "boolean" &&
    (!overruled.overruled || isText(overruled.reason)) &&
    isText(v.closingRemark)
  );
}

function parseOutcome(value: unknown): VerdictOutcome | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase().replace(/[_-]+/g, " ");
  if (normalized === "GUILTY") return "GUILTY";
  if (normalized === "NOT GUILTY") return "NOT GUILTY";
  return null;
}

// Models sometimes return bare numbers or "Article 1" instead of objects.
function articleNumber(entry: unknown): number {
  const record = asRecord(entry);
  const rawNumber = record ? record.number : entry;
  return Number(String(rawNumber ?? "").replace(/\D/g, ""));
}

function parseArticle(entry: unknown): ViolatedArticle | null {
  const record = asRecord(entry);
  const number = articleNumber(entry);
  const article = CONSTITUTION.find((a) => a.number === number);
  if (!article) return null; // invented articles are struck from the record
  const explanation = record && isText(record.explanation) ? record.explanation.trim() : article.rule;
  return { number, title: article.title, explanation };
}

function parseCredibility(value: unknown): number | null {
  // Accepts 7, 7.5, "7" or "7/10".
  const match = typeof value === "number" ? [String(value)] : typeof value === "string" ? value.match(/\d+(\.\d+)?/) : null;
  if (!match) return null;
  const score = Math.round(Number(match[0]));
  return score >= 0 && score <= MAX_CREDIBILITY ? score : null;
}

// One assessment per real witness, matched by name (or else by position).
// Returns null if any witness is missing a usable rating or comment.
function parseWitnessAssessments(raw: unknown, witnesses: CaseSubmission["witnesses"]): WitnessAssessment[] | null {
  if (!witnesses.length) return [];
  if (!Array.isArray(raw)) return null;
  const entries = raw.map(asRecord);
  const nameOf = (e: Record<string, unknown> | null) => (typeof e?.name === "string" ? e.name.trim().toLowerCase() : "");
  const names = witnesses.map((w) => w.name.trim().toLowerCase());
  const used = new Set<Record<string, unknown>>();
  const assessments: WitnessAssessment[] = [];
  for (const [i, witness] of witnesses.entries()) {
    // The entry named for this witness, else the one in its position if that isn't named for someone else.
    const byName = entries.find((e) => e && !used.has(e) && nameOf(e) === names[i]);
    const byPosition = entries[i] && !used.has(entries[i]) && !names.includes(nameOf(entries[i])) ? entries[i] : null;
    const entry = byName ?? byPosition;
    if (entry) used.add(entry);
    const credibility = parseCredibility(entry?.credibility);
    if (!entry || credibility === null || !isText(entry.comment)) return null;
    assessments.push({ name: witness.name, credibility, comment: entry.comment.trim() });
  }
  return assessments;
}

function parseAdjustment(raw: unknown): PunishmentAdjustment | null {
  // Accepts { type, reason } or a bare "reduced".
  const record = asRecord(raw);
  const rawType = record ? record.type : raw;
  const type = ADJUSTMENT_TYPES.find((t) => typeof rawType === "string" && rawType.trim().toLowerCase() === t);
  if (!type) return null;
  if (type === "none") return { type, reason: "" };
  return record && isText(record.reason) ? { type, reason: record.reason.trim() } : null;
}

export type NormalizeResult = { ok: true; verdict: Verdict } | { ok: false; reason: string };

const invalid = (reason: string): NormalizeResult => ({ ok: false, reason });

// Turns the model's raw JSON into a trusted Verdict, or says why it can't.
// Prose comes from the model; facts (the tally, article titles, witness names,
// whether the jury was overruled) come from the real case data.
export function normalizeVerdict(raw: unknown, submission: CaseSubmission): NormalizeResult {
  const r = asRecord(raw);
  if (!r) return invalid("response is not a JSON object");
  const summary = asRecord(r.summary);
  if (!summary || !isText(summary.petitioner) || !isText(summary.defendant)) return invalid("summary is missing or incomplete");
  const outcome = parseOutcome(r.verdict);
  if (!outcome) return invalid(`verdict is not GUILTY or NOT GUILTY (got ${JSON.stringify(r.verdict)})`);
  const witnessAssessments = parseWitnessAssessments(r.witnessAssessments, submission.witnesses);
  if (!witnessAssessments) return invalid("witnessAssessments is missing a usable entry for some witness");
  if (!isText(r.punishment)) return invalid("punishment is missing");
  if (!isText(r.closingRemark)) return invalid("closingRemark is missing");

  const guilty = outcome === "GUILTY";
  const articles = new Map<number, ViolatedArticle>();
  if (guilty && Array.isArray(r.articlesViolated)) {
    for (const entry of r.articlesViolated) {
      const article = parseArticle(entry);
      if (article && !articles.has(article.number)) articles.set(article.number, article);
    }
  }

  // Every punishment must come from the Constitution.
  const punishmentArticles = guilty
    ? [...new Set((Array.isArray(r.punishmentArticles) ? r.punishmentArticles : []).map(articleNumber))].filter((n) =>
        CONSTITUTION.some((a) => a.number === n),
      )
    : [];
  if (guilty && !punishmentArticles.length) return invalid("GUILTY but punishmentArticles names no real article");

  const adjustment = guilty ? parseAdjustment(r.punishmentAdjustment) : { type: "none" as const, reason: "" };
  if (!adjustment) return invalid("punishmentAdjustment is not none/reduced/increased with a reason");

  // Whether the jury was overruled is a fact; the model only supplies the reason.
  const tally = tallyVotes(submission.jurors);
  const majority = tally.guilty === tally.notGuilty ? null : tally.guilty > tally.notGuilty;
  const overruled = majority !== null && majority !== guilty;
  const overruledReason = asRecord(r.juryOverruled)?.reason;
  if (overruled && !isText(overruledReason)) return invalid("verdict goes against the jury majority but juryOverruled gives no reason");

  return {
    ok: true,
    verdict: {
      summary: { petitioner: summary.petitioner.trim(), defendant: summary.defendant.trim() },
      juryTally: tally,
      verdict: outcome,
      articlesViolated: [...articles.values()],
      witnessAssessments,
      punishment: r.punishment.trim(),
      punishmentArticles,
      punishmentAdjustment: adjustment,
      juryOverruled: { overruled, reason: overruled ? (overruledReason as string).trim() : "" },
      closingRemark: r.closingRemark.trim(),
    },
  };
}
