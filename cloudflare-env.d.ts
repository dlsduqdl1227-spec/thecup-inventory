declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}

interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: {
    changes?: number;
    last_row_id?: number | string;
  };
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

interface R2HTTPMetadata {
  contentType?: string;
}

interface R2PutOptions {
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

interface R2ObjectBody {
  body: ReadableStream<Uint8Array>;
  writeHttpMetadata(headers: Headers): void;
}

interface R2Bucket {
  put(
    key: string,
    value: ArrayBuffer | ReadableStream | Blob,
    options?: R2PutOptions,
  ): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete(key: string): Promise<void>;
}
