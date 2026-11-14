"""Record the in-app trailer (/?preview=trailer) to MP4 with music + English subtitles.
Usage: python record.py <base_url> [out_dir]   e.g. python record.py http://localhost:4173 out
Produces: trailer_raw.webm, space-odyssey-trailer.mp4 (captions burned in by the app), captions.srt"""
import json, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4173'
OUT = Path(sys.argv[2] if len(sys.argv) > 2 else 'out'); OUT.mkdir(exist_ok=True)
HERE = Path(__file__).parent
W, H, DUR = 1920, 1080, 30.0

with sync_playwright() as p:
    launch_args = ['--autoplay-policy=no-user-gesture-required']
    browser = None
    for channel in ('chrome', 'msedge', None):
        try:
            browser = p.chromium.launch(channel=channel, args=launch_args) if channel else p.chromium.launch(args=launch_args)
            break
        except Exception as e:  # channel not installed
            print('browser channel', channel, 'unavailable:', str(e).splitlines()[0])
    assert browser, 'no Chromium-based browser available'
    ctx = browser.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1,
                              record_video_dir=str(OUT / 'rec'), record_video_size={'width': W, 'height': H})
    t_ctx = time.monotonic()
    page = ctx.new_page()
    page.goto(f'{BASE}/?preview=trailer', wait_until='networkidle')
    page.wait_for_timeout(2500)  # fonts + first paint settle
    captions = page.evaluate('() => window.__trailerCaptions || null')
    t_start = time.monotonic()
    page.evaluate('() => window.__startTrailer()')
    page.wait_for_function('() => window.__trailerDone === true', timeout=60000)
    page.wait_for_timeout(600)
    video_path = page.video.path()
    ctx.close(); browser.close()

offset = t_start - t_ctx
raw = OUT / 'trailer_raw.webm'
Path(video_path).replace(raw)
print('start offset', round(offset, 2), 's')

if captions:
    def ts(s):
        ms = int(round(s * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); sec, ms = divmod(ms, 1000)
        return f'{h:02}:{m:02}:{sec:02},{ms:03}'
    srt = '\n'.join(f"{i+1}\n{ts(c['start'])} --> {ts(c['end'])}\n{c['text']}\n" for i, c in enumerate(captions))
    (OUT / 'captions.srt').write_text(srt, encoding='utf-8')

music = OUT / 'music.wav'
if not music.exists():
    subprocess.run([sys.executable, str(HERE / 'music.py'), str(music)], check=True)

mp4 = OUT / 'space-odyssey-trailer.mp4'
cmd = ['ffmpeg', '-y', '-v', 'error', '-ss', f'{offset:.3f}', '-i', str(raw), '-i', str(music)]
if (OUT / 'captions.srt').exists():
    cmd += ['-i', str(OUT / 'captions.srt'), '-map', '0:v', '-map', '1:a', '-map', '2:s', '-c:s', 'mov_text', '-metadata:s:s:0', 'language=eng']
else:
    cmd += ['-map', '0:v', '-map', '1:a']
cmd += ['-t', f'{DUR}', '-r', '30', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', str(mp4)]
subprocess.run(cmd, check=True)
print('wrote', mp4)
