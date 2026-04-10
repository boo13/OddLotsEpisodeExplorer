export async function initDb(): Promise<void> {
  return;
}

export function getDb(): never {
  throw new Error('SQLite database has been replaced by in-memory Undisclosed data.');
}
