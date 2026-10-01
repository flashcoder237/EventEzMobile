"""H7/H8 — Sons d'interface + carillon de marque, synthétisés (aucun asset tiers).

Synthèse additive : sinusoïdes + 2e/3e harmoniques faibles, enveloppe
attaque/décroissance exponentielle, normalisées à -12 dBFS (jamais 0 dB).
Mono 44,1 kHz 16 bits. Fichiers dans assets/sounds/ :

  ui-tap.wav       ~40 ms   tic très doux (validation d'une sélection)
  ui-toggle.wav    ~70 ms   deux micro-clics montants (interrupteur)
  ui-success.wav   ~220 ms  tierce majeure montante (action réussie)
  brand-chime.wav  ~650 ms  carillon EventEz : do–sol–mi aigu (quinte + dixième),
                             timbre « cloche » (partiels inharmoniques légers)
  sale-chime.wav   ~300 ms  deux notes vives (vente encaissée, organisateur)

Les mêmes .wav servent aux canaux de notification Android (res/raw, noms en
minuscules sans tiret → copiés sous eventez_chime.wav / eventez_sale.wav).

    python scripts/generate_ui_sounds.py
"""
import math
import struct
import wave
from pathlib import Path

RATE = 44100
PEAK = 10 ** (-12 / 20)  # -12 dBFS
OUT = Path(__file__).resolve().parent.parent / "assets" / "sounds"


def tone(freq, dur, start=0.0, gain=1.0, attack=0.004, decay=6.0, partials=((1, 1.0), (2, 0.18), (3, 0.06))):
    n = int(dur * RATE)
    s0 = int(start * RATE)
    buf = {}
    for i in range(n):
        t = i / RATE
        env = min(1.0, t / attack) * math.exp(-decay * t)
        v = sum(a * math.sin(2 * math.pi * freq * k * t) for k, a in partials)
        buf[s0 + i] = v * env * gain
    return buf


def mix(*layers, total):
    n = int(total * RATE)
    out = [0.0] * n
    for layer in layers:
        for i, v in layer.items():
            if i < n:
                out[i] += v
    peak = max(1e-9, max(abs(v) for v in out))
    # Fondu de sortie 8 ms : pas de clic en fin de fichier.
    fade = int(0.008 * RATE)
    for i in range(fade):
        out[n - 1 - i] *= i / fade
    return [v / peak * PEAK for v in out]


def write(name, samples):
    path = OUT / name
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, s)) * 32767)) for s in samples))
    print(f"{name}: {len(samples) / RATE * 1000:.0f} ms")


BELL = ((1, 1.0), (2.0, 0.25), (2.76, 0.12), (5.4, 0.04))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    write("ui-tap.wav", mix(tone(1760, 0.04, decay=90, partials=((1, 1.0),)), total=0.04))
    write("ui-toggle.wav", mix(
        tone(1320, 0.03, decay=110, partials=((1, 1.0),)),
        tone(1760, 0.04, start=0.03, decay=90, partials=((1, 1.0),)),
        total=0.07))
    write("ui-success.wav", mix(
        tone(784, 0.12, decay=22),        # sol5
        tone(988, 0.16, start=0.06, decay=18),  # si5 (tierce majeure)
        total=0.22))
    write("brand-chime.wav", mix(
        tone(523.25, 0.65, decay=5.5, partials=BELL),             # do5
        tone(783.99, 0.55, start=0.09, decay=6.0, partials=BELL, gain=0.8),  # sol5
        tone(1318.5, 0.45, start=0.18, decay=7.0, partials=BELL, gain=0.55),  # mi6
        total=0.65))
    write("sale-chime.wav", mix(
        tone(1046.5, 0.14, decay=20, partials=BELL),
        tone(1568.0, 0.2, start=0.1, decay=14, partials=BELL, gain=0.8),
        total=0.3))
    # Copies pour les canaux de notification : Android exige des noms de
    # ressource res/raw en [a-z0-9_] (un tiret casse le build).
    notif = OUT / "notification"
    notif.mkdir(exist_ok=True)
    for src, dst in (("brand-chime.wav", "eventez_chime.wav"), ("sale-chime.wav", "eventez_sale.wav")):
        (notif / dst).write_bytes((OUT / src).read_bytes())
        print(f"notification/{dst}")


if __name__ == "__main__":
    main()
