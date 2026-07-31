// api/summarize.js
// Small, cheap background call used to fold older chat turns into a running summary,
// so long conversations retain real context instead of losing it to crude truncation.
// Uses the fastest/cheapest model in the chain since this task doesn't need code-gen quality.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const SUMMARIZE_MODEL = "inclusionai/ling-3.0-flash:free"; // fast + free, good enough for condensing text

const PROMPT = `You condense conversation history into a short running summary for a coding assistant. Keep only facts that matter for future turns: what the user is building, key decisions made, file names discussed, and unresolved requests. Drop pleasantries and small talk. Output ONLY the updated summary text, 2-5 sentences, no preamble, no markdown.`;

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ ok: false, error: "Server misconfigured" });

  try {
    const { priorSummary, newTurns } = req.body || {};
    if (!newTurns) return res.status(400).json({ ok: false, error: "newTurns required" });

    const userContent = priorSummary
      ? `Existing summary:\n${priorSummary}\n\nNew turns to fold in:\n${newTurns}`
      : `Conversation so far:\n${newTurns}`;

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://codeagent.vercel.app",
        "X-Title": "CodeAgent-Summarize",
      },
      body: JSON.stringify({
        model: SUMMARIZE_MODEL,
        messages: [
          { role: "system", content: PROMPT },
          { role: "user", content: userContent },
        ],
        temperature: 0.2,
        max_tokens: 300, // this is a summary, not a file — keep it cheap
      }),
    });

    if (!response.ok) {
      return res.status(200).json({ ok: false, error: `Summarize model ${response.status}` });
    }
    const data = await response.json();
    const summary = data?.choices?.[0]?.message?.content?.trim();
    if (!summary) return res.status(200).json({ ok: false, error: "Empty summary" });

    return res.status(200).json({ ok: true, summary });
  } catch (e) {
    return res.status(200).json({ ok: false, error: e.message });
  }
};
