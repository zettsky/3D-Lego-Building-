import path from "node:path";

/** Repo root. npm scripts, Next.js and Vitest all run from it; override with TSUMIKI_ROOT. */
export const ROOT = process.env.TSUMIKI_ROOT ?? process.cwd();
export const DATA_DIR = process.env.TSUMIKI_DATA_DIR ?? path.join(ROOT, ".data");
export const PGLITE_DIR = process.env.PGLITE_DIR ?? path.join(DATA_DIR, "pglite");
export const RAW_DIR = path.join(DATA_DIR, "raw");
export const BLOB_DIR = process.env.BLOB_DIR ?? path.join(DATA_DIR, "blobs");
export const REPORT_DIR = path.join(DATA_DIR, "reports");

/**
 * The representative sample from the work plan (docs/data/ARCHITECTURE.md, SOURCES.md):
 * 21368-1 (in-progress transcription, reference only), a 20-piece set, a Technic set, a set with several
 * booklets, a classic set and a 3-in-1 set with several OMR models.
 */
export const SAMPLE_SETS = ["21368-1", "6605-1", "42033-1", "10294-1", "6080-1", "31028-1"];
