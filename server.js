const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(express.static("public"));

app.get("/api/health", (req, res) => {
    res.json({
        status: "online",
        application: "HealthTwin AI",
        message: "Digital Twin backend is running"
    });
});

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

app.listen(PORT, () => {
    console.log(`HealthTwin AI running on port ${PORT}`);
});
