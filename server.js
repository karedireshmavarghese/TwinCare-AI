app.get("/api/resources", async (req, res) => {
  try {
    const query = req.query.q || "hypertension health education";

    // Temporary response to test the frontend
    res.json({
      success: true,
      query,
      resources: [
        {
          title: "WHO – Hypertension",
          url: "https://www.who.int/news-room/fact-sheets/detail/hypertension",
          description: "Learn about high blood pressure, its risks, and prevention."
        },
        {
          title: "NHS – High Blood Pressure",
          url: "https://www.nhs.uk/conditions/high-blood-pressure-hypertension/",
          description: "Educational information about hypertension."
        }
      ]
    });
  } catch (error) {
    console.error("Resource API error:", error);
    res.status(500).json({
      success: false,
      error: "Unable to load health resources."
    });
  }
});
