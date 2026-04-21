#!/usr/bin/env python3
"""
Generate Vertext app icon assets for Expo
Run: python3 generate_assets.py
"""
from PIL import Image, ImageDraw, ImageFont
import os

os.makedirs("assets", exist_ok=True)

def make_icon(path, size, bg=(0,0,0,255), letter="V", letter_size=None):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Gradient-like background using multiple circles
    for i in range(size // 2, 0, -2):
        ratio = i / (size // 2)
        r = int(254 * ratio + 108 * (1 - ratio))
        g = int(44 * ratio + 61 * (1 - ratio))
        b = int(85 * ratio + 224 * (1 - ratio))
        draw.ellipse(
            [size//2 - i, size//2 - i, size//2 + i, size//2 + i],
            fill=(r, g, b, 255)
        )
    
    # Letter V
    ls = letter_size or int(size * 0.55)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", ls)
    except:
        font = ImageFont.load_default()
    
    bbox = draw.textbbox((0, 0), letter, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (size - tw) // 2
    y = (size - th) // 2 - int(size * 0.03)
    draw.text((x, y), letter, fill=(255, 255, 255, 255), font=font)
    
    img.save(path)
    print(f"  ✅ {path} ({size}x{size})")

def make_splash(path, width=1284, height=2778):
    img = Image.new("RGBA", (width, height), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)
    
    # Gradient center circle
    cx, cy = width // 2, height // 2
    for r in range(min(width, height) // 3, 0, -3):
        ratio = r / (min(width, height) // 3)
        red = int(254 * ratio + 108 * (1 - ratio))
        grn = int(44 * ratio + 61 * (1 - ratio))
        blu = int(85 * ratio + 224 * (1 - ratio))
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(red, grn, blu, 255))
    
    # V letter
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 220)
        font_sub = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 60)
    except:
        font = ImageFont.load_default()
        font_sub = font
    
    bbox = draw.textbbox((0, 0), "V", font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((width - tw) // 2, cy - th // 2 - 20), "V", fill=(255,255,255,255), font=font)
    
    # "Vertext" label below
    try:
        bbox2 = draw.textbbox((0, 0), "Vertext", font=font_sub)
        tw2 = bbox2[2] - bbox2[0]
        draw.text(((width - tw2) // 2, cy + 200), "Vertext", fill=(200,200,200,255), font=font_sub)
    except:
        pass
    
    img.save(path)
    print(f"  ✅ {path} (splash)")

print("Generating Vertext assets...")
make_icon("assets/icon.png", 1024)
make_icon("assets/adaptive-icon.png", 1024)
make_icon("assets/favicon.png", 32, letter_size=18)
make_splash("assets/splash.png")
print("\n✅ All assets generated in assets/")
