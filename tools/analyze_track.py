"""Cuts a playable clip out of a track and writes a first-draft note chart for it.

    python tools/analyze_track.py [id]      (default: brazilian-dub; npm run track -- acid)

Needs: pip install librosa soundfile

What it does
  1. fits a 16th-note grid to the audio (tempo is given, the phase is measured)
  2. finds the drop (biggest jump in sub-bass) and counts bars from there
  3. writes  src/music/<id>.clip.mp3   only the part of the track the game plays
  4. writes  src/charts/<id>.js        clip timing, plus a draft of where the hits are

The draft comes from signal analysis: low hits go to lane 0, mid hits to lane 1,
sustained sub-bass becomes hold notes on lane 2. It is a reference only: the
patterns the game plays are written by hand in src/levels.js.
"""
import json
import os
import warnings

import numpy as np

warnings.filterwarnings('ignore')
import librosa  # noqa: E402
import soundfile as sf  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

TRACKS = {
    'brazilian-dub': {
        'id': 'brazilian-dub',
        'source': 'src/music/stephen mars - brazilian dub (ms v1).mp3',
        'bpm': 140.0,
        'from': 27.0,  # seconds: the clip never starts before this
        'to': 68.65,  # seconds: the clip never ends after this
        'drop_search': (38.0, 43.0),
        'bars_before_drop': 8,  # bars of build-up inside the clip
        'bars_after_drop': 16,
        'lead_bars': 2,  # bars at the start with no notes: the track fades in here
    },
    # ACID (techno), 2:50 to 3:45 of the track; the drop lands near 3:05
    'acid': {
        'id': 'acid',
        'source': 'src/music/stephen mars - acid (extended ms v1).mp3',
        'bpm': 140.0,
        'from': 170.0,
        'to': 225.0,
        'drop_search': (183.0, 188.0),
        'bars_before_drop': 8,
        'bars_after_drop': 22,
        'lead_bars': 2,
    },
}
TRACK = TRACKS['brazilian-dub']

SR = 44100
HOP = 256
N_FFT = 2048


def main(cfg=TRACK):
    stereo, sr = librosa.load(os.path.join(ROOT, cfg['source']), sr=SR, mono=False)
    if stereo.ndim == 1:
        stereo = np.stack([stereo, stereo])
    y = stereo.mean(axis=0)

    S = np.abs(librosa.stft(y, n_fft=N_FFT, hop_length=HOP))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=N_FFT)
    t = librosa.times_like(S[0], sr=sr, hop_length=HOP)

    def flux(lo, hi):
        band = np.log1p(S[(freqs >= lo) & (freqs < hi)])
        d = np.diff(band, axis=1, prepend=band[:, :1])
        return np.maximum(d, 0).sum(axis=0)

    f_low, f_mid, f_all = flux(30, 150), flux(180, 2500), flux(30, 16000)
    sub = S[(freqs >= 30) & (freqs < 150)].sum(axis=0)

    beat = 60 / cfg['bpm']
    six = beat / 4
    bar = beat * 4

    # phase of the 16th grid inside the clip
    seg = (t >= cfg['from']) & (t <= cfg['to'])
    z = np.sum(f_all[seg] * np.exp(2j * np.pi * (t[seg] % six) / six))
    phase = (np.angle(z) % (2 * np.pi)) / (2 * np.pi) * six

    # the drop, snapped to the grid
    win = int(0.5 * sr / HOP)
    i0, i1 = np.searchsorted(t, cfg['drop_search'][0]), np.searchsorted(t, cfg['drop_search'][1])
    jump = [sub[i:i + win].mean() - sub[i - win:i].mean() for i in range(i0, i1)]
    drop = t[i0 + int(np.argmax(jump))]
    drop = phase + round((drop - phase) / six) * six

    # fine alignment: a short window sees transients sharply; move the grid onto
    # the kicks that open the bars after the drop
    Sf = np.abs(librosa.stft(y, n_fft=512, hop_length=64))
    ff = librosa.fft_frequencies(sr=sr, n_fft=512)
    lowband = np.log1p(Sf[(ff >= 30) & (ff < 200)])
    fine = np.maximum(np.diff(lowband, axis=1, prepend=lowband[:, :1]), 0).sum(axis=0)
    tf = librosa.times_like(fine, sr=sr, hop_length=64)
    offs = []
    for b in range(cfg['bars_after_drop']):
        c = drop + b * bar
        m = (tf >= c - 0.05) & (tf <= c + 0.05)
        offs.append(tf[m][np.argmax(fine[m])] - c)
    offs = [o for o in offs if abs(o) < 0.03]
    nudge = float(np.median(offs)) - 0.004 if offs else 0.0  # flux peaks a few ms late
    drop += nudge
    print(f'grid nudge {nudge * 1000:+.1f} ms from {len(offs)} bar starts')

    first = -cfg['bars_before_drop']
    t_first = drop + first * bar
    clip_start = max(cfg['from'], t_first - 0.5)
    clip_end = min(cfg['to'], drop + cfg['bars_after_drop'] * bar + 0.05)
    play_from = first + cfg['lead_bars']  # first bar that has notes
    lead = drop + play_from * bar - clip_start
    print(f"grid phase {phase:.4f}s  drop {drop:.3f}s  clip {clip_start:.3f}..{clip_end:.3f}s  lead {lead:.3f}s")

    # ---- chart ------------------------------------------------------------------
    def peak(env, c):
        m = (t >= c - six * 0.3) & (t < c + six * 0.45)
        return env[m].max() if m.any() else 0.0

    def mean(env, c):
        m = (t >= c) & (t < c + six)
        return env[m].mean() if m.any() else 0.0

    n_low, n_mid = np.percentile(f_low[seg], 99), np.percentile(f_mid[seg], 99)
    n_sub = np.percentile(sub[seg], 98)

    bars = []
    taken = {}  # global step index -> True, to keep notes at least an 8th apart
    for b in range(play_from, cfg['bars_after_drop']):
        t0 = drop + b * bar
        g0 = (b - play_from) * 16
        in_drop = b >= 0
        L = np.array([peak(f_low, t0 + s * six) for s in range(16)]) / n_low
        M = np.array([peak(f_mid, t0 + s * six) for s in range(16)]) / n_mid
        B = np.array([mean(sub, t0 + s * six) for s in range(16)]) / n_sub
        rows = [['.'] * 16 for _ in range(3)]

        # hold: a long run of sub-bass starting near the top of the bar
        hold = None
        if in_drop:
            s = 0
            while s < 3 and B[s] < 0.17:
                s += 1
            e = s
            while e < 16 and B[e] >= 0.17:
                e += 1
            if s < 3 and e - s >= 6:
                hold = (s, min(e, s + 8))
                rows[2][s] = 'h'
                for k in range(s + 1, hold[1]):
                    rows[2][k] = '-'
                taken[g0 + s] = True

        # taps: strongest onsets first, never closer than two steps to another note
        last = b == cfg['bars_after_drop'] - 1
        limit = 6 if in_drop else 3 + min(2, (b - play_from) // 2)
        cand = []
        for s in range(16):
            if last and s > 8:
                continue  # leave room for the fade-out
            lane = 0 if L[s] >= 0.5 and L[s] >= M[s] * 0.8 else 1 if M[s] >= 0.45 else None
            if lane is None:
                continue
            strength = max(L[s], M[s]) + (0.3 if s % 4 == 0 else 0.0)
            cand.append((strength, s, lane))
        n = 0
        for strength, s, lane in sorted(cand, reverse=True):
            if n >= limit:
                break
            g = g0 + s
            if taken.get(g) or taken.get(g - 1) or taken.get(g + 1):
                continue
            if hold and hold[0] <= s < hold[0] + 2:
                continue
            rows[lane][s] = 'x'
            taken[g] = True
            n += 1
        bars.append(['drop' if in_drop else 'build', [''.join(r) for r in rows]])

    for i, (section, rows) in enumerate(bars):
        print(f'{i:2d} {section:5s}  ' + '  '.join(rows))

    # ---- clip -------------------------------------------------------------------
    a, z_ = int(clip_start * sr), int(clip_end * sr)
    clip = stereo[:, a:z_].T.copy()
    edge = int(0.012 * sr)
    ramp = np.linspace(0, 1, edge)[:, None]
    clip[:edge] *= ramp
    clip[-edge:] *= ramp[::-1]
    out_audio = os.path.join(ROOT, 'src', 'music', cfg['id'] + '.clip.mp3')
    sf.write(out_audio, clip, sr, format='MP3', subtype='MPEG_LAYER_III')
    print('wrote', os.path.normpath(out_audio), os.path.getsize(out_audio), 'bytes')

    out_chart = os.path.join(ROOT, 'src', 'charts', cfg['id'] + '.js')
    os.makedirs(os.path.dirname(out_chart), exist_ok=True)
    lines = [
        '// GENERATED by tools/analyze_track.py. Do not edit: rerunning the tool overwrites this file.',
        '// The level in src/levels.js uses the timing below. `draft` is only a machine-made',
        '// suggestion of where the hits are, kept as a reference for writing patterns by hand.',
        'export default {',
        f"  bpm: {cfg['bpm']:g},",
        f'  lead: {lead:.4f}, // seconds from the start of the clip to the first playable bar',
        f'  length: {clip_end - clip_start:.4f}, // seconds of audio in the clip',
        '  draft: [',
    ]
    for section, rows in bars:
        lines.append(f'    [{json.dumps(section)}, {json.dumps(rows)}],')
    lines += ['  ],', '};', '']
    with open(out_chart, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print('wrote', os.path.normpath(out_chart))


if __name__ == '__main__':
    import sys
    main(TRACKS[sys.argv[1]] if len(sys.argv) > 1 else TRACK)
