import {DEFAULT_PROFILE_AVATAR, ensureDefaultUserSettings} from '../../_lib/auth';
import {CURRENT_PASSWORD_ALGORITHM, generateUuid, hashPassword} from '../../_lib/crypto';
import {
  checkRateLimit,
  errorResponse,
  getClientIp,
  isValidEmail,
  jsonResponse,
  normalizeEmail,
  parseJsonBody,
  validatePasswordStrength,
} from '../../_lib/security';
import {PagesContext} from '../../_lib/types';

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const {request, env} = context;
  const ip = getClientIp(request);

  const rl = await checkRateLimit(env.DB, `reg:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) {
    return errorResponse(
      `Bạn thao tác quá nhiều lần. Vui lòng thử lại sau ${rl.retryAfterSec} giây.`,
      429,
    );
  }

  const body = await parseJsonBody<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    acceptedTerms?: boolean;
  }>(request);

  if (!body) {
    return errorResponse('Dữ liệu gửi lên không hợp lệ.', 400);
  }

  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';
  const confirmPassword = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';
  const acceptedTerms = body.acceptedTerms === true;

  if (fullName.length < 2 || fullName.length > 80) {
    return errorResponse('Họ và tên phải từ 2 đến 80 ký tự.', 400, {field: 'fullName'});
  }
  if (!isValidEmail(email)) {
    return errorResponse('Địa chỉ email không đúng định dạng.', 400, {field: 'email'});
  }
  const pwError = validatePasswordStrength(password);
  if (pwError) {
    return errorResponse(pwError, 400, {field: 'password'});
  }
  if (password !== confirmPassword) {
    return errorResponse('Mật khẩu nhập lại không khớp.', 400, {field: 'confirmPassword'});
  }
  if (!acceptedTerms) {
    return errorResponse('Bạn cần đồng ý Điều khoản sử dụng và Chính sách quyền riêng tư.', 400, {
      field: 'acceptedTerms',
    });
  }

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ? LIMIT 1')
    .bind(email)
    .first<{id: string}>();

  if (existing) {
    return errorResponse('Email này đã được đăng ký tài khoản.', 409, {field: 'email'});
  }

  const userId = generateUuid();
  const {hashHex, saltHex} = await hashPassword(password);
  const nowIso = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO users (
      id, full_name, email, password_hash, password_salt, password_algorithm,
      email_verified, avatar, bio, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, '', 'active', ?, ?)`,
  )
    .bind(
      userId,
      fullName,
      email,
      hashHex,
      saltHex,
      CURRENT_PASSWORD_ALGORITHM,
      DEFAULT_PROFILE_AVATAR,
      nowIso,
      nowIso,
    )
    .run();

  await ensureDefaultUserSettings(env.DB, userId);

  return jsonResponse(
    {
      ok: true,
      message: 'Đăng ký tài khoản thành công. Vui lòng đăng nhập để bắt đầu.',
      user: {
        id: userId,
        fullName,
        email,
        emailVerified: false,
      },
    },
    201,
  );
}
