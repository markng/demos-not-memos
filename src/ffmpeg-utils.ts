import { exec } from 'child_process';
import { promisify } from 'util';
import { AudioSegment } from './types';

const execAsync = promisify(exec);

/**
 * Build an audio track from segments with proper timing
 * Uses ffmpeg's adelay filter to position audio at correct timestamps
 */
export async function concatAudioWithGaps(
  segments: AudioSegment[],
  outputPath: string
): Promise<string> {
  if (segments.length === 0) {
    throw new Error('No audio segments provided');
  }

  // Sort segments by start time
  const sortedSegments = [...segments].sort((a, b) => a.startTimeMs - b.startTimeMs);

  // Build ffmpeg filter complex for mixing audio at correct times
  const inputs = sortedSegments.map((seg, i) => `-i "${seg.path}"`).join(' ');

  const filterParts = sortedSegments.map((seg, i) => {
    // adelay takes milliseconds, delay both channels
    return `[${i}]adelay=${seg.startTimeMs}|${seg.startTimeMs}[a${i}]`;
  });

  const mixInputs = sortedSegments.map((_, i) => `[a${i}]`).join('');
  const filterComplex = `${filterParts.join(';')};${mixInputs}amix=inputs=${sortedSegments.length}:normalize=0[out]`;

  const command = `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "[out]" "${outputPath}"`;

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
