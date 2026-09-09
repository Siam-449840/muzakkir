import {
  parseCanonicalTime,
  toCanonical24h,
  formatTime12hDisplay,
  sortTimesChronologically,
  isDuplicateTime,
} from '../src/utils/time';

describe('WheelTimePicker Mathematical & String Utilities', () => {
  describe('parseCanonicalTime', () => {
    it('parses morning times correctly', () => {
      expect(parseCanonicalTime('08:30')).toEqual({ hour12: 8, minute: 30, isPM: false });
      expect(parseCanonicalTime('01:05')).toEqual({ hour12: 1, minute: 5, isPM: false });
      expect(parseCanonicalTime('11:59')).toEqual({ hour12: 11, minute: 59, isPM: false });
    });

    it('parses midnight correctly (00:00 -> 12:00 AM)', () => {
      expect(parseCanonicalTime('00:00')).toEqual({ hour12: 12, minute: 0, isPM: false });
      expect(parseCanonicalTime('00:45')).toEqual({ hour12: 12, minute: 45, isPM: false });
    });

    it('parses noon correctly (12:00 -> 12:00 PM)', () => {
      expect(parseCanonicalTime('12:00')).toEqual({ hour12: 12, minute: 0, isPM: true });
      expect(parseCanonicalTime('12:30')).toEqual({ hour12: 12, minute: 30, isPM: true });
    });

    it('parses afternoon & evening times correctly', () => {
      expect(parseCanonicalTime('13:15')).toEqual({ hour12: 1, minute: 15, isPM: true });
      expect(parseCanonicalTime('20:00')).toEqual({ hour12: 8, minute: 0, isPM: true });
      expect(parseCanonicalTime('23:59')).toEqual({ hour12: 11, minute: 59, isPM: true });
    });

    it('gracefully handles invalid or empty inputs', () => {
      expect(parseCanonicalTime('')).toEqual({ hour12: 8, minute: 0, isPM: false });
      expect(parseCanonicalTime('invalid')).toEqual({ hour12: 8, minute: 0, isPM: false });
      expect(parseCanonicalTime('25:99')).toEqual({ hour12: 8, minute: 0, isPM: false });
    });
  });

  describe('toCanonical24h', () => {
    it('converts morning hours to 24h canonical strings', () => {
      expect(toCanonical24h(8, 30, false)).toBe('08:30');
      expect(toCanonical24h(1, 5, false)).toBe('01:05');
      expect(toCanonical24h(11, 59, false)).toBe('11:59');
    });

    it('converts 12 AM to 00:00', () => {
      expect(toCanonical24h(12, 0, false)).toBe('00:00');
      expect(toCanonical24h(12, 45, false)).toBe('00:45');
    });

    it('converts 12 PM to 12:00', () => {
      expect(toCanonical24h(12, 0, true)).toBe('12:00');
      expect(toCanonical24h(12, 30, true)).toBe('12:30');
    });

    it('converts afternoon/night hours to 24h canonical strings', () => {
      expect(toCanonical24h(1, 15, true)).toBe('13:15');
      expect(toCanonical24h(8, 0, true)).toBe('20:00');
      expect(toCanonical24h(11, 59, true)).toBe('23:59');
    });
  });

  describe('formatTime12hDisplay', () => {
    it('formats 24h time strings to human-readable 12h format', () => {
      expect(formatTime12hDisplay('08:30')).toBe('8:30 AM');
      expect(formatTime12hDisplay('00:05')).toBe('12:05 AM');
      expect(formatTime12hDisplay('12:00')).toBe('12:00 PM');
      expect(formatTime12hDisplay('14:45')).toBe('2:45 PM');
      expect(formatTime12hDisplay('21:00')).toBe('9:00 PM');
    });
  });

  describe('sortTimesChronologically', () => {
    it('sorts reminder times from earliest to latest', () => {
      const unsorted = ['20:00', '08:00', '14:00', '06:30'];
      expect(sortTimesChronologically(unsorted)).toEqual([
        '06:30',
        '08:00',
        '14:00',
        '20:00',
      ]);
    });

    it('handles empty or single-item arrays', () => {
      expect(sortTimesChronologically([])).toEqual([]);
      expect(sortTimesChronologically(['12:00'])).toEqual(['12:00']);
    });
  });

  describe('isDuplicateTime', () => {
    const times = ['08:00', '14:00', '20:00'];

    it('detects existing times as duplicates', () => {
      expect(isDuplicateTime('08:00', times)).toBe(true);
      expect(isDuplicateTime('14:00', times)).toBe(true);
      expect(isDuplicateTime('20:00', times)).toBe(true);
    });

    it('allows unique times', () => {
      expect(isDuplicateTime('09:00', times)).toBe(false);
      expect(isDuplicateTime('15:30', times)).toBe(false);
    });

    it('ignores the slot being edited when checking duplicates', () => {
      // Editing slot index 0 with same time 08:00 is allowed
      expect(isDuplicateTime('08:00', times, 0)).toBe(false);
      // Editing slot index 0 with slot 1's time 14:00 is a duplicate
      expect(isDuplicateTime('14:00', times, 0)).toBe(true);
    });
  });
});
