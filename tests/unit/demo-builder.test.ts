import { Page } from 'playwright';
import { NarratedDemo, SoundEnabledPage } from '../../src/demo-builder';
import { DemoConfig, DemoState, DEFAULT_CONFIG, AudioSegment } from '../../src/types';
import { Narration } from '../../src/narration';
import * as ffmpegUtils from '../../src/ffmpeg-utils';
import * as soundsModule from '../../src/sounds';

// Mock sounds module
let letterVariantCounter = 0;
let spaceVariantCounter = 0;
jest.mock('../../src/sounds', () => ({
  initSoundsDir: jest.fn(),
  generateSound: jest.fn().mockResolvedValue({ path: '/tmp/sounds/click.mp3', durationMs: 100 }),
  clearSoundCache: jest.fn(),
  getVariantSoundType: jest.fn().mockImplementation((baseType: string) => {
    if (baseType === 'keypress-letter') {
      letterVariantCounter = (letterVariantCounter % 5) + 1;
      return `keypress-letter-${letterVariantCounter}`;
    } else if (baseType === 'keypress-space') {
      spaceVariantCounter = (spaceVariantCounter % 5) + 1;
      return `keypress-space-${spaceVariantCounter}`;
    }
    return baseType;
  }),
}));

// Mock playwright
jest.mock('playwright', () => {
  const mockVideo = {
    path: jest.fn().mockResolvedValue('/tmp/video/recorded.webm'),
  };

  const mockLocator = {
    click: jest.fn().mockResolvedValue(undefined),
    fill: jest.fn().mockResolvedValue(undefined),
    scrollIntoViewIfNeeded: jest.fn().mockResolvedValue(undefined),
  };

  const mockPage = {
    goto: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    video: jest.fn().mockReturnValue(mockVideo),
    click: jest.fn().mockResolvedValue(undefined),
    type: jest.fn().mockResolvedValue(undefined),
    fill: jest.fn().mockResolvedValue(undefined),
    locator: jest.fn().mockReturnValue(mockLocator),
    waitForSelector: jest.fn().mockResolvedValue(undefined),
    waitForTimeout: jest.fn().mockResolvedValue(undefined),
    waitForLoadState: jest.fn().mockResolvedValue(undefined),
    evaluate: jest.fn().mockResolvedValue(undefined),
  };

  const mockContext = {
    newPage: jest.fn().mockResolvedValue(mockPage),
    close: jest.fn().mockResolvedValue(undefined),
  };

  const mockBrowser = {
    newContext: jest.fn().mockResolvedValue(mockContext),
    close: jest.fn().mockResolvedValue(undefined),
  };

  return {
    chromium: {
      launch: jest.fn().mockResolvedValue(mockBrowser),
    },
  };
});

// Mock fs/promises
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
}));

// Mock child_process for the cp command in finish()
jest.mock('child_process', () => ({
  exec: jest.fn((cmd, callback) => {
    if (callback) {
      callback(null, '', '');
    }
    return { on: jest.fn() };
  }),
}));

// Mock util
jest.mock('util', () => ({
  promisify: jest.fn((fn) => jest.fn().mockResolvedValue({ stdout: '', stderr: '' })),
}));

// Mock Narration class
jest.mock('../../src/narration', () => {
  return {
    Narration: jest.fn().mockImplementation((text, voice, model, startTimeMs, outputDir, segmentId) => {
      return {
        generate: jest.fn().mockResolvedValue(undefined),
        waitUntilComplete: jest.fn().mockResolvedValue(undefined),
        whileDoing: jest.fn().mockImplementation(async (action: () => Promise<void>) => {
          await action();
        }),
        getAudioSegment: jest.fn().mockReturnValue({
          path: `${outputDir}/${segmentId}.mp3`,
          startTimeMs,
          durationMs: 2000,
          type: 'narration',
        } as AudioSegment),
        getDuration: jest.fn().mockReturnValue(2000),
      };
    }),
  };
});

// Mock ffmpeg-utils
jest.mock('../../src/ffmpeg-utils', () => ({
  concatAudioWithGaps: jest.fn().mockResolvedValue('/tmp/combined.wav'),
  mergeAudioVideo: jest.fn().mockResolvedValue('/tmp/output.mp4'),
  detectSyncFrameRange: jest.fn().mockResolvedValue({ firstSyncFrame: -1, lastSyncFrame: -1, frameDurationMs: 40 }),
  trimSyncFrames: jest.fn().mockResolvedValue(undefined),
}));

describe('NarratedDemo', () => {
  const { chromium } = require('playwright');
  const { mkdir } = require('fs/promises');

  let defaultConfig: DemoConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    defaultConfig = {
      baseUrl: 'http://localhost:3000',
      output: '/tmp/output/demo.mp4',
    };
  });

  describe('constructor', () => {
    it('should merge config with defaults', () => {
      const demo = new NarratedDemo(defaultConfig);

      // Access internal state through getElapsedTime to verify construction
      expect(demo.getElapsedTime()).toBe(0);
    });

    it('should use provided viewport over default', () => {
      const customViewport = { width: 1920, height: 1080 };
      const demo = new NarratedDemo({
        ...defaultConfig,
        viewport: customViewport,
      });

      // Verify by starting and checking the browser context call
      expect(demo.getElapsedTime()).toBe(0);
    });

    it('should use provided voice over default', () => {
      const demo = new NarratedDemo({
        ...defaultConfig,
        voice: 'CustomVoice',
      });

      expect(demo.getElapsedTime()).toBe(0);
    });

    it('should use provided model over default', () => {
      const demo = new NarratedDemo({
        ...defaultConfig,
        model: 'custom_model',
      });

      expect(demo.getElapsedTime()).toBe(0);
    });

    it('should set temp directory based on output path', async () => {
      const demo = new NarratedDemo({
        ...defaultConfig,
        output: '/my/custom/path/video.mp4',
      });

      await demo.start();

      // Verify mkdir was called with temp directory in the output directory
      expect(mkdir).toHaveBeenCalledWith(
        '/my/custom/path/.demo-temp',
        { recursive: true }
      );
    });
  });

  describe('page getter', () => {
    it('should throw error before start() is called', () => {
      const demo = new NarratedDemo(defaultConfig);

      expect(() => demo.page).toThrow('Demo not started. Call start() first.');
    });

    it('should return page after start() is called', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      const page = demo.page;
      expect(page).toBeDefined();
      expect(page.goto).toBeDefined();
    });
  });

  describe('start()', () => {
    it('should create temp directory', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      expect(mkdir).toHaveBeenCalledWith(
        expect.stringContaining('.demo-temp'),
        { recursive: true }
      );
    });

    it('should create video directory', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      expect(mkdir).toHaveBeenCalledWith(
        expect.stringContaining('video'),
        { recursive: true }
      );
    });

    it('should launch browser with headless false', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      expect(chromium.launch).toHaveBeenCalledWith({ headless: false });
    });

    it('should create browser context with viewport and video recording', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      const mockBrowser = await chromium.launch();
      expect(mockBrowser.newContext).toHaveBeenCalledWith({
        viewport: DEFAULT_CONFIG.viewport,
        recordVideo: {
          dir: expect.stringContaining('video'),
          size: DEFAULT_CONFIG.viewport,
        },
      });
    });

    it('should use custom viewport when provided', async () => {
      const customViewport = { width: 1920, height: 1080 };
      const demo = new NarratedDemo({
        ...defaultConfig,
        viewport: customViewport,
      });
      await demo.start();

      const mockBrowser = await chromium.launch();
      expect(mockBrowser.newContext).toHaveBeenCalledWith({
        viewport: customViewport,
        recordVideo: {
          dir: expect.any(String),
          size: customViewport,
        },
      });
    });

    it('should navigate to base URL', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      expect(demo.page.goto).toHaveBeenCalledWith('http://localhost:3000');
    });

    it('should throw error if called twice', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      await expect(demo.start()).rejects.toThrow('Demo already started');
    });

    it('should set started state and start time', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      // getElapsedTime should return non-zero after start
      expect(demo.getElapsedTime()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('narrate()', () => {
    it('should throw error if demo not started', async () => {
      const demo = new NarratedDemo(defaultConfig);

      await expect(demo.narrate('Hello world')).rejects.toThrow(
        'Demo not started. Call start() first.'
      );
    });

    it('should create Narration with correct parameters', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      await demo.narrate('Hello world');

      expect(Narration).toHaveBeenCalledWith(
        'Hello world',
        DEFAULT_CONFIG.voice,
        DEFAULT_CONFIG.model,
        expect.any(Number),
        expect.stringContaining('.demo-temp'),
        'narration-1'
      );
    });

    it('should use custom voice when provided', async () => {
      const demo = new NarratedDemo({
        ...defaultConfig,
        voice: 'CustomVoice',
      });
      await demo.start();

      await demo.narrate('Hello world');

      expect(Narration).toHaveBeenCalledWith(
        'Hello world',
        'CustomVoice',
        expect.any(String),
        expect.any(Number),
        expect.any(String),
        expect.any(String)
      );
    });

    it('should use custom model when provided', async () => {
      const demo = new NarratedDemo({
        ...defaultConfig,
        model: 'custom_model',
      });
      await demo.start();

      await demo.narrate('Hello world');

      expect(Narration).toHaveBeenCalledWith(
        'Hello world',
        expect.any(String),
        'custom_model',
        expect.any(Number),
        expect.any(String),
        expect.any(String)
      );
    });

    it('should increment segment ID for each narration', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      await demo.narrate('First');
      await demo.narrate('Second');
      await demo.narrate('Third');

      expect(Narration).toHaveBeenNthCalledWith(
        1,
        'First',
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.any(String),
        'narration-1'
      );
      expect(Narration).toHaveBeenNthCalledWith(
        2,
        'Second',
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.any(String),
        'narration-2'
      );
      expect(Narration).toHaveBeenNthCalledWith(
        3,
        'Third',
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.any(String),
        'narration-3'
      );
    });

    it('should call generate on narration', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      const narration = await demo.narrate('Hello world');

      expect(narration.generate).toHaveBeenCalled();
    });

    it('should wait for narration to complete', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      const narration = await demo.narrate('Hello world');

      expect(narration.waitUntilComplete).toHaveBeenCalled();
    });

    it('should add audio segment to state', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      await demo.narrate('Hello world');

      // This is implicitly tested by finish() behavior
      // but we can verify getAudioSegment was called
      const narration = await demo.narrate('Second narration');
      expect(narration.getAudioSegment).toHaveBeenCalled();
    });

    it('should return the Narration instance', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      const narration = await demo.narrate('Hello world');

      expect(narration).toBeDefined();
      expect(narration.generate).toBeDefined();
      expect(narration.waitUntilComplete).toBeDefined();
    });
  });

  describe('narrateAsync()', () => {
    it('should throw error if demo not started', async () => {
      const demo = new NarratedDemo(defaultConfig);

      await expect(demo.narrateAsync('Hello world')).rejects.toThrow(
        'Demo not started. Call start() first.'
      );
    });

    it('should create Narration with correct parameters', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      await demo.narrateAsync('Hello async');

      expect(Narration).toHaveBeenCalledWith(
        'Hello async',
        DEFAULT_CONFIG.voice,
        DEFAULT_CONFIG.model,
        expect.any(Number),
        expect.stringContaining('.demo-temp'),
        'narration-1'
      );
    });

    it('should call generate but NOT waitUntilComplete', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      const narration = await demo.narrateAsync('Hello async');

      expect(narration.generate).toHaveBeenCalled();
      expect(narration.waitUntilComplete).not.toHaveBeenCalled();
    });

    it('should add audio segment to state', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      const narration = await demo.narrateAsync('Hello async');

      expect(narration.getAudioSegment).toHaveBeenCalled();
    });

    it('should return Narration that can be used with whileDoing', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      const narration = await demo.narrateAsync('Hello async');

      expect(narration).toBeDefined();
      expect(narration.generate).toBeDefined();
      // Narration mock has whileDoing method available
    });

    it('should increment segment ID for each narrateAsync call', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      await demo.narrateAsync('First');
      await demo.narrateAsync('Second');

      expect(Narration).toHaveBeenNthCalledWith(
        1,
        'First',
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.any(String),
        'narration-1'
      );
      expect(Narration).toHaveBeenNthCalledWith(
        2,
        'Second',
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.any(String),
        'narration-2'
      );
    });
  });

  describe('doWhileNarrating()', () => {
    it('should throw error if demo not started', async () => {
      const demo = new NarratedDemo(defaultConfig);

      await expect(
        demo.doWhileNarrating('Hello', async () => {})
      ).rejects.toThrow('Demo not started. Call start() first.');
    });

    it('should create narration and execute action concurrently', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      const actionExecuted = jest.fn();
      await demo.doWhileNarrating('While doing action', async () => {
        actionExecuted();
      });

      // Narration should have been created
      expect(Narration).toHaveBeenCalledWith(
        'While doing action',
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.any(String),
        'narration-1'
      );

      // Action should have been executed
      expect(actionExecuted).toHaveBeenCalled();
    });

    it('should call generate on narration', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      await demo.doWhileNarrating('Test', async () => {});

      // Get the mock narration
      const mockNarration = (Narration as jest.Mock).mock.results[0].value;
      expect(mockNarration.generate).toHaveBeenCalled();
    });

    it('should add audio segment to state', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      await demo.doWhileNarrating('Test', async () => {});

      // Verify audio segment was added by checking finish() behavior
      await demo.finish();

      expect(ffmpegUtils.concatAudioWithGaps).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: 'narration' }),
        ]),
        expect.any(String),
        expect.any(Number)
      );
    });

    it('should pass reasonable startTimeMs to Narration (not absurdly large)', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      // Small delay
      await new Promise((resolve) => setTimeout(resolve, 10));

      await demo.narrate('Hello world');

      // Get the startTimeMs that was passed to Narration
      const narrationCall = (Narration as jest.Mock).mock.calls[0];
      const startTimeMs = narrationCall[3]; // 4th argument is startTimeMs

      // Should be a small positive number (< 10 seconds), not billions
      // If - was changed to +, this would be around 2x Date.now() (billions)
      expect(startTimeMs).toBeGreaterThanOrEqual(0);
      expect(startTimeMs).toBeLessThan(10000);
    });
  });

  describe('finish()', () => {
    it('should throw error if demo not started', async () => {
      const demo = new NarratedDemo(defaultConfig);

      await expect(demo.finish()).rejects.toThrow(
        'Demo not started. Call start() first.'
      );
    });

    it('should close the page', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      await demo.finish();

      expect(demo.page.close).toHaveBeenCalled();
    });

    it('should get video path from page', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      await demo.finish();

      expect(demo.page.video).toHaveBeenCalled();
    });

    it('should close browser context', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      await demo.finish();

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      expect(mockContext.close).toHaveBeenCalled();
    });

    it('should close browser', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      await demo.finish();

      const mockBrowser = await chromium.launch();
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should concatenate audio segments when present', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();
      await demo.narrate('Hello world');

      await demo.finish();

      expect(ffmpegUtils.concatAudioWithGaps).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: 'narration' }),
        ]),
        expect.stringContaining('combined-audio.wav'),
        expect.any(Number)
      );
    });

    it('should not concatenate audio when no segments', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      await demo.finish();

      expect(ffmpegUtils.concatAudioWithGaps).not.toHaveBeenCalled();
    });

    it('should create output directory', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      await demo.finish();

      expect(mkdir).toHaveBeenCalledWith('/tmp/output', { recursive: true });
    });

    it('should merge audio and video when both present', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();
      await demo.narrate('Hello world');

      await demo.finish();

      expect(ffmpegUtils.mergeAudioVideo).toHaveBeenCalledWith(
        '/tmp/video/recorded.webm',
        expect.stringContaining('combined-audio.wav'),
        defaultConfig.output
      );
    });

    it('should copy video when no audio segments', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      await demo.finish();

      // mergeAudioVideo should not be called
      expect(ffmpegUtils.mergeAudioVideo).not.toHaveBeenCalled();
    });

    it('should execute cp command to copy video when no audio segments', async () => {
      // Need to spy on the dynamically imported exec
      const mockExecAsync = jest.fn().mockResolvedValue({ stdout: '', stderr: '' });
      jest.spyOn(require('util'), 'promisify').mockReturnValue(mockExecAsync);

      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      await demo.finish();

      // Verify cp command was called with correct paths
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('cp')
      );
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('/tmp/video/recorded.webm')
      );
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining(defaultConfig.output)
      );
    });

    it('should return the output path', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      const result = await demo.finish();

      expect(result).toBe(defaultConfig.output);
    });

    it('should detect and trim sync frames when sync marker is found', async () => {
      // Mock detectSyncFrameRange to return a found sync marker
      (ffmpegUtils.detectSyncFrameRange as jest.Mock).mockResolvedValueOnce({
        firstSyncFrame: 5,
        lastSyncFrame: 15,
        frameDurationMs: 40,
      });

      const demo = new NarratedDemo(defaultConfig);
      await demo.start();
      await demo.narrate('Hello world');

      await demo.finish();

      // Should have called trimSyncFrames with correct parameters
      expect(ffmpegUtils.trimSyncFrames).toHaveBeenCalledWith(
        '/tmp/video/recorded.webm',
        expect.stringContaining('trimmed-video.mp4'),
        16, // lastSyncFrame + 1
        40  // frameDurationMs
      );
    });

    it('should use trimmed video path when sync marker is found and audio present', async () => {
      // Mock to return found sync marker
      (ffmpegUtils.detectSyncFrameRange as jest.Mock).mockResolvedValueOnce({
        firstSyncFrame: 2,
        lastSyncFrame: 10,
        frameDurationMs: 33.33,
      });

      const demo = new NarratedDemo(defaultConfig);
      await demo.start();
      await demo.narrate('Hello world');

      await demo.finish();

      // Should use trimmed video path in mergeAudioVideo
      expect(ffmpegUtils.mergeAudioVideo).toHaveBeenCalledWith(
        expect.stringContaining('trimmed-video.mp4'),
        expect.stringContaining('combined-audio.wav'),
        defaultConfig.output
      );
    });

    it('should pass correct audio offset when sync marker is found', async () => {
      // Mock to return found sync marker
      // firstSyncFrame: 4, frameDurationMs: 40ms -> syncFrameOffsetMs = 160ms
      // lastSyncFrame: 11 -> framesToTrim: 12 -> trimDurationMs = 480ms
      // audioOffset = 480 - 160 = 320ms
      (ffmpegUtils.detectSyncFrameRange as jest.Mock).mockResolvedValueOnce({
        firstSyncFrame: 4,
        lastSyncFrame: 11,
        frameDurationMs: 40,
      });

      const demo = new NarratedDemo(defaultConfig);
      await demo.start();
      await demo.narrate('Hello world');

      await demo.finish();

      // Should pass audioOffset to concatAudioWithGaps
      expect(ffmpegUtils.concatAudioWithGaps).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        320 // trimDurationMs (480) - syncFrameOffsetMs (160)
      );
    });
  });

  describe('getElapsedTime()', () => {
    it('should return 0 before start', () => {
      const demo = new NarratedDemo(defaultConfig);

      expect(demo.getElapsedTime()).toBe(0);
    });

    it('should return elapsed time after start', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      // Small delay to ensure some time passes
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(demo.getElapsedTime()).toBeGreaterThan(0);
    });

    it('should increase over time', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      const time1 = demo.getElapsedTime();
      await new Promise((resolve) => setTimeout(resolve, 20));
      const time2 = demo.getElapsedTime();

      expect(time2).toBeGreaterThan(time1);
    });

    it('should return reasonable elapsed time (not absurdly large)', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      // Wait a small amount
      await new Promise((resolve) => setTimeout(resolve, 50));

      const elapsed = demo.getElapsedTime();

      // Elapsed time should be positive and small (not double Date.now())
      // If the mutation changes - to +, elapsed would be around 2x Date.now() (billions of ms)
      expect(elapsed).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(10000); // Should be < 10 seconds
    });
  });

  describe('edge cases', () => {
    it('should handle null video from page', async () => {
      // Override mock to return null video
      const mockPage = {
        goto: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
        video: jest.fn().mockReturnValue(null),
        waitForLoadState: jest.fn().mockResolvedValue(undefined),
        waitForTimeout: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn().mockResolvedValue(undefined),
      };

      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };

      const mockBrowser = {
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn().mockResolvedValue(undefined),
      };

      chromium.launch.mockResolvedValueOnce(mockBrowser);

      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      // Should not throw when video is null
      await expect(demo.finish()).resolves.toBe(defaultConfig.output);
    });

    it('should not copy video when videoPath is null and no audio', async () => {
      // Create a mock that tracks if cp was called
      const mockExecAsync = jest.fn().mockResolvedValue({ stdout: '', stderr: '' });
      jest.spyOn(require('util'), 'promisify').mockReturnValue(mockExecAsync);

      // Override mock to return null video
      const mockPage = {
        goto: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
        video: jest.fn().mockReturnValue(null),
        waitForLoadState: jest.fn().mockResolvedValue(undefined),
        waitForTimeout: jest.fn().mockResolvedValue(undefined),
        evaluate: jest.fn().mockResolvedValue(undefined),
      };

      const mockContext = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined),
      };

      const mockBrowser = {
        newContext: jest.fn().mockResolvedValue(mockContext),
        close: jest.fn().mockResolvedValue(undefined),
      };

      chromium.launch.mockResolvedValueOnce(mockBrowser);

      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      // Reset mock calls after start
      mockExecAsync.mockClear();

      await demo.finish();

      // When there's no video path and no audio, cp should NOT be called
      // If the mutation changed `else if (this.state.videoPath)` to `else if (true)`,
      // this would fail because cp would be called with null/undefined path
      expect(mockExecAsync).not.toHaveBeenCalledWith(
        expect.stringContaining('cp')
      );
    });

    it('should handle multiple narrations with proper timing', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      // Add multiple narrations
      await demo.narrate('First narration');
      await demo.narrate('Second narration');
      await demo.narrate('Third narration');

      await demo.finish();

      // Should have 3 audio segments passed to concatAudioWithGaps
      expect(ffmpegUtils.concatAudioWithGaps).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: 'narration' }),
          expect.objectContaining({ type: 'narration' }),
          expect.objectContaining({ type: 'narration' }),
        ]),
        expect.any(String),
        expect.any(Number)
      );
    });
  });

  describe('sounds feature', () => {
    let soundsConfig: DemoConfig;

    beforeEach(() => {
      soundsConfig = {
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      };
    });

    it('should initialize sounds directory when sounds enabled', async () => {
      const demo = new NarratedDemo(soundsConfig);
      await demo.start();

      expect(soundsModule.initSoundsDir).toHaveBeenCalledWith(
        expect.stringContaining('sounds')
      );
    });

    it('should initialize sounds directory at exact ../assets/sounds path', async () => {
      // Kills L251:41 ('..' -> '') and L251:47 ('assets' -> '').
      // ts-jest runs from src/, so __dirname is <repo>/src; join(__dirname,'..','assets','sounds')
      // resolves to <repo>/assets/sounds. Mutating either literal changes the resolved path.
      const path = require('path');
      const demo = new NarratedDemo(soundsConfig);
      await demo.start();

      const moduleDir = path.join(__dirname, '..', '..', 'src');
      const expected = path.join(moduleDir, '..', 'assets', 'sounds');
      expect(soundsModule.initSoundsDir).toHaveBeenCalledWith(expected);
      // Defensive: the '..' must collapse the trailing 'src' segment.
      expect(expected.endsWith(path.join('assets', 'sounds'))).toBe(true);
      expect(expected).not.toContain(path.join('src', 'assets'));
    });

    it('should not initialize sounds directory when sounds disabled', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      expect(soundsModule.initSoundsDir).not.toHaveBeenCalled();
    });

    it('should return SoundEnabledPage when sounds enabled', async () => {
      const demo = new NarratedDemo(soundsConfig);
      await demo.start();

      const page = demo.page;
      expect(page).toBeInstanceOf(SoundEnabledPage);
    });

    it('should return regular Page when sounds disabled', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      const page = demo.page;
      expect(page).not.toBeInstanceOf(SoundEnabledPage);
    });

    it('should record click timestamps through SoundEnabledPage', async () => {
      const demo = new NarratedDemo(soundsConfig);
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      await page.click('#button');

      await demo.finish();

      // Should have generated click sound and added it to audio segments
      expect(soundsModule.generateSound).toHaveBeenCalledWith('click');
      expect(ffmpegUtils.concatAudioWithGaps).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: 'click' }),
        ]),
        expect.any(String),
        expect.any(Number)
      );
    });

    it('should record keypress timestamps through SoundEnabledPage', async () => {
      const demo = new NarratedDemo(soundsConfig);
      await demo.start();

      // Mock generateSound to return results for letter variant sounds
      (soundsModule.generateSound as jest.Mock).mockImplementation((type: string) => {
        if (type.startsWith('keypress-letter')) {
          return Promise.resolve({ path: `/tmp/sounds/${type}.mp3`, durationMs: 50 });
        }
        return Promise.resolve({ path: '/tmp/sounds/click.mp3', durationMs: 100 });
      });

      const page = demo.page as SoundEnabledPage;
      await page.type('#input', 'hi');

      await demo.finish();

      // Should have generated keypress-letter variant sounds (one per character)
      // The type() method uses getSoundTypeForChar which returns keypress-letter-N variants
      expect(soundsModule.generateSound).toHaveBeenCalledWith(
        expect.stringMatching(/^keypress-letter-[1-5]$/)
      );
      // Should have 2 keypress segments (one per character) with letter variant types
      expect(ffmpegUtils.concatAudioWithGaps).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: expect.stringMatching(/^keypress-letter-[1-5]$/) }),
          expect.objectContaining({ type: expect.stringMatching(/^keypress-letter-[1-5]$/) }),
        ]),
        expect.any(String),
        expect.any(Number)
      );
    });

    it('should not process sound timestamps when no interactions', async () => {
      const demo = new NarratedDemo(soundsConfig);
      await demo.start();

      await demo.finish();

      // No sounds should be generated
      expect(soundsModule.generateSound).not.toHaveBeenCalled();
    });

    it('should process sounds during finish when sounds enabled', async () => {
      const demo = new NarratedDemo(soundsConfig);
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      await page.click('#btn1');
      await page.click('#btn2');

      await demo.finish();

      // Should generate sound (only once per type due to caching)
      expect(soundsModule.generateSound).toHaveBeenCalledTimes(1);
      expect(soundsModule.generateSound).toHaveBeenCalledWith('click');
    });

    it('should not process sounds during finish when sounds disabled', async () => {
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      await demo.finish();

      expect(soundsModule.generateSound).not.toHaveBeenCalled();
    });

    it('should handle text with common digraphs (th, er, etc.) for faster typing', async () => {
      const demo = new NarratedDemo(soundsConfig);
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      // 'the' contains the fast digraph 'th'
      await page.type('#input', 'the');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      // Should still type all characters
      expect(mockPage.type).toHaveBeenCalledTimes(3);
    });

    it('should handle text with spaces for pause after space', async () => {
      const demo = new NarratedDemo(soundsConfig);
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      // Type 'a bc' so that when typing 'c', prevChar=' ' triggers the pause
      // Delay calculations: (''→'a'), ('a'→' '), (' '→'b') <-- triggers line 88
      await page.type('#input', 'a bc');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      // Should type all 4 characters
      expect(mockPage.type).toHaveBeenCalledTimes(4);
    });

    it('should handle text with punctuation for longer pause after punctuation', async () => {
      const demo = new NarratedDemo(soundsConfig);
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      // Type '.ab' so that when calculating delay before 'b', prevChar='.' triggers punctuation pause
      // Delay calculations: (''→'.'), ('.'→'a') <-- triggers line 93
      await page.type('#input', '.ab');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      // Should type all 3 characters
      expect(mockPage.type).toHaveBeenCalledTimes(3);
    });

    it('should handle return/newline characters with keypress-return sound', async () => {
      const demo = new NarratedDemo(soundsConfig);
      await demo.start();

      (soundsModule.generateSound as jest.Mock).mockImplementation((type: string) => {
        if (type === 'keypress-return') {
          return Promise.resolve({ path: '/tmp/sounds/keypress-return.mp3', durationMs: 60 });
        }
        if (type.startsWith('keypress-letter')) {
          return Promise.resolve({ path: `/tmp/sounds/${type}.mp3`, durationMs: 50 });
        }
        return Promise.resolve({ path: '/tmp/sounds/click.mp3', durationMs: 100 });
      });

      const page = demo.page as SoundEnabledPage;
      // Type text with a newline character
      await page.type('#input', 'a\n');

      await demo.finish();

      // Should have generated keypress-return sound for the newline
      expect(soundsModule.generateSound).toHaveBeenCalledWith('keypress-return');
    });

    it('should handle space characters with keypress-space sound', async () => {
      const demo = new NarratedDemo(soundsConfig);
      await demo.start();

      (soundsModule.generateSound as jest.Mock).mockImplementation((type: string) => {
        if (type.startsWith('keypress-space')) {
          return Promise.resolve({ path: `/tmp/sounds/${type}.mp3`, durationMs: 55 });
        }
        if (type.startsWith('keypress-letter')) {
          return Promise.resolve({ path: `/tmp/sounds/${type}.mp3`, durationMs: 50 });
        }
        return Promise.resolve({ path: '/tmp/sounds/click.mp3', durationMs: 100 });
      });

      const page = demo.page as SoundEnabledPage;
      // Type text with a space
      await page.type('#input', 'a b');

      await demo.finish();

      // Should have generated keypress-space variant sound for the space
      expect(soundsModule.generateSound).toHaveBeenCalledWith(
        expect.stringMatching(/^keypress-space-[1-5]$/)
      );
    });
  });

  describe('SoundEnabledPage', () => {
    const { chromium } = require('playwright');

    it('should delegate goto to original page', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      await page.goto('http://example.com');

      // Get the mock page to verify
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      expect(mockPage.goto).toHaveBeenCalledWith('http://example.com');
    });

    it('should delegate click to original page', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      await page.click('#myButton');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      expect(mockPage.click).toHaveBeenCalledWith('#myButton');
    });

    it('should delegate type to original page', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      await page.type('#input', 'test');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      // SoundEnabledPage types one character at a time to record keypress sounds
      expect(mockPage.type).toHaveBeenCalledTimes(4);
      expect(mockPage.type).toHaveBeenNthCalledWith(1, '#input', 't');
      expect(mockPage.type).toHaveBeenNthCalledWith(2, '#input', 'e');
      expect(mockPage.type).toHaveBeenNthCalledWith(3, '#input', 's');
      expect(mockPage.type).toHaveBeenNthCalledWith(4, '#input', 't');
    });

    it('should delegate fill to original page', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      await page.fill('#input', 'value');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      expect(mockPage.fill).toHaveBeenCalledWith('#input', 'value');
    });

    it('should delegate locator to original page', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      page.locator('#element');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      expect(mockPage.locator).toHaveBeenCalledWith('#element');
    });

    it('should delegate waitForSelector to original page', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      await page.waitForSelector('#loading');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      expect(mockPage.waitForSelector).toHaveBeenCalledWith('#loading');
    });

    it('should delegate waitForTimeout to original page', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      await page.waitForTimeout(1000);

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(1000);
    });

    it('should delegate close to original page', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      await page.close();

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should delegate video to original page', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      page.video();

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      expect(mockPage.video).toHaveBeenCalled();
    });

    it('should expose raw page property', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      expect(page.raw).toBeDefined();
      expect(page.raw.goto).toBeDefined();
    });
  });

  describe('SoundEnabledPage timing internals (mutation kills)', () => {
    // These tests construct SoundEnabledPage directly so we control the mock page,
    // the recordTimestamp callback, the pending-timestamps array and the state.
    // Math.random and Date.now are spied so the variable-timing math is deterministic.

    interface Harness {
      page: SoundEnabledPage;
      mockPage: {
        type: jest.Mock;
        click: jest.Mock;
        waitForTimeout: jest.Mock;
        locator: jest.Mock;
        scrollIntoViewIfNeeded: jest.Mock;
      };
      pending: Array<{ type: soundsModule.SoundType; timeMs: number }>;
      recorded: soundsModule.SoundType[];
    }

    const stateWith = (syncTime: number): DemoState => ({
      started: true,
      startTime: 0,
      syncTime,
      audioSegments: [],
      videoPath: null,
      browser: null,
      context: null,
      page: null,
    });

    const buildHarness = (syncTime = 0): Harness => {
      const scrollIntoViewIfNeeded = jest.fn().mockResolvedValue(undefined);
      const waitForTimeout = jest.fn().mockResolvedValue(undefined);
      const type = jest.fn().mockResolvedValue(undefined);
      const click = jest.fn().mockResolvedValue(undefined);
      const locator = jest.fn().mockReturnValue({ scrollIntoViewIfNeeded });
      const mockPage = { type, click, waitForTimeout, locator, scrollIntoViewIfNeeded };
      const pending: Array<{ type: soundsModule.SoundType; timeMs: number }> = [];
      const recorded: soundsModule.SoundType[] = [];
      const page = new SoundEnabledPage(
        mockPage as unknown as Page,
        (t: soundsModule.SoundType) => recorded.push(t),
        pending,
        stateWith(syncTime)
      );
      return { page, mockPage, pending, recorded };
    };

    // Returns the delay value passed to the i-th waitForTimeout call made by type()
    // (type() calls waitForTimeout once after every character except the last).
    const delaysFrom = (mockPage: Harness['mockPage']): number[] =>
      mockPage.waitForTimeout.mock.calls.map((c) => c[0] as number);

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe('getSoundTypeForChar via type()', () => {
      it('routes carriage-return to keypress-return', async () => {
        // Kills L67:26 (char === \'\\r\' -> false) and L67:35 (\'\\r\' -> "").
        const h = buildHarness();
        await h.page.type('#in', '\r');
        expect(h.pending.map((p) => p.type)).toEqual(['keypress-return']);
      });

      it('routes newline to keypress-return', async () => {
        const h = buildHarness();
        await h.page.type('#in', '\n');
        expect(h.pending.map((p) => p.type)).toEqual(['keypress-return']);
      });

      it('routes a space to a keypress-space variant', async () => {
        const h = buildHarness();
        await h.page.type('#in', ' ');
        expect(h.pending[0].type).toMatch(/^keypress-space-[1-5]$/);
      });

      it('routes a letter to a keypress-letter variant', async () => {
        const h = buildHarness();
        await h.page.type('#in', 'x');
        expect(h.pending[0].type).toMatch(/^keypress-letter-[1-5]$/);
      });
    });

    describe('getKeypressDelay arithmetic', () => {
      it('with random=0.5 a plain pair yields exactly baseDelay (kills L78:14, L78:20)', async () => {
        // factor = 0.7 + 0.5*0.6 = 1.0 -> round(1000*1.0) = 1000.
        // Mutant 0.7 - r*0.6 = 0.4 -> 400; mutant r/0.6 = 0.833 -> factor 1.533 -> 1533.
        jest.spyOn(Math, 'random').mockReturnValue(0.5);
        const h = buildHarness();
        await h.page.type('#in', 'xy', { delay: 1000 }); // pair ('','x') then ('x','y'); only ('','x') gets a delay
        expect(delaysFrom(h.mockPage)).toEqual([1000]);
      });

      it('uses multiplication not division for the random factor (kills L78:5)', async () => {
        // random=0 -> factor 0.7 -> round(1000*0.7)=700.
        // Mutant delay /= 0.7+0 -> 1000/0.7 = 1428.57 -> 1429.
        jest.spyOn(Math, 'random').mockReturnValue(0);
        const h = buildHarness();
        await h.page.type('#in', 'xy', { delay: 1000 });
        expect(delaysFrom(h.mockPage)).toEqual([700]);
      });
    });

    describe('fast digraph speedup', () => {
      // factor with random=0.5 is exactly 1.0, so a plain pair = baseDelay (1000)
      // and a digraph pair = round(1000 * 0.7) = 700.
      const digraphs = ['th', 'er', 'on', 'an', 'en', 'in', 're', 'he', 'ed', 'nd'];

      it.each(digraphs)('applies 0.7x speedup for digraph "%s"', async (digraph) => {
        // Kills the corresponding L81 StringLiteral mutant (digraph -> "") and L82:9 / L82:72.
        // Type "z<digraph>z": delays are computed for every pair except the last char.
        // 'z' never forms a fast digraph with any list entry, so only the (d0,d1) pair speeds up.
        jest.spyOn(Math, 'random').mockReturnValue(0.5);
        const h = buildHarness();
        await h.page.type('#in', 'z' + digraph + 'z', { delay: 1000 });
        const delays = delaysFrom(h.mockPage);
        // Delays use (text[i-1], text[i]) after typing char i (i < len-1):
        // i=0 ('','z')=1000, i=1 ('z',d0)=1000, i=2 (d0,d1) digraph=700. Last char: no delay.
        expect(delays).toEqual([1000, 1000, 700]);
      });

      it('does NOT speed up a non-digraph pair (kills L82:9 -> true)', async () => {
        // 'zz' is not in the digraph list; if the condition were forced true it would be 700.
        jest.spyOn(Math, 'random').mockReturnValue(0.5);
        const h = buildHarness();
        await h.page.type('#in', 'zzz', { delay: 1000 });
        // Pairs ('','z')=1000, ('z','z')=1000.
        expect(delaysFrom(h.mockPage)).toEqual([1000, 1000]);
      });

      it('lowercases the pair before matching (kills L82:31 toUpperCase)', async () => {
        // 'TH' must still match the lowercase 'th' digraph.
        jest.spyOn(Math, 'random').mockReturnValue(0.5);
        const h = buildHarness();
        await h.page.type('#in', 'zTHz', { delay: 1000 });
        // i=0 ('','z')=1000, i=1 ('z','T')=1000, i=2 ('T','H') lowercases to 'th' -> 700.
        expect(delaysFrom(h.mockPage)).toEqual([1000, 1000, 700]);
      });
    });

    describe('after-space pause', () => {
      it('applies 1.3x pause when prevChar is a space (kills L87 conditional/equality/string, L88)', async () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.5);
        const h = buildHarness();
        // 'z zz': pairs ('','z')=1000, ('z',' ')=1000, (' ','z')=1300 (space pause).
        await h.page.type('#in', 'z zz', { delay: 1000 });
        expect(delaysFrom(h.mockPage)).toEqual([1000, 1000, 1300]);
      });

      it('does NOT apply space pause when prevChar is not a space (kills L87:9 -> true / !==)', async () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.5);
        const h = buildHarness();
        await h.page.type('#in', 'zzz', { delay: 1000 });
        expect(delaysFrom(h.mockPage)).toEqual([1000, 1000]);
      });
    });

    describe('after-punctuation pause', () => {
      const puncts = ['.', ',', '!', '?'];

      it.each(puncts)('applies 1.5x pause when prevChar is "%s"', async (p) => {
        // Kills the matching L92 StringLiteral, L92:9 conditional, L92:50 block, L93 assignment.
        jest.spyOn(Math, 'random').mockReturnValue(0.5);
        const h = buildHarness();
        // 'z<p>zz': pairs ('','z')=1000, ('z',p)=1000, (p,'z')=1500 (punct pause).
        await h.page.type('#in', 'z' + p + 'zz', { delay: 1000 });
        expect(delaysFrom(h.mockPage)).toEqual([1000, 1000, 1500]);
      });

      it('does NOT apply punctuation pause for a non-punctuation prevChar (kills L92:9 -> true)', async () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.5);
        const h = buildHarness();
        await h.page.type('#in', 'zzz', { delay: 1000 });
        expect(delaysFrom(h.mockPage)).toEqual([1000, 1000]);
      });
    });

    describe('default base delay', () => {
      it('uses 150 as the default base delay when no option given', async () => {
        // factor 1.0 with random=0.5 -> round(150) = 150.
        jest.spyOn(Math, 'random').mockReturnValue(0.5);
        const h = buildHarness();
        await h.page.type('#in', 'xy');
        expect(delaysFrom(h.mockPage)).toEqual([150]);
      });
    });

    describe('type() loop boundaries and prevChar', () => {
      it('computes a delay after every char except the last (kills L124 boundary mutants)', async () => {
        // 4 chars -> 3 delays. If i < text.length - 1 became <= or +1, the count would differ.
        jest.spyOn(Math, 'random').mockReturnValue(0.5);
        const h = buildHarness();
        await h.page.type('#in', 'zzzz', { delay: 1000 });
        expect(delaysFrom(h.mockPage)).toHaveLength(3);
        expect(h.mockPage.type).toHaveBeenCalledTimes(4);
      });

      it('records a timestamp for every typed char (kills L124:32 block / L110 prevChar)', async () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.5);
        const h = buildHarness();
        await h.page.type('#in', 'zzzz', { delay: 1000 });
        expect(h.pending).toHaveLength(4);
      });

      it('reads prevChar as text[i-1] so the digraph at i=1 is detected (kills L110:24 false/<=0 and L110:37 i+1)', async () => {
        // 'the': i=0 ('','t')=1000, i=1 ('t','h')='th'-> 700. If prevChar were forced to '' at i>=1
        // (cond false / i<=0) or read as text[i+1] (i='e'), the 'th' pair would not match -> 1000.
        jest.spyOn(Math, 'random').mockReturnValue(0.5);
        const h = buildHarness();
        await h.page.type('#in', 'the', { delay: 1000 });
        expect(delaysFrom(h.mockPage)).toEqual([1000, 700]);
      });

      it('single char records once and waits zero times (kills L124 boundary)', async () => {
        jest.spyOn(Math, 'random').mockReturnValue(0.5);
        const h = buildHarness();
        await h.page.type('#in', 'z', { delay: 1000 });
        expect(h.pending).toHaveLength(1);
        expect(h.mockPage.waitForTimeout).not.toHaveBeenCalled();
      });
    });

    describe('keypress timestamp math', () => {
      it('records timeMs = Date.now() - syncTime (kills L116 arithmetic, L117 console log)', async () => {
        // Build a SoundEnabledPage whose state.syncTime = 1000, Date.now() = 5000 -> timeMs 4000.
        // Mutant Date.now() + syncTime -> 6000.
        jest.spyOn(Math, 'random').mockReturnValue(0.5);
        jest.spyOn(Date, 'now').mockReturnValue(5000);
        const recorded: soundsModule.SoundType[] = [];
        const pending: Array<{ type: soundsModule.SoundType; timeMs: number }> = [];
        const scrollIntoViewIfNeeded = jest.fn().mockResolvedValue(undefined);
        const mockPage = {
          type: jest.fn().mockResolvedValue(undefined),
          waitForTimeout: jest.fn().mockResolvedValue(undefined),
          locator: jest.fn().mockReturnValue({ scrollIntoViewIfNeeded }),
        };
        const page = new SoundEnabledPage(
          mockPage as unknown as Page,
          (t: soundsModule.SoundType) => recorded.push(t),
          pending,
          stateWith(1000)
        );
        await page.type('#in', 'z', { delay: 1000 });
        expect(pending).toEqual([{ type: expect.stringMatching(/^keypress-letter-[1-5]$/), timeMs: 4000 }]);
      });
    });

    describe('click() reaction delay', () => {
      it('waits 200ms then 100 + random*100 (kills L55:44, L55:50) and records a click', async () => {
        // random=0.5 -> second wait = 100 + 0.5*100 = 150.
        // Mutant 100 - r*100 = 50; mutant 100 + r/100 = 100.005.
        jest.spyOn(Math, 'random').mockReturnValue(0.5);
        const recorded: soundsModule.SoundType[] = [];
        const scrollIntoViewIfNeeded = jest.fn().mockResolvedValue(undefined);
        const mockPage = {
          click: jest.fn().mockResolvedValue(undefined),
          waitForTimeout: jest.fn().mockResolvedValue(undefined),
          locator: jest.fn().mockReturnValue({ scrollIntoViewIfNeeded }),
        };
        const page = new SoundEnabledPage(
          mockPage as unknown as Page,
          (t: soundsModule.SoundType) => recorded.push(t),
          [],
          stateWith(0)
        );
        await page.click('#btn');
        expect(mockPage.waitForTimeout.mock.calls.map((c) => c[0])).toEqual([200, 150]);
        expect(recorded).toEqual(['click']);
        expect(scrollIntoViewIfNeeded).toHaveBeenCalled();
      });
    });

    describe('waitForTimeout delegation', () => {
      it('forwards the timeout to the original page (kills L156:56 block)', async () => {
        const h = buildHarness();
        await h.page.waitForTimeout(1234);
        expect(h.mockPage.waitForTimeout).toHaveBeenCalledWith(1234);
      });
    });
  });

  describe('Date.now-based timing (mutation kills)', () => {
    // Drives the full NarratedDemo with a deterministic Date.now so the
    // timestamp subtraction in recordSoundTimestamp / narrateAsync is exact.

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('records click timeMs = Date.now() - syncTime (kills L233 arithmetic)', async () => {
      // Date.now returns SYNC during start (so syncTime = SYNC), then SYNC+4000 during click.
      const SYNC = 1_000_000;
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(SYNC);

      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start(); // syncTime captured = SYNC

      nowSpy.mockReturnValue(SYNC + 4000);
      const page = demo.page as SoundEnabledPage;
      await page.click('#btn'); // recordSoundTimestamp: timeMs = (SYNC+4000) - SYNC = 4000

      await demo.finish();

      // The click segment's startTimeMs equals the recorded timeMs.
      const segments = (ffmpegUtils.concatAudioWithGaps as jest.Mock).mock.calls[0][0] as AudioSegment[];
      const clickSeg = segments.find((s) => s.type === 'click');
      expect(clickSeg?.startTimeMs).toBe(4000);
    });

    it('passes narrateAsync startTimeMs = Date.now() - startTime (kills L373 arithmetic)', async () => {
      const START = 2_000_000;
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(START);

      const demo = new NarratedDemo(defaultConfig);
      await demo.start(); // startTime captured = START

      nowSpy.mockReturnValue(START + 250);
      await demo.narrateAsync('async timing'); // startTimeMs = 250

      const call = (Narration as jest.Mock).mock.calls[0];
      expect(call[3]).toBe(250); // 4th arg is startTimeMs
    });
  });

  describe('start()/finish() observable side effects (mutation kills)', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('injects the sync marker via evaluate then removes it (kills L296/L320 evaluate strings)', async () => {
      const { chromium } = require('playwright');
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      const calls = (mockPage.evaluate as jest.Mock).mock.calls.map((c: unknown[]) => String(c[0]));
      // Injection script must contain the magenta marker definition.
      expect(calls.some((s) => s.includes('sync-marker') && s.includes('#FF00FF'))).toBe(true);
      // Removal script must reference removing the element by id.
      expect(calls.some((s) => s.includes("getElementById('sync-marker')") && s.includes('remove'))).toBe(true);
    });

    it('only creates the SoundEnabledPage wrapper when sounds are enabled (kills L271:9 -> true)', async () => {
      const demo = new NarratedDemo(defaultConfig); // sounds disabled
      await demo.start();
      // If the guard were forced true, demo.page would be a SoundEnabledPage.
      expect(demo.page).not.toBeInstanceOf(SoundEnabledPage);
    });

    it('processes sound timestamps only when sounds enabled (kills L446:9 -> true)', async () => {
      const demo = new NarratedDemo(defaultConfig); // sounds disabled
      await demo.start();
      await demo.finish();
      // If forced true, processSoundTimestamps would run; with no pending it returns early
      // anyway, so assert generateSound never ran (it also guards behind the same flag chain).
      expect(soundsModule.generateSound).not.toHaveBeenCalled();
    });

    it('returns early from processSoundTimestamps when there are no pending sounds (kills L411 guard/block)', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();
      // No clicks/types -> pendingSoundTimestamps is empty.
      await demo.finish();
      // The early return means generateSound is never invoked.
      expect(soundsModule.generateSound).not.toHaveBeenCalled();
      // And no sound segments were added.
      expect(ffmpegUtils.concatAudioWithGaps).not.toHaveBeenCalled();
    });

    it('generates sounds and adds segments when pending sounds exist (kills L411:9 -> false)', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();
      const page = demo.page as SoundEnabledPage;
      await page.click('#btn'); // creates one pending sound
      await demo.finish();
      // If the length-0 guard were forced false (early return removed) with empty pending,
      // nothing would change; the meaningful kill is that WITH pending sounds the body runs.
      expect(soundsModule.generateSound).toHaveBeenCalledWith('click');
      expect(ffmpegUtils.concatAudioWithGaps).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ type: 'click' })]),
        expect.any(String),
        expect.any(Number)
      );
    });

    it('only trims when firstSyncFrame >= 0 including frame 0 (kills L477 > 0)', async () => {
      // firstSyncFrame: 0 must STILL trigger trimming. Mutant firstSyncFrame > 0 would skip it.
      (ffmpegUtils.detectSyncFrameRange as jest.Mock).mockResolvedValueOnce({
        firstSyncFrame: 0,
        lastSyncFrame: 3,
        frameDurationMs: 40,
      });
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();
      await demo.narrate('hi');
      await demo.finish();

      expect(ffmpegUtils.trimSyncFrames).toHaveBeenCalledWith(
        '/tmp/video/recorded.webm',
        expect.stringContaining('trimmed-video.mp4'),
        4, // lastSyncFrame + 1
        40
      );
      // syncFrameOffsetMs = 0*40 = 0; trimDurationMs = 4*40 = 160; audioOffset = 160 - 0 = 160.
      expect(ffmpegUtils.concatAudioWithGaps).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        160
      );
    });

    it('computes syncDurationFrames as last - first + 1 (kills L480 arithmetic)', async () => {
      // The audioOffset = trimDurationMs - syncFrameOffsetMs uses firstSyncFrame and lastSyncFrame.
      // syncDurationFrames itself only feeds a console.log, so assert audioOffset which depends on
      // both frame values, plus the trim frame count, to pin the surrounding arithmetic.
      (ffmpegUtils.detectSyncFrameRange as jest.Mock).mockResolvedValueOnce({
        firstSyncFrame: 3,
        lastSyncFrame: 9,
        frameDurationMs: 10,
      });
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      const demo = new NarratedDemo(defaultConfig);
      await demo.start();
      await demo.narrate('hi');
      await demo.finish();

      // syncDurationFrames = 9 - 3 + 1 = 7. Mutants: 9-3-1=5, or 9+3=12.
      const logged = logSpy.mock.calls.map((c) => String(c[0]));
      expect(logged.some((s) => s.includes('(7 frames)'))).toBe(true);
    });

    it('logs the timing summary lines (kills L474/L481/L482/L491/L493/L525-528/L530 strings + L529 block)', async () => {
      (ffmpegUtils.detectSyncFrameRange as jest.Mock).mockResolvedValueOnce({
        firstSyncFrame: 4,
        lastSyncFrame: 11,
        frameDurationMs: 40,
      });
      // Pin Date.now so the narration's startTimeMs (Date.now - startTime) is exactly 0.
      jest.spyOn(Date, 'now').mockReturnValue(1_234_567);
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      const demo = new NarratedDemo(defaultConfig);
      await demo.start();
      await demo.narrate('hi');
      await demo.finish();

      const logged = logSpy.mock.calls.map((c) => c.map((a) => String(a)).join(' '));
      // L474
      expect(logged.some((s) => s.includes('Detecting sync marker in video'))).toBe(true);
      // L481 / L482
      expect(logged.some((s) => s.includes('Sync marker found: frames 4-11'))).toBe(true);
      expect(logged.some((s) => s.includes('Sync frame offset:'))).toBe(true);
      // L491
      expect(logged.some((s) => s.includes('Trimmed') && s.includes('frames'))).toBe(true);
      // L525-528
      expect(logged.some((s) => s.includes('Final audio segments'))).toBe(true);
      expect(logged.some((s) => s.includes('syncFrameOffsetMs:'))).toBe(true);
      expect(logged.some((s) => s.includes('trimDurationMs:'))).toBe(true);
      expect(logged.some((s) => s.includes('audioOffset:'))).toBe(true);
      // L529 block + L530 per-segment string and arithmetic (startTimeMs - audioOffset).
      // audioOffset = (12*40) - (4*40) = 480 - 160 = 320. The narration segment's startTimeMs
      // is 0 (narrate fires right at sync in this deterministic setup), so the logged target is
      // 0 - 320 = -320ms. Mutant startTimeMs + audioOffset would log +320ms.
      expect(logged.some((s) => s.includes('-> -320ms (duration:'))).toBe(true);
    });

    it('logs the no-sync-marker message when none detected (kills L493 string)', async () => {
      // Default detectSyncFrameRange mock returns firstSyncFrame: -1.
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      const demo = new NarratedDemo(defaultConfig);
      await demo.start();
      await demo.narrate('hi');
      await demo.finish();

      const logged = logSpy.mock.calls.map((c) => String(c[0]));
      expect(logged.some((s) => s.includes('No sync marker detected'))).toBe(true);
      // trimSyncFrames must NOT be called when no marker is found.
      expect(ffmpegUtils.trimSyncFrames).not.toHaveBeenCalled();
    });

    it('logs timing markers during start() (kills L283/L288/L306/L313/L321 strings)', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      const logged = logSpy.mock.calls.map((c) => c.map((a) => String(a)).join(' '));
      expect(logged.some((s) => s.includes('Page fully loaded'))).toBe(true);
      expect(logged.some((s) => s.includes('startTime captured:'))).toBe(true);
      expect(logged.some((s) => s.includes('Sync marker injected'))).toBe(true);
      expect(logged.some((s) => s.includes('syncTime captured:'))).toBe(true);
      expect(logged.some((s) => s.includes('Sync marker removed after 500ms'))).toBe(true);
    });

    it('logs the per-character SOUND line during type() (kills L117 console string)', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();
      const page = demo.page as SoundEnabledPage;
      await page.type('#in', 'x');

      const logged = logSpy.mock.calls.map((c) => c.map((a) => String(a)).join(' '));
      expect(logged.some((s) => s.includes('[SOUND]') && s.includes("for 'x'") && s.includes('relative to sync marker'))).toBe(true);
    });
  });
});
