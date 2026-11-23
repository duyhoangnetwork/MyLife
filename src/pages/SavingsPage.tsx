import React, {useMemo, useState} from 'react';
import {ConfirmModal} from '../components/common/Feedback';
import {VietQrRenderer} from '../components/common/VietQrRenderer';
import {
  CheckIcon,
  CloseIcon,
  DownloadIcon,
  EditIcon,
  PlusIcon,
  QrIcon,
  SavingsIcon,
  SearchIcon,
  ShieldCheckIcon,
  TrashIcon,
} from '../components/icons/CustomIcons';
import {GoalModal, VietQrDepositWizardModal} from '../components/modals/QuickModals';
import {useApp} from '../context/AppContext';
import {DepositStatus, SavingsDeposit, SavingsGoal} from '../types/app';
import {downloadCsv, formatDateTime, formatMoney, formatShortDate, getTodayIso} from '../utils/formatters';

export const SavingsPage: React.FC = () => {
  const {
    state,
    summary,
    deleteSavingsGoal,
    confirmDepositManually,
    markDepositFailed,
    reconcileDepositViaWebhook,
    showToast,
  } = useApp();

  const [activeSection, setActiveSection] = useState<'goals' | 'history'>('goals');
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [qrWizardOpen, setQrWizardOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | undefined>(undefined);
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);

  const [historySearch, setHistorySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DepositStatus>('all');
  const [manualConfirmDeposit, setManualConfirmDeposit] = useState<SavingsDeposit | null>(null);
  const [previewQrDeposit, setPreviewQrDeposit] = useState<SavingsDeposit | null>(null);
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);

  const currency = state.settings.currency;

  const filteredDeposits = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return [...state.savingsDeposits]
      .filter((d) => {
        if (statusFilter !== 'all' && d.status !== statusFilter) return false;
        if (q) {
          const goalName = state.savingsGoals.find((g) => g.id === d.goalId)?.name || '';
          const hay = `${d.transactionCode} ${d.transferNote} ${d.bankName} ${goalName}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [state.savingsDeposits, state.savingsGoals, historySearch, statusFilter]);

  const handleExportDepositsCsv = () => {
    if (filteredDeposits.length === 0) {
      showToast({type: 'warning', title: 'Chưa có lịch sử gửi tiền để xuất CSV'});
      return;
    }
    downloadCsv(
      `MYLIFE_LichSuTietKiem_${getTodayIso()}.csv`,
      ['Thời gian', 'Mục tiêu', 'Số tiền', 'Mã giao dịch', 'Ngân hàng', 'Trạng thái', 'Phương thức xác minh'],
      filteredDeposits.map((d) => {
        const goalName = state.savingsGoals.find((g) => g.id === d.goalId)?.name || 'Đã xóa';
        return [
          formatDateTime(d.createdAt),
          goalName,
          d.amount,
          d.transactionCode,
          d.bankName,
          d.status === 'confirmed' ? 'Thành công' : d.status === 'pending' ? 'Chờ xác nhận' : 'Thất bại',
          d.verificationMethod === 'api_webhook'
            ? 'API Ngân hàng'
            : d.verificationMethod === 'manual_unverified'
            ? 'Thủ công (Chưa được ngân hàng xác minh)'
            : 'Chưa xác minh',
        ];
      }),
    );
    showToast({type: 'success', title: 'Đã xuất lịch sử tiết kiệm CSV'});
  };

  const handleApiCheck = async (dep: SavingsDeposit) => {
    const bank = state.bankAccounts.find((b) => b.id === dep.bankAccountId);
    setReconcilingId(dep.id);
    await reconcileDepositViaWebhook(dep.id, bank?.webhookVerifyUrl || '');
    setReconcilingId(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold font-display text-[var(--text-primary)]">Quỹ Tiết kiệm</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Theo dõi mục tiêu tích lũy, tạo mã VietQR và đối soát giao dịch ngân hàng
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingGoal(null);
              setGoalModalOpen(true);
            }}
            className="min-h-[40px] px-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-xs font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 btn-press whitespace-nowrap"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Tạo mục tiêu</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedGoalId(state.savingsGoals[0]?.id);
              setQrWizardOpen(true);
            }}
            className="min-h-[40px] px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-semibold inline-flex items-center gap-1.5 btn-press whitespace-nowrap"
          >
            <QrIcon className="w-3.5 h-3.5" />
            <span>Gửi tiết kiệm</span>
          </button>
        </div>
      </div>

      {/* Unified Savings Summary Strip */}
      <div className="app-surface rounded-2xl grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-hairline)]">
        <div className="px-5 py-3.5 flex items-center justify-between sm:block">
          <span className="text-xs text-[var(--text-muted)]">Tổng đã xác minh</span>
          <p className="sm:mt-0.5 text-base font-semibold font-mono-tabular text-[var(--accent)]">
            {formatMoney(summary.totalSavings, currency)}
          </p>
        </div>
        <div className="px-5 py-3.5 flex items-center justify-between sm:block">
          <span className="text-xs text-[var(--text-muted)]">Đang chờ xác nhận</span>
          <p className="sm:mt-0.5 text-base font-semibold font-mono-tabular text-[var(--warning)]">
            {formatMoney(summary.pendingSavingsAmount, currency)}
          </p>
        </div>
        <div className="px-5 py-3.5 flex items-center justify-between sm:block">
          <span className="text-xs text-[var(--text-muted)]">Mục tiêu hoàn thành</span>
          <p className="sm:mt-0.5 text-base font-semibold font-mono-tabular text-[var(--success)]">
            {state.savingsGoals.filter((g) => g.currentAmount >= g.targetAmount).length} / {state.savingsGoals.length}
          </p>
        </div>
      </div>

      {/* Section Switcher */}
      <div className="grid grid-cols-2 max-w-sm gap-1 p-1 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)]">
        <button
          type="button"
          onClick={() => setActiveSection('goals')}
          className={`min-h-[36px] rounded-lg text-xs font-semibold transition-colors ${
            activeSection === 'goals'
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
              : 'text-[var(--text-muted)]'
          }`}
        >
          Mục tiêu ({state.savingsGoals.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('history')}
          className={`min-h-[36px] rounded-lg text-xs font-semibold transition-colors ${
            activeSection === 'history'
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
              : 'text-[var(--text-muted)]'
          }`}
        >
          Sổ giao dịch ({state.savingsDeposits.length})
        </button>
      </div>

      {activeSection === 'goals' ? (
        state.savingsGoals.length === 0 ? (
          <div className="app-surface rounded-2xl p-10 text-center space-y-3">
            <SavingsIcon className="w-7 h-7 mx-auto text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">
              Bạn chưa có mục tiêu tiết kiệm nào. Hãy tạo mục tiêu mới để theo dõi tiến độ tích lũy.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingGoal(null);
                setGoalModalOpen(true);
              }}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-semibold btn-press"
            >
              Tạo mục tiêu đầu tiên
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {state.savingsGoals.map((goal) => {
              const pct = Math.min(100, Math.round((goal.currentAmount / Math.max(1, goal.targetAmount)) * 100));
              const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
              const isDone = goal.currentAmount >= goal.targetAmount;

              return (
                <section
                  key={goal.id}
                  className="app-surface rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-4"
                >
                  {/* Goal Visual Thumbnail */}
                  <div className="w-full md:w-36 h-32 md:h-24 rounded-xl bg-[var(--bg-surface-alt)] overflow-hidden shrink-0">
                    {goal.avatar ? (
                      <img
                        src={goal.avatar}
                        alt={goal.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                        <SavingsIcon className="w-8 h-8" />
                      </div>
                    )}
                  </div>

                  {/* Goal Details & Slim Progress */}
                  <div className="flex-1 min-w-0 space-y-2.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <h3 className="text-base font-semibold font-display text-[var(--text-primary)]">{goal.name}</h3>
                        {goal.description && (
                          <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">{goal.description}</p>
                        )}
                      </div>
                      <span className="text-xs font-mono-tabular text-[var(--text-muted)]">
                        Hạn {formatShortDate(goal.targetDate)}
                      </span>
                    </div>

                    <div className="h-1.5 rounded-full bg-[var(--bg-surface-alt)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: isDone ? 'var(--success)' : 'var(--accent)',
                        }}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="font-mono-tabular">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {formatMoney(goal.currentAmount, currency)}
                        </span>
                        <span className="text-[var(--text-muted)]"> / {formatMoney(goal.targetAmount, currency)}</span>
                      </div>
                      <span className="font-mono-tabular text-[var(--text-secondary)]">
                        {pct}% · {isDone ? 'Đã hoàn thành' : `Thiếu ${formatMoney(remaining, currency)}`}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 md:pl-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGoalId(goal.id);
                        setQrWizardOpen(true);
                      }}
                      className="flex-1 md:flex-none min-h-[40px] px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 btn-press whitespace-nowrap"
                    >
                      <QrIcon className="w-3.5 h-3.5" />
                      <span>Gửi tiết kiệm</span>
                    </button>
                    <button
                      type="button"
                      aria-label="Sửa mục tiêu"
                      onClick={() => {
                        setEditingGoal(goal);
                        setGoalModalOpen(true);
                      }}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-[var(--bg-surface-alt)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] btn-press"
                    >
                      <EditIcon className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Xóa mục tiêu"
                      onClick={() => setDeleteGoalId(goal.id)}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-[var(--bg-surface-alt)] text-[var(--text-muted)] hover:text-[var(--danger)] btn-press"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
        )
      ) : (
        <div className="space-y-3">
          <div className="app-surface rounded-2xl p-3.5 flex flex-col md:flex-row gap-2.5 justify-between">
            <div className="relative flex-1">
              <SearchIcon className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Tìm theo mã giao dịch, mục tiêu, ngân hàng..."
                className="w-full min-h-[40px] pl-9 pr-3.5 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] text-sm text-[var(--text-primary)]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | DepositStatus)}
                className="min-h-[40px] rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] px-3 text-xs font-medium text-[var(--text-primary)]"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="pending">Chờ xác nhận</option>
                <option value="confirmed">Thành công</option>
                <option value="failed">Thất bại</option>
              </select>

              <button
                type="button"
                onClick={handleExportDepositsCsv}
                className="min-h-[40px] px-3.5 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] text-xs font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 btn-press"
              >
                <DownloadIcon className="w-3.5 h-3.5" />
                <span>Xuất lịch sử</span>
              </button>
            </div>
          </div>

          {/* Bank Passbook Statement Table */}
          <div className="app-surface rounded-2xl overflow-hidden">
            {filteredDeposits.length === 0 ? (
              <div className="p-10 text-center text-sm text-[var(--text-muted)]">
                Chưa có giao dịch gửi tiết kiệm nào khớp bộ lọc.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-hairline)]">
                {filteredDeposits.map((dep) => {
                  const goal = state.savingsGoals.find((g) => g.id === dep.goalId);
                  const statusText =
                    dep.status === 'confirmed'
                      ? 'Thành công'
                      : dep.status === 'pending'
                      ? 'Chờ xác nhận'
                      : 'Thất bại';
                  const statusTone =
                    dep.status === 'confirmed'
                      ? 'text-[var(--success)]'
                      : dep.status === 'pending'
                      ? 'text-[var(--warning)]'
                      : 'text-[var(--danger)]';
                  return (
                    <div
                      key={dep.id}
                      className="px-4 sm:px-5 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {goal?.name || 'Mục tiêu tiết kiệm'}
                          </span>
                          <span className="text-xs text-[var(--text-muted)] font-mono-tabular">
                            · {dep.transactionCode}
                          </span>
                          <span className={`text-xs font-semibold ${statusTone}`}>· {statusText}</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {dep.bankName} ({dep.accountNumber}) · {formatDateTime(dep.createdAt)}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {dep.verificationMethod === 'api_webhook' && 'Đã xác minh qua API / Webhook ngân hàng'}
                          {dep.verificationMethod === 'manual_unverified' &&
                            'Xác nhận thủ công (Dữ liệu chưa được ngân hàng xác minh)'}
                          {dep.verificationMethod === 'none' &&
                            'Chưa cộng vào số dư mục tiêu — đang chờ đối soát giao dịch'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <span className="text-sm font-semibold font-mono-tabular text-[var(--text-primary)] mr-2">
                          {formatMoney(dep.amount, currency)}
                        </span>

                        {dep.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => setPreviewQrDeposit(dep)}
                              className="min-h-[36px] px-3 rounded-lg bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] text-xs font-medium text-[var(--text-primary)] btn-press"
                            >
                              Mã QR
                            </button>
                            <button
                              type="button"
                              disabled={reconcilingId === dep.id}
                              onClick={() => handleApiCheck(dep)}
                              className="min-h-[36px] px-3 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-semibold inline-flex items-center gap-1 btn-press"
                            >
                              <ShieldCheckIcon className="w-3.5 h-3.5" />
                              <span>{reconcilingId === dep.id ? 'Đang kiểm tra...' : 'Đối soát API'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setManualConfirmDeposit(dep)}
                              className="min-h-[36px] px-3 rounded-lg bg-[var(--success-soft)] text-[var(--success)] text-xs font-semibold inline-flex items-center gap-1 btn-press"
                            >
                              <CheckIcon className="w-3.5 h-3.5" />
                              <span>Xác nhận thủ công</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => markDepositFailed(dep.id)}
                              className="min-h-[36px] px-3 rounded-lg bg-[var(--danger-soft)] text-[var(--danger)] text-xs font-semibold btn-press"
                            >
                              Thất bại
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <GoalModal
        open={goalModalOpen}
        editing={editingGoal}
        onClose={() => {
          setGoalModalOpen(false);
          setEditingGoal(null);
        }}
      />

      <VietQrDepositWizardModal
        open={qrWizardOpen}
        preselectedGoalId={selectedGoalId}
        onClose={() => setQrWizardOpen(false)}
        onCreatedPending={() => setActiveSection('history')}
      />

      <ConfirmModal
        open={!!deleteGoalId}
        title="Xóa mục tiêu tiết kiệm"
        description="Mục tiêu và lịch sử giao dịch liên quan sẽ bị xóa khỏi thiết bị."
        confirmLabel="Xóa mục tiêu"
        danger
        onConfirm={() => {
          if (deleteGoalId) deleteSavingsGoal(deleteGoalId);
          setDeleteGoalId(null);
        }}
        onCancel={() => setDeleteGoalId(null)}
      />

      <ConfirmModal
        open={!!manualConfirmDeposit}
        title="Xác nhận thủ công khoản gửi tiết kiệm"
        description={`Khoản ${
          manualConfirmDeposit ? formatMoney(manualConfirmDeposit.amount, currency) : ''
        } (Mã ${manualConfirmDeposit?.transactionCode || ''}) sẽ được đánh dấu là Xác nhận thủ công — Dữ liệu chưa được ngân hàng xác minh tự động. Chỉ xác nhận nếu bạn đã hoàn tất chuyển khoản trên ứng dụng ngân hàng.`}
        confirmLabel="Xác nhận thủ công"
        onConfirm={() => {
          if (manualConfirmDeposit) confirmDepositManually(manualConfirmDeposit.id);
          setManualConfirmDeposit(null);
        }}
        onCancel={() => setManualConfirmDeposit(null)}
      />

      {previewQrDeposit && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-xs p-0 sm:p-4">
          <div className="glass-surface modal-enter w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 pb-safe shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold font-display text-[var(--text-primary)]">
                Mã VietQR · {previewQrDeposit.transactionCode}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewQrDeposit(null)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[var(--text-muted)] btn-press"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <VietQrRenderer
              payload={previewQrDeposit.qrPayload}
              bankName={previewQrDeposit.bankName}
              accountNumber={previewQrDeposit.accountNumber}
              accountHolder={
                state.bankAccounts.find((b) => b.id === previewQrDeposit.bankAccountId)?.accountHolder || 'CHU TAI KHOAN'
              }
              amount={previewQrDeposit.amount}
              transferNote={previewQrDeposit.transferNote}
            />
          </div>
        </div>
      )}
    </div>
  );
};
