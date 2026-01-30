import { Narration } from '../../src/narration';
import { generateTTS } from '../../src/audio-utils';
import { TTSResult } from '../../src/types';

// Mock the audio-utils module
jest.mock('../../src/audio-utils');

const mockGenerateTTS = generateTTS as jest.MockedFunction<typeof generateTTS>;

describe('Narration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const createNarration = (
    overrides: Partial<{
      text: string;
      voice: string;
      model: string;
      startTimeMs: number;
      outputDir: string;
      segmentId: string;
    }> = {}
  ): Narration => {
    return new Narration(
      overrides.text ?? 'Hello, world!',
      overrides.voice ?? 'Rachel',
      overrides.model ?? 'eleven_v3',
      overrides.startTimeMs ?? 0,
      overrides.outputDir ?? '/tmp/output',
      overrides.segmentId ?? 'segment-1'
    );
  };

  const mockTTSResult: TTSResult = {
    audioPath: '/tmp/output/segment-1.mp3',
    durationMs: 2000,
  };

  describe('generate', () => {
    it('should call generateTTS with correct parameters', async () => {
      mockGenerateTTS.mockResolvedValue(mockTTSResult);
      const narration = createNarration({
        text: 'Test narration',
        voice: 'Josh',
        model: 'eleven_v2',
        outputDir: '/custom/path',
        segmentId: 'seg-42',
      });

      await narration.generate();

      expect(mockGenerateTTS).toHaveBeenCalledWith({
        text: 'Test narration',
        voice: 'Josh',
        model: 'eleven_v2',
        outputPath: '/custom/path/seg-42.mp3',
      });
    });

    it('should store the TTS result', async () => {
      mockGenerateTTS.mockResolvedValue(mockTTSResult);
      const narration = createNarration();

      await narration.generate();

      expect(narration.getDuration()).toBe(2000);
    });

    it('should set up completion promise with timer', async () => {
      mockGenerateTTS.mockResolvedValue(mockTTSResult);
      const narration = createNarration();

      await narration.generate();

      // The completion promise should exist and not be resolved yet
      let completed = false;
      const completionPromise = narration.waitUntilComplete().then(() => {
        completed = true;
      });

      // Advance time partially - should not be complete
      jest.advanceTimersByTime(1000);
      expect(completed).toBe(false);

      // Advance to completion - run the timer async to flush promises
      await jest.advanceTimersByTimeAsync(1000);
      await completionPromise;
      expect(completed).toBe(true);
    });

    it('should propagate errors from generateTTS', async () => {
      const error = new Error('TTS generation failed');
      mockGenerateTTS.mockRejectedValue(error);
      const narration = createNarration();

      await expect(narration.generate()).rejects.toThrow('TTS generation failed');
    });
  });

  describe('waitUntilComplete', () => {
    it('should throw error if called before generate', async () => {
      const narration = createNarration();

      await expect(narration.waitUntilComplete()).rejects.toThrow(
        'Narration not yet generated'
      );
    });

    it('should resolve after the narration duration', async () => {
      mockGenerateTTS.mockResolvedValue({ ...mockTTSResult, durationMs: 3000 });
      const narration = createNarration();
      await narration.generate();

      let completed = false;
      const promise = narration.waitUntilComplete().then(() => {
        completed = true;
      });

      // Should not be complete yet
      jest.advanceTimersByTime(2999);
      expect(completed).toBe(false);

      // Should complete after full duration
      await jest.advanceTimersByTimeAsync(1);
      await promise;
      expect(completed).toBe(true);
    });

    it('should resolve immediately if narration already completed', async () => {
      mockGenerateTTS.mockResolvedValue({ ...mockTTSResult, durationMs: 100 });
      const narration = createNarration();
      await narration.generate();

      // Advance past the duration
      await jest.advanceTimersByTimeAsync(200);

      // Should resolve immediately (promise already resolved)
      let completed = false;
      const promise = narration.waitUntilComplete().then(() => {
        completed = true;
      });
      await promise;
      expect(completed).toBe(true);
    });
  });

  describe('whileDoing', () => {
    it('should throw error if called before generate', async () => {
      const narration = createNarration();
      const action = jest.fn().mockResolvedValue(undefined);

      await expect(narration.whileDoing(action)).rejects.toThrow(
        'Narration not yet generated'
      );
      expect(action).not.toHaveBeenCalled();
    });

    it('should execute action in parallel with narration', async () => {
      mockGenerateTTS.mockResolvedValue({ ...mockTTSResult, durationMs: 2000 });
      const narration = createNarration();
      await narration.generate();

      let actionStarted = false;
      let actionCompleted = false;
      const action = jest.fn().mockImplementation(async () => {
        actionStarted = true;
        await new Promise((resolve) => setTimeout(resolve, 500));
        actionCompleted = true;
      });

      let whileDoingCompleted = false;
      const promise = narration.whileDoing(action);
      promise.then(() => {
        whileDoingCompleted = true;
      });

      // Action should start immediately (on next tick)
      await Promise.resolve();
      expect(actionStarted).toBe(true);

      // Action completes before narration (at 500ms)
      await jest.advanceTimersByTimeAsync(500);
      expect(actionCompleted).toBe(true);

      // whileDoing should not resolve until narration completes
      jest.advanceTimersByTime(1000);
      expect(whileDoingCompleted).toBe(false);

      // After narration duration (2000ms total), whileDoing should complete
      await jest.advanceTimersByTimeAsync(500);
      await promise;
      expect(whileDoingCompleted).toBe(true);
    });

    it('should wait for action if it takes longer than narration', async () => {
      mockGenerateTTS.mockResolvedValue({ ...mockTTSResult, durationMs: 500 });
      const narration = createNarration();
      await narration.generate();

      let actionCompleted = false;
      const action = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        actionCompleted = true;
      });

      let whileDoingCompleted = false;
      const promise = narration.whileDoing(action);
      promise.then(() => {
        whileDoingCompleted = true;
      });

      // Narration completes first (at 500ms), but action still running
      await jest.advanceTimersByTimeAsync(500);
      expect(whileDoingCompleted).toBe(false);
      expect(actionCompleted).toBe(false);

      // Action still running at 1500ms
      await jest.advanceTimersByTimeAsync(1000);
      expect(whileDoingCompleted).toBe(false);
      expect(actionCompleted).toBe(false);

      // Action completes at 2000ms
      await jest.advanceTimersByTimeAsync(500);
      await promise;
      expect(actionCompleted).toBe(true);
      expect(whileDoingCompleted).toBe(true);
    });

    it('should propagate action errors', async () => {
      mockGenerateTTS.mockResolvedValue(mockTTSResult);
      const narration = createNarration();
      await narration.generate();

      const error = new Error('Action failed');
      const action = jest.fn().mockRejectedValue(error);

      await expect(narration.whileDoing(action)).rejects.toThrow('Action failed');
    });
  });

  describe('getDuration', () => {
    it('should throw error if called before generate', () => {
      const narration = createNarration();

      expect(() => narration.getDuration()).toThrow('Narration not yet generated');
    });

    it('should return the duration from TTS result', async () => {
      mockGenerateTTS.mockResolvedValue({ ...mockTTSResult, durationMs: 4567 });
      const narration = createNarration();
      await narration.generate();

      expect(narration.getDuration()).toBe(4567);
    });
  });

  describe('getAudioSegment', () => {
    it('should throw error if called before generate', () => {
      const narration = createNarration();

      expect(() => narration.getAudioSegment()).toThrow(
        'Narration not yet generated'
      );
    });

    it('should return correct audio segment', async () => {
      mockGenerateTTS.mockResolvedValue({
        audioPath: '/output/test.mp3',
        durationMs: 1500,
      });
      const narration = createNarration({
        startTimeMs: 5000,
      });
      await narration.generate();

      const segment = narration.getAudioSegment();

      expect(segment).toEqual({
        path: '/output/test.mp3',
        startTimeMs: 5000,
        durationMs: 1500,
        type: 'narration',
      });
    });

    it('should use the startTimeMs from constructor', async () => {
      mockGenerateTTS.mockResolvedValue(mockTTSResult);
      const narration = createNarration({ startTimeMs: 12345 });
      await narration.generate();

      const segment = narration.getAudioSegment();

      expect(segment.startTimeMs).toBe(12345);
    });
  });

  describe('constructor', () => {
    it('should store all parameters correctly', async () => {
      mockGenerateTTS.mockResolvedValue(mockTTSResult);
      const narration = new Narration(
        'Custom text',
        'CustomVoice',
        'custom_model',
        9999,
        '/custom/output/dir',
        'custom-segment-id'
      );

      await narration.generate();

      expect(mockGenerateTTS).toHaveBeenCalledWith({
        text: 'Custom text',
        voice: 'CustomVoice',
        model: 'custom_model',
        outputPath: '/custom/output/dir/custom-segment-id.mp3',
      });
    });
  });
});
