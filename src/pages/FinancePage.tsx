import React, {useMemo, useState} from 'react';
import {ConfirmModal} from '../components/common/Feedback';
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  DownloadIcon,
  EditIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from '../components/icons/CustomIcons';
import {TransactionModal} from '../components/modals/QuickModals';
import {useApp} from '../context/AppContext';
import {Transaction, TransactionType} from '../types/app';
import {downloadCsv, formatMoney, formatShortDate, getTodayIso} from '../utils/formatters';

type PeriodFilter = 'all' | 'day' | 'month' | 'year';

export const FinancePage: React.FC = () => {
  const {state, deleteTransaction, showToast} = useApp();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');
  const [selectedDate, setSelectedDate] = useState(getTodayIso());
  const [selectedMonth, setSelectedMonth] = useState(getTodayIso().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(getTodayIso().slice(0, 4));

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>('expense');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const allCategories = useMemo(() => {
    const combined = new Set([...state.settings.categories.expense, ...state.settings.categories.income]);
    return Array.from(combined);
  }, [state.settings.categories]);

  const availableYears = useMemo(() => {
    const years = new Set<string>([getTodayIso().slice(0, 4)]);
    for (const tx of state.transactions) {
      years.add(tx.date.slice(0, 4));
    }
    return Array.from(years).sort().reverse();
  }, [state.transactions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...state.transactions]
      .filter((tx) => {
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
        if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
        if (periodFilter === 'day' && tx.date !== selectedDate) return false;
        if (periodFilter === 'month' && tx.date.slice(0, 7) !== selectedMonth) return false;
        if (periodFilter === 'year' && tx.date.slice(0, 4) !== selectedYear) return false;
        if (q) {
          const hay = `${tx.title} ${tx.category} ${tx.note || ''} ${tx.paymentMethod || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [state.transactions, search, typeFilter, categoryFilter, periodFilter, selectedDate, selectedMonth, selectedYear]);

  // Group filtered transactions by date
  const groupedByDate = useMemo(() => {
    const today = getTodayIso();
    const yDate = new Date();
    yDate.setDate(yDate.getDate() - 1);
    const yesterday = `${yDate.getFullYear()}-${String(yDate.getMonth() + 1).padStart(2, '0')}-${String(
      yDate.getDate(),
    ).padStart(2, '0')}`;

    const map = new Map<string, {label: string; items: Transaction[]; net: number}>();
    for (const tx of filtered) {
      const existing = map.get(tx.date);
      const delta = tx.type === 'income' ? tx.amount : -tx.amount;
      if (existing) {
        existing.items.push(tx);
        existing.net += delta;
      } else {
        const label =
          tx.date === today
            ? `Hôm nay · ${formatShortDate(tx.date)}`
            : tx.date === yesterday
            ? `Hôm qua · ${formatShortDate(tx.date)}`
            : formatShortDate(tx.date);
        map.set(tx.date, {label, items: [tx], net: delta});
      }
    }
    return Array.from(map.entries());
  }, [filtered]);

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filtered) {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    }
    return {income, expense, net: income - expense};
  }, [filtered]);

  const currency = state.settings.currency;

  const handleExportCsv = () => {
    if (filtered.length === 0) {
      showToast({type: 'warning', title: 'Không có giao dịch nào để xuất CSV'});
      return;
    }
    downloadCsv(
      `MYLIFE_ThuChi_${getTodayIso()}.csv`,
      ['Ngày', 'Loại', 'Tên giao dịch', 'Danh mục', 'Số tiền', 'Phương thức', 'Ghi chú'],
      filtered.map((tx) => [
        tx.date,
        tx.type === 'income' ? 'Thu nhập' : 'Chi tiêu',
        tx.title,
        tx.category,
        tx.amount,
        tx.paymentMethod || '',
        tx.note || '',
      ]),
    );
    showToast({type: 'success', title: 'Đã xuất báo cáo CSV thu chi'});
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold font-display text-[var(--text-primary)]">Sổ Thu chi</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Ghi chép thu nhập, chi tiêu theo ngày và xuất báo cáo CSV
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingTx(null);
              setModalType('income');
              setModalOpen(true);
            }}
            className="min-h-[40px] px-3.5 rounded-xl bg-[var(--success-soft)] text-[var(--success)] text-xs font-semibold inline-flex items-center gap-1.5 btn-press whitespace-nowrap"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Thêm thu</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingTx(null);
              setModalType('expense');
              setModalOpen(true);
            }}
            className="min-h-[40px] px-3.5 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-semibold inline-flex items-center gap-1.5 btn-press whitespace-nowrap"
          >
            <MinusIcon className="w-3.5 h-3.5" />
            <span>Thêm chi</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="min-h-[40px] px-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[var(--text-primary)] text-xs font-semibold inline-flex items-center gap-1.5 btn-press whitespace-nowrap"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* Unified Ledger Summary Bar */}
      <div className="app-surface rounded-2xl grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-hairline)]">
        <div className="px-5 py-3.5 flex items-center justify-between sm:block">
          <span className="text-xs text-[var(--text-muted)]">Thu nhập (đang lọc)</span>
          <p className="sm:mt-0.5 text-base font-semibold font-mono-tabular text-[var(--success)]">
            +{formatMoney(stats.income, currency)}
          </p>
        </div>
        <div className="px-5 py-3.5 flex items-center justify-between sm:block">
          <span className="text-xs text-[var(--text-muted)]">Chi tiêu (đang lọc)</span>
          <p className="sm:mt-0.5 text-base font-semibold font-mono-tabular text-[var(--danger)]">
            -{formatMoney(stats.expense, currency)}
          </p>
        </div>
        <div className="px-5 py-3.5 flex items-center justify-between sm:block">
          <span className="text-xs text-[var(--text-muted)]">Chênh lệch ròng</span>
          <p
            className={`sm:mt-0.5 text-base font-semibold font-mono-tabular ${
              stats.net >= 0 ? 'text-[var(--accent)]' : 'text-[var(--danger)]'
            }`}
          >
            {stats.net >= 0 ? '+' : ''}
            {formatMoney(stats.net, currency)}
          </p>
        </div>
      </div>

      {/* Compact Filter Toolbar */}
      <div className="app-surface rounded-2xl p-3.5 space-y-2.5">
        <div className="flex flex-col md:flex-row gap-2.5">
          <div className="relative flex-1">
            <SearchIcon className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên giao dịch, danh mục, ghi chú..."
              className="w-full min-h-[40px] pl-9 pr-3.5 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] shrink-0">
            {[
              {id: 'all', label: 'Tất cả'},
              {id: 'income', label: 'Thu'},
              {id: 'expense', label: 'Chi'},
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id as 'all' | TransactionType)}
                className={`min-h-[32px] px-3 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  typeFilter === tab.id
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
            className="min-h-[38px] rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] px-3 text-xs font-medium text-[var(--text-primary)]"
          >
            <option value="month">Theo tháng</option>
            <option value="day">Theo ngày</option>
            <option value="year">Theo năm</option>
            <option value="all">Tất cả thời gian</option>
          </select>

          {periodFilter === 'day' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="min-h-[38px] rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] px-3 text-xs font-mono-tabular text-[var(--text-primary)]"
            />
          )}
          {periodFilter === 'month' && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="min-h-[38px] rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] px-3 text-xs font-mono-tabular text-[var(--text-primary)]"
            />
          )}
          {periodFilter === 'year' && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="min-h-[38px] rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] px-3 text-xs font-mono-tabular text-[var(--text-primary)]"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>
          )}

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="min-h-[38px] rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] px-3 text-xs font-medium text-[var(--text-primary)]"
          >
            <option value="all">Mọi danh mục</option>
            {allCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Date-Grouped Transaction Ledger */}
      <div className="app-surface rounded-2xl overflow-hidden">
        {groupedByDate.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-[var(--text-muted)]">
              {state.transactions.length === 0
                ? 'Chưa có giao dịch thu chi nào được ghi nhận.'
                : 'Không tìm thấy giao dịch phù hợp với bộ lọc hiện tại.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingTx(null);
                setModalType('expense');
                setModalOpen(true);
              }}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-semibold btn-press"
            >
              Ghi giao dịch đầu tiên
            </button>
          </div>
        ) : (
          <div>
            {groupedByDate.map(([dateKey, group]) => (
              <div key={dateKey} className="border-b last:border-b-0 border-[var(--border-hairline)]">
                <div className="px-4 sm:px-5 py-2 bg-[var(--bg-surface-alt)]/70 border-b border-[var(--border-hairline)] flex items-center justify-between text-xs">
                  <span className="font-semibold text-[var(--text-secondary)]">{group.label}</span>
                  <span
                    className={`font-mono-tabular font-medium ${
                      group.net >= 0 ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {group.net >= 0 ? '+' : ''}
                    {formatMoney(group.net, currency)}
                  </span>
                </div>

                <div className="divide-y divide-[var(--border-hairline)]">
                  {group.items.map((tx) => (
                    <div
                      key={tx.id}
                      className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 hover:bg-[var(--bg-surface-alt)]/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
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
                            {tx.category}
                            {tx.paymentMethod ? ` · ${tx.paymentMethod}` : ''}
                            {tx.note ? ` · ${tx.note}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className={`text-sm font-mono-tabular font-semibold whitespace-nowrap mr-1.5 ${
                            tx.type === 'income' ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'}
                          {formatMoney(tx.amount, currency)}
                        </span>
                        <button
                          type="button"
                          aria-label="Chỉnh sửa"
                          onClick={() => {
                            setEditingTx(tx);
                            setModalType(tx.type);
                            setModalOpen(true);
                          }}
                          className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-alt)] btn-press"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Xóa"
                          onClick={() => setConfirmDeleteId(tx.id)}
                          className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] btn-press"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TransactionModal
        open={modalOpen}
        initialType={modalType}
        editing={editingTx}
        onClose={() => {
          setModalOpen(false);
          setEditingTx(null);
        }}
      />

      <ConfirmModal
        open={!!confirmDeleteId}
        title="Xác nhận xóa giao dịch"
        description="Giao dịch này sẽ bị xóa vĩnh viễn và số dư khả dụng sẽ được tính lại."
        confirmLabel="Xóa giao dịch"
        danger
        onConfirm={() => {
          if (confirmDeleteId) deleteTransaction(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
};
