import * as FileSystem from 'expo-file-system';

export interface ProcessedVideo {
  uri: string;
  size?: number;
  duration?: number;
}

/**
 * Try to compress a video for production use. Uses `expo-video-compressor` if available.
 * Falls back to returning the original URI if compressor is not installed.
 */
export const compressVideoForProduction = async (uri: string): Promise<ProcessedVideo> => {
  try {
    // Attempt to require the optional native module if the app installed it.
    // We use require to avoid bundling errors when the package is not present.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const compressor: any = require('expo-video-compressor');

    if (compressor && typeof compressor.compress === 'function') {
      // Best-effort: let the compressor choose sensible defaults.
      const result: any = await compressor.compress(uri, { compressionMethod: 'auto' });
      if (result && result.uri) {
        // Try to get file size
        try {
          const info = await FileSystem.getInfoAsync(result.uri);
          const size = info.exists ? info.size : undefined;
          return { uri: result.uri, size, duration: result.duration } as ProcessedVideo;
        } catch (e) {
          return { uri: result.uri, duration: result.duration } as ProcessedVideo;
        }
      }
    }
  } catch (e) {
    // Optional dependency not installed or failed. We'll fall back.
    // Keep a console warning for diagnostics.
    // eslint-disable-next-line no-console
    console.warn('Video compressor not available, uploading original video.', e);
  }

  return { uri };
};
