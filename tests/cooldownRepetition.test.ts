import { selectCandidateItem } from '../src/services/contentEngine';
import { isItemOnCooldown, getRecentlyShownContentIds } from '../src/database/reminderRepository';
import { recordHistoryEvent, loadHistory } from '../src/database/db';

describe('Repetition Control & Cooldown Verification Tests', () => {
  test('selectCandidateItem excludes explicitly excluded IDs', async () => {
    const item1 = await selectCandidateItem('quran', 60);
    expect(item1).toBeDefined();

    if (item1) {
      const excluded = new Set<string>([item1.content_id]);
      const item2 = await selectCandidateItem('quran', 60, [], excluded);
      expect(item2?.content_id).not.toBe(item1.content_id);
    }
  });

  test('selectCandidateItem accepts recentTopics as diversity hint (no error)', async () => {
    // recentTopics is now string[] — verify the API accepts it without error
    const item = await selectCandidateItem('quran', 60, ['patience', 'gratitude']);
    expect(item).toBeDefined();
  });

  test('History recording tracks shown items and updates cooldown list', async () => {
    const testContentId = 'quran_001_001';
    await recordHistoryEvent({
      content_id: testContentId,
      content_type: 'quran',
      scheduled_time: new Date().toISOString(),
      status: 'delivered',
    });

    const recent = await getRecentlyShownContentIds(60);
    expect(recent.has(testContentId)).toBe(true);

    const onCooldown = await isItemOnCooldown(testContentId, 60);
    expect(onCooldown).toBe(true);
  });
});
