const fs = require("fs");
const path = require("path");

const poolPath = path.resolve(__dirname, "../assets/data/quran_daily_pool.json");
const pool = JSON.parse(fs.readFileSync(poolPath, "utf8"));

const surahCache = {};
function getSurah(num) {
  const padNum = String(num).padStart(3, "0");
  if (!surahCache[padNum]) {
    const filePath = path.resolve(__dirname, `../assets/data/quran_full/surah_${padNum}.json`);
    surahCache[padNum] = JSON.parse(fs.readFileSync(filePath, "utf8"));
  }
  return surahCache[padNum];
}

const targetLangs = ["ur", "fr", "es", "pt", "hi", "zh", "ru"];
const allRequiredLangs = ["ar", "en", "bn", "ur", "fr", "es", "pt", "hi", "zh", "ru"];

let updatedCount = 0;

pool.items.forEach((item, idx) => {
  const ref = item.reference;
  const surahData = getSurah(ref.surah_number);
  const relevantVerses = surahData.verses.filter(v => 
    v.reference.ayah_number >= ref.ayah_start && 
    v.reference.ayah_number <= ref.ayah_end
  );

  if (!item.translations) {
    item.translations = {};
  }

  targetLangs.forEach(lang => {
    // Only populate if not already defined
    if (!item.translations[lang] || !item.translations[lang].text) {
      const texts = relevantVerses.map(v => v.translations[lang].text.trim());
      const jointText = texts.join(" ");
      const translator = relevantVerses[0].translations[lang].translator;
      
      item.translations[lang] = {
        text: jointText,
        translator: translator
      };
    }
  });

  updatedCount++;
});

// Update metadata
if (!pool.metadata) {
  pool.metadata = {};
}
pool.metadata.supported_languages = allRequiredLangs;
pool.metadata.languages_count = allRequiredLangs.length;
pool.metadata.updated_at = new Date().toISOString();

fs.writeFileSync(poolPath, JSON.stringify(pool, null, 2), "utf8");
console.log(`Successfully populated ${updatedCount} items in quran_daily_pool.json with all 10 languages.`);

// Assertion check
const reloaded = JSON.parse(fs.readFileSync(poolPath, "utf8"));
if (reloaded.items.length !== 523) {
  throw new Error(`Expected 523 items, found ${reloaded.items.length}`);
}

reloaded.items.forEach((item, idx) => {
  allRequiredLangs.forEach(lang => {
    if (!item.translations[lang] || !item.translations[lang].text || typeof item.translations[lang].text !== "string") {
      throw new Error(`Item ${item.content_id} (idx ${idx}) is missing valid text for language: ${lang}`);
    }
  });
});

console.log("ASSERTION PASSED: All 523 items verified to contain valid non-empty translations for all 10 languages:");
console.log(allRequiredLangs.join(", "));
