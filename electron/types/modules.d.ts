declare module 'sql.js' {
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database
  }
  interface Database {
    run(sql: string, params?: unknown[]): Database
    exec(sql: string): QueryExecResult[]
    prepare(sql: string): Statement
    close(): void
    export(): Uint8Array
  }
  interface Statement {
    bind(params?: unknown[]): boolean
    step(): boolean
    getAsObject<T = Record<string, unknown>>(): T
    free(): void
  }
  interface QueryExecResult {
    columns: string[]
    values: unknown[][]
  }
  export default function initSqlJs(config?: Record<string, unknown>): Promise<SqlJsStatic>
}

declare module 'pdf-parse' {
  interface PDFData {
    text: string
    numpages: number
    info?: {
      Title?: string
      Author?: string
      Subject?: string
      [key: string]: unknown
    }
    metadata?: unknown
    version?: string
  }
  function pdfParse(dataBuffer: Buffer | Uint8Array, options?: Record<string, unknown>): Promise<PDFData>
  export = pdfParse
}
