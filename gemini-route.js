// gemini-route.js — TwinCare AI chat endpoint (server-side only)
// Requires Node 18+ (built-in fetch). No extra npm packages needed.
import { Router } from "express";

const router = Router();

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are TwinCare AI, a friendly health-education assistant.
Rules:
- Give general educational information in simple, plain language.
- You are NOT a doctor. Never diagnose, never prescribe, never give personal dosing instructions.
- When explaining a measurement (e.g. blood pressure, heart rate, glucose), describe typical reference ranges from public health guidance and what a trend may generally mean.
- Simulations are hypothetical and are not medical predictions.
- For severe or urgent symptoms (chest pain, trouble breathing, stroke signs, fainting, very high readings with symptoms), tell the user to contact local emergency services immediately.
- Otherwise, encourage the user to discuss concerns with a qualified healthcare professional.
- Keep answers concise (under 250 words) unless asked for more.`;

function toGeminiRole(role) {
  return role === "assistant" || role === "model" ? "model" : "user";
}

router.post("/chat", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "The AI service is not configured on the server (missing GEMINI_API_KEY)." });
  }

  const { message, history = [], context } = req.body || {};
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Please type a question first." });
  }
  if (message.length > 2000) {
    return res.status(400).json({ error: "Message is too long (max 2000 characters)." });
  }

  // Keep only the last 10 turns, sanitized.
  const turns = (Array.isArray(history) ? history : [])
    .slice(-10)
    .filter((h) => h && typeof h.text === "string" && h.text.trim())
    .map((h) => ({ role: toGeminiRole(h.role), parts: [{ text: h.text.slice(0, 2000) }] }));

  // Optional: recent readings from the dashboard so the AI can explain trends.
  const contextText =
    context && typeof context === "object"
      ? `\n\n[User's recent readings, for explanation only: ${JSON.stringify(context).slice(0, 2000)}]`
      : "";

  turns.push({ role: "user", parts: [{ text: message.trim() + contextText }] });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: turns,
        generationConfig: { temperature: 0.4, maxOutputTokens: 800 },
      }),
      signal: AbortSignal.timeout(25000),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detail = data?.error?.message || "";
      console.error("Gemini error", response.status, detail);
      const map = {
        400: "The AI service rejected the request. Check that GEMINI_API_KEY is valid.",
        403: "The AI key does not have permission for this model.",
        404: `Model "${MODEL}" was not found. Set GEMINI_MODEL to a currently available model.`,
        429: "The AI service is busy or the quota was reached. Please try again shortly.",
      };
      return res
        .status(502)
        .json({ error: map[response.status] || "The AI service had a problem. Please try again." });
    }

    const reply = data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || "")
      .join("")
      .trim();

    if (!reply) {
      const blocked = data?.promptFeedback?.blockReason;
      return res.status(200).json({
        reply: blocked
          ? "I can't help with that request. Please try rephrasing your health question."
          : "I couldn't generate an answer this time. Please try again.",
      });
    }

    res.json({ reply });
  } catch (err) {
    console.error("Chat route failure:", err.name, err.message);
    const timedOut = err.name === "TimeoutError" || err.name === "AbortError";
    res.status(timedOut ? 504 : 500).json({
      error: timedOut
        ? "The AI took too long to respond. Please try again."
        : "Network error reaching the AI service.",
    });
  }
});

export default router;
