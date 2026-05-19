import { getSettings, saveSettings } from '../shared/storage.js';

const form = document.getElementById('settings-form');
const status = document.getElementById('status');

const fields = {
  baseUrl: document.getElementById('baseUrl'),
  apiKey: document.getElementById('apiKey'),
  model: document.getElementById('model'),
};

async function load() {
  const settings = await getSettings();
  fields.baseUrl.value = settings.baseUrl;
  fields.apiKey.value = settings.apiKey;
  fields.model.value = settings.model;
}

function showStatus(text, isError) {
  status.textContent = text;
  status.classList.toggle('error', !!isError);
  status.classList.add('visible');
  setTimeout(() => status.classList.remove('visible'), 2000);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await saveSettings({
      baseUrl: fields.baseUrl.value.trim() || 'https://api.openai.com/v1',
      apiKey: fields.apiKey.value.trim(),
      model: fields.model.value.trim() || 'gpt-3.5-turbo',
    });
    showStatus('Saved');
  } catch (err) {
    showStatus(err.message, true);
  }
});

load();
