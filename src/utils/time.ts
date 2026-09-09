export function isValid24hTime(timeStr: string): boolean {
  if (!timeStr || typeof timeStr !== 'string') return false;
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr.trim());
}

export function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr || '00';
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m} ${period}`;
}

export function getNextReminderSlot(times: string[]): { nextIndex: number; nextTime: string; isTomorrow: boolean } {
  if (!times || times.length === 0) {
    return { nextIndex: 0, nextTime: '08:00', isTomorrow: false };
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (let i = 0; i < times.length; i++) {
    const [h, m] = times[i].split(':').map(Number);
    const slotMinutes = h * 60 + m;
    if (slotMinutes > currentMinutes) {
      return { nextIndex: i, nextTime: times[i], isTomorrow: false };
    }
  }

  // All slots passed today, next is first slot tomorrow
  return { nextIndex: 0, nextTime: times[0], isTomorrow: true };
}

export function formatTimeRemaining(time24: string, isTomorrow: boolean): string {
  const now = new Date();
  const [h, m] = time24.split(':').map(Number);
  const target = new Date();
  target.setHours(h, m, 0, 0);

  if (isTomorrow || target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  const diffMs = target.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours > 0) {
    return `in ${diffHours}h ${diffMinutes}m`;
  }
  return `in ${diffMinutes}m`;
}

export function parseCanonicalTime(time24: string): { hour12: number; minute: number; isPM: boolean } {
  if (!time24 || typeof time24 !== 'string') {
    return { hour12: 8, minute: 0, isPM: false };
  }
  const parts = time24.trim().split(':');
  let h = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10);
  if (isNaN(h) || h < 0 || h > 23) h = 8;
  if (isNaN(m) || m < 0 || m > 59) m = 0;

  const isPM = h >= 12;
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;

  return { hour12, minute: m, isPM };
}

export function toCanonical24h(hour12: number, minute: number, isPM: boolean): string {
  let h24 = hour12 % 12;
  if (isPM) h24 += 12;
  return `${String(h24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function formatTime12hDisplay(canonical24: string): string {
  const { hour12, minute, isPM } = parseCanonicalTime(canonical24);
  const mStr = String(minute).padStart(2, '0');
  const period = isPM ? 'PM' : 'AM';
  return `${hour12}:${mStr} ${period}`;
}

export function sortTimesChronologically(times: string[]): string[] {
  return [...times].sort((a, b) => {
    const [hA, mA] = a.split(':').map(Number);
    const [hB, mB] = b.split(':').map(Number);
    return (hA || 0) * 60 + (mA || 0) - ((hB || 0) * 60 + (mB || 0));
  });
}

export function isDuplicateTime(time: string, existingTimes: string[], ignoreIndex: number = -1): boolean {
  const clean = time.trim();
  return existingTimes.some((t, i) => i !== ignoreIndex && t.trim() === clean);
}

