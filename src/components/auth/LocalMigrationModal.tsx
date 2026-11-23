import React, {useState} from 'react';
import {useApp} from '../../context/AppContext';
import {ShieldCheckIcon} from '../icons/CustomIcons';

export const LocalMigrationModal: React.FC = () => {
  const {legacyLocalData, authUser, importLegacyLocalData, dismissLegacyMigration} = useApp();
  const [submitting, setSubmitting] = useState(false);

  if (!legacyLocalData || !authUser) return null;

  const txCount = legacyLocalData.transactions?.length || 0;
  const goalCount = legacyLocalData.savingsGoals?.length || 0;
  const planCount = legacyLocalData.plans?.length || 0;
  const bankCount = legacyLocalData.bankAccounts?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
      <div className="glass-surface modal-enter w-full max-w-md rounded-2xl p-6 shadow-[var(--shadow-float)] space-y-4">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0">
            <ShieldCheckIcon className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold font-display text-[var(--text-primary)]">
              Phát hiện dữ liệu cục bộ cũ trên trình duyệt
            </h3>
            <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
              Trình duyệt này đang lưu dữ liệu từ phiên dùng trước. Bạn có muốn chuyển dữ liệu đó vào tài khoản{' '}
              <strong className="text-[var(--text-primary)]">{authUser.email}</strong> không?
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] p-3.5 grid grid-cols-2 gap-2.5 text-xs">
          <div>
            <span className="text-[var(--text-muted)]">Giao dịch thu chi</span>
            <p className="font-semibold font-mono-tabular text-[var(--text-primary)]">{txCount} mục</p>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Mục tiêu tiết kiệm</span>
            <p className="font-semibold font-mono-tabular text-[var(--text-primary)]">{goalCount} mục</p>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Kế hoạch cá nhân</span>
            <p className="font-semibold font-mono-tabular text-[var(--text-primary)]">{planCount} mục</p>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Tài khoản VietQR</span>
            <p className="font-semibold font-mono-tabular text-[var(--text-primary)]">{bankCount} tài khoản</p>
          </div>
        </div>

        <p className="text-[11px] text-[var(--text-muted)]">
          Ứng dụng tuyệt đối không tự động tải dữ liệu cũ lên máy chủ khi chưa có sự đồng ý của bạn.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 justify-end pt-1">
          <button
            type="button"
            disabled={submitting}
            onClick={() => dismissLegacyMigration(false)}
            className="btn-press min-h-[42px] px-4 rounded-xl bg-[var(--bg-surface-alt)] text-xs font-medium text-[var(--text-secondary)]"
          >
            Bỏ qua
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true);
              await importLegacyLocalData();
              setSubmitting(false);
            }}
            className="btn-press min-h-[42px] px-4 rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-xs font-semibold disabled:opacity-50"
          >
            {submitting ? 'Đang đồng bộ...' : 'Chuyển vào tài khoản này'}
          </button>
        </div>
      </div>
    </div>
  );
};
