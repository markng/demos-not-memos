import { concatAudioWithGaps, mergeAudioVideo } from './ffmpeg-utils';
import { AudioSegment } from './types';
import { exec } from 'child_process';

// Mock child_process.exec
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

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
      expect(command).toContain('[0]adelay=0|0[a0]');
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
      expect(command).toContain('[0]adelay=0|0[a0]');
      expect(command).toContain('[1]adelay=2500|2500[a1]');
      expect(command).toContain('[2]adelay=3000|3000[a2]');
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
      // The format should be: [0]adelay=0|0[a0];[1]adelay=2000|2000[a1];[a0][a1]amix...
      expect(command).toContain('[0]adelay=0|0[a0];[1]adelay=2000|2000[a1];');
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
      expect(command).toContain('[0]adelay=0|0[a0]');
      expect(command).toContain('[1]adelay=2000|2000[a1]');
      expect(command).toContain('[2]adelay=5000|5000[a2]');
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
      expect(command).toContain('[0]adelay=1000|1000[a0]');
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
      expect(command).toContain('[0]adelay=3600000|3600000[a0]');
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
});
