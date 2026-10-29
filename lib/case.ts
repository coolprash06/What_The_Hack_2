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

export type WitnessSide = "petitioner" | "defendant" | "neutral";

export const WITNESS_SIDES: WitnessSide[] = ["petitioner", "defendant", "neutral"];

export interface Witness {
  name: string;
  side: WitnessSide;
  /** e.g. "petitioner's best friend" */
  relationship: string;
  statement: string;
}

export type FinalSpeakerRole = "petitioner" | "defendant" | "witness";

/** The two sides of the case, who may cross-examine witnesses. */
export type Party = "petitioner" | "defendant";

export interface CrossExchange {
  question: string;
  answer: string;
}

/** Who may cross-examine a witness, in order: the other side, or both for a neutral witness. */
export function crossExaminers(side: WitnessSide): Party[] {
  if (side === "petitioner") return ["defendant"];
  if (side === "defendant") return ["petitioner"];
  return ["petitioner", "defendant"];
}

export type RecordRole = "petitioner" | "defendant" | "witness" | "juror";

export type RecordType =
  | "statement" // the petitioner's or defendant's opening statement
  | "testimony" // a witness's statement
  | "cross_question"
  | "cross_answer"
  | "final_words"
  | "vote";

export const RECORD_ROLES: RecordRole[] = ["petitioner", "defendant", "witness", "juror"];
export const RECORD_TYPES: RecordType[] = ["statement", "testimony", "cross_question", "cross_answer", "final_words", "vote"];

/** One entry in the court record: everything said in the case, in order. */
export interface RecordEntry {
  speaker: string;
  role: RecordRole;
  type: RecordType;
  text: string;
  /** cross_question: the witness being questioned. */
  addressee?: string;
  /** final_words: 1-based round of "does anyone wish to say anything more?" */
  round?: number;
  /** vote: how the juror voted (text is their reason). */
  vote?: Vote;
}

export interface CaseSubmission extends CaseFile {
  defendantStatement: string;
  witnesses: Witness[];
  jurors: JurorVote[];
  /** The full transcript, in order. The judge reads the case from this. */
  record: RecordEntry[];
}

export const MIN_JURORS = 1;
export const MAX_JURORS = 6;
export const MAX_WITNESSES = 6;
export const MAX_RECORD_ENTRIES = 400;

export const LIMITS = {
  title: 100,
  name: 40,
  statement: 1500,
  punishment: 200,
  reason: 200,
  relationship: 100,
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

function parseWitness(value: unknown): Witness | null {
  if (!value || typeof value !== "object") return null;
  const w = value as Record<string, unknown>;
  const name = text(w.name, LIMITS.name);
  const relationship = text(w.relationship, LIMITS.relationship);
  const statement = text(w.statement, LIMITS.statement);
  const side = WITNESS_SIDES.find((s) => s === w.side);
  if (!name || !relationship || !statement || !side) return null;
  return { name, side, relationship, statement };
}

function parseRecordEntry(value: unknown): RecordEntry | null {
  if (!value || typeof value !== "object") return null;
  const e = value as Record<string, unknown>;
  const speaker = text(e.speaker, LIMITS.name);
  const role = RECORD_ROLES.find((r) => r === e.role);
  const type = RECORD_TYPES.find((t) => t === e.type);
  const entryText = text(e.text, LIMITS.statement);
  if (!speaker || !role || !type || !entryText) return null;
  const entry: RecordEntry = { speaker, role, type, text: entryText };
  if (type === "cross_question") {
    const addressee = text(e.addressee, LIMITS.name);
    if (!addressee) return null;
    entry.addressee = addressee;
  }
  if (type === "final_words") {
    if (!Number.isInteger(e.round) || (e.round as number) < 1) return null;
    entry.round = e.round as number;
  }
  if (type === "vote") {
    if (e.vote !== "guilty" && e.vote !== "not_guilty") return null;
    entry.vote = e.vote;
  }
  return entry;
}

/** Parses every entry of an optional list, or returns null if the list or any entry is invalid. */
function parseList<T>(value: unknown, max: number, parse: (entry: unknown) => T | null): T[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > max) return null;
  const items = value.map(parse);
  return items.some((item) => item === null) ? null : (items as T[]);
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

  const witnesses = parseList(b.witnesses, MAX_WITNESSES, parseWitness);
  const record = parseList(b.record, MAX_RECORD_ENTRIES, parseRecordEntry);
  if (!witnesses || !record?.length) return null;

  return {
    title,
    petitioner,
    defendant,
    petitionerStatement,
    punishmentRequested,
    defendantStatement,
    witnesses,
    record,
    jurors: jurors as JurorVote[],
    jurorCount: jurors.length,
  };
}
