// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import { ElevenLabsClient } from 'elevenlabs';
import { createWriteStream, existsSync, mkdirSync, unlinkSync, statSync } from 'fs';
import { pipeline } from 'stream/promises';
import { join } from 'path';
import { execSync } from 'child_process';
import { getAudioDuration } from './audio-utils';
import { cleanupTempFile, cleanupOutputFile } from './file-utils';

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
  'keypress-return': 'ASMR enter key press, satisfying thock, slightly longer decay, MacBook style, no background noise, isolated sound'
} as const;
export type SoundType = keyof typeof SOUND_PROMPTS;

// Track last used variant to avoid immediate repetition
const lastVariantUsed: Map<string, number> = new Map();

/**
 * Get a round-robin sound type for a base category
 * Ensures we don't play the same variant twice in a row
 */
export function getVariantSoundType(baseType: 'keypress-letter' | 'keypress-space'): SoundType {
  if (stryMutAct_9fa48("488")) {
    {}
  } else {
    stryCov_9fa48("488");
    const lastUsed = stryMutAct_9fa48("489") ? lastVariantUsed.get(baseType) && 0 : (stryCov_9fa48("489"), lastVariantUsed.get(baseType) ?? 0);

    // Pick a random variant that's not the last one used
    let variant: number;
    do {
      if (stryMutAct_9fa48("490")) {
        {}
      } else {
        stryCov_9fa48("490");
        variant = stryMutAct_9fa48("491") ? Math.floor(Math.random() * 5) - 1 : (stryCov_9fa48("491"), Math.floor(stryMutAct_9fa48("492") ? Math.random() / 5 : (stryCov_9fa48("492"), Math.random() * 5)) + 1);
      }
    } while (stryMutAct_9fa48("494") ? variant !== lastUsed : stryMutAct_9fa48("493") ? false : (stryCov_9fa48("493", "494"), variant === lastUsed));
    lastVariantUsed.set(baseType, variant);
    return `${baseType}-${variant}` as SoundType;
  }
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
  if (stryMutAct_9fa48("495")) {
    {}
  } else {
    stryCov_9fa48("495");
    soundsDir = dir;
    if (stryMutAct_9fa48("498") ? false : stryMutAct_9fa48("497") ? true : stryMutAct_9fa48("496") ? existsSync(dir) : (stryCov_9fa48("496", "497", "498"), !existsSync(dir))) {
      if (stryMutAct_9fa48("499")) {
        {}
      } else {
        stryCov_9fa48("499");
        mkdirSync(dir, stryMutAct_9fa48("500") ? {} : (stryCov_9fa48("500"), {
          recursive: stryMutAct_9fa48("501") ? false : (stryCov_9fa48("501"), true)
        }));
      }
    }
  }
}

/**
 * Check if a sound file is valid (not empty/corrupt from silenceremove)
 */
function isValidSoundFile(filePath: string): boolean {
  if (stryMutAct_9fa48("502")) {
    {}
  } else {
    stryCov_9fa48("502");
    try {
      if (stryMutAct_9fa48("503")) {
        {}
      } else {
        stryCov_9fa48("503");
        const stats = statSync(filePath);
        return stryMutAct_9fa48("507") ? stats.size < MIN_VALID_FILE_SIZE : stryMutAct_9fa48("506") ? stats.size > MIN_VALID_FILE_SIZE : stryMutAct_9fa48("505") ? false : stryMutAct_9fa48("504") ? true : (stryCov_9fa48("504", "505", "506", "507"), stats.size >= MIN_VALID_FILE_SIZE);
      }
    } catch {
      if (stryMutAct_9fa48("508")) {
        {}
      } else {
        stryCov_9fa48("508");
        return stryMutAct_9fa48("509") ? true : (stryCov_9fa48("509"), false);
      }
    }
  }
}

/**
 * Generate a sound effect using ElevenLabs API
 * Results are cached to avoid duplicate API calls
 */
export async function generateSound(type: SoundType): Promise<SoundResult> {
  if (stryMutAct_9fa48("510")) {
    {}
  } else {
    stryCov_9fa48("510");
    // Return cached sound if available
    const cached = soundCache.get(type);
    if (stryMutAct_9fa48("512") ? false : stryMutAct_9fa48("511") ? true : (stryCov_9fa48("511", "512"), cached)) {
      if (stryMutAct_9fa48("513")) {
        {}
      } else {
        stryCov_9fa48("513");
        return cached;
      }
    }
    if (stryMutAct_9fa48("516") ? soundsDir !== null : stryMutAct_9fa48("515") ? false : stryMutAct_9fa48("514") ? true : (stryCov_9fa48("514", "515", "516"), soundsDir === null)) {
      if (stryMutAct_9fa48("517")) {
        {}
      } else {
        stryCov_9fa48("517");
        throw new Error(stryMutAct_9fa48("518") ? "" : (stryCov_9fa48("518"), 'Sounds directory not initialized. Call initSoundsDir() first.'));
      }
    }
    const outputPath = join(soundsDir, stryMutAct_9fa48("519") ? `` : (stryCov_9fa48("519"), `${type}.mp3`));

    // Check if sound file already exists on disk (from previous runs)
    // Also validate it's not a corrupt file from a previous failed attempt
    if (stryMutAct_9fa48("522") ? existsSync(outputPath) || isValidSoundFile(outputPath) : stryMutAct_9fa48("521") ? false : stryMutAct_9fa48("520") ? true : (stryCov_9fa48("520", "521", "522"), existsSync(outputPath) && isValidSoundFile(outputPath))) {
      if (stryMutAct_9fa48("523")) {
        {}
      } else {
        stryCov_9fa48("523");
        const durationMs = await getAudioDuration(outputPath);
        const result: SoundResult = stryMutAct_9fa48("524") ? {} : (stryCov_9fa48("524"), {
          path: outputPath,
          durationMs
        });
        soundCache.set(type, result);
        return result;
      }
    }
    const client = new ElevenLabsClient();
    const prompt = SOUND_PROMPTS[type];
    const tempPath = join(soundsDir, stryMutAct_9fa48("525") ? `` : (stryCov_9fa48("525"), `${type}.temp.mp3`));

    // Retry loop - ElevenLabs sometimes generates "duds" (entirely silent audio)
    for (let attempt = 1; stryMutAct_9fa48("528") ? attempt > MAX_GENERATION_RETRIES : stryMutAct_9fa48("527") ? attempt < MAX_GENERATION_RETRIES : stryMutAct_9fa48("526") ? false : (stryCov_9fa48("526", "527", "528"), attempt <= MAX_GENERATION_RETRIES); stryMutAct_9fa48("529") ? attempt-- : (stryCov_9fa48("529"), attempt++)) {
      if (stryMutAct_9fa48("530")) {
        {}
      } else {
        stryCov_9fa48("530");
        // ElevenLabs minimum duration is 0.5s, so we generate at minimum
        const audioStream = await client.textToSoundEffects.convert(stryMutAct_9fa48("531") ? {} : (stryCov_9fa48("531"), {
          text: prompt,
          duration_seconds: 0.5
        }));
        const writeStream = createWriteStream(tempPath);
        await pipeline(audioStream, writeStream);

        // Trim to target duration using ffmpeg (real keypresses are 30-80ms)
        // Use silenceremove to strip leading silence before trimming, since ElevenLabs
        // may generate sounds where the actual audio content starts later in the file
        const fadeOutStart = stryMutAct_9fa48("532") ? TARGET_SOUND_DURATION_SECONDS / 0.7 : (stryCov_9fa48("532"), TARGET_SOUND_DURATION_SECONDS * 0.7);
        const fadeOutDuration = stryMutAct_9fa48("533") ? TARGET_SOUND_DURATION_SECONDS / 0.3 : (stryCov_9fa48("533"), TARGET_SOUND_DURATION_SECONDS * 0.3);
        execSync(stryMutAct_9fa48("534") ? `` : (stryCov_9fa48("534"), `ffmpeg -y -i "${tempPath}" -af "silenceremove=start_periods=1:start_threshold=-30dB,afade=t=out:st=${fadeOutStart}:d=${fadeOutDuration}" -t ${TARGET_SOUND_DURATION_SECONDS} "${outputPath}"`), stryMutAct_9fa48("535") ? {} : (stryCov_9fa48("535"), {
          stdio: stryMutAct_9fa48("536") ? "" : (stryCov_9fa48("536"), 'pipe')
        }));

        // Clean up temp file
        cleanupTempFile(tempPath);

        // Validate the output file
        if (stryMutAct_9fa48("538") ? false : stryMutAct_9fa48("537") ? true : (stryCov_9fa48("537", "538"), isValidSoundFile(outputPath))) {
          if (stryMutAct_9fa48("539")) {
            {}
          } else {
            stryCov_9fa48("539");
            break; // Success!
          }
        }

        // Delete invalid file before retry
        cleanupOutputFile(outputPath);
        if (stryMutAct_9fa48("542") ? attempt !== MAX_GENERATION_RETRIES : stryMutAct_9fa48("541") ? false : stryMutAct_9fa48("540") ? true : (stryCov_9fa48("540", "541", "542"), attempt === MAX_GENERATION_RETRIES)) {
          if (stryMutAct_9fa48("543")) {
            {}
          } else {
            stryCov_9fa48("543");
            throw new Error((stryMutAct_9fa48("544") ? `` : (stryCov_9fa48("544"), `Failed to generate valid sound for "${type}" after ${MAX_GENERATION_RETRIES} attempts. `)) + (stryMutAct_9fa48("545") ? `` : (stryCov_9fa48("545"), `ElevenLabs may be generating silent audio for this prompt.`)));
          }
        }
      }
    }
    const durationMs = await getAudioDuration(outputPath);
    const result: SoundResult = stryMutAct_9fa48("546") ? {} : (stryCov_9fa48("546"), {
      path: outputPath,
      durationMs
    });
    soundCache.set(type, result);
    return result;
  }
}

/**
 * Clear the sound cache (useful for testing)
 */
export function clearSoundCache(): void {
  if (stryMutAct_9fa48("547")) {
    {}
  } else {
    stryCov_9fa48("547");
    soundCache.clear();
    soundsDir = null;
  }
}

/**
 * Get the current sound cache (useful for testing)
 */
export function getSoundCache(): Map<SoundType, SoundResult> {
  if (stryMutAct_9fa48("548")) {
    {}
  } else {
    stryCov_9fa48("548");
    return soundCache;
  }
}