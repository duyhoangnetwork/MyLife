import React, {useMemo, useState} from 'react';
import {ConfirmModal} from '../components/common/Feedback';
import {
  BellIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EditIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from '../components/icons/CustomIcons';
import {PlanModal} from '../components/modals/QuickModals';
import {useApp} from '../context/AppContext';
import {PlanItem, PlanStatus, PlanType} from '../types/app';
import {formatShortDate, getEffectivePlanStatus, getTodayIso} from '../utils/formatters';

type ViewMode = 'list' | 'calendar' | 'timeline' | 'stats';
type PeriodScope = 'all' | 'today' | 'week' | 'month';

const PLAN_TYPES: PlanType[] = [
  'Công việc',
  'Học tập',
  'Mục tiêu cá nhân',
  'Kế hoạch tài chính',
  'Thói quen hàng ngày',
];

const STATUS_LABELS: Record<PlanStatus, string> = {
  todo: 'Chưa làm',
  in_progress: 'Đang làm',
  done: 'Hoàn thành',
  overdue: 'Quá hạn',
};

const PRIORITY_META: Record<PlanItem['priority'], {label: string; cls: string}> = {
  high: {label: 'Cao', cls: 'bg-[var(--danger-soft)] text-[var(--danger)]'},
  medium: {label: 'Trung bình', cls: 'bg-[var(--warning-soft)] text-[var(--warning)]'},
  low: {label: 'Thấp', cls: 'bg-[var(--bg-surface-alt)] text-[var(--text-muted)]'},
};

export const PlannerPage: React.FC = () => {
  const {state, togglePlanDone, deletePlan, showToast} = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [periodScope, setPeriodScope] = useState<PeriodScope>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | PlanType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | PlanStatus>('all');
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedCalDate, setSelectedCalDate] = useState(getTodayIso());

  const todayIso = getTodayIso();

  const filteredPlans = useMemo(() => {
    const q = search.trim().toLowerCase();
    const todayDate = new Date();
    const weekEnd = new Date(todayDate);
    weekEnd.setDate(todayDate.getDate() + 7);
    const weekEndIso = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(
      weekEnd.getDate(),
    ).padStart(2, '0')}`;
    const currentYm = todayIso.slice(0, 7);

    return [...state.plans]
      .filter((p) => {
        const effStatus = getEffectivePlanStatus(p, todayIso);
        if (typeFilter !== 'all' && p.type !== typeFilter) return false;
        if (statusFilter !== 'all' && effStatus !== statusFilter) return false;
        if (periodScope === 'today' && p.dueDate !== todayIso) return false;
        if (periodScope === 'week' && (p.dueDate < todayIso || p.dueDate > weekEndIso)) return false;
        if (periodScope === 'month' && p.dueDate.slice(0, 7) !== currentYm) return false;
        if (q) {
          const hay = `${p.title} ${p.type} ${p.description || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || (a.dueTime || '').localeCompare(b.dueTime || ''));
  }, [state.plans, typeFilter, statusFilter, periodScope, search, todayIso]);

  const progressStats = useMemo(() => {
    const counts: Record<PlanStatus, number> = {todo: 0, in_progress: 0, done: 0, overdue: 0};
    for (const p of state.plans) {
      counts[getEffectivePlanStatus(p, todayIso)] += 1;
    }
    const total = state.plans.length;
    const completionPct = total > 0 ? Math.round((counts.done / total) * 100) : 0;
    const byType = PLAN_TYPES.map((t) => {
      const items = state.plans.filter((p) => p.type === t);
      const done = items.filter((p) => p.status === 'done').length;
      return {type: t, total: items.length, done};
    });
    return {counts, total, completionPct, byType};
  }, [state.plans, todayIso]);

  const calendarGrid = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const cells: {iso: string | null; day: number | null}[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push({iso: null, day: null});
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({iso, day: d});
    }
    return cells;
  }, [calYear, calMonth]);

  const groupedTimeline = useMemo(() => {
    const map = new Map<string, PlanItem[]>();
    for (const p of filteredPlans) {
      const arr = map.get(p.dueDate) || [];
      arr.push(p);
      map.set(p.dueDate, arr);
    }
    return Array.from(map.entries());
  }, [filteredPlans]);

  const handleCheckReminders = () => {
    const reminders = state.plans.filter((p) => p.reminderEnabled && p.status !== 'done' && p.dueDate <= todayIso);
    if (reminders.length === 0) {
      showToast({type: 'success', title: 'Không có nhắc nhở khẩn cấp nào hôm nay'});
    } else {
      showToast({
        type: 'warning',
        title: `Có ${reminders.length} công việc đến hạn / quá hạn`,
        description: reminders.map((r) => r.title).slice(0, 2).join(', '),
      });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold font-display text-[var(--text-primary)]">Kế hoạch cá nhân</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Quản lý công việc, lịch tháng, thói quen và theo dõi tiến độ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCheckReminders}
            className="min-h-[40px] px-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-xs font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5 btn-press whitespace-nowrap"
          >
            <BellIcon className="w-3.5 h-3.5" />
            <span>Nhắc nhở</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingPlan(null);
              setModalOpen(true);
            }}
            className="min-h-[40px] px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-semibold inline-flex items-center gap-1.5 btn-press whitespace-nowrap"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Tạo kế hoạch</span>
          </button>
        </div>
      </div>

      {/* View Mode Segmented Control */}
      <div className="grid grid-cols-4 max-w-md gap-1 p-1 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)]">
        {[
          {id: 'list', label: 'Danh sách'},
          {id: 'calendar', label: 'Lịch tháng'},
          {id: 'timeline', label: 'Timeline'},
          {id: 'stats', label: 'Tiến độ'},
        ].map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setViewMode(v.id as ViewMode)}
            className={`min-h-[34px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              viewMode === v.id
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {(viewMode === 'list' || viewMode === 'timeline') && (
        <div className="app-surface rounded-2xl p-3.5 flex flex-col md:flex-row gap-2.5">
          <div className="relative flex-1">
            <SearchIcon className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kế hoạch, công việc, thói quen..."
              className="w-full min-h-[40px] pl-9 pr-3.5 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] text-sm text-[var(--text-primary)]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={periodScope}
              onChange={(e) => setPeriodScope(e.target.value as PeriodScope)}
              className="min-h-[40px] rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] px-3 text-xs font-medium text-[var(--text-primary)]"
            >
              <option value="all">Mọi thời gian</option>
              <option value="today">Hôm nay</option>
              <option value="week">7 ngày tới</option>
              <option value="month">Tháng này</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | PlanType)}
              className="min-h-[40px] rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] px-3 text-xs font-medium text-[var(--text-primary)]"
            >
              <option value="all">Mọi phân loại</option>
              {PLAN_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | PlanStatus)}
              className="min-h-[40px] rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] px-3 text-xs font-medium text-[var(--text-primary)]"
            >
              <option value="all">Mọi trạng thái</option>
              <option value="todo">Chưa làm</option>
              <option value="in_progress">Đang làm</option>
              <option value="done">Hoàn thành</option>
              <option value="overdue">Quá hạn</option>
            </select>
          </div>
        </div>
      )}

      {/* VIEW 1: PRODUCTIVITY TASK LIST */}
      {viewMode === 'list' && (
        <div className="app-surface rounded-2xl overflow-hidden">
          {filteredPlans.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm text-[var(--text-muted)]">
                {state.plans.length === 0
                  ? 'Chưa có kế hoạch cá nhân nào.'
                  : 'Không có kế hoạch nào khớp bộ lọc hiện tại.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingPlan(null);
                  setModalOpen(true);
                }}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-semibold btn-press"
              >
                Tạo kế hoạch mới
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-hairline)]">
              {filteredPlans.map((plan) => {
                const effStatus = getEffectivePlanStatus(plan, todayIso);
                const priority = PRIORITY_META[plan.priority];
                const isOverdue = effStatus === 'overdue';
                const isToday = plan.dueDate === todayIso && plan.status !== 'done';

                return (
                  <div
                    key={plan.id}
                    className="px-4 sm:px-5 py-3.5 flex items-start sm:items-center justify-between gap-3 hover:bg-[var(--bg-surface-alt)]/35 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        type="button"
                        aria-label={plan.status === 'done' ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
                        onClick={() => togglePlanDone(plan.id)}
                        className={`mt-0.5 w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center shrink-0 transition-all btn-press ${
                          plan.status === 'done'
                            ? 'bg-[var(--success)] border-[var(--success)] text-white'
                            : 'border-[var(--text-muted)] hover:border-[var(--accent)]'
                        }`}
                      >
                        {plan.status === 'done' && <CheckIcon className="w-3 h-3" />}
                      </button>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={`text-sm font-medium ${
                              plan.status === 'done'
                                ? 'line-through text-[var(--text-muted)]'
                                : 'text-[var(--text-primary)]'
                            }`}
                          >
                            {plan.title}
                          </p>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${priority.cls}`}>
                            {priority.label}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)] mt-1">
                          <span>{plan.type}</span>
                          <span>·</span>
                          <span
                            className={`font-mono-tabular font-medium ${
                              isOverdue
                                ? 'text-[var(--danger)]'
                                : isToday
                                ? 'text-[var(--accent)]'
                                : 'text-[var(--text-secondary)]'
                            }`}
                          >
                            {formatShortDate(plan.dueDate)}
                            {plan.dueTime ? ` ${plan.dueTime}` : ''}
                          </span>
                          {effStatus !== 'todo' && (
                            <>
                              <span>·</span>
                              <span
                                className={
                                  effStatus === 'done'
                                    ? 'text-[var(--success)] font-medium'
                                    : effStatus === 'overdue'
                                    ? 'text-[var(--danger)] font-medium'
                                    : 'text-[var(--accent)] font-medium'
                                }
                              >
                                {STATUS_LABELS[effStatus]}
                              </span>
                            </>
                          )}
                        </div>

                        {plan.description && (
                          <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{plan.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        aria-label="Sửa kế hoạch"
                        onClick={() => {
                          setEditingPlan(plan);
                          setModalOpen(true);
                        }}
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-alt)] btn-press"
                      >
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        aria-label="Xóa kế hoạch"
                        onClick={() => setDeleteId(plan.id)}
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] btn-press"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: MINIMALIST MONTHLY CALENDAR */}
      {viewMode === 'calendar' && (
        <div className="app-surface rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-hairline)]">
          <div className="p-4 sm:p-5 lg:col-span-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold font-display text-[var(--text-primary)]">
                Tháng {calMonth + 1}, {calYear}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (calMonth === 0) {
                      setCalMonth(11);
                      setCalYear((y) => y - 1);
                    } else setCalMonth((m) => m - 1);
                  }}
                  aria-label="Tháng trước"
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-[var(--bg-surface-alt)] text-[var(--text-primary)] btn-press"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (calMonth === 11) {
                      setCalMonth(0);
                      setCalYear((y) => y + 1);
                    } else setCalMonth((m) => m + 1);
                  }}
                  aria-label="Tháng sau"
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-[var(--bg-surface-alt)] text-[var(--text-primary)] btn-press"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-[var(--text-muted)] mb-2">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarGrid.map((cell, idx) => {
                if (!cell.iso || !cell.day) return <div key={`empty_${idx}`} className="h-11 sm:h-12" />;
                const dayPlans = state.plans.filter((p) => p.dueDate === cell.iso);
                const isSelected = selectedCalDate === cell.iso;
                const isToday = cell.iso === todayIso;
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => setSelectedCalDate(cell.iso!)}
                    className={`h-11 sm:h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-colors btn-press ${
                      isSelected
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)] font-semibold'
                        : isToday
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-alt)]'
                    }`}
                  >
                    <span className="text-xs font-mono-tabular">{cell.day}</span>
                    {dayPlans.length > 0 && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-[var(--accent-fg)]' : 'bg-[var(--accent)]'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 sm:p-5 lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold font-display text-[var(--text-primary)]">
                Ngày {formatShortDate(selectedCalDate)}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingPlan(null);
                  setModalOpen(true);
                }}
                className="text-xs font-semibold text-[var(--accent)]"
              >
                + Thêm
              </button>
            </div>
            {state.plans.filter((p) => p.dueDate === selectedCalDate).length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-8 text-center">Không có kế hoạch trong ngày này.</p>
            ) : (
              <div className="divide-y divide-[var(--border-hairline)]">
                {state.plans
                  .filter((p) => p.dueDate === selectedCalDate)
                  .map((p) => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-medium truncate ${
                            p.status === 'done' ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
                          }`}
                        >
                          {p.title}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {p.type} · {p.dueTime || 'Cả ngày'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => togglePlanDone(p.id)}
                        className="min-h-[32px] px-2.5 rounded-lg bg-[var(--bg-surface-alt)] text-[var(--accent)] text-[11px] font-semibold shrink-0"
                      >
                        {p.status === 'done' ? 'Mở lại' : 'Xong'}
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: TIMELINE */}
      {viewMode === 'timeline' && (
        <div className="app-surface rounded-2xl p-5 sm:p-6">
          {groupedTimeline.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-8">Chưa có kế hoạch để hiển thị Timeline.</p>
          ) : (
            <div className="space-y-6">
              {groupedTimeline.map(([dateKey, items]) => (
                <div key={dateKey} className="relative pl-5 border-l border-[var(--border-hairline)] space-y-2.5">
                  <span className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
                  <h3 className="text-xs font-semibold font-mono-tabular text-[var(--accent)]">
                    {formatShortDate(dateKey)} {dateKey === todayIso ? '· Hôm nay' : ''}
                  </h3>
                  <div className="divide-y divide-[var(--border-hairline)] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
                    {items.map((plan) => {
                      const eff = getEffectivePlanStatus(plan, todayIso);
                      return (
                        <div key={plan.id} className="px-4 py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p
                              className={`text-sm font-medium ${
                                plan.status === 'done'
                                  ? 'line-through text-[var(--text-muted)]'
                                  : 'text-[var(--text-primary)]'
                              }`}
                            >
                              {plan.title}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {plan.dueTime || '--:--'} · {plan.type} · {STATUS_LABELS[eff]}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => togglePlanDone(plan.id)}
                            className="min-h-[34px] px-3 rounded-lg bg-[var(--bg-surface-alt)] text-xs font-medium text-[var(--text-primary)] shrink-0 btn-press"
                          >
                            {plan.status === 'done' ? 'Hoàn tác' : 'Hoàn thành'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: PROGRESS STATS */}
      {viewMode === 'stats' && (
        <div className="space-y-4">
          <div className="app-surface rounded-2xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 divide-x divide-[var(--border-hairline)]">
            <div className="p-4 sm:p-5">
              <span className="text-xs text-[var(--text-muted)]">Tỷ lệ hoàn thành</span>
              <p className="mt-1 text-2xl font-semibold font-mono-tabular text-[var(--accent)]">
                {progressStats.completionPct}%
              </p>
            </div>
            <div className="p-4 sm:p-5">
              <span className="text-xs text-[var(--text-muted)]">Đã hoàn thành</span>
              <p className="mt-1 text-2xl font-semibold font-mono-tabular text-[var(--success)]">
                {progressStats.counts.done}
              </p>
            </div>
            <div className="p-4 sm:p-5">
              <span className="text-xs text-[var(--text-muted)]">Đang làm / Chờ</span>
              <p className="mt-1 text-2xl font-semibold font-mono-tabular text-[var(--text-primary)]">
                {progressStats.counts.in_progress + progressStats.counts.todo}
              </p>
            </div>
            <div className="p-4 sm:p-5">
              <span className="text-xs text-[var(--text-muted)]">Quá hạn</span>
              <p className="mt-1 text-2xl font-semibold font-mono-tabular text-[var(--danger)]">
                {progressStats.counts.overdue}
              </p>
            </div>
          </div>

          <div className="app-surface rounded-2xl p-5 space-y-3.5">
            <h2 className="text-sm font-semibold font-display text-[var(--text-primary)]">Tiến độ theo phân loại</h2>
            <div className="space-y-3">
              {progressStats.byType.map((item) => {
                const pct = item.total > 0 ? Math.round((item.done / item.total) * 100) : 0;
                return (
                  <div key={item.type} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[var(--text-primary)]">{item.type}</span>
                      <span className="font-mono-tabular text-[var(--text-muted)]">
                        {item.done}/{item.total} ({pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--bg-surface-alt)] overflow-hidden">
                      <div className="h-full rounded-full" style={{width: `${pct}%`, backgroundColor: 'var(--accent)'}} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <PlanModal
        open={modalOpen}
        editing={editingPlan}
        onClose={() => {
          setModalOpen(false);
          setEditingPlan(null);
        }}
      />

      <ConfirmModal
        open={!!deleteId}
        title="Xóa kế hoạch"
        description="Kế hoạch này sẽ bị xóa khỏi danh sách và lịch cá nhân."
        confirmLabel="Xóa"
        danger
        onConfirm={() => {
          if (deleteId) deletePlan(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
