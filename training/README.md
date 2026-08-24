# dragon stt training toolkit

offline trainer for the dragon-stt acoustic model. runs on any machine with python; the browser never sees this code — only the two artifacts it exports. every step is verified by `smoke_test.py`, which executes the full chain (synthetic data → train → export → int8 quantize → onnxruntime contract check) in about two minutes with zero downloads.

## install

```
pip install -r requirements.txt
```

torch 2.13 note: the onnx exporter additionally needs `onnxscript` (already in requirements). audio loading goes through `soundfile` (wav and flac), with torchaudio as fallback — torchaudio 2.9+ removed its classic backends, so do not rely on `torchaudio.load` alone.

## prove the pipeline first

```
python smoke_test.py
```

expected output: `PASS logits [1,t,29] at dynamic t · int8 3.51 mb · ort loads and runs`. verified in-sandbox on python 3.10 / torch 2.13 cpu / onnxruntime 1.23.

## ten hours of public audio

librispeech dev-clean + test-clean (cc by 4.0, ~680 mb download, ~10.8 h of read speech):

```
python prepare_data.py --hours 10 --out data
python train.py --manifest data/manifest.csv --epochs 30 --batch-size 16
python export_onnx.py --ckpt dragon.pt --out-dir ../public/models
```

`prepare_data.py` downloads and extracts the two openslr tarballs once (cached under `data/tarballs`), then writes `data/manifest.csv` capped to the requested hours. reruns skip finished steps.

honest expectations:

- gpu (rtx 3060 / t4 class): ~4-8 min per epoch → 30 epochs in roughly 2-4 hours. cpu: 30-60+ min per epoch → plan a multi-day run or use colab/kaggle.
- a 1.8m-param char-ctc model on 10 h lands around 25-40% wer on clean reads. it is a real, working model — and visibly weaker than the 95m wav2vec2 weights the app bundles by default (~8% wer). train this for the own-weights story, then a/b both on the app's evaluate card.
- training features mirror the browser's log-mel exactly (512 fft, 400 win, 160 hop, hamming, 80 htk mels, natural log, 1e-6 floor), so exported weights see the same inputs at runtime.

## data format

manifest csv with absolute or trainer-relative `path,text` rows, lowercase transcripts. the loader downmixes to mono and resamples to 16 khz itself. common voice subsets work via a tsv converter — see git history or ask for one.

## export contract

`inputs [1,t,80] float32 → logits [1,t,vocab]` · opset 17 · dynamic time axis · blank is vocab index 0 · int8 dynamic quantized. the runtime autodetects this log-mel contract by input name; the bundled wav2vec2 build uses raw waveform (`input_values [1,T]`) instead. exported files drop into `public/models`, or install them from disk or a cors url on the app's model page — installed weights persist in indexeddb and win over bundled ones.
