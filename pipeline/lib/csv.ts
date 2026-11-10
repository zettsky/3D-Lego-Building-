/**
 * Streaming RFC 4180 CSV parser (quoted fields, doubled quotes, LF or CRLF, newlines inside quotes).
 * Reads plain or gzip files. Dependency-free and unit tested; state carries across chunk boundaries.
 */
import fs from "node:fs";
import { createGunzip } from "node:zlib";
import type { Readable } from "node:stream";

type Mode = "start" | "unquoted" | "quoted" | "quoteInQuoted";

export interface CsvState {
  field: string;
  row: string[];
  mode: Mode;
  /** true once anything of the current row was seen */
  dirty: boolean;
}

export const newCsvState = (): CsvState => ({ field: "", row: [], mode: "start", dirty: false });

export function* parseCsvChunk(s: CsvState, chunk: string, final = false): Generator<string[]> {
  for (let i = 0; i < chunk.length; i++) {
    const c = chunk[i];
    switch (s.mode) {
      case "quoted":
        if (c === '"') s.mode = "quoteInQuoted";
        else s.field += c;
        continue;
      case "quoteInQuoted":
        if (c === '"') {
          s.field += '"';
          s.mode = "quoted";
          continue;
        }
        break; // fall through to the delimiter handling below
    }
    if (c === "\r") continue;
    if (c === ",") {
      s.row.push(s.field);
      s.field = "";
      s.mode = "start";
      s.dirty = true;
    } else if (c === "\n") {
      s.row.push(s.field);
      const row = s.row;
      s.row = [];
      s.field = "";
      s.mode = "start";
      const empty = !s.dirty && row.length === 1 && row[0] === "";
      s.dirty = false;
      if (!empty) yield row;
    } else if (c === '"' && s.mode === "start") {
      s.mode = "quoted";
      s.dirty = true;
    } else {
      s.field += c;
      s.mode = "unquoted";
      s.dirty = true;
    }
  }
  if (final) {
    if (s.mode === "quoted") throw new Error("CSV ended inside a quoted field");
    if (s.dirty || s.field !== "" || s.row.length) {
      s.row.push(s.field);
      yield s.row;
    }
    s.row = [];
    s.field = "";
    s.mode = "start";
    s.dirty = false;
  }
}

/** Parses a whole CSV string. */
export function parseCsv(text: string): string[][] {
  return [...parseCsvChunk(newCsvState(), text, true)];
}

/** Streams rows from a .csv or .csv.gz file. The first row yielded is the header. */
export async function* readCsvRows(file: string): AsyncGenerator<string[]> {
  let stream: Readable = fs.createReadStream(file);
  if (file.endsWith(".gz")) stream = stream.pipe(createGunzip());
  stream.setEncoding("utf8");
  const st = newCsvState();
  for await (const chunk of stream as AsyncIterable<string>) yield* parseCsvChunk(st, chunk);
  yield* parseCsvChunk(st, "", true);
}
