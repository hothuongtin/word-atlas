#!/usr/bin/env python3
"""Synthesize the original soundtrack for the intro video (96 BPM, D major, 62 s).

    python3 scripts/music.py public/music.wav

Structure (1 bar = 2.5 s): 0-4 intro pads, 4-14 groove, 14-20 drop (galaxy),
20-22 lift, 22-24 final hit, then a reverb tail.
"""
import sys
import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt
from scipy.io import wavfile

SR = 48000
BPM = 96
BEAT = 60 / BPM
BAR = BEAT * 4
LEN = 62.0
N = int(SR * LEN)
rng = np.random.default_rng(7)
L = np.zeros(N)
R = np.zeros(N)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def t_(d):
    return np.arange(int(SR * d)) / SR


def add(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N:
        return
    s = sig[: N - i] * gain
    L[i : i + len(s)] += s * np.sqrt((1 - pan) / 2)
    R[i : i + len(s)] += s * np.sqrt((1 + pan) / 2)


def env(n, a, r, d=None):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], "band", fs=SR, output="sos"), x)


def saw(f, t, ph=0.0):
    return 2 * ((f * t + ph) % 1) - 1


# D A Bm G | Bm G D A  (two progressions alternate)
PROG_A = [[50, 57, 62, 66, 69], [45, 52, 57, 61, 64], [47, 54, 59, 62, 66], [43, 50, 55, 59, 62]]
PROG_B = [[47, 54, 59, 62, 66], [43, 50, 55, 59, 62], [50, 57, 62, 66, 69], [45, 52, 57, 61, 64]]


def chord(bar):
    prog = PROG_B if 12 <= bar < 20 else PROG_A
    return prog[bar % 4]


def pad(notes, dur, bright):
    t = t_(dur)
    s = np.zeros(len(t))
    for n in notes[1:]:
        for det in (-0.09, 0.0, 0.11):
            s += saw(midi(n + det), t, rng.random())
    s = lp(s / 12, bright)
    return s * env(len(t), 0.6, 0.9)


def pluck(n, dur=0.5, bright=5000):
    t = t_(dur)
    s = 0.6 * np.sin(2 * np.pi * midi(n) * t) + 0.4 * saw(midi(n), t)
    s = lp(s, bright) * np.exp(-t * 7)
    return s * env(len(t), 0.002, 0.05)


def bell(n, dur=1.6):
    t = t_(dur)
    f = midi(n)
    s = np.sin(2 * np.pi * f * t + 1.8 * np.sin(2 * np.pi * f * 3.5 * t) * np.exp(-t * 4))
    return s * np.exp(-t * 2.6) * env(len(t), 0.003, 0.2)


def kick():
    t = t_(0.5)
    f = 45 + 110 * np.exp(-t * 28)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    click = hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 300) * 0.3
    return np.tanh((s + click) * 1.6)


def clap():
    t = t_(0.35)
    n = bp(rng.standard_normal(len(t)), 900, 4000)
    e = np.exp(-t * 18)
    for k in (0.0, 0.011, 0.022):
        i = int(k * SR)
        e[i:] += np.exp(-t[: len(t) - i] * 60) * 0.6
    return n * e * 0.5


def hat(open_=False):
    t = t_(0.25 if open_ else 0.06)
    return hp(rng.standard_normal(len(t)), 8000) * np.exp(-t * (14 if open_ else 70)) * 0.35


def bass(n, dur):
    t = t_(dur)
    s = np.sin(2 * np.pi * midi(n) * t) + 0.35 * lp(saw(midi(n), t), 400)
    return s * env(len(t), 0.005, 0.08) * 0.6


def riser(dur):
    t = t_(dur)
    n = rng.standard_normal(len(t))
    out = np.zeros(len(t))
    steps = 32
    seg = len(t) // steps
    for k in range(steps):
        f = 400 * (12000 / 400) ** (k / steps)
        a, b = k * seg, (k + 1) * seg
        out[a:b] = bp(n[a:b], f * 0.7, min(f * 1.4, 20000))
    return out * (t / dur) ** 2 * 0.5


def impact():
    t = t_(3.0)
    boom = np.sin(2 * np.pi * np.cumsum(38 + 80 * np.exp(-t * 6)) / SR) * np.exp(-t * 1.6)
    noise = lp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 3) * 0.4
    return np.tanh((boom + noise) * 1.4)


def whoosh(dur=1.2):
    t = t_(dur)
    n = rng.standard_normal(len(t))
    e = np.sin(np.pi * t / dur) ** 2
    return bp(n, 600, 5000) * e * 0.35


# Pads all the way through, brighter in the drop.
for bar in range(25):
    at = bar * BAR
    bright = 900 if bar < 4 else 1800 if bar < 14 else 3200 if bar < 20 else 2200
    notes = chord(min(bar, 23)) if bar < 24 else [50, 57, 62, 66, 69]
    dur = BAR + 1.0 if bar < 24 else 6.0
    add(pad(notes, dur, bright), at, 0.22 if bar < 24 else 0.3, 0)

# Arpeggio (16ths) from bar 2.
pattern = [0, 2, 3, 4, 3, 2, 1, 2]
for bar in range(2, 22):
    notes = chord(bar)
    for s in range(16):
        n = notes[1 + pattern[s % 8] % 4] + 12
        add(pluck(n, 0.35, 2500 if bar < 4 else 6000), bar * BAR + s * BEAT / 4, 0.12 if bar < 4 else 0.16, -0.4 if s % 2 else 0.4)

# Drums and bass from bar 4 (breakdown in bar 13 and 20-21 light).
for bar in range(4, 22):
    at = bar * BAR
    light = bar in (13, 20, 21)
    for b in range(4):
        tb = at + b * BEAT
        if not light or b == 0:
            add(kick(), tb, 0.75)
        if b in (1, 3) and not light:
            add(clap(), tb, 0.5, 0.1)
        add(hat(), tb + BEAT / 2, 0.5, 0.3)
        if bar >= 14 and not light:
            add(hat(), tb + BEAT / 4, 0.25, -0.3)
            add(hat(), tb + 3 * BEAT / 4, 0.25, -0.3)
    root = chord(bar)[0] - 12
    for e in range(8):
        if light and e > 0:
            break
        add(bass(root + (12 if e in (3, 7) else 0), BEAT / 2 * 0.9), at + e * BEAT / 2, 0.55)

# Lead melody in the drop.
mel = [74, 76, 78, 76, 74, 71, 69, 71, 73, 74, 76, 78, 81, 78, 76, 74]
for bar in range(14, 20):
    for k in range(4):
        n = mel[((bar - 14) * 4 + k) % len(mel)]
        add(bell(n, 1.4), bar * BAR + k * BEAT, 0.16, 0.15)

# Intro sparkle bells.
for k, n in enumerate([81, 78, 74, 76, 81, 86]):
    add(bell(n, 2.2), 0.4 + k * 1.15, 0.12, (-1) ** k * 0.5)

# Transitions: risers before big moments, impacts on them, whooshes on scene cuts.
for bar in (4, 14, 22):
    add(riser(BAR), (bar - 1) * BAR, 0.6)
    add(impact(), bar * BAR, 0.6)
for bar in (2, 6, 8, 10, 12, 16, 18, 20):
    add(whoosh(1.0), bar * BAR - 0.5, 0.5)

# Sidechain duck on everything but the kick (approximate from the grid).
duck = np.ones(N)
for bar in range(4, 22):
    for b in range(4):
        i = int((bar * BAR + b * BEAT) * SR)
        d = int(0.28 * SR)
        duck[i : i + d] = np.minimum(duck[i : i + d], 1 - 0.35 * np.exp(-np.arange(min(d, N - i)) / SR * 14))
L *= duck
R *= duck

# Simple stereo reverb.
ir_t = t_(2.6)
irL = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 2.4)
irR = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 2.4)
irL, irR = lp(irL, 6000), lp(irR, 6000)
wetL = fftconvolve(L, irL)[:N] * 0.018
wetR = fftconvolve(R, irR)[:N] * 0.018
L, R = L + wetL, R + wetR

# Master: gentle fade-in, end fade, soft clip, normalize.
fade = np.ones(N)
fade[: int(0.3 * SR)] = np.linspace(0, 1, int(0.3 * SR))
fade[-int(3 * SR):] *= np.linspace(1, 0, int(3 * SR)) ** 1.5
L, R = np.tanh(L * fade * 0.9), np.tanh(R * fade * 0.9)
peak = max(np.abs(L).max(), np.abs(R).max())
mix = np.stack([L, R], 1) / peak * 0.89
wavfile.write(sys.argv[1] if len(sys.argv) > 1 else "music.wav", SR, (mix * 32767).astype(np.int16))
print("wrote", LEN, "s")
