import {CURRENT_PASSWORD_ALGORITHM, hashPassword, sha256Hex} from '../../_lib/crypto';
import {
  errorResponse,
  jsonResponse,
  parseJsonBody,
  validatePasswordStrength,
} from '../../_lib/security';
import {PagesContext} from '../../_lib/types';

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const {request, env} = context;

  const body = await parseJsonBody<{
    token?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>(request);

  if (!body) return errorResponse('Dữ liệu không hợp lệ.', 400);

  const rawToken = typeof body.token === 'string' ? body.token.trim() : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
  const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';

  if (!rawToken || rawToken.length < 16) {
    return errorResponse('Mã đặt lại mật khẩu không hợp lệ.', 400);
  }

  const pwErr = validatePasswordStrength(newPassword);
  if (pwErr) return errorResponse(pwErr, 400);
  if (newPassword !== confirmPassword) {
    return errorResponse('Mật khẩu nhập lại không khớp.', 400);
  }

  const tokenHash = await sha256Hex(rawToken);
  const nowIso = new Date().toISOString();

  const row = await env.DB.prepare(
    'SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = ? LIMIT 1',
  )
    .bind(tokenHash)
    .first<{id: string; user_id: string; expires_at: string; used_at: string | null}>();

  if (!row || row.used_at || row.expires_at <= nowIso) {
    return errorResponse('Liên kết đặt lại mật khẩu đã hết hạn hoặc không hợp lệ.', 400);
  }

  const {hashHex, saltHex} = await hashPassword(newPassword);

  await env.DB.batch([
    env.DB.prepare(
      'UPDATE users SET password_hash = ?, password_salt = ?, password_algorithm = ?, updated_at = ? WHERE id = ?',
    ).bind(hashHex, saltHex, CURRENT_PASSWORD_ALGORITHM, nowIso, row.user_id),
    env.DB.prepare('UPDATE password_reset_tokens SET used_at = ? WHERE id = ?').bind(nowIso, row.id),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(row.user_id),
  ]);

  return jsonResponse({
    ok: true,
    message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.',
  });
}
