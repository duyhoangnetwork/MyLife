import React, {useState} from 'react';
import {useApp} from '../../context/AppContext';
import {CheckIcon, CloseIcon} from '../icons/CustomIcons';

export const ToastStack: React.FC = () => {
  const {toasts, dismissToast} = useApp();
  if (toasts.length === 0) return null;

  const styleByType = {
    success: 'border-[var(--success)]/30 text-[var(--success)]',
    error: 'border-[var(--danger)]/30 text-[var(--danger)]',
    warning: 'border-[var(--warning)]/30 text-[var(--warning)]',
    info: 'border-[var(--accent)]/30 text-[var(--accent)]',
  };

  const labelByType = {
    success: 'Thành công',
    error: 'Lỗi',
    warning: 'Lưu ý',
    info: 'Thông báo',
  };

  return (
    <div
      className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2 pointer-events-none"
      role="region"
      aria-label="Thông báo"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto glass-surface modal-enter rounded-xl px-4 py-3 shadow-lg flex items-start justify-between gap-3 border ${styleByType[toast.type]}`}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <CheckIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{labelByType[toast.type]}</span>
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5 leading-snug">{toast.title}</p>
            {toast.description && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{toast.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Đóng thông báo"
            className="min-h-[36px] min-w-[36px] -mr-1.5 -mt-1 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors btn-press"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  requirePhrase?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  danger = false,
  requirePhrase,
  onConfirm,
  onCancel,
}) => {
  const [typed, setTyped] = useState('');
  if (!open) return null;

  const canSubmit = !requirePhrase || typed.trim().toUpperCase() === requirePhrase.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-xs p-0 sm:p-4">
      <div className="glass-surface modal-enter w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl pb-safe">
        <div className="w-9 h-1 bg-[var(--border-hairline)] rounded-full mx-auto mb-3.5 sm:hidden" />
        <h3 className="text-base font-bold font-display text-[var(--text-primary)]">{title}</h3>
        <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">{description}</p>

        {requirePhrase && (
          <div className="mt-4">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Nhập chính xác <span className="font-mono-tabular font-semibold text-[var(--text-primary)]">{requirePhrase}</span> để tiếp tục
            </label>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={requirePhrase}
              className="w-full rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              setTyped('');
              onCancel();
            }}
            className="min-h-[42px] px-4 py-2 rounded-xl text-sm font-medium bg-[var(--bg-surface-alt)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] btn-press whitespace-nowrap shrink-0"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => {
              setTyped('');
              onConfirm();
            }}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-sm font-semibold btn-press whitespace-nowrap shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
              danger
                ? 'bg-[var(--danger)] text-white hover:opacity-90'
                : 'bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
