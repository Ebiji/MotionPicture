"""Synthesize the 30s showreel soundtrack (120 BPM, A minor) -> assets/showreel.wav.

Deterministic: fixed RNG seed so re-renders are identical.
Scene cuts land on these beats: 2.0 / 5.0 / 9.0 / 13.0 / 17.0 / 21.0 / 24.5 / 27.0
"""
import wave
from pathlib import Path

import numpy as np

SR = 44100
DUR = 30.0
BPM = 120
BEAT = 60 / BPM
N = int(SR * DUR)
rng = np.random.default_rng(1970)

L = np.zeros(N)
R = np.zeros(N)


def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    L[i : i + len(sig)] += sig * gain * np.sqrt((1 - pan) / 2) * 1.414
    R[i : i + len(sig)] += sig * gain * np.sqrt((1 + pan) / 2) * 1.414


def env(n, a=0.002, d=0.2):
    t = np.arange(n) / SR
    e = np.exp(-t / d)
    na = max(1, int(a * SR))
    e[:na] *= np.linspace(0, 1, na)
    return e


def lowpass(x, cutoff):
    # one-pole lowpass, cutoff may be array
    cutoff = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    prev = 0.0
    for i in range(len(x)):
        prev = (1 - a[i]) * x[i] + a[i] * prev
        y[i] = prev
    return y


def kick(n_sec=0.45, punch=1.0):
    n = int(n_sec * SR)
    t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t / 0.035) * punch
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * env(n, 0.001, 0.16)
    click = rng.standard_normal(n) * env(n, 0.0005, 0.004) * 0.4
    return np.tanh((s + click) * 1.6)


def snare():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 190 * t) * env(n, 0.001, 0.05)
    noise = rng.standard_normal(n)
    noise = noise - lowpass(noise, 1200)
    return tone * 0.5 + noise * env(n, 0.001, 0.09) * 0.7


def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR)
    noise = rng.standard_normal(n)
    noise = noise - lowpass(noise, 7000)
    return noise * env(n, 0.0005, 0.08 if open_ else 0.018)


def boom(n_sec=2.5):
    n = int(n_sec * SR)
    t = np.arange(n) / SR
    f = 32 + 70 * np.exp(-t / 0.12)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.002, 0.7)
    noise = lowpass(rng.standard_normal(n), 900) * env(n, 0.001, 0.35) * 1.2
    return np.tanh((s + noise) * 1.4)


def riser(n_sec, f0=300, f1=6000):
    n = int(n_sec * SR)
    t = np.linspace(0, 1, n)
    noise = rng.standard_normal(n)
    cut = f0 * (f1 / f0) ** t
    x = lowpass(noise, cut) - lowpass(noise, cut * 0.25)
    sweep = np.sin(2 * np.pi * np.cumsum(200 * (8 ** t)) / SR) * 0.25
    return (x * 1.6 + sweep) * t ** 2


def whoosh(n_sec=0.45):
    n = int(n_sec * SR)
    t = np.linspace(0, 1, n)
    noise = rng.standard_normal(n)
    cut = 400 + 7000 * np.sin(np.pi * t) ** 2
    return lowpass(noise, cut) * np.sin(np.pi * t) ** 2 * 1.3


def tick(freq=2400):
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * freq * t) * env(n, 0.0005, 0.012)


def blip(freq):
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    sq = np.sign(np.sin(2 * np.pi * freq * t))
    return sq * env(n, 0.001, 0.03) * 0.35


def saw_note(freq, n_sec, cutoff=900, detune=0.006):
    n = int(n_sec * SR)
    t = np.arange(n) / SR
    s = sum(2 * ((t * freq * (1 + d)) % 1) - 1 for d in (-detune, 0, detune)) / 3
    s = lowpass(s, cutoff)
    e = env(n, 0.004, n_sec * 0.6)
    e[-int(0.01 * SR):] *= np.linspace(1, 0, int(0.01 * SR))
    return s * e


def pad_chord(freqs, n_sec):
    n = int(n_sec * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for f in freqs:
        for d in (-0.004, 0.004):
            s += 2 * ((t * f * (1 + d)) % 1) - 1
    s = lowpass(s / (len(freqs) * 2), 1400)
    a = np.minimum(1, t / 0.4) * np.minimum(1, (n_sec - t) / 0.4)
    return s * a


def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


# ---------------- arrangement ----------------
# Intro countdown ticks + riser
for i, t in enumerate((0.0, 0.5, 1.0)):
    add(tick(1800 + i * 400), t, 0.6)
add(riser(2.0, 200, 9000), 0.0, 0.35)
add(whoosh(0.5), 1.5, 0.5)

# Impacts at every scene cut
for t, g in ((2.0, 0.95), (5.0, 0.7), (9.0, 0.7), (13.0, 0.7), (17.0, 0.7), (21.0, 0.7), (27.0, 1.0)):
    add(boom(2.8 if t == 27.0 else 1.6), t, g)
for t in (4.6, 8.6, 12.6, 16.6, 20.6, 24.1, 26.6):
    add(whoosh(0.45), t, 0.45, pan=0.3 if int(t) % 2 else -0.3)

# Drums: 2.0 -> 27.0
t = 2.0
while t < 27.0 - 1e-6:
    b = round((t - 2.0) / BEAT)
    add(kick(punch=1.0), t, 0.9)
    if b % 2 == 1 and t >= 5.0:
        add(snare(), t, 0.5)
    t += BEAT
# hats (8ths + offbeat opens) from 5.0
t = 5.0
k = 0
while t < 27.0 - 1e-6:
    add(hat(open_=(k % 2 == 1)), t, 0.22 if k % 2 else 0.14, pan=0.25 if k % 2 else -0.25)
    t += BEAT / 2
    k += 1
# 16th hat roll into the montage
t = 23.0
while t < 24.5:
    add(hat(), t, 0.1 + 0.1 * (t - 23.0), pan=0.4)
    t += BEAT / 4
add(riser(1.5, 400, 10000), 23.0, 0.3)

# Bass: A minor progression Am - F - C - G per bar (2s), 8th notes, from 2.0
prog = [45, 41, 48, 43]  # A2 F2 C3 G2
bar = 0
t0 = 2.0
while t0 < 27.0 - 1e-6:
    root = prog[bar % 4]
    for s in range(8):
        tt = t0 + s * BEAT / 2
        if tt >= 27.0:
            break
        note = root + (12 if s in (3, 7) else 0)
        cut = 600 + 900 * (t0 >= 5.0) + 500 * (s % 2)
        add(saw_note(hz(note), BEAT / 2 * 0.9, cutoff=cut), tt, 0.32)
    t0 += 2.0
    bar += 1

# Pads from 5.0
chords = [(57, 60, 64), (53, 57, 60), (55, 60, 64), (55, 59, 62)]
bar = 0
t0 = 5.0
while t0 < 27.0 - 1e-6:
    c = chords[(bar + 1) % 4]
    add(pad_chord([hz(m) for m in c], min(2.0, 27.0 - t0)), t0, 0.16)
    t0 += 2.0
    bar += 1

# "Twinkle Twinkle Little Star" bell motif over the 3D scene (a nod to EIJI's MIDI piece)
def bell(freq, n_sec=1.2):
    n = int(n_sec * SR)
    t = np.arange(n) / SR
    s = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(2 * np.pi * freq * 2.76 * t) * np.exp(-t / 0.15)
    return s * env(n, 0.002, 0.45)


for i, m in enumerate((72, 72, 79, 79, 81, 81, 79)):  # C C G G A A G
    add(bell(hz(m), 1.6 if i == 6 else 1.0), 17.0 + i * BEAT, 0.28, pan=(-0.3 if i % 2 else 0.3))

# Montage glitch blips every 1/8 bar
for i in range(20):
    tt = 24.5 + i * 0.125
    add(blip(hz(81 + (i * 5) % 12)), tt, 0.35, pan=(-0.6 if i % 2 else 0.6))

# Outro: final chord ring
add(pad_chord([hz(m) for m in (45, 57, 60, 64, 69)], 3.0), 27.0, 0.22)

# ---------------- master ----------------
mix = np.stack([L, R], axis=1)
mix = np.tanh(mix * 1.1)
fade = int(0.6 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.89

out = Path(__file__).resolve().parent.parent / "assets" / "showreel.wav"
with wave.open(str(out), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype("<i2").tobytes())
print("wrote", out)
