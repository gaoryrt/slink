import "./main.css";

function generateRandomKey() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 2; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

document.getElementById("generateBtn").addEventListener("click", function (e) {
  e.preventDefault();
  e.stopPropagation();
  const keyInput = document.getElementById("key");
  keyInput.value = generateRandomKey();
  keyInput.focus();
});

document
  .getElementById("createForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const content = document.getElementById("content").value.trim();
    const key = document.getElementById("key").value.trim();
    const submitBtn = document.getElementById("submitBtn");
    const result = document.getElementById("result");

    if (!content || !key) {
      showResult("Please fill in all fields", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "...";

    try {
      const response = await fetch("/api/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content, key }),
      });

      const data = await response.json();

      if (response.ok) {
        const shortUrl = `${window.location.origin}/${data.short}/${key}`;
        showResult(
          `
        <div class="short-link">${shortUrl}</div>
        <div class="short-link">${data.commitHash}</div>
      `,
          "success"
        );
        document.getElementById("createForm").reset();
        document.getElementById("key").value = "";
      } else {
        showResult(`Failed to create link: ${data.error}`, "error");
      }
    } catch (error) {
      showResult(`Network error: ${error.message}`, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "→";
    }
  });

function showResult(message, type) {
  const result = document.getElementById("result");
  result.innerHTML = message;
  result.className = `result ${type}`;
  result.style.display = "block";
  result.scrollIntoView({ behavior: "smooth" });
}
