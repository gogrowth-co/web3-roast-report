
/**
 * Utility functions for Google Analytics tracking
 */

// Both of Web3 Roast's GA4 destinations (index.html) -- its own standalone
// property, and mangabeira.net's existing stream directly (gtm-roast-07's
// cross-domain pattern, not a second stream -- see the comment in
// index.html for why a dedicated stream was tried and reverted). trackEvent's
// gtag('event', ...) calls already fan out to every configured destination
// automatically; a page_path re-config, like this SPA's route-change
// tracking, targets one id at a time and must be sent to both explicitly or
// the unified property never sees route changes.
const GA4_MEASUREMENT_IDS = ['G-DDHR0VPSE4', 'G-77SVSK807V'];

// Track a page view
// The lead token (?k=) in an emailed report link unlocks that report; it
// must never be sent to GA as part of a page path.
const stripPrivateParams = (path: string) => {
  const [base, query] = path.split('?');
  if (!query) return path;
  const params = new URLSearchParams(query);
  params.delete('k');
  const rest = params.toString();
  return rest ? `${base}?${rest}` : base;
};

export const trackPageView = (rawPath: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  const path = stripPrivateParams(rawPath);
  for (const id of GA4_MEASUREMENT_IDS) {
    window.gtag('config', id, { page_path: path });
  }
};

// Track an event
export const trackEvent = (
  eventName: string,
  eventParams?: Record<string, any>
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, eventParams);
  }
};

// Track form submissions
export const trackFormSubmission = (formName: string, formData?: Record<string, any>) => {
  trackEvent('form_submission', {
    form_name: formName,
    ...formData
  });
};

// Track user sign up
export const trackSignUp = (method: string) => {
  trackEvent('sign_up', {
    method: method
  });
};

// Track URL submission
export const trackUrlSubmission = (url: string) => {
  trackEvent('url_submission', {
    url: url.replace(/^https?:\/\//, '').split('/')[0] // Only track domain for privacy
  });
};

// purchase is sent server-side by stripe-webhook (GA4 Measurement Protocol),
// so it counts even when the buyer never reaches /order-complete or has no
// account. The browser only reports the steps before it.
const PRO_ROAST_ITEM = { item_id: 'pro-roast', item_name: 'Pro Roast' };

// Clicked the Pro Roast offer (before Stripe).
export const trackBeginCheckout = () => {
  trackEvent('begin_checkout', { items: [PRO_ROAST_ITEM] });
};

// Gave an email to get the full free report.
export const trackGenerateLead = () => {
  trackEvent('generate_lead', { lead_source: 'free_roast_report' });
};

// Google sign-ups land back on the site through an OAuth redirect, so the
// email form's sign_up event never fires for them. Called on SIGNED_IN for a
// brand-new Google user, once per user.
export const trackOAuthSignUpOnce = (userId: string, provider: string, createdAt: string) => {
  try {
    const ageMs = Date.now() - new Date(createdAt).getTime();
    if (!(ageMs >= 0 && ageMs < 10 * 60 * 1000)) return;
    const key = `signup_tracked_${userId}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    trackSignUp(provider);
  } catch (_) {
    // storage blocked: skip rather than risk double counting
  }
};

// GA4 client id for Roast's own property, so the server-side purchase joins
// the buyer's session. Resolves null if gtag is blocked or slow.
export const getGaClientId = (): Promise<string | null> =>
  new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.gtag) return resolve(null);
    const timer = setTimeout(() => resolve(null), 800);
    try {
      window.gtag('get', 'G-DDHR0VPSE4', 'client_id', (id: unknown) => {
        clearTimeout(timer);
        resolve(typeof id === 'string' ? id : null);
      });
    } catch (_) {
      clearTimeout(timer);
      resolve(null);
    }
  });

// OpenAI's own ad-click attribution identifier. Confirmed against the real
// oaiq.min.js pixel source (not guessed): it reads an `oppref` query param
// on landing and caches it for 30 days, first-touch only. The JS pixel
// isn't installed here (server-side Conversions API is used instead -- see
// create-checkout/stripe-webhook), so this replicates just the capture half
// of what that pixel does, so our own server-side events can carry the same
// identifier and actually match back to the ad click that drove them.
const OPPREF_STORAGE_KEY = 'oppref';
const OPPREF_TTL_MS = 30 * 24 * 60 * 60 * 1000; // matches the real oaiq pixel's own 720h cookie expiry

interface StoredOppref {
  value: string;
  expiresAt: number;
}

function readStoredOppref(): StoredOppref | null {
  try {
    const raw = localStorage.getItem(OPPREF_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.value !== 'string' || typeof parsed?.expiresAt !== 'number') return null;
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(OPPREF_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch (_) {
    return null;
  }
}

export const captureOppref = () => {
  if (typeof window === 'undefined') return;
  try {
    const oppref = new URLSearchParams(window.location.search).get('oppref');
    // First-touch only, but an EXPIRED stored value doesn't count as a
    // touch -- readStoredOppref() already clears it once past 30 days, so a
    // visitor returning through a new ad after that window correctly
    // recaptures instead of keeping the stale identifier forever.
    if (oppref && !readStoredOppref()) {
      const stored: StoredOppref = { value: oppref, expiresAt: Date.now() + OPPREF_TTL_MS };
      localStorage.setItem(OPPREF_STORAGE_KEY, JSON.stringify(stored));
    }
  } catch (_) {
    // localStorage can throw in private/restricted browsing -- attribution
    // capture is best-effort, never worth breaking the page over.
  }
};

export const getOppref = (): string | null => {
  if (typeof window === 'undefined') return null;
  return readStoredOppref()?.value ?? null;
};
