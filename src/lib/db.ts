import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

interface Statement {
  all(...params: unknown[]): unknown[];
  get(...params: unknown[]): unknown | undefined;
}

interface CompatDb {
  prepare(sql: string): Statement;
}

let db: CompatDb | null = null;

export function getDb(): CompatDb {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

let initPromise: Promise<CompatDb> | null = null;

export async function initDb(): Promise<CompatDb> {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const wasmPath = path.join(process.cwd(), 'data', 'sql-wasm.wasm');
    const wasmBinary = fs.readFileSync(wasmPath);
    const SQL = await initSqlJs({ wasmBinary });
    const dbPath = path.join(process.cwd(), 'data', 'odd_lots_episodes.db');
    const buffer = fs.readFileSync(dbPath);
    const sqlDb = new SQL.Database(buffer);

    db = {
      prepare(sql: string): Statement {
        return {
          all(...params: unknown[]): unknown[] {
            const stmt = sqlDb.prepare(sql);
            if (params.length > 0) {
              stmt.bind(params);
            }
            const rows: unknown[] = [];
            const columns = stmt.getColumnNames();
            while (stmt.step()) {
              const values = stmt.get();
              const row: Record<string, unknown> = {};
              for (let i = 0; i < columns.length; i++) {
                row[columns[i]] = values[i];
              }
              rows.push(row);
            }
            stmt.free();
            return rows;
          },
          get(...params: unknown[]): unknown | undefined {
            const stmt = sqlDb.prepare(sql);
            if (params.length > 0) {
              stmt.bind(params);
            }
            let result: unknown | undefined;
            if (stmt.step()) {
              const values = stmt.get();
              const columns = stmt.getColumnNames();
              const row: Record<string, unknown> = {};
              for (let i = 0; i < columns.length; i++) {
                row[columns[i]] = values[i];
              }
              result = row;
            }
            stmt.free();
            return result;
          },
        };
      },
    };

    return db;
  })();

  return initPromise;
}
