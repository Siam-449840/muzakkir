import { formatSectionHeading } from '../src/utils/sectionTitleFormatter';

describe('formatSectionHeading (Zero Alteration Guarantee)', () => {
  test('formats custom titled section cleanly', () => {
    const res = formatSectionHeading({
      id: 1,
      display_label: '১/১. অধ্যায়ঃ',
      title: 'কীভাবে রাসূলুল্লাহ (ﷺ)-এর নিকট ওহী শুরু হয়েছিল',
      arabic_title: 'كيف كان بدء الوحي',
    });

    expect(res.hasCustomTitle).toBe(true);
    expect(res.heading).toContain('কীভাবে রাসূলুল্লাহ (ﷺ)-এর নিকট ওহী শুরু হয়েছিল');
    expect(res.subNote).toBeUndefined();
  });

  test('formats untitled section (Babun bila Tarjamah) without fabrication', () => {
    // Zero Alteration: Source has title=""
    const res = formatSectionHeading({
      id: 2,
      display_label: '১/২. পরিচ্ছেদঃ',
      title: '',
      arabic_title: 'باب',
    });

    expect(res.hasCustomTitle).toBe(false);
    expect(res.heading).toBe('১/২. পরিচ্ছেদ');
    expect(res.subNote).toBe('মূল উৎসে আলাদা শিরোনাম নেই — পূর্ববর্তী পরিচ্ছেদের অনুবৃত্তি');
  });

  test('falls back cleanly when display_label is missing', () => {
    const res = formatSectionHeading({
      id: 7,
      title: '',
    });

    expect(res.hasCustomTitle).toBe(false);
    expect(res.heading).toBe('পরিচ্ছেদ ৭');
    expect(res.subNote).toBe('মূল উৎসে আলাদা শিরোনাম নেই — পূর্ববর্তী পরিচ্ছেদের অনুবৃত্তি');
  });

  test('handles null or undefined section', () => {
    const res = formatSectionHeading(undefined);
    expect(res.hasCustomTitle).toBe(false);
    expect(res.heading).toBe('');
  });
});
