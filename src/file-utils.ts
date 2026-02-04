import { existsSync, unlinkSync } from 'fs';

/**
 * Safely clean up a temporary file if it exists
 * @param path Path to the temporary file
 */
export function cleanupTempFile(path: string): void {
  if (existsSync(path)) {
    unlinkSync(path);
  }
}

/**
 * Safely clean up an output file if it exists
 * Used when retrying after validation failure
 * @param path Path to the output file
 */
export function cleanupOutputFile(path: string): void {
  if (existsSync(path)) {
    unlinkSync(path);
  }
}
