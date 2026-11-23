import {AccentColorId, AppSettings, CurrencyCode, FontScaleId, PlanItem, PlanStatus, ThemeMode} from '../types/app';

export const ACCENT_PALETTES: Record<
  AccentColorId,
  {label: string; light: string; lightHover: string; dark: string; darkHover: string; fgLight: string; fgDark: string}
> = {
  sky: {
    label: 'Xanh dương',
    light: '#2563EB',
    lightHover: '#1D4ED8',
    dark: '#4F8BFF',
    darkHover: '#3B7BFF',
    fgLight: '#FFFFFF',
    fgDark: '#0B1220',
  },
  emerald: {
    label: 'Xanh ngọc',
    light: '#15803D',
    lightHover: '#166534',
    dark: '#34D399',
    darkHover: '#10B981',
    fgLight: '#FFFFFF',
    fgDark: '#052E16',
  },
  indigo: {
    label: 'Chàm trầm',
    light: '#4338CA',
    lightHover: '#3730A3',
    dark: '#818CF8',
    darkHover: '#6366F1',
    fgLight: '#FFFFFF',
    fgDark: '#1E1B4B',
  },
  amber: {
    label: 'Vàng hổ phách',
    light: '#B45309',
    lightHover: '#92400E',
    dark: '#FBBF24',
    darkHover: '#F59E0B',
    fgLight: '#FFFFFF',
    fgDark: '#451A03',
  },
  rose: {
    label: 'Đỏ san hô',
    light: '#BE123C',
    lightHover: '#9F1239',
    dark: '#FB7185',
    darkHover: '#F43F5E',
    fgLight: '#FFFFFF',
    fgDark: '#4C0519',
  },
};

export function formatMoney(amount: number, currency: CurrencyCode = 'VND'): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  if (currency === 'VND') {
    return `${new Intl.NumberFormat('vi-VN', {maximumFractionDigits: 0}).format(Math.round(safeAmount))} ₫`;
  }
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 2}).format(safeAmount);
  }
  return new Intl.NumberFormat('de-DE', {style: 'currency', currency: 'EUR', maximumFractionDigits: 2}).format(safeAmount);
}

export function formatCompactMoney(amount: number, currency: CurrencyCode = 'VND'): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (currency === 'VND') {
    if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1).replace('.0', '')} Tỷ`;
    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1).replace('.0', '')} Tr`;
    if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}K`;
    return `${sign}${Math.round(abs)}₫`;
  }
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
  return formatMoney(amount, currency);
}

export function getGreetingByTime(date = new Date()): string {
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'Chào buổi sáng';
  if (h >= 11 && h < 14) return 'Chào buổi trưa';
  if (h >= 14 && h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export function formatVietnameseDate(date = new Date()): string {
  const formatted = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatShortDate(isoDate: string): string {
  if (!isoDate) return '';
  const parts = isoDate.split('T')[0].split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function formatDateTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getBillingCycleRange(cycleStartDay: number, reference = new Date()): {start: string; end: string; label: string} {
  const clampedStart = Math.max(1, Math.min(28, cycleStartDay || 1));
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const day = reference.getDate();

  let startYear = year;
  let startMonth = month;
  if (day < clampedStart) {
    startMonth -= 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear -= 1;
    }
  }
  const startDate = new Date(startYear, startMonth, clampedStart);
  const endDate = new Date(startYear, startMonth + 1, clampedStart - 1);

  const toIso = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

  return {
    start: toIso(startDate),
    end: toIso(endDate),
    label: `${formatShortDate(toIso(startDate))} – ${formatShortDate(toIso(endDate))}`,
  };
}

export function getEffectivePlanStatus(plan: PlanItem, todayIso = getTodayIso()): PlanStatus {
  if (plan.status === 'done') return 'done';
  if (plan.dueDate && plan.dueDate < todayIso) return 'overdue';
  return plan.status;
}

export function generateId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`mylife-salt:${pin}`);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (hash << 5) - hash + data[i];
    hash |= 0;
  }
  return String(hash);
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvLines = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))];
  const csvContent = `\uFEFF${csvLines.join('\r\n')}`;
  const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function applyThemeToDocument(settings: AppSettings): void {
  const root = document.documentElement;
  const mode: ThemeMode = settings.theme;
  root.classList.remove('dark', 'light', 'theme-glass');
  if (mode === 'dark') {
    root.classList.add('dark');
  } else if (mode === 'glass') {
    root.classList.add('light', 'theme-glass');
  } else {
    root.classList.add('light');
  }

  try {
    localStorage.setItem('mylife_theme_cache', mode);
  } catch {
    // Ignore storage errors in restricted contexts
  }

  const palette = ACCENT_PALETTES[settings.accentColor] || ACCENT_PALETTES.sky;
  const isDark = mode === 'dark';
  const accent = isDark ? palette.dark : palette.light;
  const accentHover = isDark ? palette.darkHover : palette.lightHover;
  const accentFg = isDark ? palette.fgDark : palette.fgLight;
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-hover', accentHover);
  root.style.setProperty('--accent-soft', isDark ? `${accent}24` : `${accent}16`);
  root.style.setProperty('--accent-fg', accentFg);

  const scaleMap: Record<FontScaleId, string> = {sm: '0.94', md: '1', lg: '1.06'};
  root.style.setProperty('--app-font-scale', scaleMap[settings.fontScale] || '1');

  root.setAttribute('data-transitions', settings.transitionsEnabled ? 'on' : 'off');
  root.setAttribute('data-glass', settings.glassEffectsEnabled ? 'on' : 'off');

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', mode === 'dark' ? '#101318' : mode === 'glass' ? '#EAEFF6' : '#F5F6F8');
  }
}
