import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Test route
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

// Gemini chat route
app.post("/api/gemini", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: "Please enter a question."
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `You are TwinCare AI, a general health education assistant.
Explain health topics simply. Do not diagnose conditions, prescribe treatment, or replace a doctor.
If the question may be urgent, advise the user to contact a healthcare professional.

User question: ${message}`
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.status(500).json({
        error: "The AI assistant is temporarily unavailable."
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I could not generate a response. Please try again.";

    res.json({ reply });
  } catch (error) {
    console.error("Gemini route error:", error);
    res.status(500).json({
      error: "Something went wrong while contacting the AI assistant."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`TwinCare AI server running on port ${PORT}`);
});
