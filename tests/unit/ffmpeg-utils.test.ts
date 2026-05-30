import { concatAudioWithGaps, mergeAudioVideo, detectSyncFrame, detectSyncFrameRange, trimSyncFrames } from '../../src/ffmpeg-utils';
import { AudioSegment } from '../../src/types';
import { exec } from 'child_process';

// Mock child_process.exec
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  readdir: jest.fn().mockResolvedValue([]),
  unlink: jest.fn().mockResolvedValue(undefined),
  rmdir: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('P6\n10 10\n255\n' + '\x00'.repeat(300))),
}));

import { mkdir, readdir, unlink, rmdir, readFile } from 'fs/promises';

describe('ffmpeg-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementation - successful execution
    const mockExec = exec as unknown as jest.Mock;
    mockExec.mockImplementation((command, callback) => {
      callback(null, { stdout: '', stderr: '' });
    });
  });

  describe('concatAudioWithGaps', () => {
    it('should throw error when no segments provided', async () => {
      await expect(concatAudioWithGaps([], '/output/audio.wav')).rejects.toThrow(
        'No audio segments provided'
      );
    });

    it('should build correct ffmpeg command for single segment', async () => {
      const mockExec = exec as unknown as jest.Mock;
      const segments: AudioSegment[] = [
        {
          path: '/audio/narration1.mp3',
          startTimeMs: 0,
          durationMs: 2000,
          type: 'narration',
        },
      ];

      const result = await concatAudioWithGaps(segments, '/output/combined.wav');

      expect(mockExec).toHaveBeenCalledTimes(1);
      const command = mockExec.mock.calls[0][0];
      expect(command).toContain('-i "/audio/narration1.mp3"');
      expect(command).toContain('[0]adelay=0|0,volume=1[a0]');
      expect(command).toContain('[a0]amix=inputs=1:normalize=0[out]');
      expect(command).toContain('-map "[out]"');
      expect(command).toContain('"/output/combined.wav"');
      expect(command).toContain('ffmpeg -y');
      expect(result).toBe('/output/combined.wav');
    });

    it('should build correct ffmpeg command for multiple segments', async () => {
      const mockExec = exec as unknown as jest.Mock;
      const segments: AudioSegment[] = [
        {
          path: '/audio/narration1.mp3',
          startTimeMs: 0,
          durationMs: 2000,
          type: 'narration',
        },
        {
          path: '/audio/click.wav',
          startTimeMs: 2500,
          durationMs: 100,
          type: 'click',
        },
        {
          path: '/audio/narration2.mp3',
          startTimeMs: 3000,
          durationMs: 3000,
          type: 'narration',
        },
      ];

      await concatAudioWithGaps(segments, '/output/combined.wav');

      const command = mockExec.mock.calls[0][0];
      expect(command).toContain('-i "/audio/narration1.mp3"');
      expect(command).toContain('-i "/audio/click.wav"');
      expect(command).toContain('-i "/audio/narration2.mp3"');
      expect(command).toContain('[0]adelay=0|0,volume=1[a0]');
      expect(command).toContain('[1]adelay=2500|2500,volume=0.5[a1]');
      expect(command).toContain('[2]adelay=3000|3000,volume=1[a2]');
      expect(command).toContain('[a0][a1][a2]amix=inputs=3:normalize=0[out]');
    });

    it('should use semicolons to separate filter parts in filter_complex', async () => {
      const mockExec = exec as unknown as jest.Mock;
      const segments: AudioSegment[] = [
        {
          path: '/audio/first.mp3',
          startTimeMs: 0,
          durationMs: 1000,
          type: 'narration',
        },
        {
          path: '/audio/second.mp3',
          startTimeMs: 2000,
          durationMs: 1000,
          type: 'narration',
        },
      ];

      await concatAudioWithGaps(segments, '/output/combined.wav');

      const command = mockExec.mock.calls[0][0];
      // Filter parts must be joined with semicolons, not empty string
      // The format should be: [0]adelay=0|0,volume=1[a0];[1]adelay=2000|2000,volume=1[a1];[a0][a1]amix...
      expect(command).toContain('[0]adelay=0|0,volume=1[a0];[1]adelay=2000|2000,volume=1[a1];');
    });

    it('should sort segments by start time', async () => {
      const mockExec = exec as unknown as jest.Mock;
      const segments: AudioSegment[] = [
        {
          path: '/audio/third.mp3',
          startTimeMs: 5000,
          durationMs: 1000,
          type: 'narration',
        },
        {
          path: '/audio/first.mp3',
          startTimeMs: 0,
          durationMs: 1000,
          type: 'narration',
        },
        {
          path: '/audio/second.mp3',
          startTimeMs: 2000,
          durationMs: 1000,
          type: 'click',
        },
      ];

      await concatAudioWithGaps(segments, '/output/combined.wav');

      const command = mockExec.mock.calls[0][0];
      // After sorting, first.mp3 should be input 0, second.mp3 input 1, third.mp3 input 2
      expect(command).toContain('-i "/audio/first.mp3" -i "/audio/second.mp3" -i "/audio/third.mp3"');
      expect(command).toContain('[0]adelay=0|0,volume=1[a0]');
      expect(command).toContain('[1]adelay=2000|2000,volume=0.5[a1]');
      expect(command).toContain('[2]adelay=5000|5000,volume=1[a2]');
    });

    it('should handle segments with keypress type', async () => {
      const mockExec = exec as unknown as jest.Mock;
      const segments: AudioSegment[] = [
        {
          path: '/audio/keypress.wav',
          startTimeMs: 1000,
          durationMs: 50,
          type: 'keypress',
        },
      ];

      await concatAudioWithGaps(segments, '/output/combined.wav');

      const command = mockExec.mock.calls[0][0];
      expect(command).toContain('-i "/audio/keypress.wav"');
      expect(command).toContain('[0]adelay=1000|1000,volume=0.05[a0]');
    });

    it('should handle ffmpeg execution error', async () => {
      const mockExec = exec as unknown as jest.Mock;
      const segments: AudioSegment[] = [
        {
          path: '/audio/narration.mp3',
          startTimeMs: 0,
          durationMs: 2000,
          type: 'narration',
        },
      ];

      mockExec.mockImplementation((command, callback) => {
        callback(new Error('ffmpeg: command not found'), null);
      });

      await expect(concatAudioWithGaps(segments, '/output/combined.wav')).rejects.toThrow(
        'ffmpeg: command not found'
      );
    });

    it('should not mutate original segments array', async () => {
      const segments: AudioSegment[] = [
        {
          path: '/audio/second.mp3',
          startTimeMs: 2000,
          durationMs: 1000,
          type: 'narration',
        },
        {
          path: '/audio/first.mp3',
          startTimeMs: 0,
          durationMs: 1000,
          type: 'narration',
        },
      ];

      const originalOrder = [...segments];
      await concatAudioWithGaps(segments, '/output/combined.wav');

      expect(segments[0].path).toBe(originalOrder[0].path);
      expect(segments[1].path).toBe(originalOrder[1].path);
    });

    it('should handle paths with spaces', async () => {
      const mockExec = exec as unknown as jest.Mock;
      const segments: AudioSegment[] = [
        {
          path: '/audio/my narration file.mp3',
          startTimeMs: 0,
          durationMs: 2000,
          type: 'narration',
        },
      ];

      await concatAudioWithGaps(segments, '/output/my output.wav');

      const command = mockExec.mock.calls[0][0];
      expect(command).toContain('"/audio/my narration file.mp3"');
      expect(command).toContain('"/output/my output.wav"');
    });

    it('should handle large delay values', async () => {
      const mockExec = exec as unknown as jest.Mock;
      const segments: AudioSegment[] = [
        {
          path: '/audio/late.mp3',
          startTimeMs: 3600000, // 1 hour in ms
          durationMs: 2000,
          type: 'narration',
        },
      ];

      await concatAudioWithGaps(segments, '/output/combined.wav');

      const command = mockExec.mock.calls[0][0];
      expect(command).toContain('[0]adelay=3600000|3600000,volume=1[a0]');
    });

    it('should log truncated message when more than 10 segments', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const segments: AudioSegment[] = [];

      // Create 15 segments
      for (let i = 0; i < 15; i++) {
        segments.push({
          path: `/audio/segment-${i}.mp3`,
          startTimeMs: i * 1000,
          durationMs: 500,
          type: 'narration',
        });
      }

      await concatAudioWithGaps(segments, '/output/combined.wav');

      // Should log the truncation message
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('... and 5 more segments')
      );

      consoleSpy.mockRestore();
    });

    // --- Mutation-killing tests for log composition (StringLiteral / template mutants) ---

    it('should log the exact "called with" header message (kills L31:15)', async () => {
      // L31:15 StringLiteral -> empty template would change the header text/values
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const segments: AudioSegment[] = [
        { path: '/audio/n1.mp3', startTimeMs: 0, durationMs: 1000, type: 'narration' },
        { path: '/audio/n2.mp3', startTimeMs: 1000, durationMs: 1000, type: 'narration' },
      ];

      await concatAudioWithGaps(segments, '/output/combined.wav', 250);

      expect(consoleSpy).toHaveBeenCalledWith(
        '\n[FFMPEG] concatAudioWithGaps called with 2 segments, offsetMs=250:'
      );

      consoleSpy.mockRestore();
    });

    it('should log exactly one per-segment line per segment (kills L32:50 block, L34:17 string)', async () => {
      // L32:50 BlockStatement -> {} would emit no per-segment log lines
      // L34:17 StringLiteral -> empty would change the per-segment line text
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const segments: AudioSegment[] = [
        { path: '/audio/only.mp3', startTimeMs: 500, durationMs: 1000, type: 'narration' },
      ];

      await concatAudioWithGaps(segments, '/output/combined.wav', 0);

      expect(consoleSpy).toHaveBeenCalledWith(
        '  [FFMPEG] segment startTimeMs=500 -> adjusted=500, path=only.mp3'
      );

      consoleSpy.mockRestore();
    });

    it('should slice per-segment logs to first 10 segments (kills L32:21 method)', async () => {
      // L32:21 MethodExpression .slice(0,10) -> sortedSegments would log ALL segments
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const segments: AudioSegment[] = [];
      for (let i = 0; i < 12; i++) {
        segments.push({
          path: `/audio/seg-${i}.mp3`,
          startTimeMs: i * 1000,
          durationMs: 500,
          type: 'narration',
        });
      }

      await concatAudioWithGaps(segments, '/output/combined.wav', 0);

      // Segment index 9 (the 10th) should be logged...
      expect(consoleSpy).toHaveBeenCalledWith(
        '  [FFMPEG] segment startTimeMs=9000 -> adjusted=9000, path=seg-9.mp3'
      );
      // ...but segment index 10 and 11 (the 11th/12th) must NOT be logged via the slice loop
      expect(consoleSpy).not.toHaveBeenCalledWith(
        '  [FFMPEG] segment startTimeMs=10000 -> adjusted=10000, path=seg-10.mp3'
      );
      expect(consoleSpy).not.toHaveBeenCalledWith(
        '  [FFMPEG] segment startTimeMs=11000 -> adjusted=11000, path=seg-11.mp3'
      );

      consoleSpy.mockRestore();
    });

    it('should clamp adjusted time to 0 and subtract offset (kills L33:26 max->min, L33:38 -/+)', async () => {
      // L33:26 Math.max(0,...) -> Math.min(0,...) would yield a negative adjusted time
      // L33:38 ArithmeticOperator -/+ would add offset instead of subtracting
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const segments: AudioSegment[] = [
        // startTimeMs(200) - offset(500) = -300 -> max(0,-300) = 0
        { path: '/audio/early.mp3', startTimeMs: 200, durationMs: 1000, type: 'narration' },
      ];

      await concatAudioWithGaps(segments, '/output/combined.wav', 500);

      // Original clamps to 0; min(0,-300) would log -300; subtract->add would log 700
      expect(consoleSpy).toHaveBeenCalledWith(
        '  [FFMPEG] segment startTimeMs=200 -> adjusted=0, path=early.mp3'
      );

      consoleSpy.mockRestore();
    });

    it('should subtract offset (not add) for a positive adjusted time (kills L33:38)', async () => {
      // Reinforces L33:38: startTimeMs(2000) - offset(500) = 1500 (add would be 2500)
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const segments: AudioSegment[] = [
        { path: '/audio/mid.mp3', startTimeMs: 2000, durationMs: 1000, type: 'narration' },
      ];

      await concatAudioWithGaps(segments, '/output/combined.wav', 500);

      expect(consoleSpy).toHaveBeenCalledWith(
        '  [FFMPEG] segment startTimeMs=2000 -> adjusted=1500, path=mid.mp3'
      );

      consoleSpy.mockRestore();
    });

    it('should extract basename via "/" split, not empty split (kills L34:119)', async () => {
      // L34:119 split('/') -> split('') would .pop() the last character only
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const segments: AudioSegment[] = [
        { path: '/deep/nested/audio.mp3', startTimeMs: 0, durationMs: 1000, type: 'narration' },
      ];

      await concatAudioWithGaps(segments, '/output/combined.wav', 0);

      // Correct: path=audio.mp3 ; split('') would give path=3
      expect(consoleSpy).toHaveBeenCalledWith(
        '  [FFMPEG] segment startTimeMs=0 -> adjusted=0, path=audio.mp3'
      );

      consoleSpy.mockRestore();
    });

    it('should NOT log truncation message with exactly 10 segments (kills L36:7 > and conditional-true)', async () => {
      // L36:7 EqualityOperator > -> >= ; ConditionalExpression -> true
      // With exactly 10 segments, original (>10) is false: no truncation log.
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const segments: AudioSegment[] = [];
      for (let i = 0; i < 10; i++) {
        segments.push({
          path: `/audio/seg-${i}.mp3`,
          startTimeMs: i * 1000,
          durationMs: 500,
          type: 'narration',
        });
      }

      await concatAudioWithGaps(segments, '/output/combined.wav', 0);

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('more segments')
      );

      consoleSpy.mockRestore();
    });

    it('should log truncation message with 11 segments (kills L36:7 conditional-false path)', async () => {
      // With 11 segments, original (>10) is true: exactly "... and 1 more segments"
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const segments: AudioSegment[] = [];
      for (let i = 0; i < 11; i++) {
        segments.push({
          path: `/audio/seg-${i}.mp3`,
          startTimeMs: i * 1000,
          durationMs: 500,
          type: 'narration',
        });
      }

      await concatAudioWithGaps(segments, '/output/combined.wav', 0);

      expect(consoleSpy).toHaveBeenCalledWith('  [FFMPEG] ... and 1 more segments');

      consoleSpy.mockRestore();
    });

    it('should subtract offset in adelay filter value (kills L46:38 -/+)', async () => {
      // L46:38 ArithmeticOperator -/+ : adelay should use startTimeMs - offsetMs
      const mockExec = exec as unknown as jest.Mock;
      const segments: AudioSegment[] = [
        { path: '/audio/seg.mp3', startTimeMs: 2000, durationMs: 1000, type: 'narration' },
      ];

      await concatAudioWithGaps(segments, '/output/combined.wav', 500);

      const command = mockExec.mock.calls[0][0];
      // 2000 - 500 = 1500 (add would give 2500)
      expect(command).toContain('[0]adelay=1500|1500,volume=1[a0]');
      expect(command).not.toContain('adelay=2500');
    });

    it('should log the exact "Full command" header (kills L59:15)', async () => {
      // L59:15 StringLiteral -> empty would change the surrounding text of the command log
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const segments: AudioSegment[] = [
        { path: '/audio/seg.mp3', startTimeMs: 0, durationMs: 1000, type: 'narration' },
      ];

      await concatAudioWithGaps(segments, '/output/combined.wav', 0);

      const expectedCommand =
        'ffmpeg -y -i "/audio/seg.mp3" -filter_complex "[0]adelay=0|0,volume=1[a0];[a0]amix=inputs=1:normalize=0[out]" -map "[out]" "/output/combined.wav"';
      expect(consoleSpy).toHaveBeenCalledWith(`\n[FFMPEG] Full command:\n${expectedCommand}\n`);

      consoleSpy.mockRestore();
    });

    it('should log the exact "adelay values" header with offset (kills L62:15)', async () => {
      // L62:15 StringLiteral -> empty would change the adelay-values header text/value
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const segments: AudioSegment[] = [
        { path: '/audio/seg.mp3', startTimeMs: 0, durationMs: 1000, type: 'narration' },
      ];

      await concatAudioWithGaps(segments, '/output/combined.wav', 750);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[FFMPEG] adelay values (first 10), offset=750ms:'
      );

      consoleSpy.mockRestore();
    });

    it('should log adelay value lines bounded by min(10,len) (kills L63 block/conditional/equality, L64, L65)', async () => {
      // L63:19 conditional/equality bound i < Math.min(10, len)
      // L63:65 BlockStatement -> {} would emit no adelay lines
      // L64:26 Math.max->min, L64:38 -/+, L65:17 StringLiteral
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const segments: AudioSegment[] = [];
      for (let i = 0; i < 12; i++) {
        segments.push({
          path: `/audio/seg-${i}.mp3`,
          startTimeMs: i * 1000 + 500,
          durationMs: 500,
          type: 'narration',
        });
      }

      await concatAudioWithGaps(segments, '/output/combined.wav', 200);

      // Index 0: max(0, 500-200)=300 (block/string/arith/max all exercised)
      expect(consoleSpy).toHaveBeenCalledWith('  [0] original=500ms -> adelay=300ms');
      // Index 9 (the 10th) is logged...
      expect(consoleSpy).toHaveBeenCalledWith('  [9] original=9500ms -> adelay=9300ms');
      // ...index 10 must NOT be logged (bound is min(10,len)=10, so i<10)
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[10] original=')
      );

      consoleSpy.mockRestore();
    });

    it('should clamp adelay-value log to 0 when offset exceeds start (kills L64:26 max->min, L64:38 -/+)', async () => {
      // startTimeMs(100) - offset(400) = -300 -> max(0,-300)=0; min would give -300; add gives 500
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const segments: AudioSegment[] = [
        { path: '/audio/seg.mp3', startTimeMs: 100, durationMs: 500, type: 'narration' },
      ];

      await concatAudioWithGaps(segments, '/output/combined.wav', 400);

      expect(consoleSpy).toHaveBeenCalledWith('  [0] original=100ms -> adelay=0ms');

      consoleSpy.mockRestore();
    });
  });

  describe('mergeAudioVideo', () => {
    it('should build correct ffmpeg command for merging audio and video', async () => {
      const mockExec = exec as unknown as jest.Mock;
      const result = await mergeAudioVideo(
        '/video/recording.webm',
        '/audio/combined.wav',
        '/output/final.mp4'
      );

      expect(mockExec).toHaveBeenCalledTimes(1);
      const command = mockExec.mock.calls[0][0];
      expect(command).toBe(
        'ffmpeg -y -i "/video/recording.webm" -i "/audio/combined.wav" -c:v libx264 -preset fast -crf 23 -c:a aac -shortest "/output/final.mp4"'
      );
      expect(result).toBe('/output/final.mp4');
    });

    it('should handle ffmpeg execution error', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        callback(new Error('ffmpeg error: invalid input'), null);
      });

      await expect(
        mergeAudioVideo('/video/recording.webm', '/audio/combined.wav', '/output/final.mp4')
      ).rejects.toThrow('ffmpeg error: invalid input');
    });

    it('should handle paths with spaces', async () => {
      const mockExec = exec as unknown as jest.Mock;
      await mergeAudioVideo(
        '/video/my recording.webm',
        '/audio/my audio.wav',
        '/output/my final video.mp4'
      );

      const command = mockExec.mock.calls[0][0];
      expect(command).toContain('"/video/my recording.webm"');
      expect(command).toContain('"/audio/my audio.wav"');
      expect(command).toContain('"/output/my final video.mp4"');
    });

    it('should use -y flag to overwrite existing files', async () => {
      const mockExec = exec as unknown as jest.Mock;
      await mergeAudioVideo('/video/input.webm', '/audio/input.wav', '/output/output.mp4');

      const command = mockExec.mock.calls[0][0];
      expect(command).toContain('ffmpeg -y');
    });

    it('should use -shortest flag to handle different lengths', async () => {
      const mockExec = exec as unknown as jest.Mock;
      await mergeAudioVideo('/video/input.webm', '/audio/input.wav', '/output/output.mp4');

      const command = mockExec.mock.calls[0][0];
      expect(command).toContain('-shortest');
    });

    it('should re-encode video to H.264 and encode audio as aac', async () => {
      const mockExec = exec as unknown as jest.Mock;
      await mergeAudioVideo('/video/input.webm', '/audio/input.wav', '/output/output.mp4');

      const command = mockExec.mock.calls[0][0];
      expect(command).toContain('-c:v libx264 -preset fast -crf 23');
      expect(command).toContain('-c:a aac');
    });
  });

  describe('detectSyncFrame', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      const mockExec = exec as unknown as jest.Mock;
      // Mock ffprobe to return 25fps
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('ffprobe')) {
          callback(null, { stdout: '25/1\n', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });
    });

    it('should return 0 when no sync frame is detected', async () => {
      // Mock readdir to return no .ppm files
      (readdir as jest.Mock).mockResolvedValue(['file1.txt', 'file2.txt']);

      const result = await detectSyncFrame('/video/test.webm');

      expect(result).toBe(0);
    });

    it('should return timestamp when sync frame is found', async () => {
      // Mock readdir to return frame files
      (readdir as jest.Mock).mockResolvedValue(['frame-001.ppm', 'frame-002.ppm', 'frame-003.ppm']);

      // Create a magenta frame (R=255, G=0, B=255) - PPM format
      // P6 header + RGB pixels for 10x10 image
      const magentaPixels = Buffer.alloc(300); // 10x10x3 RGB
      for (let i = 0; i < 300; i += 3) {
        magentaPixels[i] = 255;     // R
        magentaPixels[i + 1] = 0;   // G
        magentaPixels[i + 2] = 255; // B
      }
      const ppmHeader = Buffer.from('P6\n10 10\n255\n');
      const magentaFrame = Buffer.concat([ppmHeader, magentaPixels]);

      // First frame is not magenta, second is magenta
      const blackPixels = Buffer.alloc(300, 0);
      const blackFrame = Buffer.concat([ppmHeader, blackPixels]);

      (readFile as jest.Mock)
        .mockResolvedValueOnce(blackFrame)
        .mockResolvedValueOnce(magentaFrame);

      const result = await detectSyncFrame('/video/test.webm');

      // Second frame (index 1) at 25fps = 40ms per frame
      expect(result).toBe(40);
    });

    it('should create temp directory and clean up after', async () => {
      (readdir as jest.Mock).mockResolvedValue([]);

      await detectSyncFrame('/video/test.webm');

      expect(mkdir).toHaveBeenCalledWith(
        expect.stringContaining('sync-detect-'),
        { recursive: true }
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      (readdir as jest.Mock)
        .mockResolvedValueOnce([]) // No frames
        .mockRejectedValueOnce(new Error('Cleanup failed')); // Cleanup readdir fails

      // Should not throw
      const result = await detectSyncFrame('/video/test.webm');
      expect(result).toBe(0);
    });

    it('should handle ffprobe output with denominator of 0', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('ffprobe')) {
          callback(null, { stdout: '30/0\n', stderr: '' }); // Invalid denominator
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });
      (readdir as jest.Mock).mockResolvedValue([]);

      const result = await detectSyncFrame('/video/test.webm');
      // Should handle gracefully (30/0 = Infinity, becomes 0ms frame duration)
      expect(result).toBe(0);
    });

    // --- Mutation-killing tests for detectSyncFrame command/log/math ---

    it('should issue exact ffprobe and ffmpeg-extract commands (kills L100/L109 strings)', async () => {
      // L109:24 StringLiteral / L109:89 StringLiteral '%03d.ppm' path token
      const mockExec = exec as unknown as jest.Mock;
      const calls: string[] = [];
      mockExec.mockImplementation((command: string, callback: (e: unknown, r: unknown) => void) => {
        calls.push(command);
        if (command.includes('ffprobe')) {
          callback(null, { stdout: '25/1\n', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });
      (readdir as jest.Mock).mockResolvedValue([]);

      await detectSyncFrame('/video/test.webm');

      const probeCmd = calls.find((c) => c.includes('ffprobe'))!;
      expect(probeCmd).toBe(
        'ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "/video/test.webm"'
      );
      const extractCmd = calls.find((c) => c.startsWith('ffmpeg'))!;
      expect(extractCmd).toContain('ffmpeg -y -i "/video/test.webm" -vframes 60 -q:v 2 "');
      expect(extractCmd).toContain('frame-%03d.ppm"');
    });

    it('should compute fps as num/den with non-unit denominator (kills L103:17 *, L103:24 &&)', async () => {
      // L103:17 num / (den||1) -> num * (den||1); L103:24 (den||1) -> (den&&1)
      // ffprobe '50/2' -> orig fps=25 (frameDuration 40ms). Frame index 1 => 40ms.
      // mut* : fps=100 (10ms) -> 10ms ; mut&& : fps=50 (20ms) -> 20ms
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command: string, callback: (e: unknown, r: unknown) => void) => {
        if (command.includes('ffprobe')) {
          callback(null, { stdout: '50/2\n', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });
      (readdir as jest.Mock).mockResolvedValue(['frame-001.ppm', 'frame-002.ppm']);

      const ppmHeader = Buffer.from('P6\n10 10\n255\n');
      const blackFrame = Buffer.concat([ppmHeader, Buffer.alloc(300, 0)]);
      const magentaPixels = Buffer.alloc(300);
      for (let i = 0; i < 300; i += 3) {
        magentaPixels[i] = 255;
        magentaPixels[i + 1] = 0;
        magentaPixels[i + 2] = 255;
      }
      const magentaFrame = Buffer.concat([ppmHeader, magentaPixels]);
      (readFile as jest.Mock).mockResolvedValueOnce(blackFrame).mockResolvedValueOnce(magentaFrame);

      const result = await detectSyncFrame('/video/test.webm');

      // frame index 1 * (1000/25) = 40ms
      expect(result).toBe(40);
    });

    it('should log the exact "Found sync frame" message (kills L125:21)', async () => {
      // L125:21 StringLiteral -> empty would change the found-frame log text/values
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      (readdir as jest.Mock).mockResolvedValue(['frame-001.ppm']);
      const ppmHeader = Buffer.from('P6\n10 10\n255\n');
      const magentaPixels = Buffer.alloc(300);
      for (let i = 0; i < 300; i += 3) {
        magentaPixels[i] = 255;
        magentaPixels[i + 1] = 0;
        magentaPixels[i + 2] = 255;
      }
      (readFile as jest.Mock).mockResolvedValue(Buffer.concat([ppmHeader, magentaPixels]));

      await detectSyncFrame('/video/test.webm');

      // frame 0 at 25fps -> 0.00ms
      expect(consoleSpy).toHaveBeenCalledWith('[SYNC] Found sync frame at frame 0 (0.00ms)');

      consoleSpy.mockRestore();
    });

    it('should log the exact "No sync frame detected" message (kills L130:17)', async () => {
      // L130:17 StringLiteral -> "" would change the no-sync message
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      (readdir as jest.Mock).mockResolvedValue([]);

      await detectSyncFrame('/video/test.webm');

      expect(consoleSpy).toHaveBeenCalledWith('[SYNC] No sync frame detected, returning 0');

      consoleSpy.mockRestore();
    });

    it('should log exact FPS message and extracted-frames count (kills L106:17, L116:17)', async () => {
      // L106:17 StringLiteral FPS message ; L116:17 StringLiteral extracted-frames message
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      (readdir as jest.Mock).mockResolvedValue(['a.ppm', 'b.ppm', 'c.txt']);
      const ppmHeader = Buffer.from('P6\n10 10\n255\n');
      const blackFrame = Buffer.concat([ppmHeader, Buffer.alloc(300, 0)]);
      (readFile as jest.Mock).mockResolvedValue(blackFrame);

      await detectSyncFrame('/video/test.webm');

      // 25fps -> 40.00ms
      expect(consoleSpy).toHaveBeenCalledWith('[SYNC] Video FPS: 25, frame duration: 40.00ms');
      // Only the 2 .ppm files are counted (c.txt filtered out)
      expect(consoleSpy).toHaveBeenCalledWith('[SYNC] Extracted 2 frames for analysis');

      consoleSpy.mockRestore();
    });

    it('should only process .ppm files (kills L114:24 filter/method, L114:53 string)', async () => {
      // L114:24 .filter(...) removed -> non-ppm files processed; L114:53 '.ppm' -> '' matches all
      (readdir as jest.Mock).mockResolvedValue(['notes.txt', 'frame-001.ppm', 'cover.png']);
      const ppmHeader = Buffer.from('P6\n10 10\n255\n');
      const magentaPixels = Buffer.alloc(300);
      for (let i = 0; i < 300; i += 3) {
        magentaPixels[i] = 255;
        magentaPixels[i + 1] = 0;
        magentaPixels[i + 2] = 255;
      }
      const magentaFrame = Buffer.concat([ppmHeader, magentaPixels]);
      const readFileMock = readFile as jest.Mock;
      readFileMock.mockResolvedValue(magentaFrame);

      const result = await detectSyncFrame('/video/test.webm');

      // Only one .ppm file -> it is frame index 0 -> 0ms. If filter were removed, the
      // first processed file would be notes.txt (also index 0) but readFile must be
      // called exactly once (only the single .ppm), proving filtering occurred.
      expect(result).toBe(0);
      expect(readFileMock).toHaveBeenCalledTimes(1);
      expect(readFileMock.mock.calls[0][0]).toContain('frame-001.ppm');
    });

    it('should count only .ppm files in the extracted-frames log (kills L114:24 filter removal)', async () => {
      // L114:24 .filter(f => f.endsWith('.ppm')) removed -> frameFiles would include the
      // non-.ppm file, so the count logged would be 3 instead of 2. Assert the exact count.
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      // Two .ppm files plus one non-.ppm file. All-black frames so the scan runs to
      // completion (no early return), guaranteeing every frameFiles entry is read.
      (readdir as jest.Mock).mockResolvedValue(['frame-001.ppm', 'frame-002.ppm', 'notes.txt']);
      const ppmHeader = Buffer.from('P6\n10 10\n255\n');
      const blackFrame = Buffer.concat([ppmHeader, Buffer.alloc(300, 0)]);
      const readFileMock = readFile as jest.Mock;
      readFileMock.mockResolvedValue(blackFrame);

      await detectSyncFrame('/video/test.webm');

      // Original: 2 .ppm files. Mutant (no filter): 3 files -> would log "3 frames".
      expect(consoleSpy).toHaveBeenCalledWith('[SYNC] Extracted 2 frames for analysis');
      // And the non-.ppm file must never be read by isFrameMagenta.
      expect(readFileMock).toHaveBeenCalledTimes(2);
      const readPaths = readFileMock.mock.calls.map((c) => c[0] as string);
      expect(readPaths.some((p) => p.includes('notes.txt'))).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should unlink each temp file during cleanup (kills L136:33 block)', async () => {
      // L136:33 BlockStatement -> {} would skip unlinking files
      (readdir as jest.Mock)
        .mockResolvedValueOnce([]) // analysis: no frames
        .mockResolvedValueOnce(['frame-001.ppm', 'frame-002.ppm']); // cleanup listing

      await detectSyncFrame('/video/test.webm');

      expect(unlink).toHaveBeenCalledTimes(2);
      expect((unlink as jest.Mock).mock.calls[0][0]).toContain('frame-001.ppm');
      expect((unlink as jest.Mock).mock.calls[1][0]).toContain('frame-002.ppm');
    });

    it('should sort frame files so order affects the detected index (kills L114:24 .sort() removal)', async () => {
      // L114:24 .filter(...).sort() with .sort() removed: an unsorted readdir listing
      // would change which frame is at index 0 and thus the returned timestamp.
      // Feed readdir an UNSORTED listing where only frame-001 is magenta.
      // Original (sorted): ['frame-001.ppm','frame-002.ppm'] -> magenta at index 0 -> 0ms.
      // Mutant (no sort): ['frame-002.ppm','frame-001.ppm'] -> index 0 non-magenta,
      //   magenta at index 1 -> 1 * 40ms = 40ms.
      (readdir as jest.Mock).mockResolvedValue(['frame-002.ppm', 'frame-001.ppm']);

      const ppmHeader = Buffer.from('P6\n10 10\n255\n');
      const blackFrame = Buffer.concat([ppmHeader, Buffer.alloc(300, 0)]);
      const magentaPixels = Buffer.alloc(300);
      for (let i = 0; i < 300; i += 3) {
        magentaPixels[i] = 255;
        magentaPixels[i + 1] = 0;
        magentaPixels[i + 2] = 255;
      }
      const magentaFrame = Buffer.concat([ppmHeader, magentaPixels]);

      // Switch the returned buffer on the path: only frame-001 reads as magenta.
      (readFile as jest.Mock).mockImplementation((p: string) =>
        Promise.resolve(p.includes('frame-001.ppm') ? magentaFrame : blackFrame)
      );

      const result = await detectSyncFrame('/video/test.webm');

      // Sorted order puts frame-001 (magenta) at index 0 -> timestamp 0.
      expect(result).toBe(0);
    });

    it('should terminate on a malformed PPM header with fewer than 3 newlines', async () => {
      // kills L159 LogicalOperator (&&->||) and ConditionalExpression(->true) via timeout on malformed (<3 newline) header
      (readdir as jest.Mock).mockResolvedValue(['frame-001.ppm']);
      // Only 2 newlines, no maxval line: the header-parse loop never reaches
      // newlineCount === 3, so the i < data.length bound is what terminates it.
      (readFile as jest.Mock).mockResolvedValue(Buffer.from('P6\n1 1\n'));

      const result = await detectSyncFrame('/video/test.webm');

      // Loop terminates; no magenta pixels -> no sync frame detected.
      expect(result).toBe(0);
    });

    it('should name temp dir with sync-detect prefix (kills L95 string via mkdir)', async () => {
      // Reinforce the sync-detect prefix used in tmpdir join
      (readdir as jest.Mock).mockResolvedValue([]);

      await detectSyncFrame('/video/test.webm');

      expect((mkdir as jest.Mock).mock.calls[0][0]).toMatch(/sync-detect-\d+/);
    });
  });

  describe('isFrameMagenta (via detectSyncFrame boundaries)', () => {
    const ppmHeader = Buffer.from('P6\n10 10\n255\n');

    /** Build a single-frame PPM buffer of `count` pixels with the given RGB triples. */
    function buildFrame(triples: Array<[number, number, number]>): Buffer {
      const px = Buffer.alloc(triples.length * 3);
      triples.forEach(([r, g, b], idx) => {
        px[idx * 3] = r;
        px[idx * 3 + 1] = g;
        px[idx * 3 + 2] = b;
      });
      return Buffer.concat([ppmHeader, px]);
    }
    function rep(rgb: [number, number, number], n: number): Array<[number, number, number]> {
      return Array.from({ length: n }, () => rgb);
    }

    beforeEach(() => {
      jest.clearAllMocks();
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command: string, callback: (e: unknown, r: unknown) => void) => {
        if (command.includes('ffprobe')) {
          callback(null, { stdout: '25/1\n', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });
      (readdir as jest.Mock).mockResolvedValue(['frame-001.ppm']);
    });

    // A single frame at index 0 returns 0ms whether or not it is the sync frame, so
    // classify by inspecting the "Found sync frame" / "No sync" console output instead.
    async function classifyViaLog(frame: Buffer): Promise<boolean> {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      (readFile as jest.Mock).mockResolvedValue(frame);
      await detectSyncFrame('/video/test.webm');
      const found = consoleSpy.mock.calls.some(
        (c) => typeof c[0] === 'string' && (c[0] as string).includes('Found sync frame')
      );
      consoleSpy.mockRestore();
      return found;
    }

    it('rejects a pixel exactly at the R tolerance boundary (kills L182:20 <= and conditional-true)', async () => {
      // |225 - 255| = 30, original uses < 30 -> NOT a match; <=30 would match.
      // conditional-true would force rMatch true.
      const frame = buildFrame(rep([225, 0, 255], 100));
      expect(await classifyViaLog(frame)).toBe(false);
    });

    it('matches a pixel just inside the R tolerance (boundary companion for L182)', async () => {
      // |226 - 255| = 29 < 30 -> match; ensures the < comparison is genuinely exercised true side.
      const frame = buildFrame(rep([226, 0, 255], 100));
      expect(await classifyViaLog(frame)).toBe(true);
    });

    it('rejects a pixel exactly at the G tolerance boundary (kills L183:20 <= and conditional-true)', async () => {
      // g = 30, original g < 30 -> NOT a match; <=30 would match.
      const frame = buildFrame(rep([255, 30, 255], 100));
      expect(await classifyViaLog(frame)).toBe(false);
    });

    it('matches a pixel just inside the G tolerance (boundary companion for L183)', async () => {
      const frame = buildFrame(rep([255, 29, 255], 100));
      expect(await classifyViaLog(frame)).toBe(true);
    });

    it('rejects a pixel exactly at the B tolerance boundary (kills L184:20 <= and conditional-true)', async () => {
      // |225 - 255| = 30, original b uses < 30 -> NOT a match; <=30 would match.
      const frame = buildFrame(rep([255, 0, 225], 100));
      expect(await classifyViaLog(frame)).toBe(false);
    });

    it('matches a pixel just inside the B tolerance (boundary companion for L184)', async () => {
      const frame = buildFrame(rep([255, 0, 226], 100));
      expect(await classifyViaLog(frame)).toBe(true);
    });

    it('does not match pixels where only B is in range (kills L186 rMatch&&gMatch||bMatch)', async () => {
      // [0,255,255]: rMatch false, gMatch false, bMatch true.
      // orig: F&&F&&T = false. mutant (rMatch&&gMatch)||bMatch = T -> would match.
      const frame = buildFrame(rep([0, 255, 255], 100));
      expect(await classifyViaLog(frame)).toBe(false);
    });

    it('does not match pixels where R/B match but G is out of range (kills L186 rMatch||gMatch)', async () => {
      // [255,255,255]: rMatch true, gMatch false, bMatch true.
      // orig: T&&F&&T = false. mutant (rMatch||gMatch)&&bMatch = T -> would match.
      const frame = buildFrame(rep([255, 255, 255], 100));
      expect(await classifyViaLog(frame)).toBe(false);
    });

    it('does not classify a fully black frame as magenta (kills L186 conditional-true)', async () => {
      // conditional-true forces every pixel to count -> ratio 1.0 -> would match.
      const frame = buildFrame(rep([0, 0, 0], 100));
      expect(await classifyViaLog(frame)).toBe(false);
    });

    it('treats ratio exactly at the threshold as a match (kills L192:10 >= -> >)', async () => {
      // 80/100 = 0.8 exactly. orig >= 0.8 -> true; mutant > 0.8 -> false.
      const frame = buildFrame([...rep([255, 0, 255], 80), ...rep([0, 0, 0], 20)]);
      expect(await classifyViaLog(frame)).toBe(true);
    });

    it('rejects ratio just below the threshold (threshold companion for L192)', async () => {
      // 79/100 = 0.79 < 0.8 -> not a match.
      const frame = buildFrame([...rep([255, 0, 255], 79), ...rep([0, 0, 0], 21)]);
      expect(await classifyViaLog(frame)).toBe(false);
    });

    it('computes magentaRatio via division, not multiplication (kills L191:24 /->*)', async () => {
      // 2-pixel frame, 1 magenta: 1/2 = 0.5 (< 0.8 -> false). 1*2 = 2 (>= 0.8 -> true).
      const frame = buildFrame([[255, 0, 255], [0, 0, 0]]);
      expect(await classifyViaLog(frame)).toBe(false);
    });

    it('parses the PPM header by counting newlines, not other bytes (kills L160:9 === -> !==)', async () => {
      // 80% magenta body aligned to the real header end (13 bytes). With === parse,
      // headerEnd=13 -> ratio 0.8 -> match. With !== parse, headerEnd shifts to ~4,
      // pulling in 3 non-magenta header bytes -> ratio 80/103 < 0.8 -> no match.
      const frame = buildFrame([...rep([255, 0, 255], 80), ...rep([0, 0, 0], 20)]);
      expect(await classifyViaLog(frame)).toBe(true);
    });
  });

  describe('detectSyncFrameRange', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('ffprobe')) {
          callback(null, { stdout: '30/1\n', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });
    });

    it('should return -1 for both frames when no sync marker found', async () => {
      (readdir as jest.Mock).mockResolvedValue(['frame-001.ppm', 'frame-002.ppm']);

      // All black frames
      const ppmHeader = Buffer.from('P6\n10 10\n255\n');
      const blackPixels = Buffer.alloc(300, 0);
      const blackFrame = Buffer.concat([ppmHeader, blackPixels]);

      (readFile as jest.Mock).mockResolvedValue(blackFrame);

      const result = await detectSyncFrameRange('/video/test.webm');

      expect(result.firstSyncFrame).toBe(-1);
      expect(result.lastSyncFrame).toBe(-1);
    });

    it('should find sync frame range correctly', async () => {
      (readdir as jest.Mock).mockResolvedValue([
        'frame-001.ppm', 'frame-002.ppm', 'frame-003.ppm',
        'frame-004.ppm', 'frame-005.ppm'
      ]);

      const ppmHeader = Buffer.from('P6\n10 10\n255\n');
      const blackPixels = Buffer.alloc(300, 0);
      const blackFrame = Buffer.concat([ppmHeader, blackPixels]);

      const magentaPixels = Buffer.alloc(300);
      for (let i = 0; i < 300; i += 3) {
        magentaPixels[i] = 255;
        magentaPixels[i + 1] = 0;
        magentaPixels[i + 2] = 255;
      }
      const magentaFrame = Buffer.concat([ppmHeader, magentaPixels]);

      // Frames: black, magenta, magenta, magenta, black
      (readFile as jest.Mock)
        .mockResolvedValueOnce(blackFrame)
        .mockResolvedValueOnce(magentaFrame)
        .mockResolvedValueOnce(magentaFrame)
        .mockResolvedValueOnce(magentaFrame)
        .mockResolvedValueOnce(blackFrame);

      const result = await detectSyncFrameRange('/video/test.webm');

      expect(result.firstSyncFrame).toBe(1);
      expect(result.lastSyncFrame).toBe(3);
      expect(result.frameDurationMs).toBeCloseTo(33.33, 1);
    });

    it('should return correct frameDurationMs based on fps', async () => {
      (readdir as jest.Mock).mockResolvedValue([]);

      const result = await detectSyncFrameRange('/video/test.webm');

      // 30fps = 33.33ms per frame
      expect(result.frameDurationMs).toBeCloseTo(33.33, 1);
    });

    it('should handle ffprobe output with denominator of 0', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('ffprobe')) {
          callback(null, { stdout: '30/0\n', stderr: '' }); // Invalid denominator
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });
      (readdir as jest.Mock).mockResolvedValue([]);

      const result = await detectSyncFrameRange('/video/test.webm');

      // Should handle gracefully (30/0 -> uses denominator of 1 -> 30fps)
      expect(result.frameDurationMs).toBeCloseTo(33.33, 1);
    });

    // --- Mutation-killing tests for detectSyncFrameRange ---

    it('should create temp dir with recursive:true and sync-range prefix (kills L206:34, L207:24, L207:37)', async () => {
      // L206:34 StringLiteral 'sync-range-' prefix
      // L207:24 ObjectLiteral -> {} ; L207:37 BooleanLiteral true -> false
      (readdir as jest.Mock).mockResolvedValue([]);

      await detectSyncFrameRange('/video/test.webm');

      expect(mkdir).toHaveBeenCalledWith(
        expect.stringMatching(/sync-range-\d+/),
        { recursive: true }
      );
    });

    it('should issue exact ffprobe and ffmpeg-extract commands (kills L211/L218 strings)', async () => {
      // L218:24 StringLiteral / L218:89 StringLiteral frame extraction command + path token
      const mockExec = exec as unknown as jest.Mock;
      const calls: string[] = [];
      mockExec.mockImplementation((command: string, callback: (e: unknown, r: unknown) => void) => {
        calls.push(command);
        if (command.includes('ffprobe')) {
          callback(null, { stdout: '30/1\n', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });
      (readdir as jest.Mock).mockResolvedValue([]);

      await detectSyncFrameRange('/video/test.webm');

      const probeCmd = calls.find((c) => c.includes('ffprobe'))!;
      expect(probeCmd).toBe(
        'ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "/video/test.webm"'
      );
      const extractCmd = calls.find((c) => c.startsWith('ffmpeg'))!;
      expect(extractCmd).toContain('ffmpeg -y -i "/video/test.webm" -vframes 60 -q:v 2 "');
      expect(extractCmd).toContain('frame-%03d.ppm"');
    });

    it('should compute frameDurationMs as num/den with non-unit denominator (kills L214:17 *)', async () => {
      // L214:17 num / (den||1) -> num * (den||1). '50/2' -> orig fps 25 (40ms); mut* fps 100 (10ms).
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command: string, callback: (e: unknown, r: unknown) => void) => {
        if (command.includes('ffprobe')) {
          callback(null, { stdout: '50/2\n', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });
      (readdir as jest.Mock).mockResolvedValue([]);

      const result = await detectSyncFrameRange('/video/test.webm');

      expect(result.frameDurationMs).toBe(40);
    });

    it('should only process .ppm files for the range scan (kills L222:24 filter/method, L222:53 string)', async () => {
      (readdir as jest.Mock).mockResolvedValue(['readme.md', 'frame-001.ppm', 'thumb.jpg']);
      const ppmHeader = Buffer.from('P6\n10 10\n255\n');
      const magentaPixels = Buffer.alloc(300);
      for (let i = 0; i < 300; i += 3) {
        magentaPixels[i] = 255;
        magentaPixels[i + 1] = 0;
        magentaPixels[i + 2] = 255;
      }
      const magentaFrame = Buffer.concat([ppmHeader, magentaPixels]);
      const readFileMock = readFile as jest.Mock;
      readFileMock.mockResolvedValue(magentaFrame);

      const result = await detectSyncFrameRange('/video/test.webm');

      // Only the single .ppm is scanned -> first=last=0; non-ppm files must not be read.
      expect(result.firstSyncFrame).toBe(0);
      expect(result.lastSyncFrame).toBe(0);
      expect(readFileMock).toHaveBeenCalledTimes(1);
      expect(readFileMock.mock.calls[0][0]).toContain('frame-001.ppm');
    });

    it('should scan only .ppm files so lastSyncFrame reflects the .ppm count (kills L222:24 filter removal)', async () => {
      // L222:24 .filter(f => f.endsWith('.ppm')) removed -> the non-.ppm file (sorted
      // first as 'extra.txt') would be scanned too, shifting frame indices and read count.
      // Two contiguous magenta .ppm files plus one non-.ppm file, all returning magenta.
      (readdir as jest.Mock).mockResolvedValue(['frame-001.ppm', 'frame-002.ppm', 'extra.txt']);
      const ppmHeader = Buffer.from('P6\n10 10\n255\n');
      const magentaPixels = Buffer.alloc(300);
      for (let i = 0; i < 300; i += 3) {
        magentaPixels[i] = 255;
        magentaPixels[i + 1] = 0;
        magentaPixels[i + 2] = 255;
      }
      const magentaFrame = Buffer.concat([ppmHeader, magentaPixels]);
      const readFileMock = readFile as jest.Mock;
      readFileMock.mockResolvedValue(magentaFrame);

      const result = await detectSyncFrameRange('/video/test.webm');

      // Original: 2 .ppm frames (indices 0,1) -> first=0, last=1, exactly 2 reads.
      // Mutant (no filter): sorted ['extra.txt','frame-001.ppm','frame-002.ppm'], all
      // magenta -> first=0, last=2, 3 reads.
      expect(result.firstSyncFrame).toBe(0);
      expect(result.lastSyncFrame).toBe(1);
      expect(readFileMock).toHaveBeenCalledTimes(2);
      const readPaths = readFileMock.mock.calls.map((c) => c[0] as string);
      expect(readPaths.some((p) => p.includes('extra.txt'))).toBe(false);
    });

    it('should sort frame files so order affects the detected range (kills L222:24 .sort() removal)', async () => {
      // L222:24 .filter(...).sort() with .sort() removed: an unsorted readdir listing
      // changes the scanned order, shifting firstSyncFrame/lastSyncFrame.
      // Unsorted listing: frame-001 & frame-002 are magenta, frame-003 is non-magenta.
      // Original (sorted [001,002,003]): first=0, last=1, then 003 non-magenta with
      //   firstSyncFrame!=-1 -> break. Result {first:0, last:1}.
      // Mutant (no sort [003,001,002]): 003 non-magenta (no break, first still -1),
      //   001 magenta -> first=1, 002 magenta -> last=2. Result {first:1, last:2}.
      (readdir as jest.Mock).mockResolvedValue(['frame-003.ppm', 'frame-001.ppm', 'frame-002.ppm']);

      const ppmHeader = Buffer.from('P6\n10 10\n255\n');
      const blackFrame = Buffer.concat([ppmHeader, Buffer.alloc(300, 0)]);
      const magentaPixels = Buffer.alloc(300);
      for (let i = 0; i < 300; i += 3) {
        magentaPixels[i] = 255;
        magentaPixels[i + 1] = 0;
        magentaPixels[i + 2] = 255;
      }
      const magentaFrame = Buffer.concat([ppmHeader, magentaPixels]);

      // frame-001 and frame-002 magenta; frame-003 non-magenta.
      (readFile as jest.Mock).mockImplementation((p: string) =>
        Promise.resolve(
          p.includes('frame-001.ppm') || p.includes('frame-002.ppm') ? magentaFrame : blackFrame
        )
      );

      const result = await detectSyncFrameRange('/video/test.webm');

      // Sorted order: [001(m),002(m),003(black)] -> first=0, last=1 (break at 003).
      expect(result.firstSyncFrame).toBe(0);
      expect(result.lastSyncFrame).toBe(1);
    });

    it('should break after the sync run ends (kills L236:18 conditional-false, L236:41 block)', async () => {
      // L236:18 else-if condition -> false ; L236:41 block -> {} : both would prevent the
      // early break, so a later magenta run would be (incorrectly) folded into lastSyncFrame.
      (readdir as jest.Mock).mockResolvedValue([
        'frame-001.ppm', 'frame-002.ppm', 'frame-003.ppm', 'frame-004.ppm', 'frame-005.ppm',
      ]);
      const ppmHeader = Buffer.from('P6\n10 10\n255\n');
      const blackFrame = Buffer.concat([ppmHeader, Buffer.alloc(300, 0)]);
      const magentaPixels = Buffer.alloc(300);
      for (let i = 0; i < 300; i += 3) {
        magentaPixels[i] = 255;
        magentaPixels[i + 1] = 0;
        magentaPixels[i + 2] = 255;
      }
      const magentaFrame = Buffer.concat([ppmHeader, magentaPixels]);

      // magenta, black, then magenta again -> original breaks at the black after the first run.
      (readFile as jest.Mock)
        .mockResolvedValueOnce(magentaFrame)
        .mockResolvedValueOnce(blackFrame)
        .mockResolvedValueOnce(magentaFrame)
        .mockResolvedValueOnce(magentaFrame)
        .mockResolvedValueOnce(magentaFrame);

      const result = await detectSyncFrameRange('/video/test.webm');

      // Original: first=0, last=0 (breaks at frame 1). Without break: last would be 4.
      expect(result.firstSyncFrame).toBe(0);
      expect(result.lastSyncFrame).toBe(0);
    });

    it('should unlink each temp file during cleanup (kills L243/L245/L247 blocks)', async () => {
      // L243:13 try block, L245:9 for-loop body, L247:33 await unlink block
      (readdir as jest.Mock)
        .mockResolvedValueOnce([]) // scan: no frames
        .mockResolvedValueOnce(['frame-001.ppm', 'frame-002.ppm']); // cleanup listing

      await detectSyncFrameRange('/video/test.webm');

      expect(unlink).toHaveBeenCalledTimes(2);
      expect((unlink as jest.Mock).mock.calls[0][0]).toContain('frame-001.ppm');
      expect((unlink as jest.Mock).mock.calls[1][0]).toContain('frame-002.ppm');
      expect(rmdir).toHaveBeenCalledTimes(1);
    });
  });

  describe('trimSyncFrames', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });
    });

    it('should copy video without trimming when framesToTrim is 0', async () => {
      const mockExec = exec as unknown as jest.Mock;

      await trimSyncFrames('/input/video.webm', '/output/video.mp4', 0, 40);

      const command = mockExec.mock.calls[0][0];
      expect(command).toContain('ffmpeg -y -i "/input/video.webm"');
      expect(command).toContain('-c:v libx264 -preset fast -crf 23');
      expect(command).not.toContain('-ss');
    });

    it('should copy video without trimming when framesToTrim is negative', async () => {
      const mockExec = exec as unknown as jest.Mock;

      await trimSyncFrames('/input/video.webm', '/output/video.mp4', -5, 40);

      const command = mockExec.mock.calls[0][0];
      expect(command).not.toContain('-ss');
    });

    it('should trim video with correct start time', async () => {
      const mockExec = exec as unknown as jest.Mock;

      // 10 frames at 40ms each = 400ms = 0.4s
      await trimSyncFrames('/input/video.webm', '/output/video.mp4', 10, 40);

      const command = mockExec.mock.calls[0][0];
      expect(command).toContain('-ss 0.400');
      expect(command).toContain('-c:v libx264 -preset fast -crf 23');
    });

    it('should use correct output path', async () => {
      const mockExec = exec as unknown as jest.Mock;

      await trimSyncFrames('/input/video.webm', '/my/output/final.mp4', 5, 33.33);

      const command = mockExec.mock.calls[0][0];
      expect(command).toContain('"/my/output/final.mp4"');
    });

    it('should handle ffmpeg execution error', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        callback(new Error('ffmpeg failed'), null);
      });

      await expect(trimSyncFrames('/input/video.webm', '/output/video.mp4', 5, 40)).rejects.toThrow('ffmpeg failed');
    });

    // --- Mutation-killing tests for trimSyncFrames ---

    it('should issue the exact copy command when no trimming needed (kills L272 string)', async () => {
      const mockExec = exec as unknown as jest.Mock;

      await trimSyncFrames('/input/video.webm', '/output/video.mp4', 0, 40);

      const command = mockExec.mock.calls[0][0];
      expect(command).toBe(
        'ffmpeg -y -i "/input/video.webm" -c:v libx264 -preset fast -crf 23 "/output/video.mp4"'
      );
    });

    it('should issue the exact trim command with -ss start time (kills L285 string)', async () => {
      const mockExec = exec as unknown as jest.Mock;

      // 10 frames at 40ms = 400ms = 0.400s
      await trimSyncFrames('/input/video.webm', '/output/video.mp4', 10, 40);

      const command = mockExec.mock.calls[0][0];
      expect(command).toBe(
        'ffmpeg -y -i "/input/video.webm" -ss 0.400 -c:v libx264 -preset fast -crf 23 "/output/video.mp4"'
      );
    });

    it('should log the exact "Trimming" message (kills L280:15)', async () => {
      // L280:15 StringLiteral -> empty would change the trimming log text/values
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await trimSyncFrames('/input/video.webm', '/output/video.mp4', 10, 40);

      expect(consoleSpy).toHaveBeenCalledWith('[SYNC] Trimming 10 frames (0.400s) from video');

      consoleSpy.mockRestore();
    });
  });
});
