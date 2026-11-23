import {generateRandomToken, generateUuid, sha256Hex} from './crypto';
import {parseCookies, SESSION_COOKIE_NAME} from './security';
import {AuthenticatedContext, D1Database, DbUserRow} from './types';

export const DEFAULT_PROFILE_AVATAR = '/src/assets/images/avatar_user_profile_1795412997980.jpg';

export const DEFAULT_CATEGORIES = {
  income: ['Lương', 'Thưởng', 'Kinh doanh', 'Đầu tư', 'Khác'],
  expense: [
    'Ăn uống',
    'Di chuyển',
    'Mua sắm',
    'Học tập',
    'Giải trí',
    'Hóa đơn',
    'Sức khỏe',
    'Gia đình',
    'Khác',
  ],
};

export async function authenticateRequest(
  db: D1Database,
  request: Request,
): Promise<AuthenticatedContext | null> {
  const cookies = parseCookies(request);
  const rawToken = cookies[SESSION_COOKIE_NAME];
  if (!rawToken || rawToken.length < 16) return null;

  const tokenHash = await sha256Hex(rawToken);
  const row = await db
    .prepare(
      `SELECT
        s.id AS session_id,
        s.expires_at AS expires_at,
        u.id AS user_id,
        u.full_name,
        u.email,
        u.email_verified,
        u.avatar,
        u.bio,
        u.status,
        u.created_at,
        u.updated_at
      FROM sessions s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?
      LIMIT 1`,
    )
    .bind(tokenHash)
    .first<{
      session_id: string;
      expires_at: string;
      user_id: string;
      full_name: string;
      email: string;
      email_verified: number;
      avatar: string;
      bio: string;
      status: string;
      created_at: string;
      updated_at: string;
    }>();

  if (!row) return null;

  const nowIso = new Date().toISOString();
  if (row.expires_at <= nowIso || row.status !== 'active') {
    await db.prepare('DELETE FROM sessions WHERE id = ?').bind(row.session_id).run();
    return null;
  }

  await db
    .prepare('UPDATE sessions SET last_used_at = ? WHERE id = ?')
    .bind(nowIso, row.session_id)
    .run();

  return {
    sessionId: row.session_id,
    expiresAt: row.expires_at,
    user: {
      id: row.user_id,
      fullName: row.full_name,
      email: row.email,
      emailVerified: row.email_verified === 1,
      avatar: row.avatar || DEFAULT_PROFILE_AVATAR,
      bio: row.bio || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  };
}

export async function createSessionForUser(
  db: D1Database,
  userId: string,
  request: Request,
  rememberMe: boolean,
): Promise<{rawToken: string; sessionId: string; expiresAt: string}> {
  const rawToken = generateRandomToken(32);
  const tokenHash = await sha256Hex(rawToken);
  const sessionId = generateUuid();
  const now = new Date();
  const ttlMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const expiresAt = new Date(now.getTime() + ttlMs).toISOString();
  const nowIso = now.toISOString();
  const userAgent = (request.headers.get('user-agent') || 'Unknown device').slice(0, 220);
  const ipAddress = (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for') ||
    'local'
  )
    .split(',')[0]
    .trim()
    .slice(0, 64);

  await db
    .prepare(
      `INSERT INTO sessions (id, user_id, token_hash, user_agent, ip_address, expires_at, created_at, last_used_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(sessionId, userId, tokenHash, userAgent, ipAddress, expiresAt, nowIso, nowIso)
    .run();

  return {rawToken, sessionId, expiresAt};
}

export async function ensureDefaultUserSettings(db: D1Database, userId: string): Promise<void> {
  const nowIso = new Date().toISOString();
  await db
    .prepare(
      `INSERT OR IGNORE INTO user_settings (
        user_id, theme, accent_color, font_scale, transitions_enabled,
        glass_effects_enabled, currency, monthly_budget, cycle_start_day, categories_json, updated_at
      ) VALUES (?, 'light', 'sky', 'md', 1, 1, 'VND', 15000000, 1, ?, ?)`,
    )
    .bind(userId, JSON.stringify(DEFAULT_CATEGORIES), nowIso)
    .run();
}

export async function recalculateAndPersistGoalBalances(db: D1Database, userId: string): Promise<void> {
  const goalsRes = await db
    .prepare('SELECT id, target_amount FROM savings_goals WHERE user_id = ?')
    .bind(userId)
    .all<{id: string; target_amount: number}>();

  const depsRes = await db
    .prepare("SELECT goal_id, SUM(amount) AS total FROM savings_deposits WHERE user_id = ? AND payment_status = 'confirmed' GROUP BY goal_id")
    .bind(userId)
    .all<{goal_id: string; total: number}>();

  const totals = new Map<string, number>();
  for (const row of depsRes.results) {
    totals.set(row.goal_id, Number(row.total) || 0);
  }

  for (const g of goalsRes.results) {
    const verified = totals.get(g.id) || 0;
    const status = verified >= g.target_amount ? 'completed' : 'active';
    await db
      .prepare('UPDATE savings_goals SET current_amount = ?, status = ? WHERE id = ? AND user_id = ?')
      .bind(verified, status, g.id, userId)
      .run();
  }
}

export async function getUserBootstrapPayload(db: D1Database, userId: string, sessionId: string) {
  await ensureDefaultUserSettings(db, userId);

  const user = await db
    .prepare('SELECT id, full_name, email, email_verified, avatar, bio, created_at, updated_at FROM users WHERE id = ?')
    .bind(userId)
    .first<Omit<DbUserRow, 'password_hash' | 'password_salt' | 'password_algorithm' | 'status'>>();

  if (!user) return null;

  const settingsRow = await db
    .prepare('SELECT * FROM user_settings WHERE user_id = ?')
    .bind(userId)
    .first<{
      theme: 'light' | 'dark' | 'glass';
      accent_color: string;
      font_scale: 'sm' | 'md' | 'lg';
      transitions_enabled: number;
      glass_effects_enabled: number;
      currency: 'VND' | 'USD' | 'EUR';
      monthly_budget: number;
      cycle_start_day: number;
      categories_json: string;
    }>();

  const [txRes, goalsRes, depsRes, plansRes, banksRes] = await Promise.all([
    db
      .prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY transaction_date DESC, created_at DESC')
      .bind(userId)
      .all<Record<string, unknown>>(),
    db
      .prepare('SELECT * FROM savings_goals WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all<Record<string, unknown>>(),
    db
      .prepare('SELECT * FROM savings_deposits WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all<Record<string, unknown>>(),
    db
      .prepare('SELECT * FROM plans WHERE user_id = ? ORDER BY due_date ASC, created_at DESC')
      .bind(userId)
      .all<Record<string, unknown>>(),
    db
      .prepare('SELECT * FROM bank_accounts WHERE user_id = ? ORDER BY is_default DESC, created_at ASC')
      .bind(userId)
      .all<Record<string, unknown>>(),
  ]);

  let categories = DEFAULT_CATEGORIES;
  try {
    if (settingsRow?.categories_json) {
      const parsed = JSON.parse(settingsRow.categories_json);
      if (Array.isArray(parsed.income) && Array.isArray(parsed.expense)) {
        categories = parsed;
      }
    }
  } catch {
    categories = DEFAULT_CATEGORIES;
  }

  const savingsDeposits = depsRes.results.map((d) => ({
    id: String(d.id),
    goalId: String(d.goal_id),
    bankAccountId: String(d.bank_account_id),
    bankName: String(d.bank_name),
    accountNumber: String(d.account_number),
    amount: Number(d.amount),
    transactionCode: String(d.transaction_code),
    transferNote: String(d.transfer_note || ''),
    qrPayload: String(d.qr_payload || ''),
    status: String(d.payment_status) as 'pending' | 'confirmed' | 'failed',
    verificationMethod: String(d.verification_method || 'none') as 'none' | 'api_webhook' | 'manual_unverified',
    createdAt: String(d.created_at),
    verifiedAt: d.verified_at ? String(d.verified_at) : undefined,
  }));

  const verifiedTotals = new Map<string, number>();
  for (const dep of savingsDeposits) {
    if (dep.status === 'confirmed') {
      verifiedTotals.set(dep.goalId, (verifiedTotals.get(dep.goalId) || 0) + dep.amount);
    }
  }

  const savingsGoals = goalsRes.results.map((g) => ({
    id: String(g.id),
    name: String(g.goal_name),
    avatar: String(g.avatar),
    targetAmount: Number(g.target_amount),
    currentAmount: verifiedTotals.get(String(g.id)) || 0,
    startDate: String(g.start_date),
    targetDate: String(g.target_date),
    description: g.description ? String(g.description) : undefined,
    createdAt: String(g.created_at),
  }));

  const transactions = txRes.results.map((t) => ({
    id: String(t.id),
    type: String(t.type) as 'income' | 'expense',
    title: String(t.title),
    amount: Number(t.amount),
    category: String(t.category),
    date: String(t.transaction_date),
    paymentMethod: t.payment_method ? String(t.payment_method) : undefined,
    note: t.note ? String(t.note) : undefined,
    createdAt: String(t.created_at),
  }));

  const plans = plansRes.results.map((p) => ({
    id: String(p.id),
    title: String(p.title),
    type: String(p.type),
    priority: String(p.priority) as 'low' | 'medium' | 'high',
    status: String(p.status) as 'todo' | 'in_progress' | 'done',
    dueDate: String(p.due_date),
    dueTime: p.due_time ? String(p.due_time) : undefined,
    reminderEnabled: Number(p.reminder_enabled) === 1,
    description: p.description ? String(p.description) : undefined,
    createdAt: String(p.created_at),
    completedAt: p.completed_at ? String(p.completed_at) : undefined,
  }));

  const bankAccounts = banksRes.results.map((b) => ({
    id: String(b.id),
    bankShortName: String(b.bank_short_name || ''),
    bankName: String(b.bank_name),
    bin: String(b.bank_code),
    accountNumber: String(b.account_number),
    accountHolder: String(b.account_holder),
    defaultNote: String(b.default_note || 'TIET KIEM MY LIFE'),
    isDefault: Number(b.is_default) === 1,
    webhookVerifyUrl: b.webhook_verify_url ? String(b.webhook_verify_url) : undefined,
  }));

  return {
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      emailVerified: user.email_verified === 1,
      avatar: user.avatar || DEFAULT_PROFILE_AVATAR,
      bio: user.bio || '',
      joinedAt: user.created_at.slice(0, 10),
    },
    databaseState: {
      transactions,
      savingsGoals,
      savingsDeposits,
      plans,
      bankAccounts,
      profile: {
        name: user.full_name,
        email: user.email,
        avatar: user.avatar || DEFAULT_PROFILE_AVATAR,
        joinedAt: user.created_at.slice(0, 10),
        bio: user.bio || '',
        emailVerified: user.email_verified === 1,
      },
      settings: {
        theme: settingsRow?.theme || 'light',
        accentColor: settingsRow?.accent_color || 'sky',
        fontScale: settingsRow?.font_scale || 'md',
        transitionsEnabled: settingsRow ? settingsRow.transitions_enabled === 1 : true,
        glassEffectsEnabled: settingsRow ? settingsRow.glass_effects_enabled === 1 : true,
        currency: settingsRow?.currency || 'VND',
        monthlyBudget: settingsRow ? Number(settingsRow.monthly_budget) : 15_000_000,
        cycleStartDay: settingsRow ? Number(settingsRow.cycle_start_day) : 1,
        categories,
        pinEnabled: false,
        sessionId,
      },
      sampleLoadedOnce: transactions.length > 0 || savingsGoals.length > 0 || plans.length > 0,
    },
  };
}
