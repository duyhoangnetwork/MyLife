import React, {useState} from 'react';
import {useOnlineStatus, usePWAInstall} from '../../hooks/usePWA';
import {CloseIcon, DownloadIcon} from '../icons/CustomIcons';

export const PWAInstallButton: React.FC<{compact?: boolean}> = ({compact = false}) => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`btn-press inline-flex items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap shrink-0 ${
          compact
            ? 'min-h-[40px] px-3 py-1.5 text-xs bg-[var(--accent-soft)] text-[var(--accent)] hover:opacity-90'
            : 'min-h-[44px] px-4 py-2 text-sm bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-95'
        }`}
      >
        <DownloadIcon className="w-4 h-4 shrink-0" />
        <span>Cài đặt ứng dụng</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="btn-press min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-alt)] whitespace-nowrap shrink-0"
        >
          <DownloadIcon className="w-4 h-4 shrink-0" />
          <span>Cài lên iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/50 backdrop-blur-sm p-0 sm:p-4">
            <div className="glass-surface modal-enter w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-6 pb-safe shadow-[var(--shadow-float)]">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold font-display text-[var(--text-primary)]">
                  Cài đặt MY LIFE trên iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Đóng hướng dẫn"
                  className="btn-press min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-surface-alt)]"
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
              <ol className="mt-4 space-y-2.5 text-sm text-[var(--text-secondary)]">
                <li>1. Nhấn nút <strong className="text-[var(--text-primary)]">Chia sẻ (Share)</strong> ở thanh công cụ Safari.</li>
                <li>2. Cuộn xuống và chọn <strong className="text-[var(--text-primary)]">Thêm vào MH chính (Add to Home Screen)</strong>.</li>
                <li>3. Nhấn <strong className="text-[var(--text-primary)]">Thêm</strong> để sử dụng như ứng dụng độc lập.</li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="btn-press mt-5 w-full min-h-[44px] rounded-xl bg-[var(--accent)] text-[var(--accent-fg)] text-sm font-semibold hover:opacity-95"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="glass-surface modal-enter fixed bottom-20 lg:bottom-5 left-4 z-40 rounded-xl border border-[var(--warning)]/35 px-3.5 py-2 text-xs font-medium text-[var(--text-primary)] shadow-[var(--shadow-float)] flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-[var(--warning)] shrink-0" />
      <span>Ngoại tuyến — Dữ liệu đang lưu cục bộ trên thiết bị</span>
    </div>
  );
};
