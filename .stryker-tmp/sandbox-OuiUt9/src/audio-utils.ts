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
import { ElevenLabsClient } from 'elevenlabs';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { TTSOptions, TTSResult } from './types';
const execAsync = promisify(exec);

/**
 * Common ElevenLabs voice name to ID mappings
 * If a voice name is not found here, it's assumed to be a voice ID
 */
const VOICE_NAME_TO_ID: Record<string, string> = stryMutAct_9fa48("0") ? {} : (stryCov_9fa48("0"), {
  Rachel: stryMutAct_9fa48("1") ? "" : (stryCov_9fa48("1"), '21m00Tcm4TlvDq8ikWAM'),
  Domi: stryMutAct_9fa48("2") ? "" : (stryCov_9fa48("2"), 'AZnzlk1XvdvUeBnXmlld'),
  Bella: stryMutAct_9fa48("3") ? "" : (stryCov_9fa48("3"), 'EXAVITQu4vr4xnSDxMaL'),
  Antoni: stryMutAct_9fa48("4") ? "" : (stryCov_9fa48("4"), 'ErXwobaYiN019PkySvjV'),
  Elli: stryMutAct_9fa48("5") ? "" : (stryCov_9fa48("5"), 'MF3mGyEYCl7XYWbV9V6O'),
  Josh: stryMutAct_9fa48("6") ? "" : (stryCov_9fa48("6"), 'TxGEqnHWrfWFTfGW9XjX'),
  Arnold: stryMutAct_9fa48("7") ? "" : (stryCov_9fa48("7"), 'VR6AewLTigWG4xSOukaG'),
  Adam: stryMutAct_9fa48("8") ? "" : (stryCov_9fa48("8"), 'pNInz6obpgDQGcFmaJgB'),
  Sam: stryMutAct_9fa48("9") ? "" : (stryCov_9fa48("9"), 'yoZ06aMxZJJ28mfd3POQ'),
  Sarah: stryMutAct_9fa48("10") ? "" : (stryCov_9fa48("10"), 'EXAVITQu4vr4xnSDxMaL')
});

/**
 * Resolve voice name to ElevenLabs voice ID
 */
function resolveVoiceId(voice: string): string {
  if (stryMutAct_9fa48("11")) {
    {}
  } else {
    stryCov_9fa48("11");
    return stryMutAct_9fa48("14") ? VOICE_NAME_TO_ID[voice] && voice : stryMutAct_9fa48("13") ? false : stryMutAct_9fa48("12") ? true : (stryCov_9fa48("12", "13", "14"), VOICE_NAME_TO_ID[voice] || voice);
  }
}

/**
 * Generate TTS audio using ElevenLabs
 */
export async function generateTTS(options: TTSOptions): Promise<TTSResult> {
  if (stryMutAct_9fa48("15")) {
    {}
  } else {
    stryCov_9fa48("15");
    const client = new ElevenLabsClient();
    const voiceId = resolveVoiceId(options.voice);
    const audioStream = await client.textToSpeech.convert(voiceId, stryMutAct_9fa48("16") ? {} : (stryCov_9fa48("16"), {
      text: options.text,
      model_id: options.model
    }));
    const writeStream = createWriteStream(options.outputPath);
    await pipeline(audioStream, writeStream);
    const durationMs = await getAudioDuration(options.outputPath);
    return stryMutAct_9fa48("17") ? {} : (stryCov_9fa48("17"), {
      audioPath: options.outputPath,
      durationMs
    });
  }
}

/**
 * Get audio duration in milliseconds using ffprobe
 */
export async function getAudioDuration(filePath: string): Promise<number> {
  if (stryMutAct_9fa48("18")) {
    {}
  } else {
    stryCov_9fa48("18");
    const {
      stdout
    } = await execAsync(stryMutAct_9fa48("19") ? `` : (stryCov_9fa48("19"), `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`));
    // Stryker disable next-line MethodExpression: equivalent mutant - parseFloat ignores leading whitespace
    const seconds = parseFloat(stdout.trim());
    return Math.round(stryMutAct_9fa48("21") ? seconds / 1000 : (stryCov_9fa48("21"), seconds * 1000));
  }
}