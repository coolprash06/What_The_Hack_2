export interface Article {
  number: number;
  title: string;
  rule: string;
  punishment: string;
}

// The supreme law of the squad. The judge cites these by number, and every
// punishment the judge hands down must come from here.
export const CONSTITUTION: Article[] = [
  {
    number: 1,
    title: "The Crush Clause",
    rule: 'No member shall hit on, flirt with, or "just casually talk to" a fellow member\'s crush.',
    punishment:
      "Must publicly hype the wronged friend to said crush for one full week, and is banned from the friend's group photos for a month.",
  },
  {
    number: 2,
    title: "The Wingman Duty",
    rule: "When a member's crush walks past, every member present is duty-bound to hype him up.",
    punishment: "Mandatory wingman service at the next three opportunities, with performance reviewed by the squad.",
  },
  {
    number: 3,
    title: "The Vault Act",
    rule: "A member may share the group chats, or roast his friends, in front of his crush to impress her. However, he bears full responsibility for ensuring that his crush does not spread any of it, whether to another member's crush or to anyone outside the squad.",
    punishment:
      "If the contents leak beyond the crush, he must read his own most embarrassing old message aloud to the squad, and permanently loses group chat admin rights.",
  },
  {
    number: 4,
    title: "The Intellectual Property of the Squad Act",
    rule: "Ideas born within the squad belong to the squad. Sharing team plans, project ideas or exam strategies with outsiders is treason.",
    punishment: "Must complete the team's next three assignments or presentations alone, crediting the squad by name in each.",
  },
  {
    number: 5,
    title: "The Bros Before Impressions Doctrine",
    rule: "No member shall betray the squad to impress someone. Any offence committed for this purpose is an aggravated offence.",
    punishment: "Doubles the punishment of any other article broken at the same time.",
  },
  {
    number: 6,
    title: "The Sacred Snack Statute",
    rule: "Food hidden, labeled or claimed by a member is sacred. The last Maggi, the last slice and the midnight snack are protected.",
    punishment: "Must replace the stolen food three times over, delivered personally with a handwritten apology.",
  },
  {
    number: 7,
    title: "The Left-on-Read Act",
    rule: "No message shall be left on read for more than 24 hours.",
    punishment: "One full day of silent treatment from the entire squad.",
  },
  {
    number: 8,
    title: "The Last-Minute Cancellation Act",
    rule: "Cancelling plans less than an hour beforehand, with an obviously fabricated excuse, is forbidden.",
    punishment: "Must plan, organise and pay for the next hangout.",
  },
  {
    number: 9,
    title: "The Collective Property Act",
    rule: "All property of the squad is collective property. When a member needs to borrow a hoodie, laptop or any other item for an ACM or MTC hackathon, or to impress a crush, the owner is duty-bound to lend it. Borrowed items must be returned in the condition they were lent.",
    punishment:
      "Refusing to lend: the item becomes the borrower's for one week. Damaging or not returning it: must replace it, plus a late fee of the owner's choosing, within reason.",
  },
  {
    number: 10,
    title: "The Spoiler Prohibition",
    rule: "Revealing plot twists of shows, movies or matches a member has not yet watched is forbidden.",
    punishment: "The victim may spoil one thing of their choosing for the offender.",
  },
  {
    number: 11,
    title: "The Anti-Snitch Act",
    rule: "Any member who sucks up to a professor and reports on fellow members has committed the gravest betrayal.",
    punishment: "Immediate expulsion from the squad and removal from all group chats.",
  },
  {
    number: 12,
    title: "The Carpool Covenant",
    rule: "A member with transport must offer a ride to a member without one whenever they are going to the same place, live in the same area, or the other member's home lies on their route.",
    punishment: "Must serve as the wronged member's personal chauffeur for one week.",
  },
  {
    number: 13,
    title: "The Spirit of the Squad",
    rule: "Any act that betrays the trust, snacks or dignity of the squad, even if not listed here, may be judged under the spirit of this Constitution.",
    punishment: "At the court's discretion, proportionate and as dramatic as possible.",
  },
];

/** The article under which the court may set its own punishment. */
export const DISCRETION_ARTICLE = 13;

export const SENTENCING_RULES: string[] = [
  "Repeat offenders receive double the punishment.",
  "A sincere apology during final words may reduce the sentence by half.",
  "Lying to the court (including by witnesses) adds a punishment of the judge's choosing.",
];
