/**
 * ElectrumX over raw TCP+TLS transport for Namecoin name lookups.
 *
 * Server-side (Deno) implementation using `Deno.connectTls` with pinned
 * self-signed certificates for operators that do not run a publicly
 * trusted CA. The pinning is on-by-default for the known self-signed
 * endpoints; `Deno.connectTls({ caCerts })` accepts both the system
 * roots and any pinned PEMs in the same trust store, so the LE-cert
 * endpoint stays verifiable normally.
 *
 * Holds the default server list, the minimal newline-delimited
 * JSON-RPC-2.0 client, and the `name_show` lookup that walks
 * `blockchain.scripthash.get_history` → `blockchain.transaction.get`.
 * The same `lookupNameValue` function is exposed to the value layer so
 * the ifa-0001 `import` resolver in `value.ts` can re-enter the TLS
 * path for sub-imports.
 */
import { buildNameIndexScript, electrumScriptHash, extractNameValue } from "./script.ts";
import { PINNED_ELECTRUMX_CERTS } from "./pinned-certs.ts";

/** A single Namecoin ElectrumX endpoint over TCP+TLS. */
export type ElectrumXServer = {
  /** Hostname, e.g. `electrum.nmc.ethicnology.com`. */
  host: string;
  /** Port serving ElectrumX TCP+TLS (typically 50002 or 57002). */
  port: number;
};

/**
 * Default list of Namecoin ElectrumX TCP+TLS endpoints, tried in order
 * until one returns a definitive result (name found, expired, or
 * missing). Probed live 2026-06-19.
 *
 * Trust model: the LE-certificated host verifies against system roots;
 * the remaining three present self-signed RSA-2048 certificates and are
 * trusted only because their leaf PEMs are pinned in
 * {@link PINNED_ELECTRUMX_CERTS}. PEM rotations require a coordinated
 * update of that constant.
 *
 * The Amethyst quartz list additionally carries `46.229.238.187` and
 * `23.158.233.10` (bare-IP peers of the named hosts). Bare-IP TLS
 * requires either an IP-SAN cert or hostname-verification override;
 * neither is portable, so they are intentionally omitted.
 */
export const DEFAULT_ELECTRUMX_SERVERS: ElectrumXServer[] = [
  // ElectrumX 1.19.0, public Let's Encrypt cert — verifies via system roots.
  { host: "electrum.nmc.ethicnology.com", port: 50002 },
  // Self-signed; PEM pinned in PINNED_ELECTRUMX_CERTS.
  { host: "electrumx.testls.space", port: 50002 },
  // Self-signed; PEM pinned.
  { host: "nmc2.bitcoins.sk", port: 57002 },
  // Self-signed; PEM pinned.
  { host: "relay.testls.bit", port: 50002 },
];

/** Names whose latest update is this many blocks behind the tip are expired. */
const NAME_EXPIRE_DEPTH = 36_000;

class NameMissError extends Error {}

/**
 * Walk `servers` in order, returning the latest `name_update` value
 * JSON string for `name`. Returns `null` if any server says the name
 * does not exist (definitive miss) and no later server returns a
 * value, or if every server failed. Transport errors fall through to
 * the next server.
 */
export async function nameShowWithFallback(
  name: string,
  servers: ElectrumXServer[],
): Promise<string | null> {
  let definitiveMiss = false;
  for (const srv of servers) {
    try {
      const value = await nameShow(name, srv);
      // A successful `null` here means the name resolved but is expired
      // — treat as definitive (don't keep trying other servers).
      if (value === null) return null;
      return value;
    } catch (err) {
      if (err instanceof NameMissError) {
        definitiveMiss = true;
        continue;
      }
      // Transport error — try next server.
    }
  }
  return definitiveMiss ? null : null;
}

const textEncoder = new TextEncoder();

async function nameShow(
  name: string,
  srv: ElectrumXServer,
): Promise<string | null> {
  const rpc = await RPC.connect(srv);
  try {
    await rpc.call("server.version", ["nsyte/namecoin-nip05", "1.4"]);

    const script = buildNameIndexScript(textEncoder.encode(name));
    const scriptHash = electrumScriptHash(script);
    const history = await rpc.call<Array<{ tx_hash: string; height: number }>>(
      "blockchain.scripthash.get_history",
      [scriptHash],
    );
    if (!history || history.length === 0) throw new NameMissError();
    const latest = history[history.length - 1];

    const tx = await rpc.call<{
      vout: Array<{ scriptPubKey?: { hex?: string } }>;
    }>("blockchain.transaction.get", [latest.tx_hash, true]);

    // Expiry check (best-effort): subscribe to headers to learn the
    // chain tip, then compare to the latest update height. Failures
    // here are non-fatal.
    let currentHeight = 0;
    try {
      const header = await rpc.call<{ height?: number }>(
        "blockchain.headers.subscribe",
        [],
      );
      if (header && typeof header.height === "number") {
        currentHeight = header.height;
      }
    } catch {
      // ignore
    }
    if (
      currentHeight > 0 &&
      latest.height > 0 &&
      currentHeight - latest.height >= NAME_EXPIRE_DEPTH
    ) {
      return null; // expired
    }

    return extractNameValue(tx.vout, name);
  } finally {
    rpc.close();
  }
}

/**
 * Resolve `name`'s raw value JSON via the same fallback chain used by
 * user-facing lookups. Exposed so the ifa-0001 `import` resolver in
 * `value.ts` can re-enter the transport for sub-imports without
 * having to thread the server list through every layer.
 */
export function makeNameLookup(
  servers: ElectrumXServer[],
): (namecoinName: string) => Promise<string | null> {
  return (namecoinName: string) => nameShowWithFallback(namecoinName, servers);
}

/**
 * Minimal newline-delimited JSON-RPC-2.0 client over `Deno.connectTls`.
 *
 * Every outbound call carries a per-request timeout so a server that
 * accepts the socket but never replies cannot stall verification flows;
 * {@link nameShowWithFallback} catches the timeout error and moves on
 * to the next server.
 */
class RPC {
  static readonly CONNECT_TIMEOUT_MS = 6000;
  static readonly REQUEST_TIMEOUT_MS = 8000;
  static readonly NEWLINE = "\n".charCodeAt(0);

  private conn: Deno.TlsConn;
  private writer: WritableStreamDefaultWriter<Uint8Array>;
  private id = 0;
  private buffer = new Uint8Array(0);
  private pending = new Map<
    number,
    {
      resolve: (v: unknown) => void;
      reject: (e: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private closed = false;
  private readLoop: Promise<void>;

  private constructor(conn: Deno.TlsConn) {
    this.conn = conn;
    this.writer = conn.writable.getWriter();
    this.readLoop = this.startReadLoop();
  }

  static async connect(srv: ElectrumXServer): Promise<RPC> {
    const connectPromise = Deno.connectTls({
      hostname: srv.host,
      port: srv.port,
      caCerts: [...PINNED_ELECTRUMX_CERTS],
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`namecoin/transport: connect timeout: ${srv.host}:${srv.port}`)),
        RPC.CONNECT_TIMEOUT_MS,
      );
    });

    try {
      const conn = await Promise.race([connectPromise, timeoutPromise]);
      if (timer) clearTimeout(timer);
      return new RPC(conn);
    } catch (err) {
      if (timer) clearTimeout(timer);
      // If `Deno.connectTls` itself was still pending when we rejected,
      // make sure we don't leak the socket.
      connectPromise.then((c) => {
        try {
          c.close();
        } catch {
          // ignore
        }
      }).catch(() => {
        // ignore
      });
      throw err;
    }
  }

  private async startReadLoop(): Promise<void> {
    const decoder = new TextDecoder();
    try {
      for await (const chunk of this.conn.readable) {
        const merged = new Uint8Array(this.buffer.length + chunk.length);
        merged.set(this.buffer, 0);
        merged.set(chunk, this.buffer.length);
        this.buffer = merged;

        // Drain newline-delimited frames.
        let idx = this.buffer.indexOf(RPC.NEWLINE);
        while (idx !== -1) {
          const line = this.buffer.slice(0, idx);
          this.buffer = this.buffer.slice(idx + 1);
          if (line.length > 0) {
            this.handleLine(decoder.decode(line));
          }
          idx = this.buffer.indexOf(RPC.NEWLINE);
        }
      }
    } catch {
      // Connection closed mid-read; reject anything still pending.
    } finally {
      this.rejectAllPending(new Error("namecoin/transport: connection closed"));
    }
  }

  private handleLine(line: string): void {
    let parsed: { id?: unknown; result?: unknown; error?: unknown };
    try {
      parsed = JSON.parse(line);
    } catch {
      return;
    }
    if (typeof parsed.id !== "number") return;
    const entry = this.pending.get(parsed.id);
    if (!entry) return;
    this.pending.delete(parsed.id);
    clearTimeout(entry.timer);
    if (parsed.error) {
      const e = parsed.error as { message?: string };
      entry.reject(new Error(`ElectrumX RPC error: ${e?.message ?? JSON.stringify(parsed.error)}`));
    } else {
      entry.resolve(parsed.result);
    }
  }

  private rejectAllPending(err: Error): void {
    for (const [, entry] of this.pending) {
      clearTimeout(entry.timer);
      entry.reject(err);
    }
    this.pending.clear();
  }

  call<T = unknown>(method: string, params: unknown[] = []): Promise<T> {
    if (this.closed) {
      return Promise.reject(new Error("namecoin/transport: RPC closed"));
    }
    const id = ++this.id;
    const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`namecoin/transport: RPC timeout: ${method}`));
      }, RPC.REQUEST_TIMEOUT_MS);
      this.pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
        timer,
      });
      this.writer.write(textEncoder.encode(payload)).catch((err) => {
        const entry = this.pending.get(id);
        if (entry) {
          this.pending.delete(id);
          clearTimeout(entry.timer);
          entry.reject(err instanceof Error ? err : new Error(String(err)));
        }
      });
    });
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.rejectAllPending(new Error("namecoin/transport: RPC closed"));
    try {
      this.writer.releaseLock();
    } catch {
      // ignore
    }
    try {
      this.conn.close();
    } catch {
      // ignore
    }
  }
}
