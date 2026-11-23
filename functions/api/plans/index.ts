import {authenticateRequest} from '../../_lib/auth';
import {generateUuid} from '../../_lib/crypto';
import {errorResponse, jsonResponse, parseJsonBody} from '../../_lib/security';
import {PagesContext} from '../../_lib/types';

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Chưa đăng nhập hoặc phiên đã hết hạn.', 401);

  const res = await context.env.DB.prepare(
    'SELECT * FROM plans WHERE user_id = ? ORDER BY due_date ASC, created_at DESC',
  )
    .bind(auth.user.id)
    .all<Record<string, unknown>>();

  return jsonResponse({
    ok: true,
    plans: res.results.map((p) => ({
      id: String(p.id),
      title: String(p.title),
      type: String(p.type),
      priority: String(p.priority),
      status: String(p.status),
      dueDate: String(p.due_date),
      dueTime: p.due_time ? String(p.due_time) : undefined,
      reminderEnabled: Number(p.reminder_enabled) === 1,
      description: p.description ? String(p.description) : undefined,
      createdAt: String(p.created_at),
      completedAt: p.completed_at ? String(p.completed_at) : undefined,
    })),
  });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Chưa đăng nhập hoặc phiên đã hết hạn.', 401);

  const body = await parseJsonBody<{
    title?: string;
    type?: string;
    priority?: string;
    status?: string;
    dueDate?: string;
    dueTime?: string;
    reminderEnabled?: boolean;
    description?: string;
  }>(context.request);

  if (!body) return errorResponse('Dữ liệu kế hoạch không hợp lệ.', 400);

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const type = typeof body.type === 'string' && body.type.trim() ? body.type.trim().slice(0, 60) : 'Công việc';
  const priority = body.priority === 'low' || body.priority === 'high' ? body.priority : 'medium';
  const status = body.status === 'in_progress' || body.status === 'done' ? body.status : 'todo';
  const dueDate = typeof body.dueDate === 'string' ? body.dueDate.trim() : '';

  if (!title || title.length > 160) return errorResponse('Tiêu đề kế hoạch phải từ 1 đến 160 ký tự.', 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return errorResponse('Ngày đến hạn không hợp lệ.', 400);

  const dueTime = typeof body.dueTime === 'string' && body.dueTime.trim() ? body.dueTime.trim().slice(0, 10) : null;
  const reminderEnabled = body.reminderEnabled !== false;
  const description =
    typeof body.description === 'string' && body.description.trim()
      ? body.description.trim().slice(0, 500)
      : null;

  const id = generateUuid();
  const createdAt = new Date().toISOString();
  const completedAt = status === 'done' ? createdAt : null;

  await context.env.DB.prepare(
    `INSERT INTO plans (
      id, user_id, title, type, description, priority, due_date, due_time,
      reminder_enabled, status, created_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      auth.user.id,
      title,
      type,
      description,
      priority,
      dueDate,
      dueTime,
      reminderEnabled ? 1 : 0,
      status,
      createdAt,
      completedAt,
    )
    .run();

  return jsonResponse(
    {
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
        createdAt,
        completedAt: completedAt || undefined,
      },
    },
    201,
  );
}
