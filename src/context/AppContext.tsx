import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActiveSessionInfo,
  AppDatabaseState,
  AppSettings,
  AuthenticatedUser,
  BankAccount,
  PlanItem,
  SavingsDeposit,
  SavingsGoal,
  TabId,
  ToastMessage,
  Transaction,
  UserProfile,
} from '../types/app';
import {
  applyThemeToDocument,
  generateId,
  getBillingCycleRange,
  getTodayIso,
  hashPin,
} from '../utils/formatters';
import {
  createInitialEmptyState,
  createSampleDatabaseState,
  loadUserDevicePin,
  markLegacyHandledForUser,
  readLegacyLocalDatabase,
  saveUserDevicePin,
} from '../services/storage';
import {
  ApiError,
  authApi,
  banksApi,
  plansApi,
  profileApi,
  savingsApi,
  setUnauthorizedHandler,
  syncApi,
  txApi,
} from '../services/api';

interface FinancialSummary {
  cycleLabel: string;
  monthlyIncome: number;
  monthlyExpense: number;
  totalIncome: number;
  totalExpense: number;
  totalSavings: number;
  pendingSavingsAmount: number;
  spendingBalance: number;
  totalAssets: number;
  budgetUsagePercent: number;
}

interface AppContextValue {
  authUser: AuthenticatedUser | null;
  authChecked: boolean;
  authNotice: string | null;
  clearAuthNotice: () => void;
  state: AppDatabaseState;
  isLoaded: boolean;
  isLocked: boolean;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  summary: FinancialSummary;
  toasts: ToastMessage[];
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
  // Auth lifecycle
  loginWithEmail: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logoutAccount: () => Promise<void>;
  refreshSessionAndData: () => Promise<void>;
  fetchActiveSessions: () => Promise<ActiveSessionInfo[]>;
  revokeSession: (payload: {sessionId?: string; revokeOthers?: boolean}) => Promise<void>;
  changeAccountPassword: (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => Promise<void>;
  deleteAccountPermanently: (payload: {password: string; confirmPhrase: string}) => Promise<void>;
  // Legacy migration
  legacyLocalData: AppDatabaseState | null;
  importLegacyLocalData: () => Promise<void>;
  dismissLegacyMigration: (clearLocalCopy?: boolean) => Promise<void>;
  // Transactions
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => void;
  deleteTransaction: (id: string) => void;
  // Savings
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'currentAmount' | 'createdAt'>) => void;
  updateSavingsGoal: (id: string, patch: Partial<Omit<SavingsGoal, 'id' | 'currentAmount' | 'createdAt'>>) => void;
  deleteSavingsGoal: (id: string) => void;
  createPendingDeposit: (deposit: Omit<SavingsDeposit, 'id' | 'status' | 'verificationMethod' | 'createdAt'>) => SavingsDeposit;
  confirmDepositManually: (depositId: string) => void;
  markDepositFailed: (depositId: string) => void;
  reconcileDepositViaWebhook: (depositId: string, webhookUrl: string) => Promise<boolean>;
  // Plans
  addPlan: (plan: Omit<PlanItem, 'id' | 'createdAt'>) => void;
  updatePlan: (id: string, patch: Partial<Omit<PlanItem, 'id' | 'createdAt'>>) => void;
  deletePlan: (id: string) => void;
  togglePlanDone: (id: string) => void;
  // Bank accounts
  addBankAccount: (account: Omit<BankAccount, 'id'>) => void;
  updateBankAccount: (id: string, patch: Partial<Omit<BankAccount, 'id'>>) => void;
  deleteBankAccount: (id: string) => void;
  setDefaultBankAccount: (id: string) => void;
  // Profile & Settings
  updateProfile: (patch: Partial<UserProfile>) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  // Data lifecycle
  loadSampleData: () => void;
  restoreFromJson: (data: AppDatabaseState) => void;
  wipeAllData: () => Promise<void>;
  // Device PIN & session helpers
  unlockWithPin: (pin: string) => Promise<boolean>;
  lockApp: () => void;
  setPinCode: (pin: string) => Promise<void>;
  disablePinCode: () => void;
  rotateSession: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function recalculateGoalBalances(goals: SavingsGoal[], deposits: SavingsDeposit[]): SavingsGoal[] {
  const verifiedTotals = new Map<string, number>();
  for (const dep of deposits) {
    if (dep.status === 'confirmed') {
      verifiedTotals.set(dep.goalId, (verifiedTotals.get(dep.goalId) || 0) + dep.amount);
    }
  }
  return goals.map((goal) => ({
    ...goal,
    currentAmount: verifiedTotals.get(goal.id) || 0,
  }));
}

export const AppProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [authUser, setAuthUser] = useState<AuthenticatedUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [state, setState] = useState<AppDatabaseState>(() => createInitialEmptyState());
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [activeTab, setActiveTabState] = useState<TabId>('dashboard');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [legacyLocalData, setLegacyLocalData] = useState<AppDatabaseState | null>(null);

  const pendingBankResolutionRef = useRef<Map<string, Promise<string>>>(new Map());
  const pendingGoalResolutionRef = useRef<Map<string, Promise<string>>>(new Map());
  const pendingDepositResolutionRef = useRef<Map<string, Promise<string>>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastMessage, 'id'>) => {
      const id = generateId('toast');
      setToasts((prev) => [...prev.slice(-3), {...toast, id}]);
      setTimeout(() => {
        dismissToast(id);
      }, 4200);
    },
    [dismissToast],
  );

  const clearAuthNotice = useCallback(() => setAuthNotice(null), []);

  const handleSessionExpired = useCallback(() => {
    setAuthUser((prev) => {
      if (prev) {
        setAuthNotice('Phiên đăng nhập đã hết hạn hoặc đã bị thu hồi. Vui lòng đăng nhập lại.');
      }
      return null;
    });
    setState(createInitialEmptyState());
    setIsLocked(false);
    setLegacyLocalData(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(handleSessionExpired);
    return () => setUnauthorizedHandler(null);
  }, [handleSessionExpired]);

  const hydrateAuthenticatedUser = useCallback(
    async (user: AuthenticatedUser, databaseState: AppDatabaseState) => {
      const devicePin = await loadUserDevicePin(user.id);
      const syncedGoals = recalculateGoalBalances(
        databaseState.savingsGoals,
        databaseState.savingsDeposits,
      );
      const normalized: AppDatabaseState = {
        ...databaseState,
        savingsGoals: syncedGoals,
        settings: {
          ...databaseState.settings,
          pinEnabled: devicePin.pinEnabled,
          pinHash: devicePin.pinHash,
        },
      };

      setAuthUser(user);
      setState(normalized);
      applyThemeToDocument(normalized.settings);
      setIsLocked(Boolean(devicePin.pinEnabled && devicePin.pinHash));
      setIsLoaded(true);

      const legacy = await readLegacyLocalDatabase(user.id);
      setLegacyLocalData(legacy);

      const today = getTodayIso();
      const dueToday = normalized.plans.filter(
        (p) => p.reminderEnabled && p.status !== 'done' && p.dueDate <= today,
      );
      if (dueToday.length > 0 && !devicePin.pinEnabled) {
        showToast({
          type: 'info',
          title: `Có ${dueToday.length} kế hoạch cần chú ý`,
          description: dueToday[0].title,
        });
      }
    },
    [showToast],
  );

  const refreshSessionAndData = useCallback(async () => {
    const boot = await syncApi.bootstrap();
    await hydrateAuthenticatedUser(boot.user, boot.databaseState);
  }, [hydrateAuthenticatedUser]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const me = await authApi.me();
        if (!mounted) return;
        if (me.authenticated && me.user) {
          const boot = await syncApi.bootstrap();
          if (!mounted) return;
          await hydrateAuthenticatedUser(boot.user, boot.databaseState);
        }
      } catch {
        if (!mounted) return;
        setAuthUser(null);
        setState(createInitialEmptyState());
        setIsLoaded(true);
      } finally {
        if (mounted) setAuthChecked(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [hydrateAuthenticatedUser]);

  useEffect(() => {
    if (!authChecked) return;
    applyThemeToDocument(state.settings);
  }, [state.settings, authChecked]);

  // Verify active server session when switching pages
  const setActiveTab = useCallback(
    (tab: TabId) => {
      setActiveTabState(tab);
      if (authUser) {
        authApi.me().catch((err) => {
          if (err instanceof ApiError && err.status === 401) {
            handleSessionExpired();
          }
        });
      }
    },
    [authUser, handleSessionExpired],
  );

  const loginWithEmail = useCallback(
    async (email: string, password: string, rememberMe: boolean) => {
      const res = await authApi.login({email, password, rememberMe});
      setAuthNotice(null);
      setActiveTabState('dashboard');
      await hydrateAuthenticatedUser(res.user, res.databaseState);
      showToast({
        type: 'success',
        title: `Chào mừng ${res.user.fullName}`,
        description: 'Dữ liệu cá nhân đã được đồng bộ an toàn.',
      });
    },
    [hydrateAuthenticatedUser, showToast],
  );

  const logoutAccount = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Clear local session state regardless
    }
    setAuthUser(null);
    setState(createInitialEmptyState());
    setIsLocked(false);
    setLegacyLocalData(null);
    setActiveTabState('dashboard');
    showToast({type: 'info', title: 'Đã đăng xuất tài khoản'});
  }, [showToast]);

  const fetchActiveSessions = useCallback(async () => {
    const res = await authApi.sessions();
    return res.sessions;
  }, []);

  const revokeSession = useCallback(
    async (payload: {sessionId?: string; revokeOthers?: boolean}) => {
      const res = await authApi.revokeSession(payload);
      showToast({type: 'info', title: res.message});
    },
    [showToast],
  );

  const changeAccountPassword = useCallback(
    async (payload: {currentPassword: string; newPassword: string; confirmPassword: string}) => {
      const res = await authApi.changePassword(payload);
      showToast({type: 'success', title: res.message});
    },
    [showToast],
  );

  const deleteAccountPermanently = useCallback(
    async (payload: {password: string; confirmPhrase: string}) => {
      const res = await profileApi.deleteAccount(payload);
      setAuthUser(null);
      setState(createInitialEmptyState());
      setIsLocked(false);
      setLegacyLocalData(null);
      setActiveTabState('dashboard');
      showToast({type: 'info', title: res.message});
    },
    [showToast],
  );

  const importLegacyLocalData = useCallback(async () => {
    if (!authUser || !legacyLocalData) return;
    try {
      const boot = await syncApi.importData(
        {
          transactions: legacyLocalData.transactions,
          savingsGoals: legacyLocalData.savingsGoals,
          savingsDeposits: legacyLocalData.savingsDeposits,
          plans: legacyLocalData.plans,
          bankAccounts: legacyLocalData.bankAccounts,
        },
        false,
      );
      await markLegacyHandledForUser(authUser.id, true);
      setLegacyLocalData(null);
      await hydrateAuthenticatedUser(boot.user, boot.databaseState);
      showToast({
        type: 'success',
        title: 'Đã chuyển dữ liệu cũ vào tài khoản',
        description: 'Toàn bộ giao dịch, mục tiêu và kế hoạch đã được đồng bộ lên máy chủ.',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Không thể chuyển dữ liệu cũ',
        description: err instanceof Error ? err.message : 'Vui lòng thử lại.',
      });
    }
  }, [authUser, legacyLocalData, hydrateAuthenticatedUser, showToast]);

  const dismissLegacyMigration = useCallback(
    async (clearLocalCopy = false) => {
      if (!authUser) return;
      await markLegacyHandledForUser(authUser.id, clearLocalCopy);
      setLegacyLocalData(null);
    },
    [authUser],
  );

  const summary = useMemo<FinancialSummary>(() => {
    const cycle = getBillingCycleRange(state.settings.cycleStartDay);
    let monthlyIncome = 0;
    let monthlyExpense = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    for (const tx of state.transactions) {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
        if (tx.date >= cycle.start && tx.date <= cycle.end) {
          monthlyIncome += tx.amount;
        }
      } else {
        totalExpense += tx.amount;
        if (tx.date >= cycle.start && tx.date <= cycle.end) {
          monthlyExpense += tx.amount;
        }
      }
    }

    let totalSavings = 0;
    let pendingSavingsAmount = 0;
    for (const dep of state.savingsDeposits) {
      if (dep.status === 'confirmed') totalSavings += dep.amount;
      if (dep.status === 'pending') pendingSavingsAmount += dep.amount;
    }

    const spendingBalance = totalIncome - totalExpense - totalSavings;
    const totalAssets = spendingBalance + totalSavings;
    const budget = state.settings.monthlyBudget > 0 ? state.settings.monthlyBudget : 1;
    const budgetUsagePercent = Math.min(999, Math.round((monthlyExpense / budget) * 100));

    return {
      cycleLabel: cycle.label,
      monthlyIncome,
      monthlyExpense,
      totalIncome,
      totalExpense,
      totalSavings,
      pendingSavingsAmount,
      spendingBalance,
      totalAssets,
      budgetUsagePercent,
    };
  }, [state.transactions, state.savingsDeposits, state.settings.cycleStartDay, state.settings.monthlyBudget]);

  // Transactions
  const addTransaction = useCallback(
    (tx: Omit<Transaction, 'id' | 'createdAt'>) => {
      const tempId = generateId('tx');
      const nextTx: Transaction = {
        ...tx,
        id: tempId,
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        transactions: [nextTx, ...prev.transactions],
      }));
      txApi
        .create(tx)
        .then((res) => {
          setState((prev) => ({
            ...prev,
            transactions: prev.transactions.map((item) => (item.id === tempId ? res.transaction : item)),
          }));
          showToast({
            type: 'success',
            title: tx.type === 'income' ? 'Đã lưu khoản thu' : 'Đã lưu khoản chi',
            description: tx.title,
          });
        })
        .catch((err) => {
          setState((prev) => ({
            ...prev,
            transactions: prev.transactions.filter((item) => item.id !== tempId),
          }));
          showToast({
            type: 'error',
            title: 'Không thể lưu giao dịch lên máy chủ',
            description: err instanceof Error ? err.message : undefined,
          });
        });
    },
    [showToast],
  );

  const updateTransaction = useCallback(
    (id: string, patch: Partial<Omit<Transaction, 'id' | 'createdAt'>>) => {
      setState((prev) => ({
        ...prev,
        transactions: prev.transactions.map((t) => (t.id === id ? {...t, ...patch} : t)),
      }));
      txApi
        .update(id, patch)
        .then((res) => {
          setState((prev) => ({
            ...prev,
            transactions: prev.transactions.map((t) => (t.id === id ? res.transaction : t)),
          }));
          showToast({type: 'success', title: 'Đã cập nhật giao dịch'});
        })
        .catch((err) => {
          showToast({
            type: 'error',
            title: 'Không thể cập nhật giao dịch',
            description: err instanceof Error ? err.message : undefined,
          });
          refreshSessionAndData().catch(() => undefined);
        });
    },
    [showToast, refreshSessionAndData],
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        transactions: prev.transactions.filter((t) => t.id !== id),
      }));
      txApi
        .remove(id)
        .then(() => {
          showToast({type: 'info', title: 'Đã xóa giao dịch'});
        })
        .catch((err) => {
          showToast({
            type: 'error',
            title: 'Không thể xóa giao dịch',
            description: err instanceof Error ? err.message : undefined,
          });
          refreshSessionAndData().catch(() => undefined);
        });
    },
    [showToast, refreshSessionAndData],
  );

  // Savings goals
  const addSavingsGoal = useCallback(
    (goal: Omit<SavingsGoal, 'id' | 'currentAmount' | 'createdAt'>) => {
      const tempId = generateId('goal');
      const nextGoal: SavingsGoal = {
        ...goal,
        id: tempId,
        currentAmount: 0,
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        savingsGoals: [nextGoal, ...prev.savingsGoals],
      }));

      const promise = savingsApi
        .createGoal(goal)
        .then((res) => {
          setState((prev) => ({
            ...prev,
            savingsGoals: prev.savingsGoals.map((g) => (g.id === tempId ? res.goal : g)),
            savingsDeposits: prev.savingsDeposits.map((d) =>
              d.goalId === tempId ? {...d, goalId: res.goal.id} : d,
            ),
          }));
          showToast({type: 'success', title: 'Đã tạo mục tiêu tiết kiệm', description: goal.name});
          return res.goal.id;
        })
        .catch((err) => {
          setState((prev) => ({
            ...prev,
            savingsGoals: prev.savingsGoals.filter((g) => g.id !== tempId),
          }));
          showToast({
            type: 'error',
            title: 'Không thể tạo mục tiêu tiết kiệm',
            description: err instanceof Error ? err.message : undefined,
          });
          return tempId;
        });

      pendingGoalResolutionRef.current.set(tempId, promise);
    },
    [showToast],
  );

  const updateSavingsGoal = useCallback(
    (id: string, patch: Partial<Omit<SavingsGoal, 'id' | 'currentAmount' | 'createdAt'>>) => {
      setState((prev) => ({
        ...prev,
        savingsGoals: prev.savingsGoals.map((g) => (g.id === id ? {...g, ...patch} : g)),
      }));
      savingsApi
        .updateGoal(id, patch)
        .then(() => {
          showToast({type: 'success', title: 'Đã cập nhật mục tiêu'});
        })
        .catch((err) => {
          showToast({
            type: 'error',
            title: 'Không thể cập nhật mục tiêu',
            description: err instanceof Error ? err.message : undefined,
          });
          refreshSessionAndData().catch(() => undefined);
        });
    },
    [showToast, refreshSessionAndData],
  );

  const deleteSavingsGoal = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        savingsGoals: prev.savingsGoals.filter((g) => g.id !== id),
        savingsDeposits: prev.savingsDeposits.filter((d) => d.goalId !== id),
      }));
      savingsApi
        .deleteGoal(id)
        .then(() => {
          showToast({type: 'info', title: 'Đã xóa mục tiêu tiết kiệm'});
        })
        .catch((err) => {
          showToast({
            type: 'error',
            title: 'Không thể xóa mục tiêu',
            description: err instanceof Error ? err.message : undefined,
          });
          refreshSessionAndData().catch(() => undefined);
        });
    },
    [showToast, refreshSessionAndData],
  );

  const createPendingDeposit = useCallback(
    (
      deposit: Omit<SavingsDeposit, 'id' | 'status' | 'verificationMethod' | 'createdAt'>,
    ): SavingsDeposit => {
      const tempId = generateId('dep');
      const created: SavingsDeposit = {
        ...deposit,
        id: tempId,
        status: 'pending',
        verificationMethod: 'none',
        createdAt: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        savingsDeposits: [created, ...prev.savingsDeposits],
      }));

      const persistPromise = (async () => {
        const resolvedGoalId = pendingGoalResolutionRef.current.has(deposit.goalId)
          ? await pendingGoalResolutionRef.current.get(deposit.goalId)!
          : deposit.goalId;
        const resolvedBankId = pendingBankResolutionRef.current.has(deposit.bankAccountId)
          ? await pendingBankResolutionRef.current.get(deposit.bankAccountId)!
          : deposit.bankAccountId;

        const res = await savingsApi.createDeposit({
          ...deposit,
          goalId: resolvedGoalId,
          bankAccountId: resolvedBankId,
        });
        setState((prev) => ({
          ...prev,
          savingsDeposits: prev.savingsDeposits.map((d) => (d.id === tempId ? res.deposit : d)),
        }));
        showToast({
          type: 'info',
          title: 'Đã tạo mã QR & ghi nhận chờ xác nhận',
          description: `Mã giao dịch ${res.deposit.transactionCode} sẽ được cộng sau khi xác minh.`,
        });
        return res.deposit.id;
      })().catch((err) => {
        setState((prev) => ({
          ...prev,
          savingsDeposits: prev.savingsDeposits.filter((d) => d.id !== tempId),
        }));
        showToast({
          type: 'error',
          title: 'Không thể lưu giao dịch QR lên máy chủ',
          description: err instanceof Error ? err.message : undefined,
        });
        return tempId;
      });

      pendingDepositResolutionRef.current.set(tempId, persistPromise);
      return created;
    },
    [showToast],
  );

  const confirmDepositManually = useCallback(
    (depositId: string) => {
      const nowIso = new Date().toISOString();
      setState((prev) => {
        const nextDeposits = prev.savingsDeposits.map((d) =>
          d.id === depositId
            ? {
                ...d,
                status: 'confirmed' as const,
                verificationMethod: 'manual_unverified' as const,
                verifiedAt: nowIso,
              }
            : d,
        );
        return {
          ...prev,
          savingsDeposits: nextDeposits,
          savingsGoals: recalculateGoalBalances(prev.savingsGoals, nextDeposits),
        };
      });

      (async () => {
        const realId = pendingDepositResolutionRef.current.has(depositId)
          ? await pendingDepositResolutionRef.current.get(depositId)!
          : depositId;
        await savingsApi.verifyDeposit(realId, {action: 'confirm_manual'});
        showToast({
          type: 'warning',
          title: 'Đã xác nhận thủ công',
          description: 'Khoản tiền đã cộng vào mục tiêu (Chưa được ngân hàng xác minh).',
        });
      })().catch((err) => {
        showToast({
          type: 'error',
          title: 'Không thể xác nhận giao dịch',
          description: err instanceof Error ? err.message : undefined,
        });
        refreshSessionAndData().catch(() => undefined);
      });
    },
    [showToast, refreshSessionAndData],
  );

  const markDepositFailed = useCallback(
    (depositId: string) => {
      const nowIso = new Date().toISOString();
      setState((prev) => {
        const nextDeposits = prev.savingsDeposits.map((d) =>
          d.id === depositId
            ? {
                ...d,
                status: 'failed' as const,
                verifiedAt: nowIso,
              }
            : d,
        );
        return {
          ...prev,
          savingsDeposits: nextDeposits,
          savingsGoals: recalculateGoalBalances(prev.savingsGoals, nextDeposits),
        };
      });

      (async () => {
        const realId = pendingDepositResolutionRef.current.has(depositId)
          ? await pendingDepositResolutionRef.current.get(depositId)!
          : depositId;
        await savingsApi.verifyDeposit(realId, {action: 'mark_failed'});
        showToast({type: 'info', title: 'Đã đánh dấu giao dịch thất bại'});
      })().catch((err) => {
        showToast({
          type: 'error',
          title: 'Không thể cập nhật trạng thái giao dịch',
          description: err instanceof Error ? err.message : undefined,
        });
        refreshSessionAndData().catch(() => undefined);
      });
    },
    [showToast, refreshSessionAndData],
  );

  const reconcileDepositViaWebhook = useCallback(
    async (depositId: string, webhookUrl: string): Promise<boolean> => {
      const target = state.savingsDeposits.find((d) => d.id === depositId);
      if (!target) return false;
      if (!webhookUrl || !webhookUrl.startsWith('http')) {
        showToast({
          type: 'warning',
          title: 'Chưa cấu hình API đối soát ngân hàng',
          description: 'Vui lòng cấu hình URL webhook/API trong Cài đặt hoặc xác nhận thủ công.',
        });
        return false;
      }
      try {
        const realId = pendingDepositResolutionRef.current.has(depositId)
          ? await pendingDepositResolutionRef.current.get(depositId)!
          : depositId;
        const res = await savingsApi.verifyDeposit(realId, {
          action: 'reconcile_webhook',
          webhookUrl,
        });
        if (res.verified || res.status === 'confirmed') {
          setState((prev) => {
            const nextDeposits = prev.savingsDeposits.map((d) =>
              d.id === depositId || d.id === realId
                ? {
                    ...d,
                    status: 'confirmed' as const,
                    verificationMethod: 'api_webhook' as const,
                    verifiedAt: res.verifiedAt || new Date().toISOString(),
                  }
                : d,
            );
            return {
              ...prev,
              savingsDeposits: nextDeposits,
              savingsGoals: recalculateGoalBalances(prev.savingsGoals, nextDeposits),
            };
          });
          showToast({
            type: 'success',
            title: 'Ngân hàng đã xác minh giao dịch',
            description: `Mã ${target.transactionCode} đã được cộng vào quỹ tiết kiệm.`,
          });
          return true;
        }
        showToast({
          type: 'info',
          title: 'Giao dịch chưa được ghi nhận từ ngân hàng',
          description: 'Vui lòng thử lại sau vài phút.',
        });
        return false;
      } catch (err) {
        showToast({
          type: 'error',
          title: 'Không thể kết nối API đối soát',
          description: err instanceof Error ? err.message : 'Kiểm tra lại URL webhook hoặc sử dụng xác nhận thủ công.',
        });
        return false;
      }
    },
    [state.savingsDeposits, showToast],
  );

  // Plans
  const addPlan = useCallback(
    (plan: Omit<PlanItem, 'id' | 'createdAt'>) => {
      const tempId = generateId('plan');
      const nextPlan: PlanItem = {
        ...plan,
        id: tempId,
        createdAt: new Date().toISOString(),
      };
      setState((prev) => ({
        ...prev,
        plans: [nextPlan, ...prev.plans],
      }));
      plansApi
        .create(plan)
        .then((res) => {
          setState((prev) => ({
            ...prev,
            plans: prev.plans.map((p) => (p.id === tempId ? res.plan : p)),
          }));
          showToast({type: 'success', title: 'Đã tạo kế hoạch mới', description: plan.title});
        })
        .catch((err) => {
          setState((prev) => ({
            ...prev,
            plans: prev.plans.filter((p) => p.id !== tempId),
          }));
          showToast({
            type: 'error',
            title: 'Không thể lưu kế hoạch',
            description: err instanceof Error ? err.message : undefined,
          });
        });
    },
    [showToast],
  );

  const updatePlan = useCallback(
    (id: string, patch: Partial<Omit<PlanItem, 'id' | 'createdAt'>>) => {
      setState((prev) => ({
        ...prev,
        plans: prev.plans.map((p) => (p.id === id ? {...p, ...patch} : p)),
      }));
      plansApi
        .update(id, patch)
        .then((res) => {
          setState((prev) => ({
            ...prev,
            plans: prev.plans.map((p) => (p.id === id ? res.plan : p)),
          }));
          showToast({type: 'success', title: 'Đã cập nhật kế hoạch'});
        })
        .catch((err) => {
          showToast({
            type: 'error',
            title: 'Không thể cập nhật kế hoạch',
            description: err instanceof Error ? err.message : undefined,
          });
          refreshSessionAndData().catch(() => undefined);
        });
    },
    [showToast, refreshSessionAndData],
  );

  const deletePlan = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        plans: prev.plans.filter((p) => p.id !== id),
      }));
      plansApi
        .remove(id)
        .then(() => {
          showToast({type: 'info', title: 'Đã xóa kế hoạch'});
        })
        .catch((err) => {
          showToast({
            type: 'error',
            title: 'Không thể xóa kế hoạch',
            description: err instanceof Error ? err.message : undefined,
          });
          refreshSessionAndData().catch(() => undefined);
        });
    },
    [showToast, refreshSessionAndData],
  );

  const togglePlanDone = useCallback(
    (id: string) => {
      let nextStatus: 'todo' | 'done' = 'done';
      setState((prev) => ({
        ...prev,
        plans: prev.plans.map((p) => {
          if (p.id !== id) return p;
          const nextDone = p.status !== 'done';
          nextStatus = nextDone ? 'done' : 'todo';
          return {
            ...p,
            status: nextStatus,
            completedAt: nextDone ? new Date().toISOString() : undefined,
          };
        }),
      }));
      plansApi.update(id, {status: nextStatus}).catch(() => {
        refreshSessionAndData().catch(() => undefined);
      });
    },
    [refreshSessionAndData],
  );

  // Bank accounts
  const addBankAccount = useCallback(
    (account: Omit<BankAccount, 'id'>) => {
      const tempId = generateId('bank');
      setState((prev) => {
        const shouldBeDefault = account.isDefault || prev.bankAccounts.length === 0;
        const nextAcc: BankAccount = {...account, id: tempId, isDefault: shouldBeDefault};
        const updatedExisting = shouldBeDefault
          ? prev.bankAccounts.map((b) => ({...b, isDefault: false}))
          : prev.bankAccounts;
        return {...prev, bankAccounts: [...updatedExisting, nextAcc]};
      });

      const promise = banksApi
        .create(account)
        .then((res) => {
          setState((prev) => ({
            ...prev,
            bankAccounts: prev.bankAccounts.map((b) => (b.id === tempId ? res.bankAccount : b)),
          }));
          showToast({type: 'success', title: 'Đã thêm tài khoản ngân hàng', description: account.bankName});
          return res.bankAccount.id;
        })
        .catch((err) => {
          setState((prev) => ({
            ...prev,
            bankAccounts: prev.bankAccounts.filter((b) => b.id !== tempId),
          }));
          showToast({
            type: 'error',
            title: 'Không thể lưu tài khoản ngân hàng',
            description: err instanceof Error ? err.message : undefined,
          });
          return tempId;
        });

      pendingBankResolutionRef.current.set(tempId, promise);
    },
    [showToast],
  );

  const updateBankAccount = useCallback(
    (id: string, patch: Partial<Omit<BankAccount, 'id'>>) => {
      setState((prev) => {
        const nextAccounts = prev.bankAccounts.map((b) => {
          if (b.id === id) return {...b, ...patch};
          if (patch.isDefault) return {...b, isDefault: false};
          return b;
        });
        return {...prev, bankAccounts: nextAccounts};
      });
      banksApi
        .update(id, patch)
        .then(() => {
          showToast({type: 'success', title: 'Đã cập nhật tài khoản ngân hàng'});
        })
        .catch((err) => {
          showToast({
            type: 'error',
            title: 'Không thể cập nhật tài khoản ngân hàng',
            description: err instanceof Error ? err.message : undefined,
          });
          refreshSessionAndData().catch(() => undefined);
        });
    },
    [showToast, refreshSessionAndData],
  );

  const deleteBankAccount = useCallback(
    (id: string) => {
      setState((prev) => {
        const filtered = prev.bankAccounts.filter((b) => b.id !== id);
        if (filtered.length > 0 && !filtered.some((b) => b.isDefault)) {
          filtered[0] = {...filtered[0], isDefault: true};
        }
        return {...prev, bankAccounts: filtered};
      });
      banksApi
        .remove(id)
        .then(() => {
          showToast({type: 'info', title: 'Đã xóa tài khoản ngân hàng'});
        })
        .catch((err) => {
          showToast({
            type: 'error',
            title: 'Không thể xóa tài khoản ngân hàng',
            description: err instanceof Error ? err.message : undefined,
          });
          refreshSessionAndData().catch(() => undefined);
        });
    },
    [showToast, refreshSessionAndData],
  );

  const setDefaultBankAccount = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        bankAccounts: prev.bankAccounts.map((b) => ({...b, isDefault: b.id === id})),
      }));
      banksApi
        .update(id, {isDefault: true})
        .then(() => {
          showToast({type: 'success', title: 'Đã đặt tài khoản VietQR mặc định'});
        })
        .catch(() => {
          refreshSessionAndData().catch(() => undefined);
        });
    },
    [showToast, refreshSessionAndData],
  );

  const updateProfile = useCallback(
    (patch: Partial<UserProfile>) => {
      setState((prev) => ({
        ...prev,
        profile: {...prev.profile, ...patch},
      }));
      setAuthUser((prev) =>
        prev
          ? {
              ...prev,
              fullName: patch.name ?? prev.fullName,
              email: patch.email ?? prev.email,
              bio: patch.bio ?? prev.bio,
              avatar: patch.avatar ?? prev.avatar,
            }
          : null,
      );
      profileApi
        .updateProfile(patch)
        .then(() => {
          showToast({type: 'success', title: 'Đã lưu hồ sơ cá nhân'});
        })
        .catch((err) => {
          showToast({
            type: 'error',
            title: 'Không thể lưu hồ sơ',
            description: err instanceof Error ? err.message : undefined,
          });
          refreshSessionAndData().catch(() => undefined);
        });
    },
    [showToast, refreshSessionAndData],
  );

  const updateSettings = useCallback(
    (patch: Partial<AppSettings>) => {
      setState((prev) => ({
        ...prev,
        settings: {...prev.settings, ...patch},
      }));
      if (authUser) {
        profileApi.updateSettings(patch).catch((err) => {
          showToast({
            type: 'error',
            title: 'Không thể đồng bộ cài đặt',
            description: err instanceof Error ? err.message : undefined,
          });
        });
      }
    },
    [authUser, showToast],
  );

  const loadSampleData = useCallback(() => {
    const sample = createSampleDatabaseState(state);
    syncApi
      .importData(
        {
          transactions: sample.transactions,
          savingsGoals: sample.savingsGoals,
          savingsDeposits: sample.savingsDeposits,
          plans: sample.plans,
          bankAccounts: sample.bankAccounts,
        },
        false,
      )
      .then((boot) => hydrateAuthenticatedUser(boot.user, boot.databaseState))
      .then(() => {
        showToast({
          type: 'success',
          title: 'Đã nạp dữ liệu mẫu vào tài khoản',
          description: 'Bạn có thể chỉnh sửa hoặc xóa dữ liệu bất kỳ lúc nào.',
        });
      })
      .catch((err) => {
        showToast({
          type: 'error',
          title: 'Không thể nạp dữ liệu mẫu',
          description: err instanceof Error ? err.message : undefined,
        });
      });
  }, [state, hydrateAuthenticatedUser, showToast]);

  const restoreFromJson = useCallback(
    (data: AppDatabaseState) => {
      if (!data || !Array.isArray(data.transactions) || !data.settings || !data.profile) {
        showToast({type: 'error', title: 'Tệp sao lưu không hợp lệ'});
        return;
      }
      syncApi
        .importData(
          {
            transactions: data.transactions,
            savingsGoals: data.savingsGoals,
            savingsDeposits: data.savingsDeposits,
            plans: data.plans,
            bankAccounts: data.bankAccounts,
          },
          true,
        )
        .then((boot) => hydrateAuthenticatedUser(boot.user, boot.databaseState))
        .then(() => {
          showToast({type: 'success', title: 'Khôi phục dữ liệu lên tài khoản thành công'});
        })
        .catch((err) => {
          showToast({
            type: 'error',
            title: 'Không thể khôi phục tệp sao lưu',
            description: err instanceof Error ? err.message : undefined,
          });
        });
    },
    [hydrateAuthenticatedUser, showToast],
  );

  const wipeAllData = useCallback(async () => {
    const boot = await syncApi.wipePersonalData();
    await hydrateAuthenticatedUser(boot.user, boot.databaseState);
    showToast({type: 'info', title: 'Đã xóa toàn bộ dữ liệu tài chính & kế hoạch của tài khoản'});
  }, [hydrateAuthenticatedUser, showToast]);

  const unlockWithPin = useCallback(
    async (pin: string): Promise<boolean> => {
      if (!state.settings.pinHash) {
        setIsLocked(false);
        return true;
      }
      const candidate = await hashPin(pin);
      if (candidate === state.settings.pinHash) {
        setIsLocked(false);
        return true;
      }
      return false;
    },
    [state.settings.pinHash],
  );

  const lockApp = useCallback(() => {
    if (state.settings.pinEnabled && state.settings.pinHash) {
      setIsLocked(true);
    }
  }, [state.settings.pinEnabled, state.settings.pinHash]);

  const setPinCode = useCallback(
    async (pin: string) => {
      if (!authUser) return;
      const hashed = await hashPin(pin);
      await saveUserDevicePin(authUser.id, true, hashed);
      setState((prev) => ({
        ...prev,
        settings: {...prev.settings, pinHash: hashed, pinEnabled: true},
      }));
      showToast({type: 'success', title: 'Đã thiết lập mã PIN khóa nhanh trên thiết bị này'});
    },
    [authUser, showToast],
  );

  const disablePinCode = useCallback(() => {
    if (authUser) {
      saveUserDevicePin(authUser.id, false).catch(() => undefined);
    }
    setState((prev) => ({
      ...prev,
      settings: {...prev.settings, pinHash: undefined, pinEnabled: false},
    }));
    setIsLocked(false);
    showToast({type: 'info', title: 'Đã tắt khóa ứng dụng bằng PIN'});
  }, [authUser, showToast]);

  const rotateSession = useCallback(() => {
    refreshSessionAndData()
      .then(() => {
        showToast({type: 'info', title: 'Đã làm mới & đồng bộ dữ liệu phiên từ máy chủ'});
      })
      .catch(() => undefined);
  }, [refreshSessionAndData, showToast]);

  const value: AppContextValue = {
    authUser,
    authChecked,
    authNotice,
    clearAuthNotice,
    state,
    isLoaded,
    isLocked,
    activeTab,
    setActiveTab,
    summary,
    toasts,
    showToast,
    dismissToast,
    loginWithEmail,
    logoutAccount,
    refreshSessionAndData,
    fetchActiveSessions,
    revokeSession,
    changeAccountPassword,
    deleteAccountPermanently,
    legacyLocalData,
    importLegacyLocalData,
    dismissLegacyMigration,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    createPendingDeposit,
    confirmDepositManually,
    markDepositFailed,
    reconcileDepositViaWebhook,
    addPlan,
    updatePlan,
    deletePlan,
    togglePlanDone,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    setDefaultBankAccount,
    updateProfile,
    updateSettings,
    loadSampleData,
    restoreFromJson,
    wipeAllData,
    unlockWithPin,
    lockApp,
    setPinCode,
    disablePinCode,
    rotateSession,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
