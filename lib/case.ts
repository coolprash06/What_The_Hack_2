export type Vote = "guilty" | "not_guilty";

export interface CaseFile {
  title: string;
  petitioner: string;
  defendant: string;
  petitionerStatement: string;
  punishmentRequested: string;
  jurorCount: number;
}

export interface JurorVote {
  name: string;
  vote: Vote;
  reason: string;
}

export interface CaseSubmission extends CaseFile {
  defendantStatement: string;
  jurors: JurorVote[];
}

export const MIN_JURORS = 1;
export const MAX_JURORS = 6;

export const LIMITS = {
  title: 100,
  name: 40,
  statement: 1500,
  punishment: 200,
  reason: 200,
} as const;

export function tallyVotes(jurors: JurorVote[]) {
  const guilty = jurors.filter((j) => j.vote === "guilty").length;
  return { guilty, notGuilty: jurors.length - guilty };
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : null;
}

function parseJuror(value: unknown): JurorVote | null {
  if (!value || typeof value !== "object") return null;
  const j = value as Record<string, unknown>;
  const name = text(j.name, LIMITS.name);
  const reason = text(j.reason, LIMITS.reason);
  if (!name || !reason || (j.vote !== "guilty" && j.vote !== "not_guilty")) return null;
  return { name, vote: j.vote, reason };
}

// Validates an untrusted request body into a complete case, or returns null.
export function parseCaseSubmission(body: unknown): CaseSubmission | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  const title = text(b.title, LIMITS.title);
  const petitioner = text(b.petitioner, LIMITS.name);
  const defendant = text(b.defendant, LIMITS.name);
  const petitionerStatement = text(b.petitionerStatement, LIMITS.statement);
  const punishmentRequested = text(b.punishmentRequested, LIMITS.punishment);
  const defendantStatement = text(b.defendantStatement, LIMITS.statement);
  if (
    !title ||
    !petitioner ||
    !defendant ||
    !petitionerStatement ||
    !punishmentRequested ||
    !defendantStatement
  ) {
    return null;
  }

  if (!Array.isArray(b.jurors)) return null;
  if (b.jurors.length < MIN_JURORS || b.jurors.length > MAX_JURORS) return null;
  const jurors = b.jurors.map(parseJuror);
  if (jurors.some((j) => j === null)) return null;

  return {
    title,
    petitioner,
    defendant,
    petitionerStatement,
    punishmentRequested,
    defendantStatement,
    jurors: jurors as JurorVote[],
    jurorCount: jurors.length,
  };
}
