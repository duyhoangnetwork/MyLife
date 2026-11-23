import {authenticateRequest} from '../../../_lib/auth';
import {errorResponse, isSafeImageUrl, jsonResponse, parseJsonBody} from '../../../_lib/security';
import {PagesContext} from '../../../_lib/types';

async function handleUpdate(context: PagesContext<{id: string}>): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Chưa đăng nhập hoặc phiên đã hết hạn.', 401);

  const id = context.params.id;
  if (!id) return errorResponse('Thiếu mã mục tiêu.', 400);

  const existing = await context.env.DB.prepare(
    'SELECT * FROM savings_goals WHERE id = ? AND user_id = ? LIMIT 1',
  )
    .bind(id, auth.user.id)
    .first<Record<string, unknown>>();

  if (!existing) return errorResponse('Không tìm thấy mục tiêu thuộc tài khoản của bạn.', 404);

  const body = await parseJsonBody<Record<string, unknown>>(context.request);
  if (!body) return errorResponse('Dữ liệu cập nhật không hợp lệ.', 400);

  const name =
    typeof body.name === 'string' && body.name.trim()
      ? body.name.trim().slice(0, 120)
      : String(existing.goal_name);
  const targetAmount =
    body.targetAmount !== undefined ? Number(body.targetAmount) : Number(existing.target_amount);
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return errorResponse('Số tiền mục tiêu phải lớn hơn 0.', 400);
  }
  const avatar = isSafeImageUrl(body.avatar) ? String(body.avatar).trim() : String(existing.avatar);
  const startDate =
    typeof body.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.startDate.trim())
      ? body.startDate.trim()
      : String(existing.start_date);
  const targetDate =
    typeof body.targetDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.targetDate.trim())
      ? body.targetDate.trim()
      : String(existing.target_date);
  const description =
    body.description !== undefined
      ? typeof body.description === 'string' && body.description.trim()
        ? body.description.trim().slice(0, 400)
        : null
      : (existing.description as string | null);

  await context.env.DB.prepare(
    `UPDATE savings_goals
     SET goal_name = ?, avatar = ?, target_amount = ?, start_date = ?, target_date = ?, description = ?
     WHERE id = ? AND user_id = ?`,
  )
    .bind(name, avatar, targetAmount, startDate, targetDate, description, id, auth.user.id)
    .run();

  return jsonResponse({
    ok: true,
    goal: {
      id,
      name,
      avatar,
      targetAmount,
      currentAmount: Number(existing.current_amount),
      startDate,
      targetDate,
      description: description || undefined,
      createdAt: String(existing.created_at),
    },
  });
}

export const onRequestPatch = handleUpdate;
export const onRequestPut = handleUpdate;

export async function onRequestDelete(context: PagesContext<{id: string}>): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Chưa đăng nhập hoặc phiên đã hết hạn.', 401);

  const id = context.params.id;
  if (!id) return errorResponse('Thiếu mã mục tiêu.', 400);

  await context.env.DB.prepare('DELETE FROM savings_deposits WHERE goal_id = ? AND user_id = ?')
    .bind(id, auth.user.id)
    .run();

  const res = await context.env.DB.prepare('DELETE FROM savings_goals WHERE id = ? AND user_id = ?')
    .bind(id, auth.user.id)
    .run();

  if ((res.meta.changes || 0) === 0) {
    return errorResponse('Không tìm thấy mục tiêu thuộc tài khoản của bạn.', 404);
  }

  return jsonResponse({ok: true, deletedId: id});
}
