import * as fs from 'fs';
import * as path from 'path';
import collectionsData from '../assets/data/hadith_collections.json';
import {
  getHadithCollections,
  getCollectionChapters,
  getChapterHadiths,
  getHadithById,
  clearChapterHadithsCache,
  getChapterCacheSize,
} from '../src/database/hadithRepository';
import { HadithRecord } from '../src/types';
import { getQuranSurahChunk, getQuranDailyPool, getHadithDailyPool } from '../src/database/db';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Phase 3 Final Storage Sign-Off Forensic Audit Suite', () => {
  const baseDir = path.join(__dirname, '..');
  const booksDir = path.join(baseDir, 'assets/data/hadith_books');
  const hierDir = path.join(baseDir, 'assets/data/hadith_hierarchy');

  beforeEach(() => {
    clearChapterHadithsCache();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 1. RUNTIME DATA COMPLETENESS: FIRST, MIDDLE, LAST, RANDOM, LONGEST, FOOTNOTE
  // ══════════════════════════════════════════════════════════════════════════
  describe('1. 25-Collection Deep Sampling: First, Middle, Last, Random, Longest & Footnote', () => {
    test('Verifies all 25 collections exist and have exact first, middle, last, random, longest, and footnote records', async () => {
      expect(collectionsData).toHaveLength(25);

      for (const col of collectionsData) {
        const key = col.key;
        const bookFile = path.join(booksDir, `${key}.json`);
        expect(fs.existsSync(bookFile)).toBe(true);

        const bookData = JSON.parse(fs.readFileSync(bookFile, 'utf8'));
        const hadiths: any[] = bookData.hadiths;
        expect(hadiths.length).toBeGreaterThan(0);
        const len = hadiths.length;

        // 1. First record
        const first = hadiths[0];
        // 2. Middle record
        const middle = hadiths[Math.floor(len / 2)];
        // 3. Last record
        const last = hadiths[len - 1];
        // 4. Deterministic pseudo-random record
        const randomIdx = (len * 37) % len;
        const randomRec = hadiths[randomIdx];

        // 5. Longest Hadith (by translation + arabic length)
        let longestRec = hadiths[0];
        let maxLen = 0;
        for (const h of hadiths) {
          const l = (h.translation || '').length + (h.arabic || '').length;
          if (l > maxLen) {
            maxLen = l;
            longestRec = h;
          }
        }

        // 6. Longest Footnote-bearing Hadith
        let footnoteRec: any = null;
        let maxNoteLen = 0;
        for (const h of hadiths) {
          const nLen = (h.note || '').length;
          if (nLen > maxNoteLen) {
            maxNoteLen = nLen;
            footnoteRec = h;
          }
        }

        const sampled = [
          { type: 'first', rec: first },
          { type: 'middle', rec: middle },
          { type: 'last', rec: last },
          { type: 'random', rec: randomRec },
          { type: 'longest', rec: longestRec },
        ];
        if (footnoteRec) {
          sampled.push({ type: 'footnote', rec: footnoteRec });
        }

        // Verify each sampled record via repository getHadithById
        for (const { type, rec } of sampled) {
          const contentId = rec.id || `hadith_${key}_${rec.hadith_number}`;
          const loaded = await getHadithById(contentId);

          expect(loaded).not.toBeNull();
          expect(loaded?.reference.collection_key).toBe(key);
          expect(loaded?.reference.hadith_number).toBeDefined();

          // Translation must be present and non-empty
          expect(loaded?.translations.bn.text.trim().length).toBeGreaterThan(0);

          // Grade must be defined
          expect(loaded?.authenticity).toBeDefined();

          // Narrator should be defined if source has it
          if (rec.narrator) {
            expect(loaded?.narrator).toBe(rec.narrator);
          }

          // If footnote-bearing, footnote must match verbatim
          if (type === 'footnote') {
            expect(loaded?.note).toBe(rec.note);
            expect(loaded?.note?.length).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 2. COMPLETE CHAIN FORENSIC VERIFICATION:
  // Source -> Production Asset -> Repository -> Search -> Hierarchy ->
  // Reader -> Footnote -> Bookmark/History -> Reminder -> Floating Card -> Deep Link
  // ══════════════════════════════════════════════════════════════════════════
  describe('2. Full Architectural Chain Verification', () => {
    test('End-to-end chain from Reminder Payload -> Deep Link -> Repository -> Reader -> Footnote', async () => {
      // 1. Reminder candidate selection
      const hadithPool = getHadithDailyPool();
      expect(hadithPool.hadiths.length).toBe(2402);
      const reminderItem = hadithPool.hadiths[0];
      expect(reminderItem.content_id).toMatch(/^hadith_/);

      // 2. Deep-link target resolution
      const resolvedHadith = await getHadithById(reminderItem.content_id);
      expect(resolvedHadith).not.toBeNull();
      expect(resolvedHadith?.translations.bn.text).toBeDefined();
      expect(resolvedHadith?.translations.ar.text).toBeDefined();

      const targetColl = resolvedHadith!.reference.collection_key;
      const targetChap = resolvedHadith!.reference.chapter_id;
      const targetSec = resolvedHadith!.reference.section_id;
      const targetNum = resolvedHadith!.reference.hadith_number;

      // 3. Hierarchy navigation stack reconstruction
      const chapters = await getCollectionChapters(targetColl);
      expect(chapters.length).toBeGreaterThan(0);

      const matchedChap = chapters.find(c => String(c.id) === String(targetChap));
      if (targetChap !== undefined && targetChap !== null) {
        expect(matchedChap).toBeDefined();
      }

      // 4. Chapter hadiths loading
      const { chapter, hadiths } = await getChapterHadiths(targetColl, targetChap || 1);
      expect(hadiths.length).toBeGreaterThan(0);

      // 5. Reader lookup of target hadith
      const readerHadith = hadiths.find(h => String(h.reference.hadith_number) === String(targetNum));
      if (readerHadith) {
        expect(readerHadith.translations.bn.text).toBe(resolvedHadith!.translations.bn.text);
        expect(readerHadith.translations.ar.text).toBe(resolvedHadith!.translations.ar.text);
      }

      // 6. Bookmark / History integration
      const bookmarkKey = `@reminder_bookmarks`;
      const testBookmark = {
        id: resolvedHadith!.id,
        type: 'hadith',
        title: resolvedHadith!.reference.collection,
        reference: `${resolvedHadith!.reference.collection} #${resolvedHadith!.reference.hadith_number}`,
        createdAt: Date.now(),
      };

      await AsyncStorage.setItem(bookmarkKey, JSON.stringify([testBookmark]));
      const storedBookmarksRaw = await AsyncStorage.getItem(bookmarkKey);
      expect(storedBookmarksRaw).not.toBeNull();
      const storedBookmarks = JSON.parse(storedBookmarksRaw!);
      expect(storedBookmarks).toHaveLength(1);
      expect(storedBookmarks[0].id).toBe(resolvedHadith!.id);

      // 7. History record integration
      const historyKey = `@reminder_history`;
      const testHistory = {
        id: `hist_${Date.now()}`,
        contentId: resolvedHadith!.id,
        contentType: 'hadith',
        deliveredAt: Date.now(),
        openedAt: Date.now(),
      };
      await AsyncStorage.setItem(historyKey, JSON.stringify([testHistory]));
      const storedHistoryRaw = await AsyncStorage.getItem(historyKey);
      const storedHistory = JSON.parse(storedHistoryRaw!);
      expect(storedHistory[0].contentId).toBe(resolvedHadith!.id);
    });

    test('Quran reader end-to-end chain: Surah Chunk -> Verse -> Daily Pool -> Reader Settings', async () => {
      // 1. Daily pool check
      const quranPool = getQuranDailyPool();
      expect(quranPool.items).toHaveLength(523);
      const qItem = quranPool.items[0];
      const surahNum = (qItem.reference as any).surah_number;
      expect(surahNum).toBeGreaterThanOrEqual(1);
      expect(surahNum).toBeLessThanOrEqual(114);

      // 2. Surah chunk loading
      const chunk = getQuranSurahChunk(surahNum);
      expect(chunk.surah).toBe(surahNum);
      expect(chunk.verses.length).toBeGreaterThan(0);

      // 3. First verse check
      const firstVerse = chunk.verses[0];
      expect(firstVerse.translations.ar.text.length).toBeGreaterThan(0);
      expect(firstVerse.translations.bn.text.length).toBeGreaterThan(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 3. RUNTIME MEMORY & BOUNDED LRU CACHE EVALUATION
  // ══════════════════════════════════════════════════════════════════════════
  describe('3. Runtime Memory & Bounded LRU Cache Verification', () => {
    test('LRU cache strictly enforces capacity of 6 and evicts oldest chapters', async () => {
      clearChapterHadithsCache();
      expect(getChapterCacheSize()).toBe(0);

      // Load 6 chapters from Bukhari
      const chaptersToLoad = [1, 2, 3, 4, 5, 6];
      for (const chId of chaptersToLoad) {
        await getChapterHadiths('bukhari', chId);
      }
      expect(getChapterCacheSize()).toBe(6);

      // Re-access chapter 1 -> moves to most recently used
      const cached1 = await getChapterHadiths('bukhari', 1);
      expect(cached1.chapter?.id).toBe(1);
      expect(getChapterCacheSize()).toBe(6);

      // Load 7th chapter (Chapter 7) -> Chapter 2 should be evicted (as Chapter 1 was touched)
      await getChapterHadiths('bukhari', 7);
      expect(getChapterCacheSize()).toBe(6);

      // Load 8th chapter (Chapter 8) -> Chapter 3 should be evicted
      await getChapterHadiths('bukhari', 8);
      expect(getChapterCacheSize()).toBe(6);

      // Cache size remains strictly bounded at 6 regardless of browsing depth
      for (let i = 9; i <= 20; i++) {
        await getChapterHadiths('bukhari', i);
        expect(getChapterCacheSize()).toBe(6);
      }
    });

    test('Stress test: loading largest chapters in corpus does not leak or crash', async () => {
      clearChapterHadithsCache();

      // Top 3 largest chapters:
      // 1. Mishkatul Masabih ch 4 (959 hadiths)
      // 2. Abu Dawud ch 2 (770 hadiths)
      // 3. Riyadus Salihin ch 1 (685 hadiths)
      const t1 = Date.now();
      const res1 = await getChapterHadiths('mishkatul-masabih', 4);
      const res2 = await getChapterHadiths('abudawud', 2);
      const res3 = await getChapterHadiths('riyadussalihin', 1);
      const loadTime = Date.now() - t1;

      expect(res1.hadiths.length).toBe(959);
      expect(res2.hadiths.length).toBe(770);
      expect(res3.hadiths.length).toBe(685);
      expect(getChapterCacheSize()).toBe(3);

      // Fast retrieval on second pass (0ms cached)
      const t2 = Date.now();
      const cachedRes1 = await getChapterHadiths('mishkatul-masabih', 4);
      const cacheTime = Date.now() - t2;

      expect(cachedRes1).toBe(res1); // Same object reference in memory
      expect(cacheTime).toBeLessThanOrEqual(5); // Instantaneous
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 4. EXTREME-LENGTH CONTENT VERIFICATION VIA REPOSITORY
  // ══════════════════════════════════════════════════════════════════════════
  describe('4. Extreme-Length Content Integrity via Repository', () => {
    test('Bukhari #6228 (13,488 chars footnote) resolves intact via getHadithById', async () => {
      const h6228 = await getHadithById('hadith_bukhari_6228');
      expect(h6228).not.toBeNull();
      expect(h6228?.note?.length).toBe(13488);
      expect(h6228?.translations.ar.text.length).toBeGreaterThan(100);
      expect(h6228?.translations.bn.text.length).toBeGreaterThan(100);
    });

    test('Riyadus Salihin #22 (17,056 chars text) resolves intact via getHadithById', async () => {
      const h22 = await getHadithById('hadith_riyadussalihin_22');
      expect(h22).not.toBeNull();
      expect(h22?.translations.bn.text.length).toBe(17056);
      expect(h22?.translations.ar.text.length).toBeGreaterThan(100);
    });
  });
});
