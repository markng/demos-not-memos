import { chromium, Page, Locator } from 'playwright';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { DemoConfig, DemoState, DEFAULT_CONFIG } from './types';
import { Narration } from './narration';
import { concatAudioWithGaps, mergeAudioVideo } from './ffmpeg-utils';
import { generateSound, initSoundsDir, SoundType, getVariantSoundType } from './sounds';

/**
 * A wrapped page that intercepts click and type operations
 * to record timestamps for UI sounds
 */
export class SoundEnabledPage {
  private originalPage: Page;
  private recordTimestamp: (type: SoundType) => void;
  private pendingSoundTimestamps: Array<{ type: SoundType; timeMs: number }>;
  private state: DemoState;

  constructor(
    page: Page,
    recordTimestamp: (type: SoundType) => void,
    pendingSoundTimestamps: Array<{ type: SoundType; timeMs: number }>,
    state: DemoState
  ) {
    this.originalPage = page;
    this.recordTimestamp = recordTimestamp;
    this.pendingSoundTimestamps = pendingSoundTimestamps;
    this.state = state;
  }

  private recordTimestampAt(type: SoundType, timeMs: number): void {
    this.pendingSoundTimestamps.push({ type, timeMs });
  }

  /**
   * Navigate to a URL
   */
  async goto(url: string): Promise<void> {
    await this.originalPage.goto(url);
  }

  /**
   * Click an element and record the click timestamp
   * Uses smooth scrolling and human-like reaction delay
   */
  async click(selector: string): Promise<void> {
    // Smooth scroll into view using Playwright's locator
    const locator = this.originalPage.locator(selector);
    await locator.scrollIntoViewIfNeeded();

    // Add extra delay to simulate smooth scrolling feel
    await this.originalPage.waitForTimeout(200);

    // Human reaction delay (100-200ms)
    await this.originalPage.waitForTimeout(100 + Math.random() * 100);

    this.recordTimestamp('click');
    await this.originalPage.click(selector);
  }

  /**
   * Get the appropriate sound type for a character
   * Uses round-robin selection for letters and spaces to avoid repetitive sounds
   */
  private getSoundTypeForChar(char: string): SoundType {
    if (char === ' ') return getVariantSoundType('keypress-space');
    if (char === '\n' || char === '\r') return 'keypress-return';
    return getVariantSoundType('keypress-letter');
  }

  /**
   * Calculate variable delay between keypresses for natural typing feel
   */
  private getKeypressDelay(prevChar: string, currentChar: string, baseDelay: number): number {
    let delay = baseDelay;

    // 1. Random variation (+/- 30%)
    delay *= 0.7 + Math.random() * 0.6;

    // 2. Common digraphs are faster (th, er, on, an, etc.)
    const fastDigraphs = ['th', 'er', 'on', 'an', 'en', 'in', 're', 'he', 'ed', 'nd'];
    if (fastDigraphs.includes((prevChar + currentChar).toLowerCase())) {
      delay *= 0.7;
    }

    // 3. After space = slight pause (thinking)
    if (prevChar === ' ') {
      delay *= 1.3;
    }

    // 4. Punctuation followed by longer pause
    if (['.', ',', '!', '?'].includes(prevChar)) {
      delay *= 1.5;
    }

    return Math.round(delay);
  }

  /**
   * Type text into an element and record keypress timestamps
   * Uses variable timing for natural feel and different sounds for different keys
   */
  async type(selector: string, text: string, options?: { delay?: number }): Promise<void> {
    await this.originalPage.locator(selector).scrollIntoViewIfNeeded();

    const baseDelay = options?.delay ?? 150; // Default 220ms base for ~45 WPM typing

    for (let i = 0; i < text.length; i++) {
      const currentChar = text[i];
      const prevChar = i > 0 ? text[i - 1] : '';

      // Record timestamp BEFORE typing - sound should start as keystroke begins
      // Recording after causes drift since page.type() has internal latency
      const soundType = this.getSoundTypeForChar(currentChar);
      const timeMs = Date.now() - this.state.startTime;
      console.log(`[SOUND] ${soundType} for '${currentChar}' at ${timeMs}ms`);
      this.recordTimestampAt(soundType, timeMs);

      // Type single character
      await this.originalPage.type(selector, currentChar);

      // Wait between characters with variable timing (except after the last one)
      if (i < text.length - 1) {
        const delay = this.getKeypressDelay(prevChar, currentChar, baseDelay);
        await this.originalPage.waitForTimeout(delay);
      }
    }
  }

  /**
   * Fill an input element (faster than type, no individual keystrokes)
   */
  async fill(selector: string, value: string): Promise<void> {
    await this.originalPage.locator(selector).scrollIntoViewIfNeeded();
    await this.originalPage.fill(selector, value);
  }

  /**
   * Get a locator for an element
   */
  locator(selector: string): Locator {
    return this.originalPage.locator(selector);
  }

  /**
   * Wait for a selector to appear
   */
  async waitForSelector(selector: string): Promise<void> {
    await this.originalPage.waitForSelector(selector);
  }

  /**
   * Wait for a specific timeout
   */
  async waitForTimeout(timeout: number): Promise<void> {
    await this.originalPage.waitForTimeout(timeout);
  }

  /**
   * Close the page
   */
  async close(): Promise<void> {
    await this.originalPage.close();
  }

  /**
   * Get the video recorder
   */
  video(): ReturnType<Page['video']> {
    return this.originalPage.video();
  }

  /**
   * Access the original Playwright page for advanced operations
   */
  get raw(): Page {
    return this.originalPage;
  }
}

/**
 * Main DSL class for creating narrated demo videos
 */
export class NarratedDemo {
  private config: Required<DemoConfig>;
  private state: DemoState;
  private narrationCounter = 0;
  private tempDir: string;
  private soundEnabledPage: SoundEnabledPage | null = null;
  private pendingSoundTimestamps: Array<{ type: SoundType; timeMs: number }> = [];

  /**
   * The Playwright Page instance - use this for all browser interactions
   * When sounds are enabled, returns a SoundEnabledPage wrapper
   */
  get page(): Page | SoundEnabledPage {
    if (!this.state.page) {
      throw new Error('Demo not started. Call start() first.');
    }
    if (this.config.sounds && this.soundEnabledPage) {
      return this.soundEnabledPage;
    }
    return this.state.page;
  }

  constructor(config: DemoConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    } as Required<DemoConfig>;

    this.state = {
      started: false,
      startTime: 0,
      audioSegments: [],
      videoPath: null,
      browser: null,
      context: null,
      page: null,
    };

    // Use output directory for temp files
    this.tempDir = join(dirname(this.config.output), '.demo-temp');
  }

  /**
   * Record a timestamp for a sound event (used for click sounds)
   */
  private recordSoundTimestamp(type: SoundType): void {
    const timeMs = Date.now() - this.state.startTime;
    this.pendingSoundTimestamps.push({ type, timeMs });
  }

  /**
   * Start the demo recording
   */
  async start(): Promise<void> {
    if (this.state.started) {
      throw new Error('Demo already started');
    }

    // Create temp directory
    await mkdir(this.tempDir, { recursive: true });

    // Initialize sounds directory if sounds are enabled
    // Use assets/sounds for pre-generated sounds that persist across runs
    if (this.config.sounds) {
      const soundsDir = join(__dirname, '..', 'assets', 'sounds');
      initSoundsDir(soundsDir);
    }

    // Launch browser with video recording
    const videoDir = join(this.tempDir, 'video');
    await mkdir(videoDir, { recursive: true });

    this.state.browser = await chromium.launch({ headless: false });
    this.state.context = await this.state.browser.newContext({
      viewport: this.config.viewport,
      recordVideo: {
        dir: videoDir,
        size: this.config.viewport,
      },
    });

    this.state.page = await this.state.context.newPage();

    // Create sound-enabled page wrapper if sounds are enabled
    if (this.config.sounds) {
      this.soundEnabledPage = new SoundEnabledPage(
        this.state.page,
        (type) => this.recordSoundTimestamp(type),
        this.pendingSoundTimestamps,
        this.state
      );
    }

    // Navigate to base URL
    await this.state.page.goto(this.config.baseUrl);

    // Set startTime AFTER page navigation completes - this aligns with when video actually starts rendering
    // Previously this was set at context creation, causing ~2.4s audio offset
    this.state.started = true;
    this.state.startTime = Date.now();
    console.log(`[TIMING] startTime captured: ${this.state.startTime} (after page navigation)`);
  }


  /**
   * Create a narration segment
   * The narration is generated immediately and timing starts
   * Returns a Narration object that can be awaited or used with whileDoing
   */
  async narrate(text: string): Promise<Narration> {
    if (!this.state.started) {
      throw new Error('Demo not started. Call start() first.');
    }

    const segmentId = `narration-${++this.narrationCounter}`;
    const startTimeMs = Date.now() - this.state.startTime;

    const narration = new Narration(
      text,
      this.config.voice,
      this.config.model,
      startTimeMs,
      this.tempDir,
      segmentId
    );

    await narration.generate();

    // Add to audio segments
    this.state.audioSegments.push(narration.getAudioSegment());

    // Wait for the narration to complete by default
    await narration.waitUntilComplete();

    return narration;
  }

  /**
   * Process pending sound timestamps and add them as audio segments
   */
  private async processSoundTimestamps(): Promise<void> {
    if (this.pendingSoundTimestamps.length === 0) {
      return;
    }

    // Generate sounds lazily (only generate each type once)
    const soundTypes = new Set(this.pendingSoundTimestamps.map((s) => s.type));
    const soundResults = new Map<SoundType, { path: string; durationMs: number }>();

    for (const type of soundTypes) {
      const result = await generateSound(type);
      soundResults.set(type, result);
    }

    // Add audio segments for each timestamp
    for (const { type, timeMs } of this.pendingSoundTimestamps) {
      const sound = soundResults.get(type)!;
      this.state.audioSegments.push({
        path: sound.path,
        startTimeMs: timeMs,
        durationMs: sound.durationMs,
        type,
      });
    }
  }

  /**
   * Finish the demo and produce the final video
   */
  async finish(): Promise<string> {
    if (!this.state.started) {
      throw new Error('Demo not started. Call start() first.');
    }

    // Process any pending sound timestamps
    if (this.config.sounds) {
      await this.processSoundTimestamps();
    }

    // Close the page to finalize video recording
    if (this.state.page) {
      await this.state.page.close();
      // Get the video path
      const video = this.state.page.video();
      if (video) {
        this.state.videoPath = await video.path();
      }
    }

    // Close browser
    if (this.state.context) {
      await this.state.context.close();
    }
    if (this.state.browser) {
      await this.state.browser.close();
    }

    // If we have audio segments, concatenate them
    let audioPath: string | null = null;
    if (this.state.audioSegments.length > 0) {
      console.log(`\n[TIMING] Final audio segments (${this.state.audioSegments.length} total):`);
      for (const seg of this.state.audioSegments) {
        console.log(`  ${seg.type || 'narration'} at ${seg.startTimeMs}ms (duration: ${seg.durationMs}ms)`);
      }
      audioPath = join(this.tempDir, 'combined-audio.wav');
      await concatAudioWithGaps(this.state.audioSegments, audioPath);
    }

    // Create output directory
    await mkdir(dirname(this.config.output), { recursive: true });

    // Merge audio and video if we have both
    if (this.state.videoPath !== null && audioPath !== null) {
      await mergeAudioVideo(this.state.videoPath, audioPath, this.config.output);
    } else if (this.state.videoPath !== null) {
      // Just copy video if no audio
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      await execAsync(`cp "${this.state.videoPath}" "${this.config.output}"`);
    }

    return this.config.output;
  }

  /**
   * Get elapsed time since demo started in milliseconds
   */
  getElapsedTime(): number {
    if (!this.state.started) {
      return 0;
    }
    return Date.now() - this.state.startTime;
  }
}
