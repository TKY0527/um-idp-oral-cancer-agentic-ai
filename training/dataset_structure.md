# Dataset structure (planned, not in repo)

The training dataset is **not committed to GitHub**. Store it on the team's
local machine, lab server, or shared drive. The repository's `.gitignore`
already excludes `data/`, `models/`, and common model checkpoint formats
(`*.pth`, `*.pt`, `*.onnx`).

## Folder layout

```
data/
└── oral_screening/
    ├── oral_cancer/
    │   ├── img_0001.jpg
    │   ├── img_0002.jpg
    │   └── ...
    └── no_oral_cancer/
        ├── img_0001.jpg
        ├── img_0002.jpg
        └── ...
```

Two top-level classes is the minimum viable label set. As the project
matures, add a fine-grained label CSV alongside each class folder:

```
data/oral_screening/labels.csv

filename,class,visual_finding,region,quality
oral_cancer/img_0001.jpg,oral_cancer,white_patch_like,lateral_tongue,good
oral_cancer/img_0002.jpg,oral_cancer,red_patch_like,floor_of_mouth,moderate
no_oral_cancer/img_0001.jpg,no_oral_cancer,normal,none,good
...
```

The fine-grained columns mirror the schema used by the Vision Screening Agent
([`VisionResult`](../lib/types/screening.ts)), so the trained model can return
the same JSON shape and slot into `localModelProvider.ts` without any agent
changes.

## Suggested split

| Split      | Share | Purpose                               |
|------------|-------|---------------------------------------|
| Train      | 70%   | Backbone fine-tuning                  |
| Validation | 15%   | Early stopping + threshold tuning     |
| Test       | 15%   | Final unbiased evaluation             |

## Image preprocessing

| Step             | Setting                                   |
|------------------|-------------------------------------------|
| Resize           | 224 × 224 (MobileNetV3 / EfficientNet-B0) |
| Normalization    | ImageNet mean / std                       |
| Augmentation     | flip, brightness, contrast, mild rotation |
| Class balancing  | Weighted CE loss or oversampling          |

## Ethics

- Obtain consent for any patient images.
- Strip EXIF metadata before storing.
- Get IRB / ethics approval before any clinical-grade training.
- The screening agent always returns the mandatory disclaimer regardless of
  which provider is used.
