import type { jsPDF } from "jspdf";
import type { CaseSubmission } from "./case";
import { CONSTITUTION } from "./constitution";
import { COURT_NAME } from "./court";
import { MAX_CREDIBILITY, type Verdict } from "./verdict";
import { describe, ROLE_LABEL } from "@/components/CourtRecord";
import { sideLabel } from "@/components/panels/WitnessesPanel";

const PAGE_MARGIN = 64;
const FOOTER_GAP = 36;
const INK: [number, number, number] = [28, 25, 23];
const MUTED: [number, number, number] = [110, 104, 98];
const GUILTY_RED: [number, number, number] = [185, 28, 28];
const ACQUITTED_GREEN: [number, number, number] = [4, 120, 87];

type Style = "normal" | "bold" | "italic" | "bolditalic";

/** "Prash Vs Rahul", safe to use as a file name. */
export function verdictFileTitle(submission: CaseSubmission) {
  const title = `${submission.petitioner} Vs ${submission.defendant}`
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s.]+|[\s.]+$/g, "");
  return title || "Verdict";
}

// The PDF's built-in fonts only cover Latin-1; anything else would print as garbage.
function latin1(text: string) {
  return text
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/…/g, "...")
    .replace(/•/g, "-")
    .replace(/₹/g, "Rs ")
    .replace(/\r\n?/g, "\n")
    .normalize("NFC")
    .replace(/[^\n\x20-\x7e\xa0-\xff]/g, "");
}

/** Writes the verdict and the full court record as a formal PDF and downloads it. */
export async function downloadVerdictPdf(submission: CaseSubmission, verdict: Verdict, date = new Date()) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const title = verdictFileTitle(submission);
  doc.setProperties({ title, subject: `${COURT_NAME}: Official Verdict`, creator: COURT_NAME });

  new VerdictDocument(doc).write(submission, verdict, date);
  doc.save(`${title}.pdf`);
}

class VerdictDocument {
  private y = PAGE_MARGIN;
  private readonly width: number;
  private readonly height: number;

  constructor(private readonly doc: jsPDF) {
    this.width = doc.internal.pageSize.getWidth();
    this.height = doc.internal.pageSize.getHeight();
  }

  private get textWidth() {
    return this.width - PAGE_MARGIN * 2;
  }

  private get bottom() {
    return this.height - PAGE_MARGIN;
  }

  private newPage() {
    this.doc.addPage();
    this.y = PAGE_MARGIN;
  }

  private ensureSpace(height: number) {
    if (this.y + height > this.bottom) this.newPage();
  }

  private gap(points: number) {
    this.y += points;
  }

  /** Wrapped text, broken across pages line by line. */
  private paragraph(
    text: string,
    {
      size = 11,
      style = "normal" as Style,
      color = INK,
      indent = 0,
      align = "left" as "left" | "center" | "right",
      after = 6,
    } = {},
  ) {
    const { doc } = this;
    doc.setFont("times", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const width = this.textWidth - indent;
    const lineHeight = size * 1.35;
    const lines: string[] = doc.splitTextToSize(latin1(text), width);
    const x = align === "center" ? this.width / 2 : align === "right" ? this.width - PAGE_MARGIN : PAGE_MARGIN + indent;
    for (const line of lines) {
      this.ensureSpace(lineHeight);
      doc.text(line, x, this.y + size, { align });
      this.y += lineHeight;
    }
    this.y += after;
  }

  private rule(color = MUTED, weight = 0.5) {
    this.doc.setDrawColor(...color);
    this.doc.setLineWidth(weight);
    this.doc.line(PAGE_MARGIN, this.y, this.width - PAGE_MARGIN, this.y);
  }

  private heading(title: string) {
    // Keep a heading with at least a couple of lines of what follows it.
    this.ensureSpace(70);
    this.gap(10);
    this.paragraph(title.toUpperCase(), { size: 11, style: "bold", color: MUTED, after: 2 });
    this.rule([200, 194, 186]);
    this.gap(8);
  }

  write(submission: CaseSubmission, verdict: Verdict, date: Date) {
    this.writeVerdict(submission, verdict, date);
    this.writeRecord(submission);
    this.numberPages();
  }

  private writeVerdict(s: CaseSubmission, v: Verdict, date: Date) {
    const guilty = v.verdict === "GUILTY";

    this.paragraph(COURT_NAME.toUpperCase(), { size: 14, style: "bold", align: "center", after: 2 });
    this.paragraph("Official Verdict", { size: 11, style: "italic", color: MUTED, align: "center", after: 12 });
    this.rule(INK, 1);
    this.gap(18);
    this.paragraph(s.title, { size: 20, style: "bold", align: "center", after: 4 });
    this.paragraph(`${s.petitioner} (Petitioner)  v.  ${s.defendant} (Defendant)`, { size: 12, align: "center", after: 16 });

    // The verdict, boxed and in colour.
    const color = guilty ? GUILTY_RED : ACQUITTED_GREEN;
    const boxWidth = 240;
    const boxHeight = 50;
    this.ensureSpace(boxHeight + 16);
    this.doc.setDrawColor(...color);
    this.doc.setLineWidth(2);
    this.doc.rect((this.width - boxWidth) / 2, this.y, boxWidth, boxHeight);
    this.doc.setFont("times", "bold");
    this.doc.setFontSize(28);
    this.doc.setTextColor(...color);
    this.doc.text(v.verdict, this.width / 2, this.y + boxHeight / 2 + 10, { align: "center" });
    this.y += boxHeight + 16;

    this.heading("Summary of the case");
    this.paragraph(`${s.petitioner} (Petitioner)`, { style: "bold", after: 1 });
    this.paragraph(v.summary.petitioner, { after: 8 });
    this.paragraph(`${s.defendant} (Defendant)`, { style: "bold", after: 1 });
    this.paragraph(v.summary.defendant);

    this.heading(`Jury tally: ${v.juryTally.guilty} guilty, ${v.juryTally.notGuilty} not guilty`);
    for (const j of s.jurors) {
      this.paragraph(`${j.name} (${j.vote === "guilty" ? "Guilty" : "Not Guilty"})`, { style: "bold", after: 1 });
      this.paragraph(`"${j.reason}"`, { indent: 14 });
    }
    if (v.juryOverruled.overruled) {
      this.gap(4);
      this.paragraph("The court overrules the jury.", { style: "bold", color: GUILTY_RED, after: 1 });
      this.paragraph(v.juryOverruled.reason);
    }

    this.heading("Articles violated");
    if (v.articlesViolated.length) {
      for (const a of v.articlesViolated) {
        this.paragraph(`Article ${a.number}: ${a.title}`, { style: "bold", after: 1 });
        this.paragraph(a.explanation, { indent: 14 });
      }
    } else {
      this.paragraph("No articles of the Constitution were violated.", { style: "italic", color: MUTED });
    }

    if (v.mitigatingFactors.length) {
      this.heading("Mitigating factors");
      for (const factor of v.mitigatingFactors) this.paragraph(factor);
    }

    if (v.witnessAssessments.length) {
      this.heading("Witness credibility");
      v.witnessAssessments.forEach((a, i) => {
        const witness = s.witnesses[i];
        this.paragraph(`${a.name}: ${a.credibility}/${MAX_CREDIBILITY}`, { style: "bold", after: 1 });
        if (witness) this.paragraph(`${sideLabel(witness.side, s)} · ${witness.relationship}`, { size: 10, color: MUTED, indent: 14, after: 1 });
        this.paragraph(`"${a.comment}"`, { style: "italic", indent: 14 });
      });
    }

    this.heading("Sentence");
    if (guilty && v.punishmentArticles.length) {
      const under = v.punishmentArticles
        .map((n) => `Article ${n} (${CONSTITUTION.find((a) => a.number === n)?.title ?? ""})`)
        .join("; ");
      this.paragraph(`Under ${under}`, { size: 10, color: MUTED, after: 4 });
    }
    this.paragraph(guilty ? v.punishment : "No punishment. The defendant is free.", { size: 12, style: "bold" });
    if (guilty && v.punishmentAdjustment.type !== "none") {
      const label = v.punishmentAdjustment.type === "reduced" ? "Reduced" : "Increased";
      this.paragraph(`${label}: ${v.punishmentAdjustment.reason}`);
    }
    this.paragraph(`Requested by the petitioner: "${s.punishmentRequested}"`, { size: 10, color: MUTED });

    this.heading("From the bench");
    this.paragraph(`"${v.closingRemark}"`, { size: 13, style: "italic" });
    this.paragraph("The Honorable Presiding Judge", { size: 10, color: MUTED, align: "right", after: 18 });

    const delivered = date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    this.paragraph(`Delivered on ${delivered}`, { size: 11, style: "italic" });
  }

  private writeRecord(s: CaseSubmission) {
    this.newPage();
    this.paragraph("APPENDIX", { size: 11, style: "bold", color: MUTED, align: "center", after: 2 });
    this.paragraph("Court Record", { size: 20, style: "bold", align: "center", after: 4 });
    this.paragraph(`${s.title}: everything said in the case, in the order it was said.`, {
      size: 10,
      style: "italic",
      color: MUTED,
      align: "center",
      after: 12,
    });
    this.rule(INK, 1);
    this.gap(14);

    if (!s.record.length) {
      this.paragraph("Nothing was entered into the record.", { style: "italic", color: MUTED });
      return;
    }
    s.record.forEach((e, i) => {
      this.ensureSpace(48);
      this.paragraph(`${i + 1}. ${e.speaker}`, { style: "bold", after: 0 });
      this.paragraph(`${ROLE_LABEL[e.role]} · ${describe(e)}`, { size: 9, color: MUTED, after: 2 });
      this.paragraph(e.text, { after: 10 });
    });
  }

  private numberPages() {
    const { doc } = this;
    const total = doc.getNumberOfPages();
    for (let page = 1; page <= total; page++) {
      doc.setPage(page);
      doc.setFont("times", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      const y = this.height - FOOTER_GAP;
      doc.text(latin1(COURT_NAME), PAGE_MARGIN, y);
      doc.text(`Page ${page} of ${total}`, this.width - PAGE_MARGIN, y, { align: "right" });
    }
  }
}
