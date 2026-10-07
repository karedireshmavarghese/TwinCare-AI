const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================================================
   BASIC MIDDLEWARE
========================================================= */

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
   SERPAPI - RESOURCE EXPLORER
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

    const searchQuery =
      `${condition} health monitoring prevention ` +
      `reliable medical information`;

    const url =
      "https://serpapi.com/search.json" +
      "?engine=google" +
      "&q=" +
      encodeURIComponent(searchQuery) +
      "&api_key=" +
      encodeURIComponent(apiKey);

    const response = await fetch(url);
    const data = await response.json();

    console.log("SerpApi HTTP status:", response.status);

    if (!response.ok) {
      console.error(
        "SerpApi error:",
        JSON.stringify(data, null, 2)
      );

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
    console.error(
      "SerpApi server error:",
      error
    );

    res.status(500).json({
      error: "Unable to load health resources."
    });
  }
});

/* =========================================================
   GEMINI AI ASSISTANT
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

    console.log(
      "GEMINI KEY EXISTS:",
      Boolean(apiKey)
    );

    console.log(
      "GEMINI KEY LENGTH:",
      apiKey ? apiKey.length : 0
    );

    if (!apiKey) {
      return res.status(500).json({
        error:
          "GEMINI_API_KEY is not available to the server."
      });
    }

    /* =====================================================
       TWINCARE AI PROMPT
    ===================================================== */

    const prompt = `
You are TwinCare AI, an educational Digital Health Twin
assistant for a healthcare technology hackathon prototype.

Analyze ONLY the synthetic/demo health information supplied
by the user.

HEALTH DATA:

${JSON.stringify(healthData || {}, null, 2)}

USER MESSAGE:

${message}

IMPORTANT SAFETY RULES:

1. Do not diagnose diseases.
2. Do not claim that the user has a medical condition.
3. Do not prescribe medication.
4. Do not recommend medication doses.
5. Do not recommend changing or stopping medication.
6. Do not invent health measurements.
7. Do not invent medical history.
8. Treat the supplied information as synthetic/demo data.
9. Use cautious language such as:
   "may", "could", "might", "worth monitoring".
10. Give general educational precautions only.
11. Encourage consultation with a qualified healthcare professional
    when appropriate.
12. If concerning symptoms are described, advise appropriate
    urgent professional medical care.
13. Do not create unnecessary fear.
14. Do not provide extreme diet or exercise recommendations.

Return the response using these sections:

## 🩺 Health Overview

Briefly summarize the supplied demo health information.

## 📊 Key Observations

Identify important measurements or patterns.

## 📈 Trend Analysis

Discuss trends only when enough historical information
is available.

## ⚠️ Possible Risk Indicators

Identify measurements or patterns that may deserve
attention.

Do NOT call these diagnoses.

## 🔎 Why This Was Flagged

Explain why a particular value or pattern may be worth
monitoring.

## 🥗 Recommended Precautions

Give safe and general health precautions.

Do not prescribe medicines.

## 👀 What To Monitor

List measurements, symptoms, habits, or trends that
could be monitored.

## 👨‍⚕️ When To Seek Professional Advice

Explain when it would be appropriate to speak with
a qualified healthcare professional.

If the information suggests an urgent situation,
recommend appropriate urgent medical care.

## 🧠 AI Insight

Give a short educational insight based ONLY on the
information supplied.

## ⚕️ Important Disclaimer

This analysis is for educational purposes only and
does not diagnose or treat medical conditions.

TwinCare AI is a prototype.

The information used by this demonstration is
synthetic/demo health data and should not be treated
as clinical advice or a medical diagnosis.
`;

    /* =====================================================
       GEMINI INTERACTIONS API
    ===================================================== */

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

    /* =====================================================
       GEMINI ERROR
    ===================================================== */

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

    /* =====================================================
       EXTRACT GEMINI RESPONSE
    ===================================================== */

    let output = data.output_text || "";

    /*
      Fallback for alternative response structures.
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
        "Unexpected Gemini response:",
        JSON.stringify(data, null, 2)
      );

      return res.status(500).json({
        error:
          "Gemini returned an empty response."
      });
    }

    /* =====================================================
       SEND RESPONSE TO FRONTEND
    ===================================================== */

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
