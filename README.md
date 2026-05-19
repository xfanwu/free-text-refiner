# Free Text Refiner

Chrome extension for instant text refinement via LLM (OpenAI-compatible API).

## Features

- **Right-click Refine** — select text anywhere, right-click → "Refine" → streaming result in a floating overlay
- **Toolbar popup** — click extension icon → textarea + Refine button; auto-detects page selection and refines immediately
- **Auto-apply** — replaces original text in textarea/input/contenteditable elements
- **Streaming responses** — results appear word-by-word, no waiting for full generation
- **Language-agnostic** — LLM detects input language and responds in kind
- **Dark + light mode** — overlay matches system preference

## Install

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select this directory
4. Go to extension **Options** (right-click icon → Options, or popup → Settings) and configure your API key

## Settings

| Field | Default | Notes |
|---|---|---|
| API Base URL | `https://api.openai.com/v1` | Any OpenAI-compatible endpoint |
| API Key | *(required)* | Stored locally via `chrome.storage.sync` |
| Model | `gpt-3.5-turbo` | e.g. `gpt-4`, `deepseek-v4-pro` |

## Architecture

```
manifest.json           # MV3 manifest
src/
├── background/
│   └── index.js        # Service worker: context menu, LLM proxy, streaming IPC
├── content/
│   ├── index.js        # Injected into pages: floating overlay, auto-apply
│   └── overlay.css     # Overlay card styles (dark/light)
├── options/
│   ├── index.html      # Settings page UI
│   └── index.js        # Settings form logic
├── popup/
│   ├── index.html      # Toolbar popup UI
│   └── index.js        # Popup: auto-detect selection, refine, copy
└── shared/
    ├── llm.js          # OpenAI-compatible API client (streaming SSE)
    ├── prompt.js       # Language-aware prompt builder
    └── storage.js      # chrome.storage.sync wrapper
icons/                  # Extension icons (16/48/128px PNG)
```

## Development

- Plain JS with ES modules — no bundler needed
- `content_security_policy` allows Google Fonts (`fonts.googleapis.com` / `fonts.gstatic.com`) in extension pages
- Permissions: `contextMenus`, `storage`, `activeTab`, `scripting`
- Reload extension after changes at `chrome://extensions`
- Check console output:
  - **Popup**: right-click popup → Inspect
  - **Service worker**: `chrome://extensions` → "Inspect views: service worker"
  - **Content script**: page DevTools → Console