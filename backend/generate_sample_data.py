import numpy as np
from PIL import Image, ImageDraw
from pathlib import Path

def generate_samples():
    samples_dir = Path("sample_data")
    samples_dir.mkdir(exist_ok=True)

    # 1. Single Optical Scene (Urban + River + Forest)
    opt = np.zeros((400, 400, 3), dtype=np.uint8)
    # Forest (Green)
    opt[:200, :] = [34, 139, 34]
    # Urban (Gray)
    opt[200:, :200] = [169, 169, 169]
    # Water river (Blue curve)
    opt[:, 250:300] = [30, 144, 255]

    opt_pil = Image.fromarray(opt)
    draw = ImageDraw.Draw(opt_pil)
    # Draw some building boxes
    draw.rectangle([30, 220, 80, 270], fill=(220, 220, 220), outline=(50, 50, 50))
    draw.rectangle([100, 250, 160, 310], fill=(200, 200, 200), outline=(50, 50, 50))
    opt_pil.save(samples_dir / "sample_optical_t1.png")

    # 2. Bi-temporal T2 Scene (Urban Expansion + New Clearing)
    opt_t2 = opt_pil.copy()
    draw_t2 = ImageDraw.Draw(opt_t2)
    # New construction (Bright Yellow/White) in forest area
    draw_t2.rectangle([50, 50, 150, 150], fill=(245, 245, 220), outline=(255, 0, 0))
    # Water extension (Flooded zone)
    draw_t2.rectangle([250, 300, 380, 380], fill=(20, 100, 220))
    opt_t2.save(samples_dir / "sample_optical_t2.png")

    # 3. SAR Scene (Grayscale Radar intensity with metallic double bounce)
    sar = np.zeros((400, 400), dtype=np.uint8) + 40  # Background ground clutter
    sar_pil = Image.fromarray(sar)
    draw_sar = ImageDraw.Draw(sar_pil)
    # Strong radar returns (bright white) from metallic building corners
    draw_sar.rectangle([30, 220, 80, 270], fill=255)
    draw_sar.rectangle([100, 250, 160, 310], fill=240)
    # Water body (very dark / specularity)
    draw_sar.rectangle([250, 250, 300, 400], fill=5)
    sar_pil.save(samples_dir / "sample_sar_radar.png")

    print("Sample data generated successfully in sample_data/")

if __name__ == "__main__":
    generate_samples()
