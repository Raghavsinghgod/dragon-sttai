# dragon stt

offline speech to text that runs entirely in the browser. record or upload audio, get text, keep it local. no accounts, no servers, no inference calls — after first load it works with the network off.

## stack

react 19, typescript, vite, tailwind 4, framer motion. inference via onnxruntime-web (wasm, single thread). persistence in indexeddb and localstorage. bun for scripts and tests.

## layout

- src/pages — landing, studio, dashboard (console), history, model, docs
- src/stt — audio decode, fft + log-mel features, onnx engine, ctc decode, scoring
- src/lib — history db, api keys + per-key usage, installed weights store, starter bundle, chart bucketing
- src/components — waveform canvas, bench, shell
- training — python toolkit that produces the bundled weights (see training/README.md)
- public/models — dragon-stt.onnx + vocab.json, bundled, never fetched at runtime

## commands

```
bun install
bun tsc -b --noEmit
bun run lint
bun run test:coverage
```

## weights

the default model is wav2vec2-base-960h, int8 dynamic quantized, apache-2.0, re-exported as dragon-stt. train your own with the toolkit in training/ and install the export from the model page — installed weights live in indexeddb and win over the bundled ones.
