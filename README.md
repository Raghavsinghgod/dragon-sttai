# dragon stt

speech to text that runs in your browser. no server. no account. no api calls.

record audio or upload a file, get text back. the model lives in your tab. after first load you can go offline and it still works.

## what it does
- record from mic or upload audio (up to 200mb)
- runs wav2vec2 int8 quantized via webassembly
- shows waveform while recording
- saves history to indexeddb
- tracks usage per api key from the console
- bundles its own weights at /models, never phones home

## stack
react 19, typescript, vite, tailwind 4, onnxruntime-web. persistence in indexeddb + localstorage.

## run it
```
npm install
npm run dev
```
open localhost, allow mic, talk.

## how it works
audio comes in as a blob, gets resampled to 16khz mono float32, then runs through the onnx model in chunks of 25 seconds so long clips dont freeze the page. ctc greedy decode turns the output into text. all of this happens in webassembly inside your browser tab.

the model is wav2vec2-base-960h, int8 dynamic quantized, 91mb. its bundled in public/models and loaded into indexeddb on first run. you can also install your own weights from the model page.

## pages
- /studio — record, upload, transcribe
- /console — api keys, usage charts
- /history — past transcriptions from indexeddb
- /model — download or install weights
- /docs — api reference

## notes
- this started as a prompt engineering project, not a traditional coding one
- the architecture went through several rewrites before landing here
- inference is single-threaded wasm, so very long clips take time
- the model sometimes outputs silence on certain audio formats — still debugging that
- built across a helio g35 android phone and a cyber cafe pc

raghav singh
