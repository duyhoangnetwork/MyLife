import QRCode from 'qrcode';
import React, {useEffect, useState} from 'react';
import {DownloadIcon} from '../icons/CustomIcons';
import {formatMoney} from '../../utils/formatters';

interface VietQrRendererProps {
  payload: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  amount: number;
  transferNote: string;
}

export const VietQrRenderer: React.FC<VietQrRendererProps> = ({
  payload,
  bankName,
  accountNumber,
  accountHolder,
  amount,
  transferNote,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
      color: {
        dark: '#0B111A',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) {
          setQrDataUrl(url);
          setError(false);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [payload]);

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const canvas = document.createElement('canvas');
    canvas.width = 560;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VIETQR · MY LIFE SAVINGS', canvas.width / 2, 54);

    ctx.fillStyle = '#0284C7';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(bankName, canvas.width / 2, 92);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 100, 118, 360, 360);

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(formatMoney(amount, 'VND'), canvas.width / 2, 524);

      ctx.fillStyle = '#334155';
      ctx.font = '18px sans-serif';
      ctx.fillText(`${accountHolder} · ${accountNumber}`, canvas.width / 2, 566);

      ctx.fillStyle = '#475569';
      ctx.font = '16px monospace';
      ctx.fillText(`ND: ${transferNote}`, canvas.width / 2, 604);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '14px sans-serif';
      ctx.fillText('Quet bang ung dung ngan hang VietQR / NAPAS 247', canvas.width / 2, 666);

      const link = document.createElement('a');
      link.download = `VietQR_${transferNote.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = qrDataUrl;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="bg-white p-3.5 rounded-2xl shadow-md border border-slate-200">
        {error ? (
          <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-600 text-center p-4">
            Không thể tạo mã QR. Vui lòng kiểm tra số tài khoản và mã BIN ngân hàng.
          </div>
        ) : qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={`Mã VietQR chuyển ${formatMoney(amount, 'VND')} tới ${bankName}`}
            className="w-56 h-56 sm:w-64 sm:h-64 block rounded-lg"
          />
        ) : (
          <div className="w-56 h-56 animate-pulse bg-slate-100 rounded-lg" />
        )}
      </div>

      <button
        type="button"
        onClick={handleDownloadPng}
        disabled={!qrDataUrl}
        className="mt-3 min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface-alt)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:opacity-90 transition-opacity disabled:opacity-40 whitespace-nowrap"
      >
        <DownloadIcon className="w-4 h-4" />
        <span>Tải ảnh mã QR</span>
      </button>
    </div>
  );
};
