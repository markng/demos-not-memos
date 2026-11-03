/** Minimal provider contract: configuration belongs to each implementation. */
export interface SpeechRequest { text: string; outputPath: string; }
export interface SpeechResult { audioPath: string; durationMs: number; }
export interface TTSProvider {
  readonly audioExtension: string;
  generate(request: SpeechRequest): Promise<SpeechResult>;
}
