import { buildPrompt } from './prompt.js';

export async function refineText(text, settings) {
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
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM API error (${response.status}): ${body}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Unexpected API response: no content in choices');
  }

  return content.trim();
}
