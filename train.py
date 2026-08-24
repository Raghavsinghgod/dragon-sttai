import json
import math
import os
import random

import numpy as np
import torch
import torch.nn as nn
import soundfile as sf

sample_rate = 16000
n_mels = 80
n_fft = 512
win_len = 400
hop = 160
blank_id = 0

chars = list(" abcdefghijklmnopqrstuvwxyz'")


def hz_to_mel(hz):
    return 1127 * np.log(1 + hz / 700)


def mel_to_hz(mel):
    return 700 * (np.exp(mel / 1127) - 1)


def mel_filterbank():
    n_bins = n_fft // 2 + 1
    f_min, f_max = 20.0, sample_rate / 2 * 0.95
    m_min, m_max = hz_to_mel(f_min), hz_to_mel(f_max)
    pts = mel_to_hz(m_min + (m_max - m_min) * np.arange(n_mels + 2) / (n_mels + 1))
    bins = pts * n_fft / sample_rate
    filters = np.zeros((n_mels, n_bins), dtype=np.float32)
    for m in range(n_mels):
        left, center, right = bins[m], bins[m + 1], bins[m + 2]
        up = (np.arange(n_bins) - left) / max(center - left, 1e-9)
        down = (right - np.arange(n_bins)) / max(right - center, 1e-9)
        filters[m] = np.clip(np.minimum(up, down), 0, 1)
    return filters


filters = torch.from_numpy(mel_filterbank())
window = torch.hann_window(win_len)


def logmel(wav):
    spec = torch.stft(
        wav, n_fft, hop, win_len, window, center=False, return_complex=True
    ).pow(2)
    mel = filters @ spec
    return torch.log(mel + 1e-6).T


class Model(nn.Module):
    def __init__(self, hidden=256):
        super().__init__()
        self.lstm = nn.LSTM(n_mels, hidden, num_layers=2, batch_first=True, bidirectional=True)
        self.out = nn.Linear(hidden * 2, len(chars))

    def forward(self, x):
        x, _ = self.lstm(x)
        return self.out(x)


def load_manifest(path):
    items = []
    with open(path) as f:
        for line in f:
            item = json.loads(line)
            items.append((item["audio"], item["text"]))
    return items


def encode(text):
    ids = [chars.index(c) for c in text.lower() if c in chars]
    return torch.tensor(ids, dtype=torch.long)


def collate(batch):
    feats = [logmel(torch.from_numpy(sf.read(a)[0].astype(np.float32))) for a, _ in batch]
    labels = [encode(t) for _, t in batch]
    feat_lens = torch.tensor([f.shape[0] for f in feats])
    label_lens = torch.tensor([l.shape[0] for l in labels])
    max_t = max(f.shape[0] for f in feats)
    x = torch.stack([nn.functional.pad(f, (0, 0, 0, max_t - f.shape[0])) for f in feats])
    y = nn.utils.rnn.pad_sequence(labels, batch_first=True)
    return x, y, feat_lens, label_lens


def train(manifest_path, epochs=30, batch_size=8, lr=1e-3, device="cpu"):
    data = load_manifest(manifest_path)
    model = Model().to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=lr)
    ctc = nn.CTCLoss(blank=blank_id, zero_infinity=True)
    steps_per_epoch = math.ceil(len(data) / batch_size)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, lr, total_steps=epochs * steps_per_epoch)

    for epoch in range(epochs):
        random.shuffle(data)
        model.train()
        total = 0.0
        for i in range(0, len(data), batch_size):
            x, y, flen, llen = collate(data[i : i + batch_size])
            x, y = x.to(device), y.to(device)
            logits = model(x).log_softmax(-1).transpose(0, 1)
            loss = ctc(logits, y, flen, llen)
            opt.zero_grad()
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 5.0)
            opt.step()
            sched.step()
            total += loss.item()
        print(f"epoch {epoch + 1} loss {total / steps_per_epoch:.4f}")

    torch.save(model.state_dict(), "dragon_stt.pt")
    return model


if __name__ == "__main__":
    train(os.environ.get("MANIFEST", "manifest.jsonl"))
