import {
  generateSound,
  initSoundsDir,
  clearSoundCache,
  getSoundCache,
  SoundType,
  getVariantSoundType,
} from './sounds';
import { getAudioDuration } from './audio-utils';
import { createWriteStream, existsSync, mkdirSync, unlinkSync, statSync } from 'fs';
import { pipeline } from 'stream/promises';
import { execSync } from 'child_process';

// Mock dependencies
jest.mock('elevenlabs', () => ({
  ElevenLabsClient: jest.fn().mockImplementation(() => ({
    textToSoundEffects: {
      convert: jest.fn(),
    },
  })),
}));

jest.mock('fs', () => ({
  createWriteStream: jest.fn(),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn(),
  statSync: jest.fn(),
}));

jest.mock('stream/promises', () => ({
  pipeline: jest.fn(),
}));

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

jest.mock('./audio-utils', () => ({
  getAudioDuration: jest.fn(),
}));

import { ElevenLabsClient } from 'elevenlabs';

describe('sounds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearSoundCache();
  });

  describe('initSoundsDir', () => {
    it('should create directory if it does not exist', () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      initSoundsDir('/path/to/sounds');

      expect(mkdirSync).toHaveBeenCalledWith('/path/to/sounds', { recursive: true });
    });

    it('should not create directory if it already exists', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      initSoundsDir('/path/to/sounds');

      expect(mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('generateSound', () => {
    const mockAudioStream = { pipe: jest.fn() };
    const mockWriteStream = { on: jest.fn() };

    beforeEach(() => {
      (existsSync as jest.Mock).mockReturnValue(false);
      (createWriteStream as jest.Mock).mockReturnValue(mockWriteStream);
      (pipeline as jest.Mock).mockResolvedValue(undefined);
      (getAudioDuration as jest.Mock).mockResolvedValue(100);
      (execSync as jest.Mock).mockReturnValue(undefined);
      (unlinkSync as jest.Mock).mockReturnValue(undefined);
      // Default to valid file size (>1000 bytes)
      (statSync as jest.Mock).mockReturnValue({ size: 2000 });
    });

    it('should throw error if sounds directory not initialized', async () => {
      // Cache is cleared in beforeEach, so soundsDir is null
      await expect(generateSound('click')).rejects.toThrow(
        'Sounds directory not initialized. Call initSoundsDir() first.'
      );
    });

    it('should generate click sound with correct prompt', async () => {
      initSoundsDir('/tmp/sounds');
      const mockConvert = jest.fn().mockResolvedValue(mockAudioStream);
      const mockClient = {
        textToSoundEffects: {
          convert: mockConvert,
        },
      };
      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);

      await generateSound('click');

      expect(mockConvert).toHaveBeenCalledWith({
        text: 'MacBook Pro trackpad click, soft satisfying tap, ASMR quality, no background noise, isolated sound',
        duration_seconds: 0.5,
      });
    });

    it('should generate keypress sound with correct prompt', async () => {
      initSoundsDir('/tmp/sounds');
      const mockConvert = jest.fn().mockResolvedValue(mockAudioStream);
      const mockClient = {
        textToSoundEffects: {
          convert: mockConvert,
        },
      };
      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);

      await generateSound('keypress');

      expect(mockConvert).toHaveBeenCalledWith({
        text: 'ASMR keyboard key press, satisfying soft thock, MacBook scissor switch, no background noise, isolated sound',
        duration_seconds: 0.5,
      });
    });

    it('should generate keypress-letter-1 sound with correct prompt', async () => {
      initSoundsDir('/tmp/sounds');
      const mockConvert = jest.fn().mockResolvedValue(mockAudioStream);
      const mockClient = {
        textToSoundEffects: {
          convert: mockConvert,
        },
      };
      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);

      await generateSound('keypress-letter-1');

      expect(mockConvert).toHaveBeenCalledWith({
        text: 'ASMR keyboard key press, soft satisfying thock, gentle attack, MacBook style, no background noise, isolated sound',
        duration_seconds: 0.5,
      });
    });

    it('should generate keypress-space-1 sound with correct prompt', async () => {
      initSoundsDir('/tmp/sounds');
      const mockConvert = jest.fn().mockResolvedValue(mockAudioStream);
      const mockClient = {
        textToSoundEffects: {
          convert: mockConvert,
        },
      };
      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);

      await generateSound('keypress-space-1');

      expect(mockConvert).toHaveBeenCalledWith({
        text: 'ASMR spacebar press, satisfying deep thock, resonant, MacBook style, no background noise, isolated sound',
        duration_seconds: 0.5,
      });
    });

    it('should generate keypress-return sound with correct prompt', async () => {
      initSoundsDir('/tmp/sounds');
      const mockConvert = jest.fn().mockResolvedValue(mockAudioStream);
      const mockClient = {
        textToSoundEffects: {
          convert: mockConvert,
        },
      };
      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);

      await generateSound('keypress-return');

      expect(mockConvert).toHaveBeenCalledWith({
        text: 'ASMR enter key press, satisfying thock, slightly longer decay, MacBook style, no background noise, isolated sound',
        duration_seconds: 0.5,
      });
    });

    it('should write audio to temp path before trimming', async () => {
      initSoundsDir('/tmp/sounds');
      const mockConvert = jest.fn().mockResolvedValue(mockAudioStream);
      const mockClient = {
        textToSoundEffects: {
          convert: mockConvert,
        },
      };
      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);

      await generateSound('click');

      // Audio is first written to temp path, then ffmpeg trims it
      expect(createWriteStream).toHaveBeenCalledWith('/tmp/sounds/click.temp.mp3');
    });

    it('should return result with correct path and duration', async () => {
      initSoundsDir('/tmp/sounds');
      const mockConvert = jest.fn().mockResolvedValue(mockAudioStream);
      const mockClient = {
        textToSoundEffects: {
          convert: mockConvert,
        },
      };
      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);
      (getAudioDuration as jest.Mock).mockResolvedValue(150);

      const result = await generateSound('click');

      expect(result).toEqual({
        path: '/tmp/sounds/click.mp3',
        durationMs: 150,
      });
    });

    it('should cache sound result and not regenerate', async () => {
      initSoundsDir('/tmp/sounds');
      const mockConvert = jest.fn().mockResolvedValue(mockAudioStream);
      const mockClient = {
        textToSoundEffects: {
          convert: mockConvert,
        },
      };
      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);
      (getAudioDuration as jest.Mock).mockResolvedValue(100);

      // First call
      const result1 = await generateSound('click');
      // Second call - should use cache
      const result2 = await generateSound('click');

      expect(mockConvert).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it('should load from disk if file exists and is valid', async () => {
      initSoundsDir('/tmp/sounds');
      // File exists on disk
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path === '/tmp/sounds') return true;
        if (path === '/tmp/sounds/click.mp3') return true;
        return false;
      });
      // File is valid (>1000 bytes)
      (statSync as jest.Mock).mockReturnValue({ size: 2000 });
      (getAudioDuration as jest.Mock).mockResolvedValue(200);

      const mockConvert = jest.fn().mockResolvedValue(mockAudioStream);
      const mockClient = {
        textToSoundEffects: {
          convert: mockConvert,
        },
      };
      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);

      const result = await generateSound('click');

      // Should not call API
      expect(mockConvert).not.toHaveBeenCalled();
      expect(result).toEqual({
        path: '/tmp/sounds/click.mp3',
        durationMs: 200,
      });
    });

    it('should cache result after loading from disk', async () => {
      initSoundsDir('/tmp/sounds');
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path === '/tmp/sounds') return true;
        if (path === '/tmp/sounds/keypress.mp3') return true;
        return false;
      });
      // File is valid (>1000 bytes)
      (statSync as jest.Mock).mockReturnValue({ size: 2000 });
      (getAudioDuration as jest.Mock).mockResolvedValue(50);

      const mockConvert = jest.fn().mockResolvedValue(mockAudioStream);
      const mockClient = {
        textToSoundEffects: {
          convert: mockConvert,
        },
      };
      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);

      // First call - loads from disk
      await generateSound('keypress');

      // Clear the existsSync mock for the second call check
      (existsSync as jest.Mock).mockReturnValue(false);

      // Second call - should use memory cache
      const result = await generateSound('keypress');

      expect(mockConvert).not.toHaveBeenCalled();
      expect(getAudioDuration).toHaveBeenCalledTimes(1); // Only called once
      expect(result.durationMs).toBe(50);
    });

    it('should handle API error', async () => {
      initSoundsDir('/tmp/sounds');
      const mockConvert = jest.fn().mockRejectedValue(new Error('API rate limit'));
      const mockClient = {
        textToSoundEffects: {
          convert: mockConvert,
        },
      };
      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);

      await expect(generateSound('click')).rejects.toThrow('API rate limit');
    });

    it('should handle pipeline error', async () => {
      initSoundsDir('/tmp/sounds');
      const mockConvert = jest.fn().mockResolvedValue(mockAudioStream);
      const mockClient = {
        textToSoundEffects: {
          convert: mockConvert,
        },
      };
      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);
      (pipeline as jest.Mock).mockRejectedValue(new Error('Write failed'));

      await expect(generateSound('click')).rejects.toThrow('Write failed');
    });

    it('should retry when generated file is too small (silent audio)', async () => {
      initSoundsDir('/tmp/sounds');
      const mockConvert = jest.fn().mockResolvedValue(mockAudioStream);
      const mockClient = {
        textToSoundEffects: {
          convert: mockConvert,
        },
      };
      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);

      // First two attempts produce invalid (too small) files, third succeeds
      (statSync as jest.Mock)
        .mockReturnValueOnce({ size: 250 }) // First attempt: invalid
        .mockReturnValueOnce({ size: 250 }) // Second attempt: invalid
        .mockReturnValueOnce({ size: 2000 }); // Third attempt: valid

      // existsSync for temp file cleanup and invalid file deletion
      let existsCallCount = 0;
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        existsCallCount++;
        // Temp files exist for cleanup, output files exist for deletion on retry
        if (path.endsWith('.temp.mp3')) return true;
        if (path.endsWith('.mp3') && existsCallCount > 1) return true;
        return false;
      });

      const result = await generateSound('click');

      // Should have called API 3 times due to retries
      expect(mockConvert).toHaveBeenCalledTimes(3);
      expect(result.durationMs).toBe(100);
    });

    it('should throw error after max retries for invalid files', async () => {
      initSoundsDir('/tmp/sounds');
      const mockConvert = jest.fn().mockResolvedValue(mockAudioStream);
      const mockClient = {
        textToSoundEffects: {
          convert: mockConvert,
        },
      };
      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);

      // All attempts produce invalid files
      (statSync as jest.Mock).mockReturnValue({ size: 250 });

      (existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.endsWith('.temp.mp3')) return true;
        if (path.endsWith('.mp3')) return true;
        return false;
      });

      await expect(generateSound('click')).rejects.toThrow(
        'Failed to generate valid sound for "click" after 3 attempts'
      );

      // Should have retried 3 times
      expect(mockConvert).toHaveBeenCalledTimes(3);
    });

    it('should regenerate if cached file on disk is invalid', async () => {
      initSoundsDir('/tmp/sounds');
      const mockConvert = jest.fn().mockResolvedValue(mockAudioStream);
      const mockClient = {
        textToSoundEffects: {
          convert: mockConvert,
        },
      };
      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);

      // File exists on disk but is invalid (too small)
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path === '/tmp/sounds') return true;
        if (path === '/tmp/sounds/click.mp3') return true;
        if (path.endsWith('.temp.mp3')) return true;
        return false;
      });

      // First check shows invalid file, after regeneration it's valid
      (statSync as jest.Mock)
        .mockReturnValueOnce({ size: 250 }) // Cached file is invalid
        .mockReturnValueOnce({ size: 2000 }); // After regeneration, valid

      const result = await generateSound('click');

      // Should have called API to regenerate
      expect(mockConvert).toHaveBeenCalledTimes(1);
      expect(result.durationMs).toBe(100);
    });

    it('should call ffmpeg with silenceremove filter', async () => {
      initSoundsDir('/tmp/sounds');
      const mockConvert = jest.fn().mockResolvedValue(mockAudioStream);
      const mockClient = {
        textToSoundEffects: {
          convert: mockConvert,
        },
      };
      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);

      await generateSound('click');

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('silenceremove=start_periods=1:start_threshold=-30dB'),
        expect.any(Object)
      );
    });

    it('should clean up temp file after trimming', async () => {
      initSoundsDir('/tmp/sounds');
      const mockConvert = jest.fn().mockResolvedValue(mockAudioStream);
      const mockClient = {
        textToSoundEffects: {
          convert: mockConvert,
        },
      };
      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);

      // Temp file exists after generation
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.endsWith('.temp.mp3')) return true;
        return false;
      });

      await generateSound('click');

      expect(unlinkSync).toHaveBeenCalledWith('/tmp/sounds/click.temp.mp3');
    });
  });

  describe('clearSoundCache', () => {
    it('should clear the cache', async () => {
      initSoundsDir('/tmp/sounds');
      const mockConvert = jest.fn().mockResolvedValue({ pipe: jest.fn() });
      const mockClient = {
        textToSoundEffects: {
          convert: mockConvert,
        },
      };
      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        // Temp file exists for cleanup
        if (path.endsWith('.temp.mp3')) return true;
        return false;
      });
      (createWriteStream as jest.Mock).mockReturnValue({ on: jest.fn() });
      (pipeline as jest.Mock).mockResolvedValue(undefined);
      (getAudioDuration as jest.Mock).mockResolvedValue(100);
      (execSync as jest.Mock).mockReturnValue(undefined);
      (unlinkSync as jest.Mock).mockReturnValue(undefined);
      (statSync as jest.Mock).mockReturnValue({ size: 2000 });

      // Generate a sound
      await generateSound('click');
      expect(getSoundCache().size).toBe(1);

      // Clear cache
      clearSoundCache();
      expect(getSoundCache().size).toBe(0);
    });

    it('should reset soundsDir to null', async () => {
      initSoundsDir('/tmp/sounds');
      clearSoundCache();

      // Should throw because soundsDir is null
      await expect(generateSound('click')).rejects.toThrow(
        'Sounds directory not initialized'
      );
    });
  });

  describe('getSoundCache', () => {
    it('should return the cache map', () => {
      const cache = getSoundCache();
      expect(cache).toBeInstanceOf(Map);
    });
  });

  describe('getVariantSoundType', () => {
    it('should return a valid keypress-letter variant', () => {
      const result = getVariantSoundType('keypress-letter');
      expect(result).toMatch(/^keypress-letter-[1-5]$/);
    });

    it('should return a valid keypress-space variant', () => {
      const result = getVariantSoundType('keypress-space');
      expect(result).toMatch(/^keypress-space-[1-5]$/);
    });

    it('should avoid immediate repetition for keypress-letter', () => {
      // Call multiple times and track results
      const results: string[] = [];
      for (let i = 0; i < 20; i++) {
        results.push(getVariantSoundType('keypress-letter'));
      }

      // Check that no two consecutive results are the same
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).not.toBe(results[i - 1]);
      }
    });

    it('should avoid immediate repetition for keypress-space', () => {
      // Call multiple times and track results
      const results: string[] = [];
      for (let i = 0; i < 20; i++) {
        results.push(getVariantSoundType('keypress-space'));
      }

      // Check that no two consecutive results are the same
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).not.toBe(results[i - 1]);
      }
    });

    it('should track letter and space variants independently', () => {
      // Get a letter variant
      const letter1 = getVariantSoundType('keypress-letter');
      // Get a space variant - should be independent
      const space1 = getVariantSoundType('keypress-space');
      // Get another letter variant - should avoid letter1, not space1
      const letter2 = getVariantSoundType('keypress-letter');

      expect(letter2).not.toBe(letter1);
      // space1 is independent - no assertion needed about its relationship
      expect(space1).toMatch(/^keypress-space-[1-5]$/);
    });

    it('should return all variants over many calls (statistical)', () => {
      const letterVariants = new Set<string>();
      const spaceVariants = new Set<string>();

      // Run enough times to likely get all variants
      for (let i = 0; i < 100; i++) {
        letterVariants.add(getVariantSoundType('keypress-letter'));
        spaceVariants.add(getVariantSoundType('keypress-space'));
      }

      // Should have gotten all 5 letter variants
      expect(letterVariants.size).toBe(5);
      // Should have gotten all 5 space variants
      expect(spaceVariants.size).toBe(5);
    });
  });
});
