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

export interface EnrichmentData {
  github?: {
    repo: string; // "owner/repo"
    stars: number;
    contributors: number;
    lastCommitDate: string | null;
  };
  socialMindshare?: {
    handle: string;
    mentionCount7d: number;
  };
}

const GITHUB_SKIP_OWNERS = new Set([
  'about', 'features', 'pricing', 'marketplace', 'sponsors', 'topics',
  'collections', 'trending', 'explore', 'settings', 'login', 'join', 'orgs',
]);

export function extractGithubRepo(links: string[]): string | null {
  for (const link of links) {
    const m = link.match(/github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)/i);
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

export function extractTwitterHandle(links: string[]): string | null {
  for (const link of links) {
    const m = link.match(/(?:twitter\.com|x\.com)\/@?([a-zA-Z0-9_]+)/i);
    if (!m) continue;
    const handle = m[1];
    if (TWITTER_SKIP_HANDLES.has(handle.toLowerCase()) || handle.length === 0) continue;
    return handle;
  }
  return null;
}

async function fetchGithubStats(repo: string): Promise<EnrichmentData['github'] | null> {
  const headers = { 'Accept': 'application/vnd.github+json', 'User-Agent': 'web3-roast-enrichment' };
  try {
    const repoRes = await fetch(`https://api.github.com/repos/${repo}`, { headers, signal: AbortSignal.timeout(8000) });
    // Covers both a bad/renamed repo link (404) and rate-limiting (403) --
    // either way, not available for this scan, not an error worth surfacing.
    if (!repoRes.ok) return null;
    const repoData = await repoRes.json();

    let lastCommitDate: string | null = null;
    try {
      const commitsRes = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=1`, { headers, signal: AbortSignal.timeout(8000) });
      if (commitsRes.ok) {
        const commits = await commitsRes.json();
        lastCommitDate = commits?.[0]?.commit?.author?.date ?? null;
      }
    } catch (_) { /* non-fatal, leave null */ }

    // GitHub has no direct "total contributor count" field -- a single
    // 100-per-page request is a floor, not exact for very large projects,
    // which is an acceptable approximation for a roast, not a precise audit.
    let contributors = 0;
    try {
      const contribRes = await fetch(`https://api.github.com/repos/${repo}/contributors?per_page=100&anon=true`, { headers, signal: AbortSignal.timeout(8000) });
      if (contribRes.ok) {
        const contribData = await contribRes.json();
        contributors = Array.isArray(contribData) ? contribData.length : 0;
      }
    } catch (_) { /* non-fatal */ }

    return {
      repo,
      stars: repoData.stargazers_count ?? 0,
      contributors,
      lastCommitDate,
    };
  } catch (error) {
    console.error('GitHub enrichment failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

async function fetchSocialMindshare(handle: string, elfaApiKey: string): Promise<EnrichmentData['socialMindshare'] | null> {
  try {
    const res = await fetch(
      `https://api.elfa.ai/v2/data/keyword-mentions?keywords=${encodeURIComponent(handle)}&period=7d&limit=1`,
      { headers: { 'x-elfa-api-key': elfaApiKey }, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const body = await res.json();
    const total = body?.metadata?.total;
    if (typeof total !== 'number') return null;
    return { handle, mentionCount7d: total };
  } catch (error) {
    console.error('Elfa enrichment failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function fetchEnrichment(links: string[] | undefined, elfaApiKey?: string): Promise<EnrichmentData> {
  const safeLinks = links ?? [];
  const githubRepo = extractGithubRepo(safeLinks);
  const twitterHandle = extractTwitterHandle(safeLinks);

  const [github, socialMindshare] = await Promise.all([
    githubRepo ? fetchGithubStats(githubRepo) : Promise.resolve(null),
    twitterHandle && elfaApiKey ? fetchSocialMindshare(twitterHandle, elfaApiKey) : Promise.resolve(null),
  ]);

  return { github: github ?? undefined, socialMindshare: socialMindshare ?? undefined };
}
