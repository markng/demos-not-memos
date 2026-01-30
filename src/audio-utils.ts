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
const VOICE_NAME_TO_ID: Record<string, string> = {
  Rachel: '21m00Tcm4TlvDq8ikWAM',
  Domi: 'AZnzlk1XvdvUeBnXmlld',
  Bella: 'EXAVITQu4vr4xnSDxMaL',
  Antoni: 'ErXwobaYiN019PkySvjV',
  Elli: 'MF3mGyEYCl7XYWbV9V6O',
  Josh: 'TxGEqnHWrfWFTfGW9XjX',
  Arnold: 'VR6AewLTigWG4xSOukaG',
  Adam: 'pNInz6obpgDQGcFmaJgB',
  Sam: 'yoZ06aMxZJJ28mfd3POQ',
  Sarah: 'EXAVITQu4vr4xnSDxMaL',
};

/**
 * Resolve voice name to ElevenLabs voice ID
 */
function resolveVoiceId(voice: string): string {
  return VOICE_NAME_TO_ID[voice] || voice;
}

/**
 * Generate TTS audio using ElevenLabs
 */
export async function generateTTS(options: TTSOptions): Promise<TTSResult> {
  const client = new ElevenLabsClient();
  const voiceId = resolveVoiceId(options.voice);

  const audioStream = await client.textToSpeech.convert(voiceId, {
    text: options.text,
    model_id: options.model,
  });

  const writeStream = createWriteStream(options.outputPath);
  await pipeline(audioStream, writeStream);

  const durationMs = await getAudioDuration(options.outputPath);

  return {
    audioPath: options.outputPath,
    durationMs,
  };
}

/**
 * Get audio duration in milliseconds using ffprobe
 */
export async function getAudioDuration(filePath: string): Promise<number> {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
  );
  // Stryker disable next-line MethodExpression: equivalent mutant - parseFloat ignores leading whitespace
  const seconds = parseFloat(stdout.trim());
  return Math.round(seconds * 1000);
}
