// Decides whether a Stripe checkout belongs to Web3 Roast.
//
// The Stripe account is shared with Token Health Scan and the Growth Audit,
// and this endpoint receives every event on the account. Without this check a
// THS or Growth Audit sale would send Gabriel a "Pro Roast sold" alert, email
// that buyer a Roast confirmation, and report a fake Roast purchase to
// ChatGPT Ads.
//
// The rule leans toward keeping a real sale: a checkout counts as Roast if
// create-checkout tagged it (metadata.roastId) OR any line item is on a Roast
// product, which also catches Roast payment links that carry no roastId.

export interface RoastSaleInput {
  metadata: Record<string, string> | null | undefined;
  lineItemProductIds: string[];
  roastProductIds: Set<string>;
}

export function isRoastSale({ metadata, lineItemProductIds, roastProductIds }: RoastSaleInput): boolean {
  if (metadata?.roastId) return true;
  return lineItemProductIds.some((id) => roastProductIds.has(id));
}

// ROAST_PRODUCT_IDS (optional, comma-separated) adds products beyond the one
// behind STRIPE_PRICE_ID, for any future Roast product.
export function parseProductIds(raw: string | undefined | null): string[] {
  return (raw ?? "").split(",").map((s) => s.trim()).filter((s) => s.startsWith("prod_"));
}
