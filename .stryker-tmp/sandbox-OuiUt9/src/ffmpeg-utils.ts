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
import { exec } from 'child_process';
import { promisify } from 'util';
import { mkdir, readdir, unlink, rmdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { AudioSegment } from './types';
import { formatSegmentLog, formatContinuationMessage, shouldLogContinuation, formatAdelayLog, getSegmentsToLog } from './logging-utils';
const execAsync = promisify(exec);

// Sync marker color: magenta (#FF00FF) = R:255, G:0, B:255
const SYNC_MARKER_R = 255;
const SYNC_MARKER_B = 255;
const SYNC_MARKER_THRESHOLD = 0.8; // 80% of pixels must be magenta

/**
 * Build an audio track from segments with proper timing
 * Uses ffmpeg's adelay filter to position audio at correct timestamps
 */
export async function concatAudioWithGaps(segments: AudioSegment[], outputPath: string, offsetMs: number = 0): Promise<string> {
  if (stryMutAct_9fa48("234")) {
    {}
  } else {
    stryCov_9fa48("234");
    if (stryMutAct_9fa48("237") ? segments.length !== 0 : stryMutAct_9fa48("236") ? false : stryMutAct_9fa48("235") ? true : (stryCov_9fa48("235", "236", "237"), segments.length === 0)) {
      if (stryMutAct_9fa48("238")) {
        {}
      } else {
        stryCov_9fa48("238");
        throw new Error(stryMutAct_9fa48("239") ? "" : (stryCov_9fa48("239"), 'No audio segments provided'));
      }
    }

    // Sort segments by start time
    const sortedSegments = stryMutAct_9fa48("240") ? [...segments] : (stryCov_9fa48("240"), (stryMutAct_9fa48("241") ? [] : (stryCov_9fa48("241"), [...segments])).sort(stryMutAct_9fa48("242") ? () => undefined : (stryCov_9fa48("242"), (a, b) => stryMutAct_9fa48("243") ? a.startTimeMs + b.startTimeMs : (stryCov_9fa48("243"), a.startTimeMs - b.startTimeMs))));

    // eslint-disable-next-line no-console
    console.log(stryMutAct_9fa48("244") ? `` : (stryCov_9fa48("244"), `\n[FFMPEG] concatAudioWithGaps called with ${sortedSegments.length} segments, offsetMs=${offsetMs}:`));
    for (const seg of stryMutAct_9fa48("245") ? sortedSegments : (stryCov_9fa48("245"), sortedSegments.slice(0, 10))) {
      if (stryMutAct_9fa48("246")) {
        {}
      } else {
        stryCov_9fa48("246");
        const adjustedTime = stryMutAct_9fa48("247") ? Math.min(0, seg.startTimeMs - offsetMs) : (stryCov_9fa48("247"), Math.max(0, stryMutAct_9fa48("248") ? seg.startTimeMs + offsetMs : (stryCov_9fa48("248"), seg.startTimeMs - offsetMs)));
        // eslint-disable-next-line no-console
        console.log(formatSegmentLog(seg, adjustedTime));
      }
    }
    if (stryMutAct_9fa48("250") ? false : stryMutAct_9fa48("249") ? true : (stryCov_9fa48("249", "250"), shouldLogContinuation(sortedSegments.length))) {
      if (stryMutAct_9fa48("251")) {
        {}
      } else {
        stryCov_9fa48("251");
        // eslint-disable-next-line no-console
        console.log(formatContinuationMessage(sortedSegments.length));
      }
    }

    // Build ffmpeg filter complex for mixing audio at correct times
    const inputs = sortedSegments.map(stryMutAct_9fa48("252") ? () => undefined : (stryCov_9fa48("252"), (seg, _i) => stryMutAct_9fa48("253") ? `` : (stryCov_9fa48("253"), `-i "${seg.path}"`))).join(stryMutAct_9fa48("254") ? "" : (stryCov_9fa48("254"), ' '));
    const filterParts = sortedSegments.map((seg, i) => {
      if (stryMutAct_9fa48("255")) {
        {}
      } else {
        stryCov_9fa48("255");
        // adelay takes milliseconds, delay both channels
        // Subtract offsetMs to normalize timestamps (first event plays at t=0)
        const adjustedTime = stryMutAct_9fa48("256") ? Math.min(0, seg.startTimeMs - offsetMs) : (stryCov_9fa48("256"), Math.max(0, stryMutAct_9fa48("257") ? seg.startTimeMs + offsetMs : (stryCov_9fa48("257"), seg.startTimeMs - offsetMs)));
        // Apply volume reduction to UI sounds, with clicks louder than keypresses
        const volume = (stryMutAct_9fa48("260") ? seg.type !== 'narration' : stryMutAct_9fa48("259") ? false : stryMutAct_9fa48("258") ? true : (stryCov_9fa48("258", "259", "260"), seg.type === (stryMutAct_9fa48("261") ? "" : (stryCov_9fa48("261"), 'narration')))) ? 1.0 : (stryMutAct_9fa48("264") ? seg.type !== 'click' : stryMutAct_9fa48("263") ? false : stryMutAct_9fa48("262") ? true : (stryCov_9fa48("262", "263", "264"), seg.type === (stryMutAct_9fa48("265") ? "" : (stryCov_9fa48("265"), 'click')))) ? 0.5 : 0.05;
        return stryMutAct_9fa48("266") ? `` : (stryCov_9fa48("266"), `[${i}]adelay=${adjustedTime}|${adjustedTime},volume=${volume}[a${i}]`);
      }
    });
    const mixInputs = sortedSegments.map(stryMutAct_9fa48("267") ? () => undefined : (stryCov_9fa48("267"), (_, i) => stryMutAct_9fa48("268") ? `` : (stryCov_9fa48("268"), `[a${i}]`))).join(stryMutAct_9fa48("269") ? "Stryker was here!" : (stryCov_9fa48("269"), ''));
    const filterComplex = stryMutAct_9fa48("270") ? `` : (stryCov_9fa48("270"), `${filterParts.join(stryMutAct_9fa48("271") ? "" : (stryCov_9fa48("271"), ';'))};${mixInputs}amix=inputs=${sortedSegments.length}:normalize=0[out]`);
    const command = stryMutAct_9fa48("272") ? `` : (stryCov_9fa48("272"), `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "[out]" "${outputPath}"`);

    // eslint-disable-next-line no-console
    console.log(stryMutAct_9fa48("273") ? `` : (stryCov_9fa48("273"), `\n[FFMPEG] Full command:\n${command}\n`));

    // Log the adelay values being used (showing original and adjusted)
    // eslint-disable-next-line no-console
    console.log(stryMutAct_9fa48("274") ? `` : (stryCov_9fa48("274"), `[FFMPEG] adelay values (first 10), offset=${offsetMs}ms:`));
    const segmentsToLog = getSegmentsToLog(sortedSegments);
    for (let i = 0; stryMutAct_9fa48("277") ? i >= segmentsToLog : stryMutAct_9fa48("276") ? i <= segmentsToLog : stryMutAct_9fa48("275") ? false : (stryCov_9fa48("275", "276", "277"), i < segmentsToLog); stryMutAct_9fa48("278") ? i-- : (stryCov_9fa48("278"), i++)) {
      if (stryMutAct_9fa48("279")) {
        {}
      } else {
        stryCov_9fa48("279");
        const adjustedTime = stryMutAct_9fa48("280") ? Math.min(0, sortedSegments[i].startTimeMs - offsetMs) : (stryCov_9fa48("280"), Math.max(0, stryMutAct_9fa48("281") ? sortedSegments[i].startTimeMs + offsetMs : (stryCov_9fa48("281"), sortedSegments[i].startTimeMs - offsetMs)));
        // eslint-disable-next-line no-console
        console.log(formatAdelayLog(i, sortedSegments[i].startTimeMs, adjustedTime));
      }
    }
    await execAsync(command);
    return outputPath;
  }
}

/**
 * Merge audio and video into final MP4
 * Re-encodes video to H.264 since Playwright records in VP8/webm
 */
export async function mergeAudioVideo(videoPath: string, audioPath: string, outputPath: string): Promise<string> {
  if (stryMutAct_9fa48("282")) {
    {}
  } else {
    stryCov_9fa48("282");
    // Re-encode video to H.264 for MP4 compatibility (Playwright records in VP8/webm)
    const command = stryMutAct_9fa48("283") ? `` : (stryCov_9fa48("283"), `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -c:v libx264 -preset fast -crf 23 -c:a aac -shortest "${outputPath}"`);
    await execAsync(command);
    return outputPath;
  }
}

/**
 * Detect the sync frame (magenta marker) in a video and return its timestamp
 * Extracts frames and analyzes them for the magenta sync marker color
 * @param videoPath Path to the video file
 * @returns Timestamp in milliseconds where the sync frame appears
 */
export async function detectSyncFrame(videoPath: string): Promise<number> {
  if (stryMutAct_9fa48("284")) {
    {}
  } else {
    stryCov_9fa48("284");
    // Create temp directory for frame extraction
    const tempDir = join(tmpdir(), stryMutAct_9fa48("285") ? `` : (stryCov_9fa48("285"), `sync-detect-${Date.now()}`));
    await mkdir(tempDir, stryMutAct_9fa48("286") ? {} : (stryCov_9fa48("286"), {
      recursive: stryMutAct_9fa48("287") ? false : (stryCov_9fa48("287"), true)
    }));
    try {
      if (stryMutAct_9fa48("288")) {
        {}
      } else {
        stryCov_9fa48("288");
        // Get video frame rate for timestamp calculation
        const probeCmd = stryMutAct_9fa48("289") ? `` : (stryCov_9fa48("289"), `ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "${videoPath}"`);
        const {
          stdout: fpsOutput
        } = await execAsync(probeCmd);
        const [num, den] = stryMutAct_9fa48("290") ? fpsOutput.split('/').map(Number) : (stryCov_9fa48("290"), fpsOutput.trim().split(stryMutAct_9fa48("291") ? "" : (stryCov_9fa48("291"), '/')).map(Number));
        const fps = stryMutAct_9fa48("292") ? num * (den || 1) : (stryCov_9fa48("292"), num / (stryMutAct_9fa48("295") ? den && 1 : stryMutAct_9fa48("294") ? false : stryMutAct_9fa48("293") ? true : (stryCov_9fa48("293", "294", "295"), den || 1)));
        const frameDurationMs = stryMutAct_9fa48("296") ? 1000 * fps : (stryCov_9fa48("296"), 1000 / fps);

        // eslint-disable-next-line no-console
        console.log(stryMutAct_9fa48("297") ? `` : (stryCov_9fa48("297"), `[SYNC] Video FPS: ${fps}, frame duration: ${frameDurationMs.toFixed(2)}ms`));

        // Extract first 60 frames (covers ~2 seconds at 30fps, plenty for sync marker)
        const extractCmd = stryMutAct_9fa48("298") ? `` : (stryCov_9fa48("298"), `ffmpeg -y -i "${videoPath}" -vframes 60 -q:v 2 "${join(tempDir, stryMutAct_9fa48("299") ? "" : (stryCov_9fa48("299"), 'frame-%03d.ppm'))}"`);
        await execAsync(extractCmd);

        // Read extracted frames
        const files = await readdir(tempDir);
        const frameFiles = stryMutAct_9fa48("301") ? files.sort() : stryMutAct_9fa48("300") ? files.filter(f => f.endsWith('.ppm')) : (stryCov_9fa48("300", "301"), files.filter(stryMutAct_9fa48("302") ? () => undefined : (stryCov_9fa48("302"), f => stryMutAct_9fa48("303") ? f.startsWith('.ppm') : (stryCov_9fa48("303"), f.endsWith(stryMutAct_9fa48("304") ? "" : (stryCov_9fa48("304"), '.ppm'))))).sort());

        // eslint-disable-next-line no-console
        console.log(stryMutAct_9fa48("305") ? `` : (stryCov_9fa48("305"), `[SYNC] Extracted ${frameFiles.length} frames for analysis`));

        // Analyze each frame for magenta content
        for (let i = 0; stryMutAct_9fa48("308") ? i >= frameFiles.length : stryMutAct_9fa48("307") ? i <= frameFiles.length : stryMutAct_9fa48("306") ? false : (stryCov_9fa48("306", "307", "308"), i < frameFiles.length); stryMutAct_9fa48("309") ? i-- : (stryCov_9fa48("309"), i++)) {
          if (stryMutAct_9fa48("310")) {
            {}
          } else {
            stryCov_9fa48("310");
            const framePath = join(tempDir, frameFiles[i]);
            const isMagenta = await isFrameMagenta(framePath);
            if (stryMutAct_9fa48("312") ? false : stryMutAct_9fa48("311") ? true : (stryCov_9fa48("311", "312"), isMagenta)) {
              if (stryMutAct_9fa48("313")) {
                {}
              } else {
                stryCov_9fa48("313");
                const timestampMs = stryMutAct_9fa48("314") ? i / frameDurationMs : (stryCov_9fa48("314"), i * frameDurationMs);
                // eslint-disable-next-line no-console
                console.log(stryMutAct_9fa48("315") ? `` : (stryCov_9fa48("315"), `[SYNC] Found sync frame at frame ${i} (${timestampMs.toFixed(2)}ms)`));
                return timestampMs;
              }
            }
          }
        }

        // eslint-disable-next-line no-console
        console.log(stryMutAct_9fa48("316") ? "" : (stryCov_9fa48("316"), '[SYNC] No sync frame detected, returning 0'));
        return 0;
      }
    } finally {
      if (stryMutAct_9fa48("317")) {
        {}
      } else {
        stryCov_9fa48("317");
        // Cleanup temp directory
        try {
          if (stryMutAct_9fa48("318")) {
            {}
          } else {
            stryCov_9fa48("318");
            const files = await readdir(tempDir);
            for (const file of files) {
              if (stryMutAct_9fa48("319")) {
                {}
              } else {
                stryCov_9fa48("319");
                await unlink(join(tempDir, file));
              }
            }
            await rmdir(tempDir);
          }
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }
}

/**
 * Check if a PPM frame is predominantly magenta (sync marker)
 * PPM format: P6 header, then raw RGB pixels
 */
async function isFrameMagenta(framePath: string): Promise<boolean> {
  if (stryMutAct_9fa48("320")) {
    {}
  } else {
    stryCov_9fa48("320");
    const {
      readFile
    } = await import(stryMutAct_9fa48("321") ? "" : (stryCov_9fa48("321"), 'fs/promises'));
    const data = await readFile(framePath);

    // Parse PPM header (P6 format)
    // Format: P6\n<width> <height>\n<maxval>\n<binary pixel data>
    let headerEnd = 0;
    let newlineCount = 0;
    for (let i = 0; stryMutAct_9fa48("323") ? i < data.length || newlineCount < 3 : stryMutAct_9fa48("322") ? false : (stryCov_9fa48("322", "323"), (stryMutAct_9fa48("326") ? i >= data.length : stryMutAct_9fa48("325") ? i <= data.length : stryMutAct_9fa48("324") ? true : (stryCov_9fa48("324", "325", "326"), i < data.length)) && (stryMutAct_9fa48("329") ? newlineCount >= 3 : stryMutAct_9fa48("328") ? newlineCount <= 3 : stryMutAct_9fa48("327") ? true : (stryCov_9fa48("327", "328", "329"), newlineCount < 3))); stryMutAct_9fa48("330") ? i-- : (stryCov_9fa48("330"), i++)) {
      if (stryMutAct_9fa48("331")) {
        {}
      } else {
        stryCov_9fa48("331");
        if (stryMutAct_9fa48("334") ? data[i] !== 0x0a : stryMutAct_9fa48("333") ? false : stryMutAct_9fa48("332") ? true : (stryCov_9fa48("332", "333", "334"), data[i] === 0x0a)) {
          if (stryMutAct_9fa48("335")) {
            {}
          } else {
            stryCov_9fa48("335");
            // newline
            stryMutAct_9fa48("336") ? newlineCount-- : (stryCov_9fa48("336"), newlineCount++);
            if (stryMutAct_9fa48("339") ? newlineCount !== 3 : stryMutAct_9fa48("338") ? false : stryMutAct_9fa48("337") ? true : (stryCov_9fa48("337", "338", "339"), newlineCount === 3)) {
              if (stryMutAct_9fa48("340")) {
                {}
              } else {
                stryCov_9fa48("340");
                headerEnd = stryMutAct_9fa48("341") ? i - 1 : (stryCov_9fa48("341"), i + 1);
                break;
              }
            }
          }
        }
      }
    }

    // Pixel data starts after header
    const pixelData = stryMutAct_9fa48("342") ? data : (stryCov_9fa48("342"), data.slice(headerEnd));
    const totalPixels = stryMutAct_9fa48("343") ? pixelData.length * 3 : (stryCov_9fa48("343"), pixelData.length / 3);

    // Count magenta pixels (allowing some tolerance for compression artifacts)
    let magentaCount = 0;
    const tolerance = 30; // Allow +/- 30 in RGB values

    for (let i = 0; stryMutAct_9fa48("346") ? i >= pixelData.length : stryMutAct_9fa48("345") ? i <= pixelData.length : stryMutAct_9fa48("344") ? false : (stryCov_9fa48("344", "345", "346"), i < pixelData.length); stryMutAct_9fa48("347") ? i -= 3 : (stryCov_9fa48("347"), i += 3)) {
      if (stryMutAct_9fa48("348")) {
        {}
      } else {
        stryCov_9fa48("348");
        const r = pixelData[i];
        const g = pixelData[stryMutAct_9fa48("349") ? i - 1 : (stryCov_9fa48("349"), i + 1)];
        const b = pixelData[stryMutAct_9fa48("350") ? i - 2 : (stryCov_9fa48("350"), i + 2)];
        const rMatch = stryMutAct_9fa48("354") ? Math.abs(r - SYNC_MARKER_R) >= tolerance : stryMutAct_9fa48("353") ? Math.abs(r - SYNC_MARKER_R) <= tolerance : stryMutAct_9fa48("352") ? false : stryMutAct_9fa48("351") ? true : (stryCov_9fa48("351", "352", "353", "354"), Math.abs(stryMutAct_9fa48("355") ? r + SYNC_MARKER_R : (stryCov_9fa48("355"), r - SYNC_MARKER_R)) < tolerance);
        const gMatch = stryMutAct_9fa48("359") ? g >= tolerance : stryMutAct_9fa48("358") ? g <= tolerance : stryMutAct_9fa48("357") ? false : stryMutAct_9fa48("356") ? true : (stryCov_9fa48("356", "357", "358", "359"), g < tolerance); // G should be near 0
        const bMatch = stryMutAct_9fa48("363") ? Math.abs(b - SYNC_MARKER_B) >= tolerance : stryMutAct_9fa48("362") ? Math.abs(b - SYNC_MARKER_B) <= tolerance : stryMutAct_9fa48("361") ? false : stryMutAct_9fa48("360") ? true : (stryCov_9fa48("360", "361", "362", "363"), Math.abs(stryMutAct_9fa48("364") ? b + SYNC_MARKER_B : (stryCov_9fa48("364"), b - SYNC_MARKER_B)) < tolerance);
        if (stryMutAct_9fa48("367") ? rMatch && gMatch || bMatch : stryMutAct_9fa48("366") ? false : stryMutAct_9fa48("365") ? true : (stryCov_9fa48("365", "366", "367"), (stryMutAct_9fa48("369") ? rMatch || gMatch : stryMutAct_9fa48("368") ? true : (stryCov_9fa48("368", "369"), rMatch && gMatch)) && bMatch)) {
          if (stryMutAct_9fa48("370")) {
            {}
          } else {
            stryCov_9fa48("370");
            stryMutAct_9fa48("371") ? magentaCount-- : (stryCov_9fa48("371"), magentaCount++);
          }
        }
      }
    }
    const magentaRatio = stryMutAct_9fa48("372") ? magentaCount * totalPixels : (stryCov_9fa48("372"), magentaCount / totalPixels);
    return stryMutAct_9fa48("376") ? magentaRatio < SYNC_MARKER_THRESHOLD : stryMutAct_9fa48("375") ? magentaRatio > SYNC_MARKER_THRESHOLD : stryMutAct_9fa48("374") ? false : stryMutAct_9fa48("373") ? true : (stryCov_9fa48("373", "374", "375", "376"), magentaRatio >= SYNC_MARKER_THRESHOLD);
  }
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
  if (stryMutAct_9fa48("377")) {
    {}
  } else {
    stryCov_9fa48("377");
    // Create temp directory for frame extraction
    const tempDir = join(tmpdir(), stryMutAct_9fa48("378") ? `` : (stryCov_9fa48("378"), `sync-range-${Date.now()}`));
    await mkdir(tempDir, stryMutAct_9fa48("379") ? {} : (stryCov_9fa48("379"), {
      recursive: stryMutAct_9fa48("380") ? false : (stryCov_9fa48("380"), true)
    }));
    try {
      if (stryMutAct_9fa48("381")) {
        {}
      } else {
        stryCov_9fa48("381");
        // Get video frame rate
        const probeCmd = stryMutAct_9fa48("382") ? `` : (stryCov_9fa48("382"), `ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "${videoPath}"`);
        const {
          stdout: fpsOutput
        } = await execAsync(probeCmd);
        const [num, den] = stryMutAct_9fa48("383") ? fpsOutput.split('/').map(Number) : (stryCov_9fa48("383"), fpsOutput.trim().split(stryMutAct_9fa48("384") ? "" : (stryCov_9fa48("384"), '/')).map(Number));
        const fps = stryMutAct_9fa48("385") ? num * (den || 1) : (stryCov_9fa48("385"), num / (stryMutAct_9fa48("388") ? den && 1 : stryMutAct_9fa48("387") ? false : stryMutAct_9fa48("386") ? true : (stryCov_9fa48("386", "387", "388"), den || 1)));
        const frameDurationMs = stryMutAct_9fa48("389") ? 1000 * fps : (stryCov_9fa48("389"), 1000 / fps);

        // Extract first 60 frames
        const extractCmd = stryMutAct_9fa48("390") ? `` : (stryCov_9fa48("390"), `ffmpeg -y -i "${videoPath}" -vframes 60 -q:v 2 "${join(tempDir, stryMutAct_9fa48("391") ? "" : (stryCov_9fa48("391"), 'frame-%03d.ppm'))}"`);
        await execAsync(extractCmd);
        const files = await readdir(tempDir);
        const frameFiles = stryMutAct_9fa48("393") ? files.sort() : stryMutAct_9fa48("392") ? files.filter(f => f.endsWith('.ppm')) : (stryCov_9fa48("392", "393"), files.filter(stryMutAct_9fa48("394") ? () => undefined : (stryCov_9fa48("394"), f => stryMutAct_9fa48("395") ? f.startsWith('.ppm') : (stryCov_9fa48("395"), f.endsWith(stryMutAct_9fa48("396") ? "" : (stryCov_9fa48("396"), '.ppm'))))).sort());
        let firstSyncFrame = stryMutAct_9fa48("397") ? +1 : (stryCov_9fa48("397"), -1);
        let lastSyncFrame = stryMutAct_9fa48("398") ? +1 : (stryCov_9fa48("398"), -1);
        for (let i = 0; stryMutAct_9fa48("401") ? i >= frameFiles.length : stryMutAct_9fa48("400") ? i <= frameFiles.length : stryMutAct_9fa48("399") ? false : (stryCov_9fa48("399", "400", "401"), i < frameFiles.length); stryMutAct_9fa48("402") ? i-- : (stryCov_9fa48("402"), i++)) {
          if (stryMutAct_9fa48("403")) {
            {}
          } else {
            stryCov_9fa48("403");
            const framePath = join(tempDir, frameFiles[i]);
            const isMagenta = await isFrameMagenta(framePath);
            if (stryMutAct_9fa48("405") ? false : stryMutAct_9fa48("404") ? true : (stryCov_9fa48("404", "405"), isMagenta)) {
              if (stryMutAct_9fa48("406")) {
                {}
              } else {
                stryCov_9fa48("406");
                if (stryMutAct_9fa48("409") ? firstSyncFrame !== -1 : stryMutAct_9fa48("408") ? false : stryMutAct_9fa48("407") ? true : (stryCov_9fa48("407", "408", "409"), firstSyncFrame === (stryMutAct_9fa48("410") ? +1 : (stryCov_9fa48("410"), -1)))) {
                  if (stryMutAct_9fa48("411")) {
                    {}
                  } else {
                    stryCov_9fa48("411");
                    firstSyncFrame = i;
                  }
                }
                lastSyncFrame = i;
              }
            } else if (stryMutAct_9fa48("414") ? firstSyncFrame === -1 : stryMutAct_9fa48("413") ? false : stryMutAct_9fa48("412") ? true : (stryCov_9fa48("412", "413", "414"), firstSyncFrame !== (stryMutAct_9fa48("415") ? +1 : (stryCov_9fa48("415"), -1)))) {
              if (stryMutAct_9fa48("416")) {
                {}
              } else {
                stryCov_9fa48("416");
                // We've passed the sync marker sequence
                break;
              }
            }
          }
        }
        return stryMutAct_9fa48("417") ? {} : (stryCov_9fa48("417"), {
          firstSyncFrame,
          lastSyncFrame,
          frameDurationMs
        });
      }
    } finally {
      if (stryMutAct_9fa48("418")) {
        {}
      } else {
        stryCov_9fa48("418");
        // Cleanup
        try {
          if (stryMutAct_9fa48("419")) {
            {}
          } else {
            stryCov_9fa48("419");
            const files = await readdir(tempDir);
            for (const file of files) {
              if (stryMutAct_9fa48("420")) {
                {}
              } else {
                stryCov_9fa48("420");
                await unlink(join(tempDir, file));
              }
            }
            await rmdir(tempDir);
          }
        } catch {
          // Ignore cleanup errors
        }
      }
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
export async function trimSyncFrames(inputPath: string, outputPath: string, framesToTrim: number, frameDurationMs: number): Promise<void> {
  if (stryMutAct_9fa48("421")) {
    {}
  } else {
    stryCov_9fa48("421");
    if (stryMutAct_9fa48("425") ? framesToTrim > 0 : stryMutAct_9fa48("424") ? framesToTrim < 0 : stryMutAct_9fa48("423") ? false : stryMutAct_9fa48("422") ? true : (stryCov_9fa48("422", "423", "424", "425"), framesToTrim <= 0)) {
      if (stryMutAct_9fa48("426")) {
        {}
      } else {
        stryCov_9fa48("426");
        // No trimming needed, just copy (re-encode to mp4 for compatibility)
        const copyCmd = stryMutAct_9fa48("427") ? `` : (stryCov_9fa48("427"), `ffmpeg -y -i "${inputPath}" -c:v libx264 -preset fast -crf 23 "${outputPath}"`);
        await execAsync(copyCmd);
        return;
      }
    }

    // Calculate start time in seconds
    const startTimeSeconds = stryMutAct_9fa48("428") ? framesToTrim * frameDurationMs * 1000 : (stryCov_9fa48("428"), (stryMutAct_9fa48("429") ? framesToTrim / frameDurationMs : (stryCov_9fa48("429"), framesToTrim * frameDurationMs)) / 1000);

    // eslint-disable-next-line no-console
    console.log(stryMutAct_9fa48("430") ? `` : (stryCov_9fa48("430"), `[SYNC] Trimming ${framesToTrim} frames (${startTimeSeconds.toFixed(3)}s) from video`));

    // Use ffmpeg to trim the video
    // -ss before -i for fast seeking, but we need frame-accurate trimming so put it after
    // Output as MP4 with H.264 for compatibility
    const trimCmd = stryMutAct_9fa48("431") ? `` : (stryCov_9fa48("431"), `ffmpeg -y -i "${inputPath}" -ss ${startTimeSeconds.toFixed(3)} -c:v libx264 -preset fast -crf 23 "${outputPath}"`);
    await execAsync(trimCmd);
  }
}