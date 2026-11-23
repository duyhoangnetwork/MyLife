import React, {useEffect, useState} from 'react';
import {useApp} from '../../context/AppContext';
import {GOAL_PRESET_IMAGES} from '../../services/storage';
import {
  BankAccount,
  PaymentMethod,
  PlanItem,
  PlanPriority,
  PlanType,
  SavingsDeposit,
  SavingsGoal,
  Transaction,
  TransactionType,
} from '../../types/app';
import {formatMoney, getTodayIso} from '../../utils/formatters';
import {buildVietQrPayload, generateTransferCode, VIETNAM_BANKS} from '../../utils/vietqr';
import {VietQrRenderer} from '../common/VietQrRenderer';
import {CheckIcon, CloseIcon, CopyIcon} from '../icons/CustomIcons';

const PAYMENT_METHODS: PaymentMethod[] = ['Chuyển khoản', 'Ví điện tử', 'Tiền mặt', 'Thẻ tín dụng'];
const PLAN_TYPES: PlanType[] = [
  'Công việc',
  'Học tập',
  'Mục tiêu cá nhân',
  'Kế hoạch tài chính',
  'Thói quen hàng ngày',
];

export const TransactionModal: React.FC<{
  open: boolean;
  initialType?: TransactionType;
  editing?: Transaction | null;
  onClose: () => void;
}> = ({open, initialType = 'expense', editing, onClose}) => {
  const {state, addTransaction, updateTransaction, showToast} = useApp();
  const [type, setType] = useState<TransactionType>(initialType);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(getTodayIso());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Chuyển khoản');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setType(editing.type);
      setTitle(editing.title);
      setAmount(String(editing.amount));
      setCategory(editing.category);
      setDate(editing.date);
      setPaymentMethod(editing.paymentMethod || 'Chuyển khoản');
      setNote(editing.note || '');
    } else {
      setType(initialType);
      setTitle('');
      setAmount('');
      const list = initialType === 'income' ? state.settings.categories.income : state.settings.categories.expense;
      setCategory(list[0] || 'Khác');
      setDate(getTodayIso());
      setPaymentMethod('Chuyển khoản');
      setNote('');
    }
  }, [open, editing, initialType, state.settings.categories]);

  if (!open) return null;

  const categories = type === 'income' ? state.settings.categories.income : state.settings.categories.expense;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!title.trim()) {
      showToast({type: 'error', title: 'Vui lòng nhập tên giao dịch'});
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      showToast({type: 'error', title: 'Số tiền phải lớn hơn 0'});
      return;
    }
    const payload = {
      type,
      title: title.trim(),
      amount: Math.round(numericAmount),
      category: category || categories[0] || 'Khác',
      date: date || getTodayIso(),
      paymentMethod: type === 'expense' ? paymentMethod : undefined,
      note: note.trim() || undefined,
    };
    if (editing) {
      updateTransaction(editing.id, payload);
    } else {
      addTransaction(payload);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-xs p-0 sm:p-4">
      <div className="glass-surface modal-enter w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92dvh] overflow-y-auto p-5 sm:p-6 pb-safe shadow-2xl">
        <div className="w-9 h-1 bg-[var(--border-hairline)] rounded-full mx-auto mb-3 sm:hidden" />
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold font-display text-[var(--text-primary)]">
            {editing ? 'Chỉnh sửa giao dịch' : type === 'income' ? 'Thêm khoản thu' : 'Thêm khoản chi'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] btn-press"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)]">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setCategory(state.settings.categories.expense[0] || 'Ăn uống');
              }}
              className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors ${
                type === 'expense'
                  ? 'bg-[var(--bg-surface)] text-[var(--danger)] shadow-xs'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              Chi tiêu
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                setCategory(state.settings.categories.income[0] || 'Lương');
              }}
              className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors ${
                type === 'income'
                  ? 'bg-[var(--bg-surface)] text-[var(--success)] shadow-xs'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              Thu nhập
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              {type === 'income' ? 'Tên khoản thu' : 'Tên khoản chi'}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'income' ? 'Ví dụ: Lương tháng 11' : 'Ví dụ: Ăn trưa văn phòng'}
              className="w-full min-h-[44px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                Số tiền ({state.settings.currency})
              </label>
              <input
                type="number"
                inputMode="decimal"
                min="1"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full min-h-[44px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3.5 text-sm font-mono-tabular text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                {type === 'income' ? 'Ngày nhận' : 'Ngày chi'}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3.5 text-sm font-mono-tabular text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div className={`grid grid-cols-1 ${type === 'expense' ? 'sm:grid-cols-2' : ''} gap-3`}>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Danh mục</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {type === 'expense' && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Phương thức thanh toán</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full min-h-[44px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Ghi chú (tùy chọn)</label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Thêm ghi chú chi tiết..."
              className="w-full rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-4 rounded-xl bg-[var(--bg-surface-alt)] text-sm font-medium text-[var(--text-secondary)] btn-press"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="min-h-[42px] px-5 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-semibold hover:opacity-90 btn-press"
            >
              {editing ? 'Lưu thay đổi' : 'Lưu giao dịch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const GoalModal: React.FC<{
  open: boolean;
  editing?: SavingsGoal | null;
  onClose: () => void;
}> = ({open, editing, onClose}) => {
  const {addSavingsGoal, updateSavingsGoal, showToast, state} = useApp();
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [startDate, setStartDate] = useState(getTodayIso());
  const [targetDate, setTargetDate] = useState('');
  const [avatar, setAvatar] = useState(GOAL_PRESET_IMAGES[0].url);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setTargetAmount(String(editing.targetAmount));
      setStartDate(editing.startDate);
      setTargetDate(editing.targetDate);
      setAvatar(editing.avatar || GOAL_PRESET_IMAGES[0].url);
      setDescription(editing.description || '');
    } else {
      setName('');
      setTargetAmount('');
      const today = getTodayIso();
      setStartDate(today);
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 3);
      setTargetDate(nextMonth.toISOString().slice(0, 10));
      setAvatar(GOAL_PRESET_IMAGES[0].url);
      setDescription('');
    }
  }, [open, editing]);

  if (!open) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setAvatar(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = Number(targetAmount);
    if (!name.trim()) {
      showToast({type: 'error', title: 'Vui lòng nhập tên mục tiêu'});
      return;
    }
    if (!Number.isFinite(target) || target <= 0) {
      showToast({type: 'error', title: 'Số tiền cần đạt phải lớn hơn 0'});
      return;
    }
    const payload = {
      name: name.trim(),
      targetAmount: Math.round(target),
      startDate,
      targetDate,
      avatar,
      description: description.trim() || undefined,
    };
    if (editing) {
      updateSavingsGoal(editing.id, payload);
    } else {
      addSavingsGoal(payload);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-xs p-0 sm:p-4">
      <div className="glass-surface modal-enter w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92dvh] overflow-y-auto p-5 sm:p-6 pb-safe shadow-2xl">
        <div className="w-9 h-1 bg-[var(--border-hairline)] rounded-full mx-auto mb-3 sm:hidden" />
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold font-display text-[var(--text-primary)]">
            {editing ? 'Chỉnh sửa mục tiêu' : 'Tạo mục tiêu tiết kiệm'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[var(--text-muted)] btn-press"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Ảnh minh họa mục tiêu</label>
            <div className="grid grid-cols-4 gap-2">
              {GOAL_PRESET_IMAGES.map((preset) => (
                <button
                  key={preset.url}
                  type="button"
                  onClick={() => setAvatar(preset.url)}
                  className={`relative rounded-xl overflow-hidden aspect-[4/3] border-2 transition-all ${
                    avatar === preset.url ? 'border-[var(--accent)]' : 'border-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                </button>
              ))}
              <label className="rounded-xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-surface)] aspect-[4/3] flex flex-col items-center justify-center text-[11px] text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)]">
                <span>Tải ảnh</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Tên mục tiêu</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Mua điện thoại, Tiền dự phòng..."
              className="w-full min-h-[44px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Số tiền cần đạt ({state.settings.currency})
            </label>
            <input
              type="number"
              inputMode="decimal"
              min="1"
              required
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="20000000"
              className="w-full min-h-[44px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3.5 text-sm font-mono-tabular text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Ngày bắt đầu</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 text-sm font-mono-tabular text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Ngày dự kiến</label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 text-sm font-mono-tabular text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Mô tả</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú kế hoạch tích lũy..."
              className="w-full rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-3 text-sm text-[var(--text-primary)]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-4 rounded-xl bg-[var(--bg-surface-alt)] text-sm font-medium text-[var(--text-secondary)] btn-press"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="min-h-[42px] px-5 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-semibold hover:opacity-90 btn-press"
            >
              {editing ? 'Cập nhật' : 'Tạo mục tiêu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const PlanModal: React.FC<{
  open: boolean;
  editing?: PlanItem | null;
  onClose: () => void;
}> = ({open, editing, onClose}) => {
  const {addPlan, updatePlan, showToast} = useApp();
  const [title, setTitle] = useState('');
  const [type, setType] = useState<PlanType>('Công việc');
  const [priority, setPriority] = useState<PlanPriority>('medium');
  const [status, setStatus] = useState<PlanItem['status']>('todo');
  const [dueDate, setDueDate] = useState(getTodayIso());
  const [dueTime, setDueTime] = useState('09:00');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTitle(editing.title);
      setType(editing.type);
      setPriority(editing.priority);
      setStatus(editing.status);
      setDueDate(editing.dueDate);
      setDueTime(editing.dueTime || '09:00');
      setReminderEnabled(editing.reminderEnabled);
      setDescription(editing.description || '');
    } else {
      setTitle('');
      setType('Công việc');
      setPriority('medium');
      setStatus('todo');
      setDueDate(getTodayIso());
      setDueTime('09:00');
      setReminderEnabled(true);
      setDescription('');
    }
  }, [open, editing]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast({type: 'error', title: 'Vui lòng nhập tên kế hoạch'});
      return;
    }
    const payload = {
      title: title.trim(),
      type,
      priority,
      status,
      dueDate,
      dueTime,
      reminderEnabled,
      description: description.trim() || undefined,
      completedAt: status === 'done' ? editing?.completedAt || new Date().toISOString() : undefined,
    };
    if (editing) updatePlan(editing.id, payload);
    else addPlan(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-xs p-0 sm:p-4">
      <div className="glass-surface modal-enter w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92dvh] overflow-y-auto p-5 sm:p-6 pb-safe shadow-2xl">
        <div className="w-9 h-1 bg-[var(--border-hairline)] rounded-full mx-auto mb-3 sm:hidden" />
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold font-display text-[var(--text-primary)]">
            {editing ? 'Chỉnh sửa kế hoạch' : 'Tạo kế hoạch mới'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[var(--text-muted)] btn-press"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Tên kế hoạch / công việc</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Hoàn thành báo cáo, Học tiếng Anh..."
              className="w-full min-h-[44px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3.5 text-sm text-[var(--text-primary)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Phân loại</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PlanType)}
                className="w-full min-h-[44px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 text-sm text-[var(--text-primary)]"
              >
                {PLAN_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Mức độ ưu tiên</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PlanPriority)}
                className="w-full min-h-[44px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 text-sm text-[var(--text-primary)]"
              >
                <option value="high">Cao</option>
                <option value="medium">Trung bình</option>
                <option value="low">Thấp</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Thời hạn (Ngày)</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 text-sm font-mono-tabular text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Giờ nhắc</label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full min-h-[44px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 text-sm font-mono-tabular text-[var(--text-primary)]"
              />
            </div>
          </div>

          {editing && (
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Trạng thái</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PlanItem['status'])}
                className="w-full min-h-[44px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3 text-sm text-[var(--text-primary)]"
              >
                <option value="todo">Chưa thực hiện</option>
                <option value="in_progress">Đang thực hiện</option>
                <option value="done">Hoàn thành</option>
              </select>
            </div>
          )}

          <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3.5 py-2.5 flex items-center justify-between">
            <span className="text-sm text-[var(--text-primary)]">Bật nhắc nhở công việc</span>
            <button
              type="button"
              role="switch"
              aria-checked={reminderEnabled}
              data-checked={reminderEnabled}
              onClick={() => setReminderEnabled((v) => !v)}
              className="ios-toggle"
            >
              <span className="ios-toggle-thumb" />
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Ghi chú</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả chi tiết công việc..."
              className="w-full rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-3 text-sm text-[var(--text-primary)]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] px-4 rounded-xl bg-[var(--bg-surface-alt)] text-sm font-medium text-[var(--text-secondary)] btn-press"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="min-h-[42px] px-5 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-semibold hover:opacity-90 btn-press"
            >
              {editing ? 'Lưu kế hoạch' : 'Tạo kế hoạch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const VietQrDepositWizardModal: React.FC<{
  open: boolean;
  preselectedGoalId?: string;
  onClose: () => void;
  onCreatedPending?: (deposit: SavingsDeposit) => void;
}> = ({open, preselectedGoalId, onClose, onCreatedPending}) => {
  const {state, addBankAccount, createPendingDeposit, showToast, setActiveTab} = useApp();
  const [step, setStep] = useState<'form' | 'qr'>('form');
  const [goalId, setGoalId] = useState('');
  const [bankAccountId, setBankAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [txCode, setTxCode] = useState('');
  const [qrPayload, setQrPayload] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [copiedField, setCopiedField] = useState<'account' | 'note' | null>(null);

  const [showQuickBank, setShowQuickBank] = useState(false);
  const [quickBin, setQuickBin] = useState(VIETNAM_BANKS[0].bin);
  const [quickAccountNumber, setQuickAccountNumber] = useState('');
  const [quickHolder, setQuickHolder] = useState('');

  useEffect(() => {
    if (!open) return;
    setStep('form');
    setAmount('');
    setCopiedField(null);
    setGoalId(preselectedGoalId || state.savingsGoals[0]?.id || '');
    const defaultBank = state.bankAccounts.find((b) => b.isDefault) || state.bankAccounts[0];
    setBankAccountId(defaultBank?.id || '');
    setShowQuickBank(state.bankAccounts.length === 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preselectedGoalId]);

  useEffect(() => {
    if (!open) return;
    if (!bankAccountId && state.bankAccounts.length > 0) {
      const defaultBank = state.bankAccounts.find((b) => b.isDefault) || state.bankAccounts[0];
      if (defaultBank) setBankAccountId(defaultBank.id);
    }
    if (!goalId && state.savingsGoals.length > 0) {
      setGoalId(state.savingsGoals[0].id);
    }
  }, [open, bankAccountId, goalId, state.bankAccounts, state.savingsGoals]);

  if (!open) return null;

  const selectedGoal = state.savingsGoals.find((g) => g.id === goalId);
  const selectedBank = state.bankAccounts.find((b) => b.id === bankAccountId);

  const handleQuickAddBank = (e: React.FormEvent) => {
    e.preventDefault();
    const bankInfo = VIETNAM_BANKS.find((b) => b.bin === quickBin) || VIETNAM_BANKS[0];
    if (!quickAccountNumber.trim() || !quickHolder.trim()) {
      showToast({type: 'error', title: 'Vui lòng nhập đủ số tài khoản và tên chủ tài khoản'});
      return;
    }
    addBankAccount({
      bankShortName: bankInfo.shortName,
      bankName: bankInfo.name,
      bin: bankInfo.bin,
      accountNumber: quickAccountNumber.trim(),
      accountHolder: quickHolder.trim().toUpperCase(),
      defaultNote: 'TIET KIEM MY LIFE',
      isDefault: true,
    });
    setShowQuickBank(false);
  };

  const handleGenerateQr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) {
      showToast({type: 'error', title: 'Hãy tạo ít nhất một mục tiêu tiết kiệm trước'});
      return;
    }
    if (!selectedBank) {
      showToast({type: 'error', title: 'Vui lòng chọn hoặc thêm tài khoản ngân hàng nhận tiền'});
      return;
    }
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount < 1000) {
      showToast({type: 'error', title: 'Số tiền gửi tối thiểu là 1.000 ₫'});
      return;
    }
    const code = generateTransferCode();
    const note = `${selectedBank.defaultNote || 'TIET KIEM'} ${code}`.trim();
    const payload = buildVietQrPayload({
      bin: selectedBank.bin,
      accountNumber: selectedBank.accountNumber,
      amount: Math.round(numAmount),
      transferNote: note,
    });
    setTxCode(code);
    setTransferNote(note);
    setQrPayload(payload);
    setCopiedField(null);
    setStep('qr');
  };

  const handleCopy = async (text: string, field: 'account' | 'note', label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
      showToast({type: 'success', title: `Đã sao chép ${label}`});
    } catch {
      showToast({type: 'info', title: `${label}: ${text}`});
    }
  };

  const handleRecordPending = () => {
    if (!selectedGoal || !selectedBank) return;
    const created = createPendingDeposit({
      goalId: selectedGoal.id,
      bankAccountId: selectedBank.id,
      bankName: selectedBank.bankName,
      accountNumber: selectedBank.accountNumber,
      amount: Math.round(Number(amount)),
      transactionCode: txCode,
      transferNote,
      qrPayload,
    });
    onCreatedPending?.(created);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-xs p-0 sm:p-4">
      <div className="glass-surface modal-enter w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[92dvh] overflow-y-auto p-5 sm:p-6 pb-safe shadow-2xl">
        <div className="w-9 h-1 bg-[var(--border-hairline)] rounded-full mx-auto mb-3 sm:hidden" />
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold font-display text-[var(--text-primary)]">
              {step === 'form' ? 'Gửi tiết kiệm qua VietQR' : 'Chuyển khoản VietQR'}
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {step === 'form'
                ? 'Tạo mã QR chuẩn NAPAS 247 với mã đối soát riêng'
                : selectedGoal?.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[var(--text-muted)] btn-press"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {state.savingsGoals.length === 0 ? (
          <div className="mt-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-5 text-center">
            <p className="text-sm text-[var(--text-secondary)]">
              Bạn chưa có mục tiêu tiết kiệm nào. Hãy tạo mục tiêu trước khi gửi tiền.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                setActiveTab('savings');
              }}
              className="mt-4 min-h-[42px] px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-semibold btn-press"
            >
              Đi tới trang Tiết kiệm
            </button>
          </div>
        ) : step === 'form' ? (
          <div className="mt-4 space-y-4">
            {showQuickBank ? (
              <form
                onSubmit={handleQuickAddBank}
                className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Thiết lập tài khoản nhận tiết kiệm
                  </span>
                  {state.bankAccounts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowQuickBank(false)}
                      className="text-xs font-medium text-[var(--accent)]"
                    >
                      Chọn có sẵn
                    </button>
                  )}
                </div>
                <select
                  value={quickBin}
                  onChange={(e) => setQuickBin(e.target.value)}
                  className="w-full min-h-[42px] rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] px-3 text-sm text-[var(--text-primary)]"
                >
                  {VIETNAM_BANKS.map((b) => (
                    <option key={b.bin} value={b.bin}>
                      {b.name} ({b.shortName} · BIN {b.bin})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  required
                  value={quickAccountNumber}
                  onChange={(e) => setQuickAccountNumber(e.target.value)}
                  placeholder="Số tài khoản nhận tiền"
                  className="w-full min-h-[42px] rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] px-3 text-sm font-mono-tabular text-[var(--text-primary)]"
                />
                <input
                  type="text"
                  required
                  value={quickHolder}
                  onChange={(e) => setQuickHolder(e.target.value)}
                  placeholder="Tên chủ tài khoản (không dấu)"
                  className="w-full min-h-[42px] rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] px-3 text-sm uppercase text-[var(--text-primary)]"
                />
                <p className="text-[11px] text-[var(--text-muted)]">
                  Chỉ lưu thông tin tài khoản nhận chuẩn VietQR. Không yêu cầu mật khẩu hay OTP.
                </p>
                <button
                  type="submit"
                  className="w-full min-h-[42px] rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-semibold btn-press"
                >
                  Lưu tài khoản ngân hàng
                </button>
              </form>
            ) : (
              <form onSubmit={handleGenerateQr} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                    Mục tiêu tiết kiệm
                  </label>
                  <select
                    value={goalId}
                    onChange={(e) => setGoalId(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3.5 text-sm text-[var(--text-primary)]"
                  >
                    {state.savingsGoals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({formatMoney(g.currentAmount, state.settings.currency)} /{' '}
                        {formatMoney(g.targetAmount, state.settings.currency)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-[var(--text-muted)]">Tài khoản nhận VietQR</label>
                    <button
                      type="button"
                      onClick={() => setShowQuickBank(true)}
                      className="text-xs font-medium text-[var(--accent)]"
                    >
                      + Thêm tài khoản
                    </button>
                  </div>
                  <select
                    value={bankAccountId}
                    onChange={(e) => setBankAccountId(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3.5 text-sm text-[var(--text-primary)]"
                  >
                    {state.bankAccounts.map((b: BankAccount) => (
                      <option key={b.id} value={b.id}>
                        {b.bankName} · {b.accountNumber} ({b.accountHolder})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
                    Số tiền muốn gửi (VND)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1000"
                    step="1000"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="500000"
                    className="w-full min-h-[48px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3.5 text-lg font-mono-tabular font-semibold text-[var(--text-primary)]"
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[200_000, 500_000, 1_000_000, 2_000_000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAmount(String(preset))}
                        className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface-alt)] border border-[var(--border-hairline)] text-xs font-mono-tabular text-[var(--text-secondary)] hover:text-[var(--text-primary)] btn-press"
                      >
                        {formatMoney(preset, 'VND')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[42px] px-4 rounded-xl bg-[var(--bg-surface-alt)] text-sm font-medium text-[var(--text-secondary)] btn-press"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="min-h-[42px] px-5 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-semibold hover:opacity-90 btn-press"
                  >
                    Tạo mã VietQR
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Emphasized Amount Header */}
            <div className="text-center py-2 border-b border-[var(--border-hairline)]">
              <span className="text-xs text-[var(--text-muted)]">Số tiền cần chuyển</span>
              <p className="text-2xl font-bold font-mono-tabular text-[var(--text-primary)] mt-0.5">
                {formatMoney(Number(amount), 'VND')}
              </p>
            </div>

            {selectedBank && (
              <VietQrRenderer
                payload={qrPayload}
                bankName={selectedBank.bankName}
                accountNumber={selectedBank.accountNumber}
                accountHolder={selectedBank.accountHolder}
                amount={Number(amount)}
                transferNote={transferNote}
              />
            )}

            {/* Tiered Bank Details */}
            <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] divide-y divide-[var(--border-hairline)] text-sm">
              <div className="px-4 py-2.5 flex items-center justify-between gap-2">
                <span className="text-xs text-[var(--text-muted)]">Ngân hàng</span>
                <span className="font-semibold text-[var(--text-primary)]">{selectedBank?.bankName}</span>
              </div>
              <div className="px-4 py-2.5 flex items-center justify-between gap-2">
                <span className="text-xs text-[var(--text-muted)]">Chủ tài khoản</span>
                <span className="font-semibold text-[var(--text-primary)]">{selectedBank?.accountHolder}</span>
              </div>
              <div className="px-4 py-2.5 flex items-center justify-between gap-2">
                <span className="text-xs text-[var(--text-muted)]">Số tài khoản</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono-tabular font-semibold text-[var(--text-primary)]">
                    {selectedBank?.accountNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedBank?.accountNumber || '', 'account', 'số tài khoản')}
                    className="min-h-[30px] px-2.5 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-medium inline-flex items-center gap-1 btn-press"
                  >
                    {copiedField === 'account' ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'account' ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>
              </div>
              <div className="px-4 py-2.5 flex items-center justify-between gap-2">
                <span className="text-xs text-[var(--text-muted)]">Nội dung CK</span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono-tabular text-xs font-semibold text-[var(--text-primary)] truncate">
                    {transferNote}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(transferNote, 'note', 'nội dung CK')}
                    className="min-h-[30px] px-2.5 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-medium inline-flex items-center gap-1 shrink-0 btn-press"
                  >
                    {copiedField === 'note' ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'note' ? 'Đã chép' : 'Chép'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[var(--warning-soft)] border border-[var(--warning)]/25 px-3.5 py-2.5 text-xs text-[var(--text-secondary)] leading-relaxed">
              Giao dịch sẽ được lưu ở trạng thái <strong className="text-[var(--text-primary)]">Chờ xác nhận</strong> và chỉ cộng vào mục tiêu sau khi được đối soát hoặc bạn xác nhận thủ công.
            </div>

            <div className="flex items-center justify-between gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="min-h-[42px] px-4 rounded-xl bg-[var(--bg-surface-alt)] text-sm font-medium text-[var(--text-secondary)] btn-press"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleRecordPending}
                className="flex-1 min-h-[42px] px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-semibold inline-flex items-center justify-center gap-1.5 hover:opacity-90 btn-press"
              >
                <CheckIcon className="w-4 h-4" />
                <span>Lưu lệnh chờ xác nhận</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
