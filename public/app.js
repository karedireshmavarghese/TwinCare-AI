async function sendMessage() {
  const input = document.getElementById("chat-input");
  const message = input.value.trim();

  if (!message) return;

  addMessage("user", message);
  input.value = "";

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
      addMessage("ai", data.error || "AI assistant is unavailable.");
      return;
    }

    addMessage("ai", data.reply);
  } catch (error) {
    loadingMessage.remove();
    addMessage("ai", "Network error. Please try again.");
  }
}
