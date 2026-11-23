import {authenticateRequest} from '../../_lib/auth';
import {errorResponse, jsonResponse, parseJsonBody} from '../../_lib/security';
import {PagesContext} from '../../_lib/types';

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Phiên đăng nhập đã hết hạn.', 401);

  const nowIso = new Date().toISOString();
  const rows = await context.env.DB.prepare(
    `SELECT id, user_agent, ip_address, expires_at, created_at, last_used_at
     FROM sessions
     WHERE user_id = ? AND expires_at > ?
     ORDER BY last_used_at DESC`,
  )
    .bind(auth.user.id, nowIso)
    .all<{
      id: string;
      user_agent: string;
      ip_address: string;
      expires_at: string;
      created_at: string;
      last_used_at: string;
    }>();

  return jsonResponse({
    ok: true,
    sessions: rows.results.map((r) => ({
      id: r.id,
      userAgent: r.user_agent,
      ipAddress: r.ip_address,
      expiresAt: r.expires_at,
      createdAt: r.created_at,
      lastUsedAt: r.last_used_at,
      isCurrent: r.id === auth.sessionId,
    })),
  });
}

export async function onRequestDelete(context: PagesContext): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Phiên đăng nhập đã hết hạn.', 401);

  const body = await parseJsonBody<{sessionId?: string; revokeOthers?: boolean}>(context.request);
  if (body?.revokeOthers) {
    await context.env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?')
      .bind(auth.user.id, auth.sessionId)
      .run();
    return jsonResponse({ok: true, message: 'Đã thu hồi toàn bộ phiên đăng nhập trên thiết bị khác.'});
  }

  const targetId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : '';
  if (!targetId) {
    return errorResponse('Thiếu mã phiên cần thu hồi.', 400);
  }
  if (targetId === auth.sessionId) {
    return errorResponse('Vui lòng dùng chức năng Đăng xuất để đóng phiên hiện tại.', 400);
  }

  const res = await context.env.DB.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?')
    .bind(targetId, auth.user.id)
    .run();

  if ((res.meta.changes || 0) === 0) {
    return errorResponse('Không tìm thấy phiên đăng nhập thuộc tài khoản của bạn.', 404);
  }

  return jsonResponse({ok: true, message: 'Đã thu hồi phiên đăng nhập.'});
}
