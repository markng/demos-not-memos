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
import { chromium, Page, Locator } from 'playwright';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { DemoConfig, DemoState, DEFAULT_CONFIG } from './types';
import { Narration } from './narration';
import { concatAudioWithGaps, mergeAudioVideo, detectSyncFrameRange, trimSyncFrames } from './ffmpeg-utils';
import { generateSound, initSoundsDir, SoundType, getVariantSoundType } from './sounds';
import { TIMING_CONSTANTS, calculateHumanReactionDelay, calculateKeypressDelay, RandomNumberGenerator, DefaultRNG } from './timing-utils';

/**
 * A wrapped page that intercepts click and type operations
 * to record timestamps for UI sounds
 */
export class SoundEnabledPage {
  private originalPage: Page;
  private recordTimestamp: (type: SoundType) => void;
  private pendingSoundTimestamps: Array<{
    type: SoundType;
    timeMs: number;
  }>;
  private state: DemoState;
  private rng: RandomNumberGenerator;
  constructor(page: Page, recordTimestamp: (type: SoundType) => void, pendingSoundTimestamps: Array<{
    type: SoundType;
    timeMs: number;
  }>, state: DemoState, rng: RandomNumberGenerator = new DefaultRNG()) {
    if (stryMutAct_9fa48("22")) {
      {}
    } else {
      stryCov_9fa48("22");
      this.originalPage = page;
      this.recordTimestamp = recordTimestamp;
      this.pendingSoundTimestamps = pendingSoundTimestamps;
      this.state = state;
      this.rng = rng;
    }
  }
  private recordTimestampAt(type: SoundType, timeMs: number): void {
    if (stryMutAct_9fa48("23")) {
      {}
    } else {
      stryCov_9fa48("23");
      this.pendingSoundTimestamps.push(stryMutAct_9fa48("24") ? {} : (stryCov_9fa48("24"), {
        type,
        timeMs
      }));
    }
  }

  /**
   * Navigate to a URL
   */
  async goto(url: string): Promise<void> {
    if (stryMutAct_9fa48("25")) {
      {}
    } else {
      stryCov_9fa48("25");
      await this.originalPage.goto(url);
    }
  }

  /**
   * Click an element and record the click timestamp
   * Uses smooth scrolling and human-like reaction delay
   */
  async click(selector: string): Promise<void> {
    if (stryMutAct_9fa48("26")) {
      {}
    } else {
      stryCov_9fa48("26");
      // Smooth scroll into view using Playwright's locator
      const locator = this.originalPage.locator(selector);
      await locator.scrollIntoViewIfNeeded();

      // Add extra delay to simulate smooth scrolling feel
      await this.originalPage.waitForTimeout(TIMING_CONSTANTS.SCROLL_DELAY_MS);

      // Human reaction delay (100-200ms)
      await this.originalPage.waitForTimeout(calculateHumanReactionDelay(this.rng.random()));
      this.recordTimestamp(stryMutAct_9fa48("27") ? "" : (stryCov_9fa48("27"), 'click'));
      await this.originalPage.click(selector);
    }
  }

  /**
   * Get the appropriate sound type for a character
   * Uses round-robin selection for letters and spaces to avoid repetitive sounds
   */
  private getSoundTypeForChar(char: string): SoundType {
    if (stryMutAct_9fa48("28")) {
      {}
    } else {
      stryCov_9fa48("28");
      if (stryMutAct_9fa48("31") ? char !== ' ' : stryMutAct_9fa48("30") ? false : stryMutAct_9fa48("29") ? true : (stryCov_9fa48("29", "30", "31"), char === (stryMutAct_9fa48("32") ? "" : (stryCov_9fa48("32"), ' ')))) return getVariantSoundType(stryMutAct_9fa48("33") ? "" : (stryCov_9fa48("33"), 'keypress-space'));
      if (stryMutAct_9fa48("36") ? char === '\n' && char === '\r' : stryMutAct_9fa48("35") ? false : stryMutAct_9fa48("34") ? true : (stryCov_9fa48("34", "35", "36"), (stryMutAct_9fa48("38") ? char !== '\n' : stryMutAct_9fa48("37") ? false : (stryCov_9fa48("37", "38"), char === (stryMutAct_9fa48("39") ? "" : (stryCov_9fa48("39"), '\n')))) || (stryMutAct_9fa48("41") ? char !== '\r' : stryMutAct_9fa48("40") ? false : (stryCov_9fa48("40", "41"), char === (stryMutAct_9fa48("42") ? "" : (stryCov_9fa48("42"), '\r')))))) return stryMutAct_9fa48("43") ? "" : (stryCov_9fa48("43"), 'keypress-return');
      return getVariantSoundType(stryMutAct_9fa48("44") ? "" : (stryCov_9fa48("44"), 'keypress-letter'));
    }
  }

  /**
   * Calculate variable delay between keypresses for natural typing feel
   * Now delegates to the extracted timing utility function
   */
  private getKeypressDelay(prevChar: string, currentChar: string, baseDelay: number): number {
    if (stryMutAct_9fa48("45")) {
      {}
    } else {
      stryCov_9fa48("45");
      return calculateKeypressDelay(prevChar, currentChar, baseDelay, this.rng);
    }
  }

  /**
   * Type text into an element and record keypress timestamps
   * Uses variable timing for natural feel and different sounds for different keys
   */
  async type(selector: string, text: string, options?: {
    delay?: number;
  }): Promise<void> {
    if (stryMutAct_9fa48("46")) {
      {}
    } else {
      stryCov_9fa48("46");
      await this.originalPage.locator(selector).scrollIntoViewIfNeeded();
      const baseDelay = stryMutAct_9fa48("47") ? options?.delay && 150 : (stryCov_9fa48("47"), (stryMutAct_9fa48("48") ? options.delay : (stryCov_9fa48("48"), options?.delay)) ?? 150); // Default 220ms base for ~45 WPM typing

      for (let i = 0; stryMutAct_9fa48("51") ? i >= text.length : stryMutAct_9fa48("50") ? i <= text.length : stryMutAct_9fa48("49") ? false : (stryCov_9fa48("49", "50", "51"), i < text.length); stryMutAct_9fa48("52") ? i-- : (stryCov_9fa48("52"), i++)) {
        if (stryMutAct_9fa48("53")) {
          {}
        } else {
          stryCov_9fa48("53");
          const currentChar = text[i];
          const prevChar = (stryMutAct_9fa48("57") ? i <= 0 : stryMutAct_9fa48("56") ? i >= 0 : stryMutAct_9fa48("55") ? false : stryMutAct_9fa48("54") ? true : (stryCov_9fa48("54", "55", "56", "57"), i > 0)) ? text[stryMutAct_9fa48("58") ? i + 1 : (stryCov_9fa48("58"), i - 1)] : stryMutAct_9fa48("59") ? "Stryker was here!" : (stryCov_9fa48("59"), '');

          // Record timestamp BEFORE typing - sound should start as keystroke begins
          // Recording after causes drift since page.type() has internal latency
          // Use syncTime for audio alignment - this is when the sync marker was shown
          const soundType = this.getSoundTypeForChar(currentChar);
          const timeMs = stryMutAct_9fa48("60") ? Date.now() + this.state.syncTime : (stryCov_9fa48("60"), Date.now() - this.state.syncTime);
          // eslint-disable-next-line no-console
          console.log(stryMutAct_9fa48("61") ? `` : (stryCov_9fa48("61"), `[SOUND] ${soundType} for '${currentChar}' at ${timeMs}ms (relative to sync marker)`));
          this.recordTimestampAt(soundType, timeMs);

          // Type single character
          await this.originalPage.type(selector, currentChar);

          // Wait between characters with variable timing (except after the last one)
          if (stryMutAct_9fa48("65") ? i >= text.length - 1 : stryMutAct_9fa48("64") ? i <= text.length - 1 : stryMutAct_9fa48("63") ? false : stryMutAct_9fa48("62") ? true : (stryCov_9fa48("62", "63", "64", "65"), i < (stryMutAct_9fa48("66") ? text.length + 1 : (stryCov_9fa48("66"), text.length - 1)))) {
            if (stryMutAct_9fa48("67")) {
              {}
            } else {
              stryCov_9fa48("67");
              const delay = this.getKeypressDelay(prevChar, currentChar, baseDelay);
              await this.originalPage.waitForTimeout(delay);
            }
          }
        }
      }
    }
  }

  /**
   * Fill an input element (faster than type, no individual keystrokes)
   */
  async fill(selector: string, value: string): Promise<void> {
    if (stryMutAct_9fa48("68")) {
      {}
    } else {
      stryCov_9fa48("68");
      await this.originalPage.locator(selector).scrollIntoViewIfNeeded();
      await this.originalPage.fill(selector, value);
    }
  }

  /**
   * Get a locator for an element
   */
  locator(selector: string): Locator {
    if (stryMutAct_9fa48("69")) {
      {}
    } else {
      stryCov_9fa48("69");
      return this.originalPage.locator(selector);
    }
  }

  /**
   * Wait for a selector to appear
   */
  async waitForSelector(selector: string): Promise<void> {
    if (stryMutAct_9fa48("70")) {
      {}
    } else {
      stryCov_9fa48("70");
      await this.originalPage.waitForSelector(selector);
    }
  }

  /**
   * Wait for a specific timeout
   */
  async waitForTimeout(timeout: number): Promise<void> {
    if (stryMutAct_9fa48("71")) {
      {}
    } else {
      stryCov_9fa48("71");
      await this.originalPage.waitForTimeout(timeout);
    }
  }

  /**
   * Close the page
   */
  async close(): Promise<void> {
    if (stryMutAct_9fa48("72")) {
      {}
    } else {
      stryCov_9fa48("72");
      await this.originalPage.close();
    }
  }

  /**
   * Get the video recorder
   */
  video(): ReturnType<Page['video']> {
    if (stryMutAct_9fa48("73")) {
      {}
    } else {
      stryCov_9fa48("73");
      return this.originalPage.video();
    }
  }

  /**
   * Access the original Playwright page for advanced operations
   */
  get raw(): Page {
    if (stryMutAct_9fa48("74")) {
      {}
    } else {
      stryCov_9fa48("74");
      return this.originalPage;
    }
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
  private pendingSoundTimestamps: Array<{
    type: SoundType;
    timeMs: number;
  }> = stryMutAct_9fa48("75") ? ["Stryker was here"] : (stryCov_9fa48("75"), []);
  private rng: RandomNumberGenerator;

  /**
   * The Playwright Page instance - use this for all browser interactions
   * When sounds are enabled, returns a SoundEnabledPage wrapper
   */
  get page(): Page | SoundEnabledPage {
    if (stryMutAct_9fa48("76")) {
      {}
    } else {
      stryCov_9fa48("76");
      if (stryMutAct_9fa48("79") ? false : stryMutAct_9fa48("78") ? true : stryMutAct_9fa48("77") ? this.state.page : (stryCov_9fa48("77", "78", "79"), !this.state.page)) {
        if (stryMutAct_9fa48("80")) {
          {}
        } else {
          stryCov_9fa48("80");
          throw new Error(stryMutAct_9fa48("81") ? "" : (stryCov_9fa48("81"), 'Demo not started. Call start() first.'));
        }
      }
      if (stryMutAct_9fa48("84") ? this.config.sounds || this.soundEnabledPage : stryMutAct_9fa48("83") ? false : stryMutAct_9fa48("82") ? true : (stryCov_9fa48("82", "83", "84"), this.config.sounds && this.soundEnabledPage)) {
        if (stryMutAct_9fa48("85")) {
          {}
        } else {
          stryCov_9fa48("85");
          return this.soundEnabledPage;
        }
      }
      return this.state.page;
    }
  }
  constructor(config: DemoConfig, rng: RandomNumberGenerator = new DefaultRNG()) {
    if (stryMutAct_9fa48("86")) {
      {}
    } else {
      stryCov_9fa48("86");
      this.config = {
        ...DEFAULT_CONFIG,
        ...config
      } as Required<DemoConfig>;
      this.rng = rng;
      this.state = stryMutAct_9fa48("87") ? {} : (stryCov_9fa48("87"), {
        started: stryMutAct_9fa48("88") ? true : (stryCov_9fa48("88"), false),
        startTime: 0,
        syncTime: 0,
        audioSegments: stryMutAct_9fa48("89") ? ["Stryker was here"] : (stryCov_9fa48("89"), []),
        videoPath: null,
        browser: null,
        context: null,
        page: null
      });

      // Use output directory for temp files
      this.tempDir = join(dirname(this.config.output), stryMutAct_9fa48("90") ? "" : (stryCov_9fa48("90"), '.demo-temp'));
    }
  }

  /**
   * Record a timestamp for a sound event (used for click sounds)
   * Uses syncTime for audio alignment - this is when the sync marker was shown
   */
  private recordSoundTimestamp(type: SoundType): void {
    if (stryMutAct_9fa48("91")) {
      {}
    } else {
      stryCov_9fa48("91");
      const timeMs = stryMutAct_9fa48("92") ? Date.now() + this.state.syncTime : (stryCov_9fa48("92"), Date.now() - this.state.syncTime);
      this.pendingSoundTimestamps.push(stryMutAct_9fa48("93") ? {} : (stryCov_9fa48("93"), {
        type,
        timeMs
      }));
    }
  }

  /**
   * Start the demo recording
   */
  async start(): Promise<void> {
    if (stryMutAct_9fa48("94")) {
      {}
    } else {
      stryCov_9fa48("94");
      if (stryMutAct_9fa48("96") ? false : stryMutAct_9fa48("95") ? true : (stryCov_9fa48("95", "96"), this.state.started)) {
        if (stryMutAct_9fa48("97")) {
          {}
        } else {
          stryCov_9fa48("97");
          throw new Error(stryMutAct_9fa48("98") ? "" : (stryCov_9fa48("98"), 'Demo already started'));
        }
      }

      // Create temp directory
      await mkdir(this.tempDir, stryMutAct_9fa48("99") ? {} : (stryCov_9fa48("99"), {
        recursive: stryMutAct_9fa48("100") ? false : (stryCov_9fa48("100"), true)
      }));

      // Initialize sounds directory if sounds are enabled
      // Use assets/sounds for pre-generated sounds that persist across runs
      if (stryMutAct_9fa48("102") ? false : stryMutAct_9fa48("101") ? true : (stryCov_9fa48("101", "102"), this.config.sounds)) {
        if (stryMutAct_9fa48("103")) {
          {}
        } else {
          stryCov_9fa48("103");
          const soundsDir = join(__dirname, stryMutAct_9fa48("104") ? "" : (stryCov_9fa48("104"), '..'), stryMutAct_9fa48("105") ? "" : (stryCov_9fa48("105"), 'assets'), stryMutAct_9fa48("106") ? "" : (stryCov_9fa48("106"), 'sounds'));
          initSoundsDir(soundsDir);
        }
      }

      // Launch browser with video recording
      const videoDir = join(this.tempDir, stryMutAct_9fa48("107") ? "" : (stryCov_9fa48("107"), 'video'));
      await mkdir(videoDir, stryMutAct_9fa48("108") ? {} : (stryCov_9fa48("108"), {
        recursive: stryMutAct_9fa48("109") ? false : (stryCov_9fa48("109"), true)
      }));
      this.state.browser = await chromium.launch(stryMutAct_9fa48("110") ? {} : (stryCov_9fa48("110"), {
        headless: stryMutAct_9fa48("111") ? true : (stryCov_9fa48("111"), false)
      }));
      this.state.context = await this.state.browser.newContext(stryMutAct_9fa48("112") ? {} : (stryCov_9fa48("112"), {
        viewport: this.config.viewport,
        recordVideo: stryMutAct_9fa48("113") ? {} : (stryCov_9fa48("113"), {
          dir: videoDir,
          size: this.config.viewport
        })
      }));
      this.state.page = await this.state.context.newPage();

      // Create sound-enabled page wrapper if sounds are enabled
      if (stryMutAct_9fa48("115") ? false : stryMutAct_9fa48("114") ? true : (stryCov_9fa48("114", "115"), this.config.sounds)) {
        if (stryMutAct_9fa48("116")) {
          {}
        } else {
          stryCov_9fa48("116");
          this.soundEnabledPage = new SoundEnabledPage(this.state.page, stryMutAct_9fa48("117") ? () => undefined : (stryCov_9fa48("117"), type => this.recordSoundTimestamp(type)), this.pendingSoundTimestamps, this.state, this.rng);
        }
      }

      // Navigate to base URL and wait for it to fully load
      await this.state.page.goto(this.config.baseUrl);
      await this.state.page.waitForLoadState(stryMutAct_9fa48("118") ? "" : (stryCov_9fa48("118"), 'networkidle'));
      // eslint-disable-next-line no-console
      console.log(stryMutAct_9fa48("119") ? `` : (stryCov_9fa48("119"), `[TIMING] Page fully loaded`));

      // Set startTime AFTER page navigation completes
      this.state.started = stryMutAct_9fa48("120") ? false : (stryCov_9fa48("120"), true);
      this.state.startTime = Date.now();
      // eslint-disable-next-line no-console
      console.log(stryMutAct_9fa48("121") ? `` : (stryCov_9fa48("121"), `[TIMING] startTime captured: ${this.state.startTime} (after page navigation)`));

      // Wait 1 second to ensure video recording has stabilized
      // Playwright's video recording needs time to capture initial frames
      await this.state.page.waitForTimeout(1000);

      // Inject sync marker (magenta flash) for audio/video alignment
      // Like a film clapperboard, this provides a known visual anchor point
      await this.state.page.evaluate(stryMutAct_9fa48("122") ? `` : (stryCov_9fa48("122"), `
      (() => {
        const marker = document.createElement('div');
        marker.id = 'sync-marker';
        marker.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;background-color:#FF00FF;z-index:2147483647;';
        document.body.appendChild(marker);
        // Force a repaint
        marker.offsetHeight;
      })()
    `));
      // eslint-disable-next-line no-console
      console.log(stryMutAct_9fa48("123") ? `` : (stryCov_9fa48("123"), `[TIMING] Sync marker injected`));

      // Wait 100ms for marker to be rendered and captured
      await this.state.page.waitForTimeout(100);

      // Capture sync time - all audio events will be relative to this moment
      this.state.syncTime = Date.now();
      // eslint-disable-next-line no-console
      console.log(stryMutAct_9fa48("124") ? `` : (stryCov_9fa48("124"), `[TIMING] syncTime captured: ${this.state.syncTime} (sync marker visible)`));

      // Keep marker visible for ~500ms to ensure it's captured in several frames
      // At 25fps, 500ms = 12-13 frames, which provides reliable detection
      await this.state.page.waitForTimeout(500);

      // Remove the sync marker
      await this.state.page.evaluate(stryMutAct_9fa48("125") ? `` : (stryCov_9fa48("125"), `document.getElementById('sync-marker')?.remove()`));
      // eslint-disable-next-line no-console
      console.log(stryMutAct_9fa48("126") ? `` : (stryCov_9fa48("126"), `[TIMING] Sync marker removed after 500ms`));
    }
  }

  /**
   * Create a narration segment
   * The narration is generated immediately and timing starts
   * Returns a Narration object that can be awaited or used with whileDoing
   */
  async narrate(text: string): Promise<Narration> {
    if (stryMutAct_9fa48("127")) {
      {}
    } else {
      stryCov_9fa48("127");
      if (stryMutAct_9fa48("130") ? false : stryMutAct_9fa48("129") ? true : stryMutAct_9fa48("128") ? this.state.started : (stryCov_9fa48("128", "129", "130"), !this.state.started)) {
        if (stryMutAct_9fa48("131")) {
          {}
        } else {
          stryCov_9fa48("131");
          throw new Error(stryMutAct_9fa48("132") ? "" : (stryCov_9fa48("132"), 'Demo not started. Call start() first.'));
        }
      }
      const segmentId = stryMutAct_9fa48("133") ? `` : (stryCov_9fa48("133"), `narration-${stryMutAct_9fa48("134") ? --this.narrationCounter : (stryCov_9fa48("134"), ++this.narrationCounter)}`);
      const startTimeMs = stryMutAct_9fa48("135") ? Date.now() + this.state.startTime : (stryCov_9fa48("135"), Date.now() - this.state.startTime);
      const narration = new Narration(text, this.config.voice, this.config.model, startTimeMs, this.tempDir, segmentId);
      await narration.generate();

      // Add to audio segments
      this.state.audioSegments.push(narration.getAudioSegment());

      // Wait for the narration to complete by default
      await narration.waitUntilComplete();
      return narration;
    }
  }

  /**
   * Start narration and return the Narration object without waiting for completion.
   * Use this when you need to perform actions while narration plays.
   * @example
   * const narration = await demo.narrateAsync("Watch as I click...");
   * await narration.whileDoing(async () => {
   *   await demo.page.click('#button');
   * });
   */
  async narrateAsync(text: string): Promise<Narration> {
    if (stryMutAct_9fa48("136")) {
      {}
    } else {
      stryCov_9fa48("136");
      if (stryMutAct_9fa48("139") ? false : stryMutAct_9fa48("138") ? true : stryMutAct_9fa48("137") ? this.state.started : (stryCov_9fa48("137", "138", "139"), !this.state.started)) {
        if (stryMutAct_9fa48("140")) {
          {}
        } else {
          stryCov_9fa48("140");
          throw new Error(stryMutAct_9fa48("141") ? "" : (stryCov_9fa48("141"), 'Demo not started. Call start() first.'));
        }
      }
      const segmentId = stryMutAct_9fa48("142") ? `` : (stryCov_9fa48("142"), `narration-${stryMutAct_9fa48("143") ? --this.narrationCounter : (stryCov_9fa48("143"), ++this.narrationCounter)}`);
      const startTimeMs = stryMutAct_9fa48("144") ? Date.now() + this.state.startTime : (stryCov_9fa48("144"), Date.now() - this.state.startTime);
      const narration = new Narration(text, this.config.voice, this.config.model, startTimeMs, this.tempDir, segmentId);
      await narration.generate();

      // Add to audio segments
      this.state.audioSegments.push(narration.getAudioSegment());

      // Return without waiting - caller can use whileDoing() or waitUntilComplete()
      return narration;
    }
  }

  /**
   * Narrate text while simultaneously performing an action.
   * The narration and action run concurrently, and the method completes when both finish.
   * @example
   * await demo.doWhileNarrating(
   *   "Watch as I click the button",
   *   async () => { await demo.page.click('#button'); }
   * );
   */
  async doWhileNarrating(text: string, action: () => Promise<void>): Promise<void> {
    if (stryMutAct_9fa48("145")) {
      {}
    } else {
      stryCov_9fa48("145");
      const narration = await this.narrateAsync(text);
      await narration.whileDoing(action);
    }
  }

  /**
   * Process pending sound timestamps and add them as audio segments
   */
  private async processSoundTimestamps(): Promise<void> {
    if (stryMutAct_9fa48("146")) {
      {}
    } else {
      stryCov_9fa48("146");
      if (stryMutAct_9fa48("149") ? this.pendingSoundTimestamps.length !== 0 : stryMutAct_9fa48("148") ? false : stryMutAct_9fa48("147") ? true : (stryCov_9fa48("147", "148", "149"), this.pendingSoundTimestamps.length === 0)) {
        if (stryMutAct_9fa48("150")) {
          {}
        } else {
          stryCov_9fa48("150");
          return;
        }
      }

      // Generate sounds lazily (only generate each type once)
      const soundTypes = new Set(this.pendingSoundTimestamps.map(stryMutAct_9fa48("151") ? () => undefined : (stryCov_9fa48("151"), s => s.type)));
      const soundResults = new Map<SoundType, {
        path: string;
        durationMs: number;
      }>();
      for (const type of soundTypes) {
        if (stryMutAct_9fa48("152")) {
          {}
        } else {
          stryCov_9fa48("152");
          const result = await generateSound(type);
          soundResults.set(type, result);
        }
      }

      // Add audio segments for each timestamp
      for (const {
        type,
        timeMs
      } of this.pendingSoundTimestamps) {
        if (stryMutAct_9fa48("153")) {
          {}
        } else {
          stryCov_9fa48("153");
          const sound = soundResults.get(type)!;
          this.state.audioSegments.push(stryMutAct_9fa48("154") ? {} : (stryCov_9fa48("154"), {
            path: sound.path,
            startTimeMs: timeMs,
            durationMs: sound.durationMs,
            type
          }));
        }
      }
    }
  }

  /**
   * Finish the demo and produce the final video
   * Uses sync marker detection for precise audio/video alignment
   */
  async finish(): Promise<string> {
    if (stryMutAct_9fa48("155")) {
      {}
    } else {
      stryCov_9fa48("155");
      if (stryMutAct_9fa48("158") ? false : stryMutAct_9fa48("157") ? true : stryMutAct_9fa48("156") ? this.state.started : (stryCov_9fa48("156", "157", "158"), !this.state.started)) {
        if (stryMutAct_9fa48("159")) {
          {}
        } else {
          stryCov_9fa48("159");
          throw new Error(stryMutAct_9fa48("160") ? "" : (stryCov_9fa48("160"), 'Demo not started. Call start() first.'));
        }
      }

      // Process any pending sound timestamps
      if (stryMutAct_9fa48("162") ? false : stryMutAct_9fa48("161") ? true : (stryCov_9fa48("161", "162"), this.config.sounds)) {
        if (stryMutAct_9fa48("163")) {
          {}
        } else {
          stryCov_9fa48("163");
          await this.processSoundTimestamps();
        }
      }

      // Close the page to finalize video recording
      if (stryMutAct_9fa48("165") ? false : stryMutAct_9fa48("164") ? true : (stryCov_9fa48("164", "165"), this.state.page)) {
        if (stryMutAct_9fa48("166")) {
          {}
        } else {
          stryCov_9fa48("166");
          await this.state.page.close();
          // Get the video path
          const video = this.state.page.video();
          if (stryMutAct_9fa48("168") ? false : stryMutAct_9fa48("167") ? true : (stryCov_9fa48("167", "168"), video)) {
            if (stryMutAct_9fa48("169")) {
              {}
            } else {
              stryCov_9fa48("169");
              this.state.videoPath = await video.path();
            }
          }
        }
      }

      // Close browser
      if (stryMutAct_9fa48("171") ? false : stryMutAct_9fa48("170") ? true : (stryCov_9fa48("170", "171"), this.state.context)) {
        if (stryMutAct_9fa48("172")) {
          {}
        } else {
          stryCov_9fa48("172");
          await this.state.context.close();
        }
      }
      if (stryMutAct_9fa48("174") ? false : stryMutAct_9fa48("173") ? true : (stryCov_9fa48("173", "174"), this.state.browser)) {
        if (stryMutAct_9fa48("175")) {
          {}
        } else {
          stryCov_9fa48("175");
          await this.state.browser.close();
        }
      }

      // Detect sync marker in video and trim it
      let processedVideoPath = this.state.videoPath;
      let syncFrameOffsetMs = 0;
      let trimDurationMs = 0;
      if (stryMutAct_9fa48("178") ? this.state.videoPath === null : stryMutAct_9fa48("177") ? false : stryMutAct_9fa48("176") ? true : (stryCov_9fa48("176", "177", "178"), this.state.videoPath !== null)) {
        if (stryMutAct_9fa48("179")) {
          {}
        } else {
          stryCov_9fa48("179");
          // eslint-disable-next-line no-console
          console.log(stryMutAct_9fa48("180") ? `` : (stryCov_9fa48("180"), `\n[SYNC] Detecting sync marker in video...`));
          const {
            firstSyncFrame,
            lastSyncFrame,
            frameDurationMs
          } = await detectSyncFrameRange(this.state.videoPath);
          if (stryMutAct_9fa48("184") ? firstSyncFrame < 0 : stryMutAct_9fa48("183") ? firstSyncFrame > 0 : stryMutAct_9fa48("182") ? false : stryMutAct_9fa48("181") ? true : (stryCov_9fa48("181", "182", "183", "184"), firstSyncFrame >= 0)) {
            if (stryMutAct_9fa48("185")) {
              {}
            } else {
              stryCov_9fa48("185");
              // Calculate where the sync marker appears in the video
              syncFrameOffsetMs = stryMutAct_9fa48("186") ? firstSyncFrame / frameDurationMs : (stryCov_9fa48("186"), firstSyncFrame * frameDurationMs);
              const syncDurationFrames = stryMutAct_9fa48("187") ? lastSyncFrame - firstSyncFrame - 1 : (stryCov_9fa48("187"), (stryMutAct_9fa48("188") ? lastSyncFrame + firstSyncFrame : (stryCov_9fa48("188"), lastSyncFrame - firstSyncFrame)) + 1);
              // eslint-disable-next-line no-console
              console.log(stryMutAct_9fa48("189") ? `` : (stryCov_9fa48("189"), `[SYNC] Sync marker found: frames ${firstSyncFrame}-${lastSyncFrame} (${syncDurationFrames} frames)`));
              // eslint-disable-next-line no-console
              console.log(stryMutAct_9fa48("190") ? `` : (stryCov_9fa48("190"), `[SYNC] Sync frame offset: ${syncFrameOffsetMs.toFixed(2)}ms`));

              // Trim sync frames from video
              // Trim up to and including the last sync frame
              const framesToTrim = stryMutAct_9fa48("191") ? lastSyncFrame - 1 : (stryCov_9fa48("191"), lastSyncFrame + 1);
              trimDurationMs = stryMutAct_9fa48("192") ? framesToTrim / frameDurationMs : (stryCov_9fa48("192"), framesToTrim * frameDurationMs);
              const trimmedVideoPath = join(this.tempDir, stryMutAct_9fa48("193") ? "" : (stryCov_9fa48("193"), 'trimmed-video.mp4'));
              await trimSyncFrames(this.state.videoPath, trimmedVideoPath, framesToTrim, frameDurationMs);
              processedVideoPath = trimmedVideoPath;
              // eslint-disable-next-line no-console
              console.log(stryMutAct_9fa48("194") ? `` : (stryCov_9fa48("194"), `[SYNC] Trimmed ${framesToTrim} frames (${trimDurationMs.toFixed(2)}ms) from video`));
            }
          } else {
            if (stryMutAct_9fa48("195")) {
              {}
            } else {
              stryCov_9fa48("195");
              // eslint-disable-next-line no-console
              console.log(stryMutAct_9fa48("196") ? `` : (stryCov_9fa48("196"), `[SYNC] No sync marker detected in video - using original`));
            }
          }
        }
      }

      // If we have audio segments, concatenate them with sync-based offset
      let audioPath: string | null = null;
      if (stryMutAct_9fa48("200") ? this.state.audioSegments.length <= 0 : stryMutAct_9fa48("199") ? this.state.audioSegments.length >= 0 : stryMutAct_9fa48("198") ? false : stryMutAct_9fa48("197") ? true : (stryCov_9fa48("197", "198", "199", "200"), this.state.audioSegments.length > 0)) {
        if (stryMutAct_9fa48("201")) {
          {}
        } else {
          stryCov_9fa48("201");
          // Calculate the audio offset based on video trimming
          // Audio timestamps are relative to syncTime (when sync marker first appeared in video)
          // Video has been trimmed to remove sync frames
          //
          // The key insight:
          // - syncTime was captured when marker was visible (~syncFrameOffsetMs into video)
          // - Video is trimmed by trimDurationMs (removes frames 0 to lastSyncFrame)
          // - After trimming, video t=0 = original video t=trimDurationMs
          //
          // For audio to sync correctly:
          // - Audio at time T (relative to syncTime) should play at:
          //   T - (trimDurationMs - syncFrameOffsetMs)
          //
          // Because syncTime is at syncFrameOffsetMs in original video,
          // and after trimming, we've removed trimDurationMs worth of video.
          // The difference (trimDurationMs - syncFrameOffsetMs) is how much
          // of the video after syncTime was trimmed.
          //
          // Example:
          // - syncFrameOffsetMs = 160ms (marker first appeared at frame 4)
          // - trimDurationMs = 480ms (trimmed frames 0-11)
          // - Audio at 1000ms should play at 1000 - (480 - 160) = 680ms in trimmed video

          const audioOffset = stryMutAct_9fa48("202") ? trimDurationMs + syncFrameOffsetMs : (stryCov_9fa48("202"), trimDurationMs - syncFrameOffsetMs);

          // eslint-disable-next-line no-console
          console.log(stryMutAct_9fa48("203") ? `` : (stryCov_9fa48("203"), `\n[TIMING] Final audio segments (${this.state.audioSegments.length} total):`));
          // eslint-disable-next-line no-console
          console.log(stryMutAct_9fa48("204") ? `` : (stryCov_9fa48("204"), `[TIMING] syncFrameOffsetMs: ${syncFrameOffsetMs.toFixed(2)}ms (when marker first appeared)`));
          // eslint-disable-next-line no-console
          console.log(stryMutAct_9fa48("205") ? `` : (stryCov_9fa48("205"), `[TIMING] trimDurationMs: ${trimDurationMs.toFixed(2)}ms (total video trimmed)`));
          // eslint-disable-next-line no-console
          console.log(stryMutAct_9fa48("206") ? `` : (stryCov_9fa48("206"), `[TIMING] audioOffset: ${audioOffset.toFixed(2)}ms (trim - sync offset)`));
          for (const seg of this.state.audioSegments) {
            if (stryMutAct_9fa48("207")) {
              {}
            } else {
              stryCov_9fa48("207");
              // eslint-disable-next-line no-console
              console.log(stryMutAct_9fa48("208") ? `` : (stryCov_9fa48("208"), `  ${seg.type} at ${seg.startTimeMs}ms -> ${stryMutAct_9fa48("209") ? seg.startTimeMs + audioOffset : (stryCov_9fa48("209"), seg.startTimeMs - audioOffset)}ms (duration: ${seg.durationMs}ms)`));
            }
          }
          audioPath = join(this.tempDir, stryMutAct_9fa48("210") ? "" : (stryCov_9fa48("210"), 'combined-audio.wav'));
          await concatAudioWithGaps(this.state.audioSegments, audioPath, audioOffset);
        }
      }

      // Create output directory
      await mkdir(dirname(this.config.output), stryMutAct_9fa48("211") ? {} : (stryCov_9fa48("211"), {
        recursive: stryMutAct_9fa48("212") ? false : (stryCov_9fa48("212"), true)
      }));

      // Merge audio and video if we have both
      if (stryMutAct_9fa48("215") ? processedVideoPath !== null || audioPath !== null : stryMutAct_9fa48("214") ? false : stryMutAct_9fa48("213") ? true : (stryCov_9fa48("213", "214", "215"), (stryMutAct_9fa48("217") ? processedVideoPath === null : stryMutAct_9fa48("216") ? true : (stryCov_9fa48("216", "217"), processedVideoPath !== null)) && (stryMutAct_9fa48("219") ? audioPath === null : stryMutAct_9fa48("218") ? true : (stryCov_9fa48("218", "219"), audioPath !== null)))) {
        if (stryMutAct_9fa48("220")) {
          {}
        } else {
          stryCov_9fa48("220");
          await mergeAudioVideo(processedVideoPath, audioPath, this.config.output);
        }
      } else if (stryMutAct_9fa48("223") ? processedVideoPath === null : stryMutAct_9fa48("222") ? false : stryMutAct_9fa48("221") ? true : (stryCov_9fa48("221", "222", "223"), processedVideoPath !== null)) {
        if (stryMutAct_9fa48("224")) {
          {}
        } else {
          stryCov_9fa48("224");
          // Just copy video if no audio
          const {
            exec
          } = await import(stryMutAct_9fa48("225") ? "" : (stryCov_9fa48("225"), 'child_process'));
          const {
            promisify
          } = await import(stryMutAct_9fa48("226") ? "" : (stryCov_9fa48("226"), 'util'));
          const execAsync = promisify(exec);
          await execAsync(stryMutAct_9fa48("227") ? `` : (stryCov_9fa48("227"), `cp "${processedVideoPath}" "${this.config.output}"`));
        }
      }
      return this.config.output;
    }
  }

  /**
   * Get elapsed time since demo started in milliseconds
   */
  getElapsedTime(): number {
    if (stryMutAct_9fa48("228")) {
      {}
    } else {
      stryCov_9fa48("228");
      if (stryMutAct_9fa48("231") ? false : stryMutAct_9fa48("230") ? true : stryMutAct_9fa48("229") ? this.state.started : (stryCov_9fa48("229", "230", "231"), !this.state.started)) {
        if (stryMutAct_9fa48("232")) {
          {}
        } else {
          stryCov_9fa48("232");
          return 0;
        }
      }
      return stryMutAct_9fa48("233") ? Date.now() + this.state.startTime : (stryCov_9fa48("233"), Date.now() - this.state.startTime);
    }
  }
}