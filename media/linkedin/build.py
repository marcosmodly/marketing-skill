#!/usr/bin/env python3
"""Builds linkedin.html: the plugin's 3D template (scripts/video/templates/3d.html) with this
video's own shots (shots.js), look (overlay.css), and timeline (body.html) spliced in.

    python3 build.py                       # writes linkedin.html next to this file
    node ../../scripts/video/render.js linkedin.html marketing-skill-linkedin.mp4 --cover 0
"""
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEMPLATE = HERE.parent.parent / "scripts" / "video" / "templates" / "3d.html"

IMPORTS = """import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
"""

COMMENT = """<!--
  The LinkedIn cut: a 30-second, 1080x1350 (4:5) video of the plugin with no voiceover, cut to
  an original 120 BPM score. Built by media/linkedin/build.py from scripts/video/templates/3d.html
  (its engine, mascot, and helpers) plus shots.js, overlay.css, and body.html. Edit those and
  build again; don't edit this file.
-->"""


def splice(text, marker, insert, after=False):
    i = text.index(marker)
    if after:
        i += len(marker)
    return text[:i] + insert + text[i:]


def main():
    page = TEMPLATE.read_text()
    # the template's own doc comment goes; this page says what it is instead
    start = page.index("<!--")
    page = page[:start] + COMMENT + page[page.index("-->", start) + 3:]
    page = splice(page, "</style>", (HERE / "overlay.css").read_text())
    page = splice(page, "import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';\n", IMPORTS, after=True)
    page = splice(page, "// A screen shot (demo.py) hands the frame on without a cut", (HERE / "shots.js").read_text() + "\n")
    old = "  view.update(lt);\n  renderer.render(view.scene, view.camera);"
    assert old in page, "the template's draw() changed; update build.py"
    page = page.replace(old, "  view.update(lt);\n  if (view.render) view.render(); else renderer.render(view.scene, view.camera);")
    page = page[: page.index("</head>") + len("</head>")] + "\n" + (HERE / "body.html").read_text()
    (HERE / "linkedin.html").write_text(page)
    print(f"wrote {HERE / 'linkedin.html'} ({len(page) // 1024} KB)")


if __name__ == "__main__":
    main()
