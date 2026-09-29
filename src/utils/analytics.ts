
/**
 * Utility functions for Google Analytics tracking
 */

// Track a page view
export const trackPageView = (path: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', 'G-DDHR0VPSE4', {
      page_path: path
    });
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

// Track a completed purchase. value/currency/transaction_id are GA4's
// built-in ecommerce parameters -- no custom dimension to register, and
// revenue rolls up into GA4's Monetization reports on its own.
export const trackPurchase = (transactionId: string, value: number, currency = 'USD') => {
  trackEvent('purchase', {
    transaction_id: transactionId,
    value,
    currency,
  });
};
