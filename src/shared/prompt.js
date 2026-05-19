export function detectLanguage(text) {
  let cjk = 0;
  let cyrillic = 0;
  let total = 0;

  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0x3040 && code <= 0x309f) || // Hiragana
      (code >= 0x30a0 && code <= 0x30ff) || // Katakana
      (code >= 0xac00 && code <= 0xd7af)    // Hangul
    ) {
      cjk++;
    } else if (code >= 0x0400 && code <= 0x04ff) {
      cyrillic++;
    }
    total++;
  }

  if (total === 0) return 'English';

  if (cjk / total > 0.15) return 'Chinese';
  if (cyrillic / total > 0.15) return 'Russian';

  return 'English';
}

export function buildPrompt(text) {
  const lang = detectLanguage(text);
  return `Refine the following text: fix grammar, improve clarity and style, preserve meaning. Output in ${lang}.\n\n${text}`;
}
