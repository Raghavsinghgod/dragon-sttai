import argparse

import numpy as np
import onnx
import onnxruntime as ort
from onnxruntime.quantization import QuantType, quantize_dynamic
import torch

from train import Model


def export(model_path, out_path, hidden=256, checkpoint=None):
    model = Model(hidden=hidden)
    if checkpoint:
        model.load_state_dict(torch.load(checkpoint, map_location="cpu"))
    elif model_path:
        model.load_state_dict(torch.load(model_path, map_location="cpu"))
    model.eval()

    dummy = torch.randn(1, 100, 80)
    torch.onnx.export(
        model,
        dummy,
        out_path,
        input_names=["inputs"],
        output_names=["logits"],
        dynamic_axes={"inputs": {1: "T"}, "logits": {1: "T"}},
        opset_version=17,
    )
    print(f"exported {out_path}")
    return out_path


def quantize(onnx_path):
    q_path = onnx_path.replace(".onnx", ".int8.onnx")
    quantize_dynamic(onnx_path, q_path, weight_type=QuantType.QInt8)
    size_mb = len(open(q_path, "rb").read()) / 1e6
    print(f"quantized {q_path} {size_mb:.1f} mb")

    sess = ort.InferenceSession(q_path, providers=["CPUExecutionProvider"])
    x = np.random.randn(1, 50, 80).astype(np.float32)
    logits = sess.run(["logits"], {"inputs": x})[0]
    assert logits.shape == (1, 50, 29), logits.shape
    print("smoke ok", logits.shape)
    return q_path


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--checkpoint", default="dragon_stt.pt")
    ap.add_argument("--out", default="dragon-stt.onnx")
    args = ap.parse_args()
    quantize(export(None, args.out, checkpoint=args.checkpoint))
