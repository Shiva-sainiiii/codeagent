// api/chat.js
// Vercel serverless function — proxies to OpenRouter, enforces structured JSON output,
// handles retries + graceful fallback on rate limits.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Free-tier models to try in order (first is primary, rest are fallback on failure/rate-limit)
const MODEL_CHAIN = [
  "nvidia/nemotron-nano-9b-v2:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
];

const SYSTEM_PROMPT = `You are an agentic coding assistant embedded in a mobile web app. The user works ONLY from their phone, in Hinglish (Hindi+English mix) or English — understand both.

RULES:
1. When the user asks you to CREATE or EDIT code/files, you MUST respond with ONLY a single JSON object, nothing else — no markdown fences, no preamble, no explanation outside the JSON.

2. JSON shape:
{
  "reply": "short chat message to show the user (can be Hinglish)",
  "files": [
    {
      "path": "relative/file/path.ext",
      "action": "create" | "edit",
      "content": "FULL file content — only for action=create, or for action=edit when the file is short (<40 lines)",
      "edits": [ { "find": "exact snippet from current file", "replace": "new snippet" } ]
    }
  ]
}

3. TOKEN EFFICIENCY — very important:
   - action="create": always give full "content", omit "edits".
   - action="edit" on a file you were already shown in context: DO NOT resend the whole file. Instead give "edits": an array of {find, replace} snippets — find must be an exact, short, unique substring of the current file content provided to you. Omit "content" in this case.
   - Only use full "content" for edits if the file is very small (under ~40 lines) where a diff isn't worth it.

4. If the user is just chatting / asking a question / wants an explanation (no file changes needed), respond with ONLY:
{ "reply": "your answer here", "files": [] }

5. Never invent file content you weren't asked for. Never include files unrelated to the request.

6. Keep "reply" short (1-3 sentences) — the code speaks for itself.`;

// simple sleep helper
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callOpenRouter(messages, apiKey, model) {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://codeagent.vercel.app",
      "X-Title": "CodeAgent",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 3000,
    }),
  });

  if (!res.ok) {
    const status = res.status;
    const text = await res.text().catch(() => "");
    const err = new Error(`OpenRouter ${status}: ${text.slice(0, 300)}`);
    err.status = status;
    throw err;
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from model");
  return content;
}

function extractJson(raw) {
  // Strip markdown fences if the model added them anyway
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  // Try to find the outermost { ... }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in model output");
  const jsonStr = cleaned.slice(start, end + 1);
  return JSON.parse(jsonStr);
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server misconfigured: OPENROUTER_API_KEY missing" });
  }

  try {
    const { messages, summary, fileContext } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array required" });
    }

    // Build the trimmed context: system + rolling summary + relevant file context + last messages
    const chatMessages = [{ role: "system", content: SYSTEM_PROMPT }];

    if (summary) {
      chatMessages.push({
        role: "system",
        content: `Conversation summary so far (older messages, condensed):\n${summary}`,
      });
    }

    if (fileContext) {
      chatMessages.push({
        role: "system",
        content: `Current project files (for context, use exact snippets from here for "find" in edits):\n${fileContext}`,
      });
    }

    // last 5-6 messages only (trimming already done client-side, but enforce here too)
    const recent = messages.slice(-6);
    chatMessages.push(...recent);

    let lastErr = null;
    for (const model of MODEL_CHAIN) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const raw = await callOpenRouter(chatMessages, apiKey, model);
          const parsed = extractJson(raw);
          return res.status(200).json({ ok: true, model, ...parsed });
        } catch (e) {
          lastErr = e;
          // rate limit or server error -> retry once, then move to next model
          if (e.status === 429 || e.status >= 500) {
            await sleep(600 * (attempt + 1));
            continue;
          }
          // JSON parse errors etc -> try next model directly
          break;
        }
      }
    }

    // All models exhausted
    return res.status(200).json({
      ok: false,
      reply:
        "⚠️ Sab free models abhi busy/rate-limited hain. Thoda ruk ke phir try karo (30-60 sec).",
      files: [],
      error: lastErr ? lastErr.message : "unknown error",
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      reply: "⚠️ Kuch server error aaya. Phir se try karo.",
      files: [],
      error: e.message,
    });
  }
};
