import { parse } from "csv-parse/sync";

export interface CsvAttendeeRow {
  name: string;
  email: string;
}

interface RawCsvRow {
  name?: string;
  email?: string;
}

export function parseCSV(buffer: Buffer): CsvAttendeeRow[] {
  const rows = parse(buffer, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as RawCsvRow[];

  return rows.map((row, index) => {
    const name = row.name?.trim();
    const email = row.email?.trim();

    if (!name || !email) {
      throw new Error(`Invalid CSV row at line ${index + 2}`);
    }

    return { name, email };
  });
}
