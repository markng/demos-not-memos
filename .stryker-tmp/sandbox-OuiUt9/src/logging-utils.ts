// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import { AudioSegment } from './types';

/**
 * Extract filename from path using forward slash separator
 * @param path Full file path
 * @returns Filename or undefined if no slashes
 */
export function extractFilename(path: string): string | undefined {
  if (stryMutAct_9fa48("440")) {
    {}
  } else {
    stryCov_9fa48("440");
    return path.split(stryMutAct_9fa48("441") ? "" : (stryCov_9fa48("441"), '/')).pop();
  }
}

/**
 * Format segment log message with timing info
 * @param seg Audio segment
 * @param adjustedTime Adjusted timestamp
 * @returns Formatted log message
 */
export function formatSegmentLog(seg: AudioSegment, adjustedTime: number): string {
  if (stryMutAct_9fa48("442")) {
    {}
  } else {
    stryCov_9fa48("442");
    return stryMutAct_9fa48("443") ? `` : (stryCov_9fa48("443"), `  [FFMPEG] segment startTimeMs=${seg.startTimeMs} -> adjusted=${adjustedTime}, path=${extractFilename(seg.path)}`);
  }
}

/**
 * Format continuation message for truncated segment list
 * @param totalSegments Total number of segments
 * @returns Formatted continuation message
 */
export function formatContinuationMessage(totalSegments: number): string {
  if (stryMutAct_9fa48("444")) {
    {}
  } else {
    stryCov_9fa48("444");
    return stryMutAct_9fa48("445") ? `` : (stryCov_9fa48("445"), `  [FFMPEG] ... and ${stryMutAct_9fa48("446") ? totalSegments + 10 : (stryCov_9fa48("446"), totalSegments - 10)} more segments`);
  }
}

/**
 * Check if segment list should show continuation message
 * @param segmentCount Total number of segments
 * @returns True if should show continuation (more than 10 segments)
 */
export function shouldLogContinuation(segmentCount: number): boolean {
  if (stryMutAct_9fa48("447")) {
    {}
  } else {
    stryCov_9fa48("447");
    return stryMutAct_9fa48("451") ? segmentCount <= 10 : stryMutAct_9fa48("450") ? segmentCount >= 10 : stryMutAct_9fa48("449") ? false : stryMutAct_9fa48("448") ? true : (stryCov_9fa48("448", "449", "450", "451"), segmentCount > 10);
  }
}

/**
 * Format adelay log entry
 * @param index Segment index
 * @param originalTime Original timestamp in ms
 * @param adjustedTime Adjusted timestamp in ms
 * @returns Formatted adelay log message
 */
export function formatAdelayLog(index: number, originalTime: number, adjustedTime: number): string {
  if (stryMutAct_9fa48("452")) {
    {}
  } else {
    stryCov_9fa48("452");
    return stryMutAct_9fa48("453") ? `` : (stryCov_9fa48("453"), `  [${index}] original=${originalTime}ms -> adelay=${adjustedTime}ms`);
  }
}

/**
 * Get number of segments to log (max 10)
 * @param segments Array of segments
 * @returns Number of segments to log
 */
export function getSegmentsToLog(segments: AudioSegment[]): number {
  if (stryMutAct_9fa48("454")) {
    {}
  } else {
    stryCov_9fa48("454");
    return stryMutAct_9fa48("455") ? Math.max(10, segments.length) : (stryCov_9fa48("455"), Math.min(10, segments.length));
  }
}