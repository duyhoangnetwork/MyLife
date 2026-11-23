import {authenticateRequest, getUserBootstrapPayload} from '../../_lib/auth';
import {errorResponse, jsonResponse} from '../../_lib/security';
import {PagesContext} from '../../_lib/types';

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Chưa đăng nhập hoặc phiên đã hết hạn.', 401);

  const payload = await getUserBootstrapPayload(context.env.DB, auth.user.id, auth.sessionId);
  if (!payload) return errorResponse('Không tìm thấy dữ liệu.', 404);

  return jsonResponse({
    ok: true,
    exportedAt: new Date().toISOString(),
    account: payload.user,
    data: payload.databaseState,
  });
}
