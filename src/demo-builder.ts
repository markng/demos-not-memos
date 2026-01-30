import { chromium, Page, Locator } from 'playwright';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { DemoConfig, DemoState, DEFAULT_CONFIG } from './types';
import { Narration } from './narration';
import { concatAudioWithGaps, mergeAudioVideo } from './ffmpeg-utils';
import { generateSound, initSoundsDir, SoundType } from './sounds';

/**
 * A wrapped page that intercepts click and type operations
 * to record timestamps for UI sounds
 */
export class SoundEnabledPage {
  private originalPage: Page;
  private recordTimestamp: (type: SoundType, count?: number) => void;

  constructor(page: Page, recordTimestamp: (type: SoundType, count?: number) => void) {
    this.originalPage = page;
    this.recordTimestamp = recordTimestamp;
  }

  /**
   * Navigate to a URL
   */
  async goto(url: string): Promise<void> {
    await this.originalPage.goto(url);
  }

  /**
   * Click an element and record the click timestamp
   */
  async click(selector: string): Promise<void> {
    this.recordTimestamp('click');
    await this.originalPage.click(selector);
  }

  /**
   * Type text into an element and record keypress timestamps
   */
  async type(selector: string, text: string): Promise<void> {
    // Record a keypress for each character
    for (let i = 0; i < text.length; i++) {
      this.recordTimestamp('keypress');
    }
    await this.originalPage.type(selector, text);
  }

  /**
   * Fill an input element (faster than type, no individual keystrokes)
   */
  async fill(selector: string, value: string): Promise<void> {
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
   * Record a timestamp for a sound event
   */
  private recordSoundTimestamp(type: SoundType, count: number = 1): void {
    const baseTime = Date.now() - this.state.startTime;
    // For keypresses, spread them out slightly (50ms apart)
    for (let i = 0; i < count; i++) {
      const timeMs = baseTime + (type === 'keypress' ? i * 50 : 0);
      this.pendingSoundTimestamps.push({ type, timeMs });
    }
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
    if (this.config.sounds) {
      const soundsDir = join(this.tempDir, 'sounds');
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
        (type, count) => this.recordSoundTimestamp(type, count)
      );
    }

    // Navigate to base URL
    await this.state.page.goto(this.config.baseUrl);

    this.state.started = true;
    this.state.startTime = Date.now();
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
