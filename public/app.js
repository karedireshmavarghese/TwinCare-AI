async function searchResources(query = "hypertension") {
  try {
    const response = await fetch(
      `/api/resources?q=${encodeURIComponent(query)}`
    );

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      const text = await response.text();
      throw new Error(
        `Expected JSON but received HTML or another response: ${text.slice(0, 150)}`
      );
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Resource search failed");
    }

    console.log("Resources loaded:", data.resources);
    return data.resources || [];
  } catch (error) {
    console.error("Resource Explorer error:", error);
    return [];
  }
}
