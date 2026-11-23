import {D1Database} from './types';

export const SESSION_COOKIE_NAME = 'mylife_session';

export const API_SECURITY_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export function jsonResponse(
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  const headers = new Headers(API_SECURITY_HEADERS);
  for (const [k, v] of Object.entries(extraHeaders)) {
    headers.set(k, v);
  }
  return new Response(JSON.stringify(data), {status, headers});
}

export function errorResponse(
  message: string,
  status = 400,
  extra: Record<string, unknown> = {},
): Response {
  return jsonResponse({ok: false, error: message, ...extra}, status);
}

export async function parseJsonBody<T = Record<string, unknown>>(request: Request): Promise<T | null> {
  try {
    const text = await request.text();
    if (!text || text.length > 2_000_000) return null;
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as T;
  } catch {
    return null;
  }
}

export function isHttpsRequest(request: Request): boolean {
  const proto = request.headers.get('x-forwarded-proto');
  if (proto) {
    return proto.split(',')[0].trim().toLowerCase() === 'https';
  }
  try {
    return new URL(request.url).protocol === 'https:';
  } catch {
    return false;
  }
}

export function parseCookies(request: Request): Record<string, string> {
  const cookieHeader = request.headers.get('cookie') || '';
  const result: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name) {
      try {
        result[name] = decodeURIComponent(value);
      } catch {
        result[name] = value;
      }
    }
  }
  return result;
}

export function buildSessionCookie(rawToken: string, request: Request, rememberMe: boolean): string {
  const secure = isHttpsRequest(request);
  const parts = [`${SESSION_COOKIE_NAME}=${encodeURIComponent(rawToken)}`, 'Path=/', 'HttpOnly'];

  if (rememberMe) {
    parts.push(`Max-Age=${30 * 24 * 60 * 60}`);
  }

  if (secure) {
    // SameSite=None; Secure; Partitioned supports both first-party Cloudflare Pages and HTTPS preview iframes
    parts.push('SameSite=None', 'Secure', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }

  return parts.join('; ');
}

export function buildClearSessionCookie(request: Request): string {
  const secure = isHttpsRequest(request);
  const parts = [`${SESSION_COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'Max-Age=0'];
  if (secure) {
    parts.push('SameSite=None', 'Secure', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  return parts.join('; ');
}

export function verifyCsrfAndOrigin(request: Request): boolean {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true;
  }

  const reqUrl = new URL(request.url);
  const expectedHost = (
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    reqUrl.host
  )
    .split(',')[0]
    .trim()
    .toLowerCase();

  const origin = request.headers.get('origin');
  if (origin) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      if (originHost !== expectedHost) {
        return false;
      }
    } catch {
      return false;
    }
  } else {
    const referer = request.headers.get('referer');
    if (referer) {
      try {
        const refHost = new URL(referer).host.toLowerCase();
        if (refHost !== expectedHost) {
          return false;
        }
      } catch {
        return false;
      }
    }
  }

  // Require custom header on state-changing API requests (blocks simple cross-site HTML form CSRF)
  const xrw = request.headers.get('x-requested-with');
  if (xrw !== 'XMLHttpRequest') {
    return false;
  }

  return true;
}

export function getClientIp(request: Request): string {
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return 'local';
}

export async function checkRateLimit(
  db: D1Database,
  key: string,
  maxAttempts: number,
  windowMs: number,
): Promise<{allowed: boolean; retryAfterSec: number}> {
  const now = Date.now();
  const row = await db
    .prepare('SELECT count, window_start FROM rate_limits WHERE key = ?')
    .bind(key)
    .first<{count: number; window_start: number}>();

  if (!row || now - row.window_start >= windowMs) {
    await db
      .prepare(
        'INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, window_start = excluded.window_start',
      )
      .bind(key, now)
      .run();
    return {allowed: true, retryAfterSec: 0};
  }

  if (row.count >= maxAttempts) {
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - row.window_start)) / 1000));
    return {allowed: false, retryAfterSec};
  }

  await db.prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?').bind(key).run();
  return {allowed: true, retryAfterSec: 0};
}

export function normalizeEmail(email: unknown): string {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function validatePasswordStrength(password: unknown): string | null {
  if (typeof password !== 'string') return 'Mật khẩu không hợp lệ.';
  if (password.length < 8) return 'Mật khẩu phải có ít nhất 8 ký tự.';
  if (password.length > 128) return 'Mật khẩu tối đa 128 ký tự.';
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return 'Mật khẩu cần có ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số.';
  }
  return null;
}

export function isSafeImageUrl(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return false;
  const trimmed = value.trim();
  if (trimmed.length > 650_000) return false;
  if (trimmed.startsWith('/src/assets/')) return true;
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) return true;
  try {
    const u = new URL(trimmed);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isSafeWebhookUrl(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return true;
  try {
    const u = new URL(value.trim());
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const host = u.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host === '169.254.169.254' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
