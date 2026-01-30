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
      expect(command).toContain('[0]adelay=0|0,volume=0.3[a0]');
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
      expect(command).toContain('[0]adelay=0|0,volume=0.3[a0]');
      expect(command).toContain('[1]adelay=2500|2500,volume=0.3[a1]');
      expect(command).toContain('[2]adelay=3000|3000,volume=0.3[a2]');
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
      // The format should be: [0]adelay=0|0,volume=0.3[a0];[1]adelay=2000|2000,volume=0.3[a1];[a0][a1]amix...
      expect(command).toContain('[0]adelay=0|0,volume=0.3[a0];[1]adelay=2000|2000,volume=0.3[a1];');
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
      expect(command).toContain('[0]adelay=0|0,volume=0.3[a0]');
      expect(command).toContain('[1]adelay=2000|2000,volume=0.3[a1]');
      expect(command).toContain('[2]adelay=5000|5000,volume=0.3[a2]');
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
      expect(command).toContain('[0]adelay=1000|1000,volume=0.3[a0]');
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
      expect(command).toContain('[0]adelay=3600000|3600000,volume=0.3[a0]');
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
  });
});
