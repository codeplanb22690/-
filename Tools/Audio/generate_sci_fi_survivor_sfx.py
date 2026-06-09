#!/usr/bin/env python3
import json
import math
import random
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 44100
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "src" / "assets" / "audio" / "generated" / "SciFiSurvivor"
REGISTRY = OUT / "_registry"


def clamp(value, low=-1.0, high=1.0):
    return max(low, min(high, value))


def silence(duration):
    return [0.0] * int(SAMPLE_RATE * duration)


def sine_sweep(start, end, duration, volume=1.0, phase=0.0):
    samples = []
    count = max(1, int(SAMPLE_RATE * duration))
    current_phase = phase
    for index in range(count):
        t = index / max(1, count - 1)
        freq = start * ((end / start) ** t) if start > 0 and end > 0 else start + (end - start) * t
        current_phase += math.tau * freq / SAMPLE_RATE
        samples.append(math.sin(current_phase) * volume)
    return samples


def triangle(freq, duration, volume=1.0):
    samples = []
    for index in range(int(SAMPLE_RATE * duration)):
        phase = (index * freq / SAMPLE_RATE) % 1.0
        value = 4.0 * abs(phase - 0.5) - 1.0
        samples.append(value * volume)
    return samples


def noise(duration, volume=1.0):
    return [(random.random() * 2 - 1) * volume for _ in range(int(SAMPLE_RATE * duration))]


def envelope(samples, attack=0.005, decay=0.06, sustain=0.0, release=0.08):
    total = len(samples)
    if total == 0:
        return samples
    attack_n = max(1, int(SAMPLE_RATE * attack))
    decay_n = max(1, int(SAMPLE_RATE * decay))
    release_n = max(1, int(SAMPLE_RATE * release))
    out = []
    for index, sample in enumerate(samples):
        if index < attack_n:
            amp = index / attack_n
        elif index < attack_n + decay_n:
            t = (index - attack_n) / decay_n
            amp = 1.0 + (sustain - 1.0) * t
        elif index > total - release_n:
            t = (index - (total - release_n)) / release_n
            amp = max(0.0, sustain * (1.0 - t))
        else:
            amp = sustain
        out.append(sample * amp)
    return out


def fade(samples, fade_in=0.002, fade_out=0.018):
    out = samples[:]
    fi = max(1, int(SAMPLE_RATE * fade_in))
    fo = max(1, int(SAMPLE_RATE * fade_out))
    for index in range(min(fi, len(out))):
        out[index] *= index / fi
    for offset in range(min(fo, len(out))):
        out[-offset - 1] *= offset / fo
    return out


def mix(*signals):
    length = max((len(signal) for signal in signals), default=0)
    out = [0.0] * length
    for signal in signals:
        for index, sample in enumerate(signal):
            out[index] += sample
    return out


def place(base, signal, start):
    start_i = int(SAMPLE_RATE * start)
    needed = start_i + len(signal)
    if needed > len(base):
        base.extend([0.0] * (needed - len(base)))
    for index, sample in enumerate(signal):
        base[start_i + index] += sample
    return base


def one_pole_lowpass(samples, cutoff):
    rc = 1.0 / (math.tau * cutoff)
    dt = 1.0 / SAMPLE_RATE
    alpha = dt / (rc + dt)
    out = []
    current = 0.0
    for sample in samples:
        current += alpha * (sample - current)
        out.append(current)
    return out


def one_pole_highpass(samples, cutoff):
    low = one_pole_lowpass(samples, cutoff)
    return [sample - low_sample for sample, low_sample in zip(samples, low)]


def delay(samples, delay_s=0.045, feedback=0.24):
    out = samples[:]
    delay_n = int(SAMPLE_RATE * delay_s)
    for index in range(delay_n, len(out)):
        out[index] += out[index - delay_n] * feedback
    return out


def normalize(samples, peak=0.82):
    max_abs = max((abs(sample) for sample in samples), default=0.0)
    if max_abs <= 0:
        return samples
    gain = peak / max_abs
    return [clamp(sample * gain) for sample in samples]


def write_wav(path, samples):
    path.parent.mkdir(parents=True, exist_ok=True)
    samples = fade(normalize(samples))
    with wave.open(str(path), "w") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        frames = b"".join(struct.pack("<h", int(clamp(sample) * 32767)) for sample in samples)
        wav.writeframes(frames)


def exp_chain(variant):
    base = silence(0.42 + variant * 0.008)
    notes = 4 + (variant % 5)
    start = 880 + variant * 23
    for step in range(notes):
        t = step * 0.045
        ping = sine_sweep(start + step * 105, start + step * 145 + 240, 0.075, 0.45)
        sparkle = triangle(1800 + (step % 3) * 360 + variant * 11, 0.052, 0.18)
        shimmer = one_pole_highpass(noise(0.07, 0.08), 2200)
        place(base, envelope(mix(ping, sparkle, shimmer), 0.002, 0.035, 0.02, 0.05), t)
    return delay(base, 0.055, 0.18)


def exp_magnet(variant):
    whoosh = one_pole_lowpass(noise(0.42, 0.34), 1500 + variant * 70)
    sweep = sine_sweep(260 + variant * 12, 760 + variant * 24, 0.45, 0.24)
    shimmer = one_pole_highpass(noise(0.45, 0.12), 2600)
    return envelope(mix(whoosh, sweep, shimmer), 0.018, 0.12, 0.18, 0.18)


def enemy_hit_soft(variant):
    click = sine_sweep(520 + variant * 15, 250 + variant * 8, 0.09, 0.28)
    tick = one_pole_highpass(noise(0.055, 0.18), 1800)
    return envelope(mix(click, tick), 0.001, 0.028, 0.0, 0.035)


def enemy_hit_cluster(variant):
    body = sine_sweep(360 + variant * 18, 170 + variant * 6, 0.16, 0.42)
    splash = one_pole_lowpass(noise(0.14, 0.24), 2200)
    glint = sine_sweep(1300 + variant * 55, 2100 + variant * 60, 0.08, 0.14)
    return envelope(delay(mix(body, splash, glint), 0.035, 0.18), 0.002, 0.06, 0.04, 0.08)


def enemy_death_pop(variant):
    pop = sine_sweep(240 + variant * 8, 92 + variant * 3, 0.16, 0.42)
    particles = silence(0.28)
    for step in range(5 + variant % 4):
        shard = sine_sweep(900 + random.random() * 900, 1500 + random.random() * 1200, 0.045, 0.12)
        place(particles, envelope(shard, 0.001, 0.018, 0.0, 0.032), 0.035 + step * 0.018)
    puff = one_pole_lowpass(noise(0.13, 0.18), 1200)
    return envelope(mix(pop, particles, puff), 0.002, 0.05, 0.02, 0.12)


def weapon_fire_light(variant):
    pulse = sine_sweep(620 + variant * 22, 980 + variant * 30, 0.13, 0.28)
    air = one_pole_highpass(noise(0.11, 0.08), 2400)
    return envelope(mix(pulse, air), 0.002, 0.04, 0.0, 0.055)


def weapon_mango_pop(variant):
    soft = sine_sweep(420 + variant * 20, 760 + variant * 34, 0.14, 0.32)
    bubble = triangle(950 + variant * 28, 0.095, 0.16)
    pop = one_pole_lowpass(noise(0.045, 0.16), 1800)
    return envelope(mix(soft, bubble, pop), 0.002, 0.05, 0.02, 0.06)


def level_up(variant):
    base = silence(1.15 + variant * 0.06)
    riser = sine_sweep(320 + variant * 20, 980 + variant * 40, 0.8, 0.22)
    place(base, envelope(riser, 0.02, 0.22, 0.34, 0.32), 0)
    for step, freq in enumerate([540, 680, 810, 1080, 1360]):
        note = sine_sweep(freq + variant * 18, freq * 1.12 + variant * 20, 0.18, 0.28)
        place(base, envelope(note, 0.004, 0.055, 0.08, 0.12), 0.18 + step * 0.11)
    shimmer = one_pole_highpass(noise(1.0, 0.12), 3000)
    return delay(mix(base, envelope(shimmer, 0.05, 0.2, 0.18, 0.45)), 0.09, 0.2)


def ui_select(variant):
    lock = sine_sweep(740 + variant * 40, 1060 + variant * 45, 0.11, 0.35)
    snap = one_pole_highpass(noise(0.035, 0.12), 3200)
    return envelope(mix(lock, snap), 0.001, 0.035, 0.0, 0.05)


def chest_open(variant):
    base = silence(1.05 + variant * 0.04)
    lock = one_pole_highpass(noise(0.08, 0.22), 1800)
    door = one_pole_lowpass(noise(0.34, 0.28), 1400)
    reward = sine_sweep(620 + variant * 30, 1720 + variant * 60, 0.62, 0.3)
    place(base, envelope(lock, 0.001, 0.02, 0.0, 0.05), 0.02)
    place(base, envelope(door, 0.015, 0.12, 0.15, 0.18), 0.12)
    place(base, envelope(reward, 0.01, 0.16, 0.2, 0.32), 0.32)
    return delay(base, 0.075, 0.2)


def evolve_complete(variant):
    base = silence(2.05 + variant * 0.12)
    riser = sine_sweep(120 + variant * 10, 1180 + variant * 70, 0.82, 0.38)
    impact = sine_sweep(90, 42, 0.34, 0.55)
    burst = one_pole_highpass(noise(0.62, 0.28), 1600)
    tail = sine_sweep(680, 420, 1.0, 0.18)
    place(base, envelope(riser, 0.03, 0.3, 0.3, 0.25), 0.0)
    place(base, envelope(impact, 0.001, 0.09, 0.08, 0.28), 0.72)
    place(base, envelope(burst, 0.002, 0.18, 0.16, 0.42), 0.74)
    place(base, envelope(tail, 0.03, 0.25, 0.14, 0.65), 0.92)
    return delay(base, 0.11, 0.22)


def boss_spawn(variant):
    base = silence(2.5 + variant * 0.12)
    sub = sine_sweep(72 + variant * 4, 42, 1.7, 0.55)
    riser = sine_sweep(180, 700 + variant * 60, 1.65, 0.28)
    alarm = silence(1.4)
    for step in range(4):
        beep = sine_sweep(820 + variant * 30, 620 + variant * 20, 0.16, 0.22)
        place(alarm, envelope(beep, 0.002, 0.04, 0.04, 0.08), step * 0.28)
    hit = sine_sweep(96, 54, 0.42, 0.46)
    place(base, envelope(sub, 0.03, 0.35, 0.42, 0.55), 0.0)
    place(base, envelope(riser, 0.04, 0.4, 0.24, 0.4), 0.18)
    place(base, alarm, 0.55)
    place(base, envelope(hit, 0.001, 0.12, 0.08, 0.28), 1.65)
    return delay(base, 0.13, 0.18)


EVENTS = [
    ("Pickup", "SFX_PICKUP_EXP_CHAIN", "sfx_pickup_exp_chain", 12, exp_chain),
    ("Pickup", "SFX_PICKUP_EXP_MAGNET", "sfx_pickup_exp_magnet", 6, exp_magnet),
    ("Hit", "SFX_HIT_ENEMY_SOFT", "sfx_hit_enemy_soft", 12, enemy_hit_soft),
    ("Hit", "SFX_HIT_ENEMY_CLUSTER", "sfx_hit_enemy_cluster", 8, enemy_hit_cluster),
    ("Enemy", "SFX_ENEMY_DEATH_POP", "sfx_enemy_death_pop", 12, enemy_death_pop),
    ("Weapon", "SFX_WEAPON_FIRE_LIGHT", "sfx_weapon_fire_light", 8, weapon_fire_light),
    ("Weapon", "SFX_WEAPON_MANGO_POP", "sfx_weapon_mango_pop", 8, weapon_mango_pop),
    ("Reward", "SFX_PLAYER_LEVEL_UP", "sfx_player_level_up", 4, level_up),
    ("UI", "SFX_UI_SELECT_CARD", "sfx_ui_select_card", 4, ui_select),
    ("Reward", "SFX_CHEST_OPEN_FUTURE", "sfx_chest_open_future", 4, chest_open),
    ("Reward", "SFX_EVOLVE_COMPLETE", "sfx_evolve_complete", 3, evolve_complete),
    ("Boss", "SFX_BOSS_SPAWN", "sfx_boss_spawn", 3, boss_spawn),
]


def main():
    random.seed(1204)
    REGISTRY.mkdir(parents=True, exist_ok=True)
    registry = []
    for category, event_id, prefix, count, maker in EVENTS:
        clips = []
        for variant in range(1, count + 1):
            path = OUT / category / f"{prefix}_{variant:02d}.wav"
            write_wav(path, maker(variant))
            clips.append(str(path.relative_to(OUT)))
        registry.append({"id": event_id, "category": category, "clips": clips})
    (REGISTRY / "audio_events.generated.json").write_text(json.dumps(registry, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated {sum(len(item['clips']) for item in registry)} WAV files in {OUT}")


if __name__ == "__main__":
    main()
