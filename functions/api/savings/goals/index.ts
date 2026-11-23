import {authenticateRequest} from '../../../_lib/auth';
import {generateUuid} from '../../../_lib/crypto';
import {errorResponse, isSafeImageUrl, jsonResponse, parseJsonBody} from '../../../_lib/security';
import {PagesContext} from '../../../_lib/types';

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Chưa đăng nhập hoặc phiên đã hết hạn.', 401);

  const res = await context.env.DB.prepare(
    'SELECT * FROM savings_goals WHERE user_id = ? ORDER BY created_at DESC',
  )
    .bind(auth.user.id)
    .all<Record<string, unknown>>();

  return jsonResponse({
    ok: true,
    goals: res.results.map((g) => ({
      id: String(g.id),
      name: String(g.goal_name),
      avatar: String(g.avatar),
      targetAmount: Number(g.target_amount),
      currentAmount: Number(g.current_amount),
      startDate: String(g.start_date),
      targetDate: String(g.target_date),
      description: g.description ? String(g.description) : undefined,
      createdAt: String(g.created_at),
    })),
  });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Chưa đăng nhập hoặc phiên đã hết hạn.', 401);

  const body = await parseJsonBody<{
    name?: string;
    avatar?: string;
    targetAmount?: number;
    startDate?: string;
    targetDate?: string;
    description?: string;
  }>(context.request);

  if (!body) return errorResponse('Dữ liệu mục tiêu không hợp lệ.', 400);

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const targetAmount = Number(body.targetAmount);
  const startDate = typeof body.startDate === 'string' ? body.startDate.trim() : '';
  const targetDate = typeof body.targetDate === 'string' ? body.targetDate.trim() : '';

  if (!name || name.length > 120) return errorResponse('Tên mục tiêu phải từ 1 đến 120 ký tự.', 400);
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return errorResponse('Số tiền mục tiêu phải lớn hơn 0.', 400);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    return errorResponse('Ngày bắt đầu/đích không hợp lệ.', 400);
  }

  const avatar = isSafeImageUrl(body.avatar)
    ? String(body.avatar).trim()
    : '/src/assets/images/goal_reserve_fund_1795412998467.jpg';
  const description =
    typeof body.description === 'string' && body.description.trim()
      ? body.description.trim().slice(0, 400)
      : null;

  const id = generateUuid();
  const createdAt = new Date().toISOString();

  await context.env.DB.prepare(
    `INSERT INTO savings_goals (
      id, user_id, goal_name, avatar, target_amount, current_amount,
      start_date, target_date, description, status, created_at
    ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, 'active', ?)`,
  )
    .bind(
      id,
      auth.user.id,
      name,
      avatar,
      targetAmount,
      startDate,
      targetDate,
      description,
      createdAt,
    )
    .run();

  return jsonResponse(
    {
      ok: true,
      goal: {
        id,
        name,
        avatar,
        targetAmount,
        currentAmount: 0,
        startDate,
        targetDate,
        description: description || undefined,
        createdAt,
      },
    },
    201,
  );
}
