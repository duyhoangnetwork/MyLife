export interface VietnamBankInfo {
  shortName: string;
  name: string;
  bin: string;
}

export const VIETNAM_BANKS: VietnamBankInfo[] = [
  {shortName: 'VCB', name: 'Vietcombank', bin: '970436'},
  {shortName: 'TCB', name: 'Techcombank', bin: '970407'},
  {shortName: 'MB', name: 'MB Bank', bin: '970422'},
  {shortName: 'ICB', name: 'VietinBank', bin: '970415'},
  {shortName: 'BIDV', name: 'BIDV', bin: '970418'},
  {shortName: 'VPB', name: 'VPBank', bin: '970432'},
  {shortName: 'ACB', name: 'ACB', bin: '970416'},
  {shortName: 'TPB', name: 'TPBank', bin: '970423'},
  {shortName: 'STB', name: 'Sacombank', bin: '970403'},
  {shortName: 'VIB', name: 'VIB', bin: '970441'},
  {shortName: 'HDB', name: 'HDBank', bin: '970437'},
  {shortName: 'OCB', name: 'OCB', bin: '970448'},
  {shortName: 'MSB', name: 'MSB', bin: '970426'},
  {shortName: 'BVB', name: 'Timo / BVBank', bin: '970454'},
  {shortName: 'SHB', name: 'SHB', bin: '970443'},
];

export function removeVietnameseDiacritics(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s\-_.]/g, '')
    .trim();
}

function tlv(tag: string, value: string): string {
  const len = String(value.length).padStart(2, '0');
  return `${tag}${len}${value}`;
}

/**
 * CRC-16/CCITT-FALSE (polynomial 0x1021, initial value 0xFFFF)
 * Required by EMVCo & NAPAS 247 VietQR specification.
 */
export function calculateCrc16Ccitt(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface VietQRParams {
  bin: string;
  accountNumber: string;
  amount?: number;
  transferNote?: string;
}

export function buildVietQrPayload({bin, accountNumber, amount, transferNote}: VietQRParams): string {
  const cleanBin = bin.replace(/\D/g, '').slice(0, 6);
  const cleanAccount = accountNumber.replace(/[^a-zA-Z0-9]/g, '').slice(0, 19);
  const cleanNote = transferNote ? removeVietnameseDiacritics(transferNote).slice(0, 50) : '';

  const beneficiaryInfo = tlv('00', cleanBin) + tlv('01', cleanAccount);
  const napasTag38 = tlv('00', 'A000000727') + tlv('01', beneficiaryInfo) + tlv('02', 'QRIBFTTA');

  const hasAmount = typeof amount === 'number' && Number.isFinite(amount) && amount > 0;
  const initiationMethod = hasAmount ? '12' : '11';

  let body =
    tlv('00', '01') +
    tlv('01', initiationMethod) +
    tlv('38', napasTag38) +
    tlv('53', '704');

  if (hasAmount) {
    body += tlv('54', String(Math.round(amount)));
  }

  body += tlv('58', 'VN');

  if (cleanNote) {
    body += tlv('62', tlv('08', cleanNote));
  }

  const withCrcTag = `${body}6304`;
  const crc = calculateCrc16Ccitt(withCrcTag);
  return `${withCrcTag}${crc}`;
}

export function generateTransferCode(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return `ML${yy}${mm}${dd}${rand}`;
}
