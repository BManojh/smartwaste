import os
from pathlib import Path
from PIL import Image

def validate_dataset(data_dir: str) -> None:
    """Check for and remove corrupted images."""
    data_path = Path(data_dir)
    corrupted = []
    total = 0

    for category_dir in data_path.iterdir():
        if not category_dir.is_dir():
            continue

        for image_file in category_dir.glob("*"):
            if image_file.suffix.lower() not in ['.jpg', '.jpeg', '.png', '.gif', '.bmp']:
                continue

            total += 1
            try:
                img = Image.open(image_file)
                img.verify()
            except Exception as e:
                print(f"Corrupted: {image_file} - {e}")
                corrupted.append(image_file)

    print(f"\nTotal images checked: {total}")
    print(f"Corrupted images found: {len(corrupted)}")

    if corrupted:
        print("\nRemoving corrupted images...")
        for img_path in corrupted:
            img_path.unlink()
            print(f"  Deleted: {img_path}")

    print("✅ Dataset validation complete")

if __name__ == "__main__":
    validate_dataset("data/trashnet")
