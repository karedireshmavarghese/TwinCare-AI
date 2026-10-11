
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// ---------------- HEALTH CHECK ----------------

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "TwinCare AI server is running",
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY)
  });
});

// ---------------- RESOURCE EXPLORER ----------------

const healthResources = [
  {
    title: "WHO – Hypertension",
    url: "https://www.who.int/news-room/fact-sheets/detail/hypertension",
    description:
      "Educational information about high blood pressure, its risks and prevention.",
    topics: "hypertension blood pressure heart"
  },
  {
    title: "NHS – High Blood Pressure",
    url: "https://www.nhs.uk/conditions/high-blood-pressure-hypertension/",
    description:
      "Learn about blood pressure, diagnosis and treatment.",
    topics: "hypertension blood pressure diagnosis treatment"
  },
  {
    title: "MedlinePlus – Health Information",
    url: "https://medlineplus.gov/",
    description:
      "Trusted health information from the US National Library of Medicine.",
    topics: "general health medical education"
  },
  {
    title: "CDC – Healthy Living",
    url: "https://www.cdc.gov/",
    description:
      "Public health information and educational resources.",
    topics: "health prevention wellness"
  }
];

app.get("/api/resources", (req, res) => {
  try {
    const query = String(req.query.q || "").trim().toLowerCase();

    const resources = !query
      ? healthResources
      : healthResources.filter((resource) =>
          [
            resource.title,
            resource.description,
            resource.topics
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
        );

    res.json({
      success: true,
      query: query || "all",
      count: resources.length,
      resources
    });
  } catch (error) {
    console.error("Resource API error:", error);

    res.status(500).json({
      success: false,
      error: "Unable to load educational health resources."
    });
  }
});

// ---------------- GEMINI AI ----------------

async function askGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text:
              "You are TwinCare AI, a health education assistant. " +
              "Provide general educational information, explain medical " +
              "terms clearly, and encourage users to consult qualified " +
              "health professionals for personal medical decisions. " +
              "Do not claim to diagnose, prescribe, or replace a clinician. " +
              "For emergency symptoms, advise seeking emergency medical help."
          }]
        },
        contents: [{
          role: "user",
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 800
        }
      })
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("Gemini API returned status:", response.status);
    throw new Error(
      data.error?.message || "Gemini request failed."
    );
  }

  const answer = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("\n")
    .trim();

  if (!answer) {
    throw new Error("Gemini returned no text response.");
  }

  return answer;
}

// ---------------- HEALTH ANALYSIS / CHAT ----------------

app.post("/api/analyze", async (req, res) => {
  try {
    const prompt = String(
      req.body?.prompt || req.body?.message || req.body?.question || ""
    ).trim();

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: "Please enter a question or health information."
      });
    }

    if (prompt.length > 8000) {
      return res.status(413).json({
        success: false,
        error: "Please keep your message under 8000 characters."
      });
    }

    const answer = await askGemini(prompt);

    return res.json({
      success: true,
      answer,
      response: answer
    });
  } catch (error) {
    console.error("Health analysis error:", error.message);

    return res.status(503).json({
      success: false,
      error: process.env.GEMINI_API_KEY
        ? "The AI service is temporarily unavailable. Please try again."
        : "AI is not configured yet. Add GEMINI_API_KEY in Render environment variables."
    });
  }
});

// ---------------- UNKNOWN API ROUTES ----------------

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    error: "API endpoint not found.",
    path: req.path
  });
});

// ---------------- FRONTEND FALLBACK ----------------

// Serve the frontend for normal page requests.
// Unknown API requests above always return JSON.
app.use((req, res, next) => {
  if (req.method !== "GET") {
    return res.status(404).json({
      success: false,
      error: "Route not found."
    });
  }

  res.sendFile(
    path.join(__dirname, "public", "index.html"),
    (error) => {
      if (error && !res.headersSent) {
        next(error);
      }
    }
  );
});

// ---------------- ERROR HANDLER ----------------

app.use((error, req, res, next) => {
  console.error("Server error:", error.message);

  if (res.headersSent) {
    return next(error);
  }

  res.status(error.status || 500).json({
    success: false,
    error: "An unexpected server error occurred."
  });
});

// ---------------- START SERVER ----------------

app.listen(PORT, "0.0.0.0", () => {
  console.log(`TwinCare AI running on port ${PORT}`);
});
