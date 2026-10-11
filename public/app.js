
async function searchHealthResources() {
  const input = document.getElementById("resourceSearchInput");
  const results = document.getElementById("resourceResults");

  if (!input || !results) {
    console.error("Resource Explorer HTML elements were not found.");
    return;
  }

  const query = input.value.trim();

  if (!query) {
    results.textContent = "Enter a health topic to search resources.";
    return;
  }

  results.textContent = "Searching health resources...";

  try {
    const response = await fetch(
      `/api/resources?q=${encodeURIComponent(query)}`
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Resource search failed.");
    }

    results.replaceChildren();

    if (!data.resources || data.resources.length === 0) {
      results.textContent =
        "No matching resources found. Try hypertension or health.";
      return;
    }

    data.resources.forEach((resource) => {
      const card = document.createElement("article");
      const title = document.createElement("h3");
      const description = document.createElement("p");
      const link = document.createElement("a");

      title.textContent = resource.title;
      description.textContent = resource.description;
      link.textContent = "Read resource ↗";
      link.href = resource.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      card.append(title, description, link);
      results.appendChild(card);
    });
  } catch (error) {
    console.error("Resource Explorer error:", error);
    results.textContent =
      "Unable to load resources. Please try again.";
  }
}

document
  .getElementById("resourceSearchButton")
  ?.addEventListener("click", searchHealthResources);

document
  .getElementById("resourceSearchInput")
  ?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      searchHealthResources();
    }
  });
