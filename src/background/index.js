import { getSettings } from '../shared/storage.js';
import { refineTextStream } from '../shared/llm.js';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'refine-text',
    title: 'Refine',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'refine-text' || !info.selectionText) return;
  if (!tab?.id) return;

  const text = info.selectionText.trim();

  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'showOverlay', text });
  } catch {
    return;
  }

  try {
    const settings = await getSettings();
    const stream = refineTextStream(text, settings);

    let firstChunk = true;
    for await (const chunk of stream) {
      await chrome.tabs.sendMessage(tab.id, {
        action: firstChunk ? 'refineFirstChunk' : 'refineChunk',
        text: chunk,
      });
      firstChunk = false;
    }
    await chrome.tabs.sendMessage(tab.id, { action: 'refineDone' });
  } catch (err) {
    await chrome.tabs.sendMessage(tab.id, { action: 'refineError', error: err.message });
  }
});
