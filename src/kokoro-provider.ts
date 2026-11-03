import { isAbsolute } from 'path';
import { writeFile } from 'fs/promises';
import { SpeechRequest, SpeechResult, TTSProvider } from './tts-provider';

export interface KokoroOptions { modelPath: string; voice?: string; speed?: number; }
export interface KokoroEngine {
  generate(text: string, options: {voice: string; speed: number}):
    Promise<{audio: Float32Array; sampling_rate: number}>;
}
export type KokoroLoader = (modelPath: string) => Promise<KokoroEngine>;

/** Load only explicit local files. The package includes its voices; no API fallback. */
async function loadKokoro(modelPath: string): Promise<KokoroEngine> {
  const [{KokoroTTS}, {env, StyleTextToSpeech2Model, AutoTokenizer}] =
    await Promise.all([import('kokoro-js'), import('@huggingface/transformers')]);
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  const [model, tokenizer] = await Promise.all([
    StyleTextToSpeech2Model.from_pretrained(modelPath, {dtype: 'q8', device: 'cpu', local_files_only: true}),
    AutoTokenizer.from_pretrained(modelPath, {local_files_only: true}),
  ]);
  const tts = new KokoroTTS(model, tokenizer);
  return {generate: (text, options) => tts.generate(text, {
    voice: options.voice as keyof typeof tts.voices, speed: options.speed,
  })};
}

/** Keep sentence prosody intact while bounding input to the local model.
 * Overlong sentences must be rewritten, never silently cut in the middle.
 */
export function splitKokoroText(text: string): string[] {
  const chunks: string[] = [];
  let current = '';
  const sentences = new Intl.Segmenter('en', {granularity: 'sentence'}).segment(text);
  for (const {segment} of sentences) {
    const sentence = segment.trim();
    if (sentence.length > 250) {
      throw new Error('Kokoro sentence exceeds 250 characters; shorten it or add sentence punctuation');
    }
    const joined = current ? `${current} ${sentence}` : sentence;
    if (joined.length > 250) {
      chunks.push(current);
      current = sentence;
    } else {
      current = joined;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function encodeWav(samples: Float32Array, sampleRate: number): Buffer {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WAVEfmt ', 8); buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, i) => {
    if (!Number.isFinite(sample)) throw new Error('Kokoro returned non-finite audio');
    const clipped = Math.max(-1, Math.min(1, sample));
    // Stryker disable next-line EqualityOperator: at zero either scale yields exactly zero.
    buffer.writeInt16LE(Math.round(clipped * (clipped < 0 ? 32768 : 32767)), 44 + i * 2);
  });
  return buffer;
}

/** Offline CPU/q8 narration. Model acquisition is deliberately separate. */
export class KokoroProvider implements TTSProvider {
  readonly audioExtension = 'wav';
  private engine?: Promise<KokoroEngine>;
  private readonly voice: string;
  private readonly speed: number;
  constructor(private readonly options: KokoroOptions, private readonly loader: KokoroLoader = loadKokoro) {
    if (!isAbsolute(options.modelPath)) throw new Error('Kokoro requires an absolute local modelPath');
    this.voice = options.voice ?? 'af_heart';
    this.speed = options.speed ?? 1;
    if (!Number.isFinite(this.speed) || this.speed <= 0) throw new Error('Kokoro speed must be positive');
  }
  async generate(request: SpeechRequest): Promise<SpeechResult> {
    const chunks = splitKokoroText(request.text);
    if (chunks.length === 0) throw new Error('Kokoro narration must not be empty');
    if (!this.engine) this.engine = this.loader(this.options.modelPath).catch(error => {
      this.engine = undefined;
      throw error;
    });
    const engine = await this.engine;
    const audio: Float32Array[] = [];
    let rate = 0;
    for (const chunk of chunks) {
      const result = await engine.generate(chunk, {voice: this.voice, speed: this.speed});
      if (!Number.isInteger(result.sampling_rate) || result.sampling_rate <= 0 ||
          (rate !== 0 && rate !== result.sampling_rate)) throw new Error('Invalid Kokoro sample rate');
      rate = result.sampling_rate;
      if (result.audio.length === 0) throw new Error('Kokoro returned empty audio');
      audio.push(result.audio);
    }
    const combined = new Float32Array(audio.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    for (const part of audio) { combined.set(part, offset); offset += part.length; }
    await writeFile(request.outputPath, encodeWav(combined, rate));
    return {audioPath: request.outputPath, durationMs: Math.round(combined.length / rate * 1000)};
  }
}
