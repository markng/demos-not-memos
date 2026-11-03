import { KokoroProvider, splitKokoroText } from '../../src/kokoro-provider';
import { Narration } from '../../src/narration';
import { writeFile } from 'fs/promises';
jest.mock('fs/promises', () => ({writeFile: jest.fn()}));
jest.mock('../../src/audio-utils', () => ({generateTTS: jest.fn()}));
import { generateTTS } from '../../src/audio-utils';

describe('provider abstraction', () => {
  beforeEach(() => {jest.clearAllMocks();jest.useFakeTimers();});
  afterEach(() => jest.useRealTimers());
  it('supports a third provider without editing routing code', async () => {
    const provider = {audioExtension: 'wav', generate: jest.fn().mockResolvedValue({audioPath:'/tmp/third.wav',durationMs:10})};
    const narration = new Narration('hello','unused','unused',0,'/tmp','third',provider);
    await narration.generate();
    expect(provider.generate).toHaveBeenCalledWith({text:'hello',outputPath:'/tmp/third.wav'});
    expect(generateTTS).not.toHaveBeenCalled();
    jest.runAllTimers(); await narration.waitUntilComplete();
  });
  it('rejects an unsafe file extension', async () => {
    const provider = {audioExtension:'../wav',generate:jest.fn()};
    await expect(new Narration('hello','x','y',0,'/tmp','test',provider).generate()).rejects.toThrow('Invalid provider audio extension');
    expect(provider.generate).not.toHaveBeenCalled();
  });
});

describe('KokoroProvider', () => {
  const request={text:'Hello',outputPath:'/tmp/output.wav'};
  const result={audio:Float32Array.from([0,0.5,-0.5,1,-1]),sampling_rate:24000};
  beforeEach(() => jest.clearAllMocks());
  it('writes valid PCM WAV with sample-derived duration and caches engine', async () => {
    const engine={generate:jest.fn().mockResolvedValue(result)};
    const loader=jest.fn().mockResolvedValue(engine);
    const provider=new KokoroProvider({modelPath:'/model'},loader);
    expect(await provider.generate(request)).toEqual({audioPath:request.outputPath,durationMs:0});
    await provider.generate(request);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(engine.generate).toHaveBeenCalledWith('Hello',{voice:'af_heart',speed:1});
    const wav=(writeFile as jest.Mock).mock.calls[0][1] as Buffer;
    expect(wav.toString('ascii',0,4)).toBe('RIFF');
    expect(wav.toString('ascii',8,12)).toBe('WAVE');
    expect(wav.readUInt32LE(24)).toBe(24000);
    expect(wav.readUInt32LE(4)).toBe(wav.length-8);
    expect(wav.readUInt32LE(28)).toBe(48000);
    expect(wav.toString('ascii',36,40)).toBe('data');
    expect(provider.audioExtension).toBe('wav');
    expect(wav.readUInt32LE(40)).toBe(10);
    expect(wav.readInt16LE(50)).toBe(32767);
    expect(wav.readInt16LE(52)).toBe(-32768);
    expect(generateTTS).not.toHaveBeenCalled();
  });
  it('uses provider-specific voice and speed', async () => {
    const engine={generate:jest.fn().mockResolvedValue(result)};
    await new KokoroProvider({modelPath:'/model',voice:'am_adam',speed:1.2},async()=>engine).generate(request);
    expect(engine.generate).toHaveBeenCalledWith('Hello',{voice:'am_adam',speed:1.2});
  });
  it('splits and preserves long narration rather than truncating it', async () => {
    const text=Array(100).fill('narration').join(' ');
    const chunks=splitKokoroText(text);
    expect(chunks.join(' ')).toBe(text);
    expect(chunks.every(chunk=>chunk.length<=250)).toBe(true);
    const engine={generate:jest.fn().mockResolvedValue({audio:new Float32Array(24000),sampling_rate:24000})};
    const output=await new KokoroProvider({modelPath:'/model'},async()=>engine).generate({...request,text});
    expect(engine.generate).toHaveBeenCalledTimes(chunks.length);
    expect(output.durationMs).toBe(chunks.length*1000);
    expect(splitKokoroText('x'.repeat(501)).map(c=>c.length)).toEqual([250,250,1]);
    const exact='a '.repeat(124)+'ab';expect(exact.length).toBe(250);expect(splitKokoroText(exact)).toEqual([exact]);
  });
  it('rejects empty text without loading model', async () => {
    const loader=jest.fn();
    await expect(new KokoroProvider({modelPath:'/model'},loader).generate({...request,text:'  '})).rejects.toThrow('must not be empty');
    expect(loader).not.toHaveBeenCalled();
  });
  it('requires an absolute local path', () => {
    expect(()=>new KokoroProvider({modelPath:'https://example.org/model'})).toThrow('absolute local');
    expect(()=>new KokoroProvider({modelPath:'model'})).toThrow('absolute local');
  });
  it.each([0,-1,Infinity,NaN])('rejects invalid speed %s', speed => {
    expect(()=>new KokoroProvider({modelPath:'/model',speed})).toThrow('positive');
  });
  it('allows explicit retry after load failure without cloud fallback', async () => {
    const loader=jest.fn().mockRejectedValueOnce(new Error('missing model')).mockResolvedValue({generate:async()=>result});
    const provider=new KokoroProvider({modelPath:'/model'},loader);
    await expect(provider.generate(request)).rejects.toThrow('missing model');
    await provider.generate(request);
    expect(loader).toHaveBeenCalledTimes(2);
    expect(generateTTS).not.toHaveBeenCalled();
  });
  it.each([0,-1,NaN,1.5])('rejects invalid sample rate %s', sampling_rate => {
    const provider=new KokoroProvider({modelPath:'/model'},async()=>({generate:async()=>({...result,sampling_rate})}));
    return expect(provider.generate(request)).rejects.toThrow('sample rate');
  });
  it('rejects inconsistent sample rates', async () => {
    const generate=jest.fn().mockResolvedValueOnce(result).mockResolvedValue({...result,sampling_rate:22050});
    await expect(new KokoroProvider({modelPath:'/model'},async()=>({generate})).generate({...request,text:'x'.repeat(300)})).rejects.toThrow('sample rate');
  });
  it('rejects empty and nonfinite audio', async () => {
    for(const [audio,message] of [[new Float32Array(),'Kokoro returned empty audio'],[Float32Array.from([NaN]),'Kokoro returned non-finite audio']] as const){
      await expect(new KokoroProvider({modelPath:'/model'},async()=>({generate:async()=>({...result,audio})})).generate(request)).rejects.toThrow(message);
    }
  });
  it('propagates synthesis failure without fallback', async () => {
    await expect(new KokoroProvider({modelPath:'/model'},async()=>({generate:async()=>{throw Error('synthesis failed');}})).generate(request)).rejects.toThrow('synthesis failed');
    expect(generateTTS).not.toHaveBeenCalled();
  });
});

jest.mock('kokoro-js', () => ({KokoroTTS: jest.fn().mockImplementation(()=>({
  voices: {af_heart:{}},
  generate: jest.fn().mockResolvedValue({audio:Float32Array.from([0.25]),sampling_rate:24000}),
}))}));
jest.mock('@huggingface/transformers',()=>({
  env:{allowRemoteModels:true,allowLocalModels:false},
  StyleTextToSpeech2Model:{from_pretrained:jest.fn().mockResolvedValue({})},
  AutoTokenizer:{from_pretrained:jest.fn().mockResolvedValue({})},
}));
it('loads the default Kokoro runtime with only local CPU q8 assets',async()=>{
  const provider=new KokoroProvider({modelPath:'/verified-model'});
  await provider.generate({text:'Hello',outputPath:'/tmp/local.wav'});
  const {env,StyleTextToSpeech2Model,AutoTokenizer}=await import('@huggingface/transformers');
  const {KokoroTTS}=await import('kokoro-js');
  expect(env.allowRemoteModels).toBe(false);expect(env.allowLocalModels).toBe(true);
  expect(StyleTextToSpeech2Model.from_pretrained).toHaveBeenCalledWith('/verified-model',{dtype:'q8',device:'cpu',local_files_only:true});
  expect(AutoTokenizer.from_pretrained).toHaveBeenCalledWith('/verified-model',{local_files_only:true});
  expect(KokoroTTS).toHaveBeenCalledWith({},{});
  expect((KokoroTTS as unknown as jest.Mock).mock.results[0].value.generate).toHaveBeenCalledWith('Hello',{voice:'af_heart',speed:1});
});

it('rejects trailing unsafe extension text',async()=>{await expect(new Narration('hello','x','y',0,'/tmp','test',{audioExtension:'wav/..',generate:jest.fn()}).generate()).rejects.toThrow('Invalid provider audio extension');});
