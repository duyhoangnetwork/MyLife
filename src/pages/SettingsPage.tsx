import React, {useCallback, useEffect, useState} from 'react';
import {ConfirmModal} from '../components/common/Feedback';
import {PWAInstallButton} from '../components/common/PWAWidgets';
import {
  BankIcon,
  CheckIcon,
  DeviceIcon,
  EditIcon,
  KeyIcon,
  LockIcon,
  LogoutIcon,
  PlusIcon,
  TrashIcon,
} from '../components/icons/CustomIcons';
import {useApp} from '../context/AppContext';
import {profileApi} from '../services/api';
import {
  AccentColorId,
  ActiveSessionInfo,
  AppDatabaseState,
  BankAccount,
  CurrencyCode,
  FontScaleId,
  ThemeMode,
} from '../types/app';
import {ACCENT_PALETTES, downloadCsv, downloadJson, formatShortDate, getTodayIso} from '../utils/formatters';
import {VIETNAM_BANKS} from '../utils/vietqr';

export const SettingsPage: React.FC = () => {
  const {
    state,
    authUser,
    updateSettings,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    setDefaultBankAccount,
    loadSampleData,
    restoreFromJson,
    wipeAllData,
    setPinCode,
    disablePinCode,
    rotateSession,
    lockApp,
    logoutAccount,
    fetchActiveSessions,
    revokeSession,
    changeAccountPassword,
    deleteAccountPermanently,
    showToast,
  } = useApp();

  const [bankFormOpen, setBankFormOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [bankBin, setBankBin] = useState(VIETNAM_BANKS[0].bin);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [defaultNote, setDefaultNote] = useState('TIET KIEM MY LIFE');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [deleteBankId, setDeleteBankId] = useState<string | null>(null);

  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'expense' | 'income'>('expense');

  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [wipeConfirmOpen, setWipeConfirmOpen] = useState(false);

  // Account security & session management state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  const [sessions, setSessions] = useState<ActiveSessionInfo[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [deleteAccountPhrase, setDeleteAccountPhrase] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const list = await fetchActiveSessions();
      setSessions(list);
    } catch {
      // Handled gracefully
    } finally {
      setLoadingSessions(false);
    }
  }, [fetchActiveSessions]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const openBankEditor = (bank?: BankAccount) => {
    if (bank) {
      setEditingBank(bank);
      setBankBin(bank.bin);
      setAccountNumber(bank.accountNumber);
      setAccountHolder(bank.accountHolder);
      setDefaultNote(bank.defaultNote);
      setWebhookUrl(bank.webhookVerifyUrl || '');
    } else {
      setEditingBank(null);
      setBankBin(VIETNAM_BANKS[0].bin);
      setAccountNumber('');
      setAccountHolder('');
      setDefaultNote('TIET KIEM MY LIFE');
      setWebhookUrl('');
    }
    setBankFormOpen(true);
  };

  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    const info = VIETNAM_BANKS.find((b) => b.bin === bankBin) || VIETNAM_BANKS[0];
    if (!accountNumber.trim() || !accountHolder.trim()) {
      showToast({type: 'error', title: 'Vui lòng nhập đầy đủ số tài khoản và tên chủ tài khoản'});
      return;
    }
    const payload = {
      bankShortName: info.shortName,
      bankName: info.name,
      bin: info.bin,
      accountNumber: accountNumber.trim(),
      accountHolder: accountHolder.trim().toUpperCase(),
      defaultNote: defaultNote.trim() || 'TIET KIEM',
      webhookVerifyUrl: webhookUrl.trim() || undefined,
      isDefault: editingBank ? editingBank.isDefault : state.bankAccounts.length === 0,
    };
    if (editingBank) updateBankAccount(editingBank.id, payload);
    else addBankAccount(payload);
    setBankFormOpen(false);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    const list = state.settings.categories[newCatType];
    if (list.includes(trimmed)) {
      showToast({type: 'warning', title: 'Danh mục này đã tồn tại'});
      return;
    }
    updateSettings({
      categories: {
        ...state.settings.categories,
        [newCatType]: [...list, trimmed],
      },
    });
    setNewCatName('');
    showToast({type: 'success', title: `Đã thêm danh mục "${trimmed}"`});
  };

  const handleRemoveCategory = (kind: 'expense' | 'income', cat: string) => {
    if (state.settings.categories[kind].length <= 1) {
      showToast({type: 'warning', title: 'Cần giữ lại ít nhất 1 danh mục'});
      return;
    }
    updateSettings({
      categories: {
        ...state.settings.categories,
        [kind]: state.settings.categories[kind].filter((c) => c !== cat),
      },
    });
  };

  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppDatabaseState;
        restoreFromJson(parsed);
      } catch {
        showToast({type: 'error', title: 'Không thể đọc tệp JSON sao lưu'});
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.length < 4 || pinInput.length > 8) {
      showToast({type: 'error', title: 'Mã PIN phải từ 4 đến 8 chữ số'});
      return;
    }
    if (pinInput !== pinConfirm) {
      showToast({type: 'error', title: 'Xác nhận mã PIN không khớp'});
      return;
    }
    await setPinCode(pinInput);
    setPinInput('');
    setPinConfirm('');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      showToast({type: 'error', title: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới'});
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast({type: 'error', title: 'Mật khẩu mới nhập lại không khớp'});
      return;
    }
    setChangingPw(true);
    try {
      await changeAccountPassword({
        currentPassword,
        newPassword,
        confirmPassword: confirmNewPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      await loadSessions();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Không thể đổi mật khẩu',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setChangingPw(false);
    }
  };

  const handleServerExport = async () => {
    try {
      const exported = await profileApi.exportData();
      downloadJson(`MYLIFE_Account_Export_${getTodayIso()}.json`, exported);
      showToast({type: 'success', title: 'Đã xuất dữ liệu cá nhân từ máy chủ'});
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Không thể xuất dữ liệu',
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeletingAccount(true);
    try {
      await deleteAccountPermanently({
        password: deleteAccountPassword,
        confirmPhrase: deleteAccountPhrase.trim(),
      });
      setDeleteAccountModalOpen(false);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Không thể xóa tài khoản',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold font-display text-[var(--text-primary)]">Cài đặt</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Tùy chỉnh giao diện, tài khoản VietQR, ngân sách, sao lưu & bảo mật
          </p>
        </div>
        <PWAInstallButton compact />
      </div>

      {/* GROUP 1: APPEARANCE WITH VISUAL PREVIEWS */}
      <div className="space-y-2">
        <h2 className="px-2 text-xs font-medium text-[var(--text-muted)]">Giao diện</h2>
        <div className="app-surface rounded-2xl overflow-hidden divide-y divide-[var(--border-hairline)]">
          <div className="p-4 sm:p-5 space-y-3">
            <span className="text-sm font-medium text-[var(--text-primary)] block">Chế độ hiển thị</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'light' as ThemeMode,
                  title: 'Light Mode',
                  desc: 'Sáng dịu, mặc định',
                  canvas: '#F5F6F8',
                  card: '#FFFFFF',
                  accent: '#2563EB',
                  line: '#E7E9EE',
                },
                {
                  id: 'dark' as ThemeMode,
                  title: 'Dark Mode',
                  desc: 'Tối dịu mắt',
                  canvas: '#101318',
                  card: '#191E27',
                  accent: '#4F8BFF',
                  line: 'rgba(255,255,255,0.1)',
                },
                {
                  id: 'glass' as ThemeMode,
                  title: 'Liquid Glass',
                  desc: 'Kính mờ tinh tế',
                  canvas: '#EAEFF6',
                  card: 'rgba(255,255,255,0.72)',
                  accent: '#2563EB',
                  line: 'rgba(255,255,255,0.85)',
                },
              ].map((m) => {
                const active = state.settings.theme === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => updateSettings({theme: m.id})}
                    className={`rounded-xl border p-2.5 text-left transition-all btn-press ${
                      active
                        ? 'border-[var(--accent)] ring-1 ring-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border-hairline)] hover:bg-[var(--bg-surface-alt)]/50'
                    }`}
                  >
                    {/* Live Mini Preview */}
                    <div
                      className="h-14 rounded-lg p-2 flex flex-col justify-between border mb-2"
                      style={{backgroundColor: m.canvas, borderColor: m.line}}
                    >
                      <div className="flex items-center justify-between">
                        <span className="w-8 h-1.5 rounded-full" style={{backgroundColor: m.accent}} />
                        <span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: m.card, border: `1px solid ${m.line}`}} />
                      </div>
                      <div
                        className="h-6 rounded-md px-2 flex items-center justify-between border"
                        style={{backgroundColor: m.card, borderColor: m.line}}
                      >
                        <span className="w-10 h-1.5 rounded-full opacity-40 bg-current" />
                        <span className="w-4 h-1.5 rounded-full" style={{backgroundColor: m.accent}} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">{m.title}</span>
                      {active && <CheckIcon className="w-3.5 h-3.5 text-[var(--accent)]" />}
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)]">{m.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium text-[var(--text-primary)]">Màu nhấn</span>
            <div className="flex items-center gap-2">
              {(Object.keys(ACCENT_PALETTES) as AccentColorId[]).map((key) => {
                const p = ACCENT_PALETTES[key];
                const active = state.settings.accentColor === key;
                const swatch = state.settings.theme === 'dark' ? p.dark : p.light;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-label={p.label}
                    title={p.label}
                    onClick={() => updateSettings({accentColor: key})}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform btn-press ${
                      active ? 'ring-2 ring-offset-2 ring-[var(--accent)] ring-offset-[var(--bg-surface)] scale-105' : ''
                    }`}
                    style={{backgroundColor: swatch}}
                  >
                    {active && <CheckIcon className="w-3.5 h-3.5 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-[var(--text-primary)]">Cỡ chữ</span>
            <select
              value={state.settings.fontScale}
              onChange={(e) => updateSettings({fontScale: e.target.value as FontScaleId})}
              className="min-h-[36px] rounded-lg bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] px-3 text-xs font-medium text-[var(--text-primary)]"
            >
              <option value="sm">Nhỏ gọn</option>
              <option value="md">Tiêu chuẩn</option>
              <option value="lg">Lớn dễ đọc</option>
            </select>
          </div>

          <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Hiệu ứng chuyển trang</p>
              <p className="text-xs text-[var(--text-muted)]">Chuyển tab và mở hộp thoại mềm mại</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={state.settings.transitionsEnabled}
              data-checked={state.settings.transitionsEnabled}
              onClick={() => updateSettings({transitionsEnabled: !state.settings.transitionsEnabled})}
              className="ios-toggle"
            >
              <span className="ios-toggle-thumb" />
            </button>
          </div>

          <div className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Hiệu ứng kính mờ (Liquid Glass)</p>
              <p className="text-xs text-[var(--text-muted)]">Áp dụng độ mờ nền chọn lọc cho thanh điều hướng & modal</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={state.settings.glassEffectsEnabled}
              data-checked={state.settings.glassEffectsEnabled}
              onClick={() => updateSettings({glassEffectsEnabled: !state.settings.glassEffectsEnabled})}
              className="ios-toggle"
            >
              <span className="ios-toggle-thumb" />
            </button>
          </div>
        </div>
      </div>

      {/* GROUP 2: BANK ACCOUNTS & VIETQR */}
      <div className="space-y-2">
        <div className="px-2 flex items-center justify-between">
          <h2 className="text-xs font-medium text-[var(--text-muted)]">Tài khoản ngân hàng & VietQR</h2>
          <button
            type="button"
            onClick={() => openBankEditor()}
            className="text-xs font-semibold text-[var(--accent)] inline-flex items-center gap-1"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Thêm tài khoản</span>
          </button>
        </div>

        <div className="app-surface rounded-2xl overflow-hidden divide-y divide-[var(--border-hairline)]">
          {bankFormOpen && (
            <form onSubmit={handleSaveBank} className="p-4 sm:p-5 bg-[var(--bg-surface-alt)]/40 space-y-3">
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">
                {editingBank ? 'Cập nhật tài khoản ngân hàng' : 'Thêm tài khoản VietQR mới'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">Ngân hàng (Mã BIN NAPAS)</label>
                  <select
                    value={bankBin}
                    onChange={(e) => setBankBin(e.target.value)}
                    className="w-full min-h-[40px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 text-sm text-[var(--text-primary)]"
                  >
                    {VIETNAM_BANKS.map((b) => (
                      <option key={b.bin} value={b.bin}>
                        {b.name} ({b.shortName} · {b.bin})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">Số tài khoản</label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="19036888999012"
                    className="w-full min-h-[40px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 text-sm font-mono-tabular text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">Tên chủ tài khoản (Không dấu)</label>
                  <input
                    type="text"
                    required
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="NGUYEN MINH ANH"
                    className="w-full min-h-[40px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 text-sm uppercase text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">Nội dung CK mặc định</label>
                  <input
                    type="text"
                    value={defaultNote}
                    onChange={(e) => setDefaultNote(e.target.value)}
                    placeholder="TIET KIEM MY LIFE"
                    className="w-full min-h-[40px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 text-sm text-[var(--text-primary)]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-[var(--text-muted)] mb-1">
                  URL Webhook / API đối soát (tùy chọn)
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://api.example.com/vietqr/reconcile"
                  className="w-full min-h-[40px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 text-sm font-mono-tabular text-[var(--text-primary)]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setBankFormOpen(false)}
                  className="min-h-[38px] px-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-secondary)]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="min-h-[38px] px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-semibold btn-press"
                >
                  Lưu tài khoản
                </button>
              </div>
            </form>
          )}

          {state.bankAccounts.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--text-muted)]">
              Chưa có tài khoản ngân hàng nào được cấu hình để nhận tiền VietQR.
            </div>
          ) : (
            state.bankAccounts.map((bank) => (
              <div
                key={bank.id}
                className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0 mt-0.5">
                    <BankIcon className="w-[18px] h-[18px]" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {bank.bankName} · <span className="font-mono-tabular">{bank.accountNumber}</span>
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {bank.accountHolder} · BIN {bank.bin}
                      {bank.isDefault ? ' · Đang đặt mặc định' : ''}
                      {bank.webhookVerifyUrl ? ' · Có API đối soát' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!bank.isDefault && (
                    <button
                      type="button"
                      onClick={() => setDefaultBankAccount(bank.id)}
                      className="min-h-[34px] px-2.5 rounded-lg bg-[var(--bg-surface-alt)] text-xs font-medium text-[var(--text-primary)] btn-press"
                    >
                      Đặt mặc định
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Sửa tài khoản"
                    onClick={() => openBankEditor(bank)}
                    className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <EditIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Xóa tài khoản"
                    onClick={() => setDeleteBankId(bank.id)}
                    className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)]"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* GROUP 3: FINANCE SETTINGS */}
      <div className="space-y-2">
        <h2 className="px-2 text-xs font-medium text-[var(--text-muted)]">Tài chính & Danh mục</h2>
        <div className="app-surface rounded-2xl overflow-hidden divide-y divide-[var(--border-hairline)]">
          <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-[var(--text-primary)]">Đơn vị tiền tệ</span>
            <select
              value={state.settings.currency}
              onChange={(e) => updateSettings({currency: e.target.value as CurrencyCode})}
              className="min-h-[36px] rounded-lg bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] px-3 text-xs font-medium text-[var(--text-primary)]"
            >
              <option value="VND">VND (₫)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>

          <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-[var(--text-primary)]">Ngân sách tháng</span>
            <input
              type="number"
              min="0"
              step="100000"
              value={state.settings.monthlyBudget}
              onChange={(e) => updateSettings({monthlyBudget: Math.max(0, Number(e.target.value) || 0)})}
              className="w-40 min-h-[36px] text-right rounded-lg bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] px-3 text-xs font-mono-tabular text-[var(--text-primary)]"
            />
          </div>

          <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-[var(--text-primary)]">Ngày bắt đầu chu kỳ (1–28)</span>
            <input
              type="number"
              min="1"
              max="28"
              value={state.settings.cycleStartDay}
              onChange={(e) =>
                updateSettings({cycleStartDay: Math.max(1, Math.min(28, Number(e.target.value) || 1))})
              }
              className="w-20 min-h-[36px] text-right rounded-lg bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] px-3 text-xs font-mono-tabular text-[var(--text-primary)]"
            />
          </div>

          <div className="p-4 sm:p-5 space-y-3">
            <form onSubmit={handleAddCategory} className="flex flex-wrap gap-2">
              <select
                value={newCatType}
                onChange={(e) => setNewCatType(e.target.value as 'expense' | 'income')}
                className="min-h-[38px] rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] px-3 text-xs text-[var(--text-primary)]"
              >
                <option value="expense">Danh mục Chi tiêu</option>
                <option value="income">Danh mục Thu nhập</option>
              </select>
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Tên danh mục mới..."
                className="flex-1 min-w-[150px] min-h-[38px] rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] px-3 text-xs text-[var(--text-primary)]"
              />
              <button
                type="submit"
                className="min-h-[38px] px-3.5 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-semibold btn-press"
              >
                Thêm
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
              <div>
                <p className="font-medium text-[var(--text-muted)] mb-2">Chi tiêu</p>
                <div className="flex flex-wrap gap-1.5">
                  {state.settings.categories.expense.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleRemoveCategory('expense', cat)}
                      title="Nhấn để xóa"
                      className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface-alt)] text-[var(--text-primary)] hover:text-[var(--danger)]"
                    >
                      {cat} ×
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-medium text-[var(--text-muted)] mb-2">Thu nhập</p>
                <div className="flex flex-wrap gap-1.5">
                  {state.settings.categories.income.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleRemoveCategory('income', cat)}
                      title="Nhấn để xóa"
                      className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface-alt)] text-[var(--text-primary)] hover:text-[var(--danger)]"
                    >
                      {cat} ×
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GROUP 4: DATA MANAGEMENT */}
      <div className="space-y-2">
        <h2 className="px-2 text-xs font-medium text-[var(--text-muted)]">Sao lưu & Dữ liệu</h2>
        <div className="app-surface rounded-2xl overflow-hidden divide-y divide-[var(--border-hairline)]">
          <div className="px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Sao lưu & Khôi phục JSON</p>
              <p className="text-xs text-[var(--text-muted)]">Xuất toàn bộ dữ liệu hoặc khôi phục từ tệp đã lưu</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  downloadJson(`MYLIFE_Backup_${getTodayIso()}.json`, state);
                  showToast({type: 'success', title: 'Đã xuất bản sao lưu JSON'});
                }}
                className="min-h-[36px] px-3 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-semibold btn-press"
              >
                Xuất JSON
              </button>
              <label className="min-h-[36px] px-3 rounded-lg bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-primary)] inline-flex items-center cursor-pointer btn-press">
                <span>Nhập JSON</span>
                <input type="file" accept=".json,application/json" onChange={handleJsonImport} className="hidden" />
              </label>
            </div>
          </div>

          <div className="px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Xuất báo cáo bảng tính (CSV)</p>
              <p className="text-xs text-[var(--text-muted)]">Tương thích Excel tiếng Việt (UTF-8)</p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (state.transactions.length === 0) {
                  showToast({type: 'warning', title: 'Chưa có giao dịch thu chi để xuất CSV'});
                  return;
                }
                downloadCsv(
                  `MYLIFE_ThuChi_${getTodayIso()}.csv`,
                  ['Ngày', 'Loại', 'Tên', 'Danh mục', 'Số tiền', 'Phương thức', 'Ghi chú'],
                  state.transactions.map((t) => [
                    t.date,
                    t.type === 'income' ? 'Thu' : 'Chi',
                    t.title,
                    t.category,
                    t.amount,
                    t.paymentMethod || '',
                    t.note || '',
                  ]),
                );
                showToast({type: 'success', title: 'Đã xuất báo cáo CSV thu chi'});
              }}
              className="min-h-[36px] px-3 rounded-lg bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-primary)] btn-press"
            >
              Xuất CSV
            </button>
          </div>

          <div className="px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Dữ liệu trải nghiệm</p>
              <p className="text-xs text-[var(--text-muted)]">Nạp bộ giao dịch, mục tiêu và kế hoạch mẫu</p>
            </div>
            <button
              type="button"
              onClick={loadSampleData}
              className="min-h-[36px] px-3 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-semibold btn-press"
            >
              Nạp dữ liệu mẫu
            </button>
          </div>

          <div className="px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--danger)]">Xóa toàn bộ dữ liệu</p>
              <p className="text-xs text-[var(--text-muted)]">Yêu cầu xác nhận nhiều bước, không thể hoàn tác</p>
            </div>
            <button
              type="button"
              onClick={() => setWipeConfirmOpen(true)}
              className="min-h-[36px] px-3 rounded-lg bg-[var(--danger-soft)] text-[var(--danger)] text-xs font-semibold btn-press"
            >
              Xóa dữ liệu
            </button>
          </div>
        </div>
      </div>

      {/* GROUP 5: ACCOUNT SECURITY & ACTIVE SESSIONS */}
      <div className="space-y-2">
        <h2 className="px-2 text-xs font-medium text-[var(--text-muted)]">Tài khoản, Mật khẩu & Phiên đăng nhập</h2>
        <div className="app-surface rounded-2xl overflow-hidden divide-y divide-[var(--border-hairline)]">
          {/* Email & Account Summary Row */}
          <div className="px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-[var(--text-primary)]">{authUser?.email || state.profile.email}</p>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                    authUser?.emailVerified
                      ? 'bg-[var(--success-soft)] text-[var(--success)]'
                      : 'bg-[var(--bg-surface-alt)] text-[var(--text-muted)]'
                  }`}
                >
                  {authUser?.emailVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Tài khoản tạo ngày {formatShortDate(authUser?.joinedAt || state.profile.joinedAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={logoutAccount}
              className="min-h-[36px] px-3.5 rounded-lg bg-[var(--danger-soft)] text-[var(--danger)] text-xs font-semibold inline-flex items-center gap-1.5 btn-press"
            >
              <LogoutIcon className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>

          {/* Change Password Form */}
          <form onSubmit={handleChangePassword} className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2">
              <KeyIcon className="w-4 h-4 text-[var(--accent)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">Đổi mật khẩu tài khoản</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Mật khẩu hiện tại"
                className="min-h-[40px] rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] px-3 text-sm text-[var(--text-primary)]"
              />
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mật khẩu mới (8+ ký tự)"
                className="min-h-[40px] rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] px-3 text-sm text-[var(--text-primary)]"
              />
              <input
                type="password"
                autoComplete="new-password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="min-h-[40px] rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] px-3 text-sm text-[var(--text-primary)]"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={changingPw}
                className="min-h-[38px] px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-semibold btn-press disabled:opacity-50"
              >
                {changingPw ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
              </button>
            </div>
          </form>

          {/* Active Sessions List */}
          <div className="p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <DeviceIcon className="w-4 h-4 text-[var(--accent)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">Phiên đăng nhập đang hoạt động</span>
              </div>
              <div className="flex items-center gap-2">
                {sessions.length > 1 && (
                  <button
                    type="button"
                    onClick={async () => {
                      await revokeSession({revokeOthers: true});
                      await loadSessions();
                    }}
                    className="min-h-[32px] px-2.5 rounded-lg bg-[var(--danger-soft)] text-[var(--danger)] text-[11px] font-semibold btn-press"
                  >
                    Thu hồi phiên khác
                  </button>
                )}
                <button
                  type="button"
                  onClick={loadSessions}
                  disabled={loadingSessions}
                  className="min-h-[32px] px-2.5 rounded-lg bg-[var(--bg-surface-alt)] text-[11px] font-medium text-[var(--text-secondary)] btn-press"
                >
                  {loadingSessions ? 'Đang tải...' : 'Làm mới'}
                </button>
              </div>
            </div>

            {sessions.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">Chưa có thông tin phiên đăng nhập.</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface-alt)]/50 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--text-primary)] truncate">
                          {s.userAgent || 'Trình duyệt Web'}
                        </span>
                        {s.isCurrent && (
                          <span className="px-1.5 py-0.5 rounded bg-[var(--success-soft)] text-[var(--success)] text-[10px] font-semibold shrink-0">
                            Phiên hiện tại
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] font-mono-tabular mt-0.5">
                        IP: {s.ipAddress} · Hoạt động {formatShortDate(s.lastUsedAt.slice(0, 10))} · Hết hạn{' '}
                        {formatShortDate(s.expiresAt.slice(0, 10))}
                      </p>
                    </div>
                    {!s.isCurrent && (
                      <button
                        type="button"
                        onClick={async () => {
                          await revokeSession({sessionId: s.id});
                          await loadSessions();
                        }}
                        className="min-h-[30px] px-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[11px] font-medium text-[var(--danger)] shrink-0 btn-press"
                      >
                        Thu hồi
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Device PIN Lock */}
          <form onSubmit={handleSetPin} className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2">
              <LockIcon className="w-4 h-4 text-[var(--accent)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {state.settings.pinEnabled ? 'Đổi mã PIN khóa nhanh thiết bị' : 'Khóa nhanh ứng dụng bằng PIN (tùy chọn)'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Mã PIN (4–8 số)"
                className="min-h-[40px] rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] px-3 text-sm font-mono-tabular text-[var(--text-primary)]"
              />
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                placeholder="Nhập lại mã PIN"
                className="min-h-[40px] rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] px-3 text-sm font-mono-tabular text-[var(--text-primary)]"
              />
              <button
                type="submit"
                className="min-h-[40px] px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-semibold btn-press"
              >
                {state.settings.pinEnabled ? 'Cập nhật PIN' : 'Bật khóa PIN'}
              </button>
            </div>
            {state.settings.pinEnabled && (
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={lockApp}
                  className="min-h-[34px] px-3 rounded-lg bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] text-xs font-semibold text-[var(--text-primary)] btn-press"
                >
                  Khóa ngay
                </button>
                <button
                  type="button"
                  onClick={disablePinCode}
                  className="min-h-[34px] px-3 rounded-lg bg-[var(--danger-soft)] text-[var(--danger)] text-xs font-semibold btn-press"
                >
                  Tắt khóa PIN
                </button>
                <button
                  type="button"
                  onClick={rotateSession}
                  className="min-h-[34px] px-3 rounded-lg bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-secondary)] btn-press"
                >
                  Đồng bộ lại phiên
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* GROUP 6: ACCOUNT DATA LIFECYCLE & PERMANENT ACCOUNT DELETION */}
      <div className="space-y-2">
        <h2 className="px-2 text-xs font-medium text-[var(--text-muted)]">Quản lý tài khoản & Quyền dữ liệu</h2>
        <div className="app-surface rounded-2xl overflow-hidden divide-y divide-[var(--border-hairline)]">
          <div className="px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Xuất bản sao dữ liệu từ máy chủ</p>
              <p className="text-xs text-[var(--text-muted)]">Tải xuống toàn bộ hồ sơ và dữ liệu tài khoản D1 dạng JSON</p>
            </div>
            <button
              type="button"
              onClick={handleServerExport}
              className="min-h-[36px] px-3 rounded-lg bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-primary)] btn-press"
            >
              Tải bản sao máy chủ
            </button>
          </div>

          <div className="px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-[var(--danger)]">Xóa tài khoản vĩnh viễn</p>
              <p className="text-xs text-[var(--text-muted)]">
                Xóa tài khoản, phiên đăng nhập và toàn bộ dữ liệu giao dịch, tiết kiệm, kế hoạch khỏi cơ sở dữ liệu
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDeleteAccountPassword('');
                setDeleteAccountPhrase('');
                setDeleteAccountModalOpen(true);
              }}
              className="min-h-[36px] px-3 rounded-lg bg-[var(--danger-soft)] text-[var(--danger)] text-xs font-semibold btn-press"
            >
              Yêu cầu xóa tài khoản
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteBankId}
        title="Xóa tài khoản ngân hàng"
        description="Tài khoản này sẽ bị xóa khỏi danh sách nhận VietQR."
        confirmLabel="Xóa"
        danger
        onConfirm={() => {
          if (deleteBankId) deleteBankAccount(deleteBankId);
          setDeleteBankId(null);
        }}
        onCancel={() => setDeleteBankId(null)}
      />

      <ConfirmModal
        open={wipeConfirmOpen}
        title="Xóa toàn bộ dữ liệu tài chính & kế hoạch"
        description="Tất cả giao dịch thu chi, mục tiêu tiết kiệm, lịch sử VietQR, kế hoạch và tài khoản ngân hàng của tài khoản hiện tại sẽ bị xóa sạch khỏi máy chủ (tài khoản đăng nhập vẫn được giữ lại). Hãy xuất JSON trước nếu cần sao lưu."
        confirmLabel="Xóa vĩnh viễn"
        danger
        requirePhrase="XOA DU LIEU"
        onConfirm={async () => {
          await wipeAllData();
          setWipeConfirmOpen(false);
        }}
        onCancel={() => setWipeConfirmOpen(false)}
      />

      {/* Permanent Account Deletion Modal */}
      {deleteAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <form
            onSubmit={handleDeleteAccount}
            className="glass-surface modal-enter w-full max-w-md rounded-2xl p-6 shadow-[var(--shadow-float)] space-y-4"
          >
            <h3 className="text-base font-semibold font-display text-[var(--danger)]">
              Xác nhận xóa tài khoản vĩnh viễn
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Theo chính sách quyền riêng tư, hành động này sẽ xóa ngay lập tức tài khoản{' '}
              <strong className="text-[var(--text-primary)]">{authUser?.email}</strong> cùng toàn bộ giao dịch,
              mục tiêu tiết kiệm, lịch sử nạp VietQR, kế hoạch và tài khoản ngân hàng trên cơ sở dữ liệu. Dữ liệu không thể khôi phục sau khi xóa.
            </p>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Nhập mật khẩu tài khoản
              </label>
              <input
                type="password"
                required
                value={deleteAccountPassword}
                onChange={(e) => setDeleteAccountPassword(e.target.value)}
                placeholder="Mật khẩu hiện tại"
                className="w-full min-h-[40px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 text-sm text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Nhập chính xác cụm từ <code className="font-mono-tabular font-semibold">XOA TAI KHOAN</code>
              </label>
              <input
                type="text"
                required
                value={deleteAccountPhrase}
                onChange={(e) => setDeleteAccountPhrase(e.target.value)}
                placeholder="XOA TAI KHOAN"
                className="w-full min-h-[40px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 text-sm font-mono-tabular text-[var(--text-primary)]"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteAccountModalOpen(false)}
                className="min-h-[40px] px-4 rounded-xl bg-[var(--bg-surface-alt)] text-xs font-medium text-[var(--text-secondary)] btn-press"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={deletingAccount || deleteAccountPhrase.trim() !== 'XOA TAI KHOAN' || !deleteAccountPassword}
                className="min-h-[40px] px-4 rounded-xl bg-[var(--danger)] text-white text-xs font-semibold btn-press disabled:opacity-45"
              >
                {deletingAccount ? 'Đang xóa tài khoản...' : 'Xóa tài khoản vĩnh viễn'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
