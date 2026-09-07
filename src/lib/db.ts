import Database from "better-sqlite3";
import path from "node:path";

let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    db = new Database(path.join(process.cwd(), "data", "football.db"), {
      readonly: true,
      fileMustExist: true,
    });
    db.pragma("journal_mode = WAL");
  }
  return db;
}
