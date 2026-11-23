import React from 'react';
import {useApp} from '../../context/AppContext';
import {TabId} from '../../types/app';
import {OfflineIndicator, PWAInstallButton} from '../common/PWAWidgets';
import {
  DashboardIcon,
  FinanceIcon,
  LockIcon,
  LogoutIcon,
  PlannerIcon,
  ProfileIcon,
  SavingsIcon,
  SettingsIcon,
} from '../icons/CustomIcons';

const NAV_ITEMS: {id: TabId; label: string; icon: React.FC<{className?: string; filled?: boolean}>}[] = [
  {id: 'dashboard', label: 'Tổng quan', icon: DashboardIcon},
  {id: 'finance', label: 'Thu chi', icon: FinanceIcon},
  {id: 'savings', label: 'Tiết kiệm', icon: SavingsIcon},
  {id: 'planner', label: 'Kế hoạch', icon: PlannerIcon},
  {id: 'profile', label: 'Cá nhân', icon: ProfileIcon},
];

const PAGE_TITLES: Record<TabId, string> = {
  dashboard: 'Tổng quan',
  finance: 'Thu chi',
  savings: 'Tiết kiệm',
  planner: 'Kế hoạch',
  profile: 'Cá nhân',
  settings: 'Cài đặt',
};

export const AppShell: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {activeTab, setActiveTab, state, lockApp, logoutAccount} = useApp();
  const isGlass = state.settings.theme === 'glass' && state.settings.glassEffectsEnabled;

  return (
    <div className="min-h-dvh relative flex flex-col lg:flex-row">
      {/* Desktop Left Sidebar (240px) */}
      <aside
        className={`hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 z-30 border-r border-[var(--border-hairline)] p-4 justify-between ${
          isGlass ? 'glass-surface rounded-none border-t-0 border-b-0 border-l-0' : 'bg-[var(--bg-surface)]'
        }`}
      >
        <div>
          <div className="px-2.5 py-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="font-display text-base font-bold tracking-tight text-[var(--text-primary)] whitespace-nowrap btn-press"
            >
              MY LIFE
            </button>
          </div>

          <nav className="mt-5 space-y-1" aria-label="Điều hướng chính">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full min-h-[42px] flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] transition-colors whitespace-nowrap btn-press ${
                    active
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                      : 'text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-surface-alt)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" filled={active} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="pt-2.5 mt-2.5 border-t border-[var(--border-hairline)]">
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`w-full min-h-[42px] flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] transition-colors whitespace-nowrap btn-press ${
                  activeTab === 'settings'
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                    : 'text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-surface-alt)] hover:text-[var(--text-primary)]'
                }`}
              >
                <SettingsIcon className="w-[18px] h-[18px] shrink-0" />
                <span>Cài đặt</span>
              </button>
            </div>
          </nav>
        </div>

        <div className="space-y-2.5 pt-3 border-t border-[var(--border-hairline)]">
          <PWAInstallButton />
          {state.settings.pinEnabled && (
            <button
              type="button"
              onClick={lockApp}
              className="w-full min-h-[40px] flex items-center justify-center gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface-alt)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] btn-press"
            >
              <LockIcon className="w-3.5 h-3.5" />
              <span>Khóa ứng dụng</span>
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="flex-1 min-w-0 flex items-center gap-2.5 p-2 rounded-xl hover:bg-[var(--bg-surface-alt)] transition-colors text-left btn-press"
            >
              <img
                src={state.profile.avatar}
                alt={state.profile.name}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover border border-[var(--border-hairline)] shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{state.profile.name}</p>
                <p className="text-[11px] text-[var(--text-muted)] truncate">{state.profile.email}</p>
              </div>
            </button>
            <button
              type="button"
              onClick={logoutAccount}
              title="Đăng xuất"
              aria-label="Đăng xuất tài khoản"
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-soft)] transition-colors shrink-0 btn-press"
            >
              <LogoutIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Compact Sticky Top Navigation (48px) */}
      <header className="lg:hidden sticky top-0 z-30 h-12 pt-safe px-4 flex items-center justify-between glass-surface border-t-0 border-l-0 border-r-0 rounded-none">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className="font-display text-sm font-bold tracking-tight text-[var(--text-primary)] whitespace-nowrap shrink-0 btn-press"
        >
          MY LIFE
        </button>

        <span className="text-[13px] font-semibold text-[var(--text-secondary)] truncate px-2">
          {PAGE_TITLES[activeTab]}
        </span>

        <div className="flex items-center gap-0.5 shrink-0">
          {state.settings.pinEnabled && (
            <button
              type="button"
              onClick={lockApp}
              aria-label="Khóa ứng dụng"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] btn-press"
            >
              <LockIcon className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            aria-label="Mở cài đặt"
            className={`min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl transition-colors btn-press ${
              activeTab === 'settings' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-secondary)]'
            }`}
          >
            <SettingsIcon className="w-[18px] h-[18px]" />
          </button>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="relative z-10 flex-1 lg:pl-60 pb-24 lg:pb-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
          <div key={activeTab} className="page-enter">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Fixed Bottom Taskbar (5 Main Tabs) */}
      <nav
        aria-label="Thanh điều hướng di động"
        className={`lg:hidden fixed z-30 glass-surface pb-safe ${
          isGlass
            ? 'bottom-2.5 left-3 right-3 rounded-2xl'
            : 'bottom-0 left-0 right-0 rounded-none border-b-0 border-l-0 border-r-0'
        }`}
      >
        <div className="grid grid-cols-5 items-center h-[58px]">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors btn-press ${
                  active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="w-5 h-5" filled={active} />
                <span className={`text-[10px] tracking-tight whitespace-nowrap ${active ? 'font-semibold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <OfflineIndicator />
    </div>
  );
};
