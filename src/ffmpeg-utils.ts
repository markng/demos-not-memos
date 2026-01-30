import { exec } from 'child_process';
import { promisify } from 'util';
import { mkdir, readdir, unlink, rmdir } from 'fs/promises';
import { join } from 'path';
import { AudioSegment } from './types';

const execAsync = promisify(exec);

// Sync marker color: magenta (#FF00FF) = R:255, G:0, B:255
const SYNC_MARKER_R = 255;
const SYNC_MARKER_G = 0;
const SYNC_MARKER_B = 255;
const SYNC_MARKER_THRESHOLD = 0.8; // 80% of pixels must be magenta

/**
 * Build an audio track from segments with proper timing
 * Uses ffmpeg's adelay filter to position audio at correct timestamps
 */
export async function concatAudioWithGaps(
  segments: AudioSegment[],
  outputPath: string,
  offsetMs: number = 0
): Promise<string> {
  if (segments.length === 0) {
    throw new Error('No audio segments provided');
  }

  // Sort segments by start time
  const sortedSegments = [...segments].sort((a, b) => a.startTimeMs - b.startTimeMs);

  console.log(`\n[FFMPEG] concatAudioWithGaps called with ${sortedSegments.length} segments, offsetMs=${offsetMs}:`);
  for (const seg of sortedSegments.slice(0, 10)) {
    const adjustedTime = Math.max(0, seg.startTimeMs - offsetMs);
    console.log(`  [FFMPEG] segment startTimeMs=${seg.startTimeMs} -> adjusted=${adjustedTime}, path=${seg.path.split('/').pop()}`);
  }
  if (sortedSegments.length > 10) {
    console.log(`  [FFMPEG] ... and ${sortedSegments.length - 10} more segments`);
  }

  // Build ffmpeg filter complex for mixing audio at correct times
  const inputs = sortedSegments.map((seg, i) => `-i "${seg.path}"`).join(' ');

  const filterParts = sortedSegments.map((seg, i) => {
    // adelay takes milliseconds, delay both channels
    // Subtract offsetMs to normalize timestamps (first event plays at t=0)
    const adjustedTime = Math.max(0, seg.startTimeMs - offsetMs);
    // Apply volume reduction only to UI sounds (keypresses, clicks), not narration
    const volume = seg.type === 'narration' ? 1.0 : 0.05;
    return `[${i}]adelay=${adjustedTime}|${adjustedTime},volume=${volume}[a${i}]`;
  });

  const mixInputs = sortedSegments.map((_, i) => `[a${i}]`).join('');
  const filterComplex = `${filterParts.join(';')};${mixInputs}amix=inputs=${sortedSegments.length}:normalize=0[out]`;

  const command = `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "[out]" "${outputPath}"`;

  console.log(`\n[FFMPEG] Full command:\n${command}\n`);

  // Log the adelay values being used (showing original and adjusted)
  console.log(`[FFMPEG] adelay values (first 10), offset=${offsetMs}ms:`);
  for (let i = 0; i < Math.min(10, sortedSegments.length); i++) {
    const adjustedTime = Math.max(0, sortedSegments[i].startTimeMs - offsetMs);
    console.log(`  [${i}] original=${sortedSegments[i].startTimeMs}ms -> adelay=${adjustedTime}ms`);
  }

  await execAsync(command);
  return outputPath;
}

/**
 * Merge audio and video into final MP4
 * Re-encodes video to H.264 since Playwright records in VP8/webm
 */
export async function mergeAudioVideo(
  videoPath: string,
  audioPath: string,
  outputPath: string
): Promise<string> {
  // Re-encode video to H.264 for MP4 compatibility (Playwright records in VP8/webm)
  const command = `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v libx264 -preset fast -crf 23 -c:a aac -shortest "${outputPath}"`;
  await execAsync(command);
  return outputPath;
}

/**
 * Detect the sync frame (magenta marker) in a video and return its timestamp
 * Extracts frames and analyzes them for the magenta sync marker color
 * @param videoPath Path to the video file
 * @returns Timestamp in milliseconds where the sync frame appears
 */
export async function detectSyncFrame(videoPath: string): Promise<number> {
  // Create temp directory for frame extraction
  const tempDir = join(require('os').tmpdir(), `sync-detect-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });

  try {
    // Get video frame rate for timestamp calculation
    const probeCmd = `ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "${videoPath}"`;
    const { stdout: fpsOutput } = await execAsync(probeCmd);
    const [num, den] = fpsOutput.trim().split('/').map(Number);
    const fps = num / (den || 1);
    const frameDurationMs = 1000 / fps;

    console.log(`[SYNC] Video FPS: ${fps}, frame duration: ${frameDurationMs.toFixed(2)}ms`);

    // Extract first 60 frames (covers ~2 seconds at 30fps, plenty for sync marker)
    const extractCmd = `ffmpeg -y -i "${videoPath}" -vframes 60 -q:v 2 "${join(tempDir, 'frame-%03d.ppm')}"`;
    await execAsync(extractCmd);

    // Read extracted frames
    const files = await readdir(tempDir);
    const frameFiles = files.filter(f => f.endsWith('.ppm')).sort();

    console.log(`[SYNC] Extracted ${frameFiles.length} frames for analysis`);

    // Analyze each frame for magenta content
    for (let i = 0; i < frameFiles.length; i++) {
      const framePath = join(tempDir, frameFiles[i]);
      const isMagenta = await isFrameMagenta(framePath);

      if (isMagenta) {
        const timestampMs = i * frameDurationMs;
        console.log(`[SYNC] Found sync frame at frame ${i} (${timestampMs.toFixed(2)}ms)`);
        return timestampMs;
      }
    }

    console.log('[SYNC] No sync frame detected, returning 0');
    return 0;
  } finally {
    // Cleanup temp directory
    try {
      const files = await readdir(tempDir);
      for (const file of files) {
        await unlink(join(tempDir, file));
      }
      await rmdir(tempDir);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Check if a PPM frame is predominantly magenta (sync marker)
 * PPM format: P6 header, then raw RGB pixels
 */
async function isFrameMagenta(framePath: string): Promise<boolean> {
  const { readFile } = await import('fs/promises');
  const data = await readFile(framePath);

  // Parse PPM header (P6 format)
  // Format: P6\n<width> <height>\n<maxval>\n<binary pixel data>
  let headerEnd = 0;
  let newlineCount = 0;

  for (let i = 0; i < data.length && newlineCount < 3; i++) {
    if (data[i] === 0x0a) { // newline
      newlineCount++;
      if (newlineCount === 3) {
        headerEnd = i + 1;
        break;
      }
    }
  }

  // Pixel data starts after header
  const pixelData = data.slice(headerEnd);
  const totalPixels = pixelData.length / 3;

  // Count magenta pixels (allowing some tolerance for compression artifacts)
  let magentaCount = 0;
  const tolerance = 30; // Allow +/- 30 in RGB values

  for (let i = 0; i < pixelData.length; i += 3) {
    const r = pixelData[i];
    const g = pixelData[i + 1];
    const b = pixelData[i + 2];

    const rMatch = Math.abs(r - SYNC_MARKER_R) < tolerance;
    const gMatch = g < tolerance; // G should be near 0
    const bMatch = Math.abs(b - SYNC_MARKER_B) < tolerance;

    if (rMatch && gMatch && bMatch) {
      magentaCount++;
    }
  }

  const magentaRatio = magentaCount / totalPixels;
  return magentaRatio >= SYNC_MARKER_THRESHOLD;
}

/**
 * Find the last sync frame (end of sync marker sequence) and return frame count
 * @param videoPath Path to the video file
 * @returns Object with firstSyncFrame, lastSyncFrame, and frameDurationMs
 */
export async function detectSyncFrameRange(videoPath: string): Promise<{
  firstSyncFrame: number;
  lastSyncFrame: number;
  frameDurationMs: number;
}> {
  // Create temp directory for frame extraction
  const tempDir = join(require('os').tmpdir(), `sync-range-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });

  try {
    // Get video frame rate
    const probeCmd = `ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "${videoPath}"`;
    const { stdout: fpsOutput } = await execAsync(probeCmd);
    const [num, den] = fpsOutput.trim().split('/').map(Number);
    const fps = num / (den || 1);
    const frameDurationMs = 1000 / fps;

    // Extract first 60 frames
    const extractCmd = `ffmpeg -y -i "${videoPath}" -vframes 60 -q:v 2 "${join(tempDir, 'frame-%03d.ppm')}"`;
    await execAsync(extractCmd);

    const files = await readdir(tempDir);
    const frameFiles = files.filter(f => f.endsWith('.ppm')).sort();

    let firstSyncFrame = -1;
    let lastSyncFrame = -1;

    for (let i = 0; i < frameFiles.length; i++) {
      const framePath = join(tempDir, frameFiles[i]);
      const isMagenta = await isFrameMagenta(framePath);

      if (isMagenta) {
        if (firstSyncFrame === -1) {
          firstSyncFrame = i;
        }
        lastSyncFrame = i;
      } else if (firstSyncFrame !== -1) {
        // We've passed the sync marker sequence
        break;
      }
    }

    return { firstSyncFrame, lastSyncFrame, frameDurationMs };
  } finally {
    // Cleanup
    try {
      const files = await readdir(tempDir);
      for (const file of files) {
        await unlink(join(tempDir, file));
      }
      await rmdir(tempDir);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Trim frames from the beginning of a video
 * @param inputPath Input video path
 * @param outputPath Output video path (should be .mp4 for H.264 compatibility)
 * @param framesToTrim Number of frames to remove from the start
 * @param frameDurationMs Duration of each frame in milliseconds
 */
export async function trimSyncFrames(
  inputPath: string,
  outputPath: string,
  framesToTrim: number,
  frameDurationMs: number
): Promise<void> {
  if (framesToTrim <= 0) {
    // No trimming needed, just copy (re-encode to mp4 for compatibility)
    const copyCmd = `ffmpeg -y -i "${inputPath}" -c:v libx264 -preset fast -crf 23 "${outputPath}"`;
    await execAsync(copyCmd);
    return;
  }

  // Calculate start time in seconds
  const startTimeSeconds = (framesToTrim * frameDurationMs) / 1000;

  console.log(`[SYNC] Trimming ${framesToTrim} frames (${startTimeSeconds.toFixed(3)}s) from video`);

  // Use ffmpeg to trim the video
  // -ss before -i for fast seeking, but we need frame-accurate trimming so put it after
  // Output as MP4 with H.264 for compatibility
  const trimCmd = `ffmpeg -y -i "${inputPath}" -ss ${startTimeSeconds.toFixed(3)} -c:v libx264 -preset fast -crf 23 "${outputPath}"`;
  await execAsync(trimCmd);
}
