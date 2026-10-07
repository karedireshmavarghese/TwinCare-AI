const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "2mb" }));
app.use(express.static("public"));

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    application: "TwinCare AI",
    message: "Backend is running"
  });
});

/* =========================================================
   RESOURCE EXPLORER - SERPAPI
========================================================= */

app.get("/api/resources", async (req, res) => {
  try {
    const apiKey = process.env.SERPAPI_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "SERPAPI_KEY is not available to the server."
      });
    }

    const condition = req.query.condition || "hypertension";

    const url =
      "https://serpapi.com/search.json" +
      "?engine=google" +
      "&q=" +
      encodeURIComponent(
        `${condition} health monitoring prevention reliable medical information`
      ) +
      "&api_key=" +
      encodeURIComponent(apiKey);

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error("SerpApi HTTP status:", response.status);
      console.error("SerpApi error:", data);

      return res.status(response.status).json({
        error:
          data?.error ||
          "SerpApi request failed."
      });
    }

    const results = (data.organic_results || [])
      .slice(0, 8)
      .map((item) => ({
        title: item.title || "Untitled",
        link: item.link || "",
        snippet: item.snippet || ""
      }));

    res.json({
      condition,
      results
    });

  } catch (error) {
    console.error("SerpApi server error:", error);

    res.status(500).json({
      error: "Unable to load health resources."
    });
  }
});

/* =========================================================
   GEMINI AI HEALTH ASSISTANT
   Gemini Interactions API
========================================================= */

app.post("/api/chat", async (req, res) => {
  try {
    const { message, healthData } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Message is required."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    console.log("GEMINI KEY EXISTS:", Boolean(apiKey));
    console.log(
      "GEMINI KEY LENGTH:",
      apiKey ? apiKey.length : 0
    );

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not available to the server."
      });
    }

    const prompt = `
You are TwinCare AI, an educational Digital Health Twin assistant.

Your job is to analyze SYNTHETIC / DEMO health data for a student hackathon prototype.

IMPORTANT SAFETY RULES:

- Do not diagnose diseases.
- Do not claim that the user has a medical condition.
- Do not prescribe medicines.
- Do not recommend medication doses or medication changes.
- Do not invent measurements or medical history.
- Clearly distinguish demo/simulated data from real clinical data.
- Use cautious language such as "may", "could", "might", or "can be worth monitoring".
- Give general educational precautions only.
- Encourage professional medical advice when appropriate.
- If the information suggests an urgent situation, advise seeking appropriate urgent medical care.
- Do not make the user unnecessarily afraid.
- Do not provide extreme diet, exercise, or health recommendations.

SYNTHETIC HEALTH DATA:

${JSON.stringify(healthData || {}, null, 2)}

USER MESSAGE:

${message}

Return the response using these sections:

## 🩺 Health Overview

Briefly summarize the information provided.

## 📊 Key Observations

Identify important measurements or patterns.

## 📈 Trend Analysis

Discuss trends only if enough historical data is available.

## ⚠️ Possible Risk Indicators

Mention values or patterns that may deserve attention.

Do NOT call them diagnoses.

## 🔎 Why This Was Flagged

Explain the reasoning in simple language.

## 🥗 Recommended Precautions

Give safe, general educational precautions.

Do not prescribe medication.

## 👀 What To Monitor

List useful measurements, symptoms, habits, or trends that could be monitored.

## 👨‍⚕️ When To Seek Professional Advice

Explain when it would be appropriate to speak with a qualified healthcare professional.

For potentially urgent symptoms, advise appropriate urgent medical care.

## 🧠 AI Insight

Give a concise educational insight based only on the provided information.

## ⚕️ Important Disclaimer

This analysis is for educational purposes only and does not diagnose or treat medical conditions.

Remember:

The TwinCare AI Digital Twin is a prototype.

The health data is synthetic/demo data.

Do not present the output as a clinical diagnosis or medical prediction.
`;

    /* -----------------------------------------------------
       Gemini Interactions API
    ----------------------------------------------------- */

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },

        body: JSON.stringify({
          model: "gemini-3.8-flash",
          input: prompt
        })
      }
    );

    console.log(
      "Gemini HTTP status:",
      response.status
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "Gemini API error:",
        JSON.stringify(data, null, 2)
      );

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          data?.message ||
          "Gemini API request failed."
      });
    }

    /* -----------------------------------------------------
       Get Gemini output
    ----------------------------------------------------- */

    let output = data.output_text || "";

    /*
      Fallback in case the response structure contains
      model output content instead of output_text.
    */

    if (!output && Array.isArray(data.output)) {
      output = data.output
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }

          if (item?.text) {
            return item.text;
          }

          if (Array.isArray(item?.content)) {
            return item.content
              .map((part) => part?.text || "")
              .join("");
          }

          return "";
        })
        .filter(Boolean)
        .join("\n");
    }

    if (!output) {
      console.error(
        "Gemini returned an unexpected response:",
        JSON.stringify(data, null, 2)
      );

      return res.status(500).json({
        error: "Gemini returned an empty response."
      });
    }

    res.json({
      reply: output
    });

  } catch (error) {
    console.error(
      "Gemini server error:",
      error
    );

    res.status(500).json({
      error:
        "Unable to connect to the Gemini AI service."
    });
  }
});

/* =========================================================
   FRONTEND FALLBACK
========================================================= */

app.get("*", (req, res) => {
  res.sendFile("index.html", {
    root: "public"
  });
});

/* =========================================================
   SERVER START
========================================================= */

app.listen(PORT, () => {
  console.log(
    `TwinCare AI running on port ${PORT}`
  );

  console.log(
    "Gemini configured:",
    Boolean(process.env.GEMINI_API_KEY)
  );

  console.log(
    "SerpApi configured:",
    Boolean(process.env.SERPAPI_KEY)
  );
});
