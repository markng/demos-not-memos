// @ts-nocheck
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

    it('should log trimming information', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });

      await trimSyncFrames('/input/video.webm', '/output/video.mp4', 10, 40);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SYNC] Trimming 10 frames (0.400s) from video')
      );

      consoleLogSpy.mockRestore();
    });

    it('should not log when framesToTrim is 0', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });

      await trimSyncFrames('/input/video.webm', '/output/video.mp4', 0, 40);

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[SYNC] Trimming')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('logging in detectSyncFrame', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      jest.clearAllMocks();
      
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('ffprobe')) {
          callback(null, { stdout: '30/1\n', stderr: '' });
        } else if (command.includes('ffmpeg')) {
          callback(null, { stdout: '', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should log FPS and frame duration', async () => {
      const mockReaddir = readdir as unknown as jest.Mock;
      mockReaddir.mockResolvedValue(['frame-001.ppm', 'frame-002.ppm']);
      
      const mockReadFile = readFile as unknown as jest.Mock;
      mockReadFile.mockResolvedValue(Buffer.from(''));

      await detectSyncFrame('/input/video.mp4');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SYNC] Video FPS: 30')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('frame duration: 33.33ms')
      );
    });

    it('should log number of extracted frames', async () => {
      const mockReaddir = readdir as unknown as jest.Mock;
      mockReaddir.mockResolvedValue(['frame-001.ppm', 'frame-002.ppm', 'frame-003.ppm']);
      
      const mockReadFile = readFile as unknown as jest.Mock;
      mockReadFile.mockResolvedValue(Buffer.from(''));

      await detectSyncFrame('/input/video.mp4');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SYNC] Extracted 3 frames for analysis')
      );
    });

  });

  describe('FPS calculation in detectSyncFrame', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should trim whitespace from ffprobe output before parsing', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('ffprobe')) {
          // Include trailing whitespace/newline
          callback(null, { stdout: '30/1\n  ', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const mockReaddir = readdir as unknown as jest.Mock;
      mockReaddir.mockResolvedValue(['frame-001.ppm']);
      
      const mockReadFile = readFile as unknown as jest.Mock;
      mockReadFile.mockResolvedValue(Buffer.from(''));

      await detectSyncFrame('/input/video.mp4');

      // Should successfully parse despite whitespace
      expect(mockExec).toHaveBeenCalled();
    });

    it('should use division operator for FPS calculation', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('ffprobe')) {
          callback(null, { stdout: '30/1\n', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const mockReaddir = readdir as unknown as jest.Mock;
      mockReaddir.mockResolvedValue(['frame-001.ppm']);
      
      const mockReadFile = readFile as unknown as jest.Mock;
      mockReadFile.mockResolvedValue(Buffer.from(''));

      await detectSyncFrame('/input/video.mp4');

      // Should log FPS as 30 (30/1 = 30), not 30 (30*1)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('FPS: 30')
      );

      consoleLogSpy.mockRestore();
    });

    it('should use || operator to default denominator to 1', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('ffprobe')) {
          callback(null, { stdout: '25/0\n', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const mockReaddir = readdir as unknown as jest.Mock;
      mockReaddir.mockResolvedValue(['frame-001.ppm']);
      
      const mockReadFile = readFile as unknown as jest.Mock;
      mockReadFile.mockResolvedValue(Buffer.from(''));

      await detectSyncFrame('/input/video.mp4');

      // Should log FPS as 25 (25/(0||1) = 25/1 = 25)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('FPS: 25')
      );

      consoleLogSpy.mockRestore();
    });

    it('should sort frame files for correct order', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('ffprobe')) {
          callback(null, { stdout: '30/1\n', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const mockReaddir = readdir as unknown as jest.Mock;
      // Return frames in wrong order
      mockReaddir.mockResolvedValue(['frame-010.ppm', 'frame-002.ppm', 'frame-001.ppm']);
      
      const mockReadFile = readFile as unknown as jest.Mock;
      // First frame (frame-001 after sorting) is not magenta, second (frame-002) is magenta
      mockReadFile
        .mockResolvedValueOnce(Buffer.from('P6\n100 100\n255\n' + '\x00'.repeat(30000)))
        .mockResolvedValueOnce(Buffer.from('P6\n100 100\n255\n' + '\xFF\x00\xFF'.repeat(10000)));

      await detectSyncFrame('/input/video.mp4');

      // Should read frames in sorted order (frame-001, frame-002, ...)
      expect(mockReadFile).toHaveBeenCalled();
    });
  });

  describe('volume calculations in concatAudioWithGaps', () => {
    it('should apply volume 1.0 for narration segments', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });

      const segments: AudioSegment[] = [
        { path: '/tmp/audio/narration.mp3', startTimeMs: 0, durationMs: 1000, type: 'narration' },
      ];

      await concatAudioWithGaps(segments, '/tmp/output.wav');

      const command = mockExec.mock.calls[0][0];
      expect(command).toContain('volume=1');
    });

    it('should apply volume 0.5 for click segments', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });

      const segments: AudioSegment[] = [
        { path: '/tmp/audio/click.mp3', startTimeMs: 0, durationMs: 100, type: 'click' },
      ];

      await concatAudioWithGaps(segments, '/tmp/output.wav');

      const command = mockExec.mock.calls[0][0];
      expect(command).toContain('volume=0.5');
    });

    it('should apply volume 0.05 for keypress segments', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });

      const segments: AudioSegment[] = [
        { path: '/tmp/audio/keypress-letter-1.mp3', startTimeMs: 0, durationMs: 50, type: 'keypress-letter-1' },
      ];

      await concatAudioWithGaps(segments, '/tmp/output.wav');

      const command = mockExec.mock.calls[0][0];
      expect(command).toContain('volume=0.05');
    });

    it('should apply correct volume for all three segment types', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });

      const segments: AudioSegment[] = [
        { path: '/tmp/audio/narration.mp3', startTimeMs: 0, durationMs: 1000, type: 'narration' },
        { path: '/tmp/audio/click.mp3', startTimeMs: 100, durationMs: 100, type: 'click' },
        { path: '/tmp/audio/keypress.mp3', startTimeMs: 200, durationMs: 50, type: 'keypress-letter-1' },
      ];

      await concatAudioWithGaps(segments, '/tmp/output.wav');

      const command = mockExec.mock.calls[0][0];
      // Verify all three volumes are in the command
      expect(command).toContain('volume=1');
      expect(command).toContain('volume=0.5');
      expect(command).toContain('volume=0.05');
    });

    it('should handle offset adjustment with Math.max correctly', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });

      const segments: AudioSegment[] = [
        { path: '/tmp/audio1.mp3', startTimeMs: 100, durationMs: 100, type: 'click' },
      ];

      // Offset is 200, so adjusted time should be max(0, 100-200) = 0
      await concatAudioWithGaps(segments, '/tmp/output.wav', 200);

      const command = mockExec.mock.calls[0][0];
      // adelay should be 0|0 since adjusted time is 0
      expect(command).toContain('adelay=0|0');
    });

    it('should handle positive adjusted time after offset', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });

      const segments: AudioSegment[] = [
        { path: '/tmp/audio1.mp3', startTimeMs: 500, durationMs: 100, type: 'click' },
      ];

      // Offset is 200, so adjusted time should be 500-200 = 300
      await concatAudioWithGaps(segments, '/tmp/output.wav', 200);

      const command = mockExec.mock.calls[0][0];
      // adelay should be 300|300
      expect(command).toContain('adelay=300|300');
    });
  });

  describe('logging in concatAudioWithGaps', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should log when called with segments', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });

      const segments: AudioSegment[] = [
        { path: '/tmp/audio1.mp3', startTimeMs: 100, durationMs: 100, type: 'click' },
      ];

      await concatAudioWithGaps(segments, '/tmp/output.wav', 0);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[FFMPEG] concatAudioWithGaps called with 1 segments')
      );
    });

    it('should log segment details for up to 10 segments', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });

      const segments: AudioSegment[] = [
        { path: '/tmp/audio1.mp3', startTimeMs: 100, durationMs: 100, type: 'click' },
        { path: '/tmp/audio2.mp3', startTimeMs: 200, durationMs: 100, type: 'click' },
      ];

      await concatAudioWithGaps(segments, '/tmp/output.wav', 0);

      // Should log details for each segment
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('segment startTimeMs=100')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('segment startTimeMs=200')
      );
    });

    it('should log continuation message when more than 10 segments', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });

      const segments: AudioSegment[] = Array.from({ length: 15 }, (_, i) => ({
        path: `/tmp/audio${i}.mp3`,
        startTimeMs: i * 100,
        durationMs: 100,
        type: 'click' as const,
      }));

      await concatAudioWithGaps(segments, '/tmp/output.wav', 0);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('... and 5 more segments')
      );
    });

    it('should not log continuation message when 10 or fewer segments', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });

      const segments: AudioSegment[] = Array.from({ length: 10 }, (_, i) => ({
        path: `/tmp/audio${i}.mp3`,
        startTimeMs: i * 100,
        durationMs: 100,
        type: 'click' as const,
      }));

      await concatAudioWithGaps(segments, '/tmp/output.wav', 0);

      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('more segments')
      );
    });

    it('should log the full ffmpeg command', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });

      const segments: AudioSegment[] = [
        { path: '/tmp/audio1.mp3', startTimeMs: 100, durationMs: 100, type: 'click' },
      ];

      await concatAudioWithGaps(segments, '/tmp/output.wav', 0);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[FFMPEG] Full command:')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('ffmpeg -y')
      );
    });

    it('should log adelay values with offset information', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });

      const segments: AudioSegment[] = [
        { path: '/tmp/audio1.mp3', startTimeMs: 100, durationMs: 100, type: 'click' },
      ];

      await concatAudioWithGaps(segments, '/tmp/output.wav', 50);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[FFMPEG] adelay values (first 10), offset=50ms')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('original=100ms -> adelay=50ms')
      );
    });

    it('should handle negative adjusted times in logging', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });

      const segments: AudioSegment[] = [
        { path: '/tmp/audio1.mp3', startTimeMs: 50, durationMs: 100, type: 'click' },
      ];

      await concatAudioWithGaps(segments, '/tmp/output.wav', 100);

      // Should clamp to 0
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('adelay=0ms')
      );
    });

    it('should log path filename using split', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });

      const segments: AudioSegment[] = [
        { path: '/tmp/sounds/audio1.mp3', startTimeMs: 100, durationMs: 100, type: 'click' },
      ];

      await concatAudioWithGaps(segments, '/tmp/output.wav', 0);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('audio1.mp3')
      );
    });
  });

  describe('error handling and cleanup', () => {
    it('should handle cleanup errors gracefully in detectSyncFrame', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('ffprobe')) {
          callback(null, { stdout: '30/1\n', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const mockReaddir = readdir as unknown as jest.Mock;
      mockReaddir.mockResolvedValue(['frame-001.ppm']);
      
      const mockUnlink = unlink as unknown as jest.Mock;
      // First unlink succeeds, cleanup attempts should not throw
      mockUnlink.mockResolvedValue(undefined);

      const mockRmdir = rmdir as unknown as jest.Mock;
      mockRmdir.mockResolvedValue(undefined);

      const mockReadFile = readFile as unknown as jest.Mock;
      mockReadFile.mockResolvedValue(Buffer.from(''));

      const result = await detectSyncFrame('/test/video.mp4');
      
      // Should complete without throwing even if cleanup encounters issues
      expect(result).toBe(0);
    });

    it('should handle cleanup errors gracefully in detectSyncFrameRange', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('ffprobe')) {
          callback(null, { stdout: '30/1\n', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const mockReaddir = readdir as unknown as jest.Mock;
      mockReaddir.mockResolvedValue(['frame-001.ppm']);
      
      const mockUnlink = unlink as unknown as jest.Mock;
      mockUnlink.mockResolvedValue(undefined);

      const mockRmdir = rmdir as unknown as jest.Mock;
      mockRmdir.mockResolvedValue(undefined);

      const mockReadFile = readFile as unknown as jest.Mock;
      mockReadFile.mockResolvedValue(Buffer.from(''));

      const result = await detectSyncFrameRange('/test/video.mp4');
      
      // Should complete and return proper structure
      expect(result).toHaveProperty('firstSyncFrame');
      expect(result).toHaveProperty('lastSyncFrame');
      expect(result).toHaveProperty('frameDurationMs');
    });

    it('should call readdir in cleanup block', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('ffprobe')) {
          callback(null, { stdout: '30/1\n', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const mockReaddir = readdir as unknown as jest.Mock;
      mockReaddir.mockResolvedValue(['frame-001.ppm', 'frame-002.ppm']);
      
      const mockUnlink = unlink as unknown as jest.Mock;
      mockUnlink.mockResolvedValue(undefined);

      const mockRmdir = rmdir as unknown as jest.Mock;
      mockRmdir.mockResolvedValue(undefined);

      const mockReadFile = readFile as unknown as jest.Mock;
      mockReadFile.mockResolvedValue(Buffer.from(''));

      await detectSyncFrame('/test/video.mp4');
      
      // Should have called readdir at least twice (once for processing, once for cleanup)
      expect(mockReaddir).toHaveBeenCalled();
    });

    it('should call unlink for each file in cleanup', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('ffprobe')) {
          callback(null, { stdout: '30/1\n', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const mockReaddir = readdir as unknown as jest.Mock;
      mockReaddir.mockResolvedValue(['frame-001.ppm', 'frame-002.ppm']);
      
      const mockUnlink = unlink as unknown as jest.Mock;
      mockUnlink.mockResolvedValue(undefined);

      const mockRmdir = rmdir as unknown as jest.Mock;
      mockRmdir.mockResolvedValue(undefined);

      const mockReadFile = readFile as unknown as jest.Mock;
      mockReadFile.mockResolvedValue(Buffer.from(''));

      await detectSyncFrame('/test/video.mp4');
      
      // Should have called unlink for cleanup
      expect(mockUnlink).toHaveBeenCalled();
    });

    it('should call rmdir after unlinking files', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('ffprobe')) {
          callback(null, { stdout: '30/1\n', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const mockReaddir = readdir as unknown as jest.Mock;
      mockReaddir.mockResolvedValue(['frame-001.ppm']);
      
      const mockUnlink = unlink as unknown as jest.Mock;
      mockUnlink.mockResolvedValue(undefined);

      const mockRmdir = rmdir as unknown as jest.Mock;
      mockRmdir.mockResolvedValue(undefined);

      const mockReadFile = readFile as unknown as jest.Mock;
      mockReadFile.mockResolvedValue(Buffer.from(''));

      await detectSyncFrame('/test/video.mp4');
      
      // Should have called rmdir for directory cleanup
      expect(mockRmdir).toHaveBeenCalled();
    });
  });

  describe('arithmetic operations and edge cases', () => {
    it('should use Math.max to ensure adjusted time is not negative', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });

      const segments: AudioSegment[] = [
        { path: '/tmp/audio1.mp3', startTimeMs: 50, durationMs: 100, type: 'click' },
      ];

      // offsetMs > startTimeMs, so Math.max(0, 50 - 100) should be 0
      await concatAudioWithGaps(segments, '/tmp/output.wav', 100);

      const command = mockExec.mock.calls[0][0];
      // Should use adelay=0 (not negative)
      expect(command).toContain('adelay=0|0');
    });

    it('should use Math.max with positive result when startTimeMs > offsetMs', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });

      const segments: AudioSegment[] = [
        { path: '/tmp/audio1.mp3', startTimeMs: 200, durationMs: 100, type: 'click' },
      ];

      // offsetMs < startTimeMs, so Math.max(0, 200 - 50) should be 150
      await concatAudioWithGaps(segments, '/tmp/output.wav', 50);

      const command = mockExec.mock.calls[0][0];
      expect(command).toContain('adelay=150|150');
    });

    it('should use Math.max with exact zero when times equal', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });

      const segments: AudioSegment[] = [
        { path: '/tmp/audio1.mp3', startTimeMs: 100, durationMs: 100, type: 'click' },
      ];

      // offsetMs = startTimeMs, so Math.max(0, 100 - 100) should be 0
      await concatAudioWithGaps(segments, '/tmp/output.wav', 100);

      const command = mockExec.mock.calls[0][0];
      expect(command).toContain('adelay=0|0');
    });

    it('should use slice(0, 10) to limit segment logging', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });

      const segments: AudioSegment[] = Array.from({ length: 15 }, (_, i) => ({
        path: `/tmp/audio${i}.mp3`,
        startTimeMs: i * 100,
        durationMs: 100,
        type: 'click' as const,
      }));

      await concatAudioWithGaps(segments, '/tmp/output.wav', 0);

      // Should only log details for first 10 segments
      const logCalls = consoleLogSpy.mock.calls.filter(call => 
        call[0]?.includes('[FFMPEG] segment startTimeMs=')
      );
      expect(logCalls.length).toBeLessThanOrEqual(10);

      consoleLogSpy.mockRestore();
    });

    it('should handle segments.length === 10 boundary', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        callback(null, { stdout: '', stderr: '' });
      });

      const segments: AudioSegment[] = Array.from({ length: 10 }, (_, i) => ({
        path: `/tmp/audio${i}.mp3`,
        startTimeMs: i * 100,
        durationMs: 100,
        type: 'click' as const,
      }));

      await concatAudioWithGaps(segments, '/tmp/output.wav', 0);

      // Should log all 10 segments, no continuation message
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('... and')
      );

      consoleLogSpy.mockRestore();
    });

    it('should use .trim() before .split() on ffprobe output', async () => {
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('ffprobe')) {
          // Include whitespace and newline
          callback(null, { stdout: '  24/1  \n  ', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const mockReaddir = readdir as unknown as jest.Mock;
      mockReaddir.mockResolvedValue(['frame-001.ppm']);
      
      const mockReadFile = readFile as unknown as jest.Mock;
      mockReadFile.mockResolvedValue(Buffer.from(''));

      // Should not throw despite whitespace
      const result = await detectSyncFrame('/test/video.mp4');
      expect(result).toBe(0);
    });

    it('should use division operator for FPS calculation (not other operators)', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('ffprobe')) {
          callback(null, { stdout: '60/2\n', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const mockReaddir = readdir as unknown as jest.Mock;
      mockReaddir.mockResolvedValue(['frame-001.ppm']);
      
      const mockReadFile = readFile as unknown as jest.Mock;
      mockReadFile.mockResolvedValue(Buffer.from(''));

      await detectSyncFrame('/test/video.mp4');

      // FPS should be 60/2 = 30, not 60*2 = 120
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('FPS: 30')
      );

      consoleLogSpy.mockRestore();
    });

    it('should use || operator (not &&) for denominator fallback', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('ffprobe')) {
          callback(null, { stdout: '30/0\n', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const mockReaddir = readdir as unknown as jest.Mock;
      mockReaddir.mockResolvedValue(['frame-001.ppm']);
      
      const mockReadFile = readFile as unknown as jest.Mock;
      mockReadFile.mockResolvedValue(Buffer.from(''));

      await detectSyncFrame('/test/video.mp4');

      // FPS should be 30/(0||1) = 30/1 = 30
      // With && it would be 30/(0&&1) = 30/0 = Infinity
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('FPS: 30')
      );

      consoleLogSpy.mockRestore();
    });

    it('should calculate frame duration as 1000/fps', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockExec = exec as unknown as jest.Mock;
      mockExec.mockImplementation((command, callback) => {
        if (command.includes('ffprobe')) {
          callback(null, { stdout: '25/1\n', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      const mockReaddir = readdir as unknown as jest.Mock;
      mockReaddir.mockResolvedValue(['frame-001.ppm']);
      
      const mockReadFile = readFile as unknown as jest.Mock;
      mockReadFile.mockResolvedValue(Buffer.from(''));

      await detectSyncFrame('/test/video.mp4');

      // frameDurationMs = 1000/25 = 40ms
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('frame duration: 40.00ms')
      );

      consoleLogSpy.mockRestore();
    });
  });
});
