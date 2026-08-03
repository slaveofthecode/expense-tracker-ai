import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { Database } from "bun:sqlite";
import { runMigrations } from "./schema";

export const DEFAULT_DB_PATH = join(process.cwd(), ".data", "expenses.db");

export function openDb(path: string = DEFAULT_DB_PATH): Database {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.run("PRAGMA foreign_keys = ON;");
  runMigrations(db);
  return db;
}
