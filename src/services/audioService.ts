/**
 * audioService.ts
 *
 * Quran verse audio playback service using expo-av (SDK 51 compatible).
 *
 * Key design decisions:
 * - Single global Sound instance (single-player model) with proactive next-track preloading
 * - Audio focus compliance (staysActiveInBackground, shouldDuckAndroid)
 * - Status callbacks are guarded by an active session ID to prevent double-advance
 * - Screen unmount lifecycle triggers stopAudio() to ensure full native cleanup
 * - Zero dependency on floating overlay modules (complete architectural decoupling)
 */

import { Audio } from 'expo-av';

// ─── Centralised audio configuration ────────────────────────────────────────
export const DEFAULT_RECITER = 'Alafasy_128kbps';
const CDN_BASE = 'https://everyayah.com/data';
// ─────────────────────────────────────────────────────────────────────────────

let currentSound: Audio.Sound | null = null;
let currentPlayingId: string | null = null;

let preloadedSound: Audio.Sound | null = null;
let preloadedSurah = 0;
let preloadedAyah = 0;

/**
 * Each call to playVerseAudio() mints a new session ID.
 * The onStatusUpdate callback is only honoured when the session ID
 * matches the current session — prevents double-advance when stopAudio()
 * fires isPlaying=false at the start of the next verse's setup.
 */
let activeSessionId = 0;

/** True when surah-level sequential playback is in progress. */
let surahModeActive = false;

export function getVerseAudioUrl(
  surah: number,
  ayah: number,
  reciter: string = DEFAULT_RECITER
): string {
  const s = String(surah).padStart(3, '0');
  const a = String(ayah).padStart(3, '0');
  return `${CDN_BASE}/${reciter}/${s}${a}.mp3`;
}

/**
 * Preloads the next Quran verse audio track in the background.
 * Buffered before the current verse finishes to eliminate inter-ayah audible delay.
 */
export async function preloadNextVerseAudio(surah: number, ayah: number): Promise<void> {
  if (preloadedSound && preloadedSurah === surah && preloadedAyah === ayah) {
    return; // Already prepared
  }

  await _releasePreloadedSound();

  try {
    const url = getVerseAudioUrl(surah, ayah);
    const { sound } = await Audio.Sound.createAsync(
      { uri: url },
      { shouldPlay: false }
    );
    preloadedSound = sound;
    preloadedSurah = surah;
    preloadedAyah = ayah;
  } catch (e) {
    // Non-fatal: if preloading fails (e.g. offline), normal playback path will handle it cleanly
    preloadedSound = null;
    preloadedSurah = 0;
    preloadedAyah = 0;
  }
}

/**
 * Plays a specific Quran verse.
 * Uses preloaded sound object if available, otherwise initiates network fetch.
 *
 * @param onComplete      Called strictly when audio track reaches completion (didJustFinish === true).
 * @param onStatusUpdate  Optional callback for playback position/duration tracking.
 *
 * @returns true if playback was initiated successfully, false on error.
 */
export async function playVerseAudio(
  surah: number,
  ayah: number,
  onComplete?: () => void,
  onStatusUpdate?: (isPlaying: boolean, positionSecs: number, durationSecs: number) => void
): Promise<boolean> {
  const mySessionId = ++activeSessionId;
  const startTime = Date.now();

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      allowsRecordingIOS: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const id = `quran_${surah}_${ayah}`;
    let sound: Audio.Sound;

    // Check if next sound was already prepared in memory
    if (preloadedSound && preloadedSurah === surah && preloadedAyah === ayah) {
      sound = preloadedSound;
      preloadedSound = null;
      preloadedSurah = 0;
      preloadedAyah = 0;

      // Release previous sound now that preloaded sound is ready
      await _releaseCurrentSound();

      (sound as any).setOnPlaybackStatusUpdate((status: import('expo-av').AVPlaybackStatus) => {
        if (mySessionId !== activeSessionId) return;

        if (status.isLoaded) {
          if (status.didJustFinish) {
            onComplete?.();
          }
          if (onStatusUpdate) {
            const playing = status.isPlaying ?? false;
            const pos = (status.positionMillis ?? 0) / 1000;
            const dur = (status.durationMillis ?? 0) / 1000;
            onStatusUpdate(playing, pos, dur);
          }
        } else if (onStatusUpdate) {
          onStatusUpdate(false, 0, 0);
        }
      });

      await sound.playAsync();
      const transitionTimeMs = Date.now() - startTime;
      console.log(`[audioService] Proactive track handoff for ${surah}:${ayah} in ${transitionTimeMs}ms`);
    } else {
      // Normal fetch & playback
      await _releaseCurrentSound();
      const url = getVerseAudioUrl(surah, ayah);

      const created = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        (status: import('expo-av').AVPlaybackStatus) => {
          if (mySessionId !== activeSessionId) return;

          if (status.isLoaded) {
            if (status.didJustFinish) {
              onComplete?.();
            }
            if (onStatusUpdate) {
              const playing = status.isPlaying ?? false;
              const pos = (status.positionMillis ?? 0) / 1000;
              const dur = (status.durationMillis ?? 0) / 1000;
              onStatusUpdate(playing, pos, dur);
            }
          } else if (onStatusUpdate) {
            onStatusUpdate(false, 0, 0);
          }
        }
      );
      sound = created.sound;
      const initialTimeMs = Date.now() - startTime;
      console.log(`[audioService] Cold track initialization for ${surah}:${ayah} in ${initialTimeMs}ms`);
    }

    // Check session validity
    if (mySessionId !== activeSessionId) {
      try { await sound.stopAsync(); await sound.unloadAsync(); } catch (_) {}
      return false;
    }

    currentSound = sound;
    currentPlayingId = id;
    return true;
  } catch (error) {
    console.warn(`[audioService] Failed to play Surah ${surah}:${ayah}:`, error);
    if (mySessionId === activeSessionId) {
      currentSound = null;
      currentPlayingId = null;
    }
    return false;
  }
}

/** Internal: releases the current sound without touching activeSessionId. */
async function _releaseCurrentSound(): Promise<void> {
  const s = currentSound;
  currentSound = null;
  currentPlayingId = null;
  if (s) {
    try { await s.stopAsync(); } catch (_) {}
    try { await s.unloadAsync(); } catch (_) {}
  }
}

/** Internal: releases any pending preloaded sound. */
async function _releasePreloadedSound(): Promise<void> {
  const ps = preloadedSound;
  preloadedSound = null;
  preloadedSurah = 0;
  preloadedAyah = 0;
  if (ps) {
    try { await ps.stopAsync(); } catch (_) {}
    try { await ps.unloadAsync(); } catch (_) {}
  }
}

/** Pauses the current playback without releasing the player. */
export async function pauseAudio(): Promise<void> {
  if (currentSound) {
    try { await currentSound.pauseAsync(); } catch (_) {}
  }
}

/** Resumes paused playback. */
export async function resumeAudio(): Promise<void> {
  if (currentSound) {
    try { await currentSound.playAsync(); } catch (_) {}
  }
}

/**
 * Stops playback and releases all native resources.
 * Safe to call even when no audio is playing.
 * Invalidates the current session so stale callbacks are ignored.
 */
export async function stopAudio(): Promise<void> {
  activeSessionId++; // Invalidate any pending session callbacks
  surahModeActive = false;
  await _releaseCurrentSound();
  await _releasePreloadedSound();
}

/** Enter surah sequential playback mode. */
export function enterSurahMode(): void {
  surahModeActive = true;
}

/** Exit surah sequential playback mode. */
export function exitSurahMode(): void {
  surahModeActive = false;
}

/** Returns the content ID (e.g. "quran_2_255") of the currently playing verse, or null. */
export function getCurrentPlayingId(): string | null {
  return currentPlayingId;
}

/** Returns whether sequential surah mode is active. */
export function isSurahModeActive(): boolean {
  return surahModeActive;
}
