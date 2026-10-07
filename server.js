const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

/* ================================
   HEALTH CHECK
================================ */

app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    application: "TwinCare AI",
    message: "Backend is running"
  });
});


/* ================================
   RESOURCE SEARCH - SERPAPI
================================ */

app.get("/api/resources", async (req, res) => {
  try {

    const condition = String(
      req.query.condition || "hypertension"
    ).trim();

    const apiKey = String(
      process.env.SERPAPI_KEY || ""
    ).trim();

    if (!apiKey) {
      return res.status(500).json({
        error: "SERPAPI_KEY is not configured."
      });
    }

    const params = new URLSearchParams({
      engine: "google",
      q: `${condition} health education`,
      api_key: apiKey
    });

    const response = await fetch(
      `https://serpapi.com/search.json?${params}`
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("SerpApi error:", data);

      return res.status(502).json({
        error:
          data?.error ||
          "SerpApi request failed."
      });
    }

    const results =
      (data.organic_results || [])
        .slice(0, 5)
        .map((item) => ({
          title: item.title || "Untitled",
          link: item.link || "#",
          snippet: item.snippet || ""
        }));

    res.json({
      condition,
      results
    });

  } catch (error) {

    console.error("Resource error:", error);

    res.status(500).json({
      error:
        error.message ||
        "Unable to retrieve resources."
    });
  }
});


/* ================================
   AI CHATBOT - GEMINI
================================ */

app.post("/api/chat", async (req, res) => {

  try {

    const message = String(
      req.body?.message || ""
    ).trim();

    if (!message) {
      return res.status(400).json({
        error: "Message is required."
      });
    }


    /* GEMINI API KEY */

    const apiKey = String(
      process.env.GEMINI_API_KEY || ""
    ).trim();

    console.log(
      "GEMINI KEY EXISTS:",
      apiKey.length > 0
    );

    console.log(
      "GEMINI KEY LENGTH:",
      apiKey.length
    );


    if (!apiKey) {
      return res.status(500).json({
        error:
          "GEMINI_API_KEY is not available to the server."
      });
    }


    /* ================================
       TWINCARE AI PROMPT
    ================================= */

    const prompt = `
You are TwinCare Assistant.

You are the AI health-analysis assistant inside
TwinCare AI, a student-built Digital Health Twin
prototype.

Your job is to analyze ONLY the synthetic/demo health
data provided by the user and give a clear educational
health analysis.

The available data may include:

- Blood pressure
- Systolic blood pressure
- Diastolic blood pressure
- Heart rate
- Resting heart rate
- Blood glucose
- SpO2
- Sleep duration
- Sleep quality
- Physical activity
- Daily steps
- Exercise duration
- Weight
- BMI if provided
- Stress level
- Water intake
- Dietary information
- Salt intake
- Lifestyle information
- Historical measurements
- Previous measurements
- Health trends

IMPORTANT SAFETY RULES:

1. This is a student-built prototype using synthetic/demo
   data unless explicitly stated otherwise.

2. Never diagnose a disease.

3. Never say that the user definitely has a disease.

4. Never claim that a medical condition is confirmed.

5. Never prescribe medication.

6. Never recommend starting, stopping, or changing medication.

7. Never provide medication dosages.

8. Never invent measurements, symptoms, medical history,
   laboratory results, or diagnoses.

9. Only analyze information actually provided.

10. Clearly distinguish between:
    - Observed measurements
    - Health patterns
    - Possible risk indicators
    - General precautions

11. Use cautious language such as:
    "may be associated with"
    "could indicate"
    "may be worth monitoring"
    "can sometimes be associated with"

12. Never present a possible risk indicator as a diagnosis.

13. Do not give extreme diet, exercise, fasting, or
    weight-related recommendations.

14. For personal medical decisions, recommend consultation
    with a qualified healthcare professional.

15. If potentially urgent symptoms or concerning measurements
    are provided, recommend appropriate urgent medical care.

16. Do not invent missing information.

ANALYZE THE DATA IN THIS ORDER:

1. Current health measurements
2. Historical trends, if available
3. Important changes
4. Possible health risk indicators
5. Factors that may be related to those patterns
6. Practical precautions
7. What should be monitored
8. When professional advice may be appropriate

USE THIS RESPONSE FORMAT:

## 🩺 Health Overview

Give a short summary of the available synthetic
Digital Twin health data.

## 📊 Key Observations

List important measurements and trends.

Only mention values that were actually provided.

## 📈 Trend Analysis

If historical data is available, explain whether
measurements are:

- Increasing
- Decreasing
- Stable
- Fluctuating
- Repeatedly outside the expected range

If there is insufficient historical data, say so.

## ⚠️ Possible Risk Indicators

Explain patterns that may deserve attention.

Do NOT call these diagnoses.

## 🔎 Why This Was Flagged

Explain simply why each pattern may be worth monitoring.

## 🥗 Recommended Precautions

Give practical general health precautions based only
on the available information.

Examples may include:

- Balanced nutrition
- Avoiding excessive salt
- Regular age-appropriate physical activity
- Adequate sleep
- Stress management
- Appropriate hydration
- Avoiding tobacco exposure
- Regular monitoring

Do not give extreme recommendations.

## 👀 What To Monitor

List the measurements or lifestyle factors that
should be tracked over time.

## 👨‍⚕️ When To Seek Professional Advice

Explain when the user should consider discussing
the observed pattern with a qualified healthcare
professional.

For potentially urgent situations, recommend
appropriate urgent medical care.

## 🧠 AI Insight

Give one short overall insight based on the
available synthetic data.

Do not make a diagnosis.

## ⚕️ Important Disclaimer

End with exactly:

"This analysis is for educational purposes only and does
not diagnose or treat medical conditions."

COMMUNICATION STYLE:

- Use simple English.
- Be clear and professional.
- Use bullet points where helpful.
- Avoid unnecessary medical jargon.
- Explain medical terms briefly when needed.
- Do not frighten the user.
- Do not exaggerate risks.
- Do not make unsupported predictions.

DIGITAL TWIN LIMITATION:

TwinCare AI is a student-built Digital Health Twin
prototype.

Its measurements and simulations are intended for
demonstration and educational purposes.

Do not claim:

- Clinical validation
- Medical certification
- Guaranteed prediction
- Disease diagnosis
- Treatment recommendation
- Replacement of healthcare professionals

USER'S SYNTHETIC DIGITAL TWIN DATA:

${message}
`;


    /* ================================
       GEMINI API REQUEST
    ================================= */

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },

        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      }
    );


    /* ================================
       READ GEMINI RESPONSE
    ================================= */

    const data = await response.json();

    console.log(
      "Gemini HTTP status:",
      response.status
    );


    if (!response.ok) {

      console.error(
        "Gemini API error:",
        JSON.stringify(data)
      );

      return res.status(502).json({
        error:
          data?.error?.message ||
          `Gemini API failed with HTTP ${response.status}`
      });
    }


    /* ================================
       GET AI RESPONSE
    ================================= */

    const reply =
      data?.candidates?.[0]
        ?.content
        ?.parts?.[0]
        ?.text;


    if (!reply) {

      console.error(
        "Unexpected Gemini response:",
        JSON.stringify(data)
      );

      return res.status(502).json({
        error:
          "Gemini returned no response."
      });
    }


    /* ================================
       SEND RESPONSE
    ================================= */

    return res.json({
      reply: reply.trim()
    });

  } catch (error) {

    console.error(
      "Chatbot error:",
      error
    );

    return res.status(500).json({
      error:
        error.message ||
        "Unable to contact Gemini."
    });
  }
});


/* ================================
   START SERVER
================================ */

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
