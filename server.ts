import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import {DatabaseSync} from 'node:sqlite';
import path from 'path';
import {createServer as createViteServer} from 'vite';
import type {D1Database, D1PreparedStatement, D1Result, Env, PagesContext} from './functions/_lib/types';
import {onRequest as apiMiddleware} from './functions/api/_middleware';
import * as authChangePassword from './functions/api/auth/change-password';
import * as authForgotPassword from './functions/api/auth/forgot-password';
import * as authLogin from './functions/api/auth/login';
import * as authLogout from './functions/api/auth/logout';
import * as authMe from './functions/api/auth/me';
import * as authRegister from './functions/api/auth/register';
import * as authResetPassword from './functions/api/auth/reset-password';
import * as authSessions from './functions/api/auth/sessions';
import * as bankAccountItem from './functions/api/bank-accounts/[id]';
import * as bankAccountsIndex from './functions/api/bank-accounts/index';
import * as planItem from './functions/api/plans/[id]';
import * as plansIndex from './functions/api/plans/index';
import * as profileDeleteAccount from './functions/api/profile/delete-account';
import * as profileExport from './functions/api/profile/export';
import * as profileIndex from './functions/api/profile/index';
import * as savingsDepositItem from './functions/api/savings/deposits/[id]';
import * as savingsDepositsIndex from './functions/api/savings/deposits/index';
import * as savingsGoalItem from './functions/api/savings/goals/[id]';
import * as savingsGoalsIndex from './functions/api/savings/goals/index';
import * as syncBootstrap from './functions/api/sync/bootstrap';
import * as transactionItem from './functions/api/transactions/[id]';
import * as transactionsIndex from './functions/api/transactions/index';

type SQLInput = string | number | bigint | Uint8Array | null;

function normalizeParams(values: unknown[]): SQLInput[] {
  return values.map((v) => {
    if (v === undefined || v === null) return null;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'bigint' || v instanceof Uint8Array) {
      return v;
    }
    return String(v);
  });
}

function createSqliteD1Adapter(dbPath: string): D1Database {
  const sqlite = new DatabaseSync(dbPath);
  sqlite.exec('PRAGMA foreign_keys = ON;');
  sqlite.exec('PRAGMA journal_mode = WAL;');

  const createStatement = (query: string, boundValues: SQLInput[] = []): D1PreparedStatement => ({
    bind(...values: unknown[]): D1PreparedStatement {
      return createStatement(query, normalizeParams(values));
    },
    async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
      const stmt = sqlite.prepare(query);
      const row = stmt.get(...boundValues) as Record<string, unknown> | undefined;
      if (!row) return null;
      if (colName) return (row[colName] as T) ?? null;
      return row as T;
    },
    async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
      const stmt = sqlite.prepare(query);
      const rows = stmt.all(...boundValues) as T[];
      return {results: rows, success: true, meta: {}};
    },
    async run(): Promise<D1Result<Record<string, unknown>>> {
      const stmt = sqlite.prepare(query);
      const info = stmt.run(...boundValues);
      return {
        results: [],
        success: true,
        meta: {
          changes: Number(info.changes || 0),
          last_row_id: Number(info.lastInsertRowid || 0),
        },
      };
    },
  });

  return {
    prepare(query: string): D1PreparedStatement {
      return createStatement(query);
    },
    async batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      sqlite.exec('BEGIN IMMEDIATE;');
      try {
        const results: D1Result<T>[] = [];
        for (const stmt of statements) {
          const res = await stmt.run();
          results.push(res as unknown as D1Result<T>);
        }
        sqlite.exec('COMMIT;');
        return results;
      } catch (err) {
        sqlite.exec('ROLLBACK;');
        throw err;
      }
    },
    async exec(query: string) {
      const started = Date.now();
      sqlite.exec(query);
      return {count: 1, duration: Date.now() - started};
    },
  };
}

function runSqlMigrations(sqlitePath: string) {
  const migrationsDir = path.resolve(process.cwd(), 'migrations');
  if (!fs.existsSync(migrationsDir)) return;
  const sqlite = new DatabaseSync(sqlitePath);
  sqlite.exec('PRAGMA foreign_keys = ON;');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    sqlite.exec(sql);
  }
  sqlite.close();
}

type HandlerModule = {
  onRequestGet?: (ctx: PagesContext<any>) => Promise<Response>;
  onRequestPost?: (ctx: PagesContext<any>) => Promise<Response>;
  onRequestPut?: (ctx: PagesContext<any>) => Promise<Response>;
  onRequestPatch?: (ctx: PagesContext<any>) => Promise<Response>;
  onRequestDelete?: (ctx: PagesContext<any>) => Promise<Response>;
};

function resolveApiHandler(pathname: string): {
  mod: HandlerModule;
  params: Record<string, string>;
} | null {
  const staticRoutes: Record<string, HandlerModule> = {
    '/api/auth/register': authRegister,
    '/api/auth/login': authLogin,
    '/api/auth/logout': authLogout,
    '/api/auth/me': authMe,
    '/api/auth/sessions': authSessions,
    '/api/auth/change-password': authChangePassword,
    '/api/auth/forgot-password': authForgotPassword,
    '/api/auth/reset-password': authResetPassword,
    '/api/sync/bootstrap': syncBootstrap,
    '/api/transactions': transactionsIndex,
    '/api/savings/goals': savingsGoalsIndex,
    '/api/savings/deposits': savingsDepositsIndex,
    '/api/plans': plansIndex,
    '/api/bank-accounts': bankAccountsIndex,
    '/api/profile': profileIndex,
    '/api/profile/delete-account': profileDeleteAccount,
    '/api/profile/export': profileExport,
  };

  if (staticRoutes[pathname]) {
    return {mod: staticRoutes[pathname], params: {}};
  }

  const dynamicRoutes: Array<{prefix: string; mod: HandlerModule}> = [
    {prefix: '/api/transactions/', mod: transactionItem},
    {prefix: '/api/savings/goals/', mod: savingsGoalItem},
    {prefix: '/api/savings/deposits/', mod: savingsDepositItem},
    {prefix: '/api/plans/', mod: planItem},
    {prefix: '/api/bank-accounts/', mod: bankAccountItem},
  ];

  for (const route of dynamicRoutes) {
    if (pathname.startsWith(route.prefix)) {
      const id = decodeURIComponent(pathname.slice(route.prefix.length));
      if (id && !id.includes('/')) {
        return {mod: route.mod, params: {id}};
      }
    }
  }

  return null;
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  const dbPath = path.resolve(process.cwd(), '.mylife-local.sqlite');
  runSqlMigrations(dbPath);
  const d1 = createSqliteD1Adapter(dbPath);

  const env: Env = {
    DB: d1,
    APP_ENV: process.env.NODE_ENV || 'development',
    APP_URL: process.env.APP_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
  };

  app.use('/api', express.raw({type: '*/*', limit: '2mb'}), async (req, res) => {
    try {
      const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
      const host = req.get('x-forwarded-host') || req.get('host') || 'localhost:3000';
      const fullUrl = `${proto}://${host}${req.originalUrl}`;

      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (v === undefined) continue;
        if (Array.isArray(v)) headers.set(k, v.join(', '));
        else headers.set(k, v);
      }

      const method = req.method.toUpperCase();
      const hasBody = method !== 'GET' && method !== 'HEAD';
      const body =
        hasBody && Buffer.isBuffer(req.body) && req.body.length > 0
          ? (req.body as unknown as BodyInit)
          : undefined;

      const webRequest = new Request(fullUrl, {method, headers, body});
      const resolved = resolveApiHandler(req.originalUrl.split('?')[0]);

      const context: PagesContext<any> = {
        request: webRequest,
        env,
        params: resolved?.params || {},
        next: async () => {
          if (!resolved) {
            return new Response(JSON.stringify({ok: false, error: 'Endpoint không tồn tại.'}), {
              status: 404,
              headers: {'Content-Type': 'application/json; charset=utf-8'},
            });
          }
          const fnMap: Record<string, ((ctx: PagesContext<any>) => Promise<Response>) | undefined> = {
            GET: resolved.mod.onRequestGet,
            POST: resolved.mod.onRequestPost,
            PUT: resolved.mod.onRequestPut,
            PATCH: resolved.mod.onRequestPatch,
            DELETE: resolved.mod.onRequestDelete,
          };
          const fn = fnMap[method];
          if (!fn) {
            return new Response(JSON.stringify({ok: false, error: 'Phương thức không được hỗ trợ.'}), {
              status: 405,
              headers: {'Content-Type': 'application/json; charset=utf-8'},
            });
          }
          return fn(context);
        },
      };

      const webResponse = await apiMiddleware(context);
      res.status(webResponse.status);

      const getSetCookie = (webResponse.headers as unknown as {getSetCookie?: () => string[]}).getSetCookie;
      const setCookies = typeof getSetCookie === 'function' ? getSetCookie.call(webResponse.headers) : [];
      if (setCookies.length > 0) {
        res.setHeader('Set-Cookie', setCookies);
      }

      webResponse.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') return;
        res.setHeader(key, value);
      });

      const buf = Buffer.from(await webResponse.arrayBuffer());
      res.send(buf);
    } catch {
      res.status(500).json({ok: false, error: 'Lỗi xử lý máy chủ nội bộ.'});
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`MY LIFE multi-user server running on http://0.0.0.0:${port}`);
  });
}

startServer();
