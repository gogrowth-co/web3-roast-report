// Real Web3 signal to replace the model guessing "does this feel Web3-native"
// from vibes alone. Both signals are opportunistic: only fetched when the
// scraped page actually links a GitHub repo or an X/Twitter handle. No
// fallback-guessing from the page title -- a wrong match (wrong repo, wrong
// handle) is worse for credibility than reporting nothing, per the enrichment
// scoping doc (gtm-roast-14 follow-up).
//
// GitHub client ported from Token Health Scan's proven
// supabase/functions/_shared/githubAPI.ts pattern, not called live -- THS is
// a separate product with its own cost economics, so this is the same API
// calls with Web3 Roast's own (unauthenticated) rate limit, not a cross-call.
// Twitter/X signal is CT mindshare (mention volume via Elfa), not a follower
// count -- there's no free follower-count API, and mention volume is
// arguably a sharper "is anyone actually talking about this" finding anyway.
//
// Three-state result per signal, not a boolean: a link was never found on
// the page vs. a link was found but the lookup failed (rate limit, timeout,
// deleted repo) are different facts, and only the first is safe to tell the
// model as "nothing here" -- conflating them was a real bug caught in
// pre-push review: a transient GitHub rate limit was being reported to the
// prompt as "no repo linked," an unverifiable negative stated as fact.

export interface GithubSignal {
  linked: boolean;   // a github.com link was found on the page
  available: boolean; // the lookup succeeded (only meaningful if linked)
  repo?: string;
  stars?: number;
  contributors?: number; // omitted, not zero, when the contributors call failed
  lastCommitDate?: string | null;
}

export interface SocialSignal {
  linked: boolean;   // a twitter.com/x.com link was found on the page
  available: boolean; // the lookup succeeded (only meaningful if linked)
  handle?: string;
  mentionCount7d?: number;
}

export interface EnrichmentData {
  github: GithubSignal;
  social: SocialSignal;
}

function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

const GITHUB_SKIP_OWNERS = new Set([
  'about', 'features', 'pricing', 'marketplace', 'sponsors', 'topics',
  'collections', 'trending', 'explore', 'settings', 'login', 'join', 'orgs',
]);

export function extractGithubRepo(links: string[]): string | null {
  for (const link of links) {
    if (getHostname(link) !== 'github.com') continue;
    let pathname: string;
    try {
      pathname = new URL(link).pathname;
    } catch {
      continue;
    }
    const m = pathname.match(/^\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)/);
    if (!m) continue;
    const [, owner, repoRaw] = m;
    const repo = repoRaw.replace(/\.git$/i, '');
    if (GITHUB_SKIP_OWNERS.has(owner.toLowerCase()) || !repo) continue;
    return `${owner}/${repo}`;
  }
  return null;
}

const TWITTER_SKIP_HANDLES = new Set([
  'intent', 'share', 'home', 'search', 'i', 'hashtag', 'login', 'signup', 'compose',
]);
const TWITTER_HOSTS = new Set(['twitter.com', 'x.com']);

export function extractTwitterHandle(links: string[]): string | null {
  for (const link of links) {
    const host = getHostname(link);
    if (!host || !TWITTER_HOSTS.has(host)) continue;
    let pathname: string;
    try {
      pathname = new URL(link).pathname;
    } catch {
      continue;
    }
    const m = pathname.match(/^\/@?([a-zA-Z0-9_]+)/);
    if (!m) continue;
    const handle = m[1];
    if (TWITTER_SKIP_HANDLES.has(handle.toLowerCase()) || handle.length === 0) continue;
    return handle;
  }
  return null;
}

async function fetchGithubStats(repo: string): Promise<GithubSignal> {
  const headers = { 'Accept': 'application/vnd.github+json', 'User-Agent': 'web3-roast-enrichment' };
  try {
    const repoRes = await fetch(`https://api.github.com/repos/${repo}`, { headers, signal: AbortSignal.timeout(8000) });
    // 404 (bad/renamed link) and 403/429 (rate limit) are both "couldn't
    // verify," never reported to the model as "no repo linked" -- the link
    // was found, only the lookup failed.
    if (!repoRes.ok) return { linked: true, available: false, repo };
    const repoData = await repoRes.json();

    let lastCommitDate: string | null = null;
    try {
      const commitsRes = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=1`, { headers, signal: AbortSignal.timeout(8000) });
      if (commitsRes.ok) {
        const commits = await commitsRes.json();
        lastCommitDate = commits?.[0]?.commit?.author?.date ?? null;
      }
    } catch (_) { /* leave null, not fatal to the rest */ }

    // No direct "total contributor count" field in the GitHub API -- a
    // single 100-per-page request is a floor for large projects, not exact,
    // acceptable for a roast. Left undefined (not 0) on failure so the
    // prompt never cites a fabricated zero.
    let contributors: number | undefined;
    try {
      const contribRes = await fetch(`https://api.github.com/repos/${repo}/contributors?per_page=100&anon=true`, { headers, signal: AbortSignal.timeout(8000) });
      if (contribRes.ok) {
        const contribData = await contribRes.json();
        if (Array.isArray(contribData)) contributors = contribData.length;
      }
    } catch (_) { /* leave undefined */ }

    return {
      linked: true,
      available: true,
      repo,
      stars: repoData.stargazers_count ?? 0,
      contributors,
      lastCommitDate,
    };
  } catch (error) {
    console.error('GitHub enrichment failed:', error instanceof Error ? error.message : error);
    return { linked: true, available: false, repo };
  }
}

async function fetchSocialMindshare(handle: string, elfaApiKey: string): Promise<SocialSignal> {
  try {
    const res = await fetch(
      `https://api.elfa.ai/v2/data/keyword-mentions?keywords=${encodeURIComponent(handle)}&period=7d&limit=1`,
      { headers: { 'x-elfa-api-key': elfaApiKey }, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return { linked: true, available: false, handle };
    const body = await res.json();
    const total = body?.metadata?.total;
    if (typeof total !== 'number') return { linked: true, available: false, handle };
    return { linked: true, available: true, handle, mentionCount7d: total };
  } catch (error) {
    console.error('Elfa enrichment failed:', error instanceof Error ? error.message : error);
    return { linked: true, available: false, handle };
  }
}

export async function fetchEnrichment(links: string[] | undefined, elfaApiKey?: string): Promise<EnrichmentData> {
  const safeLinks = links ?? [];
  const githubRepo = extractGithubRepo(safeLinks);
  const twitterHandle = extractTwitterHandle(safeLinks);

  const [github, social] = await Promise.all([
    githubRepo ? fetchGithubStats(githubRepo) : Promise.resolve<GithubSignal>({ linked: false, available: false }),
    twitterHandle && elfaApiKey
      ? fetchSocialMindshare(twitterHandle, elfaApiKey)
      : Promise.resolve<SocialSignal>({ linked: !!twitterHandle, available: false, handle: twitterHandle ?? undefined }),
  ]);

  return { github, social };
}
