import os
from pathlib import Path

import numpy as np
import tensorflow as tf

CATEGORIES = [
    "cardboard",
    "miscellaneous",
    "organic",
    "paper",
    "glass",
    "metal",
    "plastic",
]


def main() -> None:
    data_dir = Path(os.environ.get("TRASHNET_DIR", "data/trashnet"))
    model_path = Path(
        os.environ.get("WASTE_MODEL_PATH", "backend/models/waste_classifier.keras")
    )

    print(f"Data dir: {data_dir}")
    print(f"Model: {model_path}")

    val_ds = tf.keras.utils.image_dataset_from_directory(
        data_dir,
        class_names=CATEGORIES,
        validation_split=0.2,
        subset="validation",
        seed=42,
        image_size=(224, 224),
        batch_size=32,
    )

    val_ds = val_ds.map(
        lambda x, y: (tf.keras.applications.mobilenet_v2.preprocess_input(x), y),
        num_parallel_calls=tf.data.AUTOTUNE,
    ).cache().prefetch(tf.data.AUTOTUNE)

    model = tf.keras.models.load_model(model_path)

    y_true = []
    y_pred = []
    for batch_x, batch_y in val_ds:
        preds = model.predict(batch_x, verbose=0)
        y_true.extend(batch_y.numpy().tolist())
        y_pred.extend(np.argmax(preds, axis=1).tolist())

    y_true = np.array(y_true)
    y_pred = np.array(y_pred)
    acc = float((y_true == y_pred).mean())

    cm = np.zeros((len(CATEGORIES), len(CATEGORIES)), dtype=int)
    for true_label, pred_label in zip(y_true, y_pred):
        cm[true_label, pred_label] += 1

    print(f"Overall validation accuracy: {acc:.4f}")
    print("Per-class accuracy:")
    for idx, name in enumerate(CATEGORIES):
        total = int(cm[idx].sum())
        correct = int(cm[idx, idx])
        pct = (correct / total) if total else 0.0
        print(f"  {name}: {pct:.4f} ({correct}/{total})")


if __name__ == "__main__":
    main()
