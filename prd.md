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

## Opening Sequence
1. **Dark wide shot:** on page load, the camera shows the entire courtroom (judge's bench, both podiums, jury box, witness stand, all characters). The room is almost dark: only faint silhouettes, plus the lamp's dark-state sheen. A small hint near the lamp says "Pull the lamp to open court." Nothing else is clickable.
2. **Lamp pull:** a banker's lamp with a pull chain sits on the judge's bench. Pulling it lights the bulb first, then the whole room ramps up to full brightness, so every character and area is clearly visible.
3. **Start button:** 3 seconds after the room is lit, a small "Start the proceedings" button fades in.
4. **Judge's opening line:** on click, the camera zooms in on the AI Judge, and a speech bubble types out: "Good morning all, let us begin the proceedings."
5. The case flow then begins.

## Case Flow
1. **File the case:** case title, petitioner name, defendant name, petitioner's statement, punishment requested, number of jurors (1–6).
2. **Defendant's statement:** the defendant's side.
3. **Witnesses (optional):** skip, or add one or more witnesses. Each has a name, the side they support (Petitioner / Defendant / Neutral), their relationship to the parties, and a statement.
4. **Jury:** one card per juror with name, vote (Guilty / Not Guilty), and reason.
5. **Deliberation:** a dramatic loading state while the AI Judge decides.
6. **Verdict:** a formal verdict card, then "Start new case". If the AI call fails, a "Mistrial" card with an "Appeal to the Judge again" (retry) button.

The camera focuses on the active part of the court in each step.

### Navigation
- A small fixed **Back / Next** control in the bottom-right corner moves through the flow.
- "Next" is disabled until the current step's required fields are filled.
- On the jury step, "Next" moves to the next juror, then to deliberation after the last one.
- A step progress bar at the top.

## AI Judge
- Reads all statements, witness testimony, and jury votes and reasons.
- Applies the **Friendship Constitution**, cites articles by number, and can creatively apply them to new situations.
- Treats witnesses with suspicion: considers their side, their relationship to the parties, and possible bias or lying.
- Tone: dramatic and theatrical, treating petty disputes like the trial of the century. Funny, never hateful or crude.
- Personality lives in `lib/judge.ts`.

### Verdict Output (structured JSON)
- `summary`: both sides summarised
- `juryTally` (recomputed on the server from the real votes)
- `verdict`
- `articlesViolated` (only article numbers that exist in the constitution)
- `witnessAssessments`: credibility rating out of 10 plus a judge comment, per witness (omitted if there are no witnesses)
- `punishment`
- `closingRemark`

## Friendship Constitution
Articles have a number, title, rule, and punishment. Stored in `lib/constitution.ts`.
- Article 1: Never hit on a friend's crush (punishment TBD)
- **More articles: to be designed later.** The demo cases need articles covering leaked group chats and leaked project ideas.

## 3D Courtroom
### Current (keep this layout for now)
- Built only from primitive shapes (no external models or textures).
- Judge's bench at the back center with a gavel, books and a scales emblem; petitioner podium on the left; defendant podium on the right; jury box with one seat per juror; wall lamps.
- **To add:** a witness stand near the judge's bench, and the lamp on the judge's bench.

### Characters
- Simple stylized low-poly figures built from primitives, each a distinct color: AI Judge (dark robe, glowing visor or eyes so it reads as "AI"), petitioner, defendant, jurors (one per juror), and a witness.
- Floating name labels ("Petitioner", "Defendant", "Juror 1"... until names are entered).
- Subtle idle animation; the active speaker gets a soft highlight.

### Lamp
- A banker's lamp with a pull chain, ported from the File Cabinet portfolio (`lamp.txt`).
- Must keep the fixes listed in `lamp.txt`'s "KNOWN QUIRKS" section.

### Possible Later Restyle (not now)
A supreme-court style look: a long raised bench with a row of high-back chairs (jurors seated beside the judge), deep maroon drapes, and wood-paneled walls. Only to be considered after the full flow works.

### Rules
- **No flags or national symbols.**

## Features
- Objection button (planned)

## Tech Stack
- Next.js (App Router, TypeScript) + Tailwind
- React Three Fiber + drei (3D), zustand (lamp/court state)
- Groq API (Llama, default `llama-3.3-70b-versatile`), called only from the server route `app/api/verdict/route.ts`
- Deployed on Vercel
- `GROQ_API_KEY` and `GROQ_MODEL` in environment variables; `.env.local` is never committed
- The Groq key will be added later; until then the verdict step shows the Mistrial card

## Out of Scope
- Real-time multiplayer or jurors voting from their own phones
- Voice input
- User accounts or a database

## Open Decisions
- Final project name
- Friendship Constitution articles
- Judge persona(s)
- Objection button behaviour
- Whether to do the supreme-court restyle

## Status
**Done:** app scaffold, step flow (file case, defence, jury, deliberation, verdict), verdict API with validation and Mistrial handling, basic 3D room with camera moves.

**Next:**
1. Witness stand, characters, lamp, opening sequence, Back/Next navigation
2. Witness form step and witness credibility in the verdict
3. Add the Groq key and test real verdicts (by ~4:30 PM)
4. Friendship Constitution, polish
5. README, deploy to Vercel, make the repo public, submit by 5:30 PM