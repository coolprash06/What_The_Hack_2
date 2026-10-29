"use client";

import { useEffect, useState } from "react";
import { stepNumber } from "../ProgressBar";
import { Card, PanelHeading } from "../ui";

const LINES = [
  "The judge retires to chambers…",
  "Consulting the sacred Constitution…",
  "Reviewing the jury's sworn testimony…",
  "Weighing the bonds of friendship…",
  "Polishing the gavel…",
  "Drafting a verdict for the history books…",
];

export function DeliberationPanel() {
  const [line, setLine] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setLine((l) => (l + 1) % LINES.length), 1500);
    return () => clearInterval(id);
  }, []);

  return (
    <Card className="text-center">
      <PanelHeading eyebrow={`Step ${stepNumber("deliberation")} · Deliberation`} title="Order in the court!" />
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center">
        <svg viewBox="0 0 64 64" className="gavel-swing h-14 w-14" aria-hidden>
          <rect x="30" y="22" width="30" height="5" rx="2" fill="#7a4a2a" />
          <rect x="12" y="8" width="20" height="26" rx="4" fill="#a8683c" />
          <rect x="12" y="13" width="20" height="3" fill="#e0b85a" />
          <rect x="12" y="26" width="20" height="3" fill="#e0b85a" />
          <rect x="4" y="54" width="34" height="6" rx="2" fill="#5e3520" />
        </svg>
      </div>
      <p key={line} className="fade-in min-h-6 font-display text-lg text-amber-100" aria-live="polite">
        {LINES[line]}
      </p>
      <div className="mt-6 h-1 overflow-hidden rounded-full bg-stone-800">
        <div className="deliberation-bar h-full w-1/3 rounded-full bg-amber-400" />
      </div>
    </Card>
  );
}
