/**
 * The only way the pipeline talks to the network.
 *  - Host allowlist: a request to any other host throws. Hosts are added only after their terms and
 *    robots.txt were reviewed (docs/data/SOURCES.md).
 *  - Identifies itself with a User-Agent and keeps a minimum delay between requests per host.
 *  - Conditional GET (If-None-Match / If-Modified-Since) for files we cache on disk.
 *  - Never retries a 401/402/403/429 or a Cloudflare challenge: those mean "stop", not "try harder".
 */
import fs from "node:fs";
import path from "node:path";
import { sha256File } from "./checksum";

export const USER_AGENT = "tsumiki-data-pipeline/0.1 (+https://github.com/zettsky/3D-Lego-Building-)";

/** host → minimum milliseconds between requests */
export const ALLOWED_HOSTS: Record<string, number> = {
  "cdn.rebrickable.com": 1000,
  "rebrickable.com": 3000, // API only (key required); robots.txt Crawl-delay: 3
  "library.ldraw.org": 2000,
  "brickset.com": 1000, // API only (key required)
};

export class AccessRefused extends Error {
  constructor(
    public url: string,
    public status: number,
    reason: string,
  ) {
    super(`${url}: ${reason} (HTTP ${status}). Not retrying: access is refused or rate limited.`);
  }
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

const lastHit = new Map<string, number>();

export interface PoliteFetchOptions {
  fetchImpl?: FetchLike;
  headers?: Record<string, string>;
  /** Skip the delay (tests). */
  noDelay?: boolean;
}

export async function politeFetch(url: string, opts: PoliteFetchOptions = {}): Promise<Response> {
  const u = new URL(url);
  const delay = ALLOWED_HOSTS[u.host];
  if (delay === undefined) throw new Error(`Host ${u.host} is not on the reviewed allowlist (pipeline/lib/http.ts).`);
  if (u.protocol !== "https:") throw new Error(`Only https is allowed: ${url}`);
  if (!opts.noDelay) {
    const wait = (lastHit.get(u.host) ?? 0) + delay - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
  lastHit.set(u.host, Date.now());
  const res = await (opts.fetchImpl ?? fetch)(url, { headers: { "User-Agent": USER_AGENT, ...opts.headers }, redirect: "follow" });
  if (res.headers.get("cf-mitigated") === "challenge") throw new AccessRefused(url, res.status, "bot challenge");
  if ([401, 402, 403, 429].includes(res.status)) throw new AccessRefused(url, res.status, "refused");
  return res;
}

export interface CachedFile {
  file: string;
  url: string;
  etag: string | null;
  lastModified: string | null;
  sha256: string;
  byteSize: number;
  /** false when the server answered 304 Not Modified and the cached copy was reused */
  changed: boolean;
  retrievedAt: string;
}

/** Downloads `url` to `file` unless the server says our cached copy (same ETag/Last-Modified) is current. */
export async function fetchToFile(url: string, file: string, opts: PoliteFetchOptions = {}): Promise<CachedFile> {
  const metaFile = `${file}.meta.json`;
  const prev: CachedFile | null = fs.existsSync(metaFile) && fs.existsSync(file) ? JSON.parse(fs.readFileSync(metaFile, "utf8")) : null;
  const headers: Record<string, string> = { ...opts.headers };
  if (prev?.etag) headers["If-None-Match"] = prev.etag;
  if (prev?.lastModified) headers["If-Modified-Since"] = prev.lastModified;
  const res = await politeFetch(url, { ...opts, headers });
  if (res.status === 304 && prev) {
    const meta = { ...prev, changed: false, retrievedAt: new Date().toISOString() };
    fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));
    return meta;
  }
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const buf = Buffer.from(await res.arrayBuffer());
  const tmp = `${file}.part`;
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, file);
  const meta: CachedFile = {
    file,
    url,
    etag: res.headers.get("etag"),
    lastModified: res.headers.get("last-modified"),
    sha256: await sha256File(file),
    byteSize: buf.length,
    changed: true,
    retrievedAt: new Date().toISOString(),
  };
  if (prev && prev.sha256 === meta.sha256) meta.changed = false;
  fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2));
  return meta;
}
