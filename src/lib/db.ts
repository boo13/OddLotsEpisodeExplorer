import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'data', 'odd_lots_episodes.db');
    db = new Database(dbPath, { readonly: true });
  }
  return db;
}
