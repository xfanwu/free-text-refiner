let lastSelectionRect = null;
let overlayEl = null;
let originalText = '';
let originalActiveElement = null;

function trackSelection() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) {
    lastSelectionRect = null;
    return;
  }
  const range = sel.getRangeAt(0);
  lastSelectionRect = range.getBoundingClientRect();
}

document.addEventListener('mouseup', trackSelection);
document.addEventListener('selectionchange', trackSelection);

function removeOverlay() {
  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
    originalActiveElement = null;
  }
}

function positionCard(card) {
  const rect = lastSelectionRect;
  if (!rect) {
    card.style.position = 'fixed';
    card.style.top = '50%';
    card.style.left = '50%';
    card.style.transform = 'translate(-50%, -50%)';
    return;
  }

  card.style.position = 'fixed';
  const gap = 10;
  const cardWidth = 380;
  let top = rect.bottom + gap;
  let left = rect.left;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (top + 200 > vh) {
    top = rect.top - 200 - gap;
  }
  if (left + cardWidth > vw - 8) {
    left = vw - cardWidth - 8;
  }
  if (left < 8) left = 8;

  card.style.top = Math.max(0, top) + 'px';
  card.style.left = left + 'px';
  card.style.transform = 'none';
}

function showOverlay(text) {
  removeOverlay();
  originalText = text;
  originalActiveElement = document.activeElement;

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

function showResult(text) {
  if (!overlayEl) return;
  const loading = overlayEl.querySelector('.tr-loading');
  const result = overlayEl.querySelector('.tr-result');
  const textarea = result.querySelector('.tr-textarea');

  loading.style.display = 'none';
  result.style.display = 'flex';
  textarea.value = text;

  // Auto-adjust height
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 360) + 'px';

  result.querySelector('.tr-btn-copy').addEventListener('click', async () => {
    await navigator.clipboard.writeText(text);
    const btn = result.querySelector('.tr-btn-copy');
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
  });

  result.querySelector('.tr-btn-apply').addEventListener('click', () => {
    applyText(text);
    removeOverlay();
  });
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
    // Try to find a contenteditable ancestor
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'showOverlay':
      showOverlay(message.text);
      break;
    case 'refineResult':
      showResult(message.text);
      break;
    case 'refineError':
      showError(message.error);
      break;
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && overlayEl) {
    removeOverlay();
  }
});
