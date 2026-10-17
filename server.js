import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const resources = [
  {
    title: "Blood pressure",
    description: "Learn what blood pressure numbers mean and how to maintain healthy levels.",
    url: "https://www.who.int/news-room/fact-sheets/detail/hypertension",
    source: "World Health Organization"
  },
  {
    title: "High blood pressure",
    description: "NHS guidance on causes, symptoms, prevention, and treatment of high blood pressure.",
    url: "https://www.nhs.uk/conditions/high-blood-pressure-hypertension/",
    source: "NHS"
  },
  {
    title: "Heart health",
    description: "CDC information on heart disease, risk factors, and prevention.",
    url: "https://www.cdc.gov/heart-disease/index.html",
    source: "CDC"
  },
  {
    title: "Blood glucose testing",
    description: "MedlinePlus information about blood glucose tests and diabetes.",
    url: "https://medlineplus.gov/lab-tests/blood-glucose-test/",
    source: "MedlinePlus"
  }
];

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

app.get("/api/resources", (req, res) => {
  const query = (req.query.q || "").toLowerCase().trim();

  if (!query) {
    return res.json({ results: resources });
  }

  const results = resources.filter(resource =>
    resource.title.toLowerCase().includes(query) ||
    resource.description.toLowerCase().includes(query)
  );

  res.json({ results });
});

app.post("/api/chat", async (req, res) => {
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
Explain health topics simply and clearly.
Do not diagnose medical conditions, prescribe medicines, or replace professional medical advice.
If the question may be urgent, advise the user to contact a qualified healthcare professional.

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
        error: "The AI assistant is temporarily unavailable. Please try again."
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I could not generate a response. Please try again.";

    res.json({ reply });
  } catch (error) {
    console.error("Chat route error:", error);

    res.status(500).json({
      error: "Something went wrong while contacting the AI assistant."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`TwinCare AI server running on port ${PORT}`);
});
