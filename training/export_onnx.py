import argparse
import json
from pathlib import Path

import torch
from onnxruntime.quantization import QuantType, quantize_dynamic
from torch import nn

from train import Dragon


class Infer(nn.Module):
    def __init__(self, model):
        super().__init__()
        self.lstm = model.lstm
        self.out = model.out

    def forward(self, x):
        y, _ = self.lstm(x)
        return self.out(y)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ckpt", default="dragon.pt")
    parser.add_argument("--out-dir", default="../public/models")
    parser.add_argument("--frames", type=int, default=200)
    args = parser.parse_args()

    ckpt = torch.load(args.ckpt, map_location="cpu")
    vocab = ckpt["vocab"]
    model = Infer(Dragon(len(vocab)))
    model.load_state_dict(ckpt["state"])
    model.eval()

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    fp32 = out_dir / "dragon-stt-fp32.onnx"
    dummy = torch.randn(1, args.frames, 80)
    torch.onnx.export(
        model,
        dummy,
        str(fp32),
        input_names=["inputs"],
        output_names=["logits"],
        dynamic_axes={"inputs": {1: "t"}, "logits": {1: "t"}},
        opset_version=17,
    )

    quantized = out_dir / "dragon-stt.onnx"
    quantize_dynamic(str(fp32), str(quantized), weight_type=QuantType.QInt8)
    fp32.unlink()
    (out_dir / "vocab.json").write_text(json.dumps(vocab))
    print(f"saved {quantized} {quantized.stat().st_size / 1e6:.2f} mb")


if __name__ == "__main__":
    main()
