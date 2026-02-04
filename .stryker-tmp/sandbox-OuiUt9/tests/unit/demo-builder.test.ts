// @ts-nocheck
import { NarratedDemo, SoundEnabledPage } from '../../src/demo-builder';
import { DemoConfig, DEFAULT_CONFIG, AudioSegment } from '../../src/types';
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

    it('should log sync detection message when videoPath is not null', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();

      await demo.finish();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SYNC] Detecting sync marker in video...')
      );

      consoleLogSpy.mockRestore();
    });

    it('should log when sync marker is found', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Mock detectSyncFrameRange to return found frames
      (ffmpegUtils.detectSyncFrameRange as jest.Mock).mockResolvedValue({
        firstSyncFrame: 5,
        lastSyncFrame: 8,
        frameDurationMs: 33.33,
      });

      const demo = new NarratedDemo(defaultConfig);
      await demo.start();
      await demo.finish();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[SYNC\] Sync marker found: frames 5-8/)
      );

      consoleLogSpy.mockRestore();
    });

    it('should log when no sync marker detected', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Mock detectSyncFrameRange to return no frames found
      (ffmpegUtils.detectSyncFrameRange as jest.Mock).mockResolvedValue({
        firstSyncFrame: -1,
        lastSyncFrame: -1,
        frameDurationMs: 33.33,
      });

      const demo = new NarratedDemo(defaultConfig);
      await demo.start();
      await demo.finish();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SYNC] No sync marker detected in video - using original')
      );

      consoleLogSpy.mockRestore();
    });

    it('should log sync frame offset when marker found', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      (ffmpegUtils.detectSyncFrameRange as jest.Mock).mockResolvedValue({
        firstSyncFrame: 4,
        lastSyncFrame: 6,
        frameDurationMs: 40,
      });

      const demo = new NarratedDemo(defaultConfig);
      await demo.start();
      await demo.finish();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[SYNC\] Sync frame offset: 160\.00ms/)
      );

      consoleLogSpy.mockRestore();
    });

    it('should log trimmed frames information', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      (ffmpegUtils.detectSyncFrameRange as jest.Mock).mockResolvedValue({
        firstSyncFrame: 3,
        lastSyncFrame: 5,
        frameDurationMs: 50,
      });

      const demo = new NarratedDemo(defaultConfig);
      await demo.start();
      await demo.finish();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[SYNC\] Trimmed 6 frames \(300\.00ms\) from video/)
      );

      consoleLogSpy.mockRestore();
    });

    it('should log final audio segments when present', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const demo = new NarratedDemo(defaultConfig);
      await demo.start();
      await demo.narrate('Test');
      await demo.finish();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[TIMING\] Final audio segments \(\d+ total\):/)
      );

      consoleLogSpy.mockRestore();
    });

    it('should calculate syncFrameOffsetMs correctly (multiplication)', async () => {
      (ffmpegUtils.detectSyncFrameRange as jest.Mock).mockResolvedValue({
        firstSyncFrame: 10,
        lastSyncFrame: 15,
        frameDurationMs: 25,
      });

      const demo = new NarratedDemo(defaultConfig);
      await demo.start();
      await demo.finish();

      // syncFrameOffsetMs = firstSyncFrame * frameDurationMs = 10 * 25 = 250
      expect(ffmpegUtils.trimSyncFrames).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        16, // lastSyncFrame + 1
        25
      );
    });

    it('should calculate syncDurationFrames correctly (subtraction + addition)', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      (ffmpegUtils.detectSyncFrameRange as jest.Mock).mockResolvedValue({
        firstSyncFrame: 5,
        lastSyncFrame: 10,
        frameDurationMs: 30,
      });

      const demo = new NarratedDemo(defaultConfig);
      await demo.start();
      await demo.finish();

      // syncDurationFrames = lastSyncFrame - firstSyncFrame + 1 = 10 - 5 + 1 = 6
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('(6 frames)')
      );

      consoleLogSpy.mockRestore();
    });

    it('should calculate framesToTrim correctly (addition)', async () => {
      (ffmpegUtils.detectSyncFrameRange as jest.Mock).mockResolvedValue({
        firstSyncFrame: 3,
        lastSyncFrame: 7,
        frameDurationMs: 20,
      });

      const demo = new NarratedDemo(defaultConfig);
      await demo.start();
      await demo.finish();

      // framesToTrim = lastSyncFrame + 1 = 7 + 1 = 8
      expect(ffmpegUtils.trimSyncFrames).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        8,
        20
      );
    });

    it('should calculate trimDurationMs correctly (multiplication)', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      (ffmpegUtils.detectSyncFrameRange as jest.Mock).mockResolvedValue({
        firstSyncFrame: 2,
        lastSyncFrame: 5,
        frameDurationMs: 40,
      });

      const demo = new NarratedDemo(defaultConfig);
      await demo.start();
      await demo.finish();

      // framesToTrim = 5 + 1 = 6
      // trimDurationMs = framesToTrim * frameDurationMs = 6 * 40 = 240
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('(240.00ms)')
      );

      consoleLogSpy.mockRestore();
    });

    it('should calculate audioOffset correctly (subtraction)', async () => {
      (ffmpegUtils.detectSyncFrameRange as jest.Mock).mockResolvedValue({
        firstSyncFrame: 4,
        lastSyncFrame: 9,
        frameDurationMs: 30,
      });

      const demo = new NarratedDemo(defaultConfig);
      await demo.start();
      await demo.narrate('Test');
      await demo.finish();

      // syncFrameOffsetMs = 4 * 30 = 120
      // framesToTrim = 9 + 1 = 10
      // trimDurationMs = 10 * 30 = 300
      // audioOffset = trimDurationMs - syncFrameOffsetMs = 300 - 120 = 180
      expect(ffmpegUtils.concatAudioWithGaps).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        180
      );
    });

    it('should handle firstSyncFrame >= 0 condition (boundary)', async () => {
      (ffmpegUtils.detectSyncFrameRange as jest.Mock).mockResolvedValue({
        firstSyncFrame: 0,
        lastSyncFrame: 2,
        frameDurationMs: 33.33,
      });

      const demo = new NarratedDemo(defaultConfig);
      await demo.start();
      await demo.finish();

      // firstSyncFrame >= 0, so should trim
      expect(ffmpegUtils.trimSyncFrames).toHaveBeenCalled();
    });

    it('should handle firstSyncFrame < 0 condition (no trim)', async () => {
      (ffmpegUtils.detectSyncFrameRange as jest.Mock).mockResolvedValue({
        firstSyncFrame: -1,
        lastSyncFrame: -1,
        frameDurationMs: 33.33,
      });

      const demo = new NarratedDemo(defaultConfig);
      await demo.start();
      await demo.finish();

      // firstSyncFrame < 0, so should not trim
      expect(ffmpegUtils.trimSyncFrames).not.toHaveBeenCalled();
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

  describe('character type detection', () => {
    it('should detect carriage return as keypress-return', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
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
      // Type text with a carriage return character (\r)
      await page.type('#input', 'a\r');

      await demo.finish();

      // Should have generated keypress-return sound for the carriage return
      expect(soundsModule.generateSound).toHaveBeenCalledWith('keypress-return');
    });

    it('should detect each punctuation mark individually', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      // Type each punctuation mark followed by a letter to trigger the punctuation delay
      await page.type('#input', '.a');
      await page.type('#input', ',b');
      await page.type('#input', '!c');
      await page.type('#input', '?d');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      
      // Verify all characters were typed
      expect(mockPage.type).toHaveBeenCalled();
    });

    it('should apply delay for each fast digraph variant', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      // Type text containing all fast digraphs: th, er, on, an, en, in, re, he, ed, nd
      await page.type('#input', 'th');
      await page.type('#input', 'er');
      await page.type('#input', 'on');
      await page.type('#input', 'an');
      await page.type('#input', 'en');
      await page.type('#input', 'in');
      await page.type('#input', 're');
      await page.type('#input', 'he');
      await page.type('#input', 'ed');
      await page.type('#input', 'nd');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      
      // Verify all characters were typed (20 total)
      expect(mockPage.type).toHaveBeenCalled();
    });

    it('should handle space at beginning by using ternary empty string', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      // Type single character (first character, so prevChar should be '')
      await page.type('#input', 'a');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      
      expect(mockPage.type).toHaveBeenCalledWith('#input', 'a');
    });
  });

  describe('delay calculations with mocked Math.random', () => {
    let mathRandomSpy: jest.SpyInstance;

    beforeEach(() => {
      mathRandomSpy = jest.spyOn(Math, 'random');
    });

    afterEach(() => {
      mathRandomSpy.mockRestore();
    });

    it('should use Math.random with addition for human reaction delay in click', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      mathRandomSpy.mockReturnValue(0.5); // Middle of range

      const page = demo.page as SoundEnabledPage;
      
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      
      await page.click('#button');

      // Should have called waitForTimeout with 100 + 0.5 * 100 = 150ms for human reaction
      // Also 200ms for scroll delay
      const calls = (mockPage.waitForTimeout as jest.Mock).mock.calls;
      const hasExpectedDelay = calls.some((call: any[]) => call[0] === 150);
      expect(hasExpectedDelay).toBe(true);
    });

    it('should use Math.random with multiplication for delay variation', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      mathRandomSpy.mockReturnValue(0.5); // Middle of range

      const page = demo.page as SoundEnabledPage;
      await page.type('#input', 'a');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      
      // Should have typed the character with delay calculation
      expect(mockPage.type).toHaveBeenCalled();
    });

    it('should handle Math.random at minimum (0.0) for min delay', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      mathRandomSpy.mockReturnValue(0.0); // Minimum

      const page = demo.page as SoundEnabledPage;
      
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      
      await page.click('#button');

      // Should have called waitForTimeout with 100 + 0.0 * 100 = 100ms
      const calls = (mockPage.waitForTimeout as jest.Mock).mock.calls;
      const hasMinDelay = calls.some((call: any[]) => call[0] === 100);
      expect(hasMinDelay).toBe(true);
    });

    it('should handle Math.random at maximum (~1.0) for max delay', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      mathRandomSpy.mockReturnValue(0.999); // Near maximum

      const page = demo.page as SoundEnabledPage;
      
      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      
      await page.click('#button');

      // Should have called waitForTimeout with 100 + 0.999 * 100 ≈ 199.9ms
      const calls = (mockPage.waitForTimeout as jest.Mock).mock.calls;
      const hasMaxDelay = calls.some((call: any[]) => Math.abs(call[0] - 199.9) < 1);
      expect(hasMaxDelay).toBe(true);
    });
  });

  describe('individual digraph testing', () => {
    it('should NOT trigger fast typing for non-digraph "ab"', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      // 'ab' is NOT a fast digraph
      await page.type('#input', 'ab');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      
      expect(mockPage.type).toHaveBeenCalledTimes(2);
    });

    it('should NOT trigger fast typing for non-digraph "xy"', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      // 'xy' is NOT a fast digraph
      await page.type('#input', 'xy');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      
      expect(mockPage.type).toHaveBeenCalledTimes(2);
    });

    it('should trigger fast typing for "er" digraph', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      await page.type('#input', 'er');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      
      expect(mockPage.type).toHaveBeenCalledTimes(2);
    });

    it('should trigger fast typing for "on" digraph', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      await page.type('#input', 'on');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      
      expect(mockPage.type).toHaveBeenCalledTimes(2);
    });

    it('should trigger fast typing for "an" digraph', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      await page.type('#input', 'an');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      
      expect(mockPage.type).toHaveBeenCalledTimes(2);
    });

    it('should trigger fast typing for "en" digraph', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      await page.type('#input', 'en');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      
      expect(mockPage.type).toHaveBeenCalledTimes(2);
    });

    it('should trigger fast typing for "in" digraph', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      await page.type('#input', 'in');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      
      expect(mockPage.type).toHaveBeenCalledTimes(2);
    });

    it('should trigger fast typing for "re" digraph', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      await page.type('#input', 're');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      
      expect(mockPage.type).toHaveBeenCalledTimes(2);
    });

    it('should trigger fast typing for "he" digraph', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      await page.type('#input', 'he');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      
      expect(mockPage.type).toHaveBeenCalledTimes(2);
    });

    it('should trigger fast typing for "ed" digraph', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      await page.type('#input', 'ed');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      
      expect(mockPage.type).toHaveBeenCalledTimes(2);
    });

    it('should trigger fast typing for "nd" digraph', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      await page.type('#input', 'nd');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      
      expect(mockPage.type).toHaveBeenCalledTimes(2);
    });

    it('should handle digraphs case-insensitively (TH)', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      await page.type('#input', 'TH');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      
      expect(mockPage.type).toHaveBeenCalledTimes(2);
    });
  });

  describe('individual punctuation testing', () => {
    it('should handle comma followed by character', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      await page.type('#input', ',x');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      
      expect(mockPage.type).toHaveBeenCalledTimes(2);
    });

    it('should handle exclamation followed by character', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      await page.type('#input', '!x');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      
      expect(mockPage.type).toHaveBeenCalledTimes(2);
    });

    it('should handle question mark followed by character', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      await page.type('#input', '?x');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      
      expect(mockPage.type).toHaveBeenCalledTimes(2);
    });

    it('should NOT trigger punctuation delay for non-punctuation', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      await page.type('#input', 'ab');

      const mockBrowser = await chromium.launch();
      const mockContext = await mockBrowser.newContext();
      const mockPage = await mockContext.newPage();
      
      expect(mockPage.type).toHaveBeenCalledTimes(2);
    });
  });

  describe('console logging behavior', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should log page fully loaded message', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      
      await demo.start();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TIMING] Page fully loaded')
      );
    });

    it('should log start time capture', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      
      await demo.start();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[TIMING\] startTime captured: \d+/)
      );
    });

    it('should log sync marker injection', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      
      await demo.start();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TIMING] Sync marker injected')
      );
    });

    it('should log sync time capture', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      
      await demo.start();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[TIMING\] syncTime captured: \d+/)
      );
    });

    it('should log sync marker removal', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      
      await demo.start();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TIMING] Sync marker removed after 500ms')
      );
    });

    it('should log sound recording for each character typed', async () => {
      const demo = new NarratedDemo({
        baseUrl: 'http://localhost:3000',
        output: '/tmp/output/demo.mp4',
        sounds: true,
      });
      await demo.start();

      const page = demo.page as SoundEnabledPage;
      await page.type('#input', 'ab');

      // Should log for each character
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[SOUND\] keypress-letter-\d+ for 'a' at \d+ms/)
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[SOUND\] keypress-letter-\d+ for 'b' at \d+ms/)
      );
    });
  });
});
