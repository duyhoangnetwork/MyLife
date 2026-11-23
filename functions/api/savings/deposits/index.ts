import {authenticateRequest} from '../../../_lib/auth';
import {generateUuid} from '../../../_lib/crypto';
import {errorResponse, jsonResponse, parseJsonBody} from '../../../_lib/security';
import {PagesContext} from '../../../_lib/types';

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Chưa đăng nhập hoặc phiên đã hết hạn.', 401);

  const res = await context.env.DB.prepare(
    'SELECT * FROM savings_deposits WHERE user_id = ? ORDER BY created_at DESC',
  )
    .bind(auth.user.id)
    .all<Record<string, unknown>>();

  return jsonResponse({
    ok: true,
    deposits: res.results.map((d) => ({
      id: String(d.id),
      goalId: String(d.goal_id),
      bankAccountId: String(d.bank_account_id),
      bankName: String(d.bank_name),
      accountNumber: String(d.account_number),
      amount: Number(d.amount),
      transactionCode: String(d.transaction_code),
      transferNote: String(d.transfer_note || ''),
      qrPayload: String(d.qr_payload || ''),
      status: String(d.payment_status),
      verificationMethod: String(d.verification_method || 'none'),
      createdAt: String(d.created_at),
      verifiedAt: d.verified_at ? String(d.verified_at) : undefined,
    })),
  });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Chưa đăng nhập hoặc phiên đã hết hạn.', 401);

  const body = await parseJsonBody<{
    goalId?: string;
    bankAccountId?: string;
    bankName?: string;
    accountNumber?: string;
    amount?: number;
    transactionCode?: string;
    transferNote?: string;
    qrPayload?: string;
  }>(context.request);

  if (!body) return errorResponse('Dữ liệu gửi tiết kiệm không hợp lệ.', 400);

  const goalId = typeof body.goalId === 'string' ? body.goalId.trim() : '';
  const bankAccountId = typeof body.bankAccountId === 'string' ? body.bankAccountId.trim() : '';
  const amount = Number(body.amount);

  if (!goalId || !bankAccountId || !Number.isFinite(amount) || amount <= 0) {
    return errorResponse('Thông tin mục tiêu hoặc số tiền gửi không hợp lệ.', 400);
  }

  // Verify goal and bank account both belong to the authenticated user
  const goal = await context.env.DB.prepare(
    'SELECT id FROM savings_goals WHERE id = ? AND user_id = ? LIMIT 1',
  )
    .bind(goalId, auth.user.id)
    .first<{id: string}>();
  if (!goal) return errorResponse('Mục tiêu tiết kiệm không tồn tại.', 404);

  const bank = await context.env.DB.prepare(
    'SELECT id, bank_name, account_number FROM bank_accounts WHERE id = ? AND user_id = ? LIMIT 1',
  )
    .bind(bankAccountId, auth.user.id)
    .first<{id: string; bank_name: string; account_number: string}>();
  if (!bank) return errorResponse('Tài khoản ngân hàng không tồn tại.', 404);

  const id = generateUuid();
  const createdAt = new Date().toISOString();
  const transactionCode = String(body.transactionCode || `ML${Date.now()}`).slice(0, 40);
  const transferNote = String(body.transferNote || '').slice(0, 160);
  const qrPayload = String(body.qrPayload || '').slice(0, 1000);

  // Strictly created as pending; never auto-credits goal balance
  await context.env.DB.prepare(
    `INSERT INTO savings_deposits (
      id, user_id, goal_id, bank_account_id, bank_name, account_number, amount,
      transaction_code, transfer_note, qr_payload, payment_status, verification_method, created_at, verified_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'none', ?, NULL)`,
  )
    .bind(
      id,
      auth.user.id,
      goalId,
      bank.id,
      bank.bank_name,
      bank.account_number,
      amount,
      transactionCode,
      transferNote,
      qrPayload,
      createdAt,
    )
    .run();

  return jsonResponse(
    {
      ok: true,
      deposit: {
        id,
        goalId,
        bankAccountId: bank.id,
        bankName: bank.bank_name,
        accountNumber: bank.account_number,
        amount,
        transactionCode,
        transferNote,
        qrPayload,
        status: 'pending',
        verificationMethod: 'none',
        createdAt,
      },
    },
    201,
  );
}
