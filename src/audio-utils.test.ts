import { generateTTS, getAudioDuration } from './audio-utils';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { exec } from 'child_process';
import { TTSOptions } from './types';

// Mock dependencies
jest.mock('elevenlabs', () => ({
  ElevenLabsClient: jest.fn().mockImplementation(() => ({
    textToSpeech: {
      convert: jest.fn(),
    },
  })),
}));

jest.mock('fs', () => ({
  createWriteStream: jest.fn(),
}));

jest.mock('stream/promises', () => ({
  pipeline: jest.fn(),
}));

jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

import { ElevenLabsClient } from 'elevenlabs';

describe('audio-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAudioDuration', () => {
    it('should return duration in milliseconds for valid audio file', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: '5.5\n', stderr: '' });
      });

      const duration = await getAudioDuration('/path/to/audio.mp3');

      expect(duration).toBe(5500);
      expect(mockExec).toHaveBeenCalledWith(
        'ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "/path/to/audio.mp3"',
        expect.any(Function)
      );
    });

    it('should handle zero duration', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: '0\n', stderr: '' });
      });

      const duration = await getAudioDuration('/path/to/silent.mp3');

      expect(duration).toBe(0);
    });

    it('should handle floating point precision correctly', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: '3.14159265359\n', stderr: '' });
      });

      const duration = await getAudioDuration('/path/to/audio.mp3');

      expect(duration).toBe(3142);
    });

    it('should handle very small durations', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: '0.001\n', stderr: '' });
      });

      const duration = await getAudioDuration('/path/to/short.mp3');

      expect(duration).toBe(1);
    });

    it('should handle large durations', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: '3600.5\n', stderr: '' });
      });

      const duration = await getAudioDuration('/path/to/long.mp3');

      expect(duration).toBe(3600500);
    });

    it('should throw error when ffprobe fails', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((cmd, callback) => {
        callback(new Error('ffprobe not found'), null);
      });

      await expect(getAudioDuration('/path/to/audio.mp3')).rejects.toThrow(
        'ffprobe not found'
      );
    });

    it('should throw error for invalid ffprobe output', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: 'invalid\n', stderr: '' });
      });

      const duration = await getAudioDuration('/path/to/audio.mp3');

      expect(duration).toBeNaN();
    });

    it('should handle output with extra whitespace', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: '  2.5  \n', stderr: '' });
      });

      const duration = await getAudioDuration('/path/to/audio.mp3');

      expect(duration).toBe(2500);
    });

    it('should trim whitespace and newlines from ffprobe output', async () => {
      const mockExec = exec as unknown as jest.Mock;
      // Without trim, parseFloat would return NaN because of leading whitespace
      mockExec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: '\n  3.0\n\n', stderr: '' });
      });

      const duration = await getAudioDuration('/path/to/audio.mp3');

      // If trim() was removed, this would fail because parseFloat('\n  3.0\n\n') = NaN
      expect(duration).toBe(3000);
      expect(Number.isNaN(duration)).toBe(false);
    });

    it('should escape file paths with special characters', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: '1.0\n', stderr: '' });
      });

      await getAudioDuration('/path/to/file with spaces.mp3');

      expect(mockExec).toHaveBeenCalledWith(
        'ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "/path/to/file with spaces.mp3"',
        expect.any(Function)
      );
    });

    it('should round duration to nearest millisecond', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: '1.9999\n', stderr: '' });
      });

      const duration = await getAudioDuration('/path/to/audio.mp3');

      expect(duration).toBe(2000);
    });
  });

  describe('generateTTS', () => {
    const defaultOptions: TTSOptions = {
      text: 'Hello, world!',
      voice: 'Rachel',
      model: 'eleven_v3',
      outputPath: '/tmp/output.mp3',
    };

    it('should generate TTS audio and return result with duration', async () => {
      const mockAudioStream = { pipe: jest.fn() };
      const mockWriteStream = { on: jest.fn() };
      const mockClient = {
        textToSpeech: {
          convert: jest.fn().mockResolvedValue(mockAudioStream),
        },
      };

      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);
      (createWriteStream as jest.Mock).mockReturnValue(mockWriteStream);
      (pipeline as jest.Mock).mockResolvedValue(undefined);

      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: '3.5\n', stderr: '' });
      });

      const result = await generateTTS(defaultOptions);

      expect(result).toEqual({
        audioPath: '/tmp/output.mp3',
        durationMs: 3500,
      });
    });

    it('should call ElevenLabs client with correct parameters', async () => {
      const mockAudioStream = { pipe: jest.fn() };
      const mockWriteStream = { on: jest.fn() };
      const mockConvert = jest.fn().mockResolvedValue(mockAudioStream);
      const mockClient = {
        textToSpeech: {
          convert: mockConvert,
        },
      };

      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);
      (createWriteStream as jest.Mock).mockReturnValue(mockWriteStream);
      (pipeline as jest.Mock).mockResolvedValue(undefined);

      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: '1.0\n', stderr: '' });
      });

      await generateTTS(defaultOptions);

      // Voice name 'Rachel' is resolved to its ElevenLabs ID
      expect(mockConvert).toHaveBeenCalledWith('21m00Tcm4TlvDq8ikWAM', {
        text: 'Hello, world!',
        model_id: 'eleven_v3',
      });
    });

    it('should create write stream at correct output path', async () => {
      const mockAudioStream = { pipe: jest.fn() };
      const mockWriteStream = { on: jest.fn() };
      const mockClient = {
        textToSpeech: {
          convert: jest.fn().mockResolvedValue(mockAudioStream),
        },
      };

      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);
      (createWriteStream as jest.Mock).mockReturnValue(mockWriteStream);
      (pipeline as jest.Mock).mockResolvedValue(undefined);

      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: '1.0\n', stderr: '' });
      });

      await generateTTS(defaultOptions);

      expect(createWriteStream).toHaveBeenCalledWith('/tmp/output.mp3');
    });

    it('should pipe audio stream to write stream using pipeline', async () => {
      const mockAudioStream = { pipe: jest.fn() };
      const mockWriteStream = { on: jest.fn() };
      const mockClient = {
        textToSpeech: {
          convert: jest.fn().mockResolvedValue(mockAudioStream),
        },
      };

      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);
      (createWriteStream as jest.Mock).mockReturnValue(mockWriteStream);
      (pipeline as jest.Mock).mockResolvedValue(undefined);

      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: '1.0\n', stderr: '' });
      });

      await generateTTS(defaultOptions);

      expect(pipeline).toHaveBeenCalledWith(mockAudioStream, mockWriteStream);
    });

    it('should throw error when ElevenLabs API fails', async () => {
      const mockClient = {
        textToSpeech: {
          convert: jest
            .fn()
            .mockRejectedValue(new Error('API rate limit exceeded')),
        },
      };

      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);

      await expect(generateTTS(defaultOptions)).rejects.toThrow(
        'API rate limit exceeded'
      );
    });

    it('should throw error when pipeline fails', async () => {
      const mockAudioStream = { pipe: jest.fn() };
      const mockWriteStream = { on: jest.fn() };
      const mockClient = {
        textToSpeech: {
          convert: jest.fn().mockResolvedValue(mockAudioStream),
        },
      };

      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);
      (createWriteStream as jest.Mock).mockReturnValue(mockWriteStream);
      (pipeline as jest.Mock).mockRejectedValue(new Error('Write failed'));

      await expect(generateTTS(defaultOptions)).rejects.toThrow('Write failed');
    });

    it('should throw error when getting audio duration fails', async () => {
      const mockAudioStream = { pipe: jest.fn() };
      const mockWriteStream = { on: jest.fn() };
      const mockClient = {
        textToSpeech: {
          convert: jest.fn().mockResolvedValue(mockAudioStream),
        },
      };

      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);
      (createWriteStream as jest.Mock).mockReturnValue(mockWriteStream);
      (pipeline as jest.Mock).mockResolvedValue(undefined);

      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((cmd, callback) => {
        callback(new Error('ffprobe failed'), null);
      });

      await expect(generateTTS(defaultOptions)).rejects.toThrow(
        'ffprobe failed'
      );
    });

    it('should handle different voice IDs', async () => {
      const mockAudioStream = { pipe: jest.fn() };
      const mockWriteStream = { on: jest.fn() };
      const mockConvert = jest.fn().mockResolvedValue(mockAudioStream);
      const mockClient = {
        textToSpeech: {
          convert: mockConvert,
        },
      };

      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);
      (createWriteStream as jest.Mock).mockReturnValue(mockWriteStream);
      (pipeline as jest.Mock).mockResolvedValue(undefined);

      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: '1.0\n', stderr: '' });
      });

      const options: TTSOptions = {
        ...defaultOptions,
        voice: 'custom-voice-id-123',
      };

      await generateTTS(options);

      // Verify the custom voice ID is passed through unchanged (not mapped)
      expect(mockConvert).toHaveBeenCalledWith(
        'custom-voice-id-123',
        expect.any(Object)
      );
    });

    it('should resolve known voice name to voice ID', async () => {
      const mockAudioStream = { pipe: jest.fn() };
      const mockWriteStream = { on: jest.fn() };
      const mockConvert = jest.fn().mockResolvedValue(mockAudioStream);
      const mockClient = {
        textToSpeech: {
          convert: mockConvert,
        },
      };

      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);
      (createWriteStream as jest.Mock).mockReturnValue(mockWriteStream);
      (pipeline as jest.Mock).mockResolvedValue(undefined);

      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: '1.0\n', stderr: '' });
      });

      // Test with a different known voice name to verify mapping works
      const options: TTSOptions = {
        ...defaultOptions,
        voice: 'Josh',
      };

      await generateTTS(options);

      // Josh should be mapped to its ElevenLabs ID
      expect(mockConvert).toHaveBeenCalledWith('TxGEqnHWrfWFTfGW9XjX', {
        text: 'Hello, world!',
        model_id: 'eleven_v3',
      });
    });

    it.each([
      ['Rachel', '21m00Tcm4TlvDq8ikWAM'],
      ['Domi', 'AZnzlk1XvdvUeBnXmlld'],
      ['Bella', 'EXAVITQu4vr4xnSDxMaL'],
      ['Antoni', 'ErXwobaYiN019PkySvjV'],
      ['Elli', 'MF3mGyEYCl7XYWbV9V6O'],
      ['Arnold', 'VR6AewLTigWG4xSOukaG'],
      ['Adam', 'pNInz6obpgDQGcFmaJgB'],
      ['Sam', 'yoZ06aMxZJJ28mfd3POQ'],
      ['Sarah', 'EXAVITQu4vr4xnSDxMaL'],
    ])('should resolve voice name %s to voice ID %s', async (voiceName, expectedVoiceId) => {
      const mockAudioStream = { pipe: jest.fn() };
      const mockWriteStream = { on: jest.fn() };
      const mockConvert = jest.fn().mockResolvedValue(mockAudioStream);
      const mockClient = {
        textToSpeech: {
          convert: mockConvert,
        },
      };

      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);
      (createWriteStream as jest.Mock).mockReturnValue(mockWriteStream);
      (pipeline as jest.Mock).mockResolvedValue(undefined);

      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: '1.0\n', stderr: '' });
      });

      const options: TTSOptions = {
        ...defaultOptions,
        voice: voiceName,
      };

      await generateTTS(options);

      expect(mockConvert).toHaveBeenCalledWith(expectedVoiceId, expect.any(Object));
    });

    it('should handle different model IDs', async () => {
      const mockAudioStream = { pipe: jest.fn() };
      const mockWriteStream = { on: jest.fn() };
      const mockConvert = jest.fn().mockResolvedValue(mockAudioStream);
      const mockClient = {
        textToSpeech: {
          convert: mockConvert,
        },
      };

      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);
      (createWriteStream as jest.Mock).mockReturnValue(mockWriteStream);
      (pipeline as jest.Mock).mockResolvedValue(undefined);

      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: '1.0\n', stderr: '' });
      });

      const options: TTSOptions = {
        ...defaultOptions,
        model: 'eleven_multilingual_v2',
      };

      await generateTTS(options);

      // Voice name 'Rachel' is resolved to its ElevenLabs ID
      expect(mockConvert).toHaveBeenCalledWith('21m00Tcm4TlvDq8ikWAM', {
        text: 'Hello, world!',
        model_id: 'eleven_multilingual_v2',
      });
    });

    it('should handle empty text', async () => {
      const mockAudioStream = { pipe: jest.fn() };
      const mockWriteStream = { on: jest.fn() };
      const mockConvert = jest.fn().mockResolvedValue(mockAudioStream);
      const mockClient = {
        textToSpeech: {
          convert: mockConvert,
        },
      };

      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);
      (createWriteStream as jest.Mock).mockReturnValue(mockWriteStream);
      (pipeline as jest.Mock).mockResolvedValue(undefined);

      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: '0\n', stderr: '' });
      });

      const options: TTSOptions = {
        ...defaultOptions,
        text: '',
      };

      const result = await generateTTS(options);

      expect(result.durationMs).toBe(0);
    });

    it('should handle long text', async () => {
      const mockAudioStream = { pipe: jest.fn() };
      const mockWriteStream = { on: jest.fn() };
      const mockConvert = jest.fn().mockResolvedValue(mockAudioStream);
      const mockClient = {
        textToSpeech: {
          convert: mockConvert,
        },
      };

      (ElevenLabsClient as jest.Mock).mockImplementation(() => mockClient);
      (createWriteStream as jest.Mock).mockReturnValue(mockWriteStream);
      (pipeline as jest.Mock).mockResolvedValue(undefined);

      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((cmd, callback) => {
        callback(null, { stdout: '120.5\n', stderr: '' });
      });

      const longText = 'A'.repeat(5000);
      const options: TTSOptions = {
        ...defaultOptions,
        text: longText,
      };

      const result = await generateTTS(options);

      // Voice name 'Rachel' is resolved to its ElevenLabs ID
      expect(mockConvert).toHaveBeenCalledWith('21m00Tcm4TlvDq8ikWAM', {
        text: longText,
        model_id: 'eleven_v3',
      });
      expect(result.durationMs).toBe(120500);
    });
  });
});
