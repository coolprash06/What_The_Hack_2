import { parseCaseSubmission, type CaseSubmission } from "@/lib/case";
import { COURT_ERRORS } from "@/lib/court";
import { buildCaseBriefing, buildJudgeSystemPrompt } from "@/lib/judge";
import { normalizeVerdict, type Verdict } from "@/lib/verdict";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Groq retired llama-3.3-70b-versatile; gpt-oss-120b handles JSON mode well.
const DEFAULT_MODEL = "openai/gpt-oss-120b";
const MAX_ATTEMPTS = 2;
const TIMEOUT_MS = 45_000;
// Reasoning models spend part of this budget thinking before they answer.
const MAX_COMPLETION_TOKENS = 8000;
// Groq's free tier allows ~8k tokens a minute and a verdict uses ~4.5k, so
// back-to-back cases hit the limit. Waits up to this long in total rather than
// failing; these waits don't use up MAX_ATTEMPTS.
const MAX_RATE_LIMIT_WAIT_MS = 30_000;

class GroqError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
    /** For 429s: how long Groq asks us to wait, if it said. */
    readonly retryAfterMs: number | null = null,
  ) {
    super(`Groq request failed with status ${status}: ${detail}`);
  }
}

/** Why an attempt produced no verdict, for the server log. */
class InvalidVerdict extends Error {}

// From the Retry-After header, or Groq's "Please try again in 8.77s" message.
function retryAfterMs(res: Response, detail: string) {
  const header = Number(res.headers.get("retry-after"));
  if (Number.isFinite(header) && header > 0) return header * 1000;
  const match = detail.match(/try again in (?:(\d+)m)?([\d.]+)s/);
  return match ? (Number(match[1] ?? 0) * 60 + Number(match[2])) * 1000 : null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isReasoningModel = (model: string) => model.startsWith("openai/gpt-oss");

// Groq's error body, trimmed for logging. Never includes the request (or its key).
async function groqErrorDetail(res: Response) {
  const body = await res.text().catch(() => "");
  try {
    const error = JSON.parse(body)?.error;
    if (error?.message) return `${error.code ?? error.type ?? "error"}: ${error.message}`;
  } catch {}
  return body.slice(0, 300) || res.statusText;
}

async function askJudge(submission: CaseSubmission, apiKey: string, model: string): Promise<Verdict> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: buildJudgeSystemPrompt() },
        { role: "user", content: buildCaseBriefing(submission) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.9,
      max_completion_tokens: MAX_COMPLETION_TOKENS,
      ...(isReasoningModel(model) ? { reasoning_effort: "medium", include_reasoning: false } : {}),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const detail = await groqErrorDetail(res);
    throw new GroqError(res.status, detail, res.status === 429 ? retryAfterMs(res, detail) : null);
  }

  const data = await res.json();
  const choice = data?.choices?.[0];
  const content = choice?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new InvalidVerdict(`empty response (finish_reason: ${choice?.finish_reason ?? "unknown"})`);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    throw new InvalidVerdict(`response is not valid JSON (finish_reason: ${choice?.finish_reason}): ${content.slice(0, 200)}`);
  }
  const result = normalizeVerdict(raw, submission);
  if (!result.ok) throw new InvalidVerdict(`${result.reason}. Raw: ${content.slice(0, 400)}`);
  return result.verdict;
}

export async function POST(request: Request) {
  const submission = parseCaseSubmission(await request.json().catch(() => null));
  if (!submission) {
    console.warn("[verdict] rejected an invalid case submission");
    return Response.json({ error: COURT_ERRORS.badRequest }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    console.error("[verdict] GROQ_API_KEY is not set");
    return Response.json({ error: COURT_ERRORS.misconfigured }, { status: 500 });
  }
  const model = process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;

  let waitedMs = 0;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const started = Date.now();
    try {
      const verdict = await askJudge(submission, apiKey, model);
      console.info(`[verdict] ${model} delivered ${verdict.verdict} in ${Date.now() - started}ms (attempt ${attempt})`);
      return Response.json(verdict);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error(`[verdict] attempt ${attempt}/${MAX_ATTEMPTS} with ${model} failed after ${Date.now() - started}ms: ${reason}`);
      if (err instanceof GroqError) {
        if (err.status === 429) {
          // Groq's estimate can be slightly short, so wait a little past it.
          const waitMs = err.retryAfterMs === null ? null : err.retryAfterMs + 750;
          if (waitMs !== null && waitedMs + waitMs <= MAX_RATE_LIMIT_WAIT_MS) {
            console.warn(`[verdict] rate limited; retrying in ${Math.ceil(waitMs / 1000)}s`);
            await sleep(waitMs);
            waitedMs += waitMs;
            attempt--; // a rate-limited request never reached the judge
            continue;
          }
          return Response.json({ error: COURT_ERRORS.overloaded }, { status: 429 });
        }
        // Retrying can't fix a bad key or an unknown model.
        if (err.status === 401 || err.status === 403 || err.status === 404) {
          return Response.json({ error: COURT_ERRORS.misconfigured }, { status: 500 });
        }
      }
    }
  }

  return Response.json({ error: COURT_ERRORS.unavailable }, { status: 502 });
}
