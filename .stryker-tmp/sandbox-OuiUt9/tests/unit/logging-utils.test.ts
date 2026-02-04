// @ts-nocheck
import {
  extractFilename,
  formatSegmentLog,
  formatContinuationMessage,
  shouldLogContinuation,
  formatAdelayLog,
  getSegmentsToLog,
} from '../../src/logging-utils';
import { AudioSegment } from '../../src/types';

describe('logging-utils', () => {
  describe('extractFilename', () => {
    it('should extract filename from Unix path', () => {
      expect(extractFilename('/tmp/audio/sound.mp3')).toBe('sound.mp3');
    });

    it('should extract filename from nested path', () => {
      expect(extractFilename('/home/user/projects/demo/audio.wav')).toBe('audio.wav');
    });

    it('should return filename when no directory', () => {
      expect(extractFilename('file.mp3')).toBe('file.mp3');
    });

    it('should handle path with trailing slash', () => {
      expect(extractFilename('/tmp/audio/')).toBe('');
    });

    it('should handle empty path', () => {
      expect(extractFilename('')).toBe('');
    });

    it('should use forward slash as separator', () => {
      // This ensures we're using '/' not '\' or other separators
      expect(extractFilename('dir/subdir/file.txt')).toBe('file.txt');
    });
  });

  describe('formatSegmentLog', () => {
    it('should format segment log with all information', () => {
      const segment: AudioSegment = {
        path: '/tmp/sounds/click.mp3',
        startTimeMs: 1000,
        durationMs: 100,
        type: 'click',
      };

      const result = formatSegmentLog(segment, 500);
      expect(result).toBe('  [FFMPEG] segment startTimeMs=1000 -> adjusted=500, path=click.mp3');
    });

    it('should handle narration segment', () => {
      const segment: AudioSegment = {
        path: '/audio/narration-1.mp3',
        startTimeMs: 2500,
        durationMs: 3000,
        type: 'narration',
      };

      const result = formatSegmentLog(segment, 2000);
      expect(result).toBe('  [FFMPEG] segment startTimeMs=2500 -> adjusted=2000, path=narration-1.mp3');
    });

    it('should handle zero adjusted time', () => {
      const segment: AudioSegment = {
        path: '/sounds/keypress.mp3',
        startTimeMs: 50,
        durationMs: 50,
        type: 'keypress-letter-1',
      };

      const result = formatSegmentLog(segment, 0);
      expect(result).toBe('  [FFMPEG] segment startTimeMs=50 -> adjusted=0, path=keypress.mp3');
    });

    it('should extract filename from path', () => {
      const segment: AudioSegment = {
        path: '/very/long/path/to/audio/file.wav',
        startTimeMs: 100,
        durationMs: 200,
        type: 'click',
      };

      const result = formatSegmentLog(segment, 100);
      expect(result).toContain('path=file.wav');
    });
  });

  describe('formatContinuationMessage', () => {
    it('should format message for 11 total segments (1 more)', () => {
      expect(formatContinuationMessage(11)).toBe('  [FFMPEG] ... and 1 more segments');
    });

    it('should format message for 15 total segments (5 more)', () => {
      expect(formatContinuationMessage(15)).toBe('  [FFMPEG] ... and 5 more segments');
    });

    it('should format message for 100 segments (90 more)', () => {
      expect(formatContinuationMessage(100)).toBe('  [FFMPEG] ... and 90 more segments');
    });

    it('should calculate correct remaining count', () => {
      // If 20 total and we show first 10, should say "and 10 more"
      expect(formatContinuationMessage(20)).toContain('and 10 more');
    });
  });

  describe('shouldLogContinuation', () => {
    it('should return false for 10 segments', () => {
      expect(shouldLogContinuation(10)).toBe(false);
    });

    it('should return false for fewer than 10 segments', () => {
      expect(shouldLogContinuation(5)).toBe(false);
      expect(shouldLogContinuation(1)).toBe(false);
      expect(shouldLogContinuation(0)).toBe(false);
    });

    it('should return true for 11 segments', () => {
      expect(shouldLogContinuation(11)).toBe(true);
    });

    it('should return true for more than 10 segments', () => {
      expect(shouldLogContinuation(15)).toBe(true);
      expect(shouldLogContinuation(100)).toBe(true);
    });

    it('should use greater-than operator (not >=)', () => {
      // This test ensures we use > not >=
      expect(shouldLogContinuation(10)).toBe(false);
      expect(shouldLogContinuation(11)).toBe(true);
    });
  });

  describe('formatAdelayLog', () => {
    it('should format adelay log entry', () => {
      expect(formatAdelayLog(0, 1000, 500)).toBe('  [0] original=1000ms -> adelay=500ms');
    });

    it('should handle different indices', () => {
      expect(formatAdelayLog(5, 2000, 1500)).toBe('  [5] original=2000ms -> adelay=1500ms');
      expect(formatAdelayLog(9, 3000, 2500)).toBe('  [9] original=3000ms -> adelay=2500ms');
    });

    it('should handle zero values', () => {
      expect(formatAdelayLog(0, 0, 0)).toBe('  [0] original=0ms -> adelay=0ms');
    });

    it('should handle large values', () => {
      expect(formatAdelayLog(3, 999999, 888888)).toBe('  [3] original=999999ms -> adelay=888888ms');
    });
  });

  describe('getSegmentsToLog', () => {
    it('should return array length when less than 10', () => {
      const segments: AudioSegment[] = [
        { path: '/a.mp3', startTimeMs: 0, durationMs: 100, type: 'click' },
        { path: '/b.mp3', startTimeMs: 100, durationMs: 100, type: 'click' },
      ];
      expect(getSegmentsToLog(segments)).toBe(2);
    });

    it('should return 10 when array has exactly 10 elements', () => {
      const segments: AudioSegment[] = Array.from({ length: 10 }, (_, i) => ({
        path: `/audio${i}.mp3`,
        startTimeMs: i * 100,
        durationMs: 100,
        type: 'click' as const,
      }));
      expect(getSegmentsToLog(segments)).toBe(10);
    });

    it('should return 10 when array has more than 10 elements', () => {
      const segments: AudioSegment[] = Array.from({ length: 15 }, (_, i) => ({
        path: `/audio${i}.mp3`,
        startTimeMs: i * 100,
        durationMs: 100,
        type: 'click' as const,
      }));
      expect(getSegmentsToLog(segments)).toBe(10);
    });

    it('should return 0 for empty array', () => {
      expect(getSegmentsToLog([])).toBe(0);
    });

    it('should use Math.min for calculation', () => {
      // Verifies we're using min(10, length) not some other logic
      const segments: AudioSegment[] = Array.from({ length: 100 }, (_, i) => ({
        path: `/audio${i}.mp3`,
        startTimeMs: i * 100,
        durationMs: 100,
        type: 'click' as const,
      }));
      expect(getSegmentsToLog(segments)).toBe(10);
    });
  });
});
