import React, {useState} from 'react';
import {useApp} from '../../context/AppContext';
import {LockIcon} from '../icons/CustomIcons';

export const PinLockOverlay: React.FC = () => {
  const {isLocked, unlockWithPin, state} = useApp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  if (!isLocked) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;
    setChecking(true);
    const ok = await unlockWithPin(pin.trim());
    setChecking(false);
    if (!ok) {
      setError('Mã PIN chưa chính xác. Vui lòng thử lại.');
      setPin('');
    } else {
      setError('');
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-md p-4">
      <form
        onSubmit={handleSubmit}
        className="glass-surface modal-enter w-full max-w-sm rounded-2xl p-6 sm:p-7 shadow-[var(--shadow-float)] text-center"
      >
        <div className="w-12 h-12 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mx-auto">
          <LockIcon className="w-6 h-6" />
        </div>
        <h2 className="mt-4 text-lg font-bold font-display text-[var(--text-primary)]">
          MY LIFE đang khóa
        </h2>
        <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
          Xin chào {state.profile.name}, nhập mã PIN để mở khóa dữ liệu cá nhân.
        </p>

        <input
          type="password"
          inputMode="numeric"
          maxLength={8}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, ''));
            setError('');
          }}
          placeholder="••••"
          autoFocus
          className="mt-5 w-full text-center font-mono-tabular text-2xl tracking-[0.5em] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        />

        {error && <p className="mt-2.5 text-xs font-medium text-[var(--danger)]">{error}</p>}

        <button
          type="submit"
          disabled={checking || pin.length < 4}
          className="btn-press mt-5 w-full min-h-[48px] rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] font-semibold text-sm hover:opacity-95 disabled:opacity-40"
        >
          {checking ? 'Đang kiểm tra...' : 'Mở khóa'}
        </button>
      </form>
    </div>
  );
};
