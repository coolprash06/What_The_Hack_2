export interface Article {
  number: number;
  title: string;
  rule: string;
  punishment: string;
}

// The supreme law of the friend group. The judge cites these by number.
// TODO: more articles will be added.
export const CONSTITUTION: Article[] = [
  {
    number: 1,
    title: "Never hit on a friend's crush",
    rule: "No member of the friend group shall flirt with, pursue, or otherwise make romantic advances toward a person whom another member has declared to be their crush.",
    // TODO: placeholder punishment, replace with the real one.
    punishment:
      "Buys the wronged friend a meal of their choosing and formally renounces all claims to the crush in front of the group.",
  },
];
