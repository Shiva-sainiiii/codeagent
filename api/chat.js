// api/chat.js
// Vercel serverless function — proxies to OpenRouter, enforces structured JSON output,
// handles retries + graceful fallback on rate limits.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Free-tier models to try in order (first is primary, rest are fallback on failure/rate-limit)
const MODEL_CHAIN = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "poolside/laguna-xs-2.1:free",
  "cohere/north-mini-code:free",
  "inclusionai/ling-3.0-flash:free",
];

const SYSTEM_PROMPT = `You are an agentic coding assistant embedded in a mobile web app. The user works ONLY from their phone, in Hinglish (Hindi+English mix) or English — understand both.

RULES:
1. When the user asks you to CREATE or EDIT code/files, you MUST respond with ONLY a single JSON object, nothing else — no markdown fences, no preamble, no explanation outside the JSON.

2. JSON shape:
{
  "reply": "short chat message to show the user (can be Hinglish)",
  "reasoning": "1-3 SHORT sentences, plain language, explaining what you're about to do and why — e.g. 'Snake ka collision detection logic score.js mein add kar raha hoon, aur head-position check ko boundary ke against verify kar raha hoon.' Omit or leave empty if there are no file changes.",
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

6. Keep "reply" short (1-3 sentences) — the code speaks for itself. "reasoning" is separate and shown BEFORE the files are applied — it's the "what/why" the user sees while waiting, not a repeat of "reply".

7. MULTI-FILE PROJECTS MUST ACTUALLY WORK TOGETHER — this is critical:
   - If you create index.html + style.css + script.js (or edit one of an existing trio), the HTML MUST have <link rel="stylesheet" href="style.css"> in <head> and <script src="script.js"></script> before </body> — use the exact relative filename you gave each file.
   - Every id/class the JS uses with getElementById/querySelector MUST exist in the HTML you wrote. Every class the CSS styles MUST exist in the HTML you wrote. Do not style or query something you didn't create.
   - Prefer CSS Grid or Flexbox for any button/tile layout (e.g. calculator keypads, toolbars) so rows wrap correctly instead of overflowing the screen — never rely on inline-block buttons with no container width control.
   - Before returning the JSON, mentally trace the user flow once (e.g. "user taps 7, then +, then 3, then =") and check that the class/id names line up across all three files.
   - When editing only ONE file of an existing linked trio, do not break the existing links — keep referencing the same filenames the other files already expect.`;

const PLAN_SYSTEM_PROMPT = `You are planning (not yet building) a coding task for a mobile app. Given the user's request and any existing project files, respond with ONLY this JSON, nothing else:
{ "steps": ["short step 1", "short step 2", ...] }

Rules:
- 2-5 steps maximum. Each step is one short sentence (under 15 words), plain language, no code.
- Steps should describe WHAT will be built/changed and in what order (e.g. "Create index.html with the game board layout", "Add style.css for the dark theme", "Add script.js with the game logic and win detection").
- Do not write any actual code or file content — this is a plan only.
- If the request is trivial (one small change), still return 1-2 steps describing it briefly.`;

// simple sleep helper
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callOpenRouterStream(messages, apiKey, model) {
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
      max_tokens: 16000,
      stream: true,
    }),
  });

  if (!res.ok) {
    const status = res.status;
    const text = await res.text().catch(() => "");
    const err = new Error(`OpenRouter ${status}: ${text.slice(0, 300)}`);
    err.status = status;
    if (status === 429) err.retryInfo = extractRetryInfo(res, text);
    throw err;
  }
  return res; // caller reads the SSE body stream directly
}

// Pulls a usable "try again in X" estimate out of a 429 response — checks the standard
// Retry-After header first (seconds or an HTTP-date), then falls back to scanning the
// response body text for anything OpenRouter/the underlying provider included, since not
// every provider in the free chain sends the header consistently.
function extractRetryInfo(res, bodyText) {
  const headerVal = res.headers.get("retry-after");
  if (headerVal) {
    const asSeconds = Number(headerVal);
    if (!Number.isNaN(asSeconds)) return { seconds: asSeconds, source: "header" };
    const asDate = Date.parse(headerVal);
    if (!Number.isNaN(asDate)) {
      const seconds = Math.max(0, Math.round((asDate - Date.now()) / 1000));
      return { seconds, source: "header" };
    }
  }
  // Some providers mention a reset time or duration in the error body itself.
  const match = bodyText.match(/reset[s]?\s*(?:in|at)?\s*[:\s]?\s*([\d.]+)\s*(second|minute|hour|s\b|m\b|h\b)/i);
  if (match) {
    const n = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    const seconds = unit.startsWith("h") ? n * 3600 : unit.startsWith("m") ? n * 60 : n;
    return { seconds: Math.round(seconds), source: "body" };
  }
  return null;
}

async function callOpenRouter(messages, apiKey, model, maxTokens = 16000) {
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
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const status = res.status;
    const text = await res.text().catch(() => "");
    const err = new Error(`OpenRouter ${status}: ${text.slice(0, 300)}`);
    err.status = status;
    if (status === 429) err.retryInfo = extractRetryInfo(res, text);
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

  const start = cleaned.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in model output");

  // Walk forward counting brace depth, respecting string literals and escapes, so a
  // stray '}' inside a code snippet in "content" (extremely common — JS/CSS is full of
  // them) can't fool a naive lastIndexOf('}') into cutting the JSON at the wrong point.
  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  if (end === -1) {
    // Never found a balanced close — genuinely truncated mid-object.
    const truncErr = new Error("Model output was cut off before valid JSON completed (likely max_tokens limit)");
    truncErr.truncated = true;
    throw truncErr;
  }

  const jsonStr = cleaned.slice(start, end + 1);
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    const truncErr = new Error("Model output was cut off before valid JSON completed (likely max_tokens limit)");
    truncErr.truncated = true;
    throw truncErr;
  }
}

// Turns whatever retry estimate we managed to extract (if any) into a clear message.
// If no provider gave us a usable number, falls back to an honest "no exact time known"
// note rather than inventing a specific-sounding number that isn't real.
function formatRateLimitMessage(lastErr) {
  const info = lastErr && lastErr.retryInfo;
  if (info && info.seconds > 0) {
    const mins = Math.ceil(info.seconds / 60);
    const timeStr = mins <= 1 ? "~1 minute" : mins < 60 ? `~${mins} minutes` : `~${Math.ceil(mins / 60)} hour(s)`;
    return `Sab free models abhi rate-limited hain. ${timeStr} baad phir try karo.`;
  }
  return "Sab free models abhi busy/rate-limited hain. Exact reset time nahi pata — kuch minute ruk ke, ya thodi der (1-2 ghante) baad try karo.";
}

// Converts cache_control content-array messages back to plain strings — fallback for
// providers in the free-model chain that don't accept the Anthropic-style block format.
function toPlainStringContent(messages) {
  return messages.map((m) => {
    if (Array.isArray(m.content)) {
      return { ...m, content: m.content.map((block) => block.text || "").join("\n") };
    }
    return m;
  });
}

async function handleStreamingRequest(res, chatMessages) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  let lastErr = null;
  let wasTruncated = false;

  for (const model of MODEL_CHAIN) {
    for (let attempt = 0; attempt < 2; attempt++) {
      let accumulated = "";
      try {
        const streamRes = await callOpenRouterStream(chatMessages, apiKey_GLOBAL, model);
        const reader = streamRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop(); // keep incomplete line for next chunk

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              const delta = json?.choices?.[0]?.delta?.content;
              if (delta) {
                accumulated += delta;
                // Best-effort: try to surface just the "reply" text as it streams in,
                // so the user sees words appearing instead of a static spinner. This is
                // a light regex, not full parsing — it only feeds the visual "typing"
                // effect; the authoritative parse happens once the stream ends.
                const m = accumulated.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)/);
                if (m) {
                  const partial = m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
                  send("partial", { text: partial });
                }
              }
            } catch {
              // ignore unparseable SSE fragments (keep-alives, comments, etc.)
            }
          }
        }

        const parsed = extractJson(accumulated);
        send("final", { ok: true, model, ...parsed });
        res.end();
        return;
      } catch (e) {
        lastErr = e;
        if (e.truncated) { wasTruncated = true; break; }
        if (e.status === 400) {
          send("final", { ok: false, reply: "Request format mein dikkat thi. Phir se try karo.", files: [], error: e.message });
          res.end();
          return;
        }
        if (e.status === 429 || e.status >= 500) { await sleep(600 * (attempt + 1)); continue; }
        break;
      }
    }
  }

  if (wasTruncated) {
    send("final", {
      ok: false,
      reply: "Response bahut bada tha aur beech mein kat gaya. Chhote steps mein banwao.",
      files: [],
      error: lastErr ? lastErr.message : "truncated",
    });
  } else {
    send("final", {
      ok: false,
      reply: formatRateLimitMessage(lastErr),
      files: [],
      error: lastErr ? lastErr.message : "unknown error",
    });
  }
  res.end();
}

let apiKey_GLOBAL = null; // set per-request in the handler below; module-scope needed for the stream helper above

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
  apiKey_GLOBAL = apiKey;

  try {
    const { messages, summary, fileContext, stream, planOnly } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array required" });
    }

    // Build the trimmed context: system + rolling summary + relevant file context + last messages
    const systemPromptToUse = planOnly ? PLAN_SYSTEM_PROMPT : SYSTEM_PROMPT;

    // Prompt caching: mark the system prompt and file context as cacheable. These are the
    // two parts of the request most likely to be byte-identical across consecutive turns
    // in the same conversation (system prompt never changes; file context only changes
    // when a file is actually edited) — caching them means providers that support this
    // (Anthropic models via OpenRouter, some others) don't re-bill the full token cost on
    // every follow-up message, only on the first request and whenever the cached content
    // actually changes.
    //
    // Only used on the non-streaming path, which has a clean retry-with-plain-fallback if
    // a provider rejects the content-array format (see the 400 handling below). The
    // streaming path stays on plain string content unconditionally — it's the default,
    // most-used path, and safely falling back mid-stream is much harder than before any
    // bytes have been sent, so the small caching upside isn't worth the added fragility there.
    function buildChatMessages(useCaching) {
      const sysContent = useCaching
        ? [{ type: "text", text: systemPromptToUse, cache_control: { type: "ephemeral" } }]
        : systemPromptToUse;
      const msgs = [{ role: "system", content: sysContent }];

      if (summary) {
        msgs.push({
          role: "system",
          content: `Conversation summary so far (older messages, condensed):\n${summary}`,
        });
      }

      if (fileContext) {
        const fileText = `Current project files (for context, use exact snippets from here for "find" in edits):\n${fileContext}`;
        msgs.push({
          role: "system",
          content: useCaching
            ? [{ type: "text", text: fileText, cache_control: { type: "ephemeral" } }]
            : fileText,
        });
      }

      // last 5-6 messages only (trimming already done client-side, but enforce here too)
      msgs.push(...messages.slice(-6));
      return msgs;
    }

    if (planOnly) {
      // Small, cheap call — just a plan, no file content. Reuses the same model chain and
      // retry logic as the main path, but with a tiny max_tokens ceiling since a plan is
      // a handful of short lines, not code. Plain content — a one-off small call doesn't
      // benefit meaningfully from caching.
      const planMessages = buildChatMessages(false);
      let lastPlanErr = null;
      for (const model of MODEL_CHAIN) {
        try {
          const raw = await callOpenRouter(planMessages, apiKey, model, 500);
          const parsed = extractJson(raw);
          const steps = Array.isArray(parsed.steps) ? parsed.steps.filter((s) => typeof s === "string") : [];
          return res.status(200).json({ ok: true, model, planSteps: steps });
        } catch (e) {
          lastPlanErr = e;
          continue; // plan calls are cheap enough to just try the next model on any failure
        }
      }
      return res.status(200).json({ ok: false, planSteps: [], error: lastPlanErr ? lastPlanErr.message : "planning failed" });
    }

    if (stream) {
      // Streaming stays on plain content — it's the default/primary path, and a mid-stream
      // fallback for a rejected content format would be much harder to do safely than
      // before any bytes have been sent (see the non-streaming path's 400 handling below).
      return handleStreamingRequest(res, buildChatMessages(false));
    }

    let lastErr = null;
    let wasTruncated = false;
    const chatMessages = buildChatMessages(true); // cached version — safe here because of the 400 fallback right below
    for (const model of MODEL_CHAIN) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const raw = await callOpenRouter(chatMessages, apiKey, model);
          const parsed = extractJson(raw);
          return res.status(200).json({ ok: true, model, ...parsed });
        } catch (e) {
          lastErr = e;
          if (e.truncated) {
            wasTruncated = true;
            break; // retrying the same prompt/model won't fix a token-budget cutoff
          }
          if (e.status === 400 && attempt === 0) {
            // Could be caused by a provider that doesn't accept the cache_control
            // content-array format used for prompt caching — retry once with plain
            // string content before giving up on this model entirely.
            try {
              const plainMessages = toPlainStringContent(chatMessages);
              const raw = await callOpenRouter(plainMessages, apiKey, model);
              const parsed = extractJson(raw);
              return res.status(200).json({ ok: true, model, ...parsed });
            } catch (e2) {
              lastErr = e2;
              break;
            }
          }
          if (e.status === 400) {
            // Malformed request even without caching — won't succeed on any model, stop immediately.
            return res.status(200).json({
              ok: false,
              reply: "Request format mein dikkat thi. Phir se try karo, ya chhota message bhejo.",
              files: [],
              error: e.message,
            });
          }
          // rate limit or server error -> retry once, then move to next model
          if (e.status === 429 || e.status >= 500) {
            await sleep(600 * (attempt + 1));
            continue;
          }
          // other errors (e.g. JSON parse) -> try next model directly
          break;
        }
      }
    }

    if (wasTruncated) {
      return res.status(200).json({
        ok: false,
        reply:
          "Response bahut bada tha aur beech mein kat gaya. Chhote steps mein banwao — pehle ek file, phir agli.",
        files: [],
        error: lastErr ? lastErr.message : "truncated",
      });
    }

    // All models exhausted
    return res.status(200).json({
      ok: false,
      reply: formatRateLimitMessage(lastErr),
      files: [],
      error: lastErr ? lastErr.message : "unknown error",
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      reply: "Kuch server error aaya. Phir se try karo.",
      files: [],
      error: e.message,
    });
  }
};
