"""
Generate Google Play Store assets for NextLook:
- app_icon_512.png  (512x512)
- feature_graphic_1024x500.png  (1024x500)

Premium fashion brand aesthetic — minimal, refined, sophisticated.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os
import math

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'store_assets')
os.makedirs(OUT_DIR, exist_ok=True)

# Refined palette
BG_DARK = (20, 22, 24)         # near-black, slightly warm
BG_CREAM = (248, 244, 237)     # warm ivory
BG_SAND = (236, 228, 215)      # subtle sand
INK = (28, 28, 28)             # deep ink
GOLD = (180, 142, 62)          # antique gold
GOLD_BRIGHT = (212, 175, 95)   # bright gold
EMERALD = (28, 84, 64)         # deep emerald
CHAMPAGNE = (228, 211, 178)    # champagne
WHITE = (255, 255, 255)
WARM_GRAY = (140, 130, 120)


def font(size, bold=False):
    candidates_bold = [
        "C:/Windows/Fonts/malgunbd.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/seguibl.ttf",
    ]
    candidates_reg = [
        "C:/Windows/Fonts/malgun.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
    ]
    paths = candidates_bold if bold else candidates_reg
    for path in paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def serif_font(size):
    """Elegant serif for premium feel."""
    candidates = [
        "C:/Windows/Fonts/georgiab.ttf",
        "C:/Windows/Fonts/georgia.ttf",
        "C:/Windows/Fonts/timesbd.ttf",
        "C:/Windows/Fonts/times.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


# ────────────────────────────────────────────────────────────
# APP ICON — Monogram "NL" with elegant frame
# ────────────────────────────────────────────────────────────
def make_app_icon():
    size = 512
    img = Image.new('RGBA', (size, size), BG_DARK + (255,))

    # Soft emerald glow at center
    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse([80, 80, size - 80, size - 80], fill=EMERALD + (110,))
    glow = glow.filter(ImageFilter.GaussianBlur(70))
    img = Image.alpha_composite(img, glow)

    # Subtle gold radial accent
    glow2 = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    g2 = ImageDraw.Draw(glow2)
    g2.ellipse([150, 150, size - 150, size - 150], fill=GOLD + (60,))
    glow2 = glow2.filter(ImageFilter.GaussianBlur(50))
    img = Image.alpha_composite(img, glow2)

    draw = ImageDraw.Draw(img)

    # Decorative border ring (premium frame)
    pad = 56
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=46,
        outline=GOLD_BRIGHT + (180,),
        width=2,
    )
    # Inner double-line accent
    pad2 = pad + 14
    draw.rounded_rectangle(
        [pad2, pad2, size - pad2, size - pad2],
        radius=36,
        outline=GOLD_BRIGHT + (110,),
        width=1,
    )

    # Monogram "NL" — elegant serif, centered
    nl_font = serif_font(220)
    text = "NL"
    bbox = draw.textbbox((0, 0), text, font=nl_font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (size - tw) // 2 - bbox[0]
    ty = (size - th) // 2 - bbox[1] - 10

    # Soft shadow under text for depth
    shadow_layer = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow_layer)
    sd.text((tx + 4, ty + 5), text, font=nl_font, fill=(0, 0, 0, 180))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(6))
    img = Image.alpha_composite(img, shadow_layer)
    draw = ImageDraw.Draw(img)

    # Main monogram text — cream/ivory
    draw.text((tx, ty), text, font=nl_font, fill=BG_CREAM)

    # Tiny tagline under the monogram
    tag_font = font(28, bold=False)
    tagline = "ATELIER"
    tbbox = draw.textbbox((0, 0), tagline, font=tag_font)
    twd = tbbox[2] - tbbox[0]
    draw.text(
        ((size - twd) // 2, ty + th + 36),
        tagline,
        font=tag_font,
        fill=GOLD_BRIGHT + (220,),
    )

    # Small dot separators on either side of tagline
    dot_y = ty + th + 50
    dot_offset = twd // 2 + 24
    cx = size // 2
    draw.ellipse([cx - dot_offset - 3, dot_y - 3, cx - dot_offset + 3, dot_y + 3], fill=GOLD_BRIGHT)
    draw.ellipse([cx + dot_offset - 3, dot_y - 3, cx + dot_offset + 3, dot_y + 3], fill=GOLD_BRIGHT)

    out = os.path.join(OUT_DIR, 'app_icon_512.png')
    img.convert('RGB').save(out, 'PNG', quality=95)
    print(f"Saved: {out}")


# ────────────────────────────────────────────────────────────
# FEATURE GRAPHIC — Editorial fashion magazine style
# ────────────────────────────────────────────────────────────
def make_feature_graphic():
    w, h = 1024, 500

    # Cream base
    img = Image.new('RGBA', (w, h), BG_CREAM + (255,))
    draw = ImageDraw.Draw(img)

    # Right side — dark editorial block
    block_x = int(w * 0.68)
    draw.rectangle([block_x, 0, w, h], fill=BG_DARK)

    # Subtle emerald glow inside dark block
    glow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse([block_x - 60, h - 180, w + 100, h + 180], fill=EMERALD + (120,))
    glow = glow.filter(ImageFilter.GaussianBlur(70))
    img = Image.alpha_composite(img, glow)
    draw = ImageDraw.Draw(img)

    # ──── LEFT SIDE (cream) ────
    # Top label: "FASHION × AI"
    label_font = font(20, bold=True)
    label = "FASHION  ×  AI"
    draw.text((76, 80), label, font=label_font, fill=GOLD)

    # Thin gold separator line under label
    draw.rectangle([76, 110, 220, 111], fill=GOLD)

    # Main title — large serif "NextLook"
    title_font = serif_font(96)
    title = "NextLook"
    draw.text((72, 150), title, font=title_font, fill=INK)

    # Subtle gold underline accent under title
    draw.rectangle([76, 270, 200, 272], fill=GOLD)

    # Korean subtitle — refined
    sub_font = font(26, bold=False)
    subtitle = "내일의 코디, 오늘 미리 보다"
    draw.text((78, 295), subtitle, font=sub_font, fill=WARM_GRAY)

    # Bottom credits / sub-tagline
    cred_font = font(18, bold=True)
    credits = "AI  ·  WEATHER  ·  STYLE"
    draw.text((78, 420), credits, font=cred_font, fill=GOLD)

    # ──── RIGHT SIDE (dark block) ────
    # Large "NL" monogram centered in dark block
    nl_font = serif_font(180)
    nl_text = "NL"
    nl_bbox = draw.textbbox((0, 0), nl_text, font=nl_font)
    nl_w = nl_bbox[2] - nl_bbox[0]
    nl_h = nl_bbox[3] - nl_bbox[1]
    nl_x = block_x + ((w - block_x) - nl_w) // 2 - nl_bbox[0]
    nl_y = (h - nl_h) // 2 - nl_bbox[1] - 60

    # Soft shadow under NL
    shadow_layer = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow_layer)
    sd.text((nl_x + 3, nl_y + 4), nl_text, font=nl_font, fill=(0, 0, 0, 200))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(5))
    img = Image.alpha_composite(img, shadow_layer)
    draw = ImageDraw.Draw(img)

    # Main NL — cream
    draw.text((nl_x, nl_y), nl_text, font=nl_font, fill=BG_CREAM)

    # Small dot accents around NL
    cx = block_x + (w - block_x) // 2
    draw.ellipse([cx - 5, nl_y + nl_h + 24, cx + 5, nl_y + nl_h + 34], fill=GOLD_BRIGHT)

    # Frame around right side
    frame_pad = 32
    draw.rounded_rectangle(
        [block_x + frame_pad, frame_pad, w - frame_pad, h - frame_pad],
        radius=4,
        outline=GOLD_BRIGHT + (160,),
        width=1,
    )

    # Top label inside dark block: "ATELIER"
    atelier_font = font(14, bold=True)
    atelier = "A T E L I E R"
    atb = draw.textbbox((0, 0), atelier, font=atelier_font)
    atw = atb[2] - atb[0]
    draw.text(
        (block_x + (w - block_x - atw) // 2, frame_pad + 22),
        atelier,
        font=atelier_font,
        fill=GOLD_BRIGHT + (220,),
    )

    # Bottom label: "EST. 2026"
    est_font = font(12, bold=True)
    est = "EST.  2026"
    eb = draw.textbbox((0, 0), est, font=est_font)
    ew = eb[2] - eb[0]
    draw.text(
        (block_x + (w - block_x - ew) // 2, h - frame_pad - 36),
        est,
        font=est_font,
        fill=GOLD + (220,),
    )

    # Save
    out = os.path.join(OUT_DIR, 'feature_graphic_1024x500.png')
    img.convert('RGB').save(out, 'PNG', quality=95)
    print(f"Saved: {out}")


if __name__ == '__main__':
    make_app_icon()
    make_feature_graphic()
    print("\nDone! Files are in:", os.path.abspath(OUT_DIR))
