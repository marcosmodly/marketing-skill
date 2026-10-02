#!/usr/bin/env python3
"""Builds the self-contained template pages in this folder from one shared base.

Every template carries the same base styles (canvas, safe area, entrances,
type scale, count-ups, background layer), so edit them here and run
`python3 build.py` rather than hand-editing six copies. Each page is still
fully self-contained after building, so the skill can copy any one of them.
"""
import os
import sys

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))

POINTER = """
  Page conventions (canvas, safe area, timing vars, backgrounds, data-sfx
  cues, music, assets): see the comment at the top of promo.html."""

HEAD = """<!doctype html>
<!--
{doc}
-->
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&family=JetBrains+Mono:wght@500&display=block">
<style>
  :root {{
    --bg: #0f0f13;
    --card: #1b1b22;
    --line: #2b2b35;
    --text: #f3f2ee;
    --muted: #9a99a4;
    --accent: #e07a55;
    --ok: #3fbf7f;
    --bad: #e0605a;
    --warn: #e8b04a;
  }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  html, body {{ width: 1080px; height: 1920px; overflow: hidden; background: var(--bg); }}
  body {{ font-family: "Inter", "Liberation Sans", sans-serif; color: var(--text); position: relative; }}

  .glow {{ position: absolute; border-radius: 50%; filter: blur(120px); opacity: .55; }}
  .g1 {{ width: 900px; height: 900px; background: {g1}; left: -300px; top: -200px; animation: drift1 24s linear 0s both; }}
  .g2 {{ width: 800px; height: 800px; background: {g2}; right: -320px; bottom: -160px; animation: drift2 24s linear 0s both; }}
  @keyframes drift1 {{ from {{ transform: translate(0,0); }} to {{ transform: translate(260px, 520px); }} }}
  @keyframes drift2 {{ from {{ transform: translate(0,0); }} to {{ transform: translate(-220px, -600px); }} }}

  /* scenes: content kept inside the platform-UI safe zone */
  .scene {{ position: absolute; left: 90px; right: 150px; top: 330px; bottom: 470px;
           display: flex; flex-direction: column; justify-content: center;
           animation: sceneOut .35s ease-in var(--out, 999s) forwards; }}
  @keyframes sceneOut {{ to {{ opacity: 0; transform: translateY(-60px); }} }}

  /* entrances; .gone also leaves at its own --out */
  .pop   {{ animation: popIn .5s cubic-bezier(.2,.9,.3,1.25) var(--in) both; }}
  .rise  {{ animation: riseIn .45s cubic-bezier(.2,.8,.2,1) var(--in) both; }}
  .slide {{ animation: slideIn .4s cubic-bezier(.2,.8,.2,1) var(--in) both; }}
  .fade  {{ animation: fadeIn .4s ease-out var(--in) both; }}
  .gone  {{ animation: fadeIn .35s ease-out var(--in) both, fadeOut .3s ease-in var(--out) forwards; }}
  @keyframes popIn   {{ from {{ opacity: 0; transform: scale(.6) translateY(40px); }} to {{ opacity: 1; transform: none; }} }}
  @keyframes riseIn  {{ from {{ opacity: 0; transform: translateY(70px); }} to {{ opacity: 1; transform: none; }} }}
  @keyframes slideIn {{ from {{ opacity: 0; transform: translateX(160px); }} to {{ opacity: 1; transform: none; }} }}
  @keyframes fadeIn  {{ from {{ opacity: 0; }} to {{ opacity: 1; }} }}
  @keyframes fadeOut {{ to {{ opacity: 0; }} }}

  .huge {{ font-size: 132px; font-weight: 800; line-height: 1.02; letter-spacing: -4px; }}
  .big  {{ font-size: 104px; font-weight: 800; line-height: 1.04; letter-spacing: -3px; }}
  .mid  {{ font-size: 64px;  font-weight: 700; line-height: 1.12; letter-spacing: -1.5px; }}
  .small{{ font-size: 42px;  font-weight: 500; line-height: 1.3; color: var(--muted); }}
  .label{{ font-size: 34px;  font-weight: 700; letter-spacing: 4px; text-transform: uppercase; }}
  .accent {{ color: var(--accent); }}
  .center {{ text-align: center; align-items: center; }}

  /* counts up from 0 to --to, starting at --in: <span class="count" style="--in:3s; --to:40"></span> */
  @property --n {{ syntax: '<integer>'; inherits: false; initial-value: 0; }}
  .count {{ counter-reset: n var(--n); animation: countUp 1.2s cubic-bezier(.2,.8,.2,1) var(--in) both; }}
  .count::before {{ content: counter(n); }}
  @keyframes countUp {{ from {{ --n: 0; }} to {{ --n: var(--to); }} }}

  /* background media: one photo or clip per scene, behind the text (see promo.html) */
  .bg {{ position: absolute; inset: 0; overflow: hidden; isolation: isolate; background: #000;
        animation: fadeIn .45s ease-out var(--in) both, fadeOut .45s ease-in var(--out, 999s) forwards; }}
  .bg.now {{ animation: fadeOut .45s ease-in var(--out, 999s) forwards; }}
  .bg:empty {{ display: none; }}
  .bg-media {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0;
              filter: var(--grade, saturate(.9) contrast(1.05) brightness(.9));
              animation: var(--kb, kbIn) var(--dur, 8s) linear var(--in) both; }}
  .bg.blur .bg-media {{ filter: var(--grade, saturate(.9) contrast(1.05) brightness(.9)) blur(var(--blur, 10px)); }}
  @keyframes kbIn    {{ from {{ transform: scale(1.02); }} to {{ transform: scale(1.14); }} }}
  @keyframes kbOut   {{ from {{ transform: scale(1.14); }} to {{ transform: scale(1.02); }} }}
  @keyframes kbLeft  {{ from {{ transform: scale(1.14) translateX(3%); }} to {{ transform: scale(1.14) translateX(-3%); }} }}
  @keyframes kbRight {{ from {{ transform: scale(1.14) translateX(-3%); }} to {{ transform: scale(1.14) translateX(3%); }} }}
  .bg.tint::before {{ content: ''; position: absolute; inset: 0; z-index: 1; background: var(--accent); mix-blend-mode: soft-light; opacity: .5; }}
  .bg::after {{ content: ''; position: absolute; inset: 0; z-index: 2;
               background: linear-gradient(to bottom, rgba(10,10,14,.72), rgba(10,10,14,.12) 30%, rgba(10,10,14,.22) 62%, rgba(10,10,14,.88)),
                           rgba(10,10,14,var(--shade, .35)); }}
  body:has(.bg-media) {{ --muted: #d2d1d8; }}
  body:has(.bg-media) .scene, body:has(.bg-media) .stage {{ text-shadow: 0 2px 6px rgba(0,0,0,.35), 0 4px 30px rgba(0,0,0,.55); }}
{css}
</style>
</head>
<body {body_attrs}>
  <div class="glow g1"></div>
  <div class="glow g2"></div>
{bg_slots}
{body}
</body>
</html>
"""

AVATAR_SVG = ('<svg viewBox="0 0 100 100"><circle cx="50" cy="38" r="18" fill="#ffffff55"/>'
              '<path d="M18 92c4-20 18-30 32-30s28 10 32 30z" fill="#ffffff55"/></svg>')

TEMPLATES = {}

# ---------------------------------------------------------------- how-to
TEMPLATES["how-to.html"] = dict(
    bgs=[(0, 2.5), (2.5, 16), (16, 20)],
    g1="#5a2a1a", g2="#1d2a52",
    doc="""  Template: tutorial / how-to, or a product demo told as steps (see
  references/video-types.md). 20 seconds: a hook, three steps on a phone
  screen with a tap on each, and a CTA.

  Replace the hook, each step's title, and each phone screen. The screens
  are placeholder UI drawn in CSS; for a real product, swap a screen's
  contents for a screenshot (portrait, ideally 1170x2532 or similar):
    <img class="shot" src="assets/step-1.png" alt="">
  and move its .tap ring onto the thing the viewer should tap. To add or
  drop a step, copy or remove a .step-title / .screen pair and shift the
  later --in / --out / --tap times.""",
    body_attrs='data-duration="20" data-drop="2.5" data-music="tech" data-bpm="120" data-key="D" data-mode="major" data-energy="3" data-motif="1 5 3 5 | 6 5 3 2"',
    css="""
  .stage { position: absolute; left: 90px; right: 150px; top: 330px; bottom: 470px; }
  .titles { position: relative; height: 200px; }
  .step-title { position: absolute; left: 0; top: 0; right: 0; }
  .step-title .label { color: var(--accent); margin-bottom: 14px; }
  .phone { position: absolute; left: 195px; top: 230px; width: 450px; height: 890px;
           border-radius: 64px; background: #050507; border: 3px solid #34343f; padding: 18px;
           box-shadow: 0 40px 120px #0008;
           animation: riseIn .5s cubic-bezier(.2,.8,.2,1) var(--in) both, sceneOut .35s ease-in var(--out) forwards; }
  .notch { position: absolute; left: 50%; top: 30px; width: 120px; height: 30px; margin-left: -60px; border-radius: 15px; background: #000; z-index: 3; }
  .screen { position: absolute; inset: 18px; border-radius: 48px; overflow: hidden; background: #f4f3ef; color: #17171c; }
  .shot { width: 100%; height: 100%; object-fit: cover; display: block; }
  .ui-bar { height: 150px; padding: 78px 34px 0; font-size: 34px; font-weight: 800; }
  .ui-row { margin: 0 28px 18px; height: 86px; border-radius: 20px; background: #fff; display: flex; align-items: center; padding: 0 24px; gap: 18px; font-size: 26px; font-weight: 600; color: #3a3a44; }
  .ui-row i { width: 44px; height: 44px; border-radius: 12px; background: #e6e3dc; display: block; flex: none; }
  .ui-row b { flex: 1; height: 16px; border-radius: 8px; background: #e6e3dc; display: block; }
  .ui-chip { display: inline-block; padding: 16px 24px; border-radius: 20px; background: #fff; border: 3px solid #e6e3dc; font-size: 26px; font-weight: 700; color: #3a3a44; margin-right: 10px; }
  .ui-chip.on { border-color: var(--accent); color: var(--accent); }
  .ui-btn { position: absolute; left: 28px; right: 28px; bottom: 48px; height: 96px; border-radius: 26px; background: var(--accent); color: #fff; display: grid; place-items: center; font-size: 32px; font-weight: 800; }
  .ui-fab { position: absolute; right: 34px; bottom: 54px; width: 116px; height: 116px; border-radius: 50%; background: var(--accent); color: #fff; display: grid; place-items: center; font-size: 64px; font-weight: 500; }
  .tap { position: absolute; width: 150px; height: 150px; margin: -75px 0 0 -75px; border-radius: 50%; border: 8px solid var(--accent);
         animation: tapRing .7s ease-out var(--tap) both; opacity: 0; }
  @keyframes tapRing { 0% { opacity: 0; transform: scale(.3); } 25% { opacity: 1; } 100% { opacity: 0; transform: scale(1.4); } }
""",
    body="""
  <!-- 0–2.5s: hook -->
  <div class="scene" style="--out:2.3s">
    <div class="big pop" style="--in:.05s" data-sfx="pop">How to set up</div>
    <div class="big pop" style="--in:.4s" data-sfx="pop">recurring invoices</div>
    <div class="big pop accent" style="--in:.8s" data-sfx="pop">in 3 steps.</div>
  </div>

  <!-- 2.5–16s: three steps, 4.5s each -->
  <div class="stage">
    <div class="titles">
      <div class="step-title gone" style="--in:2.55s; --out:6.9s" data-sfx="whoosh:out">
        <div class="label">Step 1 of 3</div><div class="mid">Open Invoices, tap +</div></div>
      <div class="step-title gone" style="--in:7.1s; --out:11.4s" data-sfx="whoosh:out">
        <div class="label">Step 2 of 3</div><div class="mid">Pick "Monthly"</div></div>
      <div class="step-title gone" style="--in:11.6s; --out:15.8s">
        <div class="label">Step 3 of 3</div><div class="mid">Hit Save</div></div>
    </div>
    <div class="phone" style="--in:2.6s; --out:15.8s" data-sfx="whoosh:out">
      <div class="notch"></div>
      <div class="screen gone" style="--in:2.6s; --out:6.9s">
        <div class="ui-bar">Invoices</div>
        <div class="ui-row"><i></i><b></b></div>
        <div class="ui-row"><i></i><b></b></div>
        <div class="ui-row"><i></i><b></b></div>
        <div class="ui-fab">+</div>
        <div class="tap" style="--tap:5.0s; left:316px; top:736px" data-sfx="click:tap"></div>
      </div>
      <div class="screen gone" style="--in:7.1s; --out:11.4s">
        <div class="ui-bar">New invoice</div>
        <div class="ui-row">Client<b></b></div>
        <div class="ui-row">Amount<b></b></div>
        <div style="padding: 20px 28px 0; font-size: 26px; font-weight: 700; color: #3a3a44;">Repeat</div>
        <div style="padding: 16px 28px;"><span class="ui-chip">Weekly</span><span class="ui-chip on">Monthly</span><span class="ui-chip">Yearly</span></div>
        <div class="tap" style="--tap:9.4s; left:270px; top:461px" data-sfx="click:tap"></div>
      </div>
      <div class="screen gone" style="--in:11.6s; --out:15.8s">
        <div class="ui-bar">Review</div>
        <div class="ui-row">Repeats monthly, on the 1st</div>
        <div class="ui-row">Reminder 3 days after due</div>
        <div class="ui-btn">Save</div>
        <div class="tap" style="--tap:13.9s; left:204px; top:752px" data-sfx="click:tap"></div>
      </div>
    </div>
  </div>

  <!-- 16–20s: payoff + CTA -->
  <div class="scene">
    <div class="huge pop accent" style="--in:16.1s" data-sfx="chime">Done.</div>
    <div class="mid rise" style="--in:16.6s; margin-top: 24px">Your invoices now send themselves.</div>
    <div class="small fade" style="--in:17.4s; margin-top: 40px">Save this for later. Follow for more.</div>
  </div>
""")

# ---------------------------------------------------------------- testimonial
TEMPLATES["testimonial.html"] = dict(
    bgs=[(0, 3.2), (3.2, 8), (8, 13.5), (13.5, 17.5), (17.5, 20)],
    g1="#4a2a3a", g2="#1a3a3a",
    doc="""  Template: customer testimonial or case study, also a pull-quote from an
  interview (see references/video-types.md). 20 seconds: the result in the
  customer's words, who they are, before and after, the numbers, and a CTA.

  Every bracketed placeholder must be replaced with the customer's real
  words, name, role, and numbers, used with their permission. Never invent
  or polish a quote, and never fill in a number you can't source. Replace
  the avatar with their photo:
    <img class="avatar" src="assets/customer.jpg" alt="">
  Stars are optional; keep them only if they reflect a real rating.""",
    body_attrs='data-duration="20" data-drop="3" data-music="calm" data-bpm="96" data-key="F" data-mode="major" data-energy="2" data-motif="5 3 2 1 | 2 - 1 -"',
    css="""
  .quote-mark { font-size: 220px; font-weight: 800; line-height: .6; color: var(--accent); height: 110px; }
  .quote { font-size: 92px; font-weight: 800; line-height: 1.08; letter-spacing: -2.5px; }
  .avatar { width: 240px; height: 240px; border-radius: 50%; object-fit: cover; display: grid; place-items: center;
            background: linear-gradient(135deg, #6b3b4b, #2b4b5b); border: 6px solid #ffffff22; overflow: hidden; }
  .avatar svg { width: 100%; height: 100%; }
  .stars { display: flex; gap: 14px; margin-top: 36px; }
  .stars span { font-size: 64px; color: var(--warn); }
  .ba { border-radius: 30px; padding: 38px 40px; background: var(--card); border: 2px solid var(--line); }
  .ba .label { margin-bottom: 14px; }
  .ba .mid { font-size: 54px; }
  .arrow { font-size: 70px; color: var(--muted); text-align: center; height: 110px; line-height: 110px; }
  .stat { display: flex; align-items: baseline; gap: 10px; }
  .stat .num { font-size: 210px; font-weight: 800; letter-spacing: -8px; line-height: 1; color: var(--accent); }
  .stat .unit { font-size: 90px; font-weight: 800; color: var(--accent); }
""",
    body=f"""
  <!-- 0–3.2s: the result, in their words -->
  <div class="scene" style="--out:3.0s">
    <div class="quote-mark fade" style="--in:.05s">“</div>
    <div class="quote pop" style="--in:.15s" data-sfx="pop">[The result,</div>
    <div class="quote pop" style="--in:.6s" data-sfx="pop">in their own</div>
    <div class="quote pop accent" style="--in:1.05s" data-sfx="pop">words.]”</div>
  </div>

  <!-- 3.2–8s: who they are -->
  <div class="scene" style="--out:7.8s" data-sfx="whoosh:out">
    <div class="avatar pop" style="--in:3.3s">{AVATAR_SVG}</div>
    <div class="big rise" style="--in:3.7s; margin-top: 44px">[Customer name]</div>
    <div class="small fade" style="--in:4.0s">[Role], [Company]</div>
    <div class="stars">
      <span class="pop" style="--in:4.6s" data-sfx="tick">★</span>
      <span class="pop" style="--in:4.75s" data-sfx="tick">★</span>
      <span class="pop" style="--in:4.9s" data-sfx="tick">★</span>
      <span class="pop" style="--in:5.05s" data-sfx="tick">★</span>
      <span class="pop" style="--in:5.2s" data-sfx="tick">★</span>
    </div>
  </div>

  <!-- 8–13.5s: before and after -->
  <div class="scene" style="--out:13.3s" data-sfx="whoosh:out">
    <div class="ba slide" style="--in:8.2s" data-sfx="swish">
      <div class="label" style="color: var(--bad)">Before</div>
      <div class="mid">[What it was like before]</div>
    </div>
    <div class="arrow fade" style="--in:9.6s">↓</div>
    <div class="ba slide" style="--in:10.0s; border-color: #2c5a44" data-sfx="swish">
      <div class="label" style="color: var(--ok)">After</div>
      <div class="mid">[What changed]</div>
    </div>
  </div>

  <!-- 13.5–17.5s: the numbers -->
  <div class="scene" style="--out:17.3s" data-sfx="whoosh:out">
    <div class="rise" style="--in:13.6s">
      <div class="stat"><span class="num count" style="--in:13.7s; --to:6; --land:14.9s" data-sfx="pop:land"></span><span class="unit">hrs</span></div>
      <div class="small">[saved every week]</div>
    </div>
    <div class="rise" style="--in:14.6s; margin-top: 50px">
      <div class="stat"><span class="num count" style="--in:14.7s; --to:40; --land:15.9s" data-sfx="pop:land"></span><span class="unit">%</span></div>
      <div class="small">[fewer late payments]</div>
    </div>
  </div>

  <!-- 17.5–20s: CTA -->
  <div class="scene">
    <div class="big rise" style="--in:17.55s">Read the full story</div>
    <div class="mid rise accent" style="--in:17.9s; margin-top: 20px">Link in bio</div>
  </div>
""")

# ---------------------------------------------------------------- faq
TEMPLATES["faq.html"] = dict(
    bgs=[(0, 2.5), (2.5, 8.5), (8.5, 14.5), (14.5, 18)],
    g1="#2a3a5a", g2="#5a2a1a",
    doc="""  Template: FAQ, myth vs fact, or an educational answer (see
  references/video-types.md). 18 seconds: a viewer's question as a comment
  bubble, the short answer with three supporting points, a myth struck
  through and the fact, and a CTA.

  Use real questions customers actually ask, and answers that are true
  for the product today. Replace @username only with a real commenter's
  handle if you're replying to them (with the platform's reply feature,
  ideally); otherwise drop the handle line.""",
    body_attrs='data-duration="18" data-drop="2.5" data-music="pop" data-bpm="116" data-key="G" data-mode="major" data-energy="3" data-motif="1 3 5 3 | 6 5 3 -"',
    css="""
  .bubble { background: #f4f3ef; color: #17171c; border-radius: 36px 36px 36px 8px; padding: 34px 40px 40px; box-shadow: 0 30px 90px #0007; }
  .handle { display: flex; align-items: center; gap: 16px; font-size: 30px; font-weight: 700; color: #6a6a74; margin-bottom: 16px; }
  .handle i { width: 46px; height: 46px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), #6b3b4b); display: block; }
  .bubble .q { font-size: 64px; font-weight: 800; line-height: 1.12; letter-spacing: -1.5px; }
  .point { display: flex; gap: 24px; align-items: center; font-size: 48px; font-weight: 600; margin-top: 26px; }
  .point i { width: 22px; height: 22px; border-radius: 50%; background: var(--accent); flex: none; display: block; }
  /* strikes through every wrapped line of the myth at --cut */
  .myth-text { background: linear-gradient(var(--bad), var(--bad)) no-repeat 0 58% / 0% 10px;
               -webkit-box-decoration-break: clone; box-decoration-break: clone;
               animation: strike .45s cubic-bezier(.6,0,.2,1) var(--cut) both, dimDown .4s ease-out var(--cut) forwards; }
  @keyframes strike { to { background-size: 100% 10px; } }
  @keyframes dimDown { to { color: var(--muted); } }
""",
    body="""
  <!-- 0–2.5s: the question -->
  <div class="scene" style="--out:2.35s">
    <div class="bubble pop" style="--in:.1s" data-sfx="pop">
      <div class="handle"><i></i>Reply to @username</div>
      <div class="q">Do I need a card to start the free trial?</div>
    </div>
  </div>

  <!-- 2.5–8.5s: the answer -->
  <div class="scene" style="--out:8.3s" data-sfx="whoosh:out">
    <div class="small rise" style="--in:2.6s">Short answer:</div>
    <div class="huge pop accent" style="--in:2.9s" data-sfx="pop">No.</div>
    <div class="point slide" style="--in:4.2s" data-sfx="swish"><i></i>Sign up with just an email</div>
    <div class="point slide" style="--in:5.0s" data-sfx="swish"><i></i>Every feature, for 14 days</div>
    <div class="point slide" style="--in:5.8s" data-sfx="swish"><i></i>Add a card only if you stay</div>
  </div>

  <!-- 8.5–14.5s: myth vs fact -->
  <div class="scene" style="--out:14.3s" data-sfx="whoosh:out">
    <div class="label rise" style="--in:8.6s; color: var(--bad)">Myth</div>
    <div class="rise" style="--in:8.8s; margin-top: 14px">
      <span class="mid myth-text" style="--cut:10.3s" data-sfx="click:cut">You get charged when the trial ends.</span>
    </div>
    <div class="label rise" style="--in:11.2s; color: var(--ok); margin-top: 60px">Fact</div>
    <div class="mid rise" style="--in:11.4s; margin-top: 14px" data-sfx="pop">Nothing is charged unless you pick a plan.</div>
  </div>

  <!-- 14.5–18s: CTA -->
  <div class="scene">
    <div class="big rise" style="--in:14.55s">Got a question?</div>
    <div class="mid rise accent" style="--in:14.9s; margin-top: 20px">Drop it in the comments.</div>
    <div class="small fade" style="--in:15.6s; margin-top: 30px">We answer every one.</div>
  </div>
""")

# ---------------------------------------------------------------- announcement
TEMPLATES["announcement.html"] = dict(
    bgs=[(0, 3.5), (3.5, 7.5), (7.5, 12), (12, 15.5), (15.5, 18)],
    g1="#5a2a1a", g2="#3a1d52",
    doc="""  Template: announcement or launch, and promos for an event, webinar, or
  live stream (see references/video-types.md). 18 seconds: a tease that
  builds into the drop, the reveal, what's in it, the date, and a CTA.

  Replace the name, tagline, the three items, and the date block. For an
  event or webinar, the three items become what attendees get (speakers,
  topics) and the CTA becomes "Register" or "Set a reminder". Drop the
  date scene for something that's already live.""",
    body_attrs='data-duration="18" data-drop="3.5" data-music="house" data-bpm="124" data-key="E" data-mode="minor" data-energy="4" data-motif="1 . 3 5 | 4 3 1 -"',
    css="""
  .dot { width: 34px; height: 34px; border-radius: 50%; background: var(--accent); margin-top: 50px;
         animation: fadeIn .3s ease-out var(--in) both, pulse 1s ease-in-out var(--in) infinite; }
  @keyframes pulse { 50% { transform: scale(1.5); opacity: .5; } }
  .reveal { position: relative; }
  .burst { position: absolute; left: 50%; top: 50%; width: 700px; height: 700px; margin: -350px 0 0 -350px; border-radius: 50%;
           border: 10px solid var(--accent); animation: burst .9s ease-out var(--in) both; opacity: 0; }
  @keyframes burst { 0% { opacity: 0; transform: scale(.2); } 8% { opacity: .9; } 100% { opacity: 0; transform: scale(1.3); } }
  .name { font-size: 170px; font-weight: 800; letter-spacing: -6px; line-height: 1; }
  .feature { display: flex; align-items: center; gap: 30px; background: var(--card); border: 2px solid var(--line);
             border-radius: 26px; padding: 30px 34px; margin-top: 22px; font-size: 50px; font-weight: 700; }
  .feature i { width: 64px; height: 64px; border-radius: 18px; background: var(--accent); flex: none; display: block; opacity: .9; }
  .cal { width: 380px; border-radius: 40px; overflow: hidden; background: #f4f3ef; color: #17171c; box-shadow: 0 30px 90px #0008; text-align: center; }
  .cal .mon { background: var(--accent); color: #fff; font-size: 54px; font-weight: 800; letter-spacing: 6px; padding: 18px 0; }
  .cal .day { font-size: 200px; font-weight: 800; letter-spacing: -8px; line-height: 1.15; padding-bottom: 20px; }
""",
    body="""
  <!-- 0–3.5s: tease, building into the drop -->
  <div class="scene center" style="--out:3.3s">
    <div class="big pop" style="--in:.2s" data-sfx="pop">Something new</div>
    <div class="big pop" style="--in:.75s; color: var(--muted)" data-sfx="pop">is coming.</div>
    <div class="dot" style="--in:1.4s"></div>
  </div>

  <!-- 3.5–7.5s: the reveal -->
  <div class="scene center" style="--out:7.3s" data-sfx="whoosh:out">
    <div class="small fade" style="--in:3.55s">Introducing</div>
    <div class="reveal">
      <div class="burst" style="--in:3.7s"></div>
      <div class="name pop accent" style="--in:3.7s" data-sfx="pop">Autopilot</div>
    </div>
    <div class="mid rise" style="--in:4.4s; margin-top: 30px">Invoices that send themselves.</div>
  </div>

  <!-- 7.5–12s: what's in it -->
  <div class="scene" style="--out:11.8s" data-sfx="whoosh:out">
    <div class="label rise accent" style="--in:7.6s">What's new</div>
    <div class="feature slide" style="--in:7.9s" data-sfx="swish"><i></i>Recurring invoices</div>
    <div class="feature slide" style="--in:8.5s" data-sfx="swish"><i></i>Automatic reminders</div>
    <div class="feature slide" style="--in:9.1s" data-sfx="swish"><i></i>One-tap payouts</div>
  </div>

  <!-- 12–15.5s: the date -->
  <div class="scene center" style="--out:15.3s" data-sfx="whoosh:out">
    <div class="cal pop" style="--in:12.1s" data-sfx="pop"><div class="mon">OCT</div><div class="day">14</div></div>
    <div class="mid rise" style="--in:12.6s; margin-top: 50px">Launch day</div>
    <div class="small fade" style="--in:12.9s">Tuesday, 10am PT</div>
  </div>

  <!-- 15.5–18s: CTA -->
  <div class="scene center">
    <div class="big rise" style="--in:15.55s" data-sfx="chime">Get early access</div>
    <div class="mid rise accent" style="--in:15.9s; margin-top: 20px">Link in bio</div>
  </div>
""")

# ---------------------------------------------------------------- team
person = lambda n, t0, t1, last: f"""
  <!-- {t0}–{t1}s: person {n} -->
  <div class="scene" style="--out:{t1 - 0.2:.1f}s"{'' if last else ' data-sfx="whoosh:out"'}>
    <div class="avatar pop" style="--in:{t0 + 0.05:.2f}s" data-sfx="pop">{AVATAR_SVG}</div>
    <div class="big rise" style="--in:{t0 + 0.4:.2f}s; margin-top: 44px">[Name]</div>
    <div class="small fade" style="--in:{t0 + 0.7:.2f}s">[Role]</div>
    <div class="mid rise" style="--in:{t0 + 1.2:.2f}s; margin-top: 40px">“[One human detail, in their words]”</div>
  </div>"""

TEMPLATES["team.html"] = dict(
    bgs=[(0, 2.6), (2.6, 5.6), (5.6, 8.6), (8.6, 11.6), (11.6, 15), (15, 18)],
    g1="#3a2a4a", g2="#1a3a2a",
    doc="""  Template: meet the team, or the people side of a company profile (see
  references/video-types.md). 18 seconds: a hook, three people one at a
  time, the group, and a CTA.

  Replace each bracketed placeholder with the person's real name, role,
  and a line they actually said or approved, and each avatar with their
  photo (with their permission):
    <img class="avatar" src="assets/name.jpg" alt="">
  To feature more people, copy a person scene and shift the later times.""",
    body_attrs='data-duration="18" data-drop="2.6" data-music="acoustic" data-bpm="92" data-key="A" data-mode="major" data-energy="2" data-motif="1 2 3 5 | 3 2 1 -"',
    css="""
  .avatar { width: 300px; height: 300px; border-radius: 50%; object-fit: cover; display: grid; place-items: center; overflow: hidden;
            background: linear-gradient(135deg, #6b4b7b, #2b5b4b); border: 6px solid #ffffff22; }
  .avatar svg { width: 100%; height: 100%; }
  .row { display: flex; gap: 26px; margin-top: 50px; }
  .row .avatar { width: 200px; height: 200px; }
  .more { width: 200px; height: 200px; border-radius: 50%; display: grid; place-items: center; background: var(--card);
          border: 2px dashed #ffffff33; font-size: 54px; font-weight: 800; color: var(--muted); }
""",
    body=f"""
  <!-- 0–2.6s: hook -->
  <div class="scene" style="--out:2.4s">
    <div class="huge pop" style="--in:.1s" data-sfx="pop">The people</div>
    <div class="huge pop accent" style="--in:.55s" data-sfx="pop">behind [Brand]</div>
  </div>
{person(1, 2.6, 5.6, False)}
{person(2, 5.6, 8.6, False)}
{person(3, 8.6, 11.6, False)}

  <!-- 11.6–15s: the group -->
  <div class="scene" style="--out:14.8s" data-sfx="whoosh:out">
    <div class="big rise" style="--in:11.7s">One team.</div>
    <div class="row">
      <div class="avatar pop" style="--in:12.1s" data-sfx="tick">{AVATAR_SVG}</div>
      <div class="avatar pop" style="--in:12.3s" data-sfx="tick">{AVATAR_SVG}</div>
      <div class="avatar pop" style="--in:12.5s" data-sfx="tick">{AVATAR_SVG}</div>
    </div>
    <div class="mid rise" style="--in:13.0s; margin-top: 44px">[N] people, [City].</div>
  </div>

  <!-- 15–18s: CTA -->
  <div class="scene">
    <div class="big rise" style="--in:15.05s" data-sfx="chime">We're hiring.</div>
    <div class="mid rise accent" style="--in:15.4s; margin-top: 20px">Open roles: link in bio</div>
  </div>
""")


# ---------------------------------------------------------------- promo
TEMPLATES["promo.html"] = dict(
    bgs=[(0, 3), (3, 12.5), (12.5, 17.5), (17.5, 20.7), (20.7, 24)],
    g1="#6b2f1c", g2="#1d2a52",
    doc='  Template: promo, ad, brand profile, explainer, or educational list (see\n  references/video-types.md). This one is the 24-second marketing-skill\n  promo. Copy it as the starting point for a new video and rewrite the\n  scenes.\n\n  How every template page works (render.js reads all of this):\n  - The canvas is 1080x1920 (9:16). Keep text inside the .scene box: TikTok,\n    Reels, and Shorts cover the bottom ~25% and the right edge with their UI.\n  - Animate with CSS animations only. render.js pauses and seeks every\n    animation frame by frame, so time each one with animation-delay. Here the\n    delays come from per-element custom properties like style="--in:3.4s".\n  - Backgrounds: every scene has an empty <div class="bg"> slot already timed\n    to it. Put one photo or clip inside and it fills the frame with a slow\n    zoom, a scrim that keeps text readable, and one shared color grade:\n      <img class="bg-media" src="assets/office-1.jpg" alt="">\n      <video class="bg-media" src="assets/city-1.mp4" data-offset="2"></video>\n    data-offset starts a clip that many seconds in; clips loop unless\n    data-loop="false". On the slot, --kb picks the motion (kbIn, kbOut,\n    kbLeft, kbRight, or none), --shade the darkness (default .35), class\n    "blur" softens a busy image, and class "tint" washes it in the accent\n    color. An empty slot shows the gradient glow instead. scripts/video/\n    media.js finds stock photos and clips and writes their credits.\n  - Music comes from <body data-*>: data-music is the genre (pop, house,\n    hiphop, acoustic, cinematic, tech, lofi, calm) or none; data-bpm,\n    data-key (C, F#, ...), data-mode (major or minor), data-energy (1-5),\n    and data-motif, the project\'s signature hook in scale degrees, e.g.\n    "1 3 5 6 | 5 3 2 -" (references/sound-guide.md). data-drop is when the\n    beat comes in; data-break="8.5-13.5" thins it out under quieter scenes.\n    data-music-src="assets/track.mp3" (with data-music-start, in seconds)\n    uses a licensed track instead. data-duration sets the length.\n  - data-sfx="sound:var" plays a sound effect at the time in that element\'s\n    --var (default --in). Several can be listed: data-sfx="swish:in tick:tick".\n    Sounds: pop (a note that climbs the chord when words land in quick\n    succession), swish, tick (climbs a scale across a run of ticks), whoosh,\n    click, chime.\n  - Images (screenshots, photos, logos) go in an assets/ folder next to the\n    page and load with a relative src. People, products, and results must be\n    real ones the user supplied; stock and AI images are only for settings\n    and mood.',
    body_attrs='data-duration="24" data-drop="3" data-music="tech" data-bpm="120" data-key="C" data-mode="major" data-energy="3" data-motif="1 5 3 5 | 6 5 3 2"',
    css='  /* scene 2/3: the to-do list */\n  .listhead { position: relative; height: 180px; margin-bottom: 28px; }\n  .listhead > div { position: absolute; left: 0; bottom: 0; }\n  .chips { display: flex; flex-direction: column; gap: 18px; }\n  .chip { display: flex; align-items: center; gap: 26px; align-self: flex-start;\n          background: var(--card); border: 2px solid var(--line); border-radius: 22px;\n          padding: 20px 34px 20px 24px; font-size: 46px; font-weight: 600;\n          animation: slideIn .4s cubic-bezier(.2,.8,.2,1) var(--in) both,\n                     dim .3s ease-out var(--tick) forwards; }\n  .chip:nth-child(even) { margin-left: 34px; }\n  @keyframes dim { to { color: var(--muted); border-color: #3a2a24; } }\n  .box { width: 52px; height: 52px; border-radius: 12px; border: 4px solid #5a5966; flex: none;\n         display: grid; place-items: center;\n         animation: tick .25s ease-out var(--tick) forwards; }\n  @keyframes tick { to { background: var(--accent); border-color: var(--accent); } }\n  .box svg { width: 34px; height: 34px; animation: checkIn .3s cubic-bezier(.2,.9,.3,1.4) var(--tick) both; }\n  @keyframes checkIn { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: none; } }\n  .tag { display: inline-block; font-size: 40px; font-weight: 600; color: var(--muted); margin-top: 10px; }\n\n  /* scene 4: approval card */\n  .card { background: var(--card); border: 2px solid var(--line); border-radius: 32px; padding: 40px; margin-top: 56px; position: relative; }\n  .cardtop { display: flex; justify-content: space-between; align-items: center; font-size: 36px; color: var(--muted); font-weight: 600; }\n  .pill { position: relative; height: 62px; width: 330px; }\n  .pill span { position: absolute; right: 0; top: 0; height: 62px; padding: 0 26px; border-radius: 31px;\n               display: flex; align-items: center; font-size: 32px; font-weight: 700; white-space: nowrap; }\n  .p1 { background: #3a2f17; color: var(--warn); animation: fadeOut .2s linear var(--flip) forwards; }\n  .p2 { background: #163626; color: var(--ok); animation: popIn .4s cubic-bezier(.2,.9,.3,1.3) var(--flip) both; }\n  .posttext { font-size: 44px; font-weight: 600; line-height: 1.3; margin: 34px 0 26px; }\n  .bar { height: 26px; border-radius: 13px; background: #2a2a33; margin-bottom: 18px; }\n  .btn { margin-top: 26px; height: 108px; border-radius: 24px; background: var(--accent); color: #fff;\n         display: grid; place-items: center; font-size: 46px; font-weight: 800;\n         animation: press .3s ease-in-out var(--press) both, done .3s ease-out var(--flip) forwards; }\n  @keyframes press { 0% { transform: none; } 40% { transform: scale(.94); } 100% { transform: none; } }\n  @keyframes done { to { background: #2a2a33; color: var(--muted); } }\n  .cursor { position: absolute; width: 90px; height: 90px; left: 520px; top: 440px;\n            animation: fadeIn .2s ease-out var(--cin) both, cursorMove .6s cubic-bezier(.3,.7,.2,1) var(--cin) both; }\n  @keyframes cursorMove { from { transform: translate(260px, 380px); } to { transform: none; } }\n\n  /* scene 6: terminal */\n  .term { margin-top: 56px; background: #08080b; border: 2px solid var(--line); border-radius: 28px; overflow: hidden; }\n  .termbar { height: 58px; background: #16161c; display: flex; align-items: center; gap: 14px; padding-left: 26px; }\n  .termbar i { width: 20px; height: 20px; border-radius: 50%; background: #3a3a44; display: block; }\n  .termbody { padding: 30px 34px 34px; font-family: "JetBrains Mono", "DejaVu Sans Mono", monospace; font-size: 36px; line-height: 1.5; color: #d9d8d2; }\n  .termbody .dollar { color: var(--accent); }\n  .caret { display: inline-block; width: 20px; height: 40px; background: #d9d8d2; vertical-align: -6px; animation: blink 1s steps(1) 0s infinite; }\n  @keyframes blink { 50% { opacity: 0; } }\n',
    body='  <!-- Scene 1 (0–3s): hook, readable sound-off -->\n  <div class="scene" style="--out:2.75s">\n    <div class="huge pop" style="--in:.05s" data-sfx="pop">Stop writing</div>\n    <div class="huge pop" style="--in:.4s" data-sfx="pop">marketing</div>\n    <div class="huge pop" style="--in:.75s" data-sfx="pop">posts</div>\n    <div class="huge pop accent" style="--in:1.1s" data-sfx="pop">by hand.</div>\n  </div>\n\n  <!-- Scenes 2+3 (3–12.5s): the week\'s list, then it gets done -->\n  <div class="scene" style="--out:12.25s" data-sfx="whoosh:out">\n    <div class="listhead">\n      <div class="big gone" style="--in:3.05s; --out:7.0s" data-sfx="whoosh:out">Your week:</div>\n      <div style="bottom:0">\n        <div class="mid rise" style="--in:7.3s">One plugin. <span class="accent">12 skills.</span></div>\n        <div class="tag fade" style="--in:7.7s">marketing-skill for Claude Code</div>\n      </div>\n    </div>\n    <div class="chips">\n      <div class="chip" style="--in:3.4s;  --tick:8.3s" data-sfx="swish:in tick:tick"><div class="box"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>Competitor research</div>\n      <div class="chip" style="--in:3.75s; --tick:8.65s" data-sfx="swish:in tick:tick"><div class="box"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>LinkedIn post</div>\n      <div class="chip" style="--in:4.1s;  --tick:9.0s" data-sfx="swish:in tick:tick"><div class="box"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>X thread</div>\n      <div class="chip" style="--in:4.45s; --tick:9.35s" data-sfx="swish:in tick:tick"><div class="box"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>SEO brief</div>\n      <div class="chip" style="--in:4.8s;  --tick:9.7s" data-sfx="swish:in tick:tick"><div class="box"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>Ad copy variants</div>\n      <div class="chip" style="--in:5.15s; --tick:10.05s" data-sfx="swish:in tick:tick"><div class="box"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>Cold emails</div>\n      <div class="chip" style="--in:5.5s;  --tick:10.4s" data-sfx="swish:in tick:tick"><div class="box"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>TikTok script</div>\n      <div class="chip" style="--in:5.85s; --tick:10.75s" data-sfx="swish:in tick:tick"><div class="box"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>Reddit post</div>\n    </div>\n  </div>\n\n  <!-- Scene 4 (12.5–17.5s): nothing ships without approval -->\n  <div class="scene" style="--out:17.35s" data-sfx="whoosh:out">\n    <div class="big rise" style="--in:12.55s">Nothing posts</div>\n    <div class="big rise accent" style="--in:12.85s">until you say so.</div>\n    <div class="card rise" style="--in:13.3s">\n      <div class="cardtop">\n        <div>LinkedIn · Tue 9:00</div>\n        <div class="pill" style="--flip:15.1s" data-sfx="chime:flip"><span class="p1">Ready for approval</span><span class="p2">Approved ✓</span></div>\n      </div>\n      <div class="posttext">We cut onboarding from 14 days to 3. Here\'s what we stopped doing:</div>\n      <div class="bar" style="width:92%"></div>\n      <div class="bar" style="width:78%"></div>\n      <div class="btn" style="--press:14.85s; --flip:15.1s" data-sfx="click:press">Approve</div>\n      <svg class="cursor" style="--cin:14.1s" viewBox="0 0 24 24"><path d="M4 2.5l15 9.2-6.6 1.4 3.9 7.3-2.7 1.4-3.9-7.3L4.6 19z" fill="#fff" stroke="#0f0f13" stroke-width="1.3" stroke-linejoin="round"/></svg>\n    </div>\n  </div>\n\n  <!-- Scene 5 (17.5–20.7s): free, open, editable -->\n  <div class="scene" style="--out:20.55s" data-sfx="whoosh:out">\n    <div class="huge pop" style="--in:17.6s" data-sfx="pop">Free.</div>\n    <div class="huge pop" style="--in:17.95s" data-sfx="pop">Open source.</div>\n    <div class="huge pop accent" style="--in:18.3s" data-sfx="pop">Yours to edit.</div>\n    <div class="small fade" style="--in:18.9s; margin-top:40px">Every skill is a plain SKILL.md file.</div>\n  </div>\n\n  <!-- Scene 6 (20.7–24s): CTA -->\n  <div class="scene">\n    <div class="big rise" style="--in:20.75s">Get it on GitHub</div>\n    <div class="mid rise accent" style="--in:21.05s; margin-top:18px">marcosmodly/<br>marketing-skill</div>\n    <div class="term rise" style="--in:21.5s">\n      <div class="termbar"><i></i><i></i><i></i></div>\n      <div class="termbody"><span class="dollar">$</span> claude plugin install<br>&nbsp;&nbsp;marketing-skill@marketing-skill<span class="caret"></span></div>\n    </div>\n  </div>\n')


def bg_slots(windows):
    """One empty background slot per scene window, fading in a little before the scene and out as it ends."""
    lines = []
    for i, (a, b) in enumerate(windows):
        last = i == len(windows) - 1
        start = 0 if i == 0 else round(a - 0.25, 2)
        end = None if last else round(b - 0.2, 2)
        dur = round((b + 0.45 if not last else b) - start, 2)
        cls = "bg now" if i == 0 else "bg"
        style = f"--in:{start}s; " + (f"--out:{end}s; " if end is not None else "") + f"--dur:{dur}s"
        lines.append(f'  <!-- background, {a}–{b}s -->\n  <div class="{cls}" style="{style}"></div>')
    return "\n".join(lines)


for name, t in TEMPLATES.items():
    t = dict(t)
    t["doc"] = t["doc"] + ("" if name == "promo.html" else POINTER)
    t["bg_slots"] = bg_slots(t.pop("bgs"))
    with open(os.path.join(OUT, name), "w") as f:
        f.write(HEAD.format(**t))
    print("wrote", name)
