import os
from pathlib import Path

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
DATA_DIR = os.environ.get("TRASHNET_DIR", "data/trashnet")
MODEL_PATH = os.environ.get("WASTE_MODEL_PATH", "backend/models/waste_classifier.keras")

IMAGE_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 8


def main() -> None:
    data_dir = Path(DATA_DIR)
    if not data_dir.exists():
        raise FileNotFoundError(
            f"Dataset not found at {data_dir}. Set TRASHNET_DIR to your dataset path."
        )

    train_ds = tf.keras.utils.image_dataset_from_directory(
        data_dir,
        class_names=CATEGORIES,
        validation_split=0.2,
        subset="training",
        seed=42,
        image_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
    )

    val_ds = tf.keras.utils.image_dataset_from_directory(
        data_dir,
        class_names=CATEGORIES,
        validation_split=0.2,
        subset="validation",
        seed=42,
        image_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
    )

    train_ds = train_ds.cache().prefetch(buffer_size=tf.data.AUTOTUNE)
    val_ds = val_ds.cache().prefetch(buffer_size=tf.data.AUTOTUNE)

    base_model = tf.keras.applications.MobileNetV2(
        input_shape=IMAGE_SIZE + (3,),
        include_top=False,
        weights="imagenet",
    )
    base_model.trainable = False

    inputs = tf.keras.Input(shape=IMAGE_SIZE + (3,))
    x = tf.keras.applications.mobilenet_v2.preprocess_input(inputs)
    x = base_model(x, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.2)(x)
    outputs = tf.keras.layers.Dense(len(CATEGORIES), activation="softmax")(x)

    model = tf.keras.Model(inputs, outputs)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    model.fit(train_ds, validation_data=val_ds, epochs=EPOCHS)

    model_path = Path(MODEL_PATH)
    model_path.parent.mkdir(parents=True, exist_ok=True)
    model.save(model_path)
    print(f"Saved model to {model_path}")


if __name__ == "__main__":
    main()
