/**
 * demos-not-memos - TypeScript DSL for narrated demo videos
 *
 * @example
 * import { NarratedDemo } from 'demos-not-memos';
 *
 * const demo = new NarratedDemo({
 *   baseUrl: 'https://example.com',
 *   voice: 'Rachel',
 *   model: 'eleven_v3',
 *   output: './output/demo.mp4'
 * });
 *
 * await demo.start();
 * await demo.page.goto('/');
 * await demo.narrate("Welcome to our product!");
 * await demo.finish();
 */

export { NarratedDemo, SoundEnabledPage } from './demo-builder';
export { Narration } from './narration';
export type {
  DemoConfig,
  NarrationSegment,
  AudioSegment,
  TTSOptions,
  TTSResult,
  DemoState,
} from './types';
export { DEFAULT_CONFIG } from './types';
export type { SoundType, SoundResult } from './sounds';
export { generateSound, initSoundsDir, clearSoundCache } from './sounds';
