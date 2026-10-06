const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));


/* =========================
   HEALTH CHECK
========================= */

app.get("/api/health", (req, res) => {

    res.json({
        status: "online",
        application: "TwinCare AI",
        message: "Digital Twin backend is running"
    });

});


/* =========================
   SERPAPI RESOURCES
========================= */

app.get("/api/resources", async (req, res) => {

    try {

        const condition = String(
            req.query.condition || "hypertension"
        ).trim();

        const apiKey = process.env.SERPAPI_KEY;

        if (!apiKey) {

            return res.status(500).json({
                error: "SerpApi is not configured."
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
            "Resource search error:",
            error
        );


        res.status(500).json({

            error:
                "Unable to retrieve resources."

        });

    }

});


/* =========================
   GEMINI CHATBOT
========================= */

app.post("/api/chat", async (req, res) => {

    try {

        const message =
            String(
                req.body?.message || ""
            ).trim();


        if (!message) {

            return res.status(400).json({

                error:
                    "Message is required."

            });

        }


        const apiKey =
            process.env.GEMINI_API_KEY;


        if (!apiKey) {

            console.error(
                "GEMINI_API_KEY is missing."
            );


            return res.status(500).json({

                error:
                    "Gemini API key is not configured."

            });

        }


        const prompt = `
You are TwinCare Assistant,
an educational AI assistant inside
a student-built Digital Health Twin prototype.

Answer the user's question clearly and simply.

Important safety rules:

- Provide general health education only.
- Do not diagnose diseases.
- Do not prescribe medicines.
- Do not recommend changing medicine doses.
- Do not claim that TwinCare AI is clinically validated.
- Treat all TwinCare measurements as synthetic demonstration data.
- Encourage consultation with a qualified healthcare professional
  for personal medical decisions.
- If the user describes a potentially serious or emergency situation,
  advise them to seek appropriate urgent medical care.
- Keep responses concise and easy to understand.

User question:

${message}
`;


        const response = await fetch(

            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",

            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "x-goog-api-key":
                        apiKey

                },

                body: JSON.stringify({

                    contents: [

                        {

                            role: "user",

                            parts: [

                                {

                                    text:
                                        prompt

                                }

                            ]

                        }

                    ]

                })

            }

        );


        const data =
            await response.json();


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
                    "Gemini API request failed."

            });

        }


        const reply =
            data?.candidates?.[0]
                ?.content?.parts?.[0]
                ?.text;


        if (!reply) {

            console.error(
                "Gemini returned no text:",
                JSON.stringify(data)
            );


            return res.status(502).json({

                error:
                    "Gemini returned an empty response."

            });

        }


        res.json({

            reply: reply.trim()

        });


    } catch (error) {

        console.error(
            "Chatbot server error:",
            error
        );


        res.status(500).json({

            error:
                "Unable to contact Gemini."

        });

    }

});


/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {

    console.log(
        `TwinCare AI running on port ${PORT}`
    );

});
