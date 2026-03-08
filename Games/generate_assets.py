#!/usr/bin/env python3
"""Generate placeholder assets for the Phaser slot game."""

from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.join(os.path.dirname(__file__), "assets")
os.makedirs(OUT, exist_ok=True)

def rounded_rect(draw, xy, radius, fill):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill)

# --- Background (1920x1080) ---
img = Image.new("RGB", (1920, 1080), "#1a1a2e")
draw = ImageDraw.Draw(img)
# Gradient-like stripes
for i in range(0, 1080, 4):
    c = int(26 + (i / 1080) * 20)
    draw.line([(0, i), (1920, i)], fill=(c, c, c + 20))
# Reel area background
rounded_rect(draw, (300, 180, 1620, 700), 30, "#16213e")
# Border
draw.rounded_rectangle((295, 175, 1625, 705), radius=32, outline="#e94560", width=4)
# Title
try:
    font_big = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 60)
    font_med = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
    font_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
except:
    font_big = ImageFont.load_default()
    font_med = font_big
    font_sm = font_big
draw.text((960, 100), "★ SLOT GAME ★", fill="#ffd700", font=font_big, anchor="mm")
draw.text((960, 780), "BALANCE: 1000", fill="#ffffff", font=font_med, anchor="mm")
img.save(os.path.join(OUT, "Background.png"))
print("✓ Background.png")

# --- Spin Button ---
img = Image.new("RGBA", (300, 100), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)
rounded_rect(draw, (0, 0, 299, 99), 20, "#e94560")
draw.text((150, 50), "SPIN", fill="#ffffff", font=font_big, anchor="mm")
img.save(os.path.join(OUT, "Spin.png"))
print("✓ Spin.png")

# --- Win Label ---
img = Image.new("RGBA", (500, 120), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)
rounded_rect(draw, (0, 0, 499, 119), 25, "#ffd700")
draw.text((250, 60), "🎉 YOU WIN! 🎉", fill="#1a1a2e", font=font_big, anchor="mm")
img.save(os.path.join(OUT, "Win.png"))
print("✓ Win.png")

# --- Symbol helper ---
def make_symbol(name, bg_color, emoji, text):
    size = 200
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Circle background
    draw.ellipse((10, 10, size-10, size-10), fill=bg_color, outline="#ffffff", width=3)
    # Text
    draw.text((size//2, size//2 - 15), emoji, fill="#ffffff", font=font_big, anchor="mm")
    draw.text((size//2, size//2 + 40), text, fill="#ffffff", font=font_sm, anchor="mm")
    img.save(os.path.join(OUT, f"{name}.png"))
    print(f"✓ {name}.png")

make_symbol("Banana", "#f1c40f", "🍌", "BANANA")
make_symbol("Blackberry", "#8e44ad", "🫐", "BERRY")
make_symbol("Cherry", "#e74c3c", "🍒", "CHERRY")

# --- Mask (white rectangle for BitmapMask) ---
img = Image.new("RGBA", (1500, 450), (255, 255, 255, 255))
img.save(os.path.join(OUT, "mask.png"))
print("✓ mask.png")

# --- Arrow (cheat tool) ---
img = Image.new("RGBA", (60, 60), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)
draw.polygon([(10, 30), (50, 5), (50, 55)], fill="#ffffff")
img.save(os.path.join(OUT, "Arrow.png"))
print("✓ Arrow.png")

# --- CheatToolBackground ---
img = Image.new("RGBA", (400, 300), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)
rounded_rect(draw, (0, 0, 399, 299), 15, "#2c3e50")
draw.rounded_rectangle((0, 0, 399, 299), radius=15, outline="#e94560", width=2)
draw.text((200, 30), "CHEAT TOOL", fill="#e94560", font=font_med, anchor="mm")
img.save(os.path.join(OUT, "CheatToolBackground.png"))
print("✓ CheatToolBackground.png")

# --- CheatToolInput ---
img = Image.new("RGBA", (350, 50), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)
rounded_rect(draw, (0, 0, 349, 49), 10, "#34495e")
draw.rounded_rectangle((0, 0, 349, 49), radius=10, outline="#7f8c8d", width=1)
img.save(os.path.join(OUT, "CheatToolInput.png"))
print("✓ CheatToolInput.png")

print("\n✅ All assets generated in Games/assets/")
