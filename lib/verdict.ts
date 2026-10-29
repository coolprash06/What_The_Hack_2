import { CONSTITUTION } from "./constitution";
import { tallyVotes, type JurorVote } from "./case";

export type VerdictOutcome = "GUILTY" | "NOT GUILTY";

export interface ViolatedArticle {
  number: number;
  title: string;
  explanation: string;
}

export interface Verdict {
  summary: { petitioner: string; defendant: string };
  juryTally: { guilty: number; notGuilty: number };
  verdict: VerdictOutcome;
  articlesViolated: ViolatedArticle[];
  punishment: string;
  closingRemark: string;
}

const isText = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;
const asRecord = (v: unknown) =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

// Strict shape check, used by the client before rendering a verdict.
export function isVerdict(value: unknown): value is Verdict {
  const v = asRecord(value);
  const summary = asRecord(v?.summary);
  const tally = asRecord(v?.juryTally);
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
    isText(v.punishment) &&
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

function parseArticle(entry: unknown): ViolatedArticle | null {
  // Models sometimes return bare numbers or "Article 1" instead of objects.
  const record = asRecord(entry);
  const rawNumber = record ? record.number : entry;
  const number = Number(String(rawNumber ?? "").replace(/\D/g, ""));
  const article = CONSTITUTION.find((a) => a.number === number);
  if (!article) return null; // invented articles are struck from the record
  const explanation = record && isText(record.explanation) ? record.explanation.trim() : article.rule;
  return { number, title: article.title, explanation };
}

// Turns the model's raw JSON into a trusted Verdict. Prose comes from the model;
// facts (the tally, article titles) come from the real case data.
export function normalizeVerdict(raw: unknown, jurors: JurorVote[]): Verdict | null {
  const r = asRecord(raw);
  const summary = asRecord(r?.summary);
  const outcome = parseOutcome(r?.verdict);
  if (
    !r ||
    !summary ||
    !isText(summary.petitioner) ||
    !isText(summary.defendant) ||
    !outcome ||
    !isText(r.punishment) ||
    !isText(r.closingRemark)
  ) {
    return null;
  }

  const articles = new Map<number, ViolatedArticle>();
  if (outcome === "GUILTY" && Array.isArray(r.articlesViolated)) {
    for (const entry of r.articlesViolated) {
      const article = parseArticle(entry);
      if (article && !articles.has(article.number)) articles.set(article.number, article);
    }
  }

  return {
    summary: { petitioner: summary.petitioner.trim(), defendant: summary.defendant.trim() },
    juryTally: tallyVotes(jurors),
    verdict: outcome,
    articlesViolated: [...articles.values()],
    punishment: r.punishment.trim(),
    closingRemark: r.closingRemark.trim(),
  };
}
