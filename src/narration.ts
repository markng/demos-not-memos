import { ElevenLabsProvider } from './elevenlabs-provider';
import { TTSProvider } from './tts-provider';
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

  constructor(
    text: string,
    voice: string,
    model: string,
    startTimeMs: number,
    outputDir: string,
    segmentId: string,
    private readonly provider?: TTSProvider
  ) {
    this.text = text;
    this.voice = voice;
    this.model = model;
    this.startTimeMs = startTimeMs;
    this.outputDir = outputDir;
    this.segmentId = segmentId;
  }

  /**
   * Generate TTS and start the timer
   * Called internally by NarratedDemo
   */
  async generate(): Promise<void> {
    const provider = this.provider ?? new ElevenLabsProvider({voice: this.voice, model: this.model});
    if (!/^[a-z0-9]+$/i.test(provider.audioExtension)) throw new Error('Invalid provider audio extension');
    const audioPath = `${this.outputDir}/${this.segmentId}.${provider.audioExtension}`;

    this.ttsResult = await provider.generate({
      text: this.text,
      outputPath: audioPath,
    });

    // Set up completion promise with timer
    this.completionPromise = new Promise((resolve) => {
      this.resolveCompletion = resolve;
      setTimeout(resolve, this.ttsResult!.durationMs);
    });
  }

  /**
   * Wait for the narration to complete (speech duration)
   */
  async waitUntilComplete(): Promise<void> {
    if (!this.completionPromise) {
      throw new Error('Narration not yet generated');
    }
    await this.completionPromise;
  }

  /**
   * Execute an action while narrating (in parallel)
   * Returns a promise that resolves when BOTH narration and action complete
   */
  async whileDoing(action: () => Promise<void>): Promise<void> {
    if (!this.completionPromise) {
      throw new Error('Narration not yet generated');
    }
    await Promise.all([this.completionPromise, action()]);
  }

  /**
   * Get the duration of this narration in milliseconds
   */
  getDuration(): number {
    if (!this.ttsResult) {
      throw new Error('Narration not yet generated');
    }
    return this.ttsResult.durationMs;
  }

  /**
   * Get the audio segment for this narration
   */
  getAudioSegment(): AudioSegment {
    if (!this.ttsResult) {
      throw new Error('Narration not yet generated');
    }
    return {
      path: this.ttsResult.audioPath,
      startTimeMs: this.startTimeMs,
      durationMs: this.ttsResult.durationMs,
      type: 'narration',
    };
  }
}
