import type { Database } from "sql.js";

export type Column = {
  name: string;
  type: string;
  primary: boolean;
  foreign: boolean;
  references?: { table: string; column: string };
};
export type SchemaTable = { name: string; columns: Column[]; count: number };
export type QueryResult = { columns: string[]; values: (string | number | null | Uint8Array)[][] };

export const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;

export function readSchema(db: Database): SchemaTable[] {
  const names = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")[0]?.values ?? [];
  return names.map(([raw]) => {
    const name = String(raw);
    const info = db.exec(`PRAGMA table_info(${quote(name)})`)[0]?.values ?? [];
    const keys = db.exec(`PRAGMA foreign_key_list(${quote(name)})`)[0]?.values ?? [];
    const foreign = new Map(keys.map((row) => [String(row[3]), { table: String(row[2]), column: String(row[4]) }]));
    const count = Number(db.exec(`SELECT COUNT(*) FROM ${quote(name)}`)[0]?.values[0]?.[0] ?? 0);
    return {
      name,
      count,
      columns: info.map((row) => ({
        name: String(row[1]),
        type: String(row[2] || "—"),
        primary: Number(row[5]) > 0,
        foreign: foreign.has(String(row[1])),
        references: foreign.get(String(row[1])),
      })),
    };
  });
}

export function showValue(value: string | number | null | Uint8Array) {
  if (value === null) return "NULL";
  if (value instanceof Uint8Array) return `[BLOB · ${value.length} bytes]`;
  return String(value);
}
