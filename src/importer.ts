import { File } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import { load, save, Status, TBook, Tracker, uid } from "./tracker";

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') ((cell += '"'), i++);
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") (row.push(cell), (cell = ""));
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

const COLS = {
  title: ["title", "book title", "name"],
  author: ["author", "authors", "author name", "writer"],
  extra: ["additional authors", "contributors"],
  isbn13: ["isbn13", "isbn-13"],
  isbn: ["isbn", "isbn/uid", "isbn10", "isbn-10"],
  rating: ["my rating", "star rating", "rating", "stars"],
  pages: ["number of pages", "pages", "page count", "num pages"],
  year: [
    "original publication year",
    "year published",
    "year",
    "publication year",
  ],
  read: [
    "date read",
    "last date read",
    "finished",
    "date finished",
    "read date",
  ],
  ranges: ["dates read"],
  started: ["date started", "started", "start date"],
  added: ["date added", "added"],
  status: ["exclusive shelf", "read status", "status", "shelf"],
  shelves: ["bookshelves", "tags", "shelves", "lists"],
  count: ["read count", "times read"],
};

const STATUS: Record<string, Status> = {
  read: "read",
  finished: "read",
  "to-read": "want",
  "to read": "want",
  want: "want",
  "want to read": "want",
  "currently-reading": "reading",
  "currently reading": "reading",
  reading: "reading",
  "did-not-finish": "dnf",
  "did not finish": "dnf",
  dnf: "dnf",
  abandoned: "dnf",
};

const clean = (v?: string) =>
  (v ?? "")
    .replace(/^="?|"$/g, "")
    .replace(/\s+/g, " ")
    .trim();
const date = (v?: string) => {
  const m = clean(v).match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  return m
    ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`
    : undefined;
};
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

export type ImportResult = {
  books: number;
  updated: number;
  logs: number;
  shelves: number;
  skipped: number;
};

export function importRows(rows: string[][]): ImportResult {
  const [head, ...data] = rows;
  const h = head.map((x) => x.trim().toLowerCase());
  const col = (k: keyof typeof COLS) => {
    for (const name of COLS[k]) {
      const i = h.indexOf(name);
      if (i >= 0) return i;
    }
    return -1;
  };
  const idx = Object.fromEntries(
    Object.keys(COLS).map((k) => [k, col(k as keyof typeof COLS)]),
  ) as Record<keyof typeof COLS, number>;
  if (idx.title < 0) throw new Error("No “Title” column found.");
  const get = (r: string[], k: keyof typeof COLS) =>
    idx[k] >= 0 ? clean(r[idx[k]]) : "";

  const t: Tracker = load();
  t.shelves ??= [];
  const res: ImportResult = {
    books: 0,
    updated: 0,
    logs: 0,
    shelves: 0,
    skipped: 0,
  };
  const shelfFor = (name: string) => {
    let sh = t.shelves!.find(
      (x) => x.name.toLowerCase() === name.toLowerCase(),
    );
    if (!sh) {
      sh = { id: uid(), name, books: [] };
      t.shelves!.push(sh);
      res.shelves++;
    }
    return sh;
  };

  for (const r of data) {
    const title = get(r, "title");
    if (!title) {
      res.skipped++;
      continue;
    }
    const authors = [get(r, "author"), get(r, "extra")]
      .flatMap((a) => a.split(/,\s*/))
      .map((a) => a.trim())
      .filter(Boolean);
    const isbn = [get(r, "isbn13"), get(r, "isbn")].find((x) =>
      /^(97[89])?\d{9}[\dX]$/i.test(x),
    );
    const rawStatus = get(r, "status").toLowerCase();
    const status = STATUS[rawStatus];
    const ratingNum = Number(get(r, "rating").replace(",", "."));
    const rating =
      ratingNum > 0 ? Math.min(5, Math.round(ratingNum * 2) / 2) : undefined;
    const pages = Number(get(r, "pages")) || undefined;
    const year = Number(get(r, "year")) || undefined;
    const added = date(get(r, "added"));

    let b = t.books.find(
      (x) =>
        (isbn && x.isbn === isbn) ||
        (norm(x.title) === norm(title) &&
          (!x.authors.length ||
            !authors.length ||
            norm(x.authors[0]) === norm(authors[0]))),
    );
    if (b) {
      b.authors = b.authors.length ? b.authors : authors;
      b.isbn ??= isbn;
      b.pages ??= pages;
      b.year ??= year;
      if (status && (b.status === "none" || b.status === "want"))
        b.status = status;
      res.updated++;
    } else {
      b = {
        id: uid(),
        title,
        authors,
        isbn,
        pages,
        year,
        status: status ?? "want",
        added: added ? Date.parse(`${added}T12:00:00`) : Date.now(),
      } as TBook;
      t.books.push(b);
      res.books++;
    }

    const reads: { start?: string; end: string }[] = [];
    if (idx.ranges >= 0)
      for (const part of get(r, "ranges").split(/,\s*/)) {
        const [a, z] = part.split(/\s*-\s*(?=\d{4})/);
        const end = date(z) ?? date(a);
        if (end) reads.push({ start: z ? date(a) : undefined, end });
      }
    const last = date(get(r, "read"));
    if (last && !reads.some((x) => x.end === last))
      reads.push({ start: date(get(r, "started")), end: last });
    reads.sort((a, z) => a.end.localeCompare(z.end));

    const id = b.id;
    reads.forEach((x, i) => {
      if (t.logs.some((l) => l.bookId === id && l.date === x.end)) return;
      const prior = i > 0 || t.logs.some((l) => l.bookId === id);
      t.logs.push({
        id: uid(),
        bookId: id,
        date: x.end,
        started: x.start,
        rating: i === reads.length - 1 ? rating : undefined,
        reread: prior,
        created: Date.now() + res.logs,
      });
      res.logs++;
    });
    if (reads.length && b.status !== "reading") b.status = status ?? "read";
    if (status === "reading" && !b.started) b.started = date(get(r, "started"));

    const exclusive = new Set([
      "read",
      "toread",
      "currentlyreading",
      "didnotfinish",
      norm(rawStatus),
    ]);
    for (const name of get(r, "shelves")
      .split(/,\s*/)
      .map((x) => x.trim())
      .filter(Boolean)) {
      if (exclusive.has(norm(name))) continue;
      const sh = shelfFor(name);
      if (!sh.books.includes(id)) sh.books.push(id);
    }
  }
  save(t);
  return res;
}

export async function pickAndImport(): Promise<ImportResult | null> {
  const r = await DocumentPicker.getDocumentAsync({
    type: [
      "text/csv",
      "text/comma-separated-values",
      "text/plain",
      "public.comma-separated-values-text",
      "*/*",
    ],
    copyToCacheDirectory: true,
  });
  if (r.canceled || !r.assets?.[0]) return null;
  return importRows(
    parseCsv(new File(r.assets[0].uri).textSync().replace(/^﻿/, "")),
  );
}
