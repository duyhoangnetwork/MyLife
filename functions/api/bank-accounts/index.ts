import {authenticateRequest} from '../../_lib/auth';
import {generateUuid} from '../../_lib/crypto';
import {errorResponse, isSafeWebhookUrl, jsonResponse, parseJsonBody} from '../../_lib/security';
import {PagesContext} from '../../_lib/types';

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Chưa đăng nhập hoặc phiên đã hết hạn.', 401);

  const res = await context.env.DB.prepare(
    'SELECT * FROM bank_accounts WHERE user_id = ? ORDER BY is_default DESC, created_at ASC',
  )
    .bind(auth.user.id)
    .all<Record<string, unknown>>();

  return jsonResponse({
    ok: true,
    bankAccounts: res.results.map((b) => ({
      id: String(b.id),
      bankShortName: String(b.bank_short_name || ''),
      bankName: String(b.bank_name),
      bin: String(b.bank_code),
      accountNumber: String(b.account_number),
      accountHolder: String(b.account_holder),
      defaultNote: String(b.default_note || 'TIET KIEM MY LIFE'),
      isDefault: Number(b.is_default) === 1,
      webhookVerifyUrl: b.webhook_verify_url ? String(b.webhook_verify_url) : undefined,
    })),
  });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Chưa đăng nhập hoặc phiên đã hết hạn.', 401);

  const body = await parseJsonBody<{
    bankShortName?: string;
    bankName?: string;
    bin?: string;
    accountNumber?: string;
    accountHolder?: string;
    defaultNote?: string;
    isDefault?: boolean;
    webhookVerifyUrl?: string;
  }>(context.request);

  if (!body) return errorResponse('Dữ liệu tài khoản ngân hàng không hợp lệ.', 400);

  const bankName = typeof body.bankName === 'string' ? body.bankName.trim() : '';
  const bin = typeof body.bin === 'string' ? body.bin.trim() : '';
  const accountNumber = typeof body.accountNumber === 'string' ? body.accountNumber.trim() : '';
  const accountHolder = typeof body.accountHolder === 'string' ? body.accountHolder.trim().toUpperCase() : '';

  if (!bankName || !bin || !accountNumber || !accountHolder) {
    return errorResponse('Vui lòng nhập đầy đủ ngân hàng, số tài khoản và chủ tài khoản.', 400);
  }
  if (!isSafeWebhookUrl(body.webhookVerifyUrl)) {
    return errorResponse('URL Webhook/API đối soát không hợp lệ.', 400);
  }

  const countRow = await context.env.DB.prepare(
    'SELECT COUNT(*) AS cnt FROM bank_accounts WHERE user_id = ?',
  )
    .bind(auth.user.id)
    .first<{cnt: number}>();

  const shouldBeDefault = body.isDefault === true || (countRow?.cnt || 0) === 0;
  if (shouldBeDefault) {
    await context.env.DB.prepare('UPDATE bank_accounts SET is_default = 0 WHERE user_id = ?')
      .bind(auth.user.id)
      .run();
  }

  const id = generateUuid();
  const bankShortName = String(body.bankShortName || bankName).slice(0, 24);
  const defaultNote = String(body.defaultNote || 'TIET KIEM MY LIFE').slice(0, 120);
  const webhookVerifyUrl =
    typeof body.webhookVerifyUrl === 'string' && body.webhookVerifyUrl.trim()
      ? body.webhookVerifyUrl.trim().slice(0, 300)
      : null;

  await context.env.DB.prepare(
    `INSERT INTO bank_accounts (
      id, user_id, bank_short_name, bank_name, bank_code, account_number,
      account_holder, default_note, webhook_verify_url, is_default, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      auth.user.id,
      bankShortName,
      bankName.slice(0, 100),
      bin.slice(0, 16),
      accountNumber.slice(0, 40),
      accountHolder.slice(0, 100),
      defaultNote,
      webhookVerifyUrl,
      shouldBeDefault ? 1 : 0,
      new Date().toISOString(),
    )
    .run();

  return jsonResponse(
    {
      ok: true,
      bankAccount: {
        id,
        bankShortName,
        bankName,
        bin,
        accountNumber,
        accountHolder,
        defaultNote,
        isDefault: shouldBeDefault,
        webhookVerifyUrl: webhookVerifyUrl || undefined,
      },
    },
    201,
  );
}
