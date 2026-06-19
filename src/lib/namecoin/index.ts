/**
 * Public surface for Namecoin `.bit` NIP-05 resolution.
 *
 * Wraps the low-level TCP+TLS transport, the ifa-0001 `import` resolver,
 * and the JSON value extractor behind a single cached entry point.
 *
 * Server-side (Deno) implementation using `Deno.connectTls`. Each
 * endpoint in {@link DEFAULT_ELECTRUMX_SERVERS} is reachable from any
 * host with outbound TCP; the self-signed operators are trusted via
 * the pinned PEMs in `pinned-certs.ts`.
 */
import { parseIdentifier } from "./identifier.ts";
import {
  DEFAULT_ELECTRUMX_SERVERS,
  type ElectrumXServer,
  makeNameLookup,
  nameShowWithFallback,
} from "./transport.ts";
import {
  extractNostrFromValue,
  type NamecoinResolveResult,
  resolveValueWithImports,
} from "./value.ts";
import {
  deleteInflightNamecoinResolve,
  getCachedNamecoinResolve,
  getInflightNamecoinResolve,
  setCachedNamecoinResolve,
  setInflightNamecoinResolve,
} from "./cache.ts";

export {
  isDotBit,
  isNamecoinIdentifier,
  type ParsedIdentifier,
  parseIdentifier,
} from "./identifier.ts";
export { DEFAULT_ELECTRUMX_SERVERS, type ElectrumXServer } from "./transport.ts";
export {
  DEFAULT_IMPORT_DEPTH,
  extractNostrFromValue,
  type NamecoinResolveResult,
  type NamecoinValueFetcher,
  resolveValueWithImports,
} from "./value.ts";

/**
 * Resolve a `.bit` / `d/` / `id/` identifier to a Nostr pubkey + relay
 * list. Returns `null` if the identifier is malformed, the name is not
 * registered (or expired), the value lacks a verifiable `nostr` field,
 * the ifa-0001 `import` chain fails to converge, or every configured
 * server is unreachable.
 *
 * Session-cached and deduped by in-flight key so repeated lookups of
 * the same identifier hit a single round trip per process.
 */
// deno-lint-ignore require-await
export async function resolveNamecoinNip05(
  identifier: string,
  servers?: ElectrumXServer[],
): Promise<NamecoinResolveResult | null> {
  const cached = getCachedNamecoinResolve(identifier, servers);
  if (cached !== undefined) return cached;

  const inflight = getInflightNamecoinResolve(identifier, servers);
  if (inflight) return inflight;

  const p = (async () => {
    try {
      const result = await queryProfileWithImports(identifier, servers);
      setCachedNamecoinResolve(identifier, result, servers);
      return result;
    } catch {
      setCachedNamecoinResolve(identifier, null, servers);
      return null;
    } finally {
      deleteInflightNamecoinResolve(identifier, servers);
    }
  })();
  setInflightNamecoinResolve(identifier, p, servers);
  return p;
}

async function queryProfileWithImports(
  identifier: string,
  serversArg?: ElectrumXServer[],
): Promise<NamecoinResolveResult | null> {
  const parsed = parseIdentifier(identifier);
  if (!parsed) return null;

  const servers = serversArg ?? DEFAULT_ELECTRUMX_SERVERS;
  const rawValueJSON = await nameShowWithFallback(parsed.namecoinName, servers);
  if (rawValueJSON == null) return null;

  // Walk ifa-0001 `import` chains so a leaf-name pointing at a parent
  // resolves correctly. `lookupNameValue` is the same TCP+TLS fallback
  // chain we just used; it is also session-deduped at the transport
  // layer because every sub-name has its own cache key.
  const lookup = makeNameLookup(servers);
  const merged = await resolveValueWithImports(rawValueJSON, lookup);
  if (!merged) return null;

  return extractNostrFromValue(merged, parsed);
}
