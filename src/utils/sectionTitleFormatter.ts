/**
 * sectionTitleFormatter.ts
 *
 * Formats section titles in strict accordance with the Zero Alteration Principle.
 * When the upstream source has no section title (classical Babun bila Tarjamah),
 * it never fabricates or hallucinates external text.
 * Instead, it formats the section label cleanly (stripping dangling punctuation)
 * and provides an honest, scholarly sub-caption.
 */

import { toBengaliNumerals } from './bengaliNumerals';

export interface FormattedSectionHeading {
  heading: string;
  hasCustomTitle: boolean;
  subNote?: string;
}

export function formatSectionHeading(section?: {
  id?: number | string;
  display_label?: string;
  title?: string;
  arabic_title?: string;
}): FormattedSectionHeading {
  if (!section) {
    return { heading: '', hasCustomTitle: false };
  }

  const rawTitle = (section.title || '').trim();
  const rawLabel = (section.display_label || '').trim().replace(/[:ঃ]\s*$/, '');

  if (rawTitle) {
    const heading = rawLabel ? `${rawLabel} ${rawTitle}` : rawTitle;
    return { heading, hasCustomTitle: true };
  }

  // Zero Alteration: Source has no separate title in the manuscript
  const heading = rawLabel || `পরিচ্ছেদ ${toBengaliNumerals(section.id ?? '')}`;
  return {
    heading,
    hasCustomTitle: false,
    subNote: 'মূল উৎসে আলাদা শিরোনাম নেই — পূর্ববর্তী পরিচ্ছেদের অনুবৃত্তি',
  };
}
