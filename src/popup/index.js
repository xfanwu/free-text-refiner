import { getSettings } from '../shared/storage.js';
import { refineText } from '../shared/llm.js';

const inputText = document.getElementById('input-text');
const refineBtn = document.getElementById('refine-btn');
const errorMsg = document.getElementById('error-msg');
const resultArea = document.getElementById('result-area');
const resultText = document.getElementById('result-text');
const copyBtn = document.getElementById('copy-btn');
const openSettings = document.getElementById('open-settings');

let lastResult = '';

function setLoading(loading) {
  refineBtn.disabled = loading;
  refineBtn.innerHTML = loading
    ? '<span class="spinner"></span>Refining...'
    : 'Refine';
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.add('visible');
  resultArea.classList.remove('visible');
}

function hideError() {
  errorMsg.classList.remove('visible');
}

function showResult(text) {
  lastResult = text;
  resultText.textContent = text;
  resultArea.classList.add('visible');
}

refineBtn.addEventListener('click', async () => {
  const text = inputText.value.trim();
  if (!text) return;

  hideError();
  resultArea.classList.remove('visible');
  setLoading(true);

  try {
    const settings = await getSettings();
    const refined = await refineText(text, settings);
    showResult(refined);
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
});

copyBtn.addEventListener('click', async () => {
  await navigator.clipboard.writeText(lastResult);
  copyBtn.textContent = 'Copied!';
  setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
});

openSettings.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

// Auto-focus textarea
inputText.focus();
