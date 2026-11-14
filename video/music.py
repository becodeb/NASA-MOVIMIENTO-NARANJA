"""Original 30-second chiptune score for the Space Odyssey trailer, synthesized from scratch (no samples).
Sections follow the trailer timeline (see src/trailer). Usage: python music.py out.wav"""
import sys, wave
import numpy as np

SR = 44100
DUR = 30.0
BPM = 120
BEAT = 60 / BPM
N = int(SR * DUR)
mix = np.zeros(N)

def note_hz(n):  # MIDI note -> Hz
    return 440.0 * 2 ** ((n - 69) / 12)

def env(n, a=0.005, d=0.08, s=0.6, r=0.05, length=None):
    length = length or n
    e = np.ones(n) * s
    ai, di, ri = int(a * SR), int(d * SR), int(r * SR)
    ai = min(ai, n); e[:ai] = np.linspace(0, 1, ai)
    de = min(ai + di, n); e[ai:de] = np.linspace(1, s, de - ai)
    if ri and n > ri: e[-ri:] *= np.linspace(1, 0, ri)
    return e

def osc(kind, hz, n, duty=0.5):
    t = np.arange(n) / SR
    ph = (t * hz) % 1.0
    if kind == 'square': return np.where(ph < duty, 1.0, -1.0)
    if kind == 'tri': return 4 * np.abs(ph - 0.5) - 1
    if kind == 'saw': return 2 * ph - 1
    return np.sin(2 * np.pi * hz * t)

def add(start, sig, gain=1.0):
    i = int(start * SR)
    if i >= N: return
    j = min(N, i + len(sig))
    mix[i:j] += sig[: j - i] * gain

def tone(start, dur, midi, kind='square', gain=0.12, duty=0.5, **ek):
    n = int(dur * SR)
    add(start, osc(kind, note_hz(midi), n, duty) * env(n, **ek), gain)

def kick(start, gain=0.9):
    n = int(0.28 * SR); t = np.arange(n) / SR
    f = 140 * np.exp(-t * 22) + 42
    add(start, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9), gain)

rng = np.random.default_rng(7)
def snare(start, gain=0.35):
    n = int(0.18 * SR); t = np.arange(n) / SR
    add(start, (rng.uniform(-1, 1, n) * 0.8 + np.sin(2 * np.pi * 190 * t) * 0.4) * np.exp(-t * 20), gain)

def hat(start, gain=0.08):
    n = int(0.05 * SR); t = np.arange(n) / SR
    add(start, rng.uniform(-1, 1, n) * np.exp(-t * 70), gain)

def noise_swell(start, dur, gain=0.25, rise=True):
    n = int(dur * SR)
    x = rng.uniform(-1, 1, n)
    x = np.convolve(x, np.ones(30) / 30, mode='same')  # darker rumble
    e = np.linspace(0, 1, n) ** 2 if rise else np.linspace(1, 0, n) ** 2
    add(start, x * e, gain)

def chord(start, dur, notes, kind='saw', gain=0.05, **ek):
    for m in notes: tone(start, dur, m, kind, gain, **ek)

def arp(start, end, notes, step=BEAT / 4, kind='square', gain=0.07, oct=12):
    t, i = start, 0
    while t < end - 1e-6:
        tone(t, step * 0.9, notes[i % len(notes)] + oct, kind, gain, duty=0.25, a=0.002, d=0.05, s=0.3, r=0.02)
        t += step; i += 1

# Progressions (MIDI): C major family for heroics, A minor for alarms.
C, G, Am, F = [60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]
Dm, E = [62, 65, 69], [52, 56, 59]

# 0–3 OPEN: shimmering pad + sweep
chord(0, 3.0, [48, 55, 64, 71], 'tri', 0.06, a=1.2, d=0.5, s=0.8, r=0.8)
for k, m in enumerate([72, 76, 79, 84, 88, 91]):
    tone(0.4 + k * 0.4, 0.6, m, 'tri', 0.05, a=0.01, d=0.3, s=0.2, r=0.2)
noise_swell(1.6, 1.4, 0.12)
# 3.0 TITLE SLAM
kick(3.0, 1.0); snare(3.0, 0.5); chord(3.0, 1.5, [48, 60, 64, 67, 72], 'saw', 0.06, a=0.005, d=0.6, s=0.3, r=0.3)
# 4.5–9 BUILD: driving groove
prog = [C, G, Am, F, C, G, Am, G, C]
for b in range(9):
    t0 = 4.5 + b * BEAT
    kick(t0, 0.8)
    if b % 2: snare(t0, 0.3)
    hat(t0 + BEAT / 2)
    tone(t0, BEAT * 0.9, prog[b % len(prog)][0] - 24, 'square', 0.10, duty=0.5, a=0.002, d=0.1, s=0.5, r=0.03)
arp(4.5, 9.0, [60, 64, 67, 72, 67, 64, 62, 59], gain=0.05)
# 9–11.5 LAUNCH: rumble + rising tone
noise_swell(9.0, 2.5, 0.45)
n = int(2.5 * SR); t = np.arange(n) / SR
add(9.0, np.sin(2 * np.pi * np.cumsum(110 + 330 * (t / 2.5) ** 2) / SR) * np.linspace(0.02, 0.10, n))
kick(9.0, 1.0); kick(11.0, 0.8); kick(11.25, 0.8)
# 11.5–14 CRUISE: fast arp, light beat
for b in range(5):
    t0 = 11.5 + b * BEAT
    kick(t0, 0.6); hat(t0 + BEAT / 2); hat(t0 + BEAT * 0.75, 0.05)
arp(11.5, 14.0, [67, 71, 74, 79, 74, 71], step=BEAT / 6, gain=0.045)
chord(11.5, 2.5, [55, 62, 71], 'tri', 0.05, a=0.2, s=0.7, r=0.4)
# 14–20 SATURN OPS: minor, alarm stabs every beat, siren
for b in range(12):
    t0 = 14.0 + b * BEAT
    kick(t0, 0.85)
    if b % 2: snare(t0, 0.35)
    hat(t0 + BEAT / 2, 0.07)
    stab = [Am, Am, F, E][(b // 3) % 4]
    chord(t0, 0.18, [m + 12 for m in stab], 'square', 0.035, a=0.002, d=0.08, s=0.2, r=0.04)
    tone(t0, BEAT * 0.9, stab[0] - 24, 'square', 0.10, a=0.002, d=0.1, s=0.5, r=0.03)
for s in (14.0, 16.0, 18.0):  # siren wail
    n = int(0.9 * SR); tt = np.arange(n) / SR
    add(s, np.sin(2 * np.pi * np.cumsum(700 + 250 * np.sin(2 * np.pi * 3 * tt)) / SR) * env(n, a=0.05, s=0.8, r=0.2), 0.035)
tone(19.5, 0.5, 84, 'tri', 0.08, a=0.005, d=0.2, s=0.4, r=0.2)  # "FIXED!" ding
tone(19.62, 0.4, 88, 'tri', 0.07, a=0.005, d=0.2, s=0.4, r=0.2)
# 20–23.5 RETURN: hopeful, Titan swing (pitch dip and rise)
for b in range(7):
    t0 = 20.0 + b * BEAT
    kick(t0, 0.7); hat(t0 + BEAT / 2)
    tone(t0, BEAT * 0.9, [F, C, G, Am, F, C, G][b][0] - 24, 'square', 0.09, a=0.002, d=0.1, s=0.5, r=0.03)
chord(20.0, 3.5, [65, 69, 72, 76], 'tri', 0.04, a=0.3, s=0.8, r=0.5)
n = int(1.6 * SR); tt = np.arange(n) / SR
add(21.2, np.sin(2 * np.pi * np.cumsum(500 - 300 * np.sin(np.pi * tt / 1.6)) / SR) * env(n, a=0.1, s=0.8, r=0.3), 0.05)
# 23.5–27 REENTRY: tension build (snare roll + rising)
noise_swell(23.5, 2.0, 0.30)
for k in range(16):
    snare(25.0 + k * (2.0 / 16) * (1 - k / 40), 0.15 + k * 0.012)
chord(23.5, 3.5, [57, 60, 64, 69], 'saw', 0.03, a=1.5, s=0.9, r=0.2)
tone(26.4, 0.5, 74, 'square', 0.05)
# 27–30 END: triumphant
kick(27.0, 1.0); snare(27.0, 0.6); noise_swell(27.0, 0.6, 0.2, rise=False)
chord(27.0, 3.0, [48, 55, 60, 64, 67, 72, 76], 'saw', 0.045, a=0.005, d=0.8, s=0.5, r=1.2)
for k, m in enumerate([72, 76, 79, 84]):
    tone(27.0 + k * 0.18, 0.5, m, 'square', 0.05, duty=0.25)
kick(28.0, 0.6); kick(29.0, 0.5)

# Master: soft clip, gentle fade, normalize
mix = np.tanh(mix * 1.4)
fade = int(0.6 * SR); mix[-fade:] *= np.linspace(1, 0, fade)
mix = mix / np.max(np.abs(mix)) * 0.89
stereo = np.stack([mix, np.roll(mix, int(0.012 * SR)) * 0.96], axis=1)
pcm = (stereo * 32767).astype('<i2')
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'music.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok', DUR, 's')
