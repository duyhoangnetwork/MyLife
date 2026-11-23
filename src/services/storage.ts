import {AppDatabaseState, BankAccount, CategoryConfig, PlanItem, SavingsDeposit, SavingsGoal, Transaction} from '../types/app';
import {generateId, getTodayIso} from '../utils/formatters';
import {buildVietQrPayload} from '../utils/vietqr';

const DB_NAME = 'mylife_manager_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';
const STATE_KEY = 'root_state';
const LS_BACKUP_KEY = 'mylife_manager_state_v1';

export const DEFAULT_PROFILE_AVATAR = '/src/assets/images/avatar_user_profile_1795412997980.jpg';
export const GOAL_PRESET_IMAGES = [
  {label: 'Công nghệ & Laptop', url: '/src/assets/images/goal_tech_upgrade_1795412997941.jpg'},
  {label: 'Du lịch & Nghỉ dưỡng', url: '/src/assets/images/goal_travel_escape_1795412998321.jpg'},
  {label: 'Quỹ dự phòng & Thẻ', url: '/src/assets/images/goal_reserve_fund_1795412998467.jpg'},
];

export const DEFAULT_CATEGORIES: CategoryConfig = {
  income: ['Lương', 'Thưởng', 'Kinh doanh', 'Đầu tư', 'Khác'],
  expense: [
    'Ăn uống',
    'Di chuyển',
    'Mua sắm',
    'Học tập',
    'Giải trí',
    'Hóa đơn',
    'Sức khỏe',
    'Gia đình',
    'Khác',
  ],
};

export function createInitialEmptyState(): AppDatabaseState {
  return {
    transactions: [],
    savingsGoals: [],
    savingsDeposits: [],
    plans: [],
    bankAccounts: [],
    profile: {
      name: 'Minh Anh',
      email: 'canhan@mylife.vn',
      avatar: DEFAULT_PROFILE_AVATAR,
      joinedAt: getTodayIso(),
      bio: 'Quản lý tài chính cá nhân và kế hoạch mỗi ngày.',
    },
    settings: {
      theme: 'light',
      accentColor: 'sky',
      fontScale: 'md',
      transitionsEnabled: true,
      glassEffectsEnabled: true,
      currency: 'VND',
      monthlyBudget: 15_000_000,
      cycleStartDay: 1,
      categories: {
        income: [...DEFAULT_CATEGORIES.income],
        expense: [...DEFAULT_CATEGORIES.expense],
      },
      pinEnabled: false,
      sessionId: generateId('sess'),
    },
    sampleLoadedOnce: false,
  };
}

function offsetDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function offsetMonthDate(monthsAgo: number, day: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  d.setDate(Math.min(day, 28));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function createSampleDatabaseState(currentState?: AppDatabaseState): AppDatabaseState {
  const base = currentState ? {...currentState} : createInitialEmptyState();

  const bank1: BankAccount = {
    id: 'bank_tcb_1',
    bankShortName: 'TCB',
    bankName: 'Techcombank',
    bin: '970407',
    accountNumber: '19036888999012',
    accountHolder: 'NGUYEN MINH ANH',
    defaultNote: 'TIET KIEM MY LIFE',
    isDefault: true,
  };

  const bank2: BankAccount = {
    id: 'bank_vcb_2',
    bankShortName: 'VCB',
    bankName: 'Vietcombank',
    bin: '970436',
    accountNumber: '1018456789',
    accountHolder: 'NGUYEN MINH ANH',
    defaultNote: 'QUY DU PHONG',
    isDefault: false,
  };

  const transactions: Transaction[] = [
    {
      id: 'tx_1',
      type: 'income',
      title: 'Lương tháng hiện tại',
      amount: 24_500_000,
      category: 'Lương',
      date: offsetMonthDate(0, 5),
      note: 'Chuyển khoản lương chính thức',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tx_2',
      type: 'income',
      title: 'Dự án thiết kế freelance',
      amount: 5_200_000,
      category: 'Kinh doanh',
      date: offsetDate(-6),
      note: 'Thanh toán đợt 2',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tx_3',
      type: 'expense',
      title: 'Tiền thuê căn hộ & điện nước',
      amount: 6_400_000,
      category: 'Hóa đơn',
      date: offsetMonthDate(0, 6),
      paymentMethod: 'Chuyển khoản',
      note: 'Thanh toán định kỳ đầu tháng',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tx_4',
      type: 'expense',
      title: 'Đi siêu thị & thực phẩm tuần',
      amount: 1_450_000,
      category: 'Ăn uống',
      date: offsetDate(-3),
      paymentMethod: 'Ví điện tử',
      note: 'Thực phẩm tươi sống',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tx_5',
      type: 'expense',
      title: 'Xăng xe & gửi xe tháng',
      amount: 680_000,
      category: 'Di chuyển',
      date: offsetDate(-2),
      paymentMethod: 'Tiền mặt',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tx_6',
      type: 'expense',
      title: 'Khóa học TypeScript & UI nâng cao',
      amount: 1_290_000,
      category: 'Học tập',
      date: offsetDate(-8),
      paymentMethod: 'Thẻ tín dụng',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tx_7',
      type: 'expense',
      title: 'Khám sức khỏe & vitamin',
      amount: 920_000,
      category: 'Sức khỏe',
      date: offsetDate(-4),
      paymentMethod: 'Chuyển khoản',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tx_8',
      type: 'expense',
      title: 'Cà phê & ăn tối cùng bạn bè',
      amount: 540_000,
      category: 'Giải trí',
      date: offsetDate(-1),
      paymentMethod: 'Ví điện tử',
      createdAt: new Date().toISOString(),
    },
    // Previous months for charts comparison
    {
      id: 'tx_p1',
      type: 'income',
      title: 'Lương tháng trước',
      amount: 24_000_000,
      category: 'Lương',
      date: offsetMonthDate(1, 5),
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tx_p2',
      type: 'expense',
      title: 'Sinh hoạt & hóa đơn tháng trước',
      amount: 12_800_000,
      category: 'Hóa đơn',
      date: offsetMonthDate(1, 10),
      paymentMethod: 'Chuyển khoản',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tx_p3',
      type: 'income',
      title: 'Lương 2 tháng trước',
      amount: 22_500_000,
      category: 'Lương',
      date: offsetMonthDate(2, 5),
      createdAt: new Date().toISOString(),
    },
    {
      id: 'tx_p4',
      type: 'expense',
      title: 'Chi tiêu tổng hợp 2 tháng trước',
      amount: 14_200_000,
      category: 'Mua sắm',
      date: offsetMonthDate(2, 14),
      paymentMethod: 'Thẻ tín dụng',
      createdAt: new Date().toISOString(),
    },
  ];

  const savingsGoals: SavingsGoal[] = [
    {
      id: 'goal_laptop',
      name: 'Mua máy tính làm việc',
      avatar: GOAL_PRESET_IMAGES[0].url,
      targetAmount: 32_000_000,
      currentAmount: 14_500_000,
      startDate: offsetMonthDate(2, 1),
      targetDate: offsetDate(90),
      description: 'Nâng cấp máy tính phục vụ công việc thiết kế và lập trình.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'goal_reserve',
      name: 'Quỹ dự phòng 6 tháng',
      avatar: GOAL_PRESET_IMAGES[2].url,
      targetAmount: 60_000_000,
      currentAmount: 22_000_000,
      startDate: offsetMonthDate(3, 1),
      targetDate: offsetDate(240),
      description: 'Quỹ an toàn tài chính tách biệt khỏi chi tiêu hàng ngày.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'goal_travel',
      name: 'Du lịch Phú Quốc',
      avatar: GOAL_PRESET_IMAGES[1].url,
      targetAmount: 15_000_000,
      currentAmount: 6_000_000,
      startDate: offsetMonthDate(1, 10),
      targetDate: offsetDate(60),
      description: 'Chuyến nghỉ dưỡng cuối quý cùng gia đình.',
      createdAt: new Date().toISOString(),
    },
  ];

  const savingsDeposits: SavingsDeposit[] = [
    {
      id: 'dep_1',
      goalId: 'goal_reserve',
      bankAccountId: bank1.id,
      bankName: bank1.bankName,
      accountNumber: bank1.accountNumber,
      amount: 22_000_000,
      transactionCode: 'ML260915A1B2',
      transferNote: 'QUY DU PHONG ML260915A1B2',
      qrPayload: buildVietQrPayload({
        bin: bank1.bin,
        accountNumber: bank1.accountNumber,
        amount: 22_000_000,
        transferNote: 'QUY DU PHONG ML260915A1B2',
      }),
      status: 'confirmed',
      verificationMethod: 'api_webhook',
      createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
      verifiedAt: new Date(Date.now() - 45 * 86400000 + 60000).toISOString(),
    },
    {
      id: 'dep_2',
      goalId: 'goal_laptop',
      bankAccountId: bank1.id,
      bankName: bank1.bankName,
      accountNumber: bank1.accountNumber,
      amount: 14_500_000,
      transactionCode: 'ML261028K8P3',
      transferNote: 'MUA LAPTOP ML261028K8P3',
      qrPayload: buildVietQrPayload({
        bin: bank1.bin,
        accountNumber: bank1.accountNumber,
        amount: 14_500_000,
        transferNote: 'MUA LAPTOP ML261028K8P3',
      }),
      status: 'confirmed',
      verificationMethod: 'manual_unverified',
      createdAt: new Date(Date.now() - 18 * 86400000).toISOString(),
      verifiedAt: new Date(Date.now() - 18 * 86400000 + 120000).toISOString(),
    },
    {
      id: 'dep_3',
      goalId: 'goal_travel',
      bankAccountId: bank1.id,
      bankName: bank1.bankName,
      accountNumber: bank1.accountNumber,
      amount: 6_000_000,
      transactionCode: 'ML261110V5M9',
      transferNote: 'DU LICH ML261110V5M9',
      qrPayload: buildVietQrPayload({
        bin: bank1.bin,
        accountNumber: bank1.accountNumber,
        amount: 6_000_000,
        transferNote: 'DU LICH ML261110V5M9',
      }),
      status: 'confirmed',
      verificationMethod: 'api_webhook',
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      verifiedAt: new Date(Date.now() - 7 * 86400000 + 45000).toISOString(),
    },
    {
      id: 'dep_4',
      goalId: 'goal_laptop',
      bankAccountId: bank1.id,
      bankName: bank1.bankName,
      accountNumber: bank1.accountNumber,
      amount: 2_500_000,
      transactionCode: 'ML261122Q4Z7',
      transferNote: 'TIET KIEM ML261122Q4Z7',
      qrPayload: buildVietQrPayload({
        bin: bank1.bin,
        accountNumber: bank1.accountNumber,
        amount: 2_500_000,
        transferNote: 'TIET KIEM ML261122Q4Z7',
      }),
      status: 'pending',
      verificationMethod: 'none',
      createdAt: new Date().toISOString(),
    },
  ];

  const plans: PlanItem[] = [
    {
      id: 'plan_1',
      title: 'Đối soát chi tiêu tuần & gửi tiết kiệm',
      type: 'Kế hoạch tài chính',
      priority: 'high',
      status: 'in_progress',
      dueDate: offsetDate(0),
      dueTime: '20:00',
      reminderEnabled: true,
      description: 'Kiểm tra lại các hóa đơn và hoàn tất xác minh khoản gửi tiết kiệm 2.500.000₫.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'plan_2',
      title: 'Hoàn thiện báo cáo công việc quý IV',
      type: 'Công việc',
      priority: 'high',
      status: 'todo',
      dueDate: offsetDate(2),
      dueTime: '17:00',
      reminderEnabled: true,
      description: 'Tổng hợp số liệu và gửi bản nháp trước hạn.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'plan_3',
      title: 'Đọc 30 trang sách tài chính cá nhân',
      type: 'Thói quen hàng ngày',
      priority: 'medium',
      status: 'done',
      dueDate: offsetDate(0),
      dueTime: '21:30',
      reminderEnabled: false,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
    {
      id: 'plan_4',
      title: 'Ôn tập bài học ngoại ngữ 45 phút',
      type: 'Học tập',
      priority: 'medium',
      status: 'todo',
      dueDate: offsetDate(1),
      dueTime: '19:00',
      reminderEnabled: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'plan_5',
      title: 'Gia hạn bảo hiểm xe máy',
      type: 'Mục tiêu cá nhân',
      priority: 'low',
      status: 'todo',
      dueDate: offsetDate(-2),
      dueTime: '10:00',
      reminderEnabled: true,
      description: 'Khoản mục đã quá hạn 2 ngày, cần xử lý sớm.',
      createdAt: new Date().toISOString(),
    },
  ];

  return {
    ...base,
    transactions,
    savingsGoals,
    savingsDeposits,
    plans,
    bankAccounts: [bank1, bank2],
    sampleLoadedOnce: true,
  };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

function hasPersonalRecords(data: AppDatabaseState | null | undefined): boolean {
  if (!data) return false;
  return (
    (Array.isArray(data.transactions) && data.transactions.length > 0) ||
    (Array.isArray(data.savingsGoals) && data.savingsGoals.length > 0) ||
    (Array.isArray(data.plans) && data.plans.length > 0) ||
    (Array.isArray(data.bankAccounts) && data.bankAccounts.length > 0)
  );
}

/**
 * Inspects legacy single-user browser storage so we can ask the authenticated user
 * for explicit permission before importing old local data into their cloud account.
 */
export async function readLegacyLocalDatabase(userId: string): Promise<AppDatabaseState | null> {
  try {
    const dismissedKey = `mylife_legacy_handled_${userId}`;
    if (localStorage.getItem(dismissedKey) === '1') {
      return null;
    }
  } catch {
    // Ignore
  }

  try {
    const db = await openDb();
    const result = await new Promise<AppDatabaseState | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(STATE_KEY);
      req.onsuccess = () => resolve(req.result as AppDatabaseState | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (hasPersonalRecords(result)) {
      return result!;
    }
  } catch {
    // Fallback to localStorage check below
  }

  try {
    const raw = localStorage.getItem(LS_BACKUP_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppDatabaseState;
      if (hasPersonalRecords(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Ignore corrupt cache
  }

  return null;
}

export async function markLegacyHandledForUser(userId: string, clearLegacyStorage = false): Promise<void> {
  try {
    localStorage.setItem(`mylife_legacy_handled_${userId}`, '1');
    if (clearLegacyStorage) {
      localStorage.removeItem(LS_BACKUP_KEY);
    }
  } catch {
    // Ignore
  }

  if (clearLegacyStorage) {
    try {
      const db = await openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(STATE_KEY);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      db.close();
    } catch {
      // Ignore
    }
  }
}

export async function loadUserDevicePin(
  userId: string,
): Promise<{pinEnabled: boolean; pinHash?: string}> {
  try {
    const db = await openDb();
    const result = await new Promise<{pinEnabled?: boolean; pinHash?: string} | undefined>(
      (resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(`pin_${userId}`);
        req.onsuccess = () => resolve(req.result as {pinEnabled?: boolean; pinHash?: string} | undefined);
        req.onerror = () => reject(req.error);
      },
    );
    db.close();
    if (result && result.pinEnabled && result.pinHash) {
      return {pinEnabled: true, pinHash: result.pinHash};
    }
  } catch {
    // Ignore
  }
  return {pinEnabled: false};
}

export async function saveUserDevicePin(
  userId: string,
  pinEnabled: boolean,
  pinHash?: string,
): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = pinEnabled && pinHash
        ? store.put({pinEnabled: true, pinHash}, `pin_${userId}`)
        : store.delete(`pin_${userId}`);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
  } catch {
    // Ignore
  }
}
