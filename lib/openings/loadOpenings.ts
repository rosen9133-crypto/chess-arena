import fs from "node:fs";
import path from "node:path";

import type { OpeningEntry } from "./types";

let cachedOpenings: OpeningEntry[] | null = null;

function parseTsvLine(line: string): string[] {
  return line.split("\t");
}

export function loadOpenings(): OpeningEntry[] {
  if (cachedOpenings !== null) {
    return cachedOpenings;
  }

  const filePath = path.join(
    process.cwd(),
    "data",
    "openings",
    "all-openings.tsv",
  );

  const fileContent = fs.readFileSync(filePath, "utf8");

  const lines = fileContent
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length <= 1) {
    cachedOpenings = [];
    return cachedOpenings;
  }

  const header = parseTsvLine(lines[0]).map((value) =>
    value.trim().toLowerCase(),
  );

  const ecoIndex = header.indexOf("eco");
  const nameIndex = header.indexOf("name");
  const pgnIndex = header.indexOf("pgn");

  if (
    ecoIndex === -1 ||
    nameIndex === -1 ||
    pgnIndex === -1
  ) {
    throw new Error(
      "Opening database must contain ECO, name and PGN columns.",
    );
  }

  const openings: OpeningEntry[] = [];

  for (const line of lines.slice(1)) {
    const columns = parseTsvLine(line);

    const eco = columns[ecoIndex]?.trim();
    const name = columns[nameIndex]?.trim();
    const pgn = columns[pgnIndex]?.trim();

    if (!eco || !name || !pgn) {
      continue;
    }

    openings.push({
      eco,
      name,
      pgn,
    });
  }

  cachedOpenings = openings;

  return cachedOpenings;
}