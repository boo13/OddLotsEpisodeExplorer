declare module 'sql.js' {
  interface Database {
    prepare(sql: string): Statement;
    close(): void;
  }

  interface Statement {
    bind(params?: unknown[]): boolean;
    step(): boolean;
    get(): unknown[];
    getColumnNames(): string[];
    free(): boolean;
  }

  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
  }

  interface SqlJsConfig {
    wasmBinary?: ArrayLike<number> | Buffer;
    locateFile?: (file: string) => string;
  }

  function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
  export default initSqlJs;
}
