// Change the court's name here; it's used everywhere (UI, page title, judge prompt).
export const COURT_NAME = "The Court of Petty Crimes";

export const COURT_TAGLINE = "Where no grievance is too small for justice.";

// In-character messages shown when something goes wrong.
export const COURT_ERRORS = {
  badRequest:
    "The clerk has rejected your filing. The case file appears to be incomplete or tampered with. Please refile.",
  misconfigured:
    "The Judge cannot be summoned: the court's chambers are locked (the server is missing its GROQ_API_KEY).",
  overloaded:
    "The Judge is presiding over too many scandals at once. Please wait a moment and appeal again.",
  unavailable:
    "Order! Order! The Judge's deliberations collapsed into chaos and no verdict could be reached. A mistrial has been declared. Please appeal.",
  unreachable:
    "The courier carrying your case file has vanished into the night. Check your connection and appeal again.",
} as const;
