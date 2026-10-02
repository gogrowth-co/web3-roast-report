// Single place for sender identity and the brand email shell, so moving the
// sending domain is one secret (EMAIL_FROM), not a code change per function.
// The default stays the already-verified legacy sender until the new domain
// is verified in Resend; sending from an unverified domain would be rejected.
export const FROM = Deno.env.get("EMAIL_FROM") ?? "Web3ROAST <contact@email.web3roast.com>";
export const REPLY_TO = "gmangabeira@gmail.com";
export const SITE = "https://roast.mangabeira.net";

export const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;");

// Raw fetch, not the SDK: v2 of the resend package can't set Idempotency-Key,
// which makes retried calls (claim, Stripe webhook) safe against duplicates.
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}): Promise<{ ok: boolean; error?: string }> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.error("Email skipped: RESEND_API_KEY not set");
    return { ok: false, error: "RESEND_API_KEY not set" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": opts.idempotencyKey,
      },
      body: JSON.stringify({
        from: FROM,
        to: [opts.to],
        reply_to: REPLY_TO,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const detail = `${res.status} ${(await res.text()).slice(0, 240)}`;
      console.error("Resend rejected email (non-fatal):", detail);
      return { ok: false, error: detail };
    }
    return { ok: true };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("Email send failed (non-fatal):", detail);
    return { ok: false, error: detail };
  }
}

function shell(inner: string): string {
  return `<div style="background:#F5F7FA;padding:24px 12px;">
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:8px;padding:32px;color:#0A2540;font-size:16px;line-height:1.6;">
${inner}
<p style="margin:28px 0 0;font-size:13px;line-height:1.5;color:#8B9BAD;">Gabriel Mangabeira, Web3 Roast. You are getting this because you signed up at roast.mangabeira.net.</p>
</div></div>`;
}

const button = (label: string, href: string) =>
  `<p style="margin:24px 0;"><a href="${href}" style="background:#FFB800;color:#0A2540;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:8px;display:inline-block;">${escapeHtml(label)}</a></p>`;

// AI text sometimes carries markdown emphasis; plain email shouldn't show it.
const clip = (raw: string, n: number) => {
  const s = raw.replace(/[*_`]+/g, "").trim();
  return s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, "") + "...";
};

// deno-lint-ignore no-explicit-any
function pickFix(a: any): { issue: string; fix: string } | null {
  const rank = (sev: unknown) => {
    const s = String(sev ?? "").toLowerCase();
    return s.includes("high") || s.includes("crit") ? 0 : s.includes("med") || s.includes("imp") ? 1 : s.includes("low") || s.includes("min") ? 2 : 3;
  };
  const fixMap = Array.isArray(a?.rawAnalysis?.fixMap) ? a.rawAnalysis.fixMap : [];
  const fromMap = [...fixMap].filter((f) => f?.issue && f?.suggestedFix).sort((x, y) => rank(x.severity) - rank(y.severity))[0];
  if (fromMap) return { issue: String(fromMap.issue), fix: String(fromMap.suggestedFix) };
  const fb = Array.isArray(a?.feedback) ? a.feedback : [];
  const f = [...fb].filter((x) => x?.category && x?.feedback).sort((x, y) => rank(x.severity) - rank(y.severity))[0];
  return f ? { issue: String(f.category), fix: String(f.feedback) } : null;
}

// deno-lint-ignore no-explicit-any
export function resultEmail(opts: { url: string; analysis: any; roastId: string }) {
  let domain = opts.url;
  try { domain = new URL(opts.url).hostname.replace(/^www\./, ""); } catch { /* keep raw */ }
  const a = opts.analysis ?? {};
  const score: number | null = typeof a.overallScore === "number" ? a.overallScore : null;
  const cats = Object.entries(a.categoryScores ?? {}).filter(([, v]) => typeof v === "number") as [string, number][];
  cats.sort((x, y) => y[1] - x[1]);
  const best = cats[0];
  const weakest = cats.length > 1 ? cats[cats.length - 1] : undefined;
  const fix = pickFix(a);
  const link = `${SITE}/results/${opts.roastId}`;

  const subject = score != null ? `Your roast of ${domain} is saved (${score}/100)` : `Your roast of ${domain} is saved`;
  const d = escapeHtml(domain);
  const lines: string[] = [];
  const text: string[] = [];
  lines.push(`<p style="margin:0 0 16px;">Hi,</p>`);
  lines.push(`<p style="margin:0 0 16px;">Your account is ready and your roast is saved. ${d}${score != null ? ` scored <strong>${score}/100</strong>` : " is analyzed"}.</p>`);
  text.push("Hi,", "", `Your account is ready and your roast is saved. ${domain}${score != null ? ` scored ${score}/100` : " is analyzed"}.`);
  if (best && weakest) {
    lines.push(`<p style="margin:0 0 16px;">Strongest area: ${escapeHtml(best[0])} (${best[1]}%).<br>Weakest area: ${escapeHtml(weakest[0])} (${weakest[1]}%).</p>`);
    text.push("", `Strongest area: ${best[0]} (${best[1]}%).`, `Weakest area: ${weakest[0]} (${weakest[1]}%).`);
  }
  if (fix) {
    lines.push(`<p style="margin:0 0 8px;">The finding I would read first:</p>`);
    lines.push(`<p style="margin:0 0 16px;padding:12px 16px;background:#F5F7FA;border-radius:8px;"><strong>${escapeHtml(clip(fix.issue, 160))}</strong><br>${escapeHtml(clip(fix.fix, 420))}</p>`);
    text.push("", "The finding I would read first:", clip(fix.issue, 160), clip(fix.fix, 420));
  }
  lines.push(button("Read the full roast", link));
  lines.push(`<p style="margin:0 0 16px;">The roast stays in your dashboard, so you can come back to it any time.</p>`);
  lines.push(`<p style="margin:0 0 16px;">If you want a person to go through it with you, the Expert Video Roast is a 20-minute walkthrough that I record myself. You can order it from your results page.</p>`);
  lines.push(`<p style="margin:0 0 16px;">Reply to this email and it comes straight to me.</p>`);
  lines.push(`<p style="margin:0;">Gabriel Mangabeira<br><span style="color:#5B6F85;">Web3 growth consultant, ex-Binance LATAM</span></p>`);
  text.push("", `Read the full roast: ${link}`, "", "The roast stays in your dashboard, so you can come back to it any time.", "", "If you want a person to go through it with you, the Expert Video Roast is a 20-minute walkthrough that I record myself. You can order it from your results page.", "", "Reply to this email and it comes straight to me.", "", "Gabriel Mangabeira", "Web3 growth consultant, ex-Binance LATAM");
  return { subject, html: shell(lines.join("\n")), text: text.join("\n") };
}

export function welcomeEmail() {
  const html = shell([
    `<p style="margin:0 0 16px;">Hi,</p>`,
    `<p style="margin:0 0 16px;">Your Web3 Roast account is ready. Paste a project URL and you get a score, a category breakdown, and fixes ranked by impact.</p>`,
    button("Roast a page", SITE),
    `<p style="margin:0 0 16px;">Reply to this email and it comes straight to me.</p>`,
    `<p style="margin:0;">Gabriel Mangabeira<br><span style="color:#5B6F85;">Web3 growth consultant, ex-Binance LATAM</span></p>`,
  ].join("\n"));
  const text = ["Hi,", "", "Your Web3 Roast account is ready. Paste a project URL and you get a score, a category breakdown, and fixes ranked by impact.", "", `Roast a page: ${SITE}`, "", "Reply to this email and it comes straight to me.", "", "Gabriel Mangabeira", "Web3 growth consultant, ex-Binance LATAM"].join("\n");
  return { subject: "Your Web3 Roast account is ready", html, text };
}
