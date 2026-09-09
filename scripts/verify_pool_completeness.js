const fs = require('fs');
const path = require('path');

const poolPath = path.join(__dirname, '../assets/data/quran_daily_pool.json');
const rawData = JSON.parse(fs.readFileSync(poolPath, 'utf8'));
const items = Array.isArray(rawData) ? rawData : (rawData.items || rawData.reminders || []);

const REQUIRED_LANGS = ['ar', 'en', 'bn', 'ur', 'fr', 'es', 'pt', 'hi', 'zh', 'ru'];

console.log(`Verifying Quran Daily Pool: Total items = ${items.length}`);
if (items.length !== 523) {
  console.error(`ERROR: Expected 523 items, found ${items.length}`);
  process.exit(1);
}

let missingCount = 0;
let emptyCount = 0;

for (let i = 0; i < items.length; i++) {
  const item = items[i];
  const id = item.content_id || item.id || `index_${i}`;
  if (!item.translations) {
    console.error(`Item ${id} missing translations object`);
    missingCount++;
    continue;
  }
  for (const lang of REQUIRED_LANGS) {
    const entry = item.translations[lang];
    const text = typeof entry === 'string' ? entry : entry?.text;
    if (typeof text !== 'string') {
      console.error(`Item ${id} missing language '${lang}'`);
      missingCount++;
    } else if (text.trim().length === 0) {
      console.error(`Item ${id} has empty string for '${lang}'`);
      emptyCount++;
    }
  }
}

if (missingCount === 0 && emptyCount === 0) {
  console.log(`\n======================================================`);
  console.log(`SUCCESS: All ${items.length} items have verified non-empty translations for all 10 languages:`);
  console.log(`[${REQUIRED_LANGS.join(', ')}]`);
  console.log(`Zero missing translations. Zero empty strings.`);
  console.log(`======================================================\n`);
  process.exit(0);
} else {
  console.error(`VERIFICATION FAILED: ${missingCount} missing translations, ${emptyCount} empty translations.`);
  process.exit(1);
}
