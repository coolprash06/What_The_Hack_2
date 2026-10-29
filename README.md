# ⚖️ The Court of Petty Crimes

*Where no grievance is too small for justice.*

An AI courtroom for petty friend-group disputes. File a case against your friend, hear the defence, call witnesses, cross-examine them, let the jury vote, and watch a robot judge deliver a dramatic verdict based on the sacred **Friendship Constitution**, all inside a 3D courtroom you light up by pulling a lamp chain.

Built for **ACM x MTC What The Hack?! 2.0**, Track 3: **Artificial Super Unintelligence**.

**Live demo:** https://what-the-hack-2.vercel.app/login

---

## What it does

Some disputes are too small for a real court and too important to let go: the last packet of Maggi, a leaked group chat, a friend who shared your hackathon idea to impress someone. The Court of Petty Crimes takes them extremely seriously.

1. **Open court.** The courtroom starts in darkness. Pull the chain of the banker's lamp on the judge's bench to light the room, then start the proceedings. The AI Judge greets the court.
2. **File the case.** The petitioner states the grievance and the punishment they want, and chooses the number of jurors (1–6).
3. **Defence.** The defendant responds.
4. **Witnesses (optional).** Call witnesses who support either side or neither, along with their relationship to the parties.
5. **Cross-examination.** After each witness, the opposing side can question them. Contradictions are noted.
6. **Final words.** The judge asks whether anyone has anything more to say. If anyone speaks, the judge asks everyone again, until the whole court has nothing more to add.
7. **Jury.** Each juror votes Guilty or Not Guilty, with a reason.
8. **Verdict.** The AI Judge reads the full court record and the entire Constitution, then delivers a formal verdict:
   - Guilty or Not Guilty
   - Articles violated, with reasons
   - A credibility rating for each witness
   - A sentence taken from the Constitution, with any reduction or increase explained
   - Whether the judge overruled the jury, and why
   - A dramatic closing remark from the bench

### How the AI Judge decides

- It reads the **complete court record** (every statement, cross-examination answer, final word and jury vote) and the **entire Friendship Constitution** for every case. Nothing is retrieved or filtered, so nothing is missed.
- **Punishments come only from the Constitution.** The judge may reduce a sentence (a sincere apology, an honest mistake) and must say why.
- **Breaking a rule isn't automatically guilt.** The judge weighs intent and circumstances.
- **Witnesses are treated with suspicion.** Bias and contradictions under cross-examination lower their credibility, and lying to the court is punished.
- **The judge has the final say**, but must explain any decision to overrule the jury.

### The Friendship Constitution (highlights)

| Article | Name | In short |
|---|---|---|
| 1 | The Crush Clause | Don't hit on a friend's crush |
| 2 | The Wingman Duty | Hype your friend when their crush walks past |
| 3 | The Vault Act | You may show the group chat to your crush, but you're responsible if it leaks |
| 4 | The Intellectual Property of the Squad Act | Squad ideas stay in the squad |
| 5 | The Bros Before Impressions Doctrine | Betraying the squad to impress someone doubles the punishment |
| 6 | The Sacred Snack Statute | The last Maggi is sacred |
| 7 | The Left-on-Read Act | No message left on read for over 24 hours |
| 8 | The Last-Minute Cancellation Act | No fake excuses an hour before plans |
| 9 | The Collective Property Act | Lend the hoodie or laptop for a hackathon or a crush |
| 10 | The Spoiler Prohibition | No spoilers |
| 11 | The Anti-Snitch Act | Snitching to a professor means expulsion |
| 12 | The Carpool Covenant | Offer the ride if you're going the same way |
| 13 | The Spirit of the Squad | Anything else that betrays the squad |

The full text, punishments and sentencing rules are in [`lib/constitution.ts`](lib/constitution.ts).

### Other features

- **3D courtroom** built entirely from primitive shapes in React Three Fiber, with characters for the judge, petitioner, defendant, jurors and witness
- **Lamp-pull opening**, with smooth camera moves to whoever is speaking
- **Drag or use the arrow keys** to look around the courtroom
- **📜 Court record** panel showing the full transcript as the case unfolds
- **"Mistrial" card** with an appeal (retry) button if the judge can't reach a verdict

---

## Tech stack

- **Next.js** (App Router, TypeScript) + **Tailwind CSS**
- **React Three Fiber** + **drei** for the 3D courtroom, **zustand** for state
- **Groq API** (`openai/gpt-oss-120b`), called only from a server route, so the API key never reaches the browser
- Deployed on **Vercel**

---

## How to run it locally

### Prerequisites

- Node.js 20 or later
- A free Groq API key from [console.groq.com/keys](https://console.groq.com/keys)

### Steps

1. **Clone and install**
   ```bash
   git clone https://github.com/coolprash06/What_The_Hack_2.git
   cd What_The_Hack_2
   npm install
   ```

2. **Add your Groq key.** Copy the example env file:
   ```bash
   # macOS / Linux
   cp .env.example .env.local
   ```
   ```powershell
   # Windows (PowerShell)
   Copy-Item .env.example .env.local
   ```
   Then open `.env.local` and fill it in:
   ```
   GROQ_API_KEY=your_key_here
   GROQ_MODEL=openai/gpt-oss-120b
   ```

3. **Start the court**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000), pull the lamp, and file your first case.

### Notes

- **Never commit `.env.local`.** It is already in `.gitignore`.
- **Groq's free tier** allows roughly one verdict per minute with this model. If you run several cases back to back, the deliberation screen waits and retries automatically.
- **If a verdict fails**, check the terminal running `npm run dev`. The server logs the exact reason, without ever logging the key. If Groq retires the model, change `GROQ_MODEL` to another model from [console.groq.com/docs/models](https://console.groq.com/docs/models).

---

## Project structure

```
app/
  api/verdict/route.ts   # Server route that calls the AI Judge
components/
  scene/                 # 3D courtroom, characters, lamp, camera
  panels/                # Step-by-step case panels
  CourtRecord.tsx        # Court record transcript panel
lib/
  constitution.ts        # The Friendship Constitution
  judge.ts               # The AI Judge's instructions and personality
  verdict.ts             # Verdict validation
  record.ts              # Court record builder
state/
  courtStore.ts          # App state
```

---

## Credits

- The pull-chain banker's lamp is adapted from my portfolio site, *The File Cabinet*.
- Inspired by [Kalesh Room](https://kaleshroom.online/), where every role is played by a real person. The Court of Petty Crimes puts an AI on the bench instead.

---

*For petty fights only. Not legal advice. The court accepts no responsibility for friendships ended by its verdicts.*
