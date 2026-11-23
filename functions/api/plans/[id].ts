import {authenticateRequest} from '../../_lib/auth';
import {errorResponse, jsonResponse, parseJsonBody} from '../../_lib/security';
import {PagesContext} from '../../_lib/types';

async function handleUpdate(context: PagesContext<{id: string}>): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Chưa đăng nhập hoặc phiên đã hết hạn.', 401);

  const id = context.params.id;
  if (!id) return errorResponse('Thiếu mã kế hoạch.', 400);

  const existing = await context.env.DB.prepare(
    'SELECT * FROM plans WHERE id = ? AND user_id = ? LIMIT 1',
  )
    .bind(id, auth.user.id)
    .first<Record<string, unknown>>();

  if (!existing) return errorResponse('Không tìm thấy kế hoạch thuộc tài khoản của bạn.', 404);

  const body = await parseJsonBody<Record<string, unknown>>(context.request);
  if (!body) return errorResponse('Dữ liệu cập nhật không hợp lệ.', 400);

  const title =
    typeof body.title === 'string' && body.title.trim()
      ? body.title.trim().slice(0, 160)
      : String(existing.title);
  const type =
    typeof body.type === 'string' && body.type.trim()
      ? body.type.trim().slice(0, 60)
      : String(existing.type);
  const priority =
    body.priority === 'low' || body.priority === 'medium' || body.priority === 'high'
      ? body.priority
      : String(existing.priority);
  const status =
    body.status === 'todo' || body.status === 'in_progress' || body.status === 'done'
      ? body.status
      : String(existing.status);
  const dueDate =
    typeof body.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate.trim())
      ? body.dueDate.trim()
      : String(existing.due_date);
  const dueTime =
    body.dueTime !== undefined
      ? typeof body.dueTime === 'string' && body.dueTime.trim()
        ? body.dueTime.trim().slice(0, 10)
        : null
      : (existing.due_time as string | null);
  const reminderEnabled =
    typeof body.reminderEnabled === 'boolean'
      ? body.reminderEnabled
      : Number(existing.reminder_enabled) === 1;
  const description =
    body.description !== undefined
      ? typeof body.description === 'string' && body.description.trim()
        ? body.description.trim().slice(0, 500)
        : null
      : (existing.description as string | null);

  let completedAt = existing.completed_at ? String(existing.completed_at) : null;
  if (status === 'done' && !completedAt) {
    completedAt = new Date().toISOString();
  } else if (status !== 'done') {
    completedAt = null;
  }

  await context.env.DB.prepare(
    `UPDATE plans
     SET title = ?, type = ?, description = ?, priority = ?, due_date = ?, due_time = ?,
         reminder_enabled = ?, status = ?, completed_at = ?
     WHERE id = ? AND user_id = ?`,
  )
    .bind(
      title,
      type,
      description,
      priority,
      dueDate,
      dueTime,
      reminderEnabled ? 1 : 0,
      status,
      completedAt,
      id,
      auth.user.id,
    )
    .run();

  return jsonResponse({
    ok: true,
    plan: {
      id,
      title,
      type,
      priority,
      status,
      dueDate,
      dueTime: dueTime || undefined,
      reminderEnabled,
      description: description || undefined,
      createdAt: String(existing.created_at),
      completedAt: completedAt || undefined,
    },
  });
}

export const onRequestPatch = handleUpdate;
export const onRequestPut = handleUpdate;

export async function onRequestDelete(context: PagesContext<{id: string}>): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Chưa đăng nhập hoặc phiên đã hết hạn.', 401);

  const id = context.params.id;
  if (!id) return errorResponse('Thiếu mã kế hoạch.', 400);

  const res = await context.env.DB.prepare('DELETE FROM plans WHERE id = ? AND user_id = ?')
    .bind(id, auth.user.id)
    .run();

  if ((res.meta.changes || 0) === 0) {
    return errorResponse('Không tìm thấy kế hoạch thuộc tài khoản của bạn.', 404);
  }

  return jsonResponse({ok: true, deletedId: id});
}
