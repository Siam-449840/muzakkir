import {
  getVerseAudioUrl,
  playVerseAudio,
  pauseAudio,
  resumeAudio,
  stopAudio,
  getCurrentPlayingId,
  DEFAULT_RECITER,
} from '../src/services/audioService';

describe('Audio Player Service — expo-audio migration tests', () => {
  beforeEach(async () => {
    await stopAudio();
  });

  afterEach(async () => {
    await stopAudio();
  });

  // ── URL generation ──────────────────────────────────────────────────────────
  test('getVerseAudioUrl generates correct 3-digit padded CDN URL', () => {
    expect(getVerseAudioUrl(1, 1)).toBe(
      `https://everyayah.com/data/${DEFAULT_RECITER}/001001.mp3`
    );
    expect(getVerseAudioUrl(2, 255)).toBe(
      `https://everyayah.com/data/${DEFAULT_RECITER}/002255.mp3`
    );
    expect(getVerseAudioUrl(114, 6)).toBe(
      `https://everyayah.com/data/${DEFAULT_RECITER}/114006.mp3`
    );
  });

  test('getVerseAudioUrl accepts a custom reciter slug', () => {
    const url = getVerseAudioUrl(1, 1, 'Husary_128kbps');
    expect(url).toContain('Husary_128kbps');
    expect(url).toContain('001001.mp3');
  });

  // ── Playback lifecycle ──────────────────────────────────────────────────────
  test('playVerseAudio initiates playback and sets current playing ID', async () => {
    const success = await playVerseAudio(1, 1);
    expect(success).toBe(true);
    expect(getCurrentPlayingId()).toBe('quran_1_1');
  });

  test('playVerseAudio correctly sets ID for Ayat al-Kursi (2:255)', async () => {
    const success = await playVerseAudio(2, 255);
    expect(success).toBe(true);
    expect(getCurrentPlayingId()).toBe('quran_2_255');
  });

  test('stopAudio clears the current playing ID and releases player', async () => {
    await playVerseAudio(1, 1);
    expect(getCurrentPlayingId()).toBe('quran_1_1');
    await stopAudio();
    expect(getCurrentPlayingId()).toBeNull();
  });

  test('pauseAudio does not throw when a player is active', async () => {
    await playVerseAudio(1, 7);
    await expect(pauseAudio()).resolves.toBeUndefined();
  });

  test('resumeAudio does not throw when a player is paused', async () => {
    await playVerseAudio(3, 1);
    await pauseAudio();
    await expect(resumeAudio()).resolves.toBeUndefined();
  });

  test('stopAudio is safe to call when no audio is playing', async () => {
    await expect(stopAudio()).resolves.toBeUndefined();
    expect(getCurrentPlayingId()).toBeNull();
  });

  test('sequential playVerseAudio calls replace previous player', async () => {
    await playVerseAudio(1, 1);
    expect(getCurrentPlayingId()).toBe('quran_1_1');
    await playVerseAudio(2, 255);
    expect(getCurrentPlayingId()).toBe('quran_2_255');
  });
});
