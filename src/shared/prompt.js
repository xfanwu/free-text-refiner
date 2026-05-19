export function buildPrompt(text) {
  return `Refine the following text: fix grammar, improve clarity and style, preserve meaning. Output in the same language as the input.\n\n${text}`;
}
