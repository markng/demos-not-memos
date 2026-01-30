import { ElevenLabsClient } from 'elevenlabs';
import { createWriteStream, existsSync, mkdirSync, unlinkSync, statSync } from 'fs';
import { pipeline } from 'stream/promises';
import { join } from 'path';
import { execSync } from 'child_process';
import { getAudioDuration } from './audio-utils';

/**
 * Target duration for keyboard sounds in seconds.
 * Real MacBook keypresses are 30-80ms, so 100ms is a realistic target.
 * ElevenLabs minimum is 0.5s, so we generate at minimum and trim with ffmpeg.
 */
const TARGET_SOUND_DURATION_SECONDS = 0.1;

/**
 * Maximum number of retry attempts when ElevenLabs generates silent audio.
 * Sometimes the AI generates "duds" that are entirely silence.
 */
const MAX_GENERATION_RETRIES = 3;

/**
 * Minimum file size in bytes for a valid 100ms MP3 sound.
 * A valid 100ms MP3 at reasonable quality should be at least 1KB.
 * Empty/corrupt files from silenceremove are typically ~250 bytes.
 */
const MIN_VALID_FILE_SIZE = 1000;

/**
 * Sound effect prompts for ElevenLabs text_to_sound_effects API
 * ASMR-style keyboard sounds with round-robin variants for natural typing
 */
const SOUND_PROMPTS = {
  // MacBook Pro trackpad
  click: 'MacBook Pro trackpad click, soft satisfying tap, ASMR quality, no background noise, isolated sound',

  // Legacy keypress for backwards compatibility
  keypress: 'ASMR keyboard key press, satisfying soft thock, MacBook scissor switch, no background noise, isolated sound',

  // Round-robin letter variants - each slightly different character
  'keypress-letter-1': 'ASMR keyboard key press, soft satisfying thock, gentle attack, MacBook style, no background noise, isolated sound',
  'keypress-letter-2': 'ASMR keyboard key press, crisp soft tap, light touch, MacBook style, no background noise, isolated sound',
  'keypress-letter-3': 'ASMR keyboard key press, muted satisfying click, medium touch, MacBook style, no background noise, isolated sound',
  'keypress-letter-4': 'ASMR keyboard key press, soft thud, deeper tone, MacBook style, no background noise, isolated sound',
  'keypress-letter-5': 'ASMR keyboard key press, gentle satisfying tap, quick release, MacBook style, no background noise, isolated sound',

  // Round-robin spacebar variants - deeper, more resonant
  'keypress-space-1': 'ASMR spacebar press, satisfying deep thock, resonant, MacBook style, no background noise, isolated sound',
  'keypress-space-2': 'ASMR spacebar press, soft deep tap, thumb press, MacBook style, no background noise, isolated sound',
  'keypress-space-3': 'ASMR spacebar press, muted bass thud, satisfying, MacBook style, no background noise, isolated sound',
  'keypress-space-4': 'ASMR spacebar press, gentle deep click, centered, MacBook style, no background noise, isolated sound',
  'keypress-space-5': 'ASMR spacebar press, soft resonant tap, relaxed touch, MacBook style, no background noise, isolated sound',

  // Return key - slightly longer decay
  'keypress-return': 'ASMR enter key press, satisfying thock, slightly longer decay, MacBook style, no background noise, isolated sound',
} as const;

export type SoundType = keyof typeof SOUND_PROMPTS;

// Track last used variant to avoid immediate repetition
const lastVariantUsed: Map<string, number> = new Map();

/**
 * Get a round-robin sound type for a base category
 * Ensures we don't play the same variant twice in a row
 */
export function getVariantSoundType(baseType: 'keypress-letter' | 'keypress-space'): SoundType {
  const lastUsed = lastVariantUsed.get(baseType) ?? 0;

  // Pick a random variant that's not the last one used
  let variant: number;
  do {
    variant = Math.floor(Math.random() * 5) + 1;
  } while (variant === lastUsed);

  lastVariantUsed.set(baseType, variant);
  return `${baseType}-${variant}` as SoundType;
}

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
 * Check if a sound file is valid (not empty/corrupt from silenceremove)
 */
function isValidSoundFile(filePath: string): boolean {
  try {
    const stats = statSync(filePath);
    return stats.size >= MIN_VALID_FILE_SIZE;
  } catch {
    return false;
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
  // Also validate it's not a corrupt file from a previous failed attempt
  if (existsSync(outputPath) && isValidSoundFile(outputPath)) {
    const durationMs = await getAudioDuration(outputPath);
    const result: SoundResult = { path: outputPath, durationMs };
    soundCache.set(type, result);
    return result;
  }

  const client = new ElevenLabsClient();
  const prompt = SOUND_PROMPTS[type];
  const tempPath = join(soundsDir, `${type}.temp.mp3`);

  // Retry loop - ElevenLabs sometimes generates "duds" (entirely silent audio)
  for (let attempt = 1; attempt <= MAX_GENERATION_RETRIES; attempt++) {
    // ElevenLabs minimum duration is 0.5s, so we generate at minimum
    const audioStream = await client.textToSoundEffects.convert({
      text: prompt,
      duration_seconds: 0.5,
    });

    const writeStream = createWriteStream(tempPath);
    await pipeline(audioStream, writeStream);

    // Trim to target duration using ffmpeg (real keypresses are 30-80ms)
    // Use silenceremove to strip leading silence before trimming, since ElevenLabs
    // may generate sounds where the actual audio content starts later in the file
    const fadeOutStart = TARGET_SOUND_DURATION_SECONDS * 0.7;
    const fadeOutDuration = TARGET_SOUND_DURATION_SECONDS * 0.3;
    execSync(
      `ffmpeg -y -i "${tempPath}" -af "silenceremove=start_periods=1:start_threshold=-30dB,afade=t=out:st=${fadeOutStart}:d=${fadeOutDuration}" -t ${TARGET_SOUND_DURATION_SECONDS} "${outputPath}"`,
      { stdio: 'pipe' }
    );

    // Clean up temp file
    if (existsSync(tempPath)) {
      unlinkSync(tempPath);
    }

    // Validate the output file
    if (isValidSoundFile(outputPath)) {
      break; // Success!
    }

    // Delete invalid file before retry
    if (existsSync(outputPath)) {
      unlinkSync(outputPath);
    }

    if (attempt === MAX_GENERATION_RETRIES) {
      throw new Error(
        `Failed to generate valid sound for "${type}" after ${MAX_GENERATION_RETRIES} attempts. ` +
        `ElevenLabs may be generating silent audio for this prompt.`
      );
    }
  }

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
