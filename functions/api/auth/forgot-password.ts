import {generateRandomToken, generateUuid, sha256Hex} from '../../_lib/crypto';
import {
  checkRateLimit,
  errorResponse,
  getClientIp,
  isValidEmail,
  jsonResponse,
  normalizeEmail,
  parseJsonBody,
} from '../../_lib/security';
import {PagesContext} from '../../_lib/types';

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const hasProvider = Boolean(context.env.RESEND_API_KEY && context.env.RESEND_API_KEY.trim());
  return jsonResponse({ok: true, configured: hasProvider});
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const {request, env} = context;
  const resendKey = env.RESEND_API_KEY?.trim();

  // Strictly block simulated email success when no real email provider is configured
  if (!resendKey) {
    return errorResponse(
      'Chức năng gửi email đặt lại mật khẩu chưa được kích hoạt do máy chủ chưa cấu hình dịch vụ email thực tế (RESEND_API_KEY).',
      503,
      {configured: false},
    );
  }

  const ip = getClientIp(request);
  const rl = await checkRateLimit(env.DB, `forgot:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return errorResponse(
      `Quá nhiều yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau ${rl.retryAfterSec} giây.`,
      429,
    );
  }

  const body = await parseJsonBody<{email?: string}>(request);
  const email = normalizeEmail(body?.email);
  if (!isValidEmail(email)) {
    return errorResponse('Địa chỉ email không hợp lệ.', 400);
  }

  const user = await env.DB.prepare('SELECT id, full_name, email FROM users WHERE email = ? LIMIT 1')
    .bind(email)
    .first<{id: string; full_name: string; email: string}>();

  if (user) {
    const rawToken = generateRandomToken(32);
    const tokenHash = await sha256Hex(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();

    await env.DB.prepare(
      'INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, used_at, created_at) VALUES (?, ?, ?, ?, NULL, ?)',
    )
      .bind(generateUuid(), user.id, tokenHash, expiresAt, now.toISOString())
      .run();

    const origin = (env.APP_URL || new URL(request.url).origin).replace(/\/$/, '');
    const resetLink = `${origin}/?reset_token=${encodeURIComponent(rawToken)}`;
    const fromEmail = env.EMAIL_FROM?.trim() || 'MY LIFE <onboarding@resend.dev>';

    const mailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [user.email],
        subject: 'Đặt lại mật khẩu MY LIFE – Personal Manager',
        html: `<p>Xin chào ${user.full_name},</p><p>Nhấn vào liên kết dưới đây để đặt lại mật khẩu tài khoản MY LIFE (có hiệu lực trong 30 phút):</p><p><a href="${resetLink}">${resetLink}</a></p><p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.</p>`,
      }),
    });

    if (!mailRes.ok) {
      return errorResponse('Không thể gửi email từ dịch vụ thư tín. Vui lòng kiểm tra cấu hình RESEND_API_KEY.', 502);
    }
  }

  return jsonResponse({
    ok: true,
    configured: true,
    message: 'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.',
  });
}
