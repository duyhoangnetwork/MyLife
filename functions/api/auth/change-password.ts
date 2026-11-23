import {authenticateRequest} from '../../_lib/auth';
import {CURRENT_PASSWORD_ALGORITHM, hashPassword, verifyPassword} from '../../_lib/crypto';
import {
  errorResponse,
  jsonResponse,
  parseJsonBody,
  validatePasswordStrength,
} from '../../_lib/security';
import {DbUserRow, PagesContext} from '../../_lib/types';

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Phiên đăng nhập đã hết hạn.', 401);

  const body = await parseJsonBody<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>(context.request);

  if (!body) return errorResponse('Dữ liệu không hợp lệ.', 400);

  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
  const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';

  if (!currentPassword) {
    return errorResponse('Vui lòng nhập mật khẩu hiện tại.', 400);
  }

  const pwErr = validatePasswordStrength(newPassword);
  if (pwErr) return errorResponse(pwErr, 400);

  if (newPassword !== confirmPassword) {
    return errorResponse('Mật khẩu mới nhập lại không khớp.', 400);
  }

  const user = await context.env.DB.prepare('SELECT * FROM users WHERE id = ? LIMIT 1')
    .bind(auth.user.id)
    .first<DbUserRow>();

  if (!user) return errorResponse('Không tìm thấy tài khoản.', 404);

  const matches = await verifyPassword(
    currentPassword,
    user.password_hash,
    user.password_salt,
    user.password_algorithm,
  );
  if (!matches) {
    return errorResponse('Mật khẩu hiện tại không chính xác.', 400);
  }

  const {hashHex, saltHex} = await hashPassword(newPassword);
  const nowIso = new Date().toISOString();

  await context.env.DB.prepare(
    'UPDATE users SET password_hash = ?, password_salt = ?, password_algorithm = ?, updated_at = ? WHERE id = ?',
  )
    .bind(hashHex, saltHex, CURRENT_PASSWORD_ALGORITHM, nowIso, auth.user.id)
    .run();

  // Revoke other active sessions upon password change
  await context.env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?')
    .bind(auth.user.id, auth.sessionId)
    .run();

  return jsonResponse({
    ok: true,
    message: 'Đổi mật khẩu thành công. Các phiên đăng nhập khác đã được thu hồi.',
  });
}
