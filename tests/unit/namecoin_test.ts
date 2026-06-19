/**
 * Unit tests for Namecoin `.bit` / `d/` / `id/` NIP-05 resolution.
 *
 * Layered to match the module shape:
 *   - Identifier parser (no I/O)
 *   - JSON value extraction (three wire shapes + relay extraction)
 *   - ifa-0001 `import` chain expansion (mocked transport, no I/O)
 *   - Optional live end-to-end smoke test against `d/mstrofnone`
 *     (skipped unless `NSYTE_TEST_LIVE_NAMECOIN=1`)
 */
import { assertEquals } from "@std/assert";
import {
  DEFAULT_IMPORT_DEPTH,
  extractNostrFromValue,
  isNamecoinIdentifier,
  type NamecoinValueFetcher,
  parseIdentifier,
  resolveNamecoinNip05,
  resolveValueWithImports,
} from "../../src/lib/namecoin/index.ts";

const PUB_A = "1".repeat(64);
const PUB_B = "2".repeat(64);
const PUB_C = "3".repeat(64);

Deno.test("isNamecoinIdentifier accepts the canonical forms", () => {
  assertEquals(isNamecoinIdentifier("d/example"), true);
  assertEquals(isNamecoinIdentifier("id/alice"), true);
  assertEquals(isNamecoinIdentifier("alice@example.bit"), true);
  assertEquals(isNamecoinIdentifier("example.bit"), true);
  assertEquals(isNamecoinIdentifier("nostr:d/example"), true);
  assertEquals(isNamecoinIdentifier("nostr:alice@example.bit"), true);
  assertEquals(isNamecoinIdentifier("NOSTR:D/Example"), true);
});

Deno.test("isNamecoinIdentifier rejects non-Namecoin inputs", () => {
  assertEquals(isNamecoinIdentifier(""), false);
  assertEquals(isNamecoinIdentifier("alice@example.com"), false);
  assertEquals(isNamecoinIdentifier("d/"), false);
  assertEquals(isNamecoinIdentifier("id/"), false);
  assertEquals(isNamecoinIdentifier(".bit"), false);
  assertEquals(isNamecoinIdentifier("npub1abc"), false);
  assertEquals(isNamecoinIdentifier(null), false);
  assertEquals(isNamecoinIdentifier(undefined), false);
});

Deno.test("parseIdentifier maps every shape to a (name, localPart, isDomain) triple", () => {
  assertEquals(parseIdentifier("d/example"), {
    namecoinName: "d/example",
    localPart: "_",
    isDomain: true,
  });
  assertEquals(parseIdentifier("id/alice"), {
    namecoinName: "id/alice",
    localPart: "_",
    isDomain: false,
  });
  assertEquals(parseIdentifier("alice@example.bit"), {
    namecoinName: "d/example",
    localPart: "alice",
    isDomain: true,
  });
  assertEquals(parseIdentifier("example.bit"), {
    namecoinName: "d/example",
    localPart: "_",
    isDomain: true,
  });
});

Deno.test("parseIdentifier tolerates the nostr: NIP-21 prefix and case", () => {
  assertEquals(parseIdentifier("nostr:d/Example")?.namecoinName, "d/example");
  assertEquals(parseIdentifier("nostr:Alice@Example.Bit")?.localPart, "alice");
  assertEquals(parseIdentifier("ID/Alice"), {
    namecoinName: "id/alice",
    localPart: "_",
    isDomain: false,
  });
});

Deno.test("parseIdentifier rejects malformed inputs", () => {
  for (const bad of ["", "d/", "id/", "alice@.bit", "@.bit", "alice@example.com"]) {
    assertEquals(parseIdentifier(bad), null, `expected null for ${JSON.stringify(bad)}`);
  }
});

Deno.test("extractNostrFromValue: simple shape ({nostr: '<hex>'})", () => {
  const value = JSON.stringify({ nostr: PUB_A });
  const parsed = parseIdentifier("d/example")!;
  assertEquals(extractNostrFromValue(value, parsed), { pubkey: PUB_A });
});

Deno.test("extractNostrFromValue: simple shape rejected for non-root local part", () => {
  const value = JSON.stringify({ nostr: PUB_A });
  const parsed = parseIdentifier("alice@example.bit")!;
  assertEquals(extractNostrFromValue(value, parsed), null);
});

Deno.test("extractNostrFromValue: identity shape ({nostr: {pubkey, relays}})", () => {
  const value = JSON.stringify({
    nostr: { pubkey: PUB_B, relays: ["wss://relay.example"] },
  });
  const parsed = parseIdentifier("id/alice")!;
  const got = extractNostrFromValue(value, parsed);
  assertEquals(got?.pubkey, PUB_B);
  assertEquals(got?.relays, ["wss://relay.example"]);
});

Deno.test("extractNostrFromValue: domain `names` map exact-match wins over `_`", () => {
  const value = JSON.stringify({
    nostr: { names: { _: PUB_A, alice: PUB_B } },
  });
  const parsed = parseIdentifier("alice@example.bit")!;
  assertEquals(extractNostrFromValue(value, parsed)?.pubkey, PUB_B);
});

Deno.test("extractNostrFromValue: domain `names` map falls back to `_` for root", () => {
  const value = JSON.stringify({
    nostr: { names: { _: PUB_A } },
  });
  const parsed = parseIdentifier("d/example")!;
  assertEquals(extractNostrFromValue(value, parsed)?.pubkey, PUB_A);
});

Deno.test("extractNostrFromValue: d/<name> with identity-shaped value resolves at root", () => {
  // Real-world data: `d/mstrofnone`-style records carry the identity
  // shape (no `names` map) on a domain name. Only `_` resolution.
  const value = JSON.stringify({
    nostr: { pubkey: PUB_C, relays: ["wss://r1.example"] },
  });
  assertEquals(
    extractNostrFromValue(value, parseIdentifier("d/example")!)?.pubkey,
    PUB_C,
  );
  assertEquals(
    extractNostrFromValue(value, parseIdentifier("alice@example.bit")!),
    null,
  );
});

Deno.test("extractNostrFromValue: invalid JSON returns null", () => {
  assertEquals(
    extractNostrFromValue("not json", parseIdentifier("d/example")!),
    null,
  );
});

Deno.test("extractNostrFromValue: missing nostr field returns null", () => {
  assertEquals(
    extractNostrFromValue(JSON.stringify({ ip: "1.2.3.4" }), parseIdentifier("d/example")!),
    null,
  );
});

Deno.test("resolveValueWithImports: no `import` key, no I/O", async () => {
  let calls = 0;
  const fetcher: NamecoinValueFetcher = () => {
    calls++;
    return Promise.resolve(null);
  };
  const out = await resolveValueWithImports(
    JSON.stringify({ nostr: PUB_A }),
    fetcher,
  );
  assertEquals(out?.["nostr"], PUB_A);
  assertEquals(calls, 0);
});

Deno.test("resolveValueWithImports: shorthand `import` string is honoured", async () => {
  const records: Record<string, string> = {
    "d/parent": JSON.stringify({ nostr: { names: { _: PUB_A } } }),
  };
  const fetcher: NamecoinValueFetcher = (name) => Promise.resolve(records[name] ?? null);

  const merged = await resolveValueWithImports(
    JSON.stringify({ import: "d/parent" }),
    fetcher,
  );
  assertEquals(merged !== null && typeof merged === "object", true);
  // After merge, the importer inherits the parent's `nostr` field.
  const nostrField = (merged as Record<string, unknown>)["nostr"];
  assertEquals(typeof nostrField, "object");
});

Deno.test("resolveValueWithImports: importer-wins on conflict", async () => {
  const records: Record<string, string> = {
    "d/parent": JSON.stringify({ nostr: PUB_A }),
  };
  const fetcher: NamecoinValueFetcher = (name) => Promise.resolve(records[name] ?? null);

  // Importer also has `nostr` — its value wins.
  const merged = await resolveValueWithImports(
    JSON.stringify({ nostr: PUB_B, import: "d/parent" }),
    fetcher,
  );
  assertEquals((merged as Record<string, unknown>)?.["nostr"], PUB_B);
});

Deno.test("resolveValueWithImports: cycle is broken at depth limit", async () => {
  const records: Record<string, string> = {
    "d/a": JSON.stringify({ import: "d/b" }),
    "d/b": JSON.stringify({ import: "d/a" }),
  };
  const fetcher: NamecoinValueFetcher = (name) => Promise.resolve(records[name] ?? null);

  // Should not infinite-loop; should resolve to an empty object (no
  // verifiable `nostr` field on either side).
  const merged = await resolveValueWithImports(
    JSON.stringify({ import: "d/a" }),
    fetcher,
  );
  assertEquals(typeof merged, "object");
  assertEquals((merged as Record<string, unknown>)?.["nostr"], undefined);
});

Deno.test("resolveValueWithImports: default depth limit is 4", () => {
  assertEquals(DEFAULT_IMPORT_DEPTH, 4);
});

Deno.test("resolveValueWithImports: null fetcher result is absorbed", async () => {
  const fetcher: NamecoinValueFetcher = () => Promise.resolve(null);
  // `import` points at a non-existent name. Importer record still
  // resolves with its own fields.
  const merged = await resolveValueWithImports(
    JSON.stringify({ nostr: PUB_A, import: "d/missing" }),
    fetcher,
  );
  assertEquals((merged as Record<string, unknown>)?.["nostr"], PUB_A);
});

Deno.test(
  {
    name: "resolveNamecoinNip05: live d/mstrofnone smoke (NSYTE_TEST_LIVE_NAMECOIN=1)",
    ignore: Deno.env.get("NSYTE_TEST_LIVE_NAMECOIN") !== "1",
    sanitizeOps: false,
    sanitizeResources: false,
  },
  async () => {
    // Reach a real Namecoin ElectrumX endpoint. Skipped by default so
    // CI does not depend on third-party availability; enable locally
    // with `NSYTE_TEST_LIVE_NAMECOIN=1 deno test ...`.
    const result = await resolveNamecoinNip05("d/mstrofnone");
    if (result === null) {
      throw new Error(
        "live smoke: resolveNamecoinNip05(d/mstrofnone) returned null — " +
          "all 4 ElectrumX servers unreachable, or d/mstrofnone unregistered",
      );
    }
    assertEquals(/^[0-9a-f]{64}$/.test(result.pubkey), true);
  },
);
