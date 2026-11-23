import {
  ActiveSessionInfo,
  AppDatabaseState,
  AppSettings,
  AuthenticatedUser,
  BankAccount,
  PlanItem,
  SavingsDeposit,
  SavingsGoal,
  Transaction,
  UserProfile,
} from '../types/app';

export class ApiError extends Error {
  status: number;
  field?: string;
  configured?: boolean;

  constructor(message: string, status: number, field?: string, configured?: boolean) {
    super(message);
    this.status = status;
    this.field = field;
    this.configured = configured;
  }
}

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(fn: (() => void) | null) {
  unauthorizedHandler = fn;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  {suppressAuthRedirect = false}: {suppressAuthRedirect?: boolean} = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('X-Requested-With', 'XMLHttpRequest');
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
  });

  let data: Record<string, unknown> = {};
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }

  if (!response.ok) {
    if (response.status === 401 && !suppressAuthRedirect && unauthorizedHandler) {
      unauthorizedHandler();
    }
    throw new ApiError(
      typeof data.error === 'string' ? data.error : 'Yêu cầu thất bại. Vui lòng thử lại.',
      response.status,
      typeof data.field === 'string' ? data.field : undefined,
      typeof data.configured === 'boolean' ? data.configured : undefined,
    );
  }

  return data as T;
}

export const authApi = {
  me() {
    return apiFetch<{
      ok: boolean;
      authenticated: boolean;
      sessionId: string;
      expiresAt: string;
      user: AuthenticatedUser;
    }>('/api/auth/me', {method: 'GET'}, {suppressAuthRedirect: true});
  },
  register(payload: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    acceptedTerms: boolean;
  }) {
    return apiFetch<{
      ok: boolean;
      message: string;
      user: {id: string; fullName: string; email: string};
    }>(
      '/api/auth/register',
      {method: 'POST', body: JSON.stringify(payload)},
      {suppressAuthRedirect: true},
    );
  },
  login(payload: {email: string; password: string; rememberMe: boolean}) {
    return apiFetch<{
      ok: boolean;
      user: AuthenticatedUser;
      databaseState: AppDatabaseState;
    }>(
      '/api/auth/login',
      {method: 'POST', body: JSON.stringify(payload)},
      {suppressAuthRedirect: true},
    );
  },
  logout() {
    return apiFetch<{ok: boolean}>('/api/auth/logout', {method: 'POST'}, {suppressAuthRedirect: true});
  },
  sessions() {
    return apiFetch<{ok: boolean; sessions: ActiveSessionInfo[]}>('/api/auth/sessions', {method: 'GET'});
  },
  revokeSession(payload: {sessionId?: string; revokeOthers?: boolean}) {
    return apiFetch<{ok: boolean; message: string}>('/api/auth/sessions', {
      method: 'DELETE',
      body: JSON.stringify(payload),
    });
  },
  changePassword(payload: {currentPassword: string; newPassword: string; confirmPassword: string}) {
    return apiFetch<{ok: boolean; message: string}>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  forgotPasswordStatus() {
    return apiFetch<{ok: boolean; configured: boolean}>(
      '/api/auth/forgot-password',
      {method: 'GET'},
      {suppressAuthRedirect: true},
    );
  },
  forgotPassword(email: string) {
    return apiFetch<{ok: boolean; message: string}>(
      '/api/auth/forgot-password',
      {method: 'POST', body: JSON.stringify({email})},
      {suppressAuthRedirect: true},
    );
  },
  resetPassword(payload: {token: string; newPassword: string; confirmPassword: string}) {
    return apiFetch<{ok: boolean; message: string}>(
      '/api/auth/reset-password',
      {method: 'POST', body: JSON.stringify(payload)},
      {suppressAuthRedirect: true},
    );
  },
};

export const syncApi = {
  bootstrap() {
    return apiFetch<{
      ok: boolean;
      user: AuthenticatedUser;
      databaseState: AppDatabaseState;
    }>('/api/sync/bootstrap', {method: 'GET'});
  },
  importData(data: Partial<AppDatabaseState>, replaceExisting = false) {
    return apiFetch<{
      ok: boolean;
      user: AuthenticatedUser;
      databaseState: AppDatabaseState;
    }>('/api/sync/bootstrap', {
      method: 'POST',
      body: JSON.stringify({action: 'import_data', replaceExisting, data}),
    });
  },
  wipePersonalData() {
    return apiFetch<{
      ok: boolean;
      user: AuthenticatedUser;
      databaseState: AppDatabaseState;
    }>('/api/sync/bootstrap', {
      method: 'POST',
      body: JSON.stringify({action: 'wipe_personal_data'}),
    });
  },
};

export const txApi = {
  create(tx: Omit<Transaction, 'id' | 'createdAt'>) {
    return apiFetch<{ok: boolean; transaction: Transaction}>('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(tx),
    });
  },
  update(id: string, patch: Partial<Omit<Transaction, 'id' | 'createdAt'>>) {
    return apiFetch<{ok: boolean; transaction: Transaction}>(`/api/transactions/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },
  remove(id: string) {
    return apiFetch<{ok: boolean; deletedId: string}>(`/api/transactions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};

export const savingsApi = {
  createGoal(goal: Omit<SavingsGoal, 'id' | 'currentAmount' | 'createdAt'>) {
    return apiFetch<{ok: boolean; goal: SavingsGoal}>('/api/savings/goals', {
      method: 'POST',
      body: JSON.stringify(goal),
    });
  },
  updateGoal(id: string, patch: Partial<Omit<SavingsGoal, 'id' | 'currentAmount' | 'createdAt'>>) {
    return apiFetch<{ok: boolean; goal: SavingsGoal}>(`/api/savings/goals/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },
  deleteGoal(id: string) {
    return apiFetch<{ok: boolean; deletedId: string}>(`/api/savings/goals/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
  createDeposit(deposit: Omit<SavingsDeposit, 'id' | 'status' | 'verificationMethod' | 'createdAt'>) {
    return apiFetch<{ok: boolean; deposit: SavingsDeposit}>('/api/savings/deposits', {
      method: 'POST',
      body: JSON.stringify(deposit),
    });
  },
  verifyDeposit(
    id: string,
    payload: {action: 'confirm_manual' | 'mark_failed' | 'reconcile_webhook'; webhookUrl?: string},
  ) {
    return apiFetch<{
      ok: boolean;
      verified?: boolean;
      status: 'pending' | 'confirmed' | 'failed';
      verificationMethod?: 'none' | 'api_webhook' | 'manual_unverified';
      verifiedAt?: string;
    }>(`/api/savings/deposits/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};

export const plansApi = {
  create(plan: Omit<PlanItem, 'id' | 'createdAt'>) {
    return apiFetch<{ok: boolean; plan: PlanItem}>('/api/plans', {
      method: 'POST',
      body: JSON.stringify(plan),
    });
  },
  update(id: string, patch: Partial<Omit<PlanItem, 'id' | 'createdAt'>>) {
    return apiFetch<{ok: boolean; plan: PlanItem}>(`/api/plans/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },
  remove(id: string) {
    return apiFetch<{ok: boolean; deletedId: string}>(`/api/plans/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};

export const banksApi = {
  create(account: Omit<BankAccount, 'id'>) {
    return apiFetch<{ok: boolean; bankAccount: BankAccount}>('/api/bank-accounts', {
      method: 'POST',
      body: JSON.stringify(account),
    });
  },
  update(id: string, patch: Partial<Omit<BankAccount, 'id'>>) {
    return apiFetch<{ok: boolean; bankAccount: BankAccount}>(`/api/bank-accounts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },
  remove(id: string) {
    return apiFetch<{ok: boolean; deletedId: string}>(`/api/bank-accounts/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};

export const profileApi = {
  updateProfile(profile: Partial<UserProfile>) {
    return apiFetch<{ok: boolean}>('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({profile}),
    });
  },
  updateSettings(settings: Partial<AppSettings>) {
    return apiFetch<{ok: boolean}>('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify({settings}),
    });
  },
  exportData() {
    return apiFetch<Record<string, unknown>>('/api/profile/export', {method: 'GET'});
  },
  deleteAccount(payload: {password: string; confirmPhrase: string}) {
    return apiFetch<{ok: boolean; message: string}>('/api/profile/delete-account', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
