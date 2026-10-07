const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;

/* ================================
   MIDDLEWARE
================================ */

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

    console.log(
      "SERPAPI KEY EXISTS:",
      apiKey.length > 0
    );

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

    console.log(
      "SerpApi HTTP status:",
      response.status
    );

    if (!response.ok) {

      console.error(
        "SerpApi error:",
        JSON.stringify(data)
      );

      return res.status(502).json({
        error:
          data?.error ||
          `SerpApi request failed with HTTP ${response.status}`
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

    return res.json({
      condition,
      results
    });

  } catch (error) {

    console.error(
      "Resource error:",
      error
    );

    return res.status(500).json({
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

    /* GET USER MESSAGE */

    const message = String(
      req.body?.message || ""
    ).trim();


    if (!message) {

      return res.status(400).json({
        error: "Message is required."
      });

    }


    /* ================================
       GET GEMINI API KEY
    ================================= */

    const apiKey = String(
      process.env.GEMINI_API_KEY || ""
    ).trim();


    /*
       SAFE DEBUGGING

       We NEVER print the actual API key.
    */

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
       AI PROMPT
    ================================= */

    const prompt = `
You are TwinCare Assistant.

You are an educational AI assistant inside
a student-built Digital Health Twin prototype.

Your role is to provide simple, clear,
general health education.

IMPORTANT SAFETY RULES:

- Do not diagnose diseases.
- Do not prescribe medicines.
- Do not recommend changing medicine doses.
- Do not claim that the Digital Twin is clinically validated.
- Treat TwinCare measurements as synthetic demonstration data.
- Do not present simulated values as real patient measurements.
- Encourage users to consult qualified healthcare professionals
  for personal medical decisions.
- For urgent or emergency symptoms, advise seeking immediate
  medical attention.

Keep responses clear and easy to understand.

User question:

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


    /* ================================
       GEMINI API ERROR
    ================================= */

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
       EXTRACT AI RESPONSE
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
       SEND RESPONSE TO FRONTEND
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

app.listen(
  PORT,
  () => {

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

  }
);
