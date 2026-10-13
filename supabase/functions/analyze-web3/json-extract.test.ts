import { assertEquals, assertThrows } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { extractJsonObject } from "./json-extract.ts";

const obj = '{"a":1,"b":{"c":"x } y {"},"d":"quote \\" brace }"}';

Deno.test("plain object", () => assertEquals(JSON.parse(extractJsonObject(obj)).a, 1));
Deno.test("fenced object", () => assertEquals(extractJsonObject("```json\n" + obj + "\n```"), obj));
Deno.test("stray backtick after fence (lido.fi failure)", () => assertEquals(extractJsonObject("```json\n" + obj + "\n```\n`"), obj));
Deno.test("text before and after", () => assertEquals(extractJsonObject("Here is the analysis:\n" + obj + "\nHope this helps!"), obj));
Deno.test("braces inside strings do not close early", () => assertEquals(JSON.parse(extractJsonObject(obj)).b.c, "x } y {"));
Deno.test("no object throws", () => { assertThrows(() => extractJsonObject("no json here")); });
Deno.test("unterminated throws", () => { assertThrows(() => extractJsonObject('{"a": 1')); });
