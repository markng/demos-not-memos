import { Page, Browser, BrowserContext } from 'playwright';

/**
 * Configuration for creating a NarratedDemo
 */
export interface DemoConfig {
  /** Base URL for the demo (e.g., 'http://localhost:8000') */
  baseUrl: string;
  /** Viewport dimensions for the browser */
  viewport?: { width: number; height: number };
  /** ElevenLabs voice to use for narration */
  voice?: string;
  /** ElevenLabs model to use (eleven_v3 for audio tags support) */
  model?: string;
  /** Output file path for the final video */
  output: string;
  /** Enable UI sounds (clicks, keystrokes) */
  sounds?: boolean;
}

/**
 * Represents a single narration segment with timing information
 */
export interface NarrationSegment {
  /** The narration text */
  text: string;
  /** Path to the generated audio file */
  audioPath: string;
  /** Duration of the audio in milliseconds */
  durationMs: number;
  /** Timestamp when this narration started (relative to demo start) */
  startTimeMs: number;
}

/**
 * Represents an audio segment for the final mix
 */
export interface AudioSegment {
  /** Path to the audio file */
  path: string;
  /** Start time in milliseconds relative to demo start */
  startTimeMs: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Type of audio segment */
  type: 'narration' | 'click' | 'keypress' | 'keypress-return'
    | 'keypress-letter-1' | 'keypress-letter-2' | 'keypress-letter-3' | 'keypress-letter-4' | 'keypress-letter-5'
    | 'keypress-space-1' | 'keypress-space-2' | 'keypress-space-3' | 'keypress-space-4' | 'keypress-space-5';
}

/**
 * Options for TTS generation
 */
export interface TTSOptions {
  /** Text to convert to speech */
  text: string;
  /** ElevenLabs voice ID or name */
  voice: string;
  /** ElevenLabs model ID */
  model: string;
  /** Output file path */
  outputPath: string;
}

/**
 * Result of TTS generation
 */
export interface TTSResult {
  /** Path to the generated audio file */
  audioPath: string;
  /** Duration of the audio in milliseconds */
  durationMs: number;
}

/**
 * Internal state for the NarratedDemo
 */
export interface DemoState {
  /** Whether the demo has started */
  started: boolean;
  /** Start timestamp */
  startTime: number;
  /** Sync marker timestamp - all audio events are relative to this */
  syncTime: number;
  /** Collected audio segments */
  audioSegments: AudioSegment[];
  /** Path to the raw video recording */
  videoPath: string | null;
  /** The browser instance */
  browser: Browser | null;
  /** The browser context */
  context: BrowserContext | null;
  /** The page instance */
  page: Page | null;
}

/**
 * Default values for demo configuration
 */
export const DEFAULT_CONFIG = {
  viewport: { width: 1280, height: 720 },
  voice: 'Elli',
  model: 'eleven_v3',
  sounds: false,
} as const;
