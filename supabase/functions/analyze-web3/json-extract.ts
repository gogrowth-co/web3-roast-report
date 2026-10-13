// Pulls the first complete JSON object out of a model reply. Models wrap
// the object in markdown fences, add a sentence before it, or leave stray
// characters after it (a lido.fi roast failed on "```\n`" after the closing
// brace). Scans braces outside of strings, so braces inside text values
// don't end the object early.
export function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON object in model reply");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error("Unterminated JSON object in model reply");
}
