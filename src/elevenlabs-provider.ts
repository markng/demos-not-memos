import { generateTTS } from './audio-utils';
import { SpeechRequest, SpeechResult, TTSProvider } from './tts-provider';
/** Existing ElevenLabs behavior, also usable through the provider interface. */
export class ElevenLabsProvider implements TTSProvider {
  readonly audioExtension = 'mp3';
  constructor(private readonly options: {voice: string; model: string}) {}
  generate(request: SpeechRequest): Promise<SpeechResult> {
    return generateTTS({...request, ...this.options});
  }
}
