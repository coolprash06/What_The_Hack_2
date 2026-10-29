# PRD — The Court of Petty Crimes (working name)

## Overview
An AI courtroom for petty friend-group disputes. A petitioner files a case, the defendant responds, optional witnesses testify, a jury votes, and an AI Judge delivers a dramatic verdict based on a "Friendship Constitution".

Built solo for **ACM x MTC What The Hack?! 2.0** (BPDC).

## Hackathon Details
- **Track:** 3. Artificial Super Unintelligence (AI used in ridiculous, unnecessary ways)
- **Submission deadline:** Oct 29, 2026, 6:00 PM
- **Pitch:** Oct 30, 2026, 2:00–6:00 PM, Room 334
- **Submission:** Public GitHub repo with a README (project name, team members, what it does, how to run it, live link)
- **Team:** Solo (Prashanth)

## Inspiration
Kalesh Room (kaleshroom.online): a courtroom for friend-group fights where **every role needs a real person** (judge, defendant, lawyers, jury).

**Our difference:** the AI is the Judge, so the court works on one laptop with no friends needed to run it. The real hackathon judges become the jury during the pitch.

## Target Demo
The operator (Prashanth) types everything on one laptop. The hackathon judges act as the jury, and their votes are typed in during the demo.

Example cases:
1. A friend leaked the group chats to impress a girl. She blocked him, and now the whole college knows what's in the chats. The petitioners want an adequate punishment.
2. A friend shared the team's hackathon project ideas to impress a girl, and her team built a better project with them. What should his punishment be?

## User Flow
0. **Lamp pull:** The courtroom starts dark. The user pulls a banker's lamp chain to light the room and open court ("Court is now in session"). Nothing else is interactive until then.
1. **File the case:** case title, petitioner name, defendant name, petitioner's statement, punishment requested, number of jurors (1–6).
2. **Defendant's statement:** the defendant's side.
3. **Witnesses (optional):** skip, or add one or more witnesses. Each has a name, the side they support (Petitioner / Defendant / Neutral), their relationship to the parties, and a statement.
4. **Jury:** one card per juror with name, vote (Guilty / Not Guilty), and reason.
5. **Deliberation:** a dramatic loading state while the AI Judge decides.
6. **Verdict:** a formal verdict card, then "Start new case".

## AI Judge
- Reads all statements, witness testimony, and jury votes and reasons.
- Applies the **Friendship Constitution**, cites articles by number, and can creatively apply them to new situations.
- Treats witnesses with suspicion: considers their side, their relationship to the parties, and possible bias or lying.
- Tone: dramatic and theatrical, treating petty disputes like the trial of the century. Funny, never hateful or crude.

### Verdict Output (structured JSON)
- `summary`: both sides summarised
- `juryTally`
- `verdict`
- `articlesViolated`
- `witnessAssessments`: credibility rating out of 10 plus a judge comment, per witness (omitted if there are no witnesses)
- `punishment`
- `closingRemark`

## Friendship Constitution
Articles have a number, title, rule, and punishment. Stored in `lib/constitution.ts`.
- Article 1: Never hit on a friend's crush (punishment TBD)
- **More articles: to be designed later.** The demo cases need articles covering leaked group chats and leaked project ideas.

## 3D Courtroom
- Built only from primitive shapes (no external models or textures).
- **Visual reference:** supreme-court style. A long raised wooden bench with a row of high-back chairs, deep maroon/purple velvet drapes behind it, and wood-paneled walls.
- **AI Judge** in the tall center chair, with a glowing element so it reads as "AI".
- **Jurors** seated at the bench on either side of the judge. The seat count matches the juror count.
- Petitioner and defendant counsel tables facing the bench, each with a monitor shape, plus a central lectern with a mic.
- Witness stand near the bench.
- **Banker's lamp with a pull chain** on the judge's section of the bench, ported from the File Cabinet portfolio (`lamp.txt`).
- Simple low-poly characters with name labels, an active-speaker highlight, and idle animation.
- The camera moves to focus on the active part of the court in each step.
- **No flags or national symbols.**

## Features
- Objection button (planned)

## Tech Stack
- Next.js (App Router, TypeScript) + Tailwind
- React Three Fiber + drei (3D), zustand (lamp/court state)
- Groq API (Llama), called only from the server route `app/api/verdict/route.ts`
- Deployed on Vercel
- `GROQ_API_KEY` and `GROQ_MODEL` in environment variables; `.env.local` is never committed

## Out of Scope
- Real-time multiplayer or jurors voting from their own phones
- Voice input
- User accounts or a database

## Open Decisions
- Final project name
- Friendship Constitution articles
- Judge persona(s)
- Objection button behaviour

## Build Plan
- **Prompt 1:** app scaffold, step flow, Groq verdict API
- **Prompt 2:** courtroom restyle, characters, witness step
- **Prompt 3:** supreme-court layout, lamp-pull start sequence
- Then: constitution, polish, README, deploy, submit by 5:30 PM