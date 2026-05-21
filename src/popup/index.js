const inputText = document.getElementById('input-text');
const refineBtn = document.getElementById('refine-btn');
const errorMsg = document.getElementById('error-msg');
const resultArea = document.getElementById('result-area');
const resultText = document.getElementById('result-text');
const copyBtn = document.getElementById('copy-btn');
const openSettings = document.getElementById('open-settings');
const charCount = document.getElementById('char-count');

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

async function doRefine(text) {
  hideError();
  resultArea.classList.remove('visible');
  resultText.textContent = '';
  setLoading(true);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    showError('Cannot access the current tab.');
    setLoading(false);
    return;
  }

  const requestId = Date.now().toString() + Math.random().toString(36).slice(2);

  const listener = (msg) => {
    if (msg.requestId !== requestId) return;
    switch (msg.action) {
      case 'refineChunk':
        lastResult += msg.text;
        resultText.textContent = lastResult;
        if (msg.first) {
          setLoading(false);
          showResult();
        }
        break;
      case 'refineError':
        showError(msg.error);
        setLoading(false);
        chrome.runtime.onMessage.removeListener(listener);
        break;
      case 'refineDone':
        chrome.runtime.onMessage.removeListener(listener);
        break;
    }
  };
  chrome.runtime.onMessage.addListener(listener);

  try {
    await chrome.tabs.sendMessage(tab.id, {
      action: 'refineForPopup',
      text: text,
      requestId: requestId,
    });
    lastResult = '';
  } catch {
    showError('Cannot communicate with the page. Try refreshing the page.');
    setLoading(false);
    chrome.runtime.onMessage.removeListener(listener);
  }
}

refineBtn.addEventListener('click', () => {
  const text = inputText.value.trim();
  if (!text) return;
  doRefine(text);
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

inputText.addEventListener('input', () => {
  charCount.textContent = inputText.value.length;
});

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    inputText.focus();
    return;
  }

  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString().trim() || '',
    });
    const selected = result?.result;
    if (selected) {
      inputText.value = selected;
      inputText.dispatchEvent(new Event('input'));
      doRefine(selected);
    } else {
      inputText.focus();
    }
  } catch {
    inputText.focus();
  }
}

init();
