import React, {useEffect, useMemo, useState} from 'react';
import {useApp} from '../../context/AppContext';
import {ApiError, authApi} from '../../services/api';
import {
  CheckIcon,
  CloseIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  ShieldCheckIcon,
} from '../icons/CustomIcons';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

function getPasswordStrength(pw: string): {
  score: number;
  label: string;
  hasLength: boolean;
  hasLower: boolean;
  hasUpper: boolean;
  hasDigit: boolean;
} {
  const hasLength = pw.length >= 8;
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const score = [hasLength, hasLower, hasUpper, hasDigit].filter(Boolean).length;
  const label =
    score <= 1 ? 'Yếu' : score === 2 ? 'Trung bình' : score === 3 ? 'Khá' : 'Mạnh';
  return {score, label, hasLength, hasLower, hasUpper, hasDigit};
}

export const AuthScreen: React.FC = () => {
  const {loginWithEmail, showToast, authNotice, clearAuthNotice} = useApp();

  const initialResetToken = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get('reset_token') || '';
    } catch {
      return '';
    }
  }, []);

  const [mode, setMode] = useState<AuthMode>(initialResetToken ? 'reset' : 'login');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPw, setShowRegPw] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccessBanner, setRegSuccessBanner] = useState('');

  // Forgot & Reset state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotConfigured, setForgotConfigured] = useState<boolean | null>(null);
  const [forgotStatusMsg, setForgotStatusMsg] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const [resetToken, setResetToken] = useState(initialResetToken);
  const [resetPw, setResetPw] = useState('');
  const [resetConfirmPw, setResetConfirmPw] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const strength = useMemo(() => getPasswordStrength(regPassword), [regPassword]);

  useEffect(() => {
    if (mode === 'forgot' && forgotConfigured === null) {
      authApi
        .forgotPasswordStatus()
        .then((res) => setForgotConfigured(res.configured))
        .catch(() => setForgotConfigured(false));
    }
  }, [mode, forgotConfigured]);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setLoginError('');
    setRegErrors({});
    setForgotError('');
    setForgotStatusMsg('');
    setResetError('');
    if (next !== 'login') setRegSuccessBanner('');
    clearAuthNotice();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setRegSuccessBanner('');
    clearAuthNotice();

    const email = loginEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setLoginError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    if (!loginPassword) {
      setLoginError('Vui lòng nhập mật khẩu.');
      return;
    }

    setLoginLoading(true);
    try {
      await loginWithEmail(email, loginPassword, rememberMe);
    } catch (err) {
      setLoginError(
        err instanceof Error ? err.message : 'Email hoặc mật khẩu không chính xác.',
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const nameTrimmed = fullName.trim();
    const emailTrimmed = regEmail.trim().toLowerCase();

    if (nameTrimmed.length < 2) {
      errs.fullName = 'Họ và tên phải có ít nhất 2 ký tự.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailTrimmed)) {
      errs.email = 'Địa chỉ email không đúng định dạng.';
    }
    if (strength.score < 4) {
      errs.password = 'Mật khẩu cần tối thiểu 8 ký tự gồm chữ hoa, chữ thường và chữ số.';
    }
    if (regConfirmPassword !== regPassword) {
      errs.confirmPassword = 'Mật khẩu nhập lại không khớp.';
    }
    if (!acceptedTerms) {
      errs.acceptedTerms = 'Vui lòng đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư.';
    }

    setRegErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setRegLoading(true);
    try {
      await authApi.register({
        fullName: nameTrimmed,
        email: emailTrimmed,
        password: regPassword,
        confirmPassword: regConfirmPassword,
        acceptedTerms,
      });
      setLoginEmail(emailTrimmed);
      setLoginPassword('');
      setFullName('');
      setRegEmail('');
      setRegPassword('');
      setRegConfirmPassword('');
      setAcceptedTerms(false);
      setRegSuccessBanner('Tạo tài khoản thành công. Vui lòng đăng nhập để bắt đầu.');
      setMode('login');
      showToast({
        type: 'success',
        title: 'Đăng ký thành công',
        description: 'Bạn có thể đăng nhập vào tài khoản vừa tạo.',
      });
    } catch (err) {
      if (err instanceof ApiError && err.field) {
        setRegErrors({[err.field]: err.message});
      } else {
        setRegErrors({
          form: err instanceof Error ? err.message : 'Không thể tạo tài khoản. Vui lòng thử lại.',
        });
      }
    } finally {
      setRegLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotStatusMsg('');

    const email = forgotEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setForgotError('Vui lòng nhập email hợp lệ.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await authApi.forgotPassword(email);
      setForgotStatusMsg(res.message);
    } catch (err) {
      setForgotError(
        err instanceof Error ? err.message : 'Không thể gửi yêu cầu đặt lại mật khẩu.',
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    const pwCheck = getPasswordStrength(resetPw);
    if (pwCheck.score < 4) {
      setResetError('Mật khẩu mới cần tối thiểu 8 ký tự gồm chữ hoa, chữ thường và chữ số.');
      return;
    }
    if (resetPw !== resetConfirmPw) {
      setResetError('Mật khẩu nhập lại không khớp.');
      return;
    }

    setResetLoading(true);
    try {
      const res = await authApi.resetPassword({
        token: resetToken,
        newPassword: resetPw,
        confirmPassword: resetConfirmPw,
      });
      window.history.replaceState({}, '', window.location.pathname);
      setResetToken('');
      setRegSuccessBanner(res.message);
      setMode('login');
      showToast({type: 'success', title: 'Đặt lại mật khẩu thành công'});
    } catch (err) {
      setResetError(
        err instanceof Error ? err.message : 'Không thể đặt lại mật khẩu.',
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--bg-canvas)] flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-[430px] space-y-5">
        {/* Minimalist Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] mx-auto">
            <ShieldCheckIcon className="w-6 h-6" />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            MY LIFE
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            Không gian quản lý tài chính, tiết kiệm VietQR & kế hoạch cá nhân độc lập
          </p>
        </div>

        {/* Auth Card */}
        <div className="glass-surface rounded-2xl p-5 sm:p-7 shadow-[var(--shadow-float)]">
          {(mode === 'login' || mode === 'register') && (
            <div className="grid grid-cols-2 p-1 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] mb-5">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors btn-press ${
                  mode === 'login'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-surface)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors btn-press ${
                  mode === 'register'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-surface)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Đăng ký
              </button>
            </div>
          )}

          {authNotice && (
            <div className="mb-4 rounded-xl border border-[var(--warning)]/35 bg-[var(--warning-soft)] px-3.5 py-2.5 text-xs text-[var(--text-primary)]">
              {authNotice}
            </div>
          )}

          {regSuccessBanner && mode === 'login' && (
            <div className="mb-4 rounded-xl border border-[var(--success)]/35 bg-[var(--success-soft)] px-3.5 py-2.5 text-xs text-[var(--success)] font-medium">
              {regSuccessBanner}
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={loginEmail}
                  onChange={(e) => {
                    setLoginEmail(e.target.value);
                    setLoginError('');
                  }}
                  placeholder="ten@example.com"
                  className="w-full min-h-[44px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    Mật khẩu
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(loginEmail);
                      switchMode('forgot');
                    }}
                    className="text-xs font-medium text-[var(--accent)] hover:underline"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showLoginPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      setLoginError('');
                    }}
                    placeholder="••••••••"
                    className="w-full min-h-[44px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] pl-3.5 pr-11 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    type="button"
                    aria-label={showLoginPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    onClick={() => setShowLoginPw((v) => !v)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {showLoginPw ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--accent)]"
                />
                <span>Ghi nhớ phiên đăng nhập trên thiết bị này</span>
              </label>

              {loginError && (
                <p className="text-xs font-medium text-[var(--danger)]">{loginError}</p>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="btn-press w-full min-h-[46px] rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-semibold hover:opacity-95 disabled:opacity-50"
              >
                {loginLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5" noValidate>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Họ và tên
                </label>
                <input
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setRegErrors((prev) => ({...prev, fullName: '', form: ''}));
                  }}
                  placeholder="Nguyễn Minh Anh"
                  className="w-full min-h-[42px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                {regErrors.fullName && (
                  <p className="mt-1 text-[11px] text-[var(--danger)]">{regErrors.fullName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={regEmail}
                  onChange={(e) => {
                    setRegEmail(e.target.value);
                    setRegErrors((prev) => ({...prev, email: '', form: ''}));
                  }}
                  placeholder="ten@example.com"
                  className="w-full min-h-[42px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                {regErrors.email && (
                  <p className="mt-1 text-[11px] text-[var(--danger)]">{regErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    type={showRegPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={regPassword}
                    onChange={(e) => {
                      setRegPassword(e.target.value);
                      setRegErrors((prev) => ({...prev, password: '', form: ''}));
                    }}
                    placeholder="Tối thiểu 8 ký tự"
                    className="w-full min-h-[42px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] pl-3.5 pr-11 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    type="button"
                    aria-label={showRegPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    onClick={() => setShowRegPw((v) => !v)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    {showRegPw ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>

                {regPassword.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex-1 flex gap-1 mr-3">
                        {[1, 2, 3, 4].map((step) => (
                          <span
                            key={step}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              strength.score >= step
                                ? strength.score >= 4
                                  ? 'bg-[var(--success)]'
                                  : strength.score >= 3
                                    ? 'bg-[var(--accent)]'
                                    : 'bg-[var(--warning)]'
                                : 'bg-[var(--bg-surface-alt)]'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-medium text-[var(--text-muted)]">{strength.label}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-[var(--text-muted)]">
                      <span className={strength.hasLength ? 'text-[var(--success)]' : ''}>
                        {strength.hasLength ? '✓' : '·'} 8+ ký tự
                      </span>
                      <span className={strength.hasUpper ? 'text-[var(--success)]' : ''}>
                        {strength.hasUpper ? '✓' : '·'} Chữ hoa
                      </span>
                      <span className={strength.hasLower ? 'text-[var(--success)]' : ''}>
                        {strength.hasLower ? '✓' : '·'} Chữ thường
                      </span>
                      <span className={strength.hasDigit ? 'text-[var(--success)]' : ''}>
                        {strength.hasDigit ? '✓' : '·'} Chữ số
                      </span>
                    </div>
                  </div>
                )}

                {regErrors.password && (
                  <p className="mt-1 text-[11px] text-[var(--danger)]">{regErrors.password}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Nhập lại mật khẩu
                </label>
                <input
                  type={showRegPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={regConfirmPassword}
                  onChange={(e) => {
                    setRegConfirmPassword(e.target.value);
                    setRegErrors((prev) => ({...prev, confirmPassword: '', form: ''}));
                  }}
                  placeholder="Nhập lại mật khẩu"
                  className="w-full min-h-[42px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
                {regErrors.confirmPassword && (
                  <p className="mt-1 text-[11px] text-[var(--danger)]">{regErrors.confirmPassword}</p>
                )}
              </div>

              <div>
                <label className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => {
                      setAcceptedTerms(e.target.checked);
                      setRegErrors((prev) => ({...prev, acceptedTerms: '', form: ''}));
                    }}
                    className="w-4 h-4 mt-0.5 rounded accent-[var(--accent)] shrink-0"
                  />
                  <span>
                    Tôi đồng ý với{' '}
                    <button
                      type="button"
                      onClick={() => setShowPolicyModal(true)}
                      className="text-[var(--accent)] font-medium hover:underline"
                    >
                      Điều khoản sử dụng & Chính sách quyền riêng tư
                    </button>
                  </span>
                </label>
                {regErrors.acceptedTerms && (
                  <p className="mt-1 text-[11px] text-[var(--danger)]">{regErrors.acceptedTerms}</p>
                )}
              </div>

              {regErrors.form && (
                <p className="text-xs font-medium text-[var(--danger)]">{regErrors.form}</p>
              )}

              <button
                type="submit"
                disabled={regLoading}
                className="btn-press w-full min-h-[46px] rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-semibold hover:opacity-95 disabled:opacity-50"
              >
                {regLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold font-display text-[var(--text-primary)]">
                  Khôi phục mật khẩu
                </h2>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-xs font-medium text-[var(--accent)] hover:underline"
                >
                  Quay lại đăng nhập
                </button>
              </div>

              {forgotConfigured === false && (
                <div className="rounded-xl border border-[var(--warning)]/35 bg-[var(--warning-soft)] p-3.5 text-xs text-[var(--text-primary)] leading-relaxed">
                  Máy chủ chưa cấu hình dịch vụ gửi email thực tế (<code className="font-mono-tabular">RESEND_API_KEY</code>). Tính năng gửi email đặt lại mật khẩu chỉ hoạt động sau khi bạn thêm khóa API email vào Variables and Secrets trên Cloudflare Pages.
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Email đã đăng ký
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => {
                    setForgotEmail(e.target.value);
                    setForgotError('');
                  }}
                  placeholder="ten@example.com"
                  className="w-full min-h-[44px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              {forgotError && <p className="text-xs text-[var(--danger)]">{forgotError}</p>}
              {forgotStatusMsg && (
                <p className="text-xs font-medium text-[var(--success)]">{forgotStatusMsg}</p>
              )}

              <button
                type="submit"
                disabled={forgotLoading || forgotConfigured === false}
                className="btn-press w-full min-h-[44px] rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-semibold disabled:opacity-45"
              >
                {forgotLoading ? 'Đang gửi yêu cầu...' : 'Gửi liên kết đặt lại mật khẩu'}
              </button>
            </form>
          )}

          {/* RESET PASSWORD (FROM EMAIL LINK TOKEN) */}
          {mode === 'reset' && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold font-display text-[var(--text-primary)]">
                  Đặt lại mật khẩu mới
                </h2>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-xs font-medium text-[var(--accent)] hover:underline"
                >
                  Đăng nhập
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  required
                  value={resetPw}
                  onChange={(e) => setResetPw(e.target.value)}
                  placeholder="Tối thiểu 8 ký tự (hoa, thường, số)"
                  className="w-full min-h-[42px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3.5 text-sm text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Nhập lại mật khẩu mới
                </label>
                <input
                  type="password"
                  required
                  value={resetConfirmPw}
                  onChange={(e) => setResetConfirmPw(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3.5 text-sm text-[var(--text-primary)]"
                />
              </div>

              {resetError && <p className="text-xs text-[var(--danger)]">{resetError}</p>}

              <button
                type="submit"
                disabled={resetLoading}
                className="btn-press w-full min-h-[44px] rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-semibold disabled:opacity-50"
              >
                {resetLoading ? 'Đang cập nhật...' : 'Xác nhận đặt lại mật khẩu'}
              </button>
            </form>
          )}
        </div>

        {/* Security Assurance Footnote */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-[var(--text-muted)]">
          <LockIcon className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>Xác thực phiên bằng cookie HttpOnly & dữ liệu tách biệt theo từng tài khoản</span>
        </div>
      </div>

      {/* Terms & Privacy Policy Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <div className="glass-surface modal-enter w-full max-w-md rounded-2xl p-6 shadow-[var(--shadow-float)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold font-display text-[var(--text-primary)]">
                Điều khoản & Quyền riêng tư
              </h3>
              <button
                type="button"
                onClick={() => setShowPolicyModal(false)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-surface-alt)]"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs text-[var(--text-secondary)] leading-relaxed">
              <p>
                <strong className="text-[var(--text-primary)]">1. Tách biệt dữ liệu:</strong> Mọi giao dịch thu chi, mục tiêu tiết kiệm, tài khoản VietQR và kế hoạch được gắn riêng với mã định danh tài khoản của bạn trên cơ sở dữ liệu máy chủ.
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">2. Bảo mật mật khẩu:</strong> Mật khẩu được băm bằng thuật toán PBKDF2-HMAC-SHA-256 kèm salt ngẫu nhiên riêng trước khi lưu; ứng dụng không lưu mật khẩu dạng chữ rõ.
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">3. Quyền kiểm soát & xóa dữ liệu:</strong> Bạn có thể xuất toàn bộ dữ liệu cá nhân dạng JSON/CSV hoặc yêu cầu xóa vĩnh viễn tài khoản cùng toàn bộ dữ liệu liên quan bất kỳ lúc nào trong phần Cài đặt.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setAcceptedTerms(true);
                setRegErrors((prev) => ({...prev, acceptedTerms: ''}));
                setShowPolicyModal(false);
              }}
              className="btn-press w-full min-h-[42px] rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <CheckIcon className="w-4 h-4" />
              <span>Tôi đã đọc và đồng ý</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
