export interface D1ExecResult {
  count: number;
  duration: number;
}

export interface D1Meta {
  duration?: number;
  changes?: number;
  last_row_id?: number;
  served_by?: string;
}

export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: D1Meta;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result<Record<string, unknown>>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface Env {
  DB: D1Database;
  APP_ENV?: string;
  APP_URL?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
}

export interface PagesContext<P extends Record<string, string> = Record<string, string>> {
  request: Request;
  env: Env;
  params: P;
  waitUntil?: (promise: Promise<unknown>) => void;
  next?: () => Promise<Response>;
}

export interface DbUserRow {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  password_salt: string;
  password_algorithm: string;
  email_verified: number;
  avatar: string;
  bio: string;
  status: 'active' | 'disabled';
  created_at: string;
  updated_at: string;
}

export interface AuthenticatedContext {
  user: {
    id: string;
    fullName: string;
    email: string;
    emailVerified: boolean;
    avatar: string;
    bio: string;
    createdAt: string;
    updatedAt: string;
  };
  sessionId: string;
  expiresAt: string;
}
