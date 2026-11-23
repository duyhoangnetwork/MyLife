import {
  authenticateRequest,
  getUserBootstrapPayload,
  recalculateAndPersistGoalBalances,
} from '../../_lib/auth';
import {generateUuid} from '../../_lib/crypto';
import {
  errorResponse,
  isSafeImageUrl,
  isSafeWebhookUrl,
  jsonResponse,
  parseJsonBody,
} from '../../_lib/security';
import {PagesContext} from '../../_lib/types';

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Chưa đăng nhập hoặc phiên đã hết hạn.', 401);

  const payload = await getUserBootstrapPayload(context.env.DB, auth.user.id, auth.sessionId);
  if (!payload) return errorResponse('Không tìm thấy dữ liệu tài khoản.', 404);

  return jsonResponse({ok: true, ...payload});
}

interface ImportPayload {
  action: 'import_data' | 'wipe_personal_data';
  replaceExisting?: boolean;
  data?: {
    transactions?: Array<Record<string, unknown>>;
    savingsGoals?: Array<Record<string, unknown>>;
    savingsDeposits?: Array<Record<string, unknown>>;
    plans?: Array<Record<string, unknown>>;
    bankAccounts?: Array<Record<string, unknown>>;
    settings?: Record<string, unknown>;
  };
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Chưa đăng nhập hoặc phiên đã hết hạn.', 401);

  const body = await parseJsonBody<ImportPayload>(context.request);
  if (!body) return errorResponse('Dữ liệu đồng bộ không hợp lệ.', 400);

  const userId = auth.user.id;
  const nowIso = new Date().toISOString();

  if (body.action === 'wipe_personal_data') {
    await context.env.DB.batch([
      context.env.DB.prepare('DELETE FROM savings_deposits WHERE user_id = ?').bind(userId),
      context.env.DB.prepare('DELETE FROM savings_goals WHERE user_id = ?').bind(userId),
      context.env.DB.prepare('DELETE FROM transactions WHERE user_id = ?').bind(userId),
      context.env.DB.prepare('DELETE FROM plans WHERE user_id = ?').bind(userId),
      context.env.DB.prepare('DELETE FROM bank_accounts WHERE user_id = ?').bind(userId),
    ]);
    const payload = await getUserBootstrapPayload(context.env.DB, userId, auth.sessionId);
    return jsonResponse({ok: true, ...payload});
  }

  if (body.action !== 'import_data' || !body.data || typeof body.data !== 'object') {
    return errorResponse('Hành động đồng bộ không hợp lệ.', 400);
  }

  if (body.replaceExisting) {
    await context.env.DB.batch([
      context.env.DB.prepare('DELETE FROM savings_deposits WHERE user_id = ?').bind(userId),
      context.env.DB.prepare('DELETE FROM savings_goals WHERE user_id = ?').bind(userId),
      context.env.DB.prepare('DELETE FROM transactions WHERE user_id = ?').bind(userId),
      context.env.DB.prepare('DELETE FROM plans WHERE user_id = ?').bind(userId),
      context.env.DB.prepare('DELETE FROM bank_accounts WHERE user_id = ?').bind(userId),
    ]);
  }

  const bankIdMap = new Map<string, string>();
  const banks = Array.isArray(body.data.bankAccounts) ? body.data.bankAccounts.slice(0, 30) : [];
  for (const b of banks) {
    const oldId = typeof b.id === 'string' ? b.id : generateUuid();
    const newId = body.replaceExisting ? oldId : generateUuid();
    bankIdMap.set(oldId, newId);
    const webhookUrl = isSafeWebhookUrl(b.webhookVerifyUrl) && typeof b.webhookVerifyUrl === 'string'
      ? b.webhookVerifyUrl.trim() || null
      : null;

    await context.env.DB.prepare(
      `INSERT OR REPLACE INTO bank_accounts (
        id, user_id, bank_short_name, bank_name, bank_code, account_number,
        account_holder, default_note, webhook_verify_url, is_default, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        newId,
        userId,
        String(b.bankShortName || '').slice(0, 20),
        String(b.bankName || 'Ngân hàng').slice(0, 100),
        String(b.bin || '970407').slice(0, 16),
        String(b.accountNumber || '').slice(0, 40),
        String(b.accountHolder || 'CHU TAI KHOAN').slice(0, 100),
        String(b.defaultNote || 'TIET KIEM MY LIFE').slice(0, 120),
        webhookUrl,
        b.isDefault ? 1 : 0,
        nowIso,
      )
      .run();
  }

  const txs = Array.isArray(body.data.transactions) ? body.data.transactions.slice(0, 500) : [];
  for (const t of txs) {
    const amount = Number(t.amount);
    if (!Number.isFinite(amount) || amount < 0) continue;
    const type = t.type === 'income' ? 'income' : 'expense';
    const newId = generateUuid();
    await context.env.DB.prepare(
      `INSERT INTO transactions (
        id, user_id, type, title, amount, category, payment_method, note, transaction_date, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        newId,
        userId,
        type,
        String(t.title || 'Giao dịch').slice(0, 140),
        amount,
        String(t.category || 'Khác').slice(0, 60),
        t.paymentMethod ? String(t.paymentMethod).slice(0, 40) : null,
        t.note ? String(t.note).slice(0, 400) : null,
        String(t.date || nowIso.slice(0, 10)).slice(0, 10),
        typeof t.createdAt === 'string' ? t.createdAt : nowIso,
      )
      .run();
  }

  const goalIdMap = new Map<string, string>();
  const goals = Array.isArray(body.data.savingsGoals) ? body.data.savingsGoals.slice(0, 100) : [];
  for (const g of goals) {
    const oldId = typeof g.id === 'string' ? g.id : generateUuid();
    const newId = generateUuid();
    goalIdMap.set(oldId, newId);
    const targetAmount = Math.max(1, Number(g.targetAmount) || 1_000_000);
    const avatar = isSafeImageUrl(g.avatar)
      ? String(g.avatar)
      : '/src/assets/images/goal_reserve_fund_1795412998467.jpg';

    await context.env.DB.prepare(
      `INSERT INTO savings_goals (
        id, user_id, goal_name, avatar, target_amount, current_amount,
        start_date, target_date, description, status, created_at
      ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, 'active', ?)`,
    )
      .bind(
        newId,
        userId,
        String(g.name || 'Mục tiêu tiết kiệm').slice(0, 120),
        avatar,
        targetAmount,
        String(g.startDate || nowIso.slice(0, 10)).slice(0, 10),
        String(g.targetDate || nowIso.slice(0, 10)).slice(0, 10),
        g.description ? String(g.description).slice(0, 400) : null,
        typeof g.createdAt === 'string' ? g.createdAt : nowIso,
      )
      .run();
  }

  const deposits = Array.isArray(body.data.savingsDeposits) ? body.data.savingsDeposits.slice(0, 500) : [];
  for (const d of deposits) {
    const mappedGoalId = goalIdMap.get(String(d.goalId || ''));
    if (!mappedGoalId) continue;
    const amount = Number(d.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const status =
      d.status === 'confirmed' || d.status === 'failed' ? d.status : 'pending';
    const verificationMethod =
      d.verificationMethod === 'api_webhook' || d.verificationMethod === 'manual_unverified'
        ? d.verificationMethod
        : 'none';

    await context.env.DB.prepare(
      `INSERT INTO savings_deposits (
        id, user_id, goal_id, bank_account_id, bank_name, account_number, amount,
        transaction_code, transfer_note, qr_payload, payment_status, verification_method, created_at, verified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        generateUuid(),
        userId,
        mappedGoalId,
        bankIdMap.get(String(d.bankAccountId || '')) || String(d.bankAccountId || ''),
        String(d.bankName || 'Ngân hàng').slice(0, 100),
        String(d.accountNumber || '').slice(0, 40),
        amount,
        String(d.transactionCode || `ML${Date.now()}`).slice(0, 40),
        String(d.transferNote || '').slice(0, 160),
        String(d.qrPayload || '').slice(0, 1000),
        status,
        verificationMethod,
        typeof d.createdAt === 'string' ? d.createdAt : nowIso,
        typeof d.verifiedAt === 'string' ? d.verifiedAt : null,
      )
      .run();
  }

  await recalculateAndPersistGoalBalances(context.env.DB, userId);

  const plans = Array.isArray(body.data.plans) ? body.data.plans.slice(0, 500) : [];
  for (const p of plans) {
    const priority = p.priority === 'low' || p.priority === 'high' ? p.priority : 'medium';
    const status = p.status === 'in_progress' || p.status === 'done' ? p.status : 'todo';
    await context.env.DB.prepare(
      `INSERT INTO plans (
        id, user_id, title, type, description, priority, due_date, due_time,
        reminder_enabled, status, created_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        generateUuid(),
        userId,
        String(p.title || 'Kế hoạch').slice(0, 160),
        String(p.type || 'Công việc').slice(0, 60),
        p.description ? String(p.description).slice(0, 500) : null,
        priority,
        String(p.dueDate || nowIso.slice(0, 10)).slice(0, 10),
        p.dueTime ? String(p.dueTime).slice(0, 10) : null,
        p.reminderEnabled ? 1 : 0,
        status,
        typeof p.createdAt === 'string' ? p.createdAt : nowIso,
        typeof p.completedAt === 'string' ? p.completedAt : null,
      )
      .run();
  }

  const payload = await getUserBootstrapPayload(context.env.DB, userId, auth.sessionId);
  return jsonResponse({ok: true, ...payload});
}
