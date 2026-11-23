import React, {useState} from 'react';
import {PWAInstallButton} from '../components/common/PWAWidgets';
import {ChevronRightIcon, EditIcon, LockIcon, LogoutIcon, SettingsIcon} from '../components/icons/CustomIcons';
import {useApp} from '../context/AppContext';
import {formatMoney, formatShortDate} from '../utils/formatters';

export const ProfilePage: React.FC = () => {
  const {state, authUser, summary, updateProfile, setActiveTab, lockApp, logoutAccount} = useApp();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(state.profile.name);
  const [email, setEmail] = useState(state.profile.email);
  const [bio, setBio] = useState(state.profile.bio || '');
  const [avatar, setAvatar] = useState(state.profile.avatar);

  const completedGoals = state.savingsGoals.filter((g) => g.currentAmount >= g.targetAmount).length;
  const completedPlans = state.plans.filter((p) => p.status === 'done').length;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setAvatar(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateProfile({
      name: name.trim(),
      email: email.trim(),
      bio: bio.trim(),
      avatar,
    });
    setEditing(false);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold font-display text-[var(--text-primary)]">Hồ sơ cá nhân</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Thông tin tài khoản và các tùy chọn hệ thống
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setName(state.profile.name);
            setEmail(state.profile.email);
            setBio(state.profile.bio || '');
            setAvatar(state.profile.avatar);
            setEditing((v) => !v);
          }}
          className="min-h-[40px] px-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-xs font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 btn-press"
        >
          <EditIcon className="w-3.5 h-3.5" />
          <span>{editing ? 'Đóng' : 'Chỉnh sửa'}</span>
        </button>
      </div>

      {/* Apple-Style Account Header */}
      <section className="app-surface rounded-2xl overflow-hidden">
        <div className="p-5 sm:p-6">
          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <img
                  src={avatar}
                  alt={name}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-full object-cover border border-[var(--border-hairline)]"
                />
                <label className="min-h-[38px] px-3.5 py-2 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] text-xs font-semibold text-[var(--text-primary)] inline-flex items-center justify-center cursor-pointer w-fit btn-press">
                  <span>Đổi ảnh đại diện</span>
                  <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Tên hiển thị</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full min-h-[42px] rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] px-3.5 text-sm text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full min-h-[42px] rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] px-3.5 text-sm text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Giới thiệu ngắn</label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] p-3 text-sm text-[var(--text-primary)]"
                />
              </div>

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="min-h-[40px] px-4 rounded-xl bg-[var(--bg-surface-alt)] text-xs font-medium text-[var(--text-secondary)] btn-press"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="min-h-[40px] px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-semibold btn-press"
                >
                  Lưu hồ sơ
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-center gap-4">
              <img
                src={state.profile.avatar}
                alt={state.profile.name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-full object-cover border border-[var(--border-hairline)] shrink-0"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold font-display text-[var(--text-primary)] truncate">
                    {state.profile.name}
                  </h2>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                      authUser?.emailVerified
                        ? 'bg-[var(--success-soft)] text-[var(--success)]'
                        : 'bg-[var(--bg-surface-alt)] text-[var(--text-muted)]'
                    }`}
                  >
                    {authUser?.emailVerified ? 'Email đã xác thực' : 'Email chưa xác thực'}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                  {state.profile.email} · Tạo tài khoản {formatShortDate(state.profile.joinedAt)}
                </p>
                {state.profile.bio && (
                  <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{state.profile.bio}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Integrated 4-Column Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 divide-x divide-[var(--border-hairline)] border-t border-[var(--border-hairline)]">
          <div className="p-4">
            <span className="text-[11px] text-[var(--text-muted)]">Mục tiêu đạt</span>
            <p className="mt-0.5 text-base font-semibold font-mono-tabular text-[var(--success)]">{completedGoals}</p>
          </div>
          <div className="p-4">
            <span className="text-[11px] text-[var(--text-muted)]">Giao dịch</span>
            <p className="mt-0.5 text-base font-semibold font-mono-tabular text-[var(--text-primary)]">
              {state.transactions.length}
            </p>
          </div>
          <div className="p-4">
            <span className="text-[11px] text-[var(--text-muted)]">Kế hoạch xong</span>
            <p className="mt-0.5 text-base font-semibold font-mono-tabular text-[var(--accent)]">{completedPlans}</p>
          </div>
          <div className="p-4">
            <span className="text-[11px] text-[var(--text-muted)]">Tổng tài sản</span>
            <p className="mt-0.5 text-base font-semibold font-mono-tabular text-[var(--text-primary)] truncate">
              {formatMoney(summary.totalAssets, state.settings.currency)}
            </p>
          </div>
        </div>
      </section>

      {/* iOS Grouped Action Rows */}
      <div className="space-y-1.5">
        <p className="px-2 text-xs font-medium text-[var(--text-muted)]">Hệ thống</p>
        <div className="app-surface rounded-2xl divide-y divide-[var(--border-hairline)] overflow-hidden">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-[var(--bg-surface-alt)]/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-8 h-8 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0">
                <SettingsIcon className="w-[18px] h-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">Cài đặt ứng dụng</p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  Giao diện, tài khoản VietQR, ngân sách & sao lưu dữ liệu
                </p>
              </div>
            </div>
            <ChevronRightIcon className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          </button>

          {state.settings.pinEnabled && (
            <button
              type="button"
              onClick={lockApp}
              className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-[var(--bg-surface-alt)]/50 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-[var(--warning-soft)] text-[var(--warning)] flex items-center justify-center shrink-0">
                  <LockIcon className="w-[18px] h-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">Khóa ứng dụng ngay</p>
                  <p className="text-xs text-[var(--text-muted)]">Yêu cầu nhập mã PIN để tiếp tục</p>
                </div>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
            </button>
          )}

          <div className="px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Cài đặt PWA trên thiết bị</p>
              <p className="text-xs text-[var(--text-muted)]">Mở trực tiếp từ màn hình chính, hỗ trợ ngoại tuyến</p>
            </div>
            <PWAInstallButton compact />
          </div>

          <button
            type="button"
            onClick={logoutAccount}
            className="w-full px-4 py-3.5 flex items-center justify-between gap-3 hover:bg-[var(--danger-soft)]/50 transition-colors text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-8 h-8 rounded-lg bg-[var(--danger-soft)] text-[var(--danger)] flex items-center justify-center shrink-0">
                <LogoutIcon className="w-[18px] h-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--danger)]">Đăng xuất tài khoản</p>
                <p className="text-xs text-[var(--text-muted)]">Đóng phiên đăng nhập hiện tại trên trình duyệt này</p>
              </div>
            </div>
            <ChevronRightIcon className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
