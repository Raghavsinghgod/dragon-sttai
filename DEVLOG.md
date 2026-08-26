# devlog

## aug 24
started in freebuff (ai coding agent). gave it a prompt to build an offline speech-to-text web app. it scaffolded the whole thing: react, vite, convex backend, shadcn ui, vitest tests, ci/cd pipeline, training scripts.

problem: it was 105 files. enterprise boilerplate. convex backend for a local-first app. 15 shadcn component files. a training/ folder with python scripts i could never run on my phone. commit messages said "Freebuff: HUMANIZE ENTIRE REPOSITORY" which is the opposite of humanizing.

also the model output silence. the agent committed a 91mb onnx file and wrote "Model is not it just give silence which is not acceptable" and moved on.

## the cleanup
sat down at a cyber cafe with a real keyboard. deleted 36 files: coverage reports, training theater, convex backend, eslint/prettier configs, test infrastructure, build artifacts. merged 6 stt files into one engine.ts. merged 5 lib files into db.ts. deleted the entire shadcn ui/ folder.

105 files down to 14.

stripped all comments. lowercased identifiers. removed framer motion where it wasnt needed. killed the bun test suite i couldnt run anyway.

## what actually works
- landing page loads on vercel
- studio records from mic and shows waveform
- onnx model loads from indexeddb
- transcription runs in wasm, no server
- history saves to indexeddb
- console tracks api key usage

## what doesnt work yet
- model outputs silence on some audio formats (preprocessing mismatch, probably mel vs raw pcm)
- havent tested on mobile safari
- the 91mb model makes first load slow
- docs page is mostly placeholder

## what i learned
prompt engineering is not the same as software engineering. i can describe what i want perfectly but the agent builds what it thinks a senior dev would build, not what a prototype needs. 105 files is not a bug, its the agents default setting.

the hard part wasnt getting the ai to write code. it was knowing which 90 files to delete.

## next
- fix the silence bug (check input_values vs log-mel path in engine.ts)
- test on actual mobile
- shrink the model or lazy-load it
- rewrite the remaining pages to be less... corporate

built by raghav singh. prompt engineer, zero traditional coding background, helio g35 + cyber cafe.
