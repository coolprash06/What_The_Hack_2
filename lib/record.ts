import { crossExaminers, type CrossExchange, type FinalSpeakerRole, type Party, type RecordEntry, type Vote, type WitnessSide } from "./case";

export interface RecordSources {
  petitioner: string;
  defendant: string;
  petitionerStatement: string;
  defendantStatement: string;
  witnesses: { name: string; side: WitnessSide; statement: string; cross: Record<Party, CrossExchange[]> }[];
  finalWords: { speaker: string; role: FinalSpeakerRole; round: number; text: string }[];
  votes: { name: string; vote: Vote; reason: string }[];
}

/**
 * The court record: everything said in the case, in the order it was said.
 * Anything not yet said (blank text) is left out, so this also works mid-case.
 */
export function buildRecord(s: RecordSources): RecordEntry[] {
  const entries: RecordEntry[] = [
    { speaker: s.petitioner, role: "petitioner", type: "statement", text: s.petitionerStatement },
    { speaker: s.defendant, role: "defendant", type: "statement", text: s.defendantStatement },
  ];
  for (const w of s.witnesses) {
    entries.push({ speaker: w.name, role: "witness", type: "testimony", text: w.statement });
    for (const party of crossExaminers(w.side)) {
      const questioner = party === "petitioner" ? s.petitioner : s.defendant;
      for (const { question, answer } of w.cross[party]) {
        entries.push({ speaker: questioner, role: party, type: "cross_question", text: question, addressee: w.name });
        entries.push({ speaker: w.name, role: "witness", type: "cross_answer", text: answer });
      }
    }
  }
  for (const f of s.finalWords) entries.push({ speaker: f.speaker, role: f.role, type: "final_words", text: f.text, round: f.round });
  for (const v of s.votes) entries.push({ speaker: v.name, role: "juror", type: "vote", text: v.reason, vote: v.vote });

  return entries
    .map((e) => ({ ...e, speaker: e.speaker.trim(), text: e.text.trim() }))
    .filter((e) => e.speaker && e.text);
}
