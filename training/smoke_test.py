import math
import random
import shutil
import subprocess
import sys
import time
from pathlib import Path

import onnxruntime as ort

here = Path(__file__).parent
work = here / "smoke_work"
if work.exists():
    shutil.rmtree(work)
work.mkdir()

random.seed(11)
sample_rate = 16000
syllables = ["ka", "tor", "em", "ber", "vex", "ul", "on", "dra", "gon", "ith", "arn", "old"]


def synth_clip(path: Path, seconds: float) -> str:
    total = int(seconds * sample_rate)
    wav = [0.0] * total
    cursor = 0
    words = []
    while cursor < total - 3200:
        burst = random.randint(2400, 5200)
        if cursor + burst >= total:
            break
        base = random.uniform(180, 900)
        for i in range(cursor, min(cursor + burst, total)):
            t = i / sample_rate
            env = 0.5 * (1 - math.cos(2 * math.pi * (i - cursor) / burst))
            wav[i] = env * (
                0.5 * math.sin(2 * math.pi * base * t)
                + 0.3 * math.sin(2 * math.pi * base * 2.3 * t)
                + 0.2 * math.sin(2 * math.pi * base * 3.7 * t)
            )
        cursor += burst + random.randint(1200, 3600)
        words.append(" ".join(random.choices(syllables, k=random.randint(1, 3))))
    import wave

    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(sample_rate)
        frames = bytearray()
        for v in wav:
            v = max(-1.0, min(1.0, v))
            frames += int(v * 32767).to_bytes(2, "little", signed=True)
        handle.writeframes(bytes(frames))
    return " ".join(words)


rows = []
for i in range(24):
    clip = work / f"clip_{i:02d}.wav"
    text = synth_clip(clip, random.uniform(1.2, 2.2))
    rows.append((str(clip), text))

manifest = work / "manifest.csv"
with open(manifest, "w", newline="") as handle:
    import csv

    writer = csv.writer(handle)
    writer.writerows(rows)


def run(*cmd: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] +", " ".join(cmd), flush=True)
    result = subprocess.run([sys.executable, "-u", *cmd], cwd=here)
    if result.returncode != 0:
        raise SystemExit(f"step failed: {' '.join(cmd)}")


run("train.py", "--manifest", str(manifest), "--epochs", "2", "--batch-size", "8", "--ckpt-out", str(work / "smoke.pt"), "--vocab-out", str(work / "smoke_vocab.json"))
run("export_onnx.py", "--ckpt", str(work / "smoke.pt"), "--out-dir", str(work))

model_path = work / "dragon-stt.onnx"
size_mb = model_path.stat().st_size / 1e6
session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
input_name = session.input_names[0]
output_name = session.output_names[0]
for frames in (200, 77):
    logits = session.run([output_name], {input_name: __import__("numpy").zeros((1, frames, 80), dtype="float32")})[0]
    assert list(logits.shape) == [1, frames, 29], f"bad logits shape {logits.shape}"
assert size_mb < 15, f"quantized model too large: {size_mb:.2f} mb"

print(f"PASS logits [1,t,29] at dynamic t · int8 {size_mb:.2f} mb · ort loads and runs")
shutil.rmtree(work)
