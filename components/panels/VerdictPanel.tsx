import type { ReactNode } from "react";
import type { CaseSubmission } from "@/lib/case";
import { CONSTITUTION } from "@/lib/constitution";
import { COURT_NAME } from "@/lib/court";
import { MAX_CREDIBILITY, type Verdict } from "@/lib/verdict";
import { downloadVerdictPdf } from "@/lib/verdictPdf";
import { Button, Card, PanelHeading } from "../ui";
import { sideLabel } from "./WitnessesPanel";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-amber-200/10 pt-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300/80">{title}</h3>
      {children}
    </section>
  );
}

export function VerdictPanel({
  submission,
  verdict,
  onNewCase,
}: {
  submission: CaseSubmission;
  verdict: Verdict;
  onNewCase: () => void;
}) {
  const guilty = verdict.verdict === "GUILTY";
  const { juryTally } = verdict;

  return (
    <Card className="fade-in">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300/80">{COURT_NAME}</p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.3em] text-stone-400">Official Verdict</p>
        <h2 className="mt-3 font-display text-2xl font-bold text-amber-50 sm:text-3xl">{submission.title}</h2>
        <p className="mt-1 text-sm text-stone-300">
          {submission.petitioner} <span className="italic text-stone-500">v.</span> {submission.defendant}
        </p>
        <div
          className={`stamp-in mx-auto my-6 inline-block -rotate-3 rounded-md border-4 px-6 py-2 font-display text-3xl font-black tracking-[0.15em] sm:text-4xl ${
            guilty
              ? "border-red-500 text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.35)]"
              : "border-emerald-500 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
          }`}
        >
          {verdict.verdict}
        </div>
      </div>

      <div className="space-y-4 text-sm leading-relaxed text-stone-200">
        <Section title="Summary of the case">
          <p>
            <span className="font-semibold text-sky-300">{submission.petitioner}:</span> {verdict.summary.petitioner}
          </p>
          <p className="mt-2">
            <span className="font-semibold text-rose-300">{submission.defendant}:</span> {verdict.summary.defendant}
          </p>
        </Section>

        <Section title={`Jury tally · ${juryTally.guilty} guilty, ${juryTally.notGuilty} not guilty`}>
          <ul className="space-y-1.5">
            {submission.jurors.map((j, i) => (
              <li key={i} className="flex gap-2">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${j.vote === "guilty" ? "bg-red-500" : "bg-emerald-500"}`}
                />
                <span>
                  <span className="font-semibold">{j.name}</span>{" "}
                  <span className="text-stone-400">({j.vote === "guilty" ? "Guilty" : "Not Guilty"})</span>: “{j.reason}”
                </span>
              </li>
            ))}
          </ul>
          {verdict.juryOverruled.overruled && (
            <p className="mt-3 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-stone-200">
              <span className="font-display font-bold tracking-wide text-red-300">The court overrules the jury.</span>{" "}
              {verdict.juryOverruled.reason}
            </p>
          )}
        </Section>

        <Section title="Articles violated">
          {verdict.articlesViolated.length ? (
            <ul className="space-y-2">
              {verdict.articlesViolated.map((a) => (
                <li key={a.number}>
                  <p className="font-semibold text-amber-100">
                    Article {a.number}: {a.title}
                  </p>
                  <p className="text-stone-300">{a.explanation}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-stone-400 italic">No articles of the Constitution were violated.</p>
          )}
        </Section>

        {verdict.mitigatingFactors.length > 0 && (
          <Section title="Mitigating factors">
            <ul className="list-disc space-y-2 pl-5">
              {verdict.mitigatingFactors.map((factor, i) => <li key={i}>{factor}</li>)}
            </ul>
          </Section>
        )}

        {verdict.witnessAssessments.length > 0 && (
          <Section title="Witness credibility">
            <ul className="space-y-3">
              {verdict.witnessAssessments.map((a, i) => {
                const witness = submission.witnesses[i];
                const score = a.credibility / MAX_CREDIBILITY;
                return (
                  <li key={i}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="min-w-0 truncate font-semibold text-amber-100">{a.name}</p>
                      <p
                        className={`shrink-0 font-display text-base font-bold ${
                          score >= 0.7 ? "text-emerald-300" : score >= 0.4 ? "text-amber-300" : "text-red-400"
                        }`}
                      >
                        {a.credibility}/{MAX_CREDIBILITY}
                      </p>
                    </div>
                    {witness && (
                      <p className="text-xs text-stone-400">
                        {sideLabel(witness.side, submission)} · {witness.relationship}
                      </p>
                    )}
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-stone-800" aria-hidden>
                      <div
                        className={`h-full rounded-full ${score >= 0.7 ? "bg-emerald-400" : score >= 0.4 ? "bg-amber-400" : "bg-red-500"}`}
                        style={{ width: `${score * 100}%` }}
                      />
                    </div>
                    <p className="mt-1.5 italic text-stone-300">“{a.comment}”</p>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        <Section title="Sentence">
          {guilty && verdict.punishmentArticles.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-1.5" aria-label="Punishment under">
              {verdict.punishmentArticles.map((n) => (
                <li
                  key={n}
                  className="rounded-full border border-amber-300/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-100"
                >
                  Article {n} · {CONSTITUTION.find((a) => a.number === n)?.title}
                </li>
              ))}
            </ul>
          )}
          <p className="font-medium text-amber-50">{guilty ? verdict.punishment : "No punishment. The defendant is free."}</p>
          {guilty && verdict.punishmentAdjustment.type !== "none" && (
            <p className="mt-2 text-stone-300">
              <span
                className={`mr-1.5 rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                  verdict.punishmentAdjustment.type === "reduced" ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                }`}
              >
                {verdict.punishmentAdjustment.type === "reduced" ? "Reduced" : "Increased"}
              </span>
              {verdict.punishmentAdjustment.reason}
            </p>
          )}
          <p className="mt-1 text-xs text-stone-500">Requested by the petitioner: “{submission.punishmentRequested}”</p>
        </Section>

        <Section title="From the bench">
          <blockquote className="font-display text-base italic text-amber-100">“{verdict.closingRemark}”</blockquote>
          <p className="mt-1 text-right text-xs text-stone-400">The Honorable Presiding Judge</p>
        </Section>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button variant="ghost" onClick={() => downloadVerdictPdf(submission, verdict)}>
          Download verdict (PDF)
        </Button>
        <Button onClick={onNewCase}>Start new case</Button>
      </div>
    </Card>
  );
}

export function MistrialPanel({
  message,
  onRetry,
  onNewCase,
}: {
  message: string;
  onRetry: () => void;
  onNewCase: () => void;
}) {
  return (
    <Card className="fade-in">
      <PanelHeading eyebrow="Mistrial" title="The court is in disarray!">
        {message}
      </PanelHeading>
      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="ghost" onClick={onNewCase}>
          Start new case
        </Button>
        <Button onClick={onRetry}>Appeal to the Judge again</Button>
      </div>
    </Card>
  );
}
