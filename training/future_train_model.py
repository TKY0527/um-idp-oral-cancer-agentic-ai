"""
Future training script (skeleton) — NOT executed today.

Goal:
    Transfer-learn a small CNN backbone (MobileNetV3-Small by default) on the
    oral screening dataset described in dataset_structure.md, save the weights
    and an ONNX export, and produce a model card.

Why this is only a skeleton today:
    - The dataset is not yet collected.
    - The IDP prototype demonstrates the agentic AI architecture using
      Gemini Vision / Claude Vision / Mock providers (see ../lib/visionProviders).
    - When the team has data, fill in the marked sections below and run.

Run later (after dataset is in place):
    python -m venv .venv && source .venv/bin/activate
    pip install torch torchvision pillow scikit-learn onnx
    python training/future_train_model.py \\
        --data data/oral_screening \\
        --epochs 20 \\
        --batch-size 32 \\
        --out models/oral_cancer_mobilenetv3.pt
"""

from __future__ import annotations

import argparse
from pathlib import Path


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Train oral cancer screening model")
    p.add_argument("--data", type=Path, default=Path("data/oral_screening"))
    p.add_argument("--epochs", type=int, default=20)
    p.add_argument("--batch-size", type=int, default=32)
    p.add_argument("--lr", type=float, default=3e-4)
    p.add_argument("--img-size", type=int, default=224)
    p.add_argument(
        "--backbone",
        choices=["mobilenetv3_small", "efficientnet_b0"],
        default="mobilenetv3_small",
    )
    p.add_argument(
        "--out", type=Path, default=Path("models/oral_cancer_mobilenetv3.pt")
    )
    return p.parse_args()


def build_dataloaders(args: argparse.Namespace):
    """TODO: build train/val/test DataLoaders from `data/oral_screening`.

    Suggested:
        - torchvision.datasets.ImageFolder(args.data) gives you the labels for free
          (one folder per class).
        - Apply ImageNet normalization and the augmentations listed in
          dataset_structure.md.
        - Use a stratified 70/15/15 split.
    """
    raise NotImplementedError("Implement once the dataset is collected.")


def build_model(backbone: str):
    """TODO: load a torchvision backbone with ImageNet weights, replace the head
    with a 2-class linear layer (oral_cancer / no_oral_cancer)."""
    raise NotImplementedError("Implement once the dataset is collected.")


def train(args: argparse.Namespace) -> None:
    """TODO: standard transfer-learning training loop:
        - AdamW optimizer
        - Cross-entropy with class weights to handle imbalance
        - Cosine LR schedule
        - Early stopping on validation AUROC
        - After training: temperature scaling for probability calibration
        - Save best checkpoint to args.out
        - Export ONNX next to it for serving via FastAPI.
    """
    raise NotImplementedError("Implement once the dataset is collected.")


def main() -> None:
    args = parse_args()
    print("=" * 60)
    print(" Oral Cancer Screening Model — TRAINING SKELETON")
    print("=" * 60)
    print(f" data       : {args.data}")
    print(f" backbone   : {args.backbone}")
    print(f" epochs     : {args.epochs}")
    print(f" batch size : {args.batch_size}")
    print(f" output     : {args.out}")
    print("=" * 60)
    print(
        "This is a planning skeleton. Implement the TODOs above once the team\n"
        "has collected and labelled the dataset described in dataset_structure.md.\n"
    )
    # train(args)


if __name__ == "__main__":
    main()
