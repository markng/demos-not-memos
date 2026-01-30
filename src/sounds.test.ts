import {
  generateSound,
  initSoundsDir,
  clearSoundCache,
  getSoundCache,
  SoundType,
} from './sounds';
import { getAudioDuration } from './audio-utils';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { pipeline } from 'stream/promises';

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
}));

jest.mock('stream/promises', () => ({
  pipeline: jest.fn(),
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
        text: 'short crisp mouse click on a trackpad',
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
        text: 'single mechanical keyboard key press',
        duration_seconds: 0.5,
      });
    });

    it('should write audio to correct path', async () => {
      initSoundsDir('/tmp/sounds');
      const mockConvert = jest.fn().mockResolvedValue(mockAudioStream);
      const mockClient = {
        textToSoundEffects: {
          convert: mockConvert,
        },
      };
      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);

      await generateSound('click');

      expect(createWriteStream).toHaveBeenCalledWith('/tmp/sounds/click.mp3');
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

    it('should load from disk if file exists', async () => {
      initSoundsDir('/tmp/sounds');
      // File exists on disk
      (existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path === '/tmp/sounds') return true;
        if (path === '/tmp/sounds/click.mp3') return true;
        return false;
      });
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
      (existsSync as jest.Mock).mockReturnValue(false);
      (createWriteStream as jest.Mock).mockReturnValue({ on: jest.fn() });
      (pipeline as jest.Mock).mockResolvedValue(undefined);
      (getAudioDuration as jest.Mock).mockResolvedValue(100);

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
});
