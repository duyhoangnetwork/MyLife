/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {AuthScreen} from './components/auth/AuthScreen';
import {LocalMigrationModal} from './components/auth/LocalMigrationModal';
import {ToastStack} from './components/common/Feedback';
import {PinLockOverlay} from './components/common/PinLockOverlay';
import {AppShell} from './components/layout/AppShell';
import {AppProvider, useApp} from './context/AppContext';
import {DashboardPage} from './pages/DashboardPage';
import {FinancePage} from './pages/FinancePage';
import {PlannerPage} from './pages/PlannerPage';
import {ProfilePage} from './pages/ProfilePage';
import {SavingsPage} from './pages/SavingsPage';
import {SettingsPage} from './pages/SettingsPage';

const MainRouter: React.FC = () => {
  const {activeTab, authChecked, authUser, isLoaded} = useApp();

  if (!authChecked || (authUser && !isLoaded)) {
    return (
      <div className="min-h-dvh bg-[var(--bg-canvas)] flex">
        <div className="hidden lg:flex lg:w-[240px] shrink-0 border-r border-[var(--border-hairline)] p-5 flex-col gap-4">
          <div className="skeleton h-8 w-36" />
          <div className="space-y-2 mt-4">
            <div className="skeleton h-10 w-full rounded-xl" />
            <div className="skeleton h-10 w-full rounded-xl" />
            <div className="skeleton h-10 w-full rounded-xl" />
            <div className="skeleton h-10 w-full rounded-xl" />
            <div className="skeleton h-10 w-full rounded-xl" />
          </div>
        </div>
        <div className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="skeleton h-6 w-48" />
              <div className="skeleton h-4 w-32" />
            </div>
            <div className="skeleton h-10 w-10 rounded-full" />
          </div>
          <div className="app-surface rounded-2xl p-6 space-y-5">
            <div className="skeleton h-4 w-28" />
            <div className="skeleton h-10 w-56" />
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[var(--border-hairline)]">
              <div className="skeleton h-12 w-full" />
              <div className="skeleton h-12 w-full" />
              <div className="skeleton h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return <AuthScreen />;
  }

  return (
    <AppShell>
      {activeTab === 'dashboard' && <DashboardPage />}
      {activeTab === 'finance' && <FinancePage />}
      {activeTab === 'savings' && <SavingsPage />}
      {activeTab === 'planner' && <PlannerPage />}
      {activeTab === 'profile' && <ProfilePage />}
      {activeTab === 'settings' && <SettingsPage />}
      <LocalMigrationModal />
    </AppShell>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainRouter />
      <ToastStack />
      <PinLockOverlay />
    </AppProvider>
  );
}
