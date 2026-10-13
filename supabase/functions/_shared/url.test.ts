import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { isPublicWebUrl } from "./url.ts";

Deno.test("accepts real sites", () => {
  for (const u of ["https://uniswap.org", "http://example.com/path?q=1", "Https://Notyoursensei.com", "https://app.aave.com/", "https://xn--80ak6aa92e.com"]) {
    assertEquals(isPublicWebUrl(u), true, u);
  }
});

Deno.test("rejects local files, hosts and junk", () => {
  for (const u of [
    "https:///C:/Users/hyund/OneDrive/Documents/ChatGPT/Design/index.html",
    "file:///C:/index.html",
    "http://localhost:3000",
    "https://myapp.local",
    "https://192.168.0.1",
    "http://[::1]/",
    "https://intranet",
    "https://user:pass@example.com",
    "https://example.c0m",
    "ftp://example.com",
    "not a url",
    "",
  ]) {
    assertEquals(isPublicWebUrl(u), false, u);
  }
});
