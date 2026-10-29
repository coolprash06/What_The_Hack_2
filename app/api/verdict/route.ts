import { parseCaseSubmission, type CaseSubmission } from "@/lib/case";
import { COURT_ERRORS } from "@/lib/court";
import { buildCaseBriefing, buildJudgeSystemPrompt } from "@/lib/judge";
import { normalizeVerdict, type Verdict } from "@/lib/verdict";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const MAX_ATTEMPTS = 2;
const TIMEOUT_MS = 30_000;

class GroqError extends Error {
  constructor(readonly status: number) {
    super(`Groq request failed with status ${status}`);
  }
}

async function askJudge(submission: CaseSubmission, apiKey: string): Promise<Verdict | null> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || DEFAULT_MODEL,
      messages: [
        { role: "system", content: buildJudgeSystemPrompt() },
        { role: "user", content: buildCaseBriefing(submission) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.9,
      max_tokens: 1200,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new GroqError(res.status);

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") return null;
  try {
    return normalizeVerdict(JSON.parse(content), submission.jurors);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const submission = parseCaseSubmission(await request.json().catch(() => null));
  if (!submission) {
    return Response.json({ error: COURT_ERRORS.badRequest }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("GROQ_API_KEY is not set");
    return Response.json({ error: COURT_ERRORS.misconfigured }, { status: 500 });
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const verdict = await askJudge(submission, apiKey);
      if (verdict) return Response.json(verdict);
      console.warn(`Judge returned an invalid verdict (attempt ${attempt})`);
    } catch (err) {
      console.error(`Verdict request failed (attempt ${attempt}):`, err);
      if (err instanceof GroqError && err.status === 429) {
        return Response.json({ error: COURT_ERRORS.overloaded }, { status: 429 });
      }
      if (err instanceof GroqError && (err.status === 401 || err.status === 403)) {
        return Response.json({ error: COURT_ERRORS.misconfigured }, { status: 500 });
      }
    }
  }

  return Response.json({ error: COURT_ERRORS.unavailable }, { status: 502 });
}
