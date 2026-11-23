import {authenticateRequest} from '../../_lib/auth';
import {verifyPassword} from '../../_lib/crypto';
import {
  buildClearSessionCookie,
  errorResponse,
  jsonResponse,
  parseJsonBody,
} from '../../_lib/security';
import {DbUserRow, PagesContext} from '../../_lib/types';

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Chưa đăng nhập hoặc phiên đã hết hạn.', 401);

  const body = await parseJsonBody<{password?: string; confirmPhrase?: string}>(context.request);
  if (!body) return errorResponse('Dữ liệu xác nhận không hợp lệ.', 400);

  if (body.confirmPhrase !== 'XOA TAI KHOAN') {
    return errorResponse('Vui lòng nhập chính xác cụm từ xác nhận "XOA TAI KHOAN".', 400);
  }

  const password = typeof body.password === 'string' ? body.password : '';
  if (!password) {
    return errorResponse('Vui lòng nhập mật khẩu để xác nhận xóa tài khoản.', 400);
  }

  const user = await context.env.DB.prepare('SELECT * FROM users WHERE id = ? LIMIT 1')
    .bind(auth.user.id)
    .first<DbUserRow>();

  if (!user) return errorResponse('Không tìm thấy tài khoản.', 404);

  const valid = await verifyPassword(
    password,
    user.password_hash,
    user.password_salt,
    user.password_algorithm,
  );
  if (!valid) {
    return errorResponse('Mật khẩu xác nhận không chính xác.', 401);
  }

  await context.env.DB.batch([
    context.env.DB.prepare('DELETE FROM savings_deposits WHERE user_id = ?').bind(auth.user.id),
    context.env.DB.prepare('DELETE FROM savings_goals WHERE user_id = ?').bind(auth.user.id),
    context.env.DB.prepare('DELETE FROM transactions WHERE user_id = ?').bind(auth.user.id),
    context.env.DB.prepare('DELETE FROM plans WHERE user_id = ?').bind(auth.user.id),
    context.env.DB.prepare('DELETE FROM bank_accounts WHERE user_id = ?').bind(auth.user.id),
    context.env.DB.prepare('DELETE FROM user_settings WHERE user_id = ?').bind(auth.user.id),
    context.env.DB.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').bind(auth.user.id),
    context.env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(auth.user.id),
    context.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(auth.user.id),
  ]);

  return jsonResponse(
    {ok: true, message: 'Tài khoản và toàn bộ dữ liệu liên quan đã được xóa vĩnh viễn.'},
    200,
    {'Set-Cookie': buildClearSessionCookie(context.request)},
  );
}
