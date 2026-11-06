import fs from 'node:fs/promises';
import path from 'node:path';
import {KokoroTTS} from 'kokoro-js';
import {env,StyleTextToSpeech2Model,AutoTokenizer} from '@huggingface/transformers';
import {KokoroProvider,splitKokoroText} from './dist/kokoro-provider.js';
globalThis.fetch=async()=>{throw Error('Network forbidden');};
env.allowRemoteModels=false;env.allowLocalModels=true;
const modelPath='/Users/mng/Projects/polycratic-router-recovered/runtime-closeout/models/Kokoro-82M-v1.0-ONNX-1939ad2a8e416c0acfeecc08a694d14ef25f2231';
const out='demo-review-huub-20261103/sentence-repair';await fs.mkdir(out,{recursive:true});
const chapters=JSON.parse(await fs.readFile('demo-review-huub-20261103/chapters.json','utf8')).chapters;
const chapter=chapters.find(x=>x.id==='02');
const [model,tokenizer]=await Promise.all([StyleTextToSpeech2Model.from_pretrained(modelPath,{dtype:'q8',device:'cpu',local_files_only:true}),AutoTokenizer.from_pretrained(modelPath,{local_files_only:true})]);
const tts=new KokoroTTS(model,tokenizer);
const oldChunks=[];let rem=chapter.text.trim();while(rem.length>250){const space=rem.lastIndexOf(' ',250);const end=space!==-1?space:250;oldChunks.push(rem.slice(0,end));rem=rem.slice(end).trimStart();}if(rem)oldChunks.push(rem);
const oldTimings=[];for(const [i,text]of oldChunks.entries()){const a=await tts.generate(text,{voice:'af_heart',speed:1});await a.save(path.join(out,'old-chunk-'+i+'.wav'));oldTimings.push({text,durationMs:a.audio.length/a.sampling_rate*1000});}
const newTimings=[];const provider=new KokoroProvider({modelPath},async()=>({generate:async(text,options)=>{const a=await tts.generate(text,options);newTimings.push({text,durationMs:a.audio.length/a.sampling_rate*1000});return a;}}));
const result=await provider.generate({text:chapter.text,outputPath:path.join(out,'02-after.wav')});
const audit={chapter,oldTimings,newTimings,result,allChapterSegments:chapters.map(c=>({id:c.id,chunks:splitKokoroText(c.text)}))};
await fs.writeFile(path.join(out,'segmentation-audit.json'),JSON.stringify(audit,null,2));
console.log(JSON.stringify({oldTimings,newTimings,result}));

