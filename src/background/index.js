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
    await chrome.tabs.sendMessage(tab.id, { action: 'refineInPage', text });
  } catch (err) {
    console.debug('[TextRefine] Context menu: could not reach content script —', err.message);
  }
});
