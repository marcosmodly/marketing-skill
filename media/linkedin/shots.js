// ================= The LinkedIn cut's own shots (media/linkedin/build.py splices this in) =================
// Each shot is a three.js scene drawn as a pure function of its local time, like the template's
// own, with a bloom pass over it. The words on screen are DOM in the page (body.html), timed with
// CSS; these draw the pictures under them.

const expo = (x) => { x = clamp(x); return x >= 1 ? 1 : 1 - 2 ** (-10 * x); };
const expoIn = (x) => { x = clamp(x); return x <= 0 ? 0 : 2 ** (10 * x - 10); };
const spring = (x, f = 9, d = 5) => (x <= 0 ? 0 : 1 - Math.exp(-d * x) * Math.cos(f * x)); // overshoots, then settles
const SHIFT = Math.round(H * 0.09); // subjects sit this far below the middle, under the headline
const CREAM = new THREE.Color('#f4efe6');
const OK = new THREE.Color('#3fbf7f');
const UIF = '"Inter", "Liberation Sans", sans-serif';
const MONO = '"JetBrains Mono", "DejaVu Sans Mono", monospace';

// ---- the look: a near-black room with a low accent glow, dust in the air, a grid floor, and bloom
function fxStage({ fov = 30, glow = 0.24, glowY = 0.64, fog = [9, 30] } = {}) {
  const scene = new THREE.Scene();
  const [c, g] = canvas2d(540, 675);
  const base = '#07070a';
  g.fillStyle = base; g.fillRect(0, 0, 540, 675);
  const grad = g.createRadialGradient(270, 675 * glowY, 4, 270, 675 * glowY, 560);
  grad.addColorStop(0, hex(PAL.bg.clone().lerp(PAL.accent, glow)));
  grad.addColorStop(0.4, hex(PAL.bg.clone().lerp(PAL.accent, glow * 0.3)));
  grad.addColorStop(1, base);
  g.fillStyle = grad; g.fillRect(0, 0, 540, 675);
  const px = g.getImageData(0, 0, 540, 675); // dither, so the dark gradient doesn't band
  const r = rng(99);
  for (let i = 0; i < px.data.length; i += 4) { const n = (r() - 0.5) * 3; px.data[i] += n; px.data[i + 1] += n; px.data[i + 2] += n; }
  g.putImageData(px, 0, 0);
  scene.background = texture(c);
  scene.environment = env;
  scene.environmentIntensity = 0.85;
  if (fog) scene.fog = new THREE.Fog('#08080b', fog[0], fog[1]);
  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(3, 6, 6);
  const rim = new THREE.DirectionalLight(PAL.accent, 3.2);
  rim.position.set(-5, 3, -5);
  const fill = new THREE.DirectionalLight(new THREE.Color('#7f8cff'), 0.55);
  fill.position.set(5, -1, 3);
  scene.add(key, rim, fill);
  const camera = new THREE.PerspectiveCamera(fov, W / H, 0.1, 200);
  camera.setViewOffset(W, H, 0, -SHIFT, W, H);
  return { scene, camera };
}

function bloomer(scene, camera, { strength = 0.55, radius = 0.55, threshold = 0.78 } = {}) {
  const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
  const comp = new EffectComposer(renderer, rt);
  comp.setPixelRatio(1);
  comp.setSize(W, H);
  comp.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), strength, radius, threshold);
  comp.addPass(bloom);
  comp.addPass(new OutputPass());
  return { render: () => comp.render(), bloom };
}

let dotTex;
function dust(scene, { n = 220, spread = [16, 9, 16], center = [0, 0.5, 0], size = 0.05, seed = 5, color = '#ffd9c7' } = {}) {
  if (!dotTex) {
    const [c, g] = canvas2d(64, 64);
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.35, 'rgba(255,255,255,.5)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    dotTex = new THREE.CanvasTexture(c);
  }
  const r = rng(seed);
  const base = Array.from({ length: n }, () => [(r() - 0.5) * spread[0], (r() - 0.5) * spread[1], (r() - 0.5) * spread[2], r() * 6.28, 0.3 + r() * 0.7]);
  const pos = new Float32Array(n * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ map: dotTex, size, color: new THREE.Color(color), transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  scene.add(pts);
  return (t) => {
    base.forEach(([x, y, z, ph, sp], i) => {
      pos[i * 3] = center[0] + x + 0.25 * Math.sin(t * 0.3 * sp + ph);
      pos[i * 3 + 1] = center[1] + y + ((t * 0.12 * sp + ph) % 1) * 0.6;
      pos[i * 3 + 2] = center[2] + z + 0.25 * Math.cos(t * 0.25 * sp + ph);
    });
    geo.attributes.position.needsUpdate = true;
  };
}

let gridTex;
function gridFloor(scene, y = -2.2, { intensity = 0.22, size = 80, color = '#060608' } = {}) {
  if (!gridTex) {
    const [c, g] = canvas2d(512, 512);
    g.fillStyle = '#000'; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = '#fff'; g.lineWidth = 3;
    g.strokeRect(0, 0, 512, 512);
    g.globalAlpha = 0.35; g.lineWidth = 2;
    g.beginPath(); g.moveTo(256, 0); g.lineTo(256, 512); g.moveTo(0, 256); g.lineTo(512, 256); g.stroke();
    gridTex = new THREE.CanvasTexture(c);
    gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping;
    gridTex.anisotropy = 8;
  }
  const tex = gridTex.clone();
  tex.repeat.set(size / 2, size / 2);
  tex.needsUpdate = true;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1, emissive: PAL.accent, emissiveIntensity: intensity, emissiveMap: tex, envMapIntensity: 0.2 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  scene.add(m);
  return m;
}

// A mirror floor, dimmed by a glossy dark sheet just above it: soft reflections, not a mirror.
function glossFloor(scene, y = 0, { dim = 0.8, grid = 0.16 } = {}) {
  const mirror = new Reflector(new THREE.PlaneGeometry(60, 60), { textureWidth: Math.round(W / 2), textureHeight: Math.round(H / 2), color: 0x9a9aa2 });
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.y = y;
  scene.add(mirror);
  const sheet = gridFloor(scene, y + 0.002, { intensity: grid, size: 60 });
  sheet.material.transparent = true;
  sheet.material.opacity = dim;
  return mirror;
}

// ---- 2D drawing on canvas textures
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
function text(g, s, x, y, { size = 40, weight = 600, color = '#fff', align = 'left', font = UIF, max = 0 } = {}) {
  let sz = size;
  g.font = `${weight} ${sz}px ${font}`;
  while (max && g.measureText(s).width > max && sz > 12) { sz -= 2; g.font = `${weight} ${sz}px ${font}`; }
  g.fillStyle = color; g.textAlign = align; g.textBaseline = 'alphabetic';
  g.fillText(s, x, y);
  return g.measureText(s).width;
}
function wrapLines(g, s, maxW) {
  const out = [];
  let line = '';
  for (const word of s.split(' ')) {
    const tryLine = line ? `${line} ${word}` : word;
    if (g.measureText(tryLine).width > maxW && line) { out.push(line); line = word; } else line = tryLine;
  }
  if (line) out.push(line);
  return out;
}
function pill(g, s, x, y, { size = 28, bg = hex(PAL.accent), fg = '#fff', pad = 22, h = 0, font = UIF, weight = 700, ls = 0 } = {}) {
  g.font = `${weight} ${size}px ${font}`;
  g.letterSpacing = `${ls}px`;
  const w = g.measureText(s).width + pad * 2;
  const hh = h || size * 1.75;
  g.fillStyle = bg; rr(g, x, y, w, hh, hh / 2); g.fill();
  g.fillStyle = fg; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText(s, x + pad, y + hh / 2 + 1);
  g.letterSpacing = '0px';
  return w;
}
function icon(g, d, cx, cy, s, color, lw = 3.2) {
  g.save();
  g.translate(cx - 24 * s, cy - 24 * s);
  g.scale(s, s);
  g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = color;
  g.stroke(new Path2D(d));
  g.restore();
}
const typed = (s, k) => s.slice(0, Math.round(s.length * clamp(k)));
// a canvas texture redrawn only when its drawing changes (key)
function liveCanvas(w, h, draw) {
  const [c, g] = canvas2d(w, h);
  const tex = texture(c);
  let last = null;
  return { tex, update(state) { const key = JSON.stringify(state); if (key === last) return; last = key; g.clearRect(0, 0, w, h); draw(g, state); tex.needsUpdate = true; } };
}

const ACC = () => hex(PAL.accent);
const ACC_SOFT = () => hex(PAL.accent.clone().lerp(new THREE.Color('#ffffff'), 0.25));

// ---- the plugin's 14 skills, as app tiles: a line icon and a label
const SKILL_TILES = [
  ['Research', 'M21 11 A10 10 0 1 1 20.99 11 Z M28.5 28.5 L37 37'],
  ['Calendar', 'M11 14 H37 V37 H11 Z M11 21 H37 M18 10 V17 M30 10 V17'],
  ['Repurpose', 'M13 22 A11 11 0 0 1 33.5 18 M34 10 V18 H26 M35 26 A11 11 0 0 1 14.5 30 M14 38 V30 H22'],
  ['SEO', 'M10 34 L19 25 L25 31 L37 19 M29 19 H37 V27'],
  ['Ad copy', 'M10 20 H16 L32 12 V36 L16 28 H10 Z M16 28 L19 37 M36 20 Q39 24 36 28'],
  ['Email', 'M9 14 H39 V34 H9 Z M9 14 L24 26 L39 14'],
  ['Outreach', 'M8 23 L40 10 L32 38 L23 28 Z M23 28 L40 10'],
  ['Video', 'M9 13 H39 V35 H9 Z M21 18 L30 24 L21 30 Z'],
  ['Clips', 'M24 9 L39 17 L24 25 L9 17 Z M9 24 L24 32 L39 24 M9 31 L24 39 L39 31'],
  ['Montage', 'M9 12 H39 V36 H9 Z M9 32 L18 23 L25 30 L30 25 L39 34 M30 18.5 A2.5 2.5 0 1 1 29.99 18.5 Z'],
  ['Community', 'M13 13 H35 Q38 13 38 16 V28 Q38 31 35 31 H22 L15 37 V31 H13 Q10 31 10 28 V16 Q10 13 13 13 Z'],
  ['Briefs', 'M30 9 L39 18 L18 39 H9 V30 Z M26 13 L35 22'],
  ['Publish', 'M24 7 C31 12 33.5 20 31.5 30 H16.5 C14.5 20 17 12 24 7 Z M16.5 30 L11 37 H18 M31.5 30 L37 37 H30 M24 17 A3 3 0 1 1 23.99 17 Z'],
  ['Pipeline', 'M27 7 L13 27 H24 L21 41 L35 21 H24 Z'],
];
function tileMesh(label, d, { size = 0.92, labels = true } = {}) {
  const [c, g] = canvas2d(512, 512);
  const bg = g.createLinearGradient(0, 0, 0, 512);
  bg.addColorStop(0, '#22222a'); bg.addColorStop(1, '#101014');
  g.fillStyle = bg; rr(g, 0, 0, 512, 512, 92); g.fill();
  g.strokeStyle = 'rgba(217,119,87,.45)'; g.lineWidth = 6; rr(g, 6, 6, 500, 500, 88); g.stroke();
  icon(g, d, 256, labels ? 214 : 256, labels ? 5.4 : 6.6, ACC_SOFT(), 3.3);
  if (labels) text(g, label, 256, 432, { size: 70, weight: 800, color: '#f4efe6', align: 'center', max: 440 });
  const tex = texture(c);
  const group = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(size, size, size * 0.17, 4, size * 0.17), plastic(new THREE.Color('#1a1a20'), 0.3));
  const face = new THREE.Mesh(roundedPlane(size * 0.995, size * 0.995, size * 0.17), new THREE.MeshBasicMaterial({ map: tex }));
  face.position.z = size * 0.086;
  // roundedPlane's UVs follow its shape's coordinates: map them onto the square texture
  const uv = face.geometry.attributes.uv, p = face.geometry.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / size + 0.5, p.getY(i) / size + 0.5);
  group.add(body, face);
  return group;
}

// ---- 3D type: Inter Display Black, extruded and bevelled (assets/inter-black.typeface.json)
let typeface;
async function loadTypeface() {
  if (!typeface) typeface = new FontLoader().parse(await (await fetch('assets/inter-black.typeface.json')).json());
  return typeface;
}
function letter3d(ch, { size = 1, depth = 0.34, color = PAL.accent } = {}) {
  const geo = new TextGeometry(ch, { font: typeface, size, depth, curveSegments: 10, bevelEnabled: true, bevelThickness: 0.045, bevelSize: 0.03, bevelSegments: 4 });
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  geo.translate(-(bb.min.x + bb.max.x) / 2, 0, -depth / 2);
  const mesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06, metalness: 0.0 }));
  return { mesh, width: bb.max.x - bb.min.x };
}

// ================= 1. the core: the plugin, dormant, then bursting into its 14 skills =================
SHOTS.core = async (el, shot) => {
  const BURST = parseFloat(el.dataset.burst || '4');
  await document.fonts.load(`800 70px ${UIF}`);
  await document.fonts.load(`700 300px ${MONO}`);
  const { scene, camera } = fxStage({ glow: 0.2, glowY: 0.66 });
  const fx = bloomer(scene, camera, { strength: 0.6, radius: 0.6, threshold: 0.8 });
  gridFloor(scene, -2.6, { intensity: 0.2 });
  const air = dust(scene, { n: 260, size: 0.045 });

  const coreMat = new THREE.MeshPhysicalMaterial({ color: PAL.accent, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06, emissive: PAL.accent, emissiveIntensity: 0 });
  const core = new THREE.Group();
  const cube = new THREE.Mesh(new RoundedBoxGeometry(1.3, 1.3, 1.3, 8, 0.32), coreMat);
  const prompt = (caret) => {
    const [c, g] = canvas2d(512, 512);
    g.font = `700 250px ${MONO}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = 'rgba(255,240,230,.9)'; g.shadowBlur = 24;
    g.fillStyle = '#fff6ee'; g.fillText(caret ? '>_' : '> ', 256, 262);
    return texture(c);
  };
  const promptOn = prompt(true), promptOff = prompt(false);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshBasicMaterial({ map: promptOn, transparent: true, color: new THREE.Color(1.6, 1.5, 1.45), toneMapped: false, depthWrite: false }));
  face.position.z = 0.652;
  core.add(cube, face);
  const glowLight = new THREE.PointLight(PAL.accent, 0, 9, 1.6);
  core.add(glowLight);
  scene.add(core);
  const shadow = contactShadow(2.4, -2.59, 0.5);
  scene.add(shadow);

  // the shockwave on the burst
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.2, 0.8), transparent: true, opacity: 0, toneMapped: false, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.96, 1.0, 96), ringMat);
  scene.add(ring);

  // two rings of seven tiles, counter-rotating around the core
  const tiles = SKILL_TILES.map(([label, d], i) => {
    const g = tileMesh(label, d, { size: 0.86 });
    g.visible = false;
    scene.add(g);
    const k = i % 2, j = Math.floor(i / 2);
    return { g, k, j, phase: (j / 7) * Math.PI * 2 + (k ? Math.PI / 7 : 0), delay: i * 0.022, spin: (rng(i + 40)() - 0.5) * 7 };
  });
  const R = 1.72;
  const ringPos = (t, lt) => {
    const dir = t.k ? -1 : 1;
    const a = t.phase + dir * 0.32 * Math.max(0, lt - BURST) + dir * 0.6;
    const p = V(Math.cos(a) * R, 0, Math.sin(a) * R);
    p.applyAxisAngle(V(1, 0, 0), t.k ? 0.3 : -0.24);
    p.applyAxisAngle(V(0, 0, 1), t.k ? -0.12 : 0.14);
    p.y += t.k ? -0.78 : 0.8;
    return p;
  };
  const tmp = V();
  return {
    scene, camera, tone: 'dark', events: { burst: BURST },
    render: fx.render,
    update(lt) {
      air(shot.in + lt);
      const u = lt - BURST;
      // dormant, then charging: glowing, shaking, drawing in; then the pop
      const charge = expoIn(clamp((lt - (BURST - 1.0)) / 1.0));
      const shake = charge * 0.05;
      const pop = u > 0 ? spring(u * 1.4, 10, 4) : 0;
      const sc = u > 0 ? lerp(0.86, 1, pop) + 0.18 * Math.exp(-u * 6) : 1 - 0.14 * charge;
      core.scale.setScalar(sc);
      core.position.set(shake * Math.sin(lt * 91), 0.06 * Math.sin(lt * 1.3) + shake * Math.cos(lt * 77), 0);
      core.rotation.set(-0.18 + 0.08 * Math.sin(lt * 0.7), -0.42 + 0.22 * Math.sin(lt * 0.45) + (u > 0 ? 0.9 * expo(u / 1.2) : 0), 0.04 * Math.sin(lt * 0.9));
      coreMat.emissiveIntensity = 0.04 + 1.1 * charge * (u > 0 ? Math.exp(-u * 3) : 1) + (u > 0 ? 0.12 : 0);
      glowLight.intensity = 3 + 40 * charge * (u > 0 ? Math.exp(-u * 2.5) : 1) + (u > 0 ? 6 : 0);
      face.material.map = Math.floor((shot.in + lt) / 0.5) % 2 === 0 || charge > 0.2 ? promptOn : promptOff;
      // the shockwave
      ring.position.copy(core.position);
      ring.quaternion.copy(camera.quaternion);
      ring.scale.setScalar(u > 0 ? 1 + 9 * expo(u / 0.9) : 1);
      ringMat.opacity = u > 0 ? Math.max(0, 1 - u / 0.7) : 0;
      // the tiles: out of the core on the burst, into their orbits
      for (const t of tiles) {
        const v = u - t.delay;
        t.g.visible = v > 0;
        if (v <= 0) continue;
        const k = expo(v / 1.05);
        const target = ringPos(t, lt);
        tmp.copy(core.position).lerp(target, k);
        t.g.position.copy(tmp);
        t.g.position.y += 0.6 * Math.sin(Math.PI * k) * (t.k ? -1 : 1);
        t.g.quaternion.copy(camera.quaternion);
        t.g.rotateZ(t.spin * (1 - k));
        t.g.scale.setScalar(lerp(0.15, 1, k) * (1 + 0.04 * Math.sin(lt * 2 + t.phase)));
      }
      shadow.material.opacity = 0.35 + 0.25 * charge;
      // the camera: drifting in, pushing in hard on the charge, then thrown back to show the orbit
      const back = u > 0 ? expo(u / 1.15) : 0;
      const ang = -0.3 + 0.05 * lt + (u > 0 ? 0.11 * u : 0);
      const dist = lerp(lerp(8.6, 7.4, inOut(lt / BURST)) - 1.1 * charge, 13.6, back);
      const y = lerp(0.9, 2.9, back);
      const jolt = u > 0 ? 0.18 * Math.exp(-u * 7) * Math.sin(u * 70) : 0;
      camera.position.set(Math.sin(ang) * dist + jolt, y + shake * 2 * Math.sin(lt * 63), Math.cos(ang) * dist);
      camera.lookAt(0, lerp(0.05, -0.05, back), 0);
      fx.bloom.strength = 0.5 + 0.6 * charge * (u > 0 ? Math.exp(-u * 3) : 1);
      fx.bloom.threshold = u > 0 ? 0.9 : 0.8;
    },
  };
};

// ================= 2. research: a competitor brief writing itself, every claim sourced =================
SHOTS.brief = async (el, shot) => {
  await document.fonts.load(`900 100px ${UIF}`);
  await document.fonts.load(`500 30px ${MONO}`);
  const { scene, camera } = fxStage({ glow: 0.18, glowY: 0.6 });
  const fx = bloomer(scene, camera, { strength: 0.35, threshold: 1.0 });
  gridFloor(scene, -2.4, { intensity: 0.14 });
  const air = dust(scene, { n: 160, size: 0.04, seed: 11 });
  const [PW, PH] = [2.5, 3.24];
  const page = liveCanvas(1000, 1296, (g, s) => {
    g.fillStyle = '#f6f3ee'; rr(g, 0, 0, 1000, 1296, 34); g.fill();
    const ink = '#1b1b21', mute = '#8a8892';
    if (s.a > 0) {
      g.globalAlpha = clamp(s.a);
      pill(g, 'COMPETITOR BRIEF', 64, 60, { size: 24, ls: 3, font: MONO, weight: 500 });
      text(g, 'Today', 936, 92, { size: 28, weight: 600, color: mute, align: 'right' });
      g.globalAlpha = 1;
    }
    text(g, typed('Acme', s.b), 64, 230, { size: 112, weight: 900, color: ink });
    if (s.b > 0.5) text(g, typed('Battlecard · the last 90 days', (s.b - 0.5) * 2), 66, 290, { size: 34, weight: 600, color: mute });
    // bottom line
    if (s.c > 0) {
      text(g, 'Bottom line', 64, 390, { size: 40, weight: 800, color: ink });
      g.font = `500 32px ${UIF}`;
      const lines = ['Leads on integrations, slow on support.', 'Win on onboarding speed and price clarity.'];
      lines.forEach((l, i) => text(g, typed(l, s.c * 2 - i), 64, 446 + i * 46, { size: 32, weight: 500, color: '#3a3a42' }));
    }
    // SWOT
    if (s.d > 0) {
      text(g, 'SWOT', 64, 600, { size: 40, weight: 800, color: ink });
      const cells = [['S', 'Brand reach', '#2f9e68'], ['W', 'Slow onboarding', '#d2534c'], ['O', 'Mid-market gap', '#c98a1c'], ['T', 'Price pressure', '#5d6cf0']];
      cells.forEach(([L, label, col], i) => {
        const k = clamp(s.d * 4 - i);
        if (k <= 0) return;
        const x = 64 + (i % 2) * 444, y = 630 + Math.floor(i / 2) * 170;
        g.save();
        g.globalAlpha = k;
        g.translate(x + 210, y + 75); g.scale(0.9 + 0.1 * back(k), 0.9 + 0.1 * back(k)); g.translate(-x - 210, -y - 75);
        g.fillStyle = '#ffffff'; rr(g, x, y, 420, 150, 22); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.07)'; g.lineWidth = 2; g.stroke();
        text(g, L, x + 30, y + 98, { size: 76, weight: 900, color: col });
        text(g, label, x + 110, y + 88, { size: 31, weight: 700, color: ink, max: 290 });
        g.restore();
      });
    }
    // sources, each ticked
    if (s.e > 0) {
      text(g, 'Sources', 64, 1030, { size: 40, weight: 800, color: ink });
      ['acme.example/pricing', 'acme.example/changelog', 'acme.example/careers'].forEach((src, i) => {
        const k = clamp(s.e * 3 - i);
        if (k <= 0) return;
        const y = 1078 + i * 58;
        g.globalAlpha = k;
        text(g, `[${i + 1}]`, 64, y + 28, { size: 30, weight: 500, color: ACC(), font: MONO });
        text(g, src, 128, y + 28, { size: 30, weight: 500, color: '#3a3a42', font: MONO });
        g.fillStyle = '#2f9e68'; g.beginPath(); g.arc(912, y + 18, 20, 0, Math.PI * 2); g.fill();
        icon(g, 'M12 25 L21 34 L37 15', 912, y + 18, 0.62, '#fff', 6);
        g.globalAlpha = 1;
      });
    }
  });
  const doc = new THREE.Group();
  const slab = new THREE.Mesh(new RoundedBoxGeometry(PW, PH, 0.07, 4, 0.08), plastic(new THREE.Color('#b9b3a9'), 0.5));
  const pageMesh = new THREE.Mesh(new THREE.PlaneGeometry(PW * 0.97, PH * 0.97), new THREE.MeshBasicMaterial({ map: page.tex }));
  pageMesh.position.z = 0.036;
  doc.add(slab, pageMesh);
  doc.position.set(0, 0.1, 0);
  scene.add(doc);
  scene.add(Object.assign(contactShadow(3.6, -2.39, 0.45), {}));
  // a magnifying glass reading it
  const lens = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.055, 24, 80), metal(new THREE.Color('#2a2a30'), 0.22));
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.4, 64), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, transparent: true, opacity: 0.07, clearcoat: 1, envMapIntensity: 0.8, depthWrite: false }));
  const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.62, 8, 24), plastic(PAL.accent, 0.3));
  handle.position.set(0.52, -0.52, 0);
  handle.rotation.z = Math.PI / 4;
  lens.add(rim, glass, handle);
  scene.add(lens);
  // the sources, flying out of the page as pills with a check
  const chips = [1, 2, 3].map((n) => {
    const [c, g] = canvas2d(256, 112);
    g.fillStyle = hex(PAL.accent); rr(g, 0, 0, 256, 112, 56); g.fill();
    text(g, `[${n}]`, 34, 74, { size: 46, weight: 500, color: '#fff', font: MONO });
    g.fillStyle = '#fff'; g.beginPath(); g.arc(196, 56, 30, 0, Math.PI * 2); g.fill();
    icon(g, 'M12 25 L21 34 L37 15', 196, 56, 0.95, hex(PAL.accent), 6);
    const m = new THREE.Mesh(new RoundedBoxGeometry(0.64, 0.28, 0.08, 4, 0.13), plastic(PAL.accent, 0.3));
    const f = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.28), new THREE.MeshBasicMaterial({ map: texture(c), transparent: true }));
    f.position.z = 0.041;
    m.add(f);
    scene.add(m);
    return m;
  });
  const D = shot.dur;
  return {
    scene, camera, tone: 'dark', render: fx.render,
    events: { chip1: 2.45, chip2: 2.7, chip3: 2.95 },
    update(lt) {
      air(shot.in + lt);
      page.update({
        a: +(lt / 0.2).toFixed(1), b: +clamp((lt - 0.15) / 0.55).toFixed(2), c: +clamp((lt - 0.6) / 0.6).toFixed(2),
        d: +clamp((lt - 1.15) / 0.7).toFixed(2), e: +clamp((lt - 2.2) / 0.75).toFixed(2),
      });
      // the page swings in, then floats
      const k = expo(lt / 0.9);
      doc.rotation.set(-0.12 + 0.02 * Math.sin(lt), lerp(-1.1, -0.32, k) + 0.04 * Math.sin(lt * 0.6), lerp(0.12, 0.02, k));
      doc.position.set(lerp(-1.4, -0.1, k), -0.3 + 0.05 * Math.sin(lt * 1.1), lerp(-1.2, 0, k));
      doc.updateMatrixWorld();
      // the lens sweeps over the lines being written
      const path = [[-0.55, 0.9], [0.45, 0.62], [-0.3, 0.12], [0.5, -0.25], [-0.2, -0.95]];
      const pk = clamp((lt - 0.4) / 2.9) * (path.length - 1);
      const i0 = Math.min(path.length - 2, Math.floor(pk)), f = inOut(pk - i0);
      const lp = V(lerp(path[i0][0], path[i0 + 1][0], f), lerp(path[i0][1], path[i0 + 1][1], f), 0.42).applyMatrix4(doc.matrixWorld);
      lens.position.copy(lp);
      lens.quaternion.copy(doc.quaternion);
      lens.rotateY(0.25);
      lens.scale.setScalar(0.8 * expo((lt - 0.3) / 0.6));
      // the source chips pop out toward the viewer, one per beat
      chips.forEach((m, i) => {
        const v = lt - (2.45 + i * 0.25);
        m.visible = v > 0;
        const kk = expo(v / 0.6);
        const from = V(-0.7, -1.05 - i * 0.12, 0.05).applyMatrix4(doc.matrixWorld);
        const to = V(1.75, -0.55 - i * 0.42, 0.9);
        m.position.copy(from.lerp(to, kk));
        m.position.y += 0.04 * Math.sin(lt * 2 + i);
        m.rotation.set(0.05 * Math.sin(lt + i), -0.35 + 0.35 * (1 - kk), 0.05 * Math.sin(lt * 1.3 + i));
        m.scale.setScalar(Math.max(0.001, back(v / 0.45)));
      });
      // the camera: whipped in from the left, then a slow push
      const ck = expo(lt / 0.8);
      const ang = lerp(-0.75, 0.12, ck) + 0.05 * (lt / D);
      const dist = lerp(10.6, 8.9, ck) - 0.4 * inOut(lt / D);
      camera.position.set(Math.sin(ang) * dist + 0.2, lerp(1.6, 0.75, ck), Math.cos(ang) * dist);
      camera.lookAt(0.15, -0.1, 0);
    },
  };
};

// ================= 3. writing: a carousel of the things it writes, turning on the beat =================
SHOTS.write = async (el, shot) => {
  await document.fonts.load(`800 46px ${UIF}`);
  await document.fonts.load(`500 28px ${MONO}`);
  const { scene, camera } = fxStage({ glow: 0.22, glowY: 0.62 });
  const fx = bloomer(scene, camera, { strength: 0.35, threshold: 1.0 });
  gridFloor(scene, -2.3, { intensity: 0.15 });
  const air = dust(scene, { n: 160, size: 0.04, seed: 17 });
  const [CW, CH] = [2.3, 2.9];
  const [TW, TH] = [920, 1160];
  const dark = { bg: '#17171c', ink: '#f4f1ea', mute: '#8f8e99', line: '#2a2a31', box: '#1f1f26' };
  const light = { bg: '#fbfaf7', ink: '#1b1b21', mute: '#8a8892', line: '#e6e2da', box: '#ffffff' };
  const header = (g, th, label, right) => {
    g.fillStyle = th.bg; rr(g, 0, 0, TW, TH, 40); g.fill();
    pill(g, label, 56, 56, { size: 26, font: MONO, weight: 500, ls: 2 });
    if (right) text(g, right, TW - 56, 92, { size: 28, weight: 600, color: th.mute, align: 'right' });
  };
  const cards = [
    // a post
    (g, s) => {
      const th = light;
      header(g, th, 'LINKEDIN POST', 'Draft');
      const av = g.createLinearGradient(56, 150, 152, 246);
      av.addColorStop(0, ACC_SOFT()); av.addColorStop(1, ACC());
      g.fillStyle = av; g.beginPath(); g.arc(104, 198, 48, 0, Math.PI * 2); g.fill();
      text(g, 'Y', 104, 216, { size: 50, weight: 800, color: '#fff', align: 'center' });
      text(g, 'You', 176, 190, { size: 40, weight: 800, color: th.ink });
      text(g, 'Founder · just now', 176, 232, { size: 28, weight: 500, color: th.mute });
      const body = ['We almost didn’t launch.', '', 'The 3-step checklist that got us', 'over the line:', '', '1. Write the post first', '2. Ship the small version', '3. End with one question'];
      const total = body.join('').length;
      let used = 0;
      body.forEach((l, i) => {
        const k = clamp((s.k * total - used) / Math.max(1, l.length));
        used += l.length;
        if (l) text(g, typed(l, k), 56, 340 + i * 62, { size: 42, weight: i === 0 ? 800 : 500, color: th.ink });
      });
      g.fillStyle = th.line; g.fillRect(56, 930, TW - 112, 2);
      const ic = ['M24 37 C10 28 8 16 16 13 C20 11.5 23 14 24 17 C25 14 28 11.5 32 13 C40 16 38 28 24 37 Z', 'M13 13 H35 Q38 13 38 16 V28 Q38 31 35 31 H22 L15 37 V31 H13 Q10 31 10 28 V16 Q10 13 13 13 Z', 'M10 20 L16 14 L22 20 M16 14 V30 H26 M38 28 L32 34 L26 28 M32 34 V18 H22', 'M8 23 L40 10 L32 38 L23 28 Z M23 28 L40 10'];
      ic.forEach((d, i) => icon(g, d, 120 + i * 226, 1030, 1.45, th.mute, 3));
    },
    // ad variants
    (g, s) => {
      const th = dark;
      header(g, th, 'AD COPY · A/B', 'Meta · Google · LinkedIn');
      [['A', 'Plan a month of posts in one sitting.', 'Your calendar, written and ready to approve.', '36/40'],
        ['B', 'Stop staring at an empty calendar.', 'Every post drafted. You just say yes.', '34/40']].forEach(([v, h1, h2, n], i) => {
        const k = clamp(s.k * 2.2 - i * 0.8);
        if (k <= 0) return;
        const y = 170 + i * 420;
        g.globalAlpha = clamp(k * 3);
        g.fillStyle = th.box; rr(g, 56, y, TW - 112, 380, 28); g.fill();
        g.strokeStyle = i === 0 ? ACC() : th.line; g.lineWidth = 3; g.stroke();
        g.fillStyle = i === 0 ? ACC() : '#34343d'; rr(g, 92, y + 40, 64, 64, 14); g.fill();
        text(g, v, 124, y + 86, { size: 40, weight: 800, color: '#fff', align: 'center' });
        text(g, `Variant ${v}`, 182, y + 84, { size: 30, weight: 600, color: th.mute });
        text(g, n, TW - 92, y + 84, { size: 26, weight: 500, color: th.mute, align: 'right', font: MONO });
        g.font = `800 46px ${UIF}`;
        wrapLines(g, typed(h1, k), TW - 200).forEach((l, j) => text(g, l, 92, y + 178 + j * 56, { size: 46, weight: 800, color: th.ink }));
        text(g, typed(h2, k * 1.4 - 0.4), 92, y + 320, { size: 30, weight: 500, color: th.mute, max: TW - 190 });
        g.globalAlpha = 1;
      });
      pill(g, 'Learn more', 56, 1030, { size: 30, bg: '#f4f1ea', fg: '#17171c', pad: 30 });
    },
    // an email sequence
    (g, s) => {
      const th = dark;
      header(g, th, 'EMAIL SEQUENCE', 'Welcome series');
      const rows = [['Day 0', 'Welcome aboard', 'Here’s what happens next, in one minute.'], ['Day 2', 'Your first quick win', 'One small setup that pays off this week.'],
        ['Day 5', 'The setting most people miss', 'Two minutes now saves an hour later.'], ['Day 9', 'Ready for more?', 'Three ways teams like yours use it.']];
      g.fillStyle = th.line; g.fillRect(114, 200, 4, 220 * 3 + 20);
      rows.forEach(([day, subj, prev], i) => {
        const k = clamp(s.k * 4.4 - i);
        if (k <= 0) return;
        const y = 190 + i * 222;
        g.globalAlpha = clamp(k * 2.5);
        g.fillStyle = i === 0 ? ACC() : '#2b2b33'; g.beginPath(); g.arc(116, y + 30, 22, 0, Math.PI * 2); g.fill();
        icon(g, 'M9 14 H39 V34 H9 Z M9 14 L24 26 L39 14', 116, y + 30, 0.62, '#fff', 4.5);
        text(g, day.toUpperCase(), 172, y + 22, { size: 24, weight: 500, color: ACC_SOFT(), font: MONO });
        text(g, typed(subj, k * 1.6), 172, y + 76, { size: 42, weight: 800, color: th.ink, max: TW - 230 });
        text(g, prev, 172, y + 126, { size: 30, weight: 500, color: th.mute, max: TW - 230 });
        g.globalAlpha = 1;
      });
    },
    // a week of posts
    (g, s) => {
      const th = { ...light, bg: '#f4efe6' };
      header(g, th, 'CONTENT CALENDAR', 'This week');
      const rows = [['Mon', 'Launch post', 'LinkedIn', '#0a66c2'], ['Tue', 'Thread', 'X', '#17171c'], ['Wed', 'Newsletter', 'Email', ACC()],
        ['Thu', 'Show HN post', 'Hacker News', '#e8742c'], ['Fri', 'Short video', 'Reels · Shorts', '#7a5cff']];
      rows.forEach(([day, title, where, col], i) => {
        const k = clamp(s.k * 5.5 - i);
        if (k <= 0) return;
        const y = 170 + i * 160;
        g.save();
        g.globalAlpha = clamp(k * 2.5);
        g.translate((1 - expo(k)) * 80, 0);
        g.fillStyle = '#ffffff'; rr(g, 56, y, TW - 112, 136, 24); g.fill();
        text(g, day, 96, y + 84, { size: 34, weight: 800, color: th.mute });
        g.fillStyle = col; rr(g, 196, y + 34, 10, 68, 5); g.fill();
        text(g, title, 232, y + 66, { size: 40, weight: 800, color: th.ink });
        text(g, where, 232, y + 108, { size: 27, weight: 600, color: th.mute });
        g.restore();
      });
      if (s.k > 0.95) pill(g, '5 posts · waiting for your approval', 56, 1010, { size: 30, pad: 30 });
    },
  ];
  const live = cards.map((draw) => liveCanvas(TW, TH, draw));
  const STEP = 0.6; // the carousel's angle between cards
  const RAD = 4.2;
  const meshes = live.map((lc, i) => {
    const g = new THREE.Group();
    const slab = new THREE.Mesh(new RoundedBoxGeometry(CW, CH, 0.06, 4, 0.1), plastic(new THREE.Color(i === 0 || i === 3 ? '#a9a39a' : '#101014'), 0.5));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(CW * 0.985, CH * 0.985), new THREE.MeshBasicMaterial({ map: lc.tex }));
    face.position.z = 0.031;
    g.add(slab, face);
    scene.add(g);
    return g;
  });
  const flips = [1, 2, 3];
  const D = shot.dur;
  return {
    scene, camera, tone: 'dark', render: fx.render, events: { flip1: 1, flip2: 2, flip3: 3 },
    update(lt) {
      air(shot.in + lt);
      let turn = 0;
      for (const f of flips) turn += expo((lt - f) / 0.42);
      const intro = expo(lt / 0.7);
      meshes.forEach((m, i) => {
        const a = (i - turn) * STEP + (1 - intro) * 0.9;
        m.position.set(Math.sin(a) * RAD, 0.05 * Math.sin(lt * 1.2 + i), Math.cos(a) * RAD - RAD);
        m.rotation.set(-0.03, a, 0);
        const front = clamp(1 - Math.abs(i - turn));
        m.scale.setScalar(0.82 + 0.18 * front);
        // each card writes itself while it's in front
        const since = lt - (i === 0 ? 0.15 : flips[i - 1] + 0.1);
        live[i].update({ k: +clamp(since / 0.8).toFixed(2) });
      });
      const k = inOut(lt / D);
      camera.position.set(0.25 * Math.sin(lt * 0.5), lerp(0.75, 0.55, k), lerp(8.9, 8.5, k) + 0.8 * (1 - intro));
      camera.lookAt(0, -0.02, 0);
    },
  };
};

// ================= 4. videos: a dark phone in the break, then a helix of the templates' real frames =================
SHOTS.phones = async (el, shot) => {
  const DROP = parseFloat(el.dataset.drop || '2');
  const srcs = (el.dataset.items || '').split(',').map((s) => s.trim()).filter(Boolean);
  const imgs = await Promise.all(srcs.map(loadImage));
  const { scene, camera } = fxStage({ glow: 0.16, glowY: 0.55 });
  const fx = bloomer(scene, camera, { strength: 0.5, threshold: 1.0 });
  gridFloor(scene, -3.4, { intensity: 0.16 });
  const air = dust(scene, { n: 240, size: 0.045, seed: 23, spread: [18, 12, 18] });
  const [BW, BH, SW, SH] = [0.66, 1.24, 0.6, 1.067];
  const bodyGeo = new RoundedBoxGeometry(BW, BH, 0.075, 6, 0.1);
  const bodyMat = metal(new THREE.Color('#1c1c22'), 0.28);
  const screenGeo = roundedPlane(SW, SH, 0.07);
  { const uv = screenGeo.attributes.uv, p = screenGeo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / SW + 0.5, p.getY(i) / SH + 0.5); }
  const N = imgs.length;
  const HERO = Math.floor(N / 2);
  const phones = imgs.map((img, i) => {
    const t = new THREE.Texture(img); t.colorSpace = SRGB; t.anisotropy = 4; t.needsUpdate = true;
    const g = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    const scr = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: t, color: 0xffffff, toneMapped: false }));
    scr.position.z = 0.039;
    g.add(body, scr);
    scene.add(g);
    return { g, scr, i, r: rng(i + 70)() };
  });
  const heroGlow = new THREE.PointLight(PAL.accent, 0, 6, 1.5);
  scene.add(heroGlow);
  const RADIUS = 2.15, STEP_A = 0.66, STEP_Y = 0.34;
  const helixAt = (i, lt) => {
    const a = (i - HERO) * STEP_A + 0.38 * Math.max(0, lt - DROP);
    return { p: V(Math.sin(a) * RADIUS, (i - HERO) * STEP_Y, Math.cos(a) * RADIUS), a };
  };
  const tmp = V();
  // each phone turns most of the way toward the camera, so the screens (not the backs) show
  const facing = (p, a) => Math.atan2(camera.position.x - p.x, camera.position.z - p.z) + 0.3 * Math.sin(a);
  return {
    scene, camera, tone: 'dark', render: fx.render, events: { drop: DROP },
    update(lt) {
      air(shot.in + lt);
      const u = lt - DROP;
      const k = u > 0 ? expo(u / 1.2) : 0;
      // the camera: close on the dark phone, then pulled back and up along the helix
      const ang = 0.15 * Math.sin(lt * 0.4) + (u > 0 ? 0.12 * u : 0);
      const dist = lerp(6.6 - 0.6 * inOut(lt / DROP), 9.4, k);
      const y = lerp(0.25, 0.6, k) + (u > 0 ? 0.42 * u : 0);
      camera.position.set(Math.sin(ang) * dist, y, Math.cos(ang) * dist);
      camera.lookAt(0, lerp(0.1, 0.05 + 0.36 * Math.max(0, u), k), 0);
      camera.rotateZ(lerp(0, 0.06 * Math.sin(lt * 0.6), k));
      for (const ph of phones) {
        const { p, a } = helixAt(ph.i, lt);
        if (ph.i === HERO) {
          // alone in the dark during the break, its screen off; lights up on the drop
          const pre = V(0, 0.05 * Math.sin(lt * 1.4), 1.2);
          tmp.copy(pre).lerp(p, k);
          ph.g.position.copy(tmp);
          ph.g.rotation.set(0.04 * Math.sin(lt), lerp(-0.55 + 0.25 * inOut(lt / DROP), facing(ph.g.position, a), k), lerp(0.05, 0, k));
          ph.g.scale.setScalar(lerp(1.15, 1, k));
          const on = u > 0 ? Math.min(1, 0.25 + u * 6) : 0.02 + 0.05 * smooth(lt, DROP - 0.6, DROP);
          ph.scr.material.color.setScalar(on * (u > 0 ? 1 + 0.6 * Math.exp(-u * 4) : 1));
          continue;
        }
        const v = u - Math.abs(ph.i - HERO) * 0.035;
        ph.g.visible = v > 0;
        if (v <= 0) continue;
        const kk = expo(v / 1.1);
        const from = V(p.x * 2.6, p.y * 1.6 + (ph.r - 0.5) * 3, p.z * 2.6 + 4);
        ph.g.position.copy(from.lerp(p, kk));
        ph.g.rotation.set(0, facing(ph.g.position, a) + (1 - kk) * 2.2 * (ph.r - 0.5), 0);
        ph.g.scale.setScalar(kk);
        ph.scr.material.color.setScalar(1);
      }
      heroGlow.intensity = u > 0 ? 18 * Math.exp(-u * 2) : 3 * smooth(lt, 0, DROP);
      heroGlow.position.set(0, 0.2, 2.6);
      fx.bloom.strength = 0.45 + (u > 0 ? 0.7 * Math.exp(-u * 2.5) : 0);
    },
  };
};

// ================= 5. approval: nothing goes out until a person presses the button =================
SHOTS.approve = async (el, shot) => {
  const CLICK = parseFloat(el.dataset.click || '2');
  await document.fonts.load(`800 120px ${UIF}`);
  const { scene, camera } = fxStage({ glow: 0.2, glowY: 0.6, fog: [10, 32] });
  const fx = bloomer(scene, camera, { strength: 0.45, threshold: 1.05 });
  glossFloor(scene, -1.2, { dim: 0.78, grid: 0.12 });
  const air = dust(scene, { n: 140, size: 0.04, seed: 31 });
  // the queue it's waiting on
  const queue = liveCanvas(1000, 560, (g, s) => {
    g.fillStyle = '#16161b'; rr(g, 0, 0, 1000, 560, 36); g.fill();
    g.strokeStyle = '#2a2a31'; g.lineWidth = 3; g.stroke();
    pill(g, 'PUBLISH QUEUE', 48, 42, { size: 24, font: MONO, weight: 500, ls: 2 });
    text(g, s.ok ? 'Approved' : 'Waiting for you', 952, 82, { size: 30, weight: 700, color: s.ok ? '#5fd39a' : '#e8b04a', align: 'right' });
    [['LinkedIn post', 'Launch day'], ['X thread', '7 posts'], ['Newsletter', 'Issue #12']].forEach(([a, b], i) => {
      const y = 150 + i * 128;
      g.fillStyle = '#1f1f26'; rr(g, 48, y, 904, 104, 22); g.fill();
      text(g, a, 88, y + 64, { size: 38, weight: 800, color: '#f4f1ea' });
      text(g, b, 470, y + 64, { size: 30, weight: 500, color: '#8f8e99' });
      const on = s.ok && s.k > i * 0.2;
      g.fillStyle = on ? '#3fbf7f' : '#2b2b33'; g.beginPath(); g.arc(894, y + 52, 26, 0, Math.PI * 2); g.fill();
      if (on) icon(g, 'M12 25 L21 34 L37 15', 894, y + 52, 0.8, '#fff', 6);
      else { g.strokeStyle = '#55555f'; g.lineWidth = 4; g.beginPath(); g.arc(894, y + 52, 12, 0, Math.PI * 2); g.stroke(); }
    });
  });
  const qMesh = new THREE.Group();
  const qSlab = new THREE.Mesh(new RoundedBoxGeometry(2.86, 1.6, 0.06, 4, 0.1), plastic(new THREE.Color('#101014'), 0.35));
  const qFace = new THREE.Mesh(new THREE.PlaneGeometry(2.84, 1.59), new THREE.MeshBasicMaterial({ map: queue.tex }));
  qFace.position.z = 0.031;
  qMesh.add(qSlab, qFace);
  scene.add(qMesh);
  // the button
  const face = (label, bg) => {
    const [c, g] = canvas2d(1024, 320);
    g.fillStyle = bg; rr(g, 0, 0, 1024, 320, 160); g.fill();
    g.fillStyle = '#ffffff'; g.font = `800 124px ${UIF}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(label, 512, 168);
    return texture(c);
  };
  const offTex = face('Approve', hex(PAL.accent)), onTex = face('✓ Approved', '#2f9e68');
  const BW = 2.5, BH = 0.78;
  const button = new THREE.Group();
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: PAL.accent.clone().multiplyScalar(0.8), roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });
  const body = new THREE.Mesh(new RoundedBoxGeometry(BW, BH, 0.34, 8, BH / 2), bodyMat);
  const topMat = new THREE.MeshBasicMaterial({ map: offTex, transparent: true });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(BW, BH * 1.0), topMat);
  top.position.z = 0.171;
  button.add(body, top);
  scene.add(button);
  const base = new THREE.Mesh(new RoundedBoxGeometry(BW + 0.3, BH + 0.3, 0.2, 6, (BH + 0.3) / 2), metal(new THREE.Color('#1d1d23'), 0.3));
  scene.add(base);
  const cursor = cursorMesh();
  cursor.scale.setScalar(0.5);
  // unlit, so the bloom doesn't turn the white arrow into a glow
  cursor.traverse((o) => { if (o.isMesh) o.material = new THREE.MeshBasicMaterial({ color: o.material.color.getHex() === 0xffffff ? 0xe6e6ea : 0x111114 }); });
  scene.add(cursor);
  const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 2.2, 1.4), transparent: true, opacity: 0, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.97, 1.0, 96), ringMat);
  scene.add(ring);
  const party = confetti(scene, 110);
  const BPOS = V(0, -0.75, 0.6);
  return {
    scene, camera, tone: 'dark', render: fx.render, events: { click: CLICK },
    update(lt) {
      air(shot.in + lt);
      const pressed = lt >= CLICK;
      const press = pulse(lt, CLICK - 0.05, CLICK, CLICK + 0.06, CLICK + 0.3);
      queue.update({ ok: pressed, k: +clamp((lt - CLICK) / 0.5).toFixed(2) });
      const qk = expo((lt - 0.1) / 0.8);
      qMesh.position.set(0, lerp(1.9, 0.95, qk) + 0.04 * Math.sin(lt * 1.2), -0.6);
      qMesh.rotation.set(-0.08, 0.04 * Math.sin(lt * 0.6), 0);
      qMesh.scale.setScalar(Math.max(0.001, qk));
      const bk = expo(lt / 0.7);
      const pop = pressed ? 0.06 * Math.exp(-(lt - CLICK) * 5) * Math.sin((lt - CLICK) * 30) : 0;
      button.position.set(BPOS.x, BPOS.y + lerp(-1.5, 0, bk), BPOS.z - 0.12 * press);
      button.rotation.set(-0.35, 0, 0);
      button.scale.setScalar(Math.max(0.001, bk) * (1 - 0.05 * press + pop));
      base.position.set(BPOS.x, BPOS.y + lerp(-1.5, 0, bk) - 0.02, BPOS.z - 0.2);
      base.rotation.copy(button.rotation);
      base.scale.setScalar(Math.max(0.001, bk));
      topMat.map = pressed ? onTex : offTex;
      bodyMat.color.copy(pressed ? new THREE.Color('#237a50') : PAL.accent.clone().multiplyScalar(0.8));
      // the cursor glides in and taps on the beat
      const ck = inOut(clamp((lt - (CLICK - 1.0)) / 0.85));
      const after = smooth(lt, CLICK + 0.25, CLICK + 0.9);
      cursor.position.set(lerp(2.4, 0.42, ck) + 0.35 * after, lerp(-1.9, BPOS.y + 0.02, ck) - 0.05 * press - 0.25 * after, BPOS.z + 0.5 - 0.1 * press);
      cursor.rotation.set(-0.3, 0, 0.22);
      ring.position.set(BPOS.x, BPOS.y, BPOS.z + 0.2);
      ring.quaternion.copy(camera.quaternion);
      const ru = lt - CLICK;
      ring.scale.setScalar(ru > 0 ? 1.3 + 5 * expo(ru / 0.8) : 1);
      ringMat.opacity = ru > 0 ? Math.max(0, 0.9 - ru / 0.6) : 0;
      party(lt, CLICK, V(0, BPOS.y + 0.3, BPOS.z));
      const k = inOut(lt / shot.dur);
      const jolt = ru > 0 ? 0.05 * Math.exp(-ru * 8) * Math.sin(ru * 60) : 0;
      camera.position.set(0.35 * Math.sin(lt * 0.4 + 0.5), lerp(1.3, 1.0, k) + jolt, lerp(9.6, 8.8, k));
      camera.lookAt(0, 0.05, 0);
      fx.bloom.strength = 0.4 + (ru > 0 ? 0.6 * Math.exp(-ru * 3) : 0);
    },
  };
};

// ================= 6. FREE: big extruded letters slamming onto a glossy floor, one per eighth note =================
SHOTS.free = async (el, shot) => {
  await loadTypeface();
  const word = (el.dataset.text || 'FREE').toUpperCase();
  const { scene, camera } = fxStage({ glow: 0.24, glowY: 0.58, fog: [12, 36] });
  const fx = bloomer(scene, camera, { strength: 0.4, threshold: 0.95 });
  glossFloor(scene, 0, { dim: 0.72, grid: 0.12 });
  const air = dust(scene, { n: 160, size: 0.045, seed: 41 });
  const SIZE = 1.12, GAP = 0.05;
  const built = [...word].map((ch) => letter3d(ch, { size: SIZE, depth: 0.42 }));
  const total = built.reduce((a, l) => a + l.width, 0) + GAP * (built.length - 1);
  let x = -total / 2;
  const letters = built.map((l, i) => {
    const cx = x + l.width / 2;
    x += l.width + GAP;
    scene.add(l.mesh);
    return { ...l, x: cx, land: i * 0.25, tilt: (rng(i + 9)() - 0.5) * 0.9 };
  });
  const FALL = 0.26;
  return {
    scene, camera, tone: 'dark', render: fx.render,
    events: Object.fromEntries(letters.map((l, i) => [`land${i + 1}`, l.land])),
    update(lt) {
      air(shot.in + lt);
      let hit = 0;
      for (const l of letters) {
        const u = lt - (l.land - FALL);
        const f = clamp(u / FALL);
        const after = lt - l.land;
        const squash = after > 0 ? Math.exp(-after * 9) * Math.cos(after * 26) : 0;
        l.mesh.visible = u > 0;
        l.mesh.position.set(l.x, (1 - f * f) * 5, 0);
        l.mesh.rotation.set(0, 0, l.tilt * (1 - f));
        l.mesh.scale.set(1 + 0.12 * squash, 1 - 0.16 * squash, 1);
        if (after > 0) hit = Math.max(hit, Math.exp(-after * 10));
      }
      const k = inOut(lt / shot.dur);
      const ang = lerp(-0.22, 0.12, k);
      const dist = lerp(10.2, 9.5, k);
      camera.position.set(Math.sin(ang) * dist, lerp(0.75, 1.05, k) + 0.06 * hit * Math.sin(lt * 80), Math.cos(ang) * dist);
      camera.lookAt(0, 0.62, 0);
      fx.bloom.strength = 0.38 + 0.35 * hit;
    },
  };
};

// ================= 7. the finale: the plugin's mascot waving, its 14 skills orbiting it =================
SHOTS.finale = async (el, shot) => {
  const { scene, camera } = fxStage({ glow: 0.28, glowY: 0.62, fog: [10, 34] });
  const fx = bloomer(scene, camera, { strength: 0.35, threshold: 1.4 });
  glossFloor(scene, 0, { dim: 0.75, grid: 0.12 });
  scene.environmentIntensity = 0.6;
  const air = dust(scene, { n: 200, size: 0.04, seed: 51 });
  const rig = await mascotFor(el);
  scene.add(rig.root);
  const blob = contactShadow(1.5, 0.004, 0.5);
  scene.add(blob);
  const tiles = SKILL_TILES.map(([label, d], i) => {
    const g = tileMesh(label, d, { size: 0.38, labels: false });
    scene.add(g);
    return { g, a: (i / SKILL_TILES.length) * Math.PI * 2 };
  });
  const ctx = { words: [], t: 0, bpm: 120, drop: 0, propSide: 0, side: 1 };
  const blinkAt = (lt) => { const d = lt - 1.6; return d >= 0 && d < 0.16 ? 1 - Math.abs(d - 0.08) / 0.08 : 0; };
  return {
    scene, camera, tone: 'dark', render: fx.render,
    update(lt) {
      air(shot.in + lt);
      ctx.t = shot.in + lt;
      const enter = expo(lt / 0.6);
      let p = ACTIONS.wave(lt + 0.15, ctx);
      p = alive(p, lt, 7.7);
      p = { ...p, x: p.x, y: p.y + (1 - enter) * -2.4, z: p.z };
      applyPose(rig, p, 'wave', lt + 0.15);
      setFace(rig, { face: 'happy', blink: blinkAt(lt), look: [0, 0.1], mouth: 0 });
      rig.bulb.material.emissiveIntensity = 0.9 + 0.5 * Math.max(0, Math.sin((shot.in + lt) * 3.1));
      blob.position.set(p.x, 0.004, p.z);
      // the skills orbit at chest height, a halo of the team
      tiles.forEach((t, i) => {
        const a = t.a + lt * 0.55;
        const k = expo((lt - 0.2 - i * 0.03) / 0.8);
        // a tilted ring: low past the feet in front, high behind the head
        t.g.position.set(Math.cos(a) * 2.05 * k, 1.3 - 0.95 * Math.sin(a), Math.sin(a) * 1.2 * k - 0.25);
        t.g.quaternion.copy(camera.quaternion);
        t.g.scale.setScalar(Math.max(0.001, k));
      });
      const k = inOut(lt / shot.dur);
      camera.position.set(0.3 * Math.sin(lt * 0.35), lerp(1.5, 1.4, k), lerp(9.0, 8.4, k));
      camera.lookAt(0, 1.12, 0);
    },
  };
};
