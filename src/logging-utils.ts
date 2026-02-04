import { AudioSegment } from './types';

/**
 * Extract filename from path using forward slash separator
 * @param path Full file path
 * @returns Filename or undefined if no slashes
 */
export function extractFilename(path: string): string | undefined {
  return path.split('/').pop();
}

/**
 * Format segment log message with timing info
 * @param seg Audio segment
 * @param adjustedTime Adjusted timestamp
 * @returns Formatted log message
 */
export function formatSegmentLog(seg: AudioSegment, adjustedTime: number): string {
  return `  [FFMPEG] segment startTimeMs=${seg.startTimeMs} -> adjusted=${adjustedTime}, path=${extractFilename(seg.path)}`;
}

/**
 * Format continuation message for truncated segment list
 * @param totalSegments Total number of segments
 * @returns Formatted continuation message
 */
export function formatContinuationMessage(totalSegments: number): string {
  return `  [FFMPEG] ... and ${totalSegments - 10} more segments`;
}

/**
 * Check if segment list should show continuation message
 * @param segmentCount Total number of segments
 * @returns True if should show continuation (more than 10 segments)
 */
export function shouldLogContinuation(segmentCount: number): boolean {
  return segmentCount > 10;
}

/**
 * Format adelay log entry
 * @param index Segment index
 * @param originalTime Original timestamp in ms
 * @param adjustedTime Adjusted timestamp in ms
 * @returns Formatted adelay log message
 */
export function formatAdelayLog(index: number, originalTime: number, adjustedTime: number): string {
  return `  [${index}] original=${originalTime}ms -> adelay=${adjustedTime}ms`;
}

/**
 * Get number of segments to log (max 10)
 * @param segments Array of segments
 * @returns Number of segments to log
 */
export function getSegmentsToLog(segments: AudioSegment[]): number {
  return Math.min(10, segments.length);
}
