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
import { generateTTS } from './audio-utils';
import { TTSResult, AudioSegment } from './types';

/**
 * Represents a narration segment with timing control
 */
export class Narration {
  private text: string;
  private voice: string;
  private model: string;
  private startTimeMs: number;
  private ttsResult: TTSResult | null = null;
  private completionPromise: Promise<void> | null = null;
  private resolveCompletion: (() => void) | null = null;
  private outputDir: string;
  private segmentId: string;
  constructor(text: string, voice: string, model: string, startTimeMs: number, outputDir: string, segmentId: string) {
    if (stryMutAct_9fa48("456")) {
      {}
    } else {
      stryCov_9fa48("456");
      this.text = text;
      this.voice = voice;
      this.model = model;
      this.startTimeMs = startTimeMs;
      this.outputDir = outputDir;
      this.segmentId = segmentId;
    }
  }

  /**
   * Generate TTS and start the timer
   * Called internally by NarratedDemo
   */
  async generate(): Promise<void> {
    if (stryMutAct_9fa48("457")) {
      {}
    } else {
      stryCov_9fa48("457");
      const audioPath = stryMutAct_9fa48("458") ? `` : (stryCov_9fa48("458"), `${this.outputDir}/${this.segmentId}.mp3`);
      this.ttsResult = await generateTTS(stryMutAct_9fa48("459") ? {} : (stryCov_9fa48("459"), {
        text: this.text,
        voice: this.voice,
        model: this.model,
        outputPath: audioPath
      }));

      // Set up completion promise with timer
      this.completionPromise = new Promise(resolve => {
        if (stryMutAct_9fa48("460")) {
          {}
        } else {
          stryCov_9fa48("460");
          this.resolveCompletion = resolve;
          setTimeout(resolve, this.ttsResult!.durationMs);
        }
      });
    }
  }

  /**
   * Wait for the narration to complete (speech duration)
   */
  async waitUntilComplete(): Promise<void> {
    if (stryMutAct_9fa48("461")) {
      {}
    } else {
      stryCov_9fa48("461");
      if (stryMutAct_9fa48("464") ? false : stryMutAct_9fa48("463") ? true : stryMutAct_9fa48("462") ? this.completionPromise : (stryCov_9fa48("462", "463", "464"), !this.completionPromise)) {
        if (stryMutAct_9fa48("465")) {
          {}
        } else {
          stryCov_9fa48("465");
          throw new Error(stryMutAct_9fa48("466") ? "" : (stryCov_9fa48("466"), 'Narration not yet generated'));
        }
      }
      await this.completionPromise;
    }
  }

  /**
   * Execute an action while narrating (in parallel)
   * Returns a promise that resolves when BOTH narration and action complete
   */
  async whileDoing(action: () => Promise<void>): Promise<void> {
    if (stryMutAct_9fa48("467")) {
      {}
    } else {
      stryCov_9fa48("467");
      if (stryMutAct_9fa48("470") ? false : stryMutAct_9fa48("469") ? true : stryMutAct_9fa48("468") ? this.completionPromise : (stryCov_9fa48("468", "469", "470"), !this.completionPromise)) {
        if (stryMutAct_9fa48("471")) {
          {}
        } else {
          stryCov_9fa48("471");
          throw new Error(stryMutAct_9fa48("472") ? "" : (stryCov_9fa48("472"), 'Narration not yet generated'));
        }
      }
      await Promise.all(stryMutAct_9fa48("473") ? [] : (stryCov_9fa48("473"), [this.completionPromise, action()]));
    }
  }

  /**
   * Get the duration of this narration in milliseconds
   */
  getDuration(): number {
    if (stryMutAct_9fa48("474")) {
      {}
    } else {
      stryCov_9fa48("474");
      if (stryMutAct_9fa48("477") ? false : stryMutAct_9fa48("476") ? true : stryMutAct_9fa48("475") ? this.ttsResult : (stryCov_9fa48("475", "476", "477"), !this.ttsResult)) {
        if (stryMutAct_9fa48("478")) {
          {}
        } else {
          stryCov_9fa48("478");
          throw new Error(stryMutAct_9fa48("479") ? "" : (stryCov_9fa48("479"), 'Narration not yet generated'));
        }
      }
      return this.ttsResult.durationMs;
    }
  }

  /**
   * Get the audio segment for this narration
   */
  getAudioSegment(): AudioSegment {
    if (stryMutAct_9fa48("480")) {
      {}
    } else {
      stryCov_9fa48("480");
      if (stryMutAct_9fa48("483") ? false : stryMutAct_9fa48("482") ? true : stryMutAct_9fa48("481") ? this.ttsResult : (stryCov_9fa48("481", "482", "483"), !this.ttsResult)) {
        if (stryMutAct_9fa48("484")) {
          {}
        } else {
          stryCov_9fa48("484");
          throw new Error(stryMutAct_9fa48("485") ? "" : (stryCov_9fa48("485"), 'Narration not yet generated'));
        }
      }
      return stryMutAct_9fa48("486") ? {} : (stryCov_9fa48("486"), {
        path: this.ttsResult.audioPath,
        startTimeMs: this.startTimeMs,
        durationMs: this.ttsResult.durationMs,
        type: stryMutAct_9fa48("487") ? "" : (stryCov_9fa48("487"), 'narration')
      });
    }
  }
}