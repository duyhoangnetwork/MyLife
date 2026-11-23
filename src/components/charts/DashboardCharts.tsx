import React, {useMemo, useState} from 'react';
import {CurrencyCode, SavingsDeposit, Transaction} from '../../types/app';
import {formatCompactMoney, formatMoney} from '../../utils/formatters';

interface ChartProps {
  transactions: Transaction[];
  deposits: SavingsDeposit[];
  currency: CurrencyCode;
  monthlyBudget: number;
}

const CATEGORY_COLORS = [
  '#2563EB',
  '#16A34A',
  '#4F46E5',
  '#D97706',
  '#DC2626',
  '#0891B2',
  '#7C3AED',
  '#EA580C',
  '#64748B',
];

function getMonthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  return `T${Number(m)}/${y.slice(-2)}`;
}

function getLastNMonthKeys(n: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

export const IncomeExpenseBarChart: React.FC<Pick<ChartProps, 'transactions' | 'currency'>> = ({
  transactions,
  currency,
}) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const series = useMemo(() => {
    const months = getLastNMonthKeys(4);
    return months.map((ym) => {
      let income = 0;
      let expense = 0;
      for (const tx of transactions) {
        if (getMonthKey(tx.date) === ym) {
          if (tx.type === 'income') income += tx.amount;
          else expense += tx.amount;
        }
      }
      return {ym, label: formatMonthLabel(ym), income, expense};
    });
  }, [transactions]);

  const maxVal = Math.max(1, ...series.flatMap((s) => [s.income, s.expense]));
  const hasAny = series.some((s) => s.income > 0 || s.expense > 0);

  if (!hasAny) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-[var(--text-muted)] text-center px-4">
        Chưa có giao dịch thu chi để vẽ biểu đồ theo tháng.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-3 min-h-[20px]">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
            Thu nhập
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--danger)]" />
            Chi tiêu
          </span>
        </div>
        {activeIdx !== null && (
          <span className="font-mono-tabular text-[var(--text-primary)] font-medium text-[11px]">
            {series[activeIdx].label}: +{formatCompactMoney(series[activeIdx].income, currency)} / -
            {formatCompactMoney(series[activeIdx].expense, currency)}
          </span>
        )}
      </div>

      <svg viewBox="0 0 360 165" className="w-full h-40 overflow-visible" role="img" aria-label="Biểu đồ thu nhập và chi tiêu">
        {[0.5, 1].map((step) => {
          const y = 134 - step * 110;
          return (
            <line
              key={step}
              x1="12"
              y1={y}
              x2="348"
              y2={y}
              stroke="var(--border-hairline)"
              strokeDasharray="3 3"
            />
          );
        })}
        <line x1="12" y1="134" x2="348" y2="134" stroke="var(--border-hairline)" />

        {series.map((item, idx) => {
          const groupX = 32 + idx * 82;
          const incH = Math.max(item.income > 0 ? 4 : 0, (item.income / maxVal) * 110);
          const expH = Math.max(item.expense > 0 ? 4 : 0, (item.expense / maxVal) * 110);
          const dimmed = activeIdx !== null && activeIdx !== idx;
          return (
            <g
              key={item.ym}
              onMouseEnter={() => setActiveIdx(idx)}
              onMouseLeave={() => setActiveIdx(null)}
              onClick={() => setActiveIdx(activeIdx === idx ? null : idx)}
              className="cursor-pointer"
            >
              <rect
                x={groupX}
                y={134 - incH}
                width="16"
                height={incH}
                rx="3"
                fill="var(--success)"
                fillOpacity={dimmed ? 0.35 : 0.88}
              />
              <rect
                x={groupX + 20}
                y={134 - expH}
                width="16"
                height={expH}
                rx="3"
                fill="var(--danger)"
                fillOpacity={dimmed ? 0.35 : 0.85}
              />
              <text
                x={groupX + 18}
                y="154"
                textAnchor="middle"
                className="fill-[var(--text-muted)] text-[11px] font-mono-tabular"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const ExpenseCategoryDonutChart: React.FC<Pick<ChartProps, 'transactions' | 'currency'>> = ({
  transactions,
  currency,
}) => {
  const breakdown = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    for (const tx of transactions) {
      if (tx.type === 'expense') {
        map.set(tx.category, (map.get(tx.category) || 0) + tx.amount);
        total += tx.amount;
      }
    }
    const items = Array.from(map.entries())
      .map(([name, amount], idx) => ({
        name,
        amount,
        percent: total > 0 ? Math.round((amount / total) * 100) : 0,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount);
    return {items, total};
  }, [transactions]);

  if (breakdown.total === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-[var(--text-muted)] text-center px-4">
        Chưa có khoản chi nào để phân tích theo danh mục.
      </div>
    );
  }

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative w-32 h-32 shrink-0">
        <svg viewBox="0 0 132 132" className="w-full h-full -rotate-90" role="img" aria-label="Biểu đồ chi tiêu theo danh mục">
          <circle cx="66" cy="66" r={radius} fill="none" stroke="var(--bg-surface-alt)" strokeWidth="14" />
          {breakdown.items.map((item) => {
            const segLen = (item.amount / breakdown.total) * circumference;
            const dashArray = `${segLen} ${circumference - segLen}`;
            const dashOffset = -offset;
            offset += segLen;
            return (
              <circle
                key={item.name}
                cx="66"
                cy="66"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth="14"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
          <span className="text-[10px] text-[var(--text-muted)]">Tổng chi</span>
          <span className="text-xs font-semibold font-mono-tabular text-[var(--text-primary)]">
            {formatCompactMoney(breakdown.total, currency)}
          </span>
        </div>
      </div>

      <div className="flex-1 w-full space-y-2 max-h-36 overflow-y-auto pr-1">
        {breakdown.items.slice(0, 5).map((item) => (
          <div key={item.name} className="flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor: item.color}} />
              <span className="text-[var(--text-secondary)] truncate">{item.name}</span>
            </div>
            <div className="font-mono-tabular text-[var(--text-primary)] whitespace-nowrap shrink-0">
              {item.percent}% · {formatCompactMoney(item.amount, currency)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SavingsGrowthLineChart: React.FC<Pick<ChartProps, 'deposits' | 'currency'>> = ({
  deposits,
  currency,
}) => {
  const points = useMemo(() => {
    const confirmed = deposits
      .filter((d) => d.status === 'confirmed')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    if (confirmed.length === 0) return [];
    let running = 0;
    return confirmed.map((d) => {
      running += d.amount;
      return {
        label: d.createdAt.slice(5, 10).split('-').reverse().join('/'),
        total: running,
      };
    });
  }, [deposits]);

  if (points.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-xs text-[var(--text-muted)] text-center px-4">
        Chưa có khoản tiết kiệm nào được xác nhận để hiển thị tăng trưởng.
      </div>
    );
  }

  const maxVal = Math.max(1, ...points.map((p) => p.total));
  const width = 340;
  const height = 128;
  const padX = 18;
  const padY = 14;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const coords = points.map((p, i) => {
    const x = points.length === 1 ? padX + innerW / 2 : padX + (i / (points.length - 1)) * innerW;
    const y = padY + innerH - (p.total / maxVal) * innerH;
    return {x, y, ...p};
  });

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${padY + innerH} L ${coords[0].x.toFixed(1)} ${
          padY + innerH
        } Z`
      : '';

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
        <span>Lũy kế quỹ tiết kiệm</span>
        <span className="font-mono-tabular font-semibold text-[var(--accent)]">
          {formatMoney(points[points.length - 1].total, currency)}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height + 18}`} className="w-full h-36" role="img" aria-label="Biểu đồ tăng trưởng tiết kiệm">
        <defs>
          <linearGradient id="savingsAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <line x1={padX} y1={padY + innerH} x2={width - padX} y2={padY + innerH} stroke="var(--border-hairline)" />
        {areaPath && <path d={areaPath} fill="url(#savingsAreaGrad)" />}
        {coords.length > 1 && (
          <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {coords.map((c, idx) => (
          <g key={idx}>
            <circle cx={c.x} cy={c.y} r="3.5" fill="var(--bg-surface)" stroke="var(--accent)" strokeWidth="2" />
            <text x={c.x} y={height + 10} textAnchor="middle" className="fill-[var(--text-muted)] text-[10px] font-mono-tabular">
              {c.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

export const MonthlyExpenseComparisonChart: React.FC<
  Pick<ChartProps, 'transactions' | 'currency' | 'monthlyBudget'>
> = ({transactions, currency, monthlyBudget}) => {
  const months = useMemo(() => {
    const keys = getLastNMonthKeys(4);
    return keys.map((ym) => {
      const expense = transactions
        .filter((t) => t.type === 'expense' && getMonthKey(t.date) === ym)
        .reduce((acc, cur) => acc + cur.amount, 0);
      return {ym, label: formatMonthLabel(ym), expense};
    });
  }, [transactions]);

  const maxVal = Math.max(monthlyBudget || 1, ...months.map((m) => m.expense), 1);
  const hasData = months.some((m) => m.expense > 0);

  if (!hasData) {
    return (
      <div className="h-40 flex items-center justify-center text-xs text-[var(--text-muted)] text-center px-4">
        Chưa có dữ liệu chi tiêu để so sánh giữa các tháng.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>4 tháng gần nhất</span>
        <span className="font-mono-tabular">Ngân sách: {formatCompactMoney(monthlyBudget, currency)}</span>
      </div>
      <div className="space-y-2.5">
        {months.map((m) => {
          const pct = Math.min(100, Math.round((m.expense / maxVal) * 100));
          const overBudget = monthlyBudget > 0 && m.expense > monthlyBudget;
          return (
            <div key={m.ym} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono-tabular text-[var(--text-secondary)]">{m.label}</span>
                <span
                  className={`font-mono-tabular font-medium ${
                    overBudget ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'
                  }`}
                >
                  {formatMoney(m.expense, currency)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--bg-surface-alt)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: overBudget ? 'var(--danger)' : 'var(--accent)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
