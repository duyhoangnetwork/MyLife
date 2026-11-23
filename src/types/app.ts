export type TabId = 'dashboard' | 'finance' | 'savings' | 'planner' | 'profile' | 'settings';

export type ThemeMode = 'dark' | 'light' | 'glass';

export type AccentColorId = 'sky' | 'emerald' | 'indigo' | 'amber' | 'rose';

export type FontScaleId = 'sm' | 'md' | 'lg';

export type CurrencyCode = 'VND' | 'USD' | 'EUR';

export type TransactionType = 'income' | 'expense';

export type PaymentMethod = 'Tiền mặt' | 'Chuyển khoản' | 'Thẻ tín dụng' | 'Ví điện tử';

export interface Transaction {
  id: string;
  type: TransactionType;
  title: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  paymentMethod?: PaymentMethod;
  note?: string;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  avatar: string;
  targetAmount: number;
  currentAmount: number; // Strictly derived from confirmed deposits
  startDate: string; // YYYY-MM-DD
  targetDate: string; // YYYY-MM-DD
  description?: string;
  createdAt: string;
}

export type DepositStatus = 'pending' | 'confirmed' | 'failed';

export type VerificationMethod = 'none' | 'api_webhook' | 'manual_unverified';

export interface SavingsDeposit {
  id: string;
  goalId: string;
  bankAccountId: string;
  bankName: string;
  accountNumber: string;
  amount: number;
  transactionCode: string;
  transferNote: string;
  qrPayload: string;
  status: DepositStatus;
  verificationMethod: VerificationMethod;
  createdAt: string;
  verifiedAt?: string;
}

export type PlanType =
  | 'Công việc'
  | 'Học tập'
  | 'Mục tiêu cá nhân'
  | 'Kế hoạch tài chính'
  | 'Thói quen hàng ngày';

export type PlanPriority = 'low' | 'medium' | 'high';

export type PlanStatus = 'todo' | 'in_progress' | 'done' | 'overdue';

export interface PlanItem {
  id: string;
  title: string;
  type: PlanType;
  priority: PlanPriority;
  status: Exclude<PlanStatus, 'overdue'>;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  reminderEnabled: boolean;
  description?: string;
  createdAt: string;
  completedAt?: string;
}

export interface BankAccount {
  id: string;
  bankShortName: string;
  bankName: string;
  bin: string; // 6-digit NAPAS BIN
  accountNumber: string;
  accountHolder: string;
  defaultNote: string;
  isDefault: boolean;
  webhookVerifyUrl?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatar: string;
  joinedAt: string;
  bio?: string;
  emailVerified?: boolean;
}

export interface AuthenticatedUser {
  id: string;
  fullName: string;
  email: string;
  emailVerified: boolean;
  avatar: string;
  bio: string;
  joinedAt: string;
}

export interface ActiveSessionInfo {
  id: string;
  userAgent: string;
  ipAddress: string;
  expiresAt: string;
  createdAt: string;
  lastUsedAt: string;
  isCurrent: boolean;
}

export interface CategoryConfig {
  income: string[];
  expense: string[];
}

export interface AppSettings {
  theme: ThemeMode;
  accentColor: AccentColorId;
  fontScale: FontScaleId;
  transitionsEnabled: boolean;
  glassEffectsEnabled: boolean;
  currency: CurrencyCode;
  monthlyBudget: number;
  cycleStartDay: number; // 1 - 28
  categories: CategoryConfig;
  pinHash?: string;
  pinEnabled: boolean;
  sessionId: string;
}

export interface AppDatabaseState {
  transactions: Transaction[];
  savingsGoals: SavingsGoal[];
  savingsDeposits: SavingsDeposit[];
  plans: PlanItem[];
  bankAccounts: BankAccount[];
  profile: UserProfile;
  settings: AppSettings;
  sampleLoadedOnce: boolean;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}
