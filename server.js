const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));


// ===============================
// HEALTH CHECK
// ===============================

app.get("/api/health", (req, res) => {
    res.json({
        status: "online",
        application: "TwinCare AI",
        message: "Digital Twin backend is running"
    });
});


// ===============================
// SERPAPI HEALTH RESOURCES
// ===============================

app.get("/api/resources", async (req, res) => {
    try {

        const condition = String(
            req.query.condition || "hypertension"
        ).trim();

        if (!condition) {
            return res.status(400).json({
                error: "Health topic is required."
            });
        }

        const apiKey = process.env.SERPAPI_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "SerpApi is not configured."
            });
        }

        const query = `${condition} health education`;

        const params = new URLSearchParams({
            engine: "google",
            q: query,
            api_key: apiKey
        });

        const response = await fetch(
            `https://serpapi.com/search.json?${params}`
        );

        const data = await response.json();

        if (!response.ok) {
            return res.status(502).json({
                error: "SerpApi request failed."
            });
        }

        const results = (data.organic_results || [])
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

        console.error("Resource search error:", error);

        res.status(500).json({
            error: "Unable to retrieve resources."
        });
    }
});


// ===============================
// AI CHATBOT
// ===============================

app.post("/api/chat", async (req, res) => {

    try {

        const message = String(
            req.body.message || ""
        ).trim();

        if (!message) {
            return res.status(400).json({
                error: "Message is required."
            });
        }

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "Gemini API is not configured."
            });
        }


        const systemInstruction = `
You are TwinCare Assistant, an educational AI assistant
inside a student-built Digital Health Twin prototype.

Your job is to provide general health education in clear,
simple language.

Important rules:

- Do not diagnose diseases.
- Do not prescribe medicines.
- Do not tell users to change medication doses.
- Do not claim that the Digital Twin is clinically validated.
- Do not pretend simulated data is real medical data.
- Encourage users to speak with a qualified healthcare professional
  for personal medical decisions.
- For urgent or severe symptoms, advise seeking appropriate
  urgent medical care.
- Keep answers concise, understandable and helpful.
- You may explain concepts such as blood pressure, heart rate,
  sleep, exercise, nutrition and health trends.
`;

        const prompt = `
${systemInstruction}

User question:
${message}
`;


        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
            encodeURIComponent(apiKey),
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    contents: [
                        {
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


        const data = await response.json();


        if (!response.ok) {

            console.error("Gemini error:", data);

            return res.status(502).json({
                error: "AI service request failed."
            });
        }


        const reply =
            data?.candidates?.[0]?.content?.parts?.[0]?.text;


        if (!reply) {

            return res.status(502).json({
                error: "The AI did not return a response."
            });
        }


        res.json({
            reply
        });


    } catch (error) {

        console.error("Chatbot error:", error);

        res.status(500).json({
            error: "Unable to contact the AI assistant."
        });
    }

});


// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {

    console.log(
        `TwinCare AI running on port ${PORT}`
    );

});
