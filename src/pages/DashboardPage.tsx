import React, {useMemo, useState} from 'react';
import {
  ExpenseCategoryDonutChart,
  IncomeExpenseBarChart,
  MonthlyExpenseComparisonChart,
  SavingsGrowthLineChart,
} from '../components/charts/DashboardCharts';
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  MinusIcon,
  PlannerIcon,
  PlusIcon,
  QrIcon,
} from '../components/icons/CustomIcons';
import {
  GoalModal,
  PlanModal,
  TransactionModal,
  VietQrDepositWizardModal,
} from '../components/modals/QuickModals';
import {useApp} from '../context/AppContext';
import {TransactionType} from '../types/app';
import {
  formatDateTime,
  formatMoney,
  formatShortDate,
  formatVietnameseDate,
  getEffectivePlanStatus,
  getGreetingByTime,
} from '../utils/formatters';

export const DashboardPage: React.FC = () => {
  const {state, summary, setActiveTab, loadSampleData} = useApp();
  const [txModal, setTxModal] = useState<{open: boolean; type: TransactionType}>({
    open: false,
    type: 'expense',
  });
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);

  const isEmptyAll =
    state.transactions.length === 0 &&
    state.savingsGoals.length === 0 &&
    state.plans.length === 0;

  const recentTransactions = useMemo(() => {
    return [...state.transactions]
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);
  }, [state.transactions]);

  const recentDeposits = useMemo(() => {
    return [...state.savingsDeposits]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 3);
  }, [state.savingsDeposits]);

  const upcomingPlans = useMemo(() => {
    return state.plans
      .filter((p) => p.status !== 'done')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 4);
  }, [state.plans]);

  const activeGoals = useMemo(() => {
    return state.savingsGoals.slice(0, 3);
  }, [state.savingsGoals]);

  const currency = state.settings.currency;

  return (
    <div className="space-y-6">
      {/* Compact Header: Greeting, Date & Avatar */}
      <header className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--text-muted)] truncate">
            {formatVietnameseDate()}
          </p>
          <h1 className="mt-0.5 text-xl sm:text-2xl font-semibold font-display text-[var(--text-primary)] tracking-tight truncate">
            {getGreetingByTime()}, {state.profile.name}
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          aria-label="Mở hồ sơ cá nhân"
          className="flex items-center gap-2.5 rounded-full p-1 pr-3 app-surface hover:border-[var(--accent)]/40 transition-colors shrink-0 btn-press"
        >
          <img
            src={state.profile.avatar}
            alt={state.profile.name}
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="hidden sm:inline text-xs font-medium text-[var(--text-secondary)]">Tài khoản</span>
        </button>
      </header>

      {/* Restrained Empty-State Strip (no oversized promo banner) */}
      {isEmptyAll && (
        <div className="app-surface rounded-xl px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Sổ tài chính đang trống. Bắt đầu ghi giao dịch mới hoặc nạp dữ liệu mẫu để xem biểu đồ.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setGoalModalOpen(true)}
              className="min-h-[36px] px-3 rounded-lg bg-[var(--bg-surface-alt)] text-xs font-medium text-[var(--text-primary)] btn-press whitespace-nowrap"
            >
              Tạo mục tiêu
            </button>
            <button
              type="button"
              onClick={loadSampleData}
              className="min-h-[36px] px-3.5 rounded-lg bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-semibold btn-press whitespace-nowrap"
            >
              Nạp dữ liệu mẫu
            </button>
          </div>
        </div>
      )}

      {/* Primary Financial Module: Single Focal Net Worth Card + Integrated Sub-Metrics */}
      <section className="glass-surface rounded-2xl overflow-hidden">
        <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
              <span>Tổng tài sản cá nhân</span>
              <span>·</span>
              <span>Chu kỳ {summary.cycleLabel}</span>
            </div>
            <p className="mt-1.5 text-2xl sm:text-3xl font-semibold font-mono-tabular text-[var(--text-primary)] tracking-tight">
              {formatMoney(summary.totalAssets, currency)}
            </p>
            <p className="mt-1.5 text-xs text-[var(--text-secondary)] font-mono-tabular">
              Số dư chi tiêu khả dụng:{' '}
              <span
                className={`font-semibold ${
                  summary.spendingBalance >= 0 ? 'text-[var(--text-primary)]' : 'text-[var(--danger)]'
                }`}
              >
                {formatMoney(summary.spendingBalance, currency)}
              </span>
            </p>
          </div>

          {/* Compact Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTxModal({open: true, type: 'income'})}
              className="min-h-[40px] px-3.5 rounded-xl bg-[var(--success-soft)] text-[var(--success)] text-xs font-semibold inline-flex items-center gap-1.5 btn-press whitespace-nowrap"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Thêm thu nhập</span>
            </button>
            <button
              type="button"
              onClick={() => setTxModal({open: true, type: 'expense'})}
              className="min-h-[40px] px-3.5 rounded-xl bg-[var(--danger-soft)] text-[var(--danger)] text-xs font-semibold inline-flex items-center gap-1.5 btn-press whitespace-nowrap"
            >
              <MinusIcon className="w-3.5 h-3.5" />
              <span>Thêm chi tiêu</span>
            </button>
            <button
              type="button"
              onClick={() => setQrModalOpen(true)}
              className="min-h-[40px] px-3.5 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-semibold inline-flex items-center gap-1.5 btn-press whitespace-nowrap"
            >
              <QrIcon className="w-3.5 h-3.5" />
              <span>Gửi tiết kiệm</span>
            </button>
            <button
              type="button"
              onClick={() => setPlanModalOpen(true)}
              className="min-h-[40px] px-3.5 rounded-xl bg-[var(--bg-surface-alt)] text-[var(--text-primary)] text-xs font-semibold inline-flex items-center gap-1.5 btn-press whitespace-nowrap"
            >
              <PlannerIcon className="w-3.5 h-3.5" />
              <span>Tạo kế hoạch</span>
            </button>
          </div>
        </div>

        {/* Integrated 3-Column Sub-Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-hairline)] border-t border-[var(--border-hairline)] bg-[var(--bg-surface)]/55">
          <div className="px-5 py-3.5 flex items-center justify-between sm:block">
            <span className="text-xs text-[var(--text-muted)]">Thu nhập tháng</span>
            <p className="sm:mt-1 text-base font-semibold font-mono-tabular text-[var(--success)]">
              +{formatMoney(summary.monthlyIncome, currency)}
            </p>
          </div>

          <div className="px-5 py-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">Chi tiêu tháng</span>
              <span className="text-[11px] font-mono-tabular text-[var(--text-muted)]">
                {summary.budgetUsagePercent}% ngân sách
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="text-base font-semibold font-mono-tabular text-[var(--danger)]">
                -{formatMoney(summary.monthlyExpense, currency)}
              </p>
              <div className="w-20 h-1.5 rounded-full bg-[var(--bg-surface-alt)] overflow-hidden shrink-0">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, summary.budgetUsagePercent)}%`,
                    backgroundColor: summary.budgetUsagePercent > 100 ? 'var(--danger)' : 'var(--accent)',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="px-5 py-3.5 flex items-center justify-between sm:block">
            <span className="text-xs text-[var(--text-muted)]">Tiền tiết kiệm</span>
            <div className="text-right sm:text-left">
              <p className="sm:mt-1 text-base font-semibold font-mono-tabular text-[var(--accent)]">
                {formatMoney(summary.totalSavings, currency)}
              </p>
              {summary.pendingSavingsAmount > 0 && (
                <p className="text-[11px] font-mono-tabular text-[var(--warning)]">
                  Chờ xác nhận: {formatMoney(summary.pendingSavingsAmount, currency)}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Charts Grid (Minimalist Fintech) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="app-surface rounded-2xl p-5">
          <h2 className="text-sm font-semibold font-display text-[var(--text-primary)] mb-3">
            Thu nhập và chi tiêu
          </h2>
          <IncomeExpenseBarChart transactions={state.transactions} currency={currency} />
        </div>

        <div className="app-surface rounded-2xl p-5">
          <h2 className="text-sm font-semibold font-display text-[var(--text-primary)] mb-3">
            Chi tiêu theo danh mục
          </h2>
          <ExpenseCategoryDonutChart transactions={state.transactions} currency={currency} />
        </div>

        <div className="app-surface rounded-2xl p-5">
          <h2 className="text-sm font-semibold font-display text-[var(--text-primary)] mb-3">
            Tăng trưởng tiết kiệm
          </h2>
          <SavingsGrowthLineChart deposits={state.savingsDeposits} currency={currency} />
        </div>

        <div className="app-surface rounded-2xl p-5">
          <h2 className="text-sm font-semibold font-display text-[var(--text-primary)] mb-3">
            So sánh chi tiêu giữa các tháng
          </h2>
          <MonthlyExpenseComparisonChart
            transactions={state.transactions}
            currency={currency}
            monthlyBudget={state.settings.monthlyBudget}
          />
        </div>
      </section>

      {/* Recent Activity: Structured List Rows (not nested cards) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 7 cols: Recent Transactions + Savings Deposits */}
        <div className="lg:col-span-7 app-surface rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[var(--border-hairline)] flex items-center justify-between">
            <h2 className="text-sm font-semibold font-display text-[var(--text-primary)]">Hoạt động tài chính gần đây</h2>
            <button
              type="button"
              onClick={() => setActiveTab('finance')}
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              Xem sổ thu chi
            </button>
          </div>

          {recentTransactions.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-8 text-center">Chưa có giao dịch nào.</p>
          ) : (
            <div className="divide-y divide-[var(--border-hairline)]">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        tx.type === 'income'
                          ? 'bg-[var(--success-soft)] text-[var(--success)]'
                          : 'bg-[var(--bg-surface-alt)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {tx.type === 'income' ? (
                        <ArrowDownLeftIcon className="w-4 h-4" />
                      ) : (
                        <ArrowUpRightIcon className="w-4 h-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{tx.title}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate">
                        {tx.category} · {formatShortDate(tx.date)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-mono-tabular font-semibold whitespace-nowrap ${
                      tx.type === 'income' ? 'text-[var(--success)]' : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatMoney(tx.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {recentDeposits.length > 0 && (
            <>
              <div className="px-5 py-2.5 bg-[var(--bg-surface-alt)]/60 border-y border-[var(--border-hairline)] flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--text-secondary)]">Giao dịch tiết kiệm vừa tạo</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('savings')}
                  className="text-xs font-medium text-[var(--accent)] hover:underline"
                >
                  Chi tiết
                </button>
              </div>
              <div className="divide-y divide-[var(--border-hairline)]">
                {recentDeposits.map((dep) => {
                  const goalName = state.savingsGoals.find((g) => g.id === dep.goalId)?.name || 'Mục tiêu';
                  const statusLabel =
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
                    <div key={dep.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{goalName}</p>
                        <p className="text-xs text-[var(--text-muted)] font-mono-tabular truncate">
                          {dep.transactionCode} · {formatDateTime(dep.createdAt)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-mono-tabular font-semibold text-[var(--text-primary)]">
                          {formatMoney(dep.amount, currency)}
                        </p>
                        <p className={`text-[11px] font-medium ${statusTone}`}>{statusLabel}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Right 5 cols: Upcoming Plans + Active Savings Progress */}
        <div className="lg:col-span-5 app-surface rounded-2xl overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-[var(--border-hairline)] flex items-center justify-between">
            <h2 className="text-sm font-semibold font-display text-[var(--text-primary)]">Kế hoạch & Mục tiêu</h2>
            <button
              type="button"
              onClick={() => setActiveTab('planner')}
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              Mở kế hoạch
            </button>
          </div>

          <div className="divide-y divide-[var(--border-hairline)]">
            {upcomingPlans.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-6 text-center px-4">Không có kế hoạch sắp đến hạn.</p>
            ) : (
              upcomingPlans.map((plan) => {
                const eff = getEffectivePlanStatus(plan);
                return (
                  <div key={plan.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{plan.title}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate">
                        {plan.type} · {formatShortDate(plan.dueDate)}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium whitespace-nowrap ${
                        eff === 'overdue'
                          ? 'text-[var(--danger)]'
                          : eff === 'in_progress'
                          ? 'text-[var(--accent)]'
                          : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {eff === 'overdue' ? 'Quá hạn' : eff === 'in_progress' ? 'Đang làm' : 'Chưa làm'}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-5 py-2.5 bg-[var(--bg-surface-alt)]/60 border-y border-[var(--border-hairline)] flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Tiến độ mục tiêu tiết kiệm</span>
            <button
              type="button"
              onClick={() => setActiveTab('savings')}
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              Tất cả
            </button>
          </div>

          <div className="p-5 space-y-3.5">
            {activeGoals.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-2">Chưa có mục tiêu tiết kiệm.</p>
            ) : (
              activeGoals.map((goal) => {
                const pct = Math.min(100, Math.round((goal.currentAmount / Math.max(1, goal.targetAmount)) * 100));
                return (
                  <div key={goal.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-[var(--text-primary)] truncate">{goal.name}</span>
                      <span className="font-mono-tabular text-[var(--text-muted)] shrink-0">
                        {pct}% · {formatMoney(goal.currentAmount, currency)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--bg-surface-alt)] overflow-hidden">
                      <div className="h-full rounded-full" style={{width: `${pct}%`, backgroundColor: 'var(--accent)'}} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <TransactionModal
        open={txModal.open}
        initialType={txModal.type}
        onClose={() => setTxModal((prev) => ({...prev, open: false}))}
      />
      <VietQrDepositWizardModal open={qrModalOpen} onClose={() => setQrModalOpen(false)} />
      <PlanModal open={planModalOpen} onClose={() => setPlanModalOpen(false)} />
      <GoalModal open={goalModalOpen} onClose={() => setGoalModalOpen(false)} />
    </div>
  );
};
