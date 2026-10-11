document.addEventListener("DOMContentLoaded", () => {
  loadResources();

  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");
  const sendButton = document.getElementById("send-button");

  const resourceSearchInput = document.getElementById("resource-search-input");
  const resourceSearchButton = document.getElementById("resource-search-button");

  if (chatForm) {
    chatForm.addEventListener("submit", event => {
      event.preventDefault();
      sendMessage();
    });
  }

  if (sendButton) {
    sendButton.addEventListener("click", event => {
      event.preventDefault();
      sendMessage();
    });
  }

  if (resourceSearchButton) {
    resourceSearchButton.addEventListener("click", () => {
      loadResources(resourceSearchInput.value);
    });
  }

  if (resourceSearchInput) {
    resourceSearchInput.addEventListener("keypress", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        loadResources(resourceSearchInput.value);
      }
    });
  }

  function addMessage(sender, text) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("chat-message", sender);

    messageElement.innerHTML = `
      <div class="message-content">${text}</div>
    `;

    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return messageElement;
  }

  async function sendMessage() {
    const message = chatInput.value.trim();

    if (!message) {
      return;
    }

    addMessage("user", message);
    chatInput.value = "";

    const loadingMessage = addMessage("ai", "Thinking...");

    try {
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message })
      });

      const data = await response.json();

      loadingMessage.remove();

      if (!response.ok) {
        addMessage(
          "ai",
          data.error || "The AI assistant is unavailable. Please try again."
        );
        return;
      }

      addMessage("ai", data.reply);
    } catch (error) {
      loadingMessage.remove();

      addMessage(
        "ai",
        "Network error. Please check your connection and try again."
      );
    }
  }

  async function loadResources(searchText = "") {
    const container = document.getElementById("resources-container");

    if (!container) {
      return;
    }

    container.innerHTML = "<p>Loading health resources...</p>";

    try {
      const response = await fetch(
        `/api/resources?q=${encodeURIComponent(searchText)}`
      );

      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        container.innerHTML =
          "<p>No resources found. Try another health topic.</p>";
        return;
      }

      container.innerHTML = data.results
        .map(
          resource => `
            <div class="resource-card">
              <h3>${resource.title}</h3>
              <p>${resource.description}</p>
              <a href="${resource.url}" target="_blank" rel="noopener">
                Read from ${resource.source}
              </a>
            </div>
          `
        )
        .join("");
    } catch (error) {
      container.innerHTML =
        "<p>Could not load resources. Please try again later.</p>";
    }
  }
});
