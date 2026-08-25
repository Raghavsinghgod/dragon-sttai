import{j as e}from"./framer-motion-D5IBGcks.js";import{c as N,t as u}from"./index-CSv8q60m.js";import{L as S}from"./react-vendor-B8NFmY3z.js";import{B as x}from"./landing-TAJwbGUc.js";import{S as z}from"./shell--R5PYSVU.js";import{v as T}from"./vocab-iSzv551P.js";import{C as y}from"./copy-Bv2ovmab.js";import"./radix-ui-DgSllbbQ.js";const U=[["path",{d:"M12 15V3",key:"m9g1x1"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["path",{d:"m7 10 5 5 5-5",key:"brsn70"}]],A=N("download",U),C=(()=>{const t=new Uint32Array(256);for(let o=0;o<256;o++){let n=o;for(let a=0;a<8;a++)n=n&1?(3988292384^n>>>1)>>>0:n>>>1;t[o]=n}return t})();function P(t){let o=4294967295;for(let n=0;n<t.length;n++)o=C[(o^t[n])&255]^o>>>8;return(o^4294967295)>>>0}function f(t){const o=t.reduce((l,p)=>l+p.length,0),n=new Uint8Array(o);let a=0;for(const l of t)n.set(l,a),a+=l.length;return n}function s(t){const o=new Uint8Array(2);return new DataView(o.buffer).setUint16(0,t,!0),o}function r(t){const o=new Uint8Array(4);return new DataView(o.buffer).setUint32(0,t,!0),o}function M(t){const o=t.getHours()<<11|t.getMinutes()<<5|Math.floor(t.getSeconds()/2),n=t.getFullYear()-1980<<9|t.getMonth()+1<<5|t.getDate();return[o,n]}function B(t){const o=new TextEncoder,[n,a]=M(new Date),l=[],p=[];let h=0;for(const[k,v]of t){const m=new Uint8Array(o.encode(k)),c=new Uint8Array(o.encode(v)),b=P(c);l.push(r(67324752),s(20),s(2048),s(0),s(n),s(a),r(b),r(c.length),r(c.length),s(m.length),s(0),m,c),p.push(r(33639248),s(20),s(20),s(2048),s(0),s(n),s(a),r(b),r(c.length),r(c.length),s(m.length),s(0),s(0),s(0),s(0),r(0),r(h),m),h+=30+m.length+c.length}const g=f(p),j=f([r(101010256),s(0),s(0),s(t.length),s(t.length),r(g.length),r(h),s(0)]);return new Blob([f(l),g,j],{type:"application/zip"})}function D(t){return t.map(([o,n])=>`// === ${o} ===
${n}`).join(`

`)}function E(t,o){const n=URL.createObjectURL(t),a=document.createElement("a");a.href=n,a.download=o,a.click(),URL.revokeObjectURL(n)}const F=Object.assign({}),R=`dragon stt runtime starter

contents
  src/stt/         audio decode, log-mel features, ctc decode, engine, vocab
  public/models/   vocab.json template + where weights go

setup
  1. install onnxruntime-web in your host app
  2. copy its wasm binaries into public/ort/
  3. drop dragon-stt.onnx int8 weights into public/models/
  4. wire it:

       const { pcm } = await blobToPcm(recorded)
       const { text, modelVer } = await transcribe(pcm, (stage) => log(stage))

  5. kill the network after first load and confirm transcription still runs

api key
  mint a project key in the dragon console and paste it into your app config.
  keys are local identifiers only; nothing phones home.

full guide lives at /docs on the dragon stt site.`,V=`the bundled dragon-stt.onnx ships real wav2vec2-base
weights (librispeech, apache-2.0): raw waveform in — input input_values
[1,T] float32 at 16 khz z-score normalized per clip, output logits
[1,T,V], blank = index 0. copy it together with vocab.json.

custom exports from training/export_onnx.py use log-mel features:
input inputs [1,T,80] float32, output logits [1,T,V]. keep vocab.json
blank-first (index 0 = "") so ids match what ctcGreedy drops.`;function w(){const t=Object.entries(F).map(([o,n])=>["src/"+o.replace(/^(?:\.\.\/)+/,""),n]).sort((o,n)=>o[0].localeCompare(n[0]));return t.push(["public/models/vocab.json",JSON.stringify(["",...T.slice(1)],null,2)]),t.push(["public/models/readme.txt",V]),t.push(["readme.txt",R]),t}function L(){E(B(w()),"dragon-stt-starter.zip"),u.success("starter.zip downloaded")}function O(){navigator.clipboard.writeText(D(w())).then(()=>u.success("all sources copied"),()=>u.error("copy failed"))}const _=[["layout","project layout"],["install","install"],["audio","audio in"],["transcribe","transcribe"],["features","features only"],["reference","reference"],["keys","api keys"],["offline","offline checklist"]],$=`your-app/
  src/stt/
    audio.ts
    decode.ts
    engine.ts
    features.ts
    vocab.ts
  public/
    ort/
      ort-wasm-simd-threaded.wasm
    models/
      dragon-stt.onnx
      vocab.json`,q="bun add onnxruntime-web",G=`import * as ort from "onnxruntime-web"

ort.env.wasm.wasmPaths = "/ort/"
ort.env.wasm.numThreads = 1`,H=`import { blobToPcm } from "./stt/audio"

const { pcm, duration } = await blobToPcm(audioBlob)
if (duration < 0.3) throw new Error("clip too short")`,I=`import { getEngineState, transcribe, warmup } from "./stt/engine"

await warmup()

const { text, modelVer } = await transcribe(pcm, setStage)`,J=`import { frameCount, logMelFrame } from "./stt/features"

const frames = frameCount(pcm.length)
const feats = new Float32Array(frames * 80)
const row = new Float32Array(80)
for (let t = 0; t < frames; t++) {
  logMelFrame(pcm, t * 160, row)
  feats.set(row, t * 80)
}`,Y=[["blobToPcm","(blob: Blob) => Promise<{ pcm: Float32Array; duration: number }>","decodes any browser-supported audio to mono float32 at 16 khz via offlineaudiocontext resampling"],["transcribe","(pcm: Float32Array, onStage: (stage: string) => void) => Promise<{ text: string; modelVer: string }>","full pipeline: log-mel, chunked inference at 800 frames, ctc greedy decode; yields between chunks so the ui never freezes"],["warmup","() => Promise<void>","runs a silent 0.5 s pass; call once after load so the first real request is fast"],["modelCard","{ name, params, sizeMb, quant, vocabSize }","bundled model metadata for display or telemetry-free diagnostics"],["getEngineState",'() => "cold" | "loading" | "ready" | "mock"',"mock means weights were absent at load time and the deterministic fallback decoder is active"],["onEngineState","(fn: (s: engineState) => void) => () => void","subscribe to state changes; the returned function unsubscribes"]];function Z(t){navigator.clipboard.writeText(t).then(()=>u.success("copied"),()=>u.error("copy failed"))}function d({code:t}){return e.jsxs("div",{className:"group relative",children:[e.jsx("pre",{className:"overflow-x-auto rounded-lg border border-border/60 bg-card p-4 pr-12 font-mono text-xs leading-relaxed",children:t}),e.jsx(x,{size:"icon",variant:"ghost",title:"copy snippet",className:"absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100",onClick:()=>Z(t),children:e.jsx(y,{className:"size-3.5"})})]})}function i({id:t,title:o,children:n}){return e.jsxs("section",{id:t,className:"mt-10 scroll-mt-20",children:[e.jsx("h2",{className:"text-lg font-semibold tracking-tight",children:o}),e.jsx("div",{className:"mt-3 space-y-3",children:n})]})}function se(){return e.jsxs(z,{children:[e.jsx("h1",{className:"text-2xl font-semibold tracking-tight",children:"docs"}),e.jsx("p",{className:"mt-1 text-sm text-muted-foreground",children:"embed guide · ship dragon-stt inside your own app. five source modules, one package, zero network at runtime."}),e.jsx("nav",{className:"mt-6 flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs",children:_.map(([t,o],n)=>e.jsxs("a",{href:`#${t}`,className:"text-muted-foreground transition-colors hover:text-primary",children:[e.jsx("span",{className:"text-primary",children:String(n+1).padStart(2,"0")})," ",o]},t))}),e.jsxs(i,{id:"layout",title:"project layout",children:[e.jsxs("p",{className:"text-sm leading-relaxed text-muted-foreground",children:["copy the runtime sources and static assets into your app. everything is same-origin: wasm from ",e.jsx("code",{className:"font-mono",children:"/ort"}),", weights from"," ",e.jsx("code",{className:"font-mono",children:"/models"}),"."]}),e.jsx(d,{code:$}),e.jsxs("div",{className:"flex flex-wrap gap-2",children:[e.jsxs(x,{size:"sm",variant:"outline",onClick:L,children:[e.jsx(A,{className:"size-3.5"}),"download starter.zip"]}),e.jsxs(x,{size:"sm",variant:"outline",onClick:O,children:[e.jsx(y,{className:"size-3.5"}),"copy all sources"]})]}),e.jsx("p",{className:"text-xs leading-relaxed text-muted-foreground",children:"the zip bundles all five modules, a matching vocab.json template and setup readmes, built client-side at download time. ort wasm binaries stay binary — copy them from onnxruntime-web dist into your public/ort folder."})]}),e.jsxs(i,{id:"install",title:"install",children:[e.jsx("p",{className:"text-sm leading-relaxed text-muted-foreground",children:"onnxruntime-web is the only dependency. no dsp libs, no ml frameworks."}),e.jsx(d,{code:q}),e.jsx("p",{className:"text-sm leading-relaxed text-muted-foreground",children:"engine.ts already pins the wasm path and single-thread execution, so this config is only needed if you roll your own session."}),e.jsx(d,{code:G})]}),e.jsxs(i,{id:"audio",title:"audio in",children:[e.jsx("p",{className:"text-sm leading-relaxed text-muted-foreground",children:"feed any blob the browser can decode — mediaRecorder output, uploaded files, websocket chunks. it comes back as mono float32 at 16 khz."}),e.jsx(d,{code:H})]}),e.jsxs(i,{id:"transcribe",title:"transcribe",children:[e.jsx("p",{className:"text-sm leading-relaxed text-muted-foreground",children:"one call runs the whole pipeline. stage callbacks arrive in order: decoding audio, extracting features, running dragon stt, done. wire them straight into a status line."}),e.jsx(d,{code:I}),e.jsxs("p",{className:"text-sm leading-relaxed text-muted-foreground",children:["long clips never block the ui: features and inference are chunked and yield between chunks. check ",e.jsx("code",{className:"font-mono",children:"getEngineState()"})," before relying on real output — ",e.jsx("code",{className:"font-mono",children:"mock"})," means weights were missing."]})]}),e.jsxs(i,{id:"features",title:"features only",children:[e.jsx("p",{className:"text-sm leading-relaxed text-muted-foreground",children:"want the mel front-end for your own downstream model? it is exported directly. stride is 160 samples (10 ms), window 400 (25 ms)."}),e.jsx(d,{code:J}),e.jsxs("p",{className:"text-sm leading-relaxed text-muted-foreground",children:["if you retrain the weights yourself, mirror the packing in engine.ts runModel before calling ",e.jsx("code",{className:"font-mono",children:"ctcGreedy"})," — padded logits must be compacted to vocab width first."]})]}),e.jsx(i,{id:"reference",title:"reference",children:e.jsx("div",{className:"divide-y divide-border/60 border-y border-border/60",children:Y.map(([t,o,n])=>e.jsxs("div",{className:"py-3",children:[e.jsx("p",{className:"font-mono text-sm text-primary",children:t}),e.jsx("p",{className:"mt-1 font-mono text-xs break-all",children:o}),e.jsx("p",{className:"mt-1 text-xs leading-relaxed text-muted-foreground",children:n})]},t))})}),e.jsx(i,{id:"keys",title:"api keys",children:e.jsxs("p",{className:"text-sm leading-relaxed text-muted-foreground",children:["mint one key per project in the"," ",e.jsx(S,{to:"/dashboard",className:"text-primary hover:underline",children:"console"})," ","and paste it into your app config. mark a key as live and every studio transcription ticks its run counter. keys are local identifiers for your builds — they are generated, stored and checked entirely on-device, and they never leave the browser."]})}),e.jsx(i,{id:"offline",title:"offline checklist",children:e.jsxs("ul",{className:"list-disc space-y-1 pl-4 text-sm leading-relaxed text-muted-foreground",children:[e.jsx("li",{children:"copy src/stt and public/ort into the host app"}),e.jsx("li",{children:"place dragon-stt.onnx and vocab.json under public/models"}),e.jsx("li",{children:"optional: install weights from any cors url or disk on the model page — fetched once into indexeddb, inference stays on device"}),e.jsx("li",{children:"keep wasm same-origin at /ort, numThreads 1"}),e.jsx("li",{children:"after first load, kill the network: transcription must still work"})]})})]})}export{se as default};
