"""X9 — Icône monochrome Android 13 (« icônes à thème »).

Dérivée de assets/icon2.png : la bulle blanche (épingle + « e » souriant) est
extraite par seuil de luminosité et devient un masque alpha blanc sur fond
transparent. Le système la teinte lui-même selon le fond d'écran.

Relancer si l'icône change :
    python scripts/generate_monochrome_icon.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "icon2.png"
DST = ROOT / "assets" / "icons" / "monochrome-icon.png"


def main() -> None:
    src = Image.open(SRC).convert("RGB")
    w, h = src.size
    out = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    px_in = src.load()
    px_out = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px_in[x, y]
            lo = min(r, g, b)
            # Blanc pur → opaque ; violet/rose du dégradé (min < 150) → transparent.
            alpha = max(0, min(255, int((lo - 150) * 255 / 90)))
            if alpha:
                px_out[x, y] = (255, 255, 255, alpha)
    out.save(DST, optimize=True)
    print(f"écrit {DST.relative_to(ROOT)} ({w}x{h})")


if __name__ == "__main__":
    main()
