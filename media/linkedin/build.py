#!/usr/bin/env python3
"""Builds linkedin.html: the plugin's 3D template (scripts/video/templates/3d.html) with this
video's own shots (shots.js), look (overlay.css), and timeline (body.html) spliced in, timed to
the music.

    python3 build.py                                   # the music edit and linkedin.html
    node ../../scripts/video/render.js linkedin.html marketing-skill-linkedin.mp4 --cover 0
    python3 build.py --master marketing-skill-linkedin.mp4 --lufs -18   # the final, quieter mix

body.html is written on a 120 BPM grid (a beat every 0.5s). The music, Funky Diesel, is 108 BPM,
so every time on the page is stretched by 120/108 here: the words, cuts, and sound cues land on
the track's beats, and the 3D shots run on the same stretched clock (TIME_SCALE in the page).
"""
import json
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEMPLATE = HERE.parent.parent / "scripts" / "video" / "templates" / "3d.html"

# The track (assets/funky-diesel.mp3, Uppbeat, not in the repo) and the edit cut from it, in
# whole bars of its beat grid (scripts/video/beats.js: 108 BPM, first beat at 0.557s, bars
# from beat 3). Each piece: the beat it starts on and how many beats it runs.
TRACK = HERE / "assets" / "funky-diesel.mp3"
EDIT = HERE / "assets" / "funky-diesel-edit.wav"
FIRST_BEAT, BEAT = 0.557, 60 / 108
PIECES = [
    (23, 32),   # 0-17.8s: the groove building into the full section, whose lift lands on "Now it does." (4.4s)
    (91, 4),    # 17.8-20s: a bar of the breakdown, under "And the videos?"
    (111, 24),  # 20s on: the full section again, on "It makes those too.", to the end
]

IMPORTS = """import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
// body.html is timed on a 120 BPM grid; the page plays at the track's tempo (build.py)
const TIME_SCALE = (parseFloat(document.body.dataset.designBpm) / parseFloat(document.body.dataset.bpm)) || 1;
"""

COMMENT = """<!--
  The LinkedIn cut: a 33-second, 1080x1350 (4:5) video of the plugin with no voiceover, cut to
  Funky Diesel (108 BPM). Built by media/linkedin/build.py from scripts/video/templates/3d.html
  (its engine, mascot, and helpers) plus shots.js, overlay.css, and body.html. Edit those and
  build again; don't edit this file.
-->"""

TIME = re.compile(r"(?<![\w.])(\d*\.?\d+)s\b")


def fmt(t):
    return f"{t:.3f}".rstrip("0").rstrip(".") + "s"


def stretch(body, k):
    """Stretches every start time in body.html by k: --in, --out, and --at, the delays in inline
    animation lists, and the length. The 3D shots (.shot) keep theirs; the page's clock is
    stretched for them instead."""
    def times(m):
        return f"{m.group(1)}{fmt(float(m.group(2)) * k)}"

    def animation(m):
        items = []
        for item in re.split(r",(?![^(]*\))", m.group(1)):  # not the commas inside cubic-bezier()
            found = list(TIME.finditer(item))
            if len(found) >= 2:  # a duration, then a delay: only the delay moves
                d = found[-1]
                item = item[:d.start()] + fmt(float(d.group(1)) * k) + item[d.end():]
            items.append(item)
        return "animation:" + ",".join(items) + ";"

    out = []
    for line in body.splitlines(keepends=True):
        if 'class="shot"' not in line:
            line = re.sub(r"(--(?:in|out|at):\s*)(\d*\.?\d+)s", times, line)
            line = re.sub(r"animation:([^;\"]*);", animation, line)
        out.append(line)
    body = "".join(out)
    duration = float(re.search(r'data-duration="([\d.]+)"', body).group(1))
    body = re.sub(r'data-duration="[\d.]+"', f'data-duration="{duration * k:.3f}"', body, count=1)
    return body.replace('<div class="prog"', f'<div class="prog" style="--total:{fmt(duration * k)}"', 1)


def music_edit():
    if not TRACK.exists():
        print(f"Note: {TRACK.name} isn't here (it's git-ignored; its license doesn't allow sharing the file), "
              "so the music edit wasn't made. Put the track there and build again.")
        return
    parts, labels = [], []
    for i, (beat, beats) in enumerate(PIECES):
        start, length = FIRST_BEAT + beat * BEAT, beats * BEAT
        fade_in = "" if i == 0 else ",afade=t=in:d=0.012"
        fade_out = "" if i == len(PIECES) - 1 else f",afade=t=out:st={length - 0.012:.4f}:d=0.012"
        parts.append(f"[0:a]atrim=start={start:.4f}:duration={length:.4f},asetpts=PTS-STARTPTS{fade_in}{fade_out}[p{i}]")
        labels.append(f"[p{i}]")
    graph = ";".join(parts) + ";" + "".join(labels) + f"concat=n={len(PIECES)}:v=0:a=1,aresample=48000[out]"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(TRACK), "-filter_complex", graph, "-map", "[out]",
                    "-c:a", "pcm_s16le", str(EDIT)], check=True)
    print(f"wrote {EDIT.name} ({sum(b for _, b in PIECES) * BEAT:.2f}s from {len(PIECES)} pieces of {TRACK.name})")


def loudness(path):
    run = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-map", "0:a", "-af",
                          "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True)
    summary = run.stderr[run.stderr.rfind("Summary:"):]
    return (float(re.search(r"I:\s+(-?[\d.]+) LUFS", summary).group(1)),
            float(re.search(r"Peak:\s+(-?[\d.]+) dBFS", summary).group(1)))


def master(video, target):
    """Re-levels a rendered video's sound to `target` LUFS, keeping the picture as it is."""
    video = Path(video)
    lufs, _ = loudness(video)
    tmp = video.with_suffix(".tmp.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-map", "0", "-c:v", "copy",
                    "-af", f"volume={target - lufs:.2f}dB", "-c:a", "aac", "-b:a", "192k",
                    "-movflags", "+faststart", str(tmp)], check=True)
    tmp.replace(video)
    lufs, peak = loudness(video)
    print(f"{video.name}: sound at {lufs} LUFS, peak {peak} dBTP")


def main():
    if "--master" in sys.argv:
        i = sys.argv.index("--master")
        target = float(sys.argv[sys.argv.index("--lufs") + 1]) if "--lufs" in sys.argv else -18.0
        return master(sys.argv[i + 1], target)
    body = (HERE / "body.html").read_text()
    design = float(re.search(r'data-design-bpm="([\d.]+)"', body).group(1))
    bpm = float(re.search(r'data-bpm="([\d.]+)"', body).group(1))
    body = stretch(body, design / bpm)
    music_edit()

    page = TEMPLATE.read_text()
    # the template's own doc comment goes; this page says what it is instead
    start = page.index("<!--")
    page = page[:start] + COMMENT + page[page.index("-->", start) + 3:]
    page = page.replace("</style>", (HERE / "overlay.css").read_text() + "</style>", 1)
    marker = "import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';\n"
    page = page.replace(marker, marker + IMPORTS, 1)
    marker = "// A screen shot (demo.py) hands the frame on without a cut"
    page = page.replace(marker, (HERE / "shots.js").read_text() + "\n" + marker, 1)
    for old, new in [
        ("  view.update(lt);\n  renderer.render(view.scene, view.camera);",
         "  view.update(lt);\n  if (view.render) view.render(); else renderer.render(view.scene, view.camera);"),
        ("const total = parseFloat(document.body.dataset.duration) || 0;",
         "const total = (parseFloat(document.body.dataset.duration) || 0) / TIME_SCALE;"),
        ("window.renderFrame = (t) => {\n",
         "window.renderFrame = (t) => {\n  t /= TIME_SCALE; // the page's clock, back on the shots' 120 BPM grid\n"),
    ]:
        assert old in page, f"the template changed; update build.py ({old[:40]}...)"
        page = page.replace(old, new, 1)
    page = page[: page.index("</head>") + len("</head>")] + "\n" + body
    (HERE / "linkedin.html").write_text(page)
    print(f"wrote linkedin.html ({len(page) // 1024} KB), {bpm:g} BPM: the page's times x{design / bpm:.4f}")


if __name__ == "__main__":
    main()
