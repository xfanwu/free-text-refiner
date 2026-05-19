import { buildPrompt } from './prompt.js';

export async function refineText(text, settings) {
  const chunks = [];
  for await (const chunk of refineTextStream(text, settings)) {
    chunks.push(chunk);
  }
  return chunks.join('');
}

export async function* refineTextStream(text, settings) {
  const { baseUrl, apiKey, model } = settings;

  if (!apiKey) {
    throw new Error('API key not configured. Please set it in extension options.');
  }

  const url = baseUrl.replace(/\/+$/, '') + '/chat/completions';
  const prompt = buildPrompt(text);

  const tStart = performance.now();
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
  let firstToken = false;

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
          if (!firstToken) {
            firstToken = true;
            console.log(`[TextRefine] First token: ${(performance.now() - tStart).toFixed(0)}ms`);
          }
          yield content;
        }
      } catch {
        // Skip unparseable lines
      }
    }
  }
}
