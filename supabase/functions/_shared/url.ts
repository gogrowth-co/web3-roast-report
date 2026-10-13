// A roastable URL is a public website: http(s), a real hostname with a dot
// and a letter TLD, no credentials, no IP literals, no localhost. Rejects the
// things visitors actually pasted, such as a local file path
// ("https:///C:/Users/...") or "localhost:3000". Mirrored in
// src/utils/url.ts for the form; keep the two in sync.
export function isPublicWebUrl(raw: string): boolean {
  if (typeof raw !== "string") return false;
  const s = raw.trim();
  if (s.length === 0 || s.length > 2048) return false;
  if (/^https?:\/\/\//i.test(s)) return false; // empty host, e.g. https:///C:/...
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  if (u.username || u.password) return false;
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (!host.includes(".")) return false;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (/^[\d.]+$/.test(host) || host.startsWith("[")) return false; // IPv4 / IPv6 literal
  const tld = host.split(".").pop() ?? "";
  if (!/^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/.test(tld)) return false;
  return true;
}
