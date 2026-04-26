# Future Custom Oral Cancer Model — Training Plan

This folder contains the **planning** for the next phase of the project: replacing
the hosted Vision API (Gemini / Claude) with a **custom oral cancer screening
model** trained by the team.

> ⚠️ **Nothing here is trained or executed today.** It is the documented roadmap
> so the IDP report and GitHub README clearly show the next milestone.

## 1. Why a custom model later?

| Phase | Vision engine | Rationale |
|-------|---------------|-----------|
| Today (prototype) | Gemini Vision / Claude Vision / Mock | Demonstrates the agentic AI architecture and end-to-end UX without dataset bottleneck. |
| Next | Custom CNN (MobileNetV3 / EfficientNet-B0) served via FastAPI | Domain-specific, on-device, no external API dependency, reproducible. |

Swapping providers is a **one-line config change** — the Vision Screening Agent
already supports a `local` provider in [lib/visionProviders/localModelProvider.ts](../lib/visionProviders/localModelProvider.ts).

## 2. Dataset

### Where it should live

The dataset must **never be committed to GitHub** (privacy + size). The
`/.gitignore` already excludes `data/`, `models/`, `*.pth`, `*.pt`, and `*.onnx`.

Store the dataset locally:

```
data/oral_screening/
├── oral_cancer/
│   ├── img_0001.jpg
│   ├── img_0002.jpg
│   └── ...
└── no_oral_cancer/
    ├── img_0001.jpg
    └── ...
```

See [dataset_structure.md](dataset_structure.md) for the full layout, expected
counts, and labelling convention.

### Suggested public datasets to start from

- **OCDC** (Oral Cancer Dataset Collection) — research-only, requires application.
- **The Cancer Imaging Archive (TCIA)** — head & neck imaging.
- **Roboflow / Kaggle public oral lesion datasets** — useful for transfer-learning warm-up.

> Always respect the source dataset's license and ethics requirements. For
> clinical-grade training the team should partner with a dental school and
> obtain IRB/ethics approval.

## 3. Training approach

- **Transfer learning** from a pre-trained backbone (MobileNetV3-Small or
  EfficientNet-B0) — small, accurate, deployable.
- **Image size**: 224×224 (standard for both backbones).
- **Augmentation**: random horizontal flip, brightness/contrast jitter, mild
  rotation. Avoid heavy color shifts that could erase clinical cues.
- **Class balance**: weighted loss or oversampling — in real datasets the
  cancer class is heavily under-represented.
- **Calibration**: temperature scaling on the validation set so the probability
  the agent reports is meaningful, not over-confident.

A skeleton training script lives at [future_train_model.py](future_train_model.py).

## 4. Serving the trained model

Once a checkpoint exists, expose it via FastAPI:

- Skeleton at [future_fastapi_model_server.py](future_fastapi_model_server.py)
- Endpoint contract (matches `localModelProvider.ts`):

  ```
  POST /predict
  { "image_base64": "...", "mime_type": "image/jpeg" }
  → 200 OK
  {
    "visualFinding": "white_patch_like",
    "suspectedRegion": "lateral tongue",
    "oralCancerLikeProbability": 0.74,
    "confidence": 0.81,
    "imageQuality": "good",
    "observationSummary": "...",
    "disclaimer": "..."
  }
  ```

Then in the Next.js app:

```bash
# in .env.local
VISION_PROVIDER=local
LOCAL_MODEL_ENDPOINT=http://localhost:8000/predict
```

Restart `npm run dev` — every screening session now runs on the local model.

## 5. Roadmap checklist

- [ ] Acquire labelled dataset (clinical partner)
- [ ] Implement [future_train_model.py](future_train_model.py) (data loader,
      training loop, validation, calibration, checkpoint export)
- [ ] Train MobileNetV3 baseline → measure AUROC, sensitivity, specificity
- [ ] Try EfficientNet-B0 → compare
- [ ] Pick best model, export ONNX
- [ ] Deploy with [future_fastapi_model_server.py](future_fastapi_model_server.py)
- [ ] Switch the demo to `VISION_PROVIDER=local`
- [ ] Update README with model card (dataset, metrics, limitations)

## 6. Mandatory disclaimer

This prototype is not a medical diagnosis. It is an educational oral cancer
screening demonstration. Please consult a qualified dentist or doctor for proper
diagnosis.
