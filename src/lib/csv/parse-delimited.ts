export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

// Minimal RFC-4180-ish CSV parser. Enough for browser-extension Google Maps
// exports: quoted fields, commas and newlines inside quotes, "" escapes.
export function parseDelimited(text: string): ParsedCsv {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  const endField = () => {
    record.push(field);
    field = "";
  };
  const endRecord = () => {
    endField();
    // Skip records that are entirely empty (blank line).
    if (!(record.length === 1 && record[0] === "")) records.push(record);
    record = [];
  };

  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      endField();
      i += 1;
      continue;
    }
    if (c === "\r") {
      if (text[i + 1] === "\n") i += 1;
      endRecord();
      i += 1;
      continue;
    }
    if (c === "\n") {
      endRecord();
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  // Flush trailing field/record if the file did not end with a newline.
  if (field !== "" || record.length > 0) endRecord();

  if (records.length === 0) throw new Error("CSV has no header row");

  const [headers, ...rows] = records;
  const trimmedHeaders = headers.map((h) => h.trim());
  if (trimmedHeaders.every((h) => h === "")) {
    throw new Error("CSV has no header row");
  }
  return { headers: trimmedHeaders, rows };
}
