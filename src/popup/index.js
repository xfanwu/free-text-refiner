import { getSettings } from '../shared/storage.js';
import { refineTextStream } from '../shared/llm.js';

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

function showResult() {
  resultArea.classList.add('visible');
}

refineBtn.addEventListener('click', async () => {
  const text = inputText.value.trim();
  if (!text) return;

  hideError();
  resultArea.classList.remove('visible');
  resultText.textContent = '';
  setLoading(true);

  try {
    const settings = await getSettings();
    const stream = refineTextStream(text, settings);

    let firstChunk = true;
    let result = '';
    for await (const chunk of stream) {
      result += chunk;
      resultText.textContent = result;
      if (firstChunk) {
        firstChunk = false;
        setLoading(false);
        showResult();
      }
    }
    lastResult = result;
    setLoading(false);
    if (!result) {
      showError('No response from LLM.');
    }
  } catch (err) {
    showError(err.message);
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

const charCount = document.getElementById('char-count');

inputText.addEventListener('input', () => {
  charCount.textContent = inputText.value.length;
});

inputText.focus();
