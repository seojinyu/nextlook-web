"""
Generate mockup screenshots for Google Play Store:
- 3 phone screenshots (1080x1920)
- Same 3 resized for 7-inch tablet (1200x2133)
- Same 3 resized for 10-inch tablet (1600x2845)
"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'store_assets', 'screenshots')
os.makedirs(OUT, exist_ok=True)

# Palette (matches the actual app)
BG = (250, 250, 248)         # #FAFAF8
DARK = (26, 26, 26)          # #1A1A1A
BOTTEGA = (27, 107, 74)      # #1B6B4A
AMBER = (196, 154, 60)       # #C49A3C
NAVY = (61, 90, 128)         # #3D5A80
INK = (28, 28, 28)
GRAY = (122, 117, 112)       # #7A7570
LIGHT_GRAY = (245, 244, 242) # #F5F4F2
WHITE = (255, 255, 255)
NAVY_LIGHT = (232, 237, 242)
AMBER_LIGHT = (245, 239, 224)
GREEN_LIGHT = (232, 240, 236)

W, H = 1080, 1920


def font(size, bold=False):
    paths = [
        "C:/Windows/Fonts/malgunbd.ttf" if bold else "C:/Windows/Fonts/malgun.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def draw_status_bar(draw, dark=False):
    """Mock status bar at top with time/icons."""
    color = WHITE if dark else INK
    bg = DARK if dark else BG
    draw.rectangle([0, 0, W, 70], fill=bg)
    f = font(28, bold=True)
    draw.text((40, 22), "9:41", font=f, fill=color)
    # Right side icons (battery/signal placeholder)
    draw.text((W - 220, 22), "📶  100%", font=font(24), fill=color)


def draw_tab_bar(draw, active_idx):
    """Bottom tab bar."""
    tab_h = 130
    y0 = H - tab_h
    draw.rectangle([0, y0, W, H], fill=WHITE)
    draw.line([0, y0, W, y0], fill=(237, 234, 230), width=2)

    tabs = [
        ("추천", BOTTEGA),
        ("옷장", AMBER),
        ("메모리", NAVY),
    ]
    tab_w = W // 3
    f_active = font(24, bold=True)
    f_inactive = font(24, bold=True)
    for i, (label, color) in enumerate(tabs):
        x = i * tab_w
        # icon circle (simulated)
        ccx = x + tab_w // 2
        ccy = y0 + 35
        if i == active_idx:
            draw.ellipse([ccx - 18, ccy - 18, ccx + 18, ccy + 18], fill=color)
        else:
            draw.ellipse([ccx - 18, ccy - 18, ccx + 18, ccy + 18], outline=(168, 164, 160), width=3)
        # label
        text = label
        bbox = draw.textbbox((0, 0), text, font=f_active)
        tw = bbox[2] - bbox[0]
        fill = color if i == active_idx else (168, 164, 160)
        draw.text((ccx - tw // 2, ccy + 30), text, font=fill and f_active or f_inactive, fill=fill)


def color_block(draw, x, y, w, h, color, radius=24):
    """Filled rectangle with rounded corners — used as photo placeholder."""
    draw.rounded_rectangle([x, y, x + w, y + h], radius=radius, fill=color)


# ────────────────────────────────────────────────
# SCREEN 1 — Recommend tab (main hero)
# ────────────────────────────────────────────────
def make_recommend_screen():
    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img)

    # Dark header (rounded bottom)
    header_h = 720
    d.rounded_rectangle([0, 0, W, header_h], radius=0, fill=DARK)
    # Round only bottom corners by drawing extra arc
    d.rectangle([0, 0, W, 60], fill=DARK)
    # Bottom rounded corners
    overlay = Image.new('RGBA', (W, header_h + 100), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rounded_rectangle([0, 0, W, header_h], radius=56, fill=DARK)
    img.paste(overlay, (0, 0), overlay)
    d = ImageDraw.Draw(img)

    draw_status_bar(d, dark=True)

    # Title
    d.text((48, 110), "Outfit Recommend", font=font(58, bold=True), fill=WHITE)
    d.text((48, 188), "내일  ·  6월 8일 (월)", font=font(28), fill=(180, 180, 180))

    # Refresh button (top right circle)
    d.ellipse([W - 110, 110, W - 40, 180], fill=(255, 255, 255, 30))
    d.text((W - 95, 125), "↻", font=font(40, bold=True), fill=WHITE)

    # Date picker chips
    chip_y = 250
    chip_size = 110
    dates = [(8, "월", True), (9, "화", False), (10, "수", False),
             (11, "목", False), (12, "금", False), (13, "토", False), (14, "일", False)]
    for i, (day, wd, active) in enumerate(dates):
        x = 48 + i * (chip_size + 12)
        if x + chip_size > W - 30:
            break
        c = BOTTEGA if active else (255, 255, 255, 30)
        d.rounded_rectangle([x, chip_y, x + chip_size, chip_y + chip_size + 20], radius=28, fill=c)
        wd_c = WHITE if active else (180, 180, 180)
        d.text((x + 38, chip_y + 14), wd, font=font(22, bold=True), fill=wd_c)
        d.text((x + 32 if day < 10 else x + 24, chip_y + 50), str(day), font=font(40, bold=True), fill=WHITE if active else (200, 200, 200))

    # Weather card
    wc_y = 440
    d.rounded_rectangle([48, wc_y, W - 48, wc_y + 200], radius=28, fill=(255, 255, 255, 25))
    # Weather icon circle
    d.ellipse([90, wc_y + 40, 200, wc_y + 150], fill=(255, 255, 255, 30))
    d.text((118, wc_y + 60), "☀", font=font(60), fill=WHITE)
    d.text((100, wc_y + 158), "맑음", font=font(20, bold=True), fill=(180, 180, 180))
    # Temp & details
    d.text((250, wc_y + 50), "18° / 25°C", font=font(54, bold=True), fill=WHITE)
    d.text((250, wc_y + 130), "강수 0mm  ·  바람 2.1m/s", font=font(26), fill=(170, 170, 170))

    # Section title
    sec_y = header_h + 60
    d.text((48, sec_y), "추천 조합", font=font(44, bold=True), fill=INK)

    # View toggle (right)
    toggle_x = W - 230
    d.rounded_rectangle([toggle_x, sec_y - 5, toggle_x + 170, sec_y + 60], radius=22, fill=(240, 237, 234))
    d.rounded_rectangle([toggle_x + 6, sec_y + 1, toggle_x + 86, sec_y + 54], radius=18, fill=BOTTEGA)
    d.text((toggle_x + 32, sec_y + 13), "▦", font=font(28), fill=WHITE)
    d.text((toggle_x + 110, sec_y + 13), "👤", font=font(28), fill=GRAY)

    # 3 combo cards
    card_h = 320
    card_y = sec_y + 90
    combos = [("A", BOTTEGA), ("B", AMBER), ("C", NAVY)]
    for i, (lab, col) in enumerate(combos):
        y = card_y + i * (card_h + 30)
        # Card
        d.rounded_rectangle([48, y, W - 48, y + card_h], radius=32, fill=WHITE)

        # Style badge
        d.rounded_rectangle([80, y + 30, 280, y + 90], radius=18, fill=col)
        d.text((110, y + 42), f"Style {lab}", font=font(28, bold=True), fill=WHITE)

        # Color dots and piece count on the right
        for j in range(3):
            d.ellipse([W - 360 + j * 36, y + 46, W - 332 + j * 36, y + 74], fill=[BOTTEGA, AMBER, NAVY][j], outline=(0, 0, 0, 30), width=1)
        d.rounded_rectangle([W - 220, y + 38, W - 80, y + 86], radius=16, fill=LIGHT_GRAY)
        d.text((W - 195, y + 48), "👕  3피스", font=font(24, bold=True), fill=GRAY)

        # 3 clothing photo placeholders
        photo_y = y + 130
        photo_size = 220
        gap = 18
        photo_w = (W - 48 * 2 - 32 * 2 - gap * 2) // 3
        photo_colors = [
            [(80, 80, 90), (50, 50, 60), (90, 110, 130)],
            [(180, 160, 130), (90, 70, 55), (160, 140, 100)],
            [(50, 70, 110), (40, 50, 70), (200, 180, 150)],
        ]
        labels = ["상의", "하의", "자켓"]
        for j in range(3):
            px = 80 + j * (photo_w + gap)
            # Label chip
            d.rounded_rectangle([px, photo_y - 50, px + 80, photo_y - 12], radius=12, fill=({BOTTEGA: GREEN_LIGHT, AMBER: AMBER_LIGHT, NAVY: NAVY_LIGHT}[col]))
            d.text((px + 18, photo_y - 44), labels[j], font=font(22, bold=True), fill=col)
            # photo
            color_block(d, px, photo_y, photo_w, photo_size, photo_colors[i][j], radius=28)

    draw_tab_bar(d, active_idx=0)

    out = os.path.join(OUT, '1_recommend.png')
    img.save(out, 'PNG', quality=95)
    print(f"Saved: {out}")
    return img


# ────────────────────────────────────────────────
# SCREEN 2 — Wardrobe tab
# ────────────────────────────────────────────────
def make_wardrobe_screen():
    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img)
    draw_status_bar(d, dark=False)

    # Header
    d.rectangle([0, 70, W, 280], fill=WHITE)
    d.line([0, 280, W, 280], fill=(237, 234, 230), width=2)
    d.text((48, 110), "옷장", font=font(54, bold=True), fill=INK)
    d.text((48, 180), "나의 옷 관리 · 등록과 정리를 한곳에", font=font(26), fill=GRAY)
    # count badge
    d.ellipse([W - 130, 130, W - 60, 200], fill=AMBER)
    d.text((W - 110, 142), "24", font=font(32, bold=True), fill=WHITE)

    # Season filter chips
    chips = [("전체", True, "📋"), ("봄/가을", False, "🍃"),
             ("여름", False, "☀"), ("겨울", False, "❄")]
    cy = 320
    cx = 48
    for label, active, icon in chips:
        cw = 220
        col = AMBER if active else WHITE
        d.rounded_rectangle([cx, cy, cx + cw, cy + 80], radius=22, fill=col,
                           outline=(225, 220, 215) if not active else None, width=2)
        text_color = WHITE if active else GRAY
        d.text((cx + 30, cy + 22), icon, font=font(32), fill=text_color)
        d.text((cx + 78, cy + 28), label, font=font(28, bold=True), fill=text_color)
        cx += cw + 16

    # Grid of clothing
    grid_y = 470
    cols = 2
    card_size = (W - 48 * 2 - 24) // 2
    gap = 24

    # Mock clothing items
    items = [
        ("상의", BOTTEGA, (90, 110, 130), "네이비", "봄/가을"),
        ("하의", AMBER, (50, 60, 80), "다크그레이", "봄/가을"),
        ("자켓", NAVY, (180, 160, 130), "베이지", "봄/가을"),
        ("상의", BOTTEGA, (240, 230, 220), "화이트", "여름"),
        ("하의", AMBER, (90, 70, 55), "브라운", "봄/가을"),
        ("상의", BOTTEGA, (40, 60, 100), "블루", "겨울"),
    ]
    for i, (cat, cat_col, photo_col, color_name, season) in enumerate(items):
        row = i // cols
        col = i % cols
        x = 48 + col * (card_size + gap)
        y = grid_y + row * (card_size + 140)
        # Card
        d.rounded_rectangle([x, y, x + card_size, y + card_size + 110], radius=24, fill=WHITE)
        # photo
        color_block(d, x, y, card_size, card_size, photo_col, radius=24)
        # season badge overlay
        badge_x = x + card_size - 130
        badge_y = y + 20
        d.rounded_rectangle([badge_x, badge_y, badge_x + 110, badge_y + 44], radius=14, fill=(0, 0, 0, 180))
        d.text((badge_x + 14, badge_y + 9), "🍃 " + season, font=font(20, bold=True), fill=WHITE)
        # info row
        info_y = y + card_size + 18
        d.ellipse([x + 16, info_y + 4, x + 40, info_y + 28], fill=photo_col)
        d.text((x + 56, info_y + 6), color_name, font=font(26, bold=True), fill=INK)

    draw_tab_bar(d, active_idx=1)

    out = os.path.join(OUT, '2_wardrobe.png')
    img.save(out, 'PNG', quality=95)
    print(f"Saved: {out}")
    return img


# ────────────────────────────────────────────────
# SCREEN 3 — Outfit Memory tab
# ────────────────────────────────────────────────
def make_memory_screen():
    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img)
    draw_status_bar(d, dark=False)

    # Header
    d.rectangle([0, 70, W, 280], fill=WHITE)
    d.line([0, 280, W, 280], fill=(237, 234, 230), width=2)
    d.text((48, 110), "Outfit Memory", font=font(50, bold=True), fill=INK)
    d.text((48, 178), "기록한 코디를 날씨와 함께 확인하세요", font=font(24), fill=GRAY)
    d.ellipse([W - 130, 130, W - 60, 200], fill=NAVY)
    d.text((W - 110, 142), "12", font=font(32, bold=True), fill=WHITE)

    # Cards
    card_y = 320
    cards = [
        ("2026.06.06 (토)", "20° / 27°C  맑음", "데이트룩 · 카페 데이트로 굿!", BOTTEGA),
        ("2026.06.05 (금)", "18° / 24°C  흐림", "회의용 미니멀 룩", AMBER),
    ]
    card_h = 720
    for idx, (date, weather, note, mannequin_col) in enumerate(cards):
        y = card_y + idx * (card_h + 30)
        d.rounded_rectangle([48, y, W - 48, y + card_h], radius=32, fill=WHITE)
        # header row
        d.rounded_rectangle([80, y + 30, 460, y + 90], radius=16, fill=NAVY_LIGHT)
        d.text((110, y + 44), "📅  " + date, font=font(26, bold=True), fill=INK)
        # delete btn
        d.rounded_rectangle([W - 130, y + 30, W - 80, y + 90], radius=14, fill=LIGHT_GRAY)
        d.text((W - 116, y + 42), "🗑", font=font(30), fill=GRAY)
        # weather row
        wy = y + 120
        d.rounded_rectangle([80, wy, W - 80, wy + 70], radius=18, fill=BG)
        d.rounded_rectangle([100, wy + 12, 160, wy + 60], radius=12, fill=NAVY_LIGHT)
        d.text((118, wy + 22), "☁", font=font(32), fill=NAVY)
        d.text((185, wy + 22), weather, font=font(26, bold=True), fill=INK)

        # Mannequin
        man_y = y + 210
        man_bg_h = 380
        d.rounded_rectangle([80, man_y, W - 80, man_y + man_bg_h], radius=24, fill=BG)
        # top (centered)
        top_x = (W - 280) // 2
        color_block(d, top_x, man_y + 30, 280, 280, mannequin_col, radius=36)
        # jacket beside top (right)
        color_block(d, top_x + 290, man_y + 60, 200, 200, (180, 160, 130), radius=28)
        # bottom under
        bot_x = (W - 250) // 2
        color_block(d, bot_x, man_y + man_bg_h - 40, 250, 0, BG)  # spacer (no-op)

        # Second row (bottom)
        # Adjust to single mannequin layout: re-do as top centered, jacket beside, bottom below
        # Use mannequin region: vertical
        # Simpler: top + jacket horizontally, bottom below
        # Re-render cleanly
        # Clear the mannequin region first
        d.rounded_rectangle([80, man_y, W - 80, man_y + man_bg_h], radius=24, fill=BG)
        # Top row
        top_w = 260
        top_x = (W - top_w - 40 - 180) // 2
        color_block(d, top_x, man_y + 30, top_w, top_w, mannequin_col, radius=36)
        # Jacket
        color_block(d, top_x + top_w + 30, man_y + 60, 180, 180, (180, 160, 130), radius=28)
        # Bottom
        bot_w = 240
        bot_x = (W - bot_w) // 2
        color_block(d, bot_x, man_y + 30 + top_w + 20, bot_w, 80, (60, 70, 90), radius=28)

        # Note box
        note_y = y + 620
        d.rounded_rectangle([80, note_y, W - 80, note_y + 70], radius=18, fill=NAVY_LIGHT)
        d.text((110, note_y + 20), "🔖  " + note, font=font(26, bold=True), fill=INK)

    draw_tab_bar(d, active_idx=2)

    out = os.path.join(OUT, '3_memory.png')
    img.save(out, 'PNG', quality=95)
    print(f"Saved: {out}")
    return img


# ────────────────────────────────────────────────
# Tablet adapter — pad phone image to tablet ratio
# ────────────────────────────────────────────────
def make_tablet(phone_img, target_w, target_h, suffix):
    """Pad phone screenshot into tablet-sized canvas with dark gradient."""
    canvas = Image.new('RGB', (target_w, target_h), DARK)
    d = ImageDraw.Draw(canvas)

    # Subtle gradient background using glow
    glow = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse([-target_w // 4, target_h // 2, target_w + target_w // 4, target_h + target_h // 2],
              fill=BOTTEGA + (100,))
    glow = glow.filter(ImageFilter.GaussianBlur(150))
    canvas = Image.alpha_composite(canvas.convert('RGBA'), glow).convert('RGB')
    d = ImageDraw.Draw(canvas)

    # Scale phone image to fit (keep 9:16 phone)
    # Phone aspect: 1080:1920 = 9:16
    # Target aspect: 9:16 too, so we want phone to fill but with margin
    margin_factor = 0.78
    new_h = int(target_h * margin_factor)
    new_w = int(new_h * 9 / 16)
    if new_w > target_w * 0.85:
        new_w = int(target_w * 0.85)
        new_h = int(new_w * 16 / 9)

    resized = phone_img.resize((new_w, new_h), Image.LANCZOS)
    px = (target_w - new_w) // 2
    py = (target_h - new_h) // 2

    # Drop shadow under phone
    shadow = Image.new('RGBA', (new_w + 80, new_h + 80), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle([40, 50, new_w + 40, new_h + 50], radius=60, fill=(0, 0, 0, 160))
    shadow = shadow.filter(ImageFilter.GaussianBlur(30))
    canvas.paste(shadow, (px - 40, py - 30), shadow)

    # Round phone corners
    mask = Image.new('L', (new_w, new_h), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle([0, 0, new_w, new_h], radius=50, fill=255)
    canvas.paste(resized, (px, py), mask)

    return canvas


def main():
    print("=== Phone screenshots (1080x1920) ===")
    s1 = make_recommend_screen()
    s2 = make_wardrobe_screen()
    s3 = make_memory_screen()
    phones = [(s1, '1_recommend'), (s2, '2_wardrobe'), (s3, '3_memory')]

    print("\n=== 7-inch tablet (1200x2133) ===")
    for img, name in phones:
        t = make_tablet(img, 1200, 2133, '7in')
        out = os.path.join(OUT, f'{name}_7in_tablet.png')
        t.save(out, 'PNG', quality=92)
        print(f"Saved: {out}")

    print("\n=== 10-inch tablet (1600x2845) ===")
    for img, name in phones:
        t = make_tablet(img, 1600, 2845, '10in')
        out = os.path.join(OUT, f'{name}_10in_tablet.png')
        t.save(out, 'PNG', quality=92)
        print(f"Saved: {out}")

    print(f"\nAll files in: {os.path.abspath(OUT)}")


if __name__ == '__main__':
    main()
