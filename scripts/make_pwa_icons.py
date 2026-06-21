"""
Generate PWA icons from the NextLook NL monogram source.
Outputs:
- assets/icon.png (1024x1024 - main app icon)
- assets/favicon.png (48x48)
- public/icon-192.png (192x192 - PWA)
- public/icon-512.png (512x512 - PWA)
- public/apple-touch-icon.png (180x180 - iOS)
- public/icon-maskable-512.png (512x512 with padding - Android adaptive)
"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC = os.path.join(ROOT, 'store_assets', 'app_icon_512.png')

ASSETS = os.path.join(ROOT, 'assets')
PUBLIC = os.path.join(ROOT, 'public')
os.makedirs(PUBLIC, exist_ok=True)


def resize(src_path, out_path, size):
    img = Image.open(src_path).convert('RGBA')
    img = img.resize((size, size), Image.LANCZOS)
    img.convert('RGB').save(out_path, 'PNG', quality=95)
    print(f"  [OK]{out_path} ({size}x{size})")


def make_maskable(src_path, out_path, size):
    """Add safe-zone padding for Android adaptive icons (need 20% padding)."""
    img = Image.open(src_path).convert('RGBA')
    bg = Image.new('RGBA', (size, size), (20, 22, 24, 255))  # dark green-black
    # 80% of canvas (centered)
    inner_size = int(size * 0.78)
    pad = (size - inner_size) // 2
    inner = img.resize((inner_size, inner_size), Image.LANCZOS)
    bg.paste(inner, (pad, pad), inner)
    bg.convert('RGB').save(out_path, 'PNG', quality=95)
    print(f"  [OK]{out_path} ({size}x{size} maskable)")


print("\n=== Generating app icons ===")
resize(SRC, os.path.join(ASSETS, 'icon.png'), 1024)
resize(SRC, os.path.join(ASSETS, 'favicon.png'), 48)
resize(SRC, os.path.join(ASSETS, 'adaptive-icon.png'), 1024)

print("\n=== Generating PWA icons (public/) ===")
resize(SRC, os.path.join(PUBLIC, 'icon-192.png'), 192)
resize(SRC, os.path.join(PUBLIC, 'icon-512.png'), 512)
resize(SRC, os.path.join(PUBLIC, 'apple-touch-icon.png'), 180)
make_maskable(SRC, os.path.join(PUBLIC, 'icon-maskable-512.png'), 512)
resize(SRC, os.path.join(PUBLIC, 'favicon.png'), 48)
# Also copy as favicon.ico format-named PNG (browsers tolerate)
resize(SRC, os.path.join(PUBLIC, 'favicon-32.png'), 32)
resize(SRC, os.path.join(PUBLIC, 'favicon-16.png'), 16)

print("\nDone!")
