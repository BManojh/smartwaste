"""Clean up corrupted images from the dataset."""
import sys
from pathlib import Path
from PIL import Image

DATA_DIR = "data/trashnet"

def check_image(image_path):
    """Check if an image can be opened and is valid."""
    try:
        with Image.open(image_path) as img:
            img.verify()
        # Open again for actual load test
        with Image.open(image_path) as img:
            img.load()
        return True
    except Exception as e:
        return False

def main():
    data_dir = Path(DATA_DIR)
    corrupted = []
    total = 0
    
    print("Starting dataset cleanup...", flush=True)
    
    for category_dir in data_dir.iterdir():
        if not category_dir.is_dir():
            continue
            
        print(f"Checking {category_dir.name}...", flush=True)
        for img_file in category_dir.glob("*"):
            if img_file.suffix.lower() in ['.jpg', '.jpeg', '.png', '.gif']:
                total += 1
                if not check_image(img_file):
                    corrupted.append(img_file)
                    print(f"  Corrupted: {img_file.name}", flush=True)
    
    print(f"\nTotal images checked: {total}", flush=True)
    print(f"Corrupted images found: {len(corrupted)}", flush=True)
    
    if corrupted:
        print("\nRemoving corrupted images...", flush=True)
        for img_path in corrupted:
            img_path.unlink()
            print(f"  Deleted: {img_path}", flush=True)
        print(f"\nCleaned up {len(corrupted)} corrupted images", flush=True)
    else:
        print("\nNo corrupted images found", flush=True)

if __name__ == "__main__":
    main()
