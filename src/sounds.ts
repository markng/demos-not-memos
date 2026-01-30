import { ElevenLabsClient } from 'elevenlabs';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { pipeline } from 'stream/promises';
import { join } from 'path';
import { getAudioDuration } from './audio-utils';

/**
 * Sound effect prompts for ElevenLabs text_to_sound_effects API
 */
const SOUND_PROMPTS = {
  click: 'short crisp mouse click on a trackpad',
  keypress: 'single mechanical keyboard key press',
} as const;

export type SoundType = keyof typeof SOUND_PROMPTS;

/**
 * Result of sound generation
 */
export interface SoundResult {
  path: string;
  durationMs: number;
}

/**
 * Cache for generated sound effects
 * Stores sounds by type to avoid regenerating the same sounds
 */
const soundCache: Map<SoundType, SoundResult> = new Map();

/**
 * Directory where sounds are cached
 */
let soundsDir: string | null = null;

/**
 * Initialize the sounds directory for caching
 * Call this before generating any sounds
 */
export function initSoundsDir(dir: string): void {
  soundsDir = dir;
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Generate a sound effect using ElevenLabs API
 * Results are cached to avoid duplicate API calls
 */
export async function generateSound(type: SoundType): Promise<SoundResult> {
  // Return cached sound if available
  const cached = soundCache.get(type);
  if (cached) {
    return cached;
  }

  if (soundsDir === null) {
    throw new Error('Sounds directory not initialized. Call initSoundsDir() first.');
  }

  const outputPath = join(soundsDir, `${type}.mp3`);

  // Check if sound file already exists on disk (from previous runs)
  if (existsSync(outputPath)) {
    const durationMs = await getAudioDuration(outputPath);
    const result: SoundResult = { path: outputPath, durationMs };
    soundCache.set(type, result);
    return result;
  }

  const client = new ElevenLabsClient();
  const prompt = SOUND_PROMPTS[type];

  const audioStream = await client.textToSoundEffects.convert({
    text: prompt,
    duration_seconds: 0.5, // Short sounds
  });

  const writeStream = createWriteStream(outputPath);
  await pipeline(audioStream, writeStream);

  const durationMs = await getAudioDuration(outputPath);
  const result: SoundResult = { path: outputPath, durationMs };
  soundCache.set(type, result);

  return result;
}

/**
 * Clear the sound cache (useful for testing)
 */
export function clearSoundCache(): void {
  soundCache.clear();
  soundsDir = null;
}

/**
 * Get the current sound cache (useful for testing)
 */
export function getSoundCache(): Map<SoundType, SoundResult> {
  return soundCache;
}
