import type { Database } from "bun:sqlite";

export const SCHEMA = `
  CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    installments_total INTEGER,
    installments_current INTEGER,
    ownership_percentage REAL NOT NULL,
    ownership_person TEXT
  );
`;

export function runMigrations(db: Database): void {
  db.run(SCHEMA);
}
