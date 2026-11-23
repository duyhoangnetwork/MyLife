import {authenticateRequest} from '../../_lib/auth';
import {errorResponse, isSafeWebhookUrl, jsonResponse, parseJsonBody} from '../../_lib/security';
import {PagesContext} from '../../_lib/types';

async function handleUpdate(context: PagesContext<{id: string}>): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Chưa đăng nhập hoặc phiên đã hết hạn.', 401);

  const id = context.params.id;
  if (!id) return errorResponse('Thiếu mã tài khoản ngân hàng.', 400);

  const existing = await context.env.DB.prepare(
    'SELECT * FROM bank_accounts WHERE id = ? AND user_id = ? LIMIT 1',
  )
    .bind(id, auth.user.id)
    .first<Record<string, unknown>>();

  if (!existing) return errorResponse('Không tìm thấy tài khoản ngân hàng thuộc tài khoản của bạn.', 404);

  const body = await parseJsonBody<Record<string, unknown>>(context.request);
  if (!body) return errorResponse('Dữ liệu cập nhật không hợp lệ.', 400);

  if (body.webhookVerifyUrl !== undefined && !isSafeWebhookUrl(body.webhookVerifyUrl)) {
    return errorResponse('URL Webhook/API đối soát không hợp lệ.', 400);
  }

  const isDefault =
    typeof body.isDefault === 'boolean' ? body.isDefault : Number(existing.is_default) === 1;
  if (body.isDefault === true) {
    await context.env.DB.prepare('UPDATE bank_accounts SET is_default = 0 WHERE user_id = ?')
      .bind(auth.user.id)
      .run();
  }

  const bankShortName =
    typeof body.bankShortName === 'string' && body.bankShortName.trim()
      ? body.bankShortName.trim().slice(0, 24)
      : String(existing.bank_short_name || '');
  const bankName =
    typeof body.bankName === 'string' && body.bankName.trim()
      ? body.bankName.trim().slice(0, 100)
      : String(existing.bank_name);
  const bin =
    typeof body.bin === 'string' && body.bin.trim()
      ? body.bin.trim().slice(0, 16)
      : String(existing.bank_code);
  const accountNumber =
    typeof body.accountNumber === 'string' && body.accountNumber.trim()
      ? body.accountNumber.trim().slice(0, 40)
      : String(existing.account_number);
  const accountHolder =
    typeof body.accountHolder === 'string' && body.accountHolder.trim()
      ? body.accountHolder.trim().toUpperCase().slice(0, 100)
      : String(existing.account_holder);
  const defaultNote =
    typeof body.defaultNote === 'string'
      ? body.defaultNote.trim().slice(0, 120) || 'TIET KIEM MY LIFE'
      : String(existing.default_note);
  const webhookVerifyUrl =
    body.webhookVerifyUrl !== undefined
      ? typeof body.webhookVerifyUrl === 'string' && body.webhookVerifyUrl.trim()
        ? body.webhookVerifyUrl.trim().slice(0, 300)
        : null
      : (existing.webhook_verify_url as string | null);

  await context.env.DB.prepare(
    `UPDATE bank_accounts
     SET bank_short_name = ?, bank_name = ?, bank_code = ?, account_number = ?,
         account_holder = ?, default_note = ?, webhook_verify_url = ?, is_default = ?
     WHERE id = ? AND user_id = ?`,
  )
    .bind(
      bankShortName,
      bankName,
      bin,
      accountNumber,
      accountHolder,
      defaultNote,
      webhookVerifyUrl,
      isDefault ? 1 : 0,
      id,
      auth.user.id,
    )
    .run();

  return jsonResponse({
    ok: true,
    bankAccount: {
      id,
      bankShortName,
      bankName,
      bin,
      accountNumber,
      accountHolder,
      defaultNote,
      isDefault,
      webhookVerifyUrl: webhookVerifyUrl || undefined,
    },
  });
}

export const onRequestPatch = handleUpdate;
export const onRequestPut = handleUpdate;

export async function onRequestDelete(context: PagesContext<{id: string}>): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Chưa đăng nhập hoặc phiên đã hết hạn.', 401);

  const id = context.params.id;
  if (!id) return errorResponse('Thiếu mã tài khoản ngân hàng.', 400);

  const res = await context.env.DB.prepare('DELETE FROM bank_accounts WHERE id = ? AND user_id = ?')
    .bind(id, auth.user.id)
    .run();

  if ((res.meta.changes || 0) === 0) {
    return errorResponse('Không tìm thấy tài khoản ngân hàng thuộc tài khoản của bạn.', 404);
  }

  // Ensure another account becomes default if remaining
  const remaining = await context.env.DB.prepare(
    'SELECT id, is_default FROM bank_accounts WHERE user_id = ? ORDER BY created_at ASC',
  )
    .bind(auth.user.id)
    .all<{id: string; is_default: number}>();

  if (remaining.results.length > 0 && !remaining.results.some((b) => b.is_default === 1)) {
    await context.env.DB.prepare('UPDATE bank_accounts SET is_default = 1 WHERE id = ? AND user_id = ?')
      .bind(remaining.results[0].id, auth.user.id)
      .run();
  }

  return jsonResponse({ok: true, deletedId: id});
}
