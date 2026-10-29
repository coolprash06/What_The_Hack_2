# The Court of Petty Crimes

An AI courtroom for petty friend-group disputes. File a case, hear the defense, poll the jury, and let a very dramatic AI judge deliver the verdict, all inside a 3D courtroom built from primitive shapes.

## Run locally

```bash
npm install
cp .env.example .env.local   # then put your Groq key in GROQ_API_KEY
npm run dev
```

Open http://localhost:3000. Get a Groq API key at https://console.groq.com/keys.

## Where things live

| What | Where |
| --- | --- |
| Court name | `lib/court.ts` (`COURT_NAME`) |
| Judge personality / system prompt | `lib/judge.ts` |
| The constitution (articles) | `lib/constitution.ts` |
| Verdict API (Groq, server-only) | `app/api/verdict/route.ts` |
| Verdict validation | `lib/verdict.ts` |
| Step-by-step flow | `components/CourtApp.tsx`, `components/panels/` |
| 3D courtroom | `components/scene/` |
