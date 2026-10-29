// Change the court's name here; it's used everywhere (UI, page title, judge prompt).
export const COURT_NAME = "The Court of Petty Crimes";

export const COURT_TAGLINE = "Where no grievance is too small for justice.";

// In-character messages shown when something goes wrong.
export const COURT_ERRORS = {
  badRequest:
    "The clerk has rejected your filing. The case file appears to be incomplete or tampered with. Please refile.",
  misconfigured:
    "The Judge cannot be summoned: the court's chambers are locked (check GROQ_API_KEY and GROQ_MODEL on the server).",
  overloaded:
    "The Judge is presiding over too many scandals at once. Please wait a moment and appeal again.",
  unavailable:
    "Order! Order! The Judge's deliberations collapsed into chaos and no verdict could be reached. A mistrial has been declared. Please appeal.",
  unreachable:
    "The courier carrying your case file has vanished into the night. Check your connection and appeal again.",
} as const;

// The judge's scripted lines for the final-words step (no AI involved).
// Rounds cycle through the variations so repeats don't sound identical.
export const FINAL_WORDS_LINES = {
  firstAsk: "Before this court reaches its verdict: does anybody wish to say anything more?",
  askAgain: [
    "The court has heard new words. Once more: does anyone wish to add anything?",
    "Fresh words have entered the record! I ask again: is there anything more to be said?",
    "The plot thickens. Speak now, or forever hold your peace: does anyone have more to add?",
    "Order! New statements demand a new round. Does anybody wish to say anything further?",
  ],
  close: [
    "Very well. The jury will now cast its votes.",
    "Silence at last. Jurors, the time has come to cast your votes.",
    "The court has heard enough. The jury will now cast its votes.",
  ],
} as const;
