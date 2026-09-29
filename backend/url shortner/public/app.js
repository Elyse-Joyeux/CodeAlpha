const form = document.getElementById("shorten-form");
const input = document.getElementById("url-input");
const submitBtn = document.getElementById("submit-btn");
const errorEl = document.getElementById("error");
const resultEl = document.getElementById("result");
const shortLinkEl = document.getElementById("short-link");
const savingsEl = document.getElementById("savings");
const copyBtn = document.getElementById("copy-btn");

let copyTimer;

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearMessages() {
  errorEl.hidden = true;
  resultEl.hidden = true;
}

function showResult({ shortUrl, longUrl }) {
  shortLinkEl.href = shortUrl;
  shortLinkEl.textContent = shortUrl;

  const saved = longUrl.length - shortUrl.length;
  savingsEl.textContent =
    saved > 0 ? `${longUrl.length} characters down to ${shortUrl.length}.` : "";

  copyBtn.textContent = "Copy link";
  resultEl.hidden = false;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearMessages();

  const url = input.value.trim();
  if (!url) {
    showError("Enter a link to shorten");
    input.focus();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Shortening...";

  try {
    const response = await fetch("/api/shorten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Could not shorten that link. Try again.");
    }
    showResult(data);
  } catch (err) {
    showError(err.message || "Could not reach the server. Try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Shorten link";
  }
});

copyBtn.addEventListener("click", async () => {
  const text = shortLinkEl.textContent;

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // fallback for pages not served over https/localhost
    const helper = document.createElement("textarea");
    helper.value = text;
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
  }

  copyBtn.textContent = "Copied";
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => (copyBtn.textContent = "Copy link"), 2000);
});
