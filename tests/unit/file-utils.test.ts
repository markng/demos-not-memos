import { cleanupTempFile, cleanupOutputFile } from '../../src/file-utils';
import { existsSync, unlinkSync } from 'fs';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

describe('file-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cleanupTempFile', () => {
    it('should delete file when it exists', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      cleanupTempFile('/tmp/temp.mp3');

      expect(existsSync).toHaveBeenCalledWith('/tmp/temp.mp3');
      expect(unlinkSync).toHaveBeenCalledWith('/tmp/temp.mp3');
    });

    it('should not delete file when it does not exist', () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      cleanupTempFile('/tmp/nonexistent.mp3');

      expect(existsSync).toHaveBeenCalledWith('/tmp/nonexistent.mp3');
      expect(unlinkSync).not.toHaveBeenCalled();
    });

    it('should check existence before unlinking', () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      cleanupTempFile('/path/to/file.tmp');

      // Should have checked existence
      expect(existsSync).toHaveBeenCalled();
      // Should not have tried to delete
      expect(unlinkSync).not.toHaveBeenCalled();
    });

    it('should use conditional to guard unlinkSync call', () => {
      // When file exists
      (existsSync as jest.Mock).mockReturnValue(true);
      cleanupTempFile('/file1.tmp');
      expect(unlinkSync).toHaveBeenCalledTimes(1);

      // When file doesn't exist
      (existsSync as jest.Mock).mockReturnValue(false);
      cleanupTempFile('/file2.tmp');
      expect(unlinkSync).toHaveBeenCalledTimes(1); // Still 1, not 2
    });
  });

  describe('cleanupOutputFile', () => {
    it('should delete file when it exists', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      cleanupOutputFile('/output/sound.mp3');

      expect(existsSync).toHaveBeenCalledWith('/output/sound.mp3');
      expect(unlinkSync).toHaveBeenCalledWith('/output/sound.mp3');
    });

    it('should not delete file when it does not exist', () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      cleanupOutputFile('/output/missing.mp3');

      expect(existsSync).toHaveBeenCalledWith('/output/missing.mp3');
      expect(unlinkSync).not.toHaveBeenCalled();
    });

    it('should handle different paths', () => {
      (existsSync as jest.Mock).mockReturnValue(true);

      cleanupOutputFile('/var/audio/output.wav');

      expect(existsSync).toHaveBeenCalledWith('/var/audio/output.wav');
      expect(unlinkSync).toHaveBeenCalledWith('/var/audio/output.wav');
    });

    it('should use conditional to guard unlinkSync call', () => {
      // When file exists
      (existsSync as jest.Mock).mockReturnValue(true);
      cleanupOutputFile('/file1.mp3');
      expect(unlinkSync).toHaveBeenCalledTimes(1);

      // When file doesn't exist
      (existsSync as jest.Mock).mockReturnValue(false);
      cleanupOutputFile('/file2.mp3');
      expect(unlinkSync).toHaveBeenCalledTimes(1); // Still 1, not 2
    });
  });

  describe('both cleanup functions', () => {
    it('should have identical behavior', () => {
      // Test that both functions work the same way
      (existsSync as jest.Mock).mockReturnValue(true);

      cleanupTempFile('/tmp/file1.tmp');
      cleanupOutputFile('/out/file2.mp3');

      expect(existsSync).toHaveBeenCalledTimes(2);
      expect(unlinkSync).toHaveBeenCalledTimes(2);
      expect(unlinkSync).toHaveBeenCalledWith('/tmp/file1.tmp');
      expect(unlinkSync).toHaveBeenCalledWith('/out/file2.mp3');
    });
  });
});
