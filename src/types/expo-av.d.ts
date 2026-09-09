/**
 * Minimal type stub for expo-av (SDK 51) used while expo-av is declared in
 * package.json but not yet installed. Run `npm install` to replace with real types.
 *
 * Covers only what audioService.ts actually uses from the package.
 */
declare module 'expo-av' {
  export interface AVPlaybackStatus {
    isLoaded: boolean;
    isPlaying?: boolean;
    positionMillis?: number;
    durationMillis?: number;
    [key: string]: unknown;
  }

  export interface Sound {
    playAsync(): Promise<AVPlaybackStatus>;
    pauseAsync(): Promise<AVPlaybackStatus>;
    stopAsync(): Promise<AVPlaybackStatus>;
    unloadAsync(): Promise<AVPlaybackStatus>;
    setOnPlaybackStatusUpdate(
      onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void
    ): void;
  }

  export interface AudioMode {
    playsInSilentModeIOS?: boolean;
    staysActiveInBackground?: boolean;
    allowsRecordingIOS?: boolean;
    interruptionModeIOS?: number;
    interruptionModeAndroid?: number;
    shouldDuckAndroid?: boolean;
    playThroughEarpieceAndroid?: boolean;
  }

  export namespace Audio {
    function setAudioModeAsync(mode: AudioMode): Promise<void>;

    class Sound {
      static createAsync(
        source: { uri: string },
        initialStatus?: { shouldPlay?: boolean },
        onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void
      ): Promise<{ sound: Sound }>;

      playAsync(): Promise<AVPlaybackStatus>;
      pauseAsync(): Promise<AVPlaybackStatus>;
      stopAsync(): Promise<AVPlaybackStatus>;
      unloadAsync(): Promise<AVPlaybackStatus>;
    }
  }
}
