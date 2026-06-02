export type ImportedCsvRow = {
  rowNumber: number;
  date: string;
  category: string;
  subCategory: string;
  detail: string;
  quantity?: string;
  unit?: string;
  debit?: string;
  credit?: string;
  raw: string;
};

export const IMPORT_CSV_TEMPLATE_PATH = "/templates/import-transactions-template.csv";

const EXPECTED_HEADERS = [
  "No",
  "Date",
  "Category",
  "Sub Category",
  "Detail",
  "Quantity",
  "Unit",
  "Satuan",
  "Debit",
  "Credit",
] as const;

function normalizeHeader(value: string) {
  return value.trim().toLowerCase();
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsvRecords(text: string) {
  const records: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      current += char;
      if (inQuotes && next === '"') {
        current += next;
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      if (current.trim()) {
        records.push(current);
      }
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    records.push(current);
  }

  return records;
}

function validateCsvHeader(headerLine: string) {
  const actualHeaders = parseCsvLine(headerLine);

  if (actualHeaders.length < EXPECTED_HEADERS.length) {
    throw new Error("Format CSV tidak sesuai template. Silakan download template terbaru.");
  }

  const isValid = EXPECTED_HEADERS.every(
    (header, index) => normalizeHeader(actualHeaders[index] ?? "") === normalizeHeader(header)
  );

  if (!isValid) {
    throw new Error("Format CSV tidak sesuai template. Silakan download template terbaru.");
  }
}

export function parseImportedCsv(text: string): ImportedCsvRow[] {
  const lines = parseCsvRecords(text.replace(/^\uFEFF/, ""));
  if (lines.length <= 1) return [];

  validateCsvHeader(lines[0]);

  return lines.slice(1).flatMap((line, idx) => {
    const cols = parseCsvLine(line);
    if (cols.length < EXPECTED_HEADERS.length) return [];

    const [, date, category, subCategory, detail, quantity, maybeUnit, maybeSatuan, debit, credit] = cols;

    return [{
      rowNumber: idx + 2,
      date: date ?? "",
      category: category ?? "",
      subCategory: subCategory ?? "",
      detail: detail ?? "",
      quantity: quantity ?? "",
      unit: maybeSatuan || maybeUnit || "",
      debit: debit ?? "",
      credit: credit ?? "",
      raw: line,
    }];
  });
}

export function parseMoneyPreview(raw?: string) {
  const cleaned = (raw ?? "")
    .replace(/Rp/gi, "")
    .replace(/["'\s]/g, "")
    .replace(/,/g, "")
    .replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function classifyPreviewDirection(row: ImportedCsvRow) {
  const category = row.category.trim().toUpperCase();
  const combined = `${row.subCategory} ${row.detail}`.toLowerCase();
  const debit = parseMoneyPreview(row.debit);
  const credit = parseMoneyPreview(row.credit);

  if (["bank in", "cash in", "investment", "initial investment", "setor", "modal"].some((item) => combined.includes(item))) {
    return "income" as const;
  }
  if (["bank out", "cash out", "transfer out", "withdraw", "bayar", "payment"].some((item) => combined.includes(item))) {
    return "expense" as const;
  }
  if (category === "BANK IN/OUT") {
    if (debit && !credit) return "income" as const;
    if (credit && !debit) return "expense" as const;
  }
  if (credit && !debit) return "expense" as const;
  if (debit && !credit) return "income" as const;
  return null;
}
