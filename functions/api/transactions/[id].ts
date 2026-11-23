import {authenticateRequest} from '../../_lib/auth';
import {errorResponse, jsonResponse, parseJsonBody} from '../../_lib/security';
import {PagesContext} from '../../_lib/types';

async function handleUpdate(context: PagesContext<{id: string}>): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Chưa đăng nhập hoặc phiên đã hết hạn.', 401);

  const id = context.params.id;
  if (!id) return errorResponse('Thiếu mã giao dịch.', 400);

  const existing = await context.env.DB.prepare(
    'SELECT * FROM transactions WHERE id = ? AND user_id = ? LIMIT 1',
  )
    .bind(id, auth.user.id)
    .first<Record<string, unknown>>();

  if (!existing) {
    return errorResponse('Không tìm thấy giao dịch thuộc tài khoản của bạn.', 404);
  }

  const body = await parseJsonBody<Record<string, unknown>>(context.request);
  if (!body) return errorResponse('Dữ liệu cập nhật không hợp lệ.', 400);

  const type =
    body.type === 'income' || body.type === 'expense' ? body.type : String(existing.type);
  const title =
    typeof body.title === 'string' && body.title.trim()
      ? body.title.trim().slice(0, 140)
      : String(existing.title);
  const amount = body.amount !== undefined ? Number(body.amount) : Number(existing.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return errorResponse('Số tiền phải lớn hơn 0.', 400);
  }
  const category =
    typeof body.category === 'string' && body.category.trim()
      ? body.category.trim().slice(0, 60)
      : String(existing.category);
  const date =
    typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date.trim())
      ? body.date.trim()
      : String(existing.transaction_date);
  const paymentMethod =
    body.paymentMethod !== undefined
      ? typeof body.paymentMethod === 'string' && body.paymentMethod.trim()
        ? body.paymentMethod.trim().slice(0, 40)
        : null
      : (existing.payment_method as string | null);
  const note =
    body.note !== undefined
      ? typeof body.note === 'string' && body.note.trim()
        ? body.note.trim().slice(0, 400)
        : null
      : (existing.note as string | null);

  await context.env.DB.prepare(
    `UPDATE transactions
     SET type = ?, title = ?, amount = ?, category = ?, payment_method = ?, note = ?, transaction_date = ?
     WHERE id = ? AND user_id = ?`,
  )
    .bind(type, title, amount, category, paymentMethod, note, date, id, auth.user.id)
    .run();

  return jsonResponse({
    ok: true,
    transaction: {
      id,
      type,
      title,
      amount,
      category,
      date,
      paymentMethod: paymentMethod || undefined,
      note: note || undefined,
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
  if (!id) return errorResponse('Thiếu mã giao dịch.', 400);

  const res = await context.env.DB.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?')
    .bind(id, auth.user.id)
    .run();

  if ((res.meta.changes || 0) === 0) {
    return errorResponse('Không tìm thấy giao dịch thuộc tài khoản của bạn.', 404);
  }

  return jsonResponse({ok: true, deletedId: id});
}
