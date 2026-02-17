from __future__ import annotations

import os
from dataclasses import dataclass

import numpy as np

try:
    import cv2
except ImportError:  # pragma: no cover
    cv2 = None

try:
    from tensorflow.keras.models import load_model
except ImportError:  # pragma: no cover
    load_model = None

CATEGORIES = [
    "cardboard",
    "miscellaneous",
    "organic",
    "paper",
    "glass",
    "metal",
    "plastic",
]
# Get the backend directory path and construct the model path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_MODEL_PATH = os.environ.get("WASTE_MODEL_PATH", os.path.join(BACKEND_DIR, "models", "waste_classifier.keras"))

_MODEL = None
_MODEL_MODE = "demo"


@dataclass
class Prediction:
    category: str
    confidence: float
    mode: str


def _demo_predict(image_bytes: bytes) -> Prediction:
    if not image_bytes:
        return Prediction(category="unknown", confidence=0.0, mode="demo")
    index = sum(image_bytes) % len(CATEGORIES)
    return Prediction(category=CATEGORIES[index], confidence=0.6, mode="demo")


def _load_real_model() -> None:
    global _MODEL, _MODEL_MODE

    if _MODEL is not None:
        return

    if load_model is None:
        return

    if not os.path.exists(DEFAULT_MODEL_PATH):
        return

    _MODEL = load_model(DEFAULT_MODEL_PATH)
    _MODEL_MODE = "tensorflow"


def _preprocess(image_bytes: bytes) -> np.ndarray:
    if cv2 is None:
        raise RuntimeError("OpenCV is required for image preprocessing.")

    file_array = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(file_array, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Invalid image data.")

    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    image = cv2.resize(image, (224, 224))
    image = image.astype("float32")
    return np.expand_dims(image, axis=0)


def predict(image_bytes: bytes) -> Prediction:
    _load_real_model()

    if _MODEL is None:
        return _demo_predict(image_bytes)

    processed = _preprocess(image_bytes)
    scores = _MODEL.predict(processed, verbose=0)[0]
    index = int(np.argmax(scores))
    confidence = float(scores[index])
    return Prediction(category=CATEGORIES[index], confidence=confidence, mode=_MODEL_MODE)
