import argparse
import csv
import json
import math
import os
import random
from pathlib import Path

import torch
import torchaudio
from torch import nn
from torch.utils.data import DataLoader, Dataset

sample_rate = 16000
n_fft = 512
win_length = 400
hop_length = 160
n_mels = 80
f_min = 20
f_max_ratio = 0.95
floor = 1e-6

default_vocab = ["", " ", *map(chr, range(ord("a"), ord("z") + 1)), "'"]


def load_vocab(path):
    p = Path(path)
    if p.exists():
        return json.loads(p.read_text())
    return list(default_vocab)


def load_audio(path):
    try:
        import soundfile

        data, sr = soundfile.read(path, dtype="float32", always_2d=True)
        return torch.from_numpy(data.T).mean(0), sr
    except ImportError:
        wav, sr = torchaudio.load(path)
        return wav.mean(0), sr


def log_mel(wav):
    spec = torchaudio.transforms.MelSpectrogram(
        sample_rate,
        n_fft=n_fft,
        win_length=win_length,
        hop_length=hop_length,
        f_min=f_min,
        f_max=int(sample_rate * f_max_ratio / 2),
        n_mels=n_mels,
        window_fn=torch.hamming_window,
        power=2.0,
        mel_scale="htk",
        norm=None,
    )(wav.unsqueeze(0))
    return (spec + floor).log().squeeze(0).T


class Clips(Dataset):
    def __init__(self, rows, vocab):
        self.rows = rows
        self.vocab = vocab

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, index):
        path, text = self.rows[index]
        wav, sr = load_audio(path)
        if sr != sample_rate:
            wav = torchaudio.functional.resample(wav, sr, sample_rate)
        feats = log_mel(wav)
        ids = [self.vocab.index(ch) for ch in text.lower() if ch in self.vocab]
        if not ids:
            ids = [0]
        return feats, ids


def collate(batch):
    feats, targets = zip(*batch)
    lengths = torch.tensor([f.shape[0] for f in feats])
    max_len = int(lengths.max())
    dim = feats[0].shape[1]
    features = torch.full((len(feats), max_len, dim), math.log(floor))
    for i, f in enumerate(feats):
        features[i, : f.shape[0]] = f
    merged = torch.cat([torch.tensor(t) for t in targets])
    sizes = torch.tensor([len(t) for t in targets])
    return features, lengths, merged, sizes


class Dragon(nn.Module):
    def __init__(self, vocab_size, hidden=256):
        super().__init__()
        self.lstm = nn.LSTM(n_mels, hidden, num_layers=2, batch_first=True, dropout=0.1)
        self.out = nn.Linear(hidden, vocab_size)

    def forward(self, x, lengths=None):
        if lengths is None:
            y, _ = self.lstm(x)
            return self.out(y)
        packed = nn.utils.rnn.pack_padded_sequence(x, lengths.cpu(), batch_first=True, enforce_sorted=False)
        y, _ = self.lstm(packed)
        y, _ = nn.utils.rnn.pad_packed_sequence(y, batch_first=True)
        return self.out(y)


def read_manifest(path):
    rows = []
    with open(path, newline="") as handle:
        for row in csv.reader(handle):
            if len(row) >= 2 and Path(row[0]).exists():
                rows.append((row[0], row[1].strip().lower()))
    return rows


def run_epoch(model, loader, criterion, optimizer=None):
    training = optimizer is not None
    model.train(training)
    total = 0.0
    count = 0
    with torch.set_grad_enabled(training):
        for features, lengths, merged, sizes in loader:
            logits = model(features, lengths).log_softmax(-1)
            input_lengths = lengths.clamp(max=logits.shape[1])
            loss = criterion(logits.transpose(0, 1), merged, input_lengths, sizes)
            if training:
                optimizer.zero_grad()
                loss.backward()
                nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()
            total += loss.item() * len(sizes)
            count += len(sizes)
    return total / max(count, 1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=3e-4)
    parser.add_argument("--val-split", type=float, default=0.05)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--ckpt-out", default="dragon.pt")
    parser.add_argument("--vocab-out", default="vocab.json")
    args = parser.parse_args()

    random.seed(args.seed)
    torch.manual_seed(args.seed)
    torch.set_num_threads(min(8, os.cpu_count() or 4))

    vocab = load_vocab(args.vocab_out)
    Path(args.vocab_out).write_text(json.dumps(vocab))

    rows = read_manifest(args.manifest)
    random.shuffle(rows)
    split = int(len(rows) * args.val_split) if len(rows) > 20 else 0
    train_rows, val_rows = rows[split:], rows[:split]
    print(f"clips {len(train_rows)} val {len(val_rows)} vocab {len(vocab)}")

    train_loader = DataLoader(Clips(train_rows, vocab), batch_size=args.batch_size, shuffle=True, collate_fn=collate)
    val_loader = DataLoader(Clips(val_rows, vocab), batch_size=args.batch_size, collate_fn=collate) if val_rows else None

    model = Dragon(len(vocab))
    criterion = nn.CTCLoss(blank=0, zero_infinity=True)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr)

    for epoch in range(1, args.epochs + 1):
        loss = run_epoch(model, train_loader, criterion, optimizer)
        message = f"epoch {epoch} train loss {loss:.4f}"
        if val_loader:
            message += f" val loss {run_epoch(model, val_loader, criterion):.4f}"
        print(message)

    torch.save({"state": model.state_dict(), "vocab": vocab}, args.ckpt_out)
    print(f"saved {args.ckpt_out}")


if __name__ == "__main__":
    main()
