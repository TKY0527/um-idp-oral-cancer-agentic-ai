"""
Future FastAPI model-serving skeleton — NOT executed today.

Goal:
    Once future_train_model.py has produced a trained checkpoint, serve it
    over HTTP so the Next.js app's localModelProvider.ts can call it.

Endpoint contract (matches lib/visionProviders/localModelProvider.ts):

    POST /predict
    {
      "image_base64": "...",
      "mime_type": "image/jpeg"
    }
    → 200 OK
    {
      "visualFinding": "white_patch_like" | "ulcer_like" | ...,
      "suspectedRegion": "lateral tongue" | "inner cheek" | ...,
      "oralCancerLikeProbability": 0.74,
      "confidence": 0.81,
      "imageQuality": "good" | "moderate" | "poor",
      "observationSummary": "...",
      "disclaimer": "..."
    }

Run later (after a checkpoint exists):
    pip install fastapi uvicorn pillow torch torchvision
    uvicorn training.future_fastapi_model_server:app --reload --port 8000

Then in the Next.js project:
    VISION_PROVIDER=local
    LOCAL_MODEL_ENDPOINT=http://localhost:8000/predict
"""

from __future__ import annotations

# NOTE: imports are stubbed in comments because we don't install heavy deps
# until the model is actually trained. Uncomment once you're ready.

# import base64
# from io import BytesIO
# from typing import Optional
#
# import torch
# from fastapi import FastAPI
# from PIL import Image
# from pydantic import BaseModel

DISCLAIMER = (
    "This prototype is not a medical diagnosis. It is an educational oral "
    "cancer screening demonstration. Please consult a qualified dentist or "
    "doctor for proper diagnosis."
)


# class PredictRequest(BaseModel):
#     image_base64: str
#     mime_type: Optional[str] = "image/jpeg"
#
#
# class PredictResponse(BaseModel):
#     visualFinding: str
#     suspectedRegion: str
#     oralCancerLikeProbability: float
#     confidence: float
#     imageQuality: str
#     observationSummary: str
#     disclaimer: str
#
#
# app = FastAPI(title="Oral Cancer Screening — Local Model Server (skeleton)")
#
# _model = None  # lazy-loaded
#
#
# def load_model() -> "torch.nn.Module":
#     """TODO: load the checkpoint produced by future_train_model.py."""
#     raise NotImplementedError("Load the trained model here once available.")
#
#
# def preprocess(image_bytes: bytes) -> "torch.Tensor":
#     """TODO: decode bytes → PIL → resize 224 → normalize → tensor."""
#     raise NotImplementedError
#
#
# def postprocess(logits: "torch.Tensor") -> PredictResponse:
#     """TODO: softmax → probability, map argmax to a coarse visual_finding label,
#        return a JSON shape that matches the agent's VisionResult contract."""
#     raise NotImplementedError
#
#
# @app.post("/predict", response_model=PredictResponse)
# async def predict(req: PredictRequest) -> PredictResponse:
#     global _model
#     if _model is None:
#         _model = load_model()
#     image_bytes = base64.b64decode(req.image_base64)
#     x = preprocess(image_bytes)
#     with torch.no_grad():
#         logits = _model(x)
#     out = postprocess(logits)
#     out.disclaimer = DISCLAIMER
#     return out
#
#
# @app.get("/health")
# async def health() -> dict:
#     return {"status": "ok", "model_loaded": _model is not None}


def main() -> None:
    print("=" * 60)
    print(" FastAPI Local Model Server — SKELETON")
    print("=" * 60)
    print(
        "This file is a planning skeleton. Once future_train_model.py has\n"
        "produced a checkpoint, uncomment the FastAPI section above and run:\n\n"
        "    uvicorn training.future_fastapi_model_server:app --port 8000\n"
    )


if __name__ == "__main__":
    main()
