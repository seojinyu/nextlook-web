"""
Generate NextLook brand icon: green shirt on dark rounded square background
(Same style as the login screen logo)
"""
from PIL import Image, ImageDraw, ImageFilter
import os

ROOT = os.path.join(os.path.dirname(__file__), '..')
SRC_OUT = os.path.join(ROOT, 'store_assets', 'app_icon_512.png')
ASSETS = os.path.join(ROOT, 'assets')
PUBLIC = os.path.join(ROOT, 'public')
os.makedirs(PUBLIC, exist_ok=True)
os.makedirs(os.path.join(ROOT, 'store_assets'), exist_ok=True)

# Colors (from AuthScreen)
BG_DARK = (26, 26, 26)       # #1A1A1A
BOTTEGA = (27, 107, 74)      # #1B6B4A — shirt color


def draw_shirt(draw, cx, cy, scale, color):
    """Draw a stylized shirt silhouette centered at (cx, cy).
    Based on Ionicons 'shirt' filled glyph proportions."""
    # Scale factor for shirt size
    s = scale
    # Shirt outline points (rough approximation of Ionicons shirt-filled)
    pts = [
        (cx - 1.5 * s, cy - 1.6 * s),   # left shoulder tip
        (cx - 2.6 * s, cy - 1.0 * s),   # left sleeve tip
        (cx - 2.6 * s, cy + 0.1 * s),   # left sleeve bottom
        (cx - 1.7 * s, cy + 0.0 * s),   # left armpit
        (cx - 1.7 * s, cy + 2.0 * s),   # left bottom
        (cx + 1.7 * s, cy + 2.0 * s),   # right bottom
        (cx + 1.7 * s, cy + 0.0 * s),   # right armpit
        (cx + 2.6 * s, cy + 0.1 * s),   # right sleeve bottom
        (cx + 2.6 * s, cy - 1.0 * s),   # right sleeve tip
        (cx + 1.5 * s, cy - 1.6 * s),   # right shoulder tip
        # collar
        (cx + 0.6 * s, cy - 1.6 * s),
        (cx + 0.4 * s, cy - 1.0 * s),
        (cx, cy - 0.6 * s),
        (cx - 0.4 * s, cy - 1.0 * s),
        (cx - 0.6 * s, cy - 1.6 * s),
    ]
    draw.polygon(pts, fill=color)


def make_icon(size, maskable=False):
    """Generate icon at given size."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded square background
    # For maskable, fill the whole canvas; for normal, leave a small margin
    if maskable:
        # Maskable: full bleed dark background
        draw.rectangle([0, 0, size, size], fill=BG_DARK)
        shirt_scale = size * 0.10  # smaller, in the safe zone
    else:
        # Normal: rounded square with margin
        margin = int(size * 0.06)
        radius = int(size * 0.22)
        draw.rounded_rectangle(
            [margin, margin, size - margin, size - margin],
            radius=radius,
            fill=BG_DARK,
        )
        shirt_scale = size * 0.115

    # Draw the green shirt centered
    cx, cy = size / 2, size / 2
    draw_shirt(draw, cx, cy, shirt_scale, BOTTEGA)

    return img


def save(img, path):
    img.convert('RGB').save(path, 'PNG', quality=95)
    print(f"  [OK] {path} ({img.size[0]}x{img.size[1]})")


print("=== Generating brand icons ===")

# App icons (Expo)
save(make_icon(1024), os.path.join(ASSETS, 'icon.png'))
save(make_icon(1024), os.path.join(ASSETS, 'adaptive-icon.png'))
save(make_icon(48), os.path.join(ASSETS, 'favicon.png'))

# PWA icons (public/)
save(make_icon(192), os.path.join(PUBLIC, 'icon-192.png'))
save(make_icon(512), os.path.join(PUBLIC, 'icon-512.png'))
save(make_icon(180), os.path.join(PUBLIC, 'apple-touch-icon.png'))
save(make_icon(512, maskable=True), os.path.join(PUBLIC, 'icon-maskable-512.png'))
save(make_icon(48), os.path.join(PUBLIC, 'favicon.png'))
save(make_icon(32), os.path.join(PUBLIC, 'favicon-32.png'))
save(make_icon(16), os.path.join(PUBLIC, 'favicon-16.png'))

# Update store asset
save(make_icon(512), os.path.join(ROOT, 'store_assets', 'app_icon_512.png'))

print("\nDone!")
