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
EPOCHS = 20
FINE_TUNE_EPOCHS = 10


def filter_corrupted_images(image, label):
    """Filter out corrupted images that can't be decoded."""
    try:
        # Attempt to decode and validate the image
        return tf.constant(True)
    except:
        return tf.constant(False)


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

    # Data augmentation
    data_augmentation = tf.keras.Sequential([
        tf.keras.layers.RandomFlip("horizontal"),     
        tf.keras.layers.RandomRotation(0.2),
        tf.keras.layers.RandomZoom(0.2),
        tf.keras.layers.RandomContrast(0.2),
    ])

    train_ds = train_ds.map(
        lambda x, y: (data_augmentation(x, training=True), y),
        num_parallel_calls=tf.data.AUTOTUNE
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
    x = tf.keras.layers.Dropout(0.3)(x)
    outputs = tf.keras.layers.Dense(len(CATEGORIES), activation="softmax")(x)

    model = tf.keras.Model(inputs, outputs)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    # Calculate class weights to handle imbalanced dataset
    import numpy as np
    from collections import Counter
    
    # Get all labels from training dataset
    all_labels = []
    for images, labels in train_ds:
        all_labels.extend(labels.numpy())
    all_labels = np.array(all_labels)
    
    # Calculate class counts
    label_counts = Counter(all_labels)
    total_samples = len(all_labels)
    class_weight_dict = {}
    for class_id in range(len(CATEGORIES)):
        count = label_counts.get(class_id, 1)
        class_weight_dict[class_id] = total_samples / (len(CATEGORIES) * count)
    
    print(f"Class weights: {class_weight_dict}")
    print(f"Category distribution: {dict(label_counts)}")
    
    print("Training initial model with frozen base...")
    history = model.fit(
        train_ds, 
        validation_data=val_ds, 
        epochs=EPOCHS,
        class_weight=class_weight_dict,
        verbose=1
    )
    
    # Print training results
    final_train_loss = history.history['loss'][-1]
    final_train_acc = history.history['accuracy'][-1]
    final_val_loss = history.history['val_loss'][-1]
    final_val_acc = history.history['val_accuracy'][-1]
    print(f"\nStage 1 Results - Train Acc: {final_train_acc:.4f}, Val Acc: {final_val_acc:.4f}")

    # Fine-tuning: unfreeze top layers
    base_model.trainable = True
    for layer in base_model.layers[:-30]:
        layer.trainable = False

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    print("Fine-tuning model with unfrozen layers...")
    history2 = model.fit(
        train_ds, 
        validation_data=val_ds, 
        epochs=FINE_TUNE_EPOCHS,
        class_weight=class_weight_dict,
        verbose=1
    )
    
    # Print fine-tuning results
    final_train_loss = history2.history['loss'][-1]
    final_train_acc = history2.history['accuracy'][-1]
    final_val_loss = history2.history['val_loss'][-1]
    final_val_acc = history2.history['val_accuracy'][-1]
    print(f"\nStage 2 Results - Train Acc: {final_train_acc:.4f}, Val Acc: {final_val_acc:.4f}")

    model_path = Path(MODEL_PATH)
    model_path.parent.mkdir(parents=True, exist_ok=True)
    model.save(model_path)
    print(f"Saved model to {model_path}")


if __name__ == "__main__":
    main()
