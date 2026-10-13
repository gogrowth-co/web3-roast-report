import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { isRoastSale, parseProductIds } from "./roast-sale.ts";

const ROAST = new Set(["prod_roast"]);

Deno.test("Roast checkout from create-checkout (roastId tag) counts", () => {
  assertEquals(isRoastSale({ metadata: { roastId: "r1" }, lineItemProductIds: [], roastProductIds: ROAST }), true);
});

Deno.test("Roast-priced sale with no roastId (payment link) still counts", () => {
  assertEquals(isRoastSale({ metadata: {}, lineItemProductIds: ["prod_roast"], roastProductIds: ROAST }), true);
});

Deno.test("THS checkout (user_id tag, THS product) is ignored", () => {
  assertEquals(
    isRoastSale({ metadata: { user_id: "u1" }, lineItemProductIds: ["prod_SL06FmW2V1gnjJ"], roastProductIds: ROAST }),
    false,
  );
});

Deno.test("Growth Audit checkout (other product, no metadata) is ignored", () => {
  assertEquals(isRoastSale({ metadata: null, lineItemProductIds: ["prod_audit"], roastProductIds: ROAST }), false);
});

Deno.test("empty roastId tag does not count on its own", () => {
  assertEquals(isRoastSale({ metadata: { roastId: "" }, lineItemProductIds: ["prod_audit"], roastProductIds: ROAST }), false);
});

Deno.test("no known Roast product and no tag is ignored", () => {
  assertEquals(isRoastSale({ metadata: {}, lineItemProductIds: ["prod_roast"], roastProductIds: new Set() }), false);
});

Deno.test("parseProductIds keeps only product ids", () => {
  assertEquals(parseProductIds(" prod_a, ,price_x,prod_b "), ["prod_a", "prod_b"]);
  assertEquals(parseProductIds(undefined), []);
});
