/**
 * a11yLabels.ts
 *
 * Centralized Multilingual Accessibility Label Resolver.
 * Resolves screen reader (TalkBack / VoiceOver) accessibility labels dynamically
 * based on the active user language, with safe fallback to Bengali ('bn') or English ('en').
 *
 * Supported languages: bn, en, ar, ur, fr, es, pt, hi, zh, ru.
 */

export type A11yKey =
  | 'goBack'
  | 'close'
  | 'bookmark'
  | 'bookmarked'
  | 'bookmarkAdd'
  | 'bookmarkRemove'
  | 'share'
  | 'play'
  | 'pause'
  | 'playAudio'
  | 'stopAudio'
  | 'readerSettings'
  | 'searchClear'
  | 'clearSearch'
  | 'searchInput'
  | 'footnoteToggle'
  | 'footnoteExpanded'
  | 'footnoteCollapsed'
  | 'fontSizeIncrease'
  | 'fontSizeDecrease'
  | 'allView'
  | 'prevChapter'
  | 'nextChapter';

const A11Y_DICTIONARY: Record<A11yKey, Record<string, string>> = {
  goBack: {
    bn: 'ফিরে যান',
    en: 'Go back',
    ar: 'رجوع',
    ur: 'واپس جائیں',
    fr: 'Retour',
    es: 'Regresar',
    pt: 'Voltar',
    hi: 'वापस जाएं',
    zh: '返回',
    ru: 'Назад',
  },
  close: {
    bn: 'বন্ধ করুন',
    en: 'Close',
    ar: 'إغلاق',
    ur: 'بند کریں',
    fr: 'Fermer',
    es: 'Cerrar',
    pt: 'Fechar',
    hi: 'बंद करें',
    zh: '关闭',
    ru: 'Закрыть',
  },
  bookmarkAdd: {
    bn: 'সংরক্ষণ করুন',
    en: 'Bookmark',
    ar: 'حفظ في المفضلة',
    ur: 'محفوظ کریں',
    fr: 'Ajouter aux favoris',
    es: 'Guardar',
    pt: 'Favoritar',
    hi: 'सहेजें',
    zh: '收藏',
    ru: 'В закладки',
  },
  bookmark: {
    bn: 'সংরক্ষণ করুন',
    en: 'Bookmark',
    ar: 'حفظ في المفضلة',
    ur: 'محفوظ کریں',
    fr: 'Ajouter aux favoris',
    es: 'Guardar',
    pt: 'Favoritar',
    hi: 'सहेजें',
    zh: '收藏',
    ru: 'В закладки',
  },
  bookmarkRemove: {
    bn: 'সংরক্ষণ বাতিল করুন',
    en: 'Remove bookmark',
    ar: 'إزالة من المفضلة',
    ur: 'بک مارک ہٹائیں',
    fr: 'Supprimer le favori',
    es: 'Eliminar de favoritos',
    pt: 'Remover favorito',
    hi: 'सहेजना रद्द करें',
    zh: '取消收藏',
    ru: 'Удалить из закладок',
  },
  bookmarked: {
    bn: 'সংরক্ষণ বাতিল করুন',
    en: 'Remove bookmark',
    ar: 'إزالة من المفضلة',
    ur: 'بک مارک ہٹائیں',
    fr: 'Supprimer le favori',
    es: 'Eliminar de favoritos',
    pt: 'Remover favorito',
    hi: 'सहेजना रद्द करें',
    zh: '取消收藏',
    ru: 'Удалить из закладок',
  },
  share: {
    bn: 'শেয়ার করুন',
    en: 'Share',
    ar: 'مشاركة',
    ur: 'شیئر کریں',
    fr: 'Partager',
    es: 'Compartir',
    pt: 'Compartilhar',
    hi: 'साझा करें',
    zh: '分享',
    ru: 'Поделиться',
  },
  playAudio: {
    bn: 'তেলাওয়াত শুনুন',
    en: 'Play recitation',
    ar: 'استمع للتلاوة',
    ur: 'تلاوت سنیں',
    fr: 'Écouter la récitation',
    es: 'Escuchar recitación',
    pt: 'Ouvir recitação',
    hi: 'तिलावत सुनें',
    zh: '播放诵读',
    ru: 'Слушать чтение',
  },
  play: {
    bn: 'তেলাওয়াত শুনুন',
    en: 'Play recitation',
    ar: 'استمع للتلاوة',
    ur: 'تلاوت سنیں',
    fr: 'Écouter la récitation',
    es: 'Escuchar recitación',
    pt: 'Ouvir recitação',
    hi: 'तिलावत सुनें',
    zh: '播放诵读',
    ru: 'Слушать чтение',
  },
  stopAudio: {
    bn: 'তেলাওয়াত বন্ধ করুন',
    en: 'Stop recitation',
    ar: 'إيقاف التلاوة',
    ur: 'تلاوت روکیں',
    fr: 'Arrêter la récitation',
    es: 'Detener recitación',
    pt: 'Parar recitação',
    hi: 'तिलावत रोकें',
    zh: '停止诵读',
    ru: 'Остановить чтение',
  },
  pause: {
    bn: 'তেলাওয়াত বন্ধ করুন',
    en: 'Stop recitation',
    ar: 'إيقاف التلاوة',
    ur: 'تلاوت روکیں',
    fr: 'Arrêter la récitation',
    es: 'Detener recitación',
    pt: 'Parar recitação',
    hi: 'तिलावत रोकें',
    zh: '停止诵读',
    ru: 'Остановить чтение',
  },
  readerSettings: {
    bn: 'পাঠের রূপ ও ফন্ট সেটিংস',
    en: 'Reading appearance & font settings',
    ar: 'إعدادات مظهر القراءة والخط',
    ur: 'پڑھنے کا انداز اور فونٹ کی ترتیبات',
    fr: 'Paramètres d’affichage et police',
    es: 'Ajustes de lectura y fuente',
    pt: 'Ajustes de leitura e fonte',
    hi: 'पठन स्वरूप और फ़ॉन्ट सेटिंग्स',
    zh: '阅读外观与字体设置',
    ru: 'Настройки чтения и шрифта',
  },
  searchClear: {
    bn: 'অনুসন্ধান মুছুন',
    en: 'Clear search query',
    ar: 'مسح البحث',
    ur: 'تلاش صاف کریں',
    fr: 'Effacer la recherche',
    es: 'Borrar búsqueda',
    pt: 'Limpar busca',
    hi: 'खोज साफ़ करें',
    zh: '清除搜索',
    ru: 'Очистить поиск',
  },
  clearSearch: {
    bn: 'অনুসন্ধান মুছুন',
    en: 'Clear search query',
    ar: 'مسح البحث',
    ur: 'تلاش صاف کریں',
    fr: 'Effacer la recherche',
    es: 'Borrar búsqueda',
    pt: 'Limpar busca',
    hi: 'खोज साफ़ करें',
    zh: '清除搜索',
    ru: 'Очистить поиск',
  },
  searchInput: {
    bn: 'অনুসন্ধান করুন',
    en: 'Search',
    ar: 'بحث',
    ur: 'تلاش کریں',
    fr: 'Rechercher',
    es: 'Buscar',
    pt: 'Buscar',
    hi: 'खोजें',
    zh: '搜索',
    ru: 'Поиск',
  },
  footnoteToggle: {
    bn: 'টীকা ও ব্যাখ্যা',
    en: 'Footnote and commentary',
    ar: 'الحاشية والتوضيح',
    ur: 'حاشیہ اور وضاحت',
    fr: 'Note et commentaire',
    es: 'Nota y comentario',
    pt: 'Nota e comentário',
    hi: 'टिप्पणी और व्याख्या',
    zh: '注释与解说',
    ru: 'Сноска и комментарий',
  },
  footnoteExpanded: {
    bn: 'টীকা সংক্ষেপ করুন',
    en: 'Collapse footnote',
    ar: 'طي الحاشية',
    ur: 'حاشیہ سمیٹیں',
    fr: 'Réduire la note',
    es: 'Plegar nota',
    pt: 'Recolher nota',
    hi: 'टिप्पणी संक्षिप्त करें',
    zh: '收起注释',
    ru: 'Свернуть сноску',
  },
  footnoteCollapsed: {
    bn: 'টীকা বিস্তারিত পড়ুন',
    en: 'Expand footnote',
    ar: 'عرض الحاشية بالكامل',
    ur: 'حاشیہ کھولیں',
    fr: 'Développer la note',
    es: 'Desplegar nota',
    pt: 'Expandir nota',
    hi: 'पूरी टिप्पणी पढ़ें',
    zh: '展开注释',
    ru: 'Развернуть сноску',
  },
  fontSizeIncrease: {
    bn: 'ফন্ট সাইজ বাড়ান',
    en: 'Increase font size',
    ar: 'تكبير حجم الخط',
    ur: 'فونٹ سائز بڑھائیں',
    fr: 'Augmenter la taille de la police',
    es: 'Aumentar tamaño de fuente',
    pt: 'Aumentar tamanho da fonte',
    hi: 'फ़ॉन्ट आकार बढ़ाएं',
    zh: '增大字体',
    ru: 'Увеличить размер шрифта',
  },
  fontSizeDecrease: {
    bn: 'ফন্ট সাইজ কমান',
    en: 'Decrease font size',
    ar: 'تصغير حجم الخط',
    ur: 'فونٹ سائز کم کریں',
    fr: 'Diminuer la taille de la police',
    es: 'Disminuir tamaño de fuente',
    pt: 'Diminuir tamanho da fonte',
    hi: 'फ़ॉन्ट आकार घटाएं',
    zh: '减小字体',
    ru: 'Уменьшить размер шрифта',
  },
  allView: {
    bn: 'সকল দেখুন',
    en: 'View all',
    ar: 'عرض الكل',
    ur: 'تمام دیکھیں',
    fr: 'Tout voir',
    es: 'Ver todo',
    pt: 'Ver tudo',
    hi: 'सभी देखें',
    zh: '查看全部',
    ru: 'Посмотреть все',
  },
  prevChapter: {
    bn: 'পূর্ববর্তী অধ্যায়',
    en: 'Previous chapter',
    ar: 'الباب السابق',
    ur: 'پچھلا باب',
    fr: 'Chapitre précédent',
    es: 'Capítulo anterior',
    pt: 'Capítulo anterior',
    hi: 'पिछला अध्याय',
    zh: '上一章',
    ru: 'Предыдущая глава',
  },
  nextChapter: {
    bn: 'পরবর্তী অধ্যায়',
    en: 'Next chapter',
    ar: 'الباب التالي',
    ur: 'اگلا باب',
    fr: 'Chapitre suivant',
    es: 'Capítulo siguiente',
    pt: 'Próximo capítulo',
    hi: 'अगला अध्याय',
    zh: '下一章',
    ru: 'Следующая глава',
  },
};

/**
 * Returns the localized accessibility label for a given key, matching
 * the active user language with a clean fallback to Bengali ('bn') or English ('en').
 */
export function getA11yLabel(key: A11yKey, lang: string = 'bn'): string {
  const entry = A11Y_DICTIONARY[key];
  if (!entry) return key;
  return entry[lang] || entry.bn || entry.en || Object.values(entry)[0] || key;
}
