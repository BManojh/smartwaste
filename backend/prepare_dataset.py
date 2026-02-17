from __future__ import annotations

import shutil
from pathlib import Path

import yaml


def _clean_name(name: str) -> str:
    return name.strip().lstrip(",").strip()    

 
def main() -> None:
    source_root = Path("Trashnet/Dataset")
    images_dir = source_root / "images"
    labels_dir = source_root / "labels"
    yaml_path = source_root / "data.yaml"

    if not yaml_path.exists():
        raise FileNotFoundError(f"Missing dataset config: {yaml_path}")

    with yaml_path.open("r", encoding="utf-8") as handle:
        config = yaml.safe_load(handle)

    class_names = [_clean_name(item) for item in config.get("names", [])]
    if not class_names:
        raise ValueError("No class names found in data.yaml")

    output_root = Path("data/trashnet")
    output_root.mkdir(parents=True, exist_ok=True)

    for name in class_names:
        (output_root / name).mkdir(exist_ok=True)

    label_files = sorted(labels_dir.glob("*.txt"))
    if not label_files:
        raise FileNotFoundError("No label files found in Trashnet/Dataset/labels")

    copied = 0
    skipped_empty = 0
    skipped_multi_class = 0
    skipped_invalid = 0
    skipped_missing_image = 0
    for label_file in label_files:
        content = label_file.read_text(encoding="utf-8").strip().splitlines()
        if not content:
            skipped_empty += 1
            continue

        class_indices = set()
        for line in content:
            parts = line.split()
            if not parts:
                continue
            try:
                class_idx = int(float(parts[0]))
            except ValueError:
                continue
            if 0 <= class_idx < len(class_names):
                class_indices.add(class_idx)

        if not class_indices:
            skipped_invalid += 1
            continue

        if len(class_indices) != 1:
            skipped_multi_class += 1
            continue

        class_index = next(iter(class_indices))

        class_name = class_names[class_index]
        stem = label_file.stem
        image_path = None

        for extension in (".jpg", ".jpeg", ".png"):
            candidate = images_dir / f"{stem}{extension}"
            if candidate.exists():
                image_path = candidate
                break


        if image_path is None:
            skipped_missing_image += 1
            continue

        target_path = output_root / class_name / image_path.name
        if not target_path.exists():
            shutil.copy2(image_path, target_path)
            copied += 1

    print(f"Prepared classification dataset at {output_root76w}")
    print(f"Images copied: {copied}")
    print(f"Skipped empty labels: {skipped_empty}")
    print(f"Skipped invalid labels: {skipped_invalid}")
    print(f"Skipped multi-class labels: {skipped_multi_class}")
    print(f"Skipped missing images: {skipped_missing_image}")


if __name__ == "__main__":
    main()
