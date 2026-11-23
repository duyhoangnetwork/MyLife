import {authenticateRequest} from '../../_lib/auth';
import {generateUuid} from '../../_lib/crypto';
import {errorResponse, jsonResponse, parseJsonBody} from '../../_lib/security';
import {PagesContext} from '../../_lib/types';

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Chưa đăng nhập hoặc phiên đã hết hạn.', 401);

  const res = await context.env.DB.prepare(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY transaction_date DESC, created_at DESC',
  )
    .bind(auth.user.id)
    .all<Record<string, unknown>>();

  return jsonResponse({
    ok: true,
    transactions: res.results.map((t) => ({
      id: String(t.id),
      type: String(t.type),
      title: String(t.title),
      amount: Number(t.amount),
      category: String(t.category),
      date: String(t.transaction_date),
      paymentMethod: t.payment_method ? String(t.payment_method) : undefined,
      note: t.note ? String(t.note) : undefined,
      createdAt: String(t.created_at),
    })),
  });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Chưa đăng nhập hoặc phiên đã hết hạn.', 401);

  const body = await parseJsonBody<{
    type?: string;
    title?: string;
    amount?: number;
    category?: string;
    date?: string;
    paymentMethod?: string;
    note?: string;
  }>(context.request);

  if (!body) return errorResponse('Dữ liệu giao dịch không hợp lệ.', 400);

  const type = body.type === 'income' || body.type === 'expense' ? body.type : null;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const amount = Number(body.amount);
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const date = typeof body.date === 'string' ? body.date.trim() : '';

  if (!type) return errorResponse('Loại giao dịch không hợp lệ.', 400);
  if (!title || title.length > 140) return errorResponse('Tên giao dịch phải từ 1 đến 140 ký tự.', 400);
  if (!Number.isFinite(amount) || amount <= 0) return errorResponse('Số tiền phải lớn hơn 0.', 400);
  if (!category || category.length > 60) return errorResponse('Danh mục không hợp lệ.', 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return errorResponse('Ngày giao dịch không hợp lệ.', 400);

  const id = generateUuid();
  const createdAt = new Date().toISOString();
  const paymentMethod =
    typeof body.paymentMethod === 'string' && body.paymentMethod.trim()
      ? body.paymentMethod.trim().slice(0, 40)
      : null;
  const note =
    typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 400) : null;

  await context.env.DB.prepare(
    `INSERT INTO transactions (
      id, user_id, type, title, amount, category, payment_method, note, transaction_date, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, auth.user.id, type, title, amount, category, paymentMethod, note, date, createdAt)
    .run();

  return jsonResponse(
    {
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
        createdAt,
      },
    },
    201,
  );
}
