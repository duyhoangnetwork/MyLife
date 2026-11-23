import React from 'react';

export interface IconProps {
  className?: string;
  filled?: boolean;
}

export const DashboardIcon: React.FC<IconProps> = ({className = 'w-5 h-5', filled}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect
      x="3.5"
      y="3.5"
      width="7"
      height="8"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.75"
      fill={filled ? 'currentColor' : 'none'}
      fillOpacity={filled ? 0.2 : 0}
    />
    <rect
      x="13.5"
      y="3.5"
      width="7"
      height="5"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.75"
      fill={filled ? 'currentColor' : 'none'}
      fillOpacity={filled ? 0.2 : 0}
    />
    <rect
      x="13.5"
      y="11.5"
      width="7"
      height="9"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.75"
      fill={filled ? 'currentColor' : 'none'}
      fillOpacity={filled ? 0.2 : 0}
    />
    <rect
      x="3.5"
      y="14.5"
      width="7"
      height="6"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.75"
      fill={filled ? 'currentColor' : 'none'}
      fillOpacity={filled ? 0.2 : 0}
    />
  </svg>
);

export const FinanceIcon: React.FC<IconProps> = ({className = 'w-5 h-5', filled}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect
      x="3"
      y="5.5"
      width="18"
      height="13"
      rx="3"
      stroke="currentColor"
      strokeWidth="1.75"
      fill={filled ? 'currentColor' : 'none'}
      fillOpacity={filled ? 0.16 : 0}
    />
    <path d="M3 9.5H21" stroke="currentColor" strokeWidth="1.75" />
    <path d="M7 14.5H12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <circle cx="16.5" cy="14.5" r="1.25" fill="currentColor" />
  </svg>
);

export const SavingsIcon: React.FC<IconProps> = ({className = 'w-5 h-5', filled}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M12 3.5L19.5 7.5V16.5L12 20.5L4.5 16.5V7.5L12 3.5Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
      fill={filled ? 'currentColor' : 'none'}
      fillOpacity={filled ? 0.16 : 0}
    />
    <path d="M12 8V16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <path
      d="M14.5 9.75C14.5 8.78 13.38 8 12 8C10.62 8 9.5 8.78 9.5 9.75C9.5 10.72 10.62 11.5 12 11.5C13.38 11.5 14.5 12.28 14.5 13.25C14.5 14.22 13.38 15 12 15C10.62 15 9.5 14.22 9.5 13.25"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
  </svg>
);

export const PlannerIcon: React.FC<IconProps> = ({className = 'w-5 h-5', filled}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect
      x="3.5"
      y="5"
      width="17"
      height="15.5"
      rx="2.5"
      stroke="currentColor"
      strokeWidth="1.75"
      fill={filled ? 'currentColor' : 'none'}
      fillOpacity={filled ? 0.16 : 0}
    />
    <path d="M8 3.2V6.5M16 3.2V6.5M3.5 9.5H20.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <path d="M8.5 14.5L10.8 16.8L15.8 11.8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ProfileIcon: React.FC<IconProps> = ({className = 'w-5 h-5', filled}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle
      cx="12"
      cy="8.5"
      r="3.75"
      stroke="currentColor"
      strokeWidth="1.75"
      fill={filled ? 'currentColor' : 'none'}
      fillOpacity={filled ? 0.2 : 0}
    />
    <path
      d="M5 19.5C5.9 16.2 8.7 14.5 12 14.5C15.3 14.5 18.1 16.2 19 19.5"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
  </svg>
);

export const SettingsIcon: React.FC<IconProps> = ({className = 'w-5 h-5'}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
    <path
      d="M19.4 15A1.65 1.65 0 0 0 19.73 16.82L19.79 16.88A2 2 0 1 1 16.96 19.71L16.9 19.65A1.65 1.65 0 0 0 15.08 19.32A1.65 1.65 0 0 0 14.08 20.83V21A2 2 0 1 1 10.08 21V20.91A1.65 1.65 0 0 0 9 19.4A1.65 1.65 0 0 0 7.18 19.73L7.12 19.79A2 2 0 1 1 4.29 16.96L4.35 16.9A1.65 1.65 0 0 0 4.68 15.08A1.65 1.65 0 0 0 3.17 14.08H3A2 2 0 1 1 3 10.08H3.09A1.65 1.65 0 0 0 4.6 9A1.65 1.65 0 0 0 4.27 7.18L4.21 7.12A2 2 0 1 1 7.04 4.29L7.1 4.35A1.65 1.65 0 0 0 8.92 4.68H9A1.65 1.65 0 0 0 10 3.17V3A2 2 0 1 1 14 3V3.09A1.65 1.65 0 0 0 15 4.6A1.65 1.65 0 0 0 16.82 4.27L16.88 4.21A2 2 0 1 1 19.71 7.04L19.65 7.1A1.65 1.65 0 0 0 19.32 8.92V9A1.65 1.65 0 0 0 20.83 10H21A2 2 0 1 1 21 14H20.91A1.65 1.65 0 0 0 19.4 15Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const PlusIcon: React.FC<IconProps> = ({className = 'w-5 h-5'}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
  </svg>
);

export const MinusIcon: React.FC<IconProps> = ({className = 'w-5 h-5'}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M5 12H19" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
  </svg>
);

export const QrIcon: React.FC<IconProps> = ({className = 'w-5 h-5'}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.75" />
    <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.75" />
    <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.75" />
    <path d="M14 14H17V17H14V14ZM18.5 14H20.5V16.5H18.5V14ZM14 18.5H16.5V20.5H14V18.5ZM18 18H20.5V20.5H18V18Z" fill="currentColor" />
  </svg>
);

export const SearchIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.75" />
    <path d="M16 16L20.5 20.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

export const DownloadIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M12 4V15M12 15L7.5 10.5M12 15L16.5 10.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4.5 17.5V18.5C4.5 19.6 5.4 20.5 6.5 20.5H17.5C18.6 20.5 19.5 19.6 19.5 18.5V17.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

export const CopyIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="8.5" y="8.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.75" />
    <path d="M5.5 15.5H5C3.9 15.5 3 14.6 3 13.5V5C3 3.9 3.9 3 5 3H13.5C14.6 3 15.5 3.9 15.5 5V5.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

export const TrashIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M4.5 7H19.5M9.5 4H14.5M7 7V18.5C7 19.6 7.9 20.5 9 20.5H15C16.1 20.5 17 19.6 17 18.5V7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const EditIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M14.5 5.5L18.5 9.5L8.5 19.5H4.5V15.5L14.5 5.5Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M5.5 12.5L9.8 16.8L18.5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CloseIcon: React.FC<IconProps> = ({className = 'w-5 h-5'}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" />
  </svg>
);

export const BankIcon: React.FC<IconProps> = ({className = 'w-5 h-5'}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M3.5 9.5L12 4.5L20.5 9.5H3.5Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    <path d="M6 10V17.5M10 10V17.5M14 10V17.5M18 10V17.5M3.5 19.5H20.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

export const LockIcon: React.FC<IconProps> = ({className = 'w-5 h-5'}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.75" />
    <path d="M8 10.5V7.5C8 5.29 9.79 3.5 12 3.5C14.21 3.5 16 5.29 16 7.5V10.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <circle cx="12" cy="15.5" r="1.25" fill="currentColor" />
  </svg>
);

export const ArrowUpRightIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M7 17L17 7M17 7H9M17 7V15" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowDownLeftIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M17 7L7 17M7 17H15M7 17V9" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const BellIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M6.5 16.5H17.5L16.2 14V10C16.2 7.5 14.3 5.5 12 5.5C9.7 5.5 7.8 7.5 7.8 10V14L6.5 16.5Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    <path d="M10.5 19.5C10.9 20.1 11.4 20.5 12 20.5C12.6 20.5 13.1 20.1 13.5 19.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

export const ShieldCheckIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M12 3.5L19 6.5V12C19 16.2 16 19.4 12 20.5C8 19.4 5 16.2 5 12V6.5L12 3.5Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    <path d="M9 12.2L11.2 14.4L15.5 10" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronRightIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M9.5 6.5L15 12L9.5 17.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronLeftIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M14.5 6.5L9 12L14.5 17.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const EyeIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M2.5 12C4.5 8 7.9 6 12 6C16.1 6 19.5 8 21.5 12C19.5 16 16.1 18 12 18C7.9 18 4.5 16 2.5 12Z"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.75" />
  </svg>
);

export const EyeOffIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path d="M3.5 3.5L20.5 20.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    <path
      d="M9.9 6.3C10.6 6.1 11.3 6 12 6C16.1 6 19.5 8 21.5 12C20.5 14 19.1 15.5 17.4 16.5M6.6 7.5C4.9 8.5 3.5 10 2.5 12C4.5 16 7.9 18 12 18C13.1 18 14.2 17.8 15.2 17.5"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const LogoutIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M14 5H7.5C6.4 5 5.5 5.9 5.5 7V17C5.5 18.1 6.4 19 7.5 19H14"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
    <path d="M10.5 12H20M20 12L16.5 8.5M20 12L16.5 15.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const KeyIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="8.5" cy="14.5" r="3.5" stroke="currentColor" strokeWidth="1.75" />
    <path d="M11.2 12L19.5 4.5M19.5 4.5L21 6M16.5 7.2L18.5 9.2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const DeviceIcon: React.FC<IconProps> = ({className = 'w-4 h-4'}) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <rect x="4" y="4.5" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.75" />
    <path d="M8.5 19.5H15.5M12 15.5V19.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

