import {createSessionForUser, getUserBootstrapPayload} from '../../_lib/auth';
import {CURRENT_PASSWORD_ALGORITHM, verifyPassword} from '../../_lib/crypto';
import {
  buildSessionCookie,
  checkRateLimit,
  errorResponse,
  getClientIp,
  isValidEmail,
  jsonResponse,
  normalizeEmail,
  parseJsonBody,
} from '../../_lib/security';
import {DbUserRow, PagesContext} from '../../_lib/types';

// Constant-time mitigation hash when email does not exist
const DUMMY_SALT = '00112233445566778899aabbccddeeff';
const DUMMY_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const {request, env} = context;
  const ip = getClientIp(request);

  const body = await parseJsonBody<{
    email?: string;
    password?: string;
    rememberMe?: boolean;
  }>(request);

  if (!body) {
    return errorResponse('Dữ liệu đăng nhập không hợp lệ.', 400);
  }

  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';
  const rememberMe = body.rememberMe === true;

  if (!isValidEmail(email) || !password) {
    return errorResponse('Vui lòng nhập đầy đủ email và mật khẩu hợp lệ.', 400);
  }

  const ipLimit = await checkRateLimit(env.DB, `login_ip:${ip}`, 30, 15 * 60 * 1000);
  if (!ipLimit.allowed) {
    return errorResponse(
      `Quá nhiều yêu cầu đăng nhập từ thiết bị này. Vui lòng thử lại sau ${ipLimit.retryAfterSec} giây.`,
      429,
    );
  }

  const acctLimit = await checkRateLimit(env.DB, `login:${ip}:${email}`, 8, 15 * 60 * 1000);
  if (!acctLimit.allowed) {
    return errorResponse(
      `Bạn đã thử sai quá nhiều lần. Vui lòng chờ ${acctLimit.retryAfterSec} giây trước khi thử lại.`,
      429,
    );
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE email = ? LIMIT 1')
    .bind(email)
    .first<DbUserRow>();

  const valid = user
    ? await verifyPassword(password, user.password_hash, user.password_salt, user.password_algorithm)
    : await verifyPassword(password, DUMMY_HASH, DUMMY_SALT, CURRENT_PASSWORD_ALGORITHM).then(() => false);

  if (!user || !valid || user.status !== 'active') {
    return errorResponse('Email hoặc mật khẩu không chính xác.', 401);
  }

  await env.DB.prepare('DELETE FROM rate_limits WHERE key = ?').bind(`login:${ip}:${email}`).run();

  const session = await createSessionForUser(env.DB, user.id, request, rememberMe);
  const bootstrap = await getUserBootstrapPayload(env.DB, user.id, session.sessionId);

  return jsonResponse(
    {
      ok: true,
      user: bootstrap?.user,
      databaseState: bootstrap?.databaseState,
    },
    200,
    {
      'Set-Cookie': buildSessionCookie(session.rawToken, request, rememberMe),
    },
  );
}
