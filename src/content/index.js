let lastSelectionRect = null;
let overlayEl = null;
let originalText = '';
let originalActiveElement = null;
let refinedText = '';
let selectionRAF = null;
let lastMousePos = null;
let _selEventCount = 0;
let _selRAFCount = 0;
let _perfReported = false;

function trackSelection() {
  if (overlayEl) return;

  _selEventCount++;
  if (!_perfReported && _selEventCount >= 500) {
    _perfReported = true;
    console.debug(`[TextRefine] selectionchange fired ${_selEventCount}x, getBoundingClientRect called ${_selRAFCount}x (${((1 - _selRAFCount / _selEventCount) * 100).toFixed(0)}% dropped by rAF)`);
  }

  if (selectionRAF) return;
  selectionRAF = requestAnimationFrame(() => {
    selectionRAF = null;
    _selRAFCount++;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      lastSelectionRect = null;
      return;
    }
    lastSelectionRect = sel.getRangeAt(0).getBoundingClientRect();
  });
}

document.addEventListener('mouseup', trackSelection);
document.addEventListener('selectionchange', trackSelection);
document.addEventListener('contextmenu', (e) => {
  lastMousePos = { x: e.clientX, y: e.clientY };
});

function removeOverlay() {
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
    originalActiveElement = null;
  }
}

function positionCard(card) {
  const cardWidth = 380;
  const gap = 10;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let origin;
  if (lastMousePos) {
    origin = lastMousePos;
    lastMousePos = null;
  } else if (lastSelectionRect) {
    origin = { x: lastSelectionRect.left, y: lastSelectionRect.bottom };
  } else {
    card.style.position = 'fixed';
    card.style.top = '50%';
    card.style.left = '50%';
    card.style.transform = 'translate(-50%, -50%)';
    return;
  }

  let top = origin.y + gap;
  let left = origin.x;

  if (top + 200 > vh) {
    top = origin.y - 200 - gap;
  }
  if (left + cardWidth > vw - 8) left = vw - cardWidth - 8;
  if (left < 8) left = 8;

  card.style.position = 'fixed';
  card.style.top = Math.max(0, top) + 'px';
  card.style.left = left + 'px';
  card.style.transform = 'none';
}

function showOverlay(text) {
  removeOverlay();
  originalText = text;
  originalActiveElement = document.activeElement;

  const sel = window.getSelection();
  if (sel && !sel.isCollapsed && sel.rangeCount) {
    lastSelectionRect = sel.getRangeAt(0).getBoundingClientRect();
  }

  overlayEl = document.createElement('div');
  overlayEl.id = 'text-refine-overlay';
  overlayEl.innerHTML = `
    <div class="tr-card">
      <div class="tr-loading">
        <div class="tr-spinner"></div>
        <span>Refining...</span>
      </div>
      <div class="tr-result" style="display:none">
        <textarea class="tr-textarea" readonly spellcheck="false"></textarea>
        <div class="tr-actions">
          <button class="tr-btn tr-btn-close">&times;</button>
          <div class="tr-actions-right">
            <button class="tr-btn tr-btn-copy">Copy</button>
            <button class="tr-btn tr-btn-apply tr-btn-primary">Apply</button>
          </div>
        </div>
      </div>
      <div class="tr-error" style="display:none">
        <p class="tr-error-msg"></p>
        <button class="tr-btn tr-btn-close tr-btn-primary">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlayEl);
  positionCard(overlayEl.querySelector('.tr-card'));

  overlayEl.querySelectorAll('.tr-btn-close').forEach(btn => {
    btn.addEventListener('click', removeOverlay);
  });
}

function showFirstChunk(chunk) {
  if (!overlayEl) return;
  const loading = overlayEl.querySelector('.tr-loading');
  const result = overlayEl.querySelector('.tr-result');
  const textarea = result.querySelector('.tr-textarea');

  refinedText = chunk;
  loading.style.display = 'none';
  result.style.display = 'flex';
  textarea.value = chunk;
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 360) + 'px';

  result.querySelector('.tr-btn-copy').addEventListener('click', async () => {
    await navigator.clipboard.writeText(refinedText);
    const btn = result.querySelector('.tr-btn-copy');
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
  });

  result.querySelector('.tr-btn-apply').addEventListener('click', () => {
    applyText(refinedText);
    removeOverlay();
  });
}

function appendChunk(chunk) {
  if (!overlayEl) return;
  refinedText += chunk;
  const textarea = overlayEl.querySelector('.tr-textarea');
  textarea.value = refinedText;
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 360) + 'px';
}

function showError(error) {
  if (!overlayEl) return;
  const loading = overlayEl.querySelector('.tr-loading');
  const errEl = overlayEl.querySelector('.tr-error');

  loading.style.display = 'none';
  errEl.style.display = 'block';
  errEl.querySelector('.tr-error-msg').textContent = error;
}

function applyText(text) {
  const el = originalActiveElement;
  if (!el || el === document.body) return;

  const tag = el.tagName;
  const isInput = tag === 'INPUT' && (el.type === 'text' || el.type === 'search' || el.type === 'url' || el.type === 'email' || !el.type);

  if (tag === 'TEXTAREA' || isInput) {
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start !== undefined && end !== undefined) {
      el.setRangeText(text, start, end, 'select');
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  } else if (el.isContentEditable || getComputedStyle(el).userModify === 'read-write') {
    el.focus();
    document.execCommand('selectAll', false);
    document.execCommand('insertText', false, text);
  } else {
    let node = el;
    while (node) {
      if (node.isContentEditable) {
        node.focus();
        document.execCommand('insertText', false, text);
        return;
      }
      node = node.parentElement;
    }
  }
}

// --- Inlined shared utilities ---

const DEFAULT_SETTINGS = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-3.5-turbo',
};

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (result) => {
      resolve({ ...DEFAULT_SETTINGS, ...result });
    });
  });
}

function buildPrompt(text) {
  return `Refine the following text: fix grammar, improve clarity and style, preserve meaning. Output in the same language as the input.\n\n${text}`;
}

async function* refineTextStream(text, settings) {
  const { baseUrl, apiKey, model } = settings;

  if (!apiKey) {
    throw new Error('API key not configured. Please set it in extension options.');
  }

  const url = baseUrl.replace(/\/+$/, '') + '/chat/completions';
  const prompt = buildPrompt(text);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 4096,
      stream: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM API error (${response.status}): ${body}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;

      const data = trimmed.slice(6);
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          yield content;
        }
      } catch {
        // Skip unparseable lines
      }
    }
  }
}

async function doRefineInPage(text) {
  refinedText = '';
  showOverlay(text);

  try {
    const settings = await getSettings();
    const stream = refineTextStream(text, settings);

    let firstChunk = true;
    for await (const chunk of stream) {
      if (firstChunk) {
        showFirstChunk(chunk);
        firstChunk = false;
      } else {
        appendChunk(chunk);
      }
    }
    refinedText = refinedText || '';
  } catch (err) {
    showError(err.message);
  }
}

// --- Message handling ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'showOverlay':
      refinedText = '';
      showOverlay(message.text);
      break;
    case 'refineInPage':
      sendResponse({ received: true });
      doRefineInPage(message.text);
      break;
    case 'refineForPopup': {
      const reqId = message.requestId;
      sendResponse({ received: true });
      getSettings().then((settings) => {
        const stream = refineTextStream(message.text, settings);
        return (async () => {
          try {
            let first = true;
            for await (const chunk of stream) {
              chrome.runtime.sendMessage({
                action: 'refineChunk',
                text: chunk,
                first: first,
                requestId: reqId,
              });
              first = false;
            }
            chrome.runtime.sendMessage({ action: 'refineDone', requestId: reqId });
          } catch (err) {
            chrome.runtime.sendMessage({ action: 'refineError', error: err.message, requestId: reqId });
          }
        })();
      }).catch((err) => {
        chrome.runtime.sendMessage({ action: 'refineError', error: err.message, requestId: reqId });
      });
      return true;
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && overlayEl) {
    removeOverlay();
  }
});
