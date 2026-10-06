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
   RESOURCE SEARCH
================================ */

app.get("/api/resources", async (req, res) => {

  try {

    const condition =
      String(
        req.query.condition || "hypertension"
      ).trim();

    const apiKey =
      process.env.SERPAPI_KEY;

    if (!apiKey) {

      return res.status(500).json({
        error: "SERPAPI_KEY is not configured."
      });

    }

    const params =
      new URLSearchParams({
        engine: "google",
        q: `${condition} health education`,
        api_key: apiKey
      });

    const response =
      await fetch(
        `https://serpapi.com/search.json?${params}`
      );

    const data =
      await response.json();

    if (!response.ok) {

      console.error(
        "SerpApi error:",
        data
      );

      return res.status(502).json({
        error: "SerpApi request failed."
      });

    }

    const results =
      (data.organic_results || [])
        .slice(0, 5)
        .map(item => ({
          title: item.title,
          link: item.link,
          snippet: item.snippet
        }));

    res.json({
      condition,
      results
    });

  } catch (error) {

    console.error(
      "Resource error:",
      error
    );

    res.status(500).json({
      error: "Unable to retrieve resources."
    });

  }

});


/* ================================
   AI CHATBOT
================================ */

app.post("/api/chat", async (req, res) => {

  try {

    const message =
      String(
        req.body?.message || ""
      ).trim();


    if (!message) {

      return res.status(400).json({
        error: "Message is required."
      });

    }


    /* GET GEMINI KEY */

    const apiKey =
      process.env.GEMINI_API_KEY;


    console.log(
      "Gemini key detected:",
      Boolean(apiKey)
    );


    if (!apiKey) {

      return res.status(500).json({
        error:
          "GEMINI_API_KEY is not available to the server."
      });

    }


    /* AI PROMPT */

    const prompt = `
You are TwinCare Assistant.

You are an educational AI assistant
inside a student-built Digital Health Twin
prototype.

Give clear and simple health education.

Rules:

- Do not diagnose diseases.
- Do not prescribe medicines.
- Do not recommend changing medicine doses.
- Do not claim clinical validation.
- Treat TwinCare measurements as synthetic demo data.
- Encourage users to consult qualified healthcare
  professionals for personal medical decisions.
- For emergencies, advise seeking urgent medical care.

User question:

${message}
`;


    /* GEMINI REQUEST */

    const response =
      await fetch(
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


    /* READ RESPONSE */

    const data =
      await response.json();


    console.log(
      "Gemini status:",
      response.status
    );


    /* GEMINI ERROR */

    if (!response.ok) {

      console.error(
        "Gemini API error:",
        JSON.stringify(data)
      );

      return res.status(502).json({

        error:
          data?.error?.message ||
          "Gemini API request failed."

      });

    }


    /* GET AI TEXT */

    const reply =
      data?.candidates?.[0]
        ?.content
        ?.parts?.[0]
        ?.text;


    if (!reply) {

      console.error(
        "Gemini response:",
        JSON.stringify(data)
      );

      return res.status(502).json({
        error:
          "Gemini returned no response."
      });

    }


    /* SEND AI RESPONSE */

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
