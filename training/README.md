# dragon stt training toolkit

offline trainer for the bundled dragon-stt acoustic model. runs on any machine with python and a cpu or gpu; the browser never sees this code — only the two artifacts it exports.

## install

```
pip install -r requirements.txt
```

## data

any folder of wav clips plus a manifest csv (`path,text`) with lowercase transcripts works. to pull a common voice subset, point `src` at your extracted corpus:

```python
import csv

src = "cv-corpus/validated.tsv"
with open(src, newline="") as f, open("manifest.csv", "w", newline="") as out:
    reader = csv.DictReader(f, delimiter="\t")
    writer = csv.writer(out)
    for row in reader:
        sentence = row["sentence"].strip().lower()
        if sentence.isascii() and sentence:
            writer.writerow([f"clips/{row['path']}", sentence])
```

the loader downmixes to mono and resamples to 16 khz itself, so source rates are flexible.

## train

```
python train.py --manifest manifest.csv --epochs 30 --batch-size 16
```

prints per-epoch ctc loss (plus val loss when the split is non-empty), then saves `dragon.pt` and `vocab.json`. vocab layout: empty string blank at index 0, space, letters, apostrophe.

## export

```
python export_onnx.py --ckpt dragon.pt --out-dir ../public/models
```

writes `dragon-stt.onnx` (int8 dynamic quantized) and `vocab.json` straight into the web app's public models folder. until both files exist there, the studio stays in mock decode.

## contract

inputs [1,t,80] float32 → logits [1,t,vocab] · opset 17 · dynamic time axis · runtime pinned to 1 thread · params under 2 m at hidden 256 · int8 size well under the 15 mb cap.
