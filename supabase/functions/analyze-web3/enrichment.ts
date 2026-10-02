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
  repo?: string;     // "owner/repo" in repo scope, just "owner" in org scope
  scope?: 'repo' | 'org';
  stars?: number;    // org scope: summed over its most recently pushed public repos
  publicRepos?: number; // org scope only
  contributors?: number; // omitted, not zero, when the contributors call failed
  lastCommitDate?: string | null; // org scope: most recent push across repos
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

export type GithubTarget = { scope: 'org'; owner: string } | { scope: 'repo'; repo: string };

// Prefer the org/user link: a project's org-wide activity is the honest
// health signal, whereas the first owner/repo link on a marketing page is
// usually incidental (a brand-assets zip, an SDK sample). Caught live:
// uniswap.org links github.com/Uniswap AND a brand-assets download, and
// matching only owner/repo scored Uniswap as "5 stars".
export function extractGithubTarget(links: string[]): GithubTarget | null {
  const parsed: { owner: string; segments: string[] }[] = [];
  for (const link of links) {
    if (getHostname(link) !== 'github.com') continue;
    let pathname: string;
    try {
      pathname = new URL(link).pathname;
    } catch {
      continue;
    }
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) continue;
    const owner = segments[0];
    if (!/^[a-zA-Z0-9_-]+$/.test(owner) || GITHUB_SKIP_OWNERS.has(owner.toLowerCase())) continue;
    parsed.push({ owner, segments });
  }
  const orgLink = parsed.find((p) => p.segments.length === 1);
  if (orgLink) return { scope: 'org', owner: orgLink.owner };
  const repoLink = parsed.find((p) => p.segments.length === 2 && /^[a-zA-Z0-9_.-]+$/.test(p.segments[1]));
  if (repoLink) return { scope: 'repo', repo: `${repoLink.owner}/${repoLink.segments[1].replace(/\.git$/i, '')}` };
  // Only deep links (blob/raw/releases...) -- they still identify the owner.
  if (parsed.length > 0) return { scope: 'org', owner: parsed[0].owner };
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
      scope: 'repo',
      stars: repoData.stargazers_count ?? 0,
      contributors,
      lastCommitDate,
    };
  } catch (error) {
    console.error('GitHub enrichment failed:', error instanceof Error ? error.message : error);
    return { linked: true, available: false, repo };
  }
}

async function fetchGithubOrgStats(owner: string): Promise<GithubSignal> {
  const headers = { 'Accept': 'application/vnd.github+json', 'User-Agent': 'web3-roast-enrichment' };
  try {
    // 100 most recently pushed public repos: a floor for huge orgs, fine for
    // a roast. Orgs and personal accounts use different endpoints.
    let res = await fetch(`https://api.github.com/orgs/${owner}/repos?type=public&sort=pushed&per_page=100`, { headers, signal: AbortSignal.timeout(8000) });
    if (res.status === 404) {
      res = await fetch(`https://api.github.com/users/${owner}/repos?type=owner&sort=pushed&per_page=100`, { headers, signal: AbortSignal.timeout(8000) });
    }
    if (!res.ok) return { linked: true, available: false, repo: owner, scope: 'org' };
    const repos = await res.json();
    if (!Array.isArray(repos) || repos.length === 0) return { linked: true, available: false, repo: owner, scope: 'org' };
    const own = repos.filter((r: { fork?: boolean }) => !r.fork);
    const pool = own.length > 0 ? own : repos;
    const stars = pool.reduce((sum: number, r: { stargazers_count?: number }) => sum + (r.stargazers_count ?? 0), 0);
    const pushes = pool.map((r: { pushed_at?: string }) => r.pushed_at).filter(Boolean) as string[];
    pushes.sort();
    return {
      linked: true,
      available: true,
      repo: owner,
      scope: 'org',
      stars,
      publicRepos: pool.length,
      lastCommitDate: pushes.length ? pushes[pushes.length - 1] : null,
    };
  } catch (error) {
    console.error('GitHub org enrichment failed:', error instanceof Error ? error.message : error);
    return { linked: true, available: false, repo: owner, scope: 'org' };
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
  const githubTarget = extractGithubTarget(safeLinks);
  const twitterHandle = extractTwitterHandle(safeLinks);

  const [github, social] = await Promise.all([
    githubTarget
      ? (githubTarget.scope === 'org' ? fetchGithubOrgStats(githubTarget.owner) : fetchGithubStats(githubTarget.repo))
      : Promise.resolve<GithubSignal>({ linked: false, available: false }),
    twitterHandle && elfaApiKey
      ? fetchSocialMindshare(twitterHandle, elfaApiKey)
      : Promise.resolve<SocialSignal>({ linked: !!twitterHandle, available: false, handle: twitterHandle ?? undefined }),
  ]);

  return { github, social };
}
