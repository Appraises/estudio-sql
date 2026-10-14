import type { PGlite } from "@electric-sql/pglite";

export type Column = {
  name: string;
  type: string;
  primary: boolean;
  foreign: boolean;
  references?: { table: string; column: string };
};
export type SchemaTable = { name: string; schema: string; key: string; columns: Column[]; count: number };
export type QueryResult = { columns: string[]; values: (unknown | null)[][] };

export async function executeSql(db: PGlite, sql: string) {
  const outputs = await db.exec(sql);
  let result: QueryResult | null = null;
  let rowsChanged = 0;
  for (const output of outputs) {
    rowsChanged += output.affectedRows ?? 0;
    if (output.fields.length > 0) {
      result = {
        columns: output.fields.map((field) => field.name),
        values: output.rows.map((row) => output.fields.map((field) => row[field.name] ?? null)),
      };
    }
  }
  return { result, rowsChanged, statementCount: outputs.length };
}

export const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
export const tableRef = (table: Pick<SchemaTable, "schema" | "name">) => `${quote(table.schema)}.${quote(table.name)}`;
export const tableKey = (table: Pick<SchemaTable, "schema" | "name">) => `${table.schema}.${table.name}`;

export async function readSchema(db: PGlite): Promise<SchemaTable[]> {
  const tables = await db.query<{ table_schema: string; table_name: string }>(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type = 'BASE TABLE'
      AND table_schema NOT IN ('information_schema', 'pg_catalog')
      AND table_schema NOT LIKE 'pg_toast%'
    ORDER BY CASE WHEN table_schema = current_schema() THEN 0 ELSE 1 END, table_schema, table_name
  `);

  return Promise.all(tables.rows.map(async ({ table_schema: schema, table_name: name }) => {
    const metadata = await db.query<{
      name: string;
      type: string;
      primary: boolean;
      foreign: boolean;
      reference_table: string | null;
      reference_column: string | null;
    }>(`
      SELECT
        a.attname AS name,
        format_type(a.atttypid, a.atttypmod) AS type,
        EXISTS (
          SELECT 1 FROM pg_constraint pk
          WHERE pk.conrelid = c.oid AND pk.contype = 'p' AND a.attnum = ANY(pk.conkey)
        ) AS primary,
        EXISTS (
          SELECT 1 FROM pg_constraint fk
          WHERE fk.conrelid = c.oid AND fk.contype = 'f' AND a.attnum = ANY(fk.conkey)
        ) AS foreign,
        target.relname AS reference_table,
        target_column.attname AS reference_column
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN LATERAL (
        SELECT fk.confrelid, fk.confkey[array_position(fk.conkey, a.attnum)] AS target_attnum
        FROM pg_constraint fk
        WHERE fk.conrelid = c.oid AND fk.contype = 'f' AND a.attnum = ANY(fk.conkey)
        LIMIT 1
      ) reference ON true
      LEFT JOIN pg_class target ON target.oid = reference.confrelid
      LEFT JOIN pg_attribute target_column ON target_column.attrelid = target.oid AND target_column.attnum = reference.target_attnum
      WHERE n.nspname = $1 AND c.relname = $2 AND a.attnum > 0 AND NOT a.attisdropped
      ORDER BY a.attnum
    `, [schema, name]);
    const counts = await db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${quote(schema)}.${quote(name)}`);
    const key = `${schema}.${name}`;
    return {
      name,
      schema,
      key,
      count: Number(counts.rows[0]?.count ?? 0),
      columns: metadata.rows.map((column) => ({
        name: column.name,
        type: column.type,
        primary: column.primary,
        foreign: column.foreign,
        ...(column.reference_table && column.reference_column
          ? { references: { table: column.reference_table, column: column.reference_column } }
          : {}),
      })),
    };
  }));
}

export function showValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (value instanceof Uint8Array) return `[BLOB · ${value.length} bytes]`;
  if (value instanceof Date) return value.toLocaleString("pt-BR");
  if (Array.isArray(value)) return `{${value.map(showValue).join(",")}}`;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
