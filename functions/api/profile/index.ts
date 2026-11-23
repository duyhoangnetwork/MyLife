import {authenticateRequest, ensureDefaultUserSettings} from '../../_lib/auth';
import {
  errorResponse,
  isSafeImageUrl,
  isValidEmail,
  jsonResponse,
  normalizeEmail,
  parseJsonBody,
} from '../../_lib/security';
import {PagesContext} from '../../_lib/types';

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Chưa đăng nhập hoặc phiên đã hết hạn.', 401);

  await ensureDefaultUserSettings(context.env.DB, auth.user.id);
  const settings = await context.env.DB.prepare('SELECT * FROM user_settings WHERE user_id = ?')
    .bind(auth.user.id)
    .first<Record<string, unknown>>();

  return jsonResponse({
    ok: true,
    profile: auth.user,
    settings,
  });
}

export async function onRequestPatch(context: PagesContext): Promise<Response> {
  const auth = await authenticateRequest(context.env.DB, context.request);
  if (!auth) return errorResponse('Chưa đăng nhập hoặc phiên đã hết hạn.', 401);

  const body = await parseJsonBody<{
    profile?: {
      name?: string;
      email?: string;
      bio?: string;
      avatar?: string;
    };
    settings?: {
      theme?: string;
      accentColor?: string;
      fontScale?: string;
      transitionsEnabled?: boolean;
      glassEffectsEnabled?: boolean;
      currency?: string;
      monthlyBudget?: number;
      cycleStartDay?: number;
      categories?: {income?: string[]; expense?: string[]};
    };
  }>(context.request);

  if (!body) return errorResponse('Dữ liệu cập nhật không hợp lệ.', 400);

  const nowIso = new Date().toISOString();

  if (body.profile) {
    const nextName =
      typeof body.profile.name === 'string' && body.profile.name.trim()
        ? body.profile.name.trim().slice(0, 80)
        : auth.user.fullName;

    let nextEmail = auth.user.email;
    let emailVerifiedReset = false;
    if (typeof body.profile.email === 'string') {
      const candidate = normalizeEmail(body.profile.email);
      if (!isValidEmail(candidate)) {
        return errorResponse('Địa chỉ email không đúng định dạng.', 400);
      }
      if (candidate !== auth.user.email) {
        const dup = await context.env.DB.prepare(
          'SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1',
        )
          .bind(candidate, auth.user.id)
          .first<{id: string}>();
        if (dup) {
          return errorResponse('Email này đã được sử dụng bởi tài khoản khác.', 409);
        }
        nextEmail = candidate;
        emailVerifiedReset = true;
      }
    }

    const nextBio =
      typeof body.profile.bio === 'string' ? body.profile.bio.trim().slice(0, 300) : auth.user.bio;
    const nextAvatar =
      body.profile.avatar !== undefined && isSafeImageUrl(body.profile.avatar)
        ? String(body.profile.avatar).trim()
        : auth.user.avatar;

    await context.env.DB.prepare(
      `UPDATE users
       SET full_name = ?, email = ?, bio = ?, avatar = ?,
           email_verified = CASE WHEN ? = 1 THEN 0 ELSE email_verified END,
           updated_at = ?
       WHERE id = ?`,
    )
      .bind(nextName, nextEmail, nextBio, nextAvatar, emailVerifiedReset ? 1 : 0, nowIso, auth.user.id)
      .run();
  }

  if (body.settings) {
    await ensureDefaultUserSettings(context.env.DB, auth.user.id);
    const current = await context.env.DB.prepare('SELECT * FROM user_settings WHERE user_id = ?')
      .bind(auth.user.id)
      .first<Record<string, unknown>>();

    const s = body.settings;
    const theme =
      s.theme === 'light' || s.theme === 'dark' || s.theme === 'glass'
        ? s.theme
        : String(current?.theme || 'light');
    const accentColor =
      s.accentColor === 'sky' ||
      s.accentColor === 'emerald' ||
      s.accentColor === 'indigo' ||
      s.accentColor === 'amber' ||
      s.accentColor === 'rose'
        ? s.accentColor
        : String(current?.accent_color || 'sky');
    const fontScale =
      s.fontScale === 'sm' || s.fontScale === 'md' || s.fontScale === 'lg'
        ? s.fontScale
        : String(current?.font_scale || 'md');
    const transitionsEnabled =
      typeof s.transitionsEnabled === 'boolean'
        ? s.transitionsEnabled
        : Number(current?.transitions_enabled ?? 1) === 1;
    const glassEffectsEnabled =
      typeof s.glassEffectsEnabled === 'boolean'
        ? s.glassEffectsEnabled
        : Number(current?.glass_effects_enabled ?? 1) === 1;
    const currency =
      s.currency === 'VND' || s.currency === 'USD' || s.currency === 'EUR'
        ? s.currency
        : String(current?.currency || 'VND');
    const monthlyBudget =
      s.monthlyBudget !== undefined && Number.isFinite(Number(s.monthlyBudget))
        ? Math.max(0, Number(s.monthlyBudget))
        : Number(current?.monthly_budget ?? 15_000_000);
    const cycleStartDay =
      s.cycleStartDay !== undefined && Number.isFinite(Number(s.cycleStartDay))
        ? Math.max(1, Math.min(28, Math.round(Number(s.cycleStartDay))))
        : Number(current?.cycle_start_day ?? 1);
    const categoriesJson =
      s.categories &&
      Array.isArray(s.categories.income) &&
      Array.isArray(s.categories.expense)
        ? JSON.stringify({
            income: s.categories.income.map((c) => String(c).trim()).filter(Boolean).slice(0, 40),
            expense: s.categories.expense.map((c) => String(c).trim()).filter(Boolean).slice(0, 40),
          })
        : String(current?.categories_json || '{}');

    await context.env.DB.prepare(
      `UPDATE user_settings
       SET theme = ?, accent_color = ?, font_scale = ?, transitions_enabled = ?,
           glass_effects_enabled = ?, currency = ?, monthly_budget = ?,
           cycle_start_day = ?, categories_json = ?, updated_at = ?
       WHERE user_id = ?`,
    )
      .bind(
        theme,
        accentColor,
        fontScale,
        transitionsEnabled ? 1 : 0,
        glassEffectsEnabled ? 1 : 0,
        currency,
        monthlyBudget,
        cycleStartDay,
        categoriesJson,
        nowIso,
        auth.user.id,
      )
      .run();
  }

  return jsonResponse({ok: true});
}
