// Gwiazdka: a Christmas gift for Jurek. The present, Gzowo on Christmas Eve, the "Cicha noc" flight and the first star.
import * as THREE from 'three';
import { World, PAD, CLOUD_BASE, CLOUD_TOP } from './world.js';
import { Rocket } from './rocket.js';
import { NoteField, drawKeys } from './notes.js';
import { Gift, starTexture } from './gift.js';
import { AudioEngine } from './audio.js';
import { NOTES, ACCOMP, FLOURISH, SONG_END } from './song.js';

const $ = (id) => document.getElementById(id);
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const C = (h) => new THREE.Color(h);
const cl = (x) => Math.min(1, Math.max(0, x));
const ss = (a, b, x) => { const t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const touch = matchMedia('(pointer: coarse)').matches;
const low = touch;

const SFX = {
  wind: 'audio/wind.wav', roar: 'audio/roar.wav', ignite: 'audio/ignite.mp3', bells: 'audio/bells.mp3', sleigh: 'audio/sleigh.mp3',
  ribbon: 'audio/ribbon.mp3', paper: 'audio/paper.mp3', lid: 'audio/lid.mp3', eject: 'audio/eject.mp3', chute: 'audio/chute.mp3',
  rise: 'audio/rise.mp3', tick: 'audio/tick.mp3',
};

const audio = new AudioEngine();
let loaded = false;
const loading = audio.load(SFX, (p) => { $('progress').firstElementChild.style.transform = `scaleX(${p})`; }).then(() => { loaded = true; });

await Promise.race([document.fonts.load('italic 300 72px Newsreader'), new Promise((r) => setTimeout(r, 2500))]);

const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const keysCanvas = $('keys');
const kx = keysCanvas.getContext('2d');

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x3a455f, 0.0042);
const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 3200);
const CP = V(21, 9.3, -11);
const CP_LOOK = V(PAD.x, PAD.y + 0.735 + 0.62, PAD.z);
const introPos = new THREE.CatmullRomCurve3([V(-46, 7, -96), V(-24, 10, -62), V(2, 12.5, -36), V(24, 12, -22), CP.clone()]);
const introLook = new THREE.CatmullRomCurve3([V(2, 9, -8), V(5, 10, -8), V(10, 9.6, -10), V(13, 9.1, -12), CP_LOOK.clone()]);
const CF = V(-7, 9.4, -34), CF_LOOK = V(6, 11.6, -6);
const finPos = new THREE.CatmullRomCurve3([V(-34, 104, -132), V(-28, 52, -96), V(-16, 20, -58), CF.clone()]);
const finLook = new THREE.CatmullRomCurve3([V(-6, 28, -40), V(-2, 18, -26), V(1, 13, -14), CF_LOOK.clone()]);
const clear = [];
for (const c of [introPos, finPos]) for (const p of c.getSpacedPoints(80)) if (p.y < 40) clear.push([p.x, p.z, 7]);
clear.push([CP.x, CP.z, 6]);
for (let i = 0; i <= 12; i++) { const p = CF.clone().lerp(V(0, 0, -6), i / 12); clear.push([p.x, p.z, 3 + i * 0.25]); }
for (let i = 0; i <= 6; i++) { const p = CP.clone().lerp(V(PAD.x, 0, PAD.z), i / 6); clear.push([p.x, p.z, 3]); }
const world = new World(scene, { low, clear });
const rocket = new Rocket(scene);
const notes = new NoteField(scene);
const gift = new Gift();

const starTex = starTexture();
const bigStar = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 }));
bigStar.renderOrder = 8;
bigStar.visible = false;
scene.add(bigStar);
const tipStar = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.35 }));
tipStar.position.y = 1.27;
tipStar.scale.setScalar(0.14);
rocket.body.add(tipStar);

const PAD_TOP = world.padTop.clone();
const V_UP = 5, T_IGN = 0.35, T_ACC = 1.65, ACC = V_UP / T_ACC, T_BURN = SONG_END - 0.3, T_COAST = 1.6, T_EJECT = T_BURN + T_COAST;
const COLLECT = 0.8;

function rocketY(t) {
  const y0 = PAD_TOP.y;
  if (t < T_IGN) return y0;
  const y1 = 0.5 * ACC * T_ACC * T_ACC;
  if (t < T_IGN + T_ACC) return y0 + 0.5 * ACC * (t - T_IGN) ** 2;
  const tb = T_BURN - T_IGN - T_ACC;
  if (t < T_BURN) return y0 + y1 + V_UP * (t - T_IGN - T_ACC);
  const c = Math.min(T_COAST, t - T_BURN);
  return y0 + y1 + V_UP * tb + V_UP * (c - (c * c) / (2 * T_COAST));
}

const ATM = {
  ground: { fog: C(0x3d4862), density: 0.0042, top: C(0x222b42), mid: C(0x2b3550), bot: C(0x48536f), warm: C(0x6a5a70), stars: 0, moon: 0, moonLight: 0.2, hemi: 2.1, snow: 1 },
  cloud: { fog: C(0x737e95), density: 0.075, top: C(0x737e95), mid: C(0x737e95), bot: C(0x737e95), warm: C(0x737e95), stars: 0, moon: 0, moonLight: 0.4, hemi: 2.2, snow: 0.45 },
  above: { fog: C(0x1b2747), density: 0.0012, top: C(0x040914), mid: C(0x0b1530), bot: C(0x1e2d52), warm: C(0x2a2c4a), stars: 1, moon: 1, moonLight: 1.5, hemi: 1.5, snow: 0 },
  finale: { fog: C(0x36415b), density: 0.0036, top: C(0x111a32), mid: C(0x252f4b), bot: C(0x414c69), warm: C(0x5f5270), stars: 1, moon: 0, moonLight: 0.22, hemi: 1.9, snow: 0.75 },
};
const mkAtm = () => ({ fog: C(0), top: C(0), mid: C(0), bot: C(0), warm: C(0) });
const A1 = mkAtm(), A2 = mkAtm(), A3 = mkAtm();
function mixAtm(a, b, k, o) {
  for (const key of Object.keys(a)) {
    if (a[key].isColor) o[key].lerpColors(a[key], b[key], k);
    else o[key] = a[key] + (b[key] - a[key]) * k;
  }
  return o;
}
let finaleMode = 0, fogBoost = 0;
function applyAtmos() {
  const y = camera.position.y;
  const a = ss(CLOUD_BASE - 14, CLOUD_BASE + 6, y), b = ss(CLOUD_TOP - 10, CLOUD_TOP + 8, y);
  mixAtm(ATM.ground, ATM.finale, finaleMode, A3);
  mixAtm(A3, ATM.cloud, a, A1);
  mixAtm(A1, ATM.above, b, A2);
  if (fogBoost > 0) mixAtm(A2, ATM.cloud, fogBoost, A2);
  world.setAtmos(A2);
}

let W = 1, H = 1, PX = 1, spacing = 1, portrait = false;
function camK() { return 1 + (1.2 - Math.min(1.2, camera.aspect)) * 0.55; }
function resize() {
  W = innerWidth; H = innerHeight;
  portrait = W / H < 0.85;
  let dpr = Math.min(devicePixelRatio || 1, 2);
  if (W * H * dpr * dpr > 2.6e6) dpr = Math.sqrt(2.6e6 / (W * H));
  PX = dpr;
  renderer.setPixelRatio(dpr);
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  camera.fov = portrait ? 62 : 50;
  camera.updateProjectionMatrix();
  gift.resize(W, H, dpr);
  const scale = (H * dpr) / (2 * Math.tan((camera.fov * Math.PI) / 360));
  world.snowU.uScale.value = scale;
  rocket.smokeU.uScale.value = scale;
  notes.u.uScale.value = scale;
  keysCanvas.width = Math.round(W * dpr);
  keysCanvas.height = Math.round(H * dpr);
  const d = Math.hypot(3.4, 9) * camK();
  const vis = 2 * d * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;
  spacing = Math.min(1.0, (0.84 * vis) / 10.6);
}
addEventListener('resize', resize);
resize();

const cap = $('caption');
function caption(html, dur = 4, small = false) {
  const d = document.createElement('div');
  d.className = 'in' + (small ? ' small' : '');
  d.innerHTML = html;
  cap.appendChild(d);
  requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add('on')));
  if (dur > 0) setTimeout(() => { d.classList.remove('on'); setTimeout(() => d.remove(), 900); }, dur * 1000);
  return d;
}
function clearCaptions() { for (const d of [...cap.children]) { d.classList.remove('on'); setTimeout(() => d.remove(), 900); } }
const show = (id, v) => $(id).classList.toggle('on', v);

let state = 'gift', st = 0, clock = 0;
let ev = {};
function once(k, at) { if (st >= at && !ev[k]) { ev[k] = true; return true; } return false; }
function go(s) { state = s; st = 0; ev = {}; enter[s] && enter[s](); }

let fadeV = 1, fadeTarget = 0, fadeSpeed = 1.2;
let holding = false, holdT = 0, countShown = -1;
let pointerX = W / 2, control = 'pointer', keyLane = 5;
let songStartCtx = 0, songT = 0, sched = 0, nextNote = 0;
let lat = 0, latV = 0, laneXs = [];
const camLook = V(), camPos = V();
let shake = 0;
let apo = {}, fin = {};

const enter = {
  intro() {
    show('title', false);
    fadeTarget = 0; fadeSpeed = 0.7;
    audio.bed('wind', 0.5, 2.5);
    world.windAmt = 1;
  },
  ready() {
    clearCaptions();
    show('title', false);
    show('mission', true);
    holding = false; holdT = 0; countShown = -1;
    audio.bed('wind', 0.22, 3);
    world.windAmt = 0.15;
    rocket.reset(PAD_TOP.clone().setX(PAD.x).setZ(PAD.z));
    tipStar.visible = true;
    notes.reset();
    lat = 0; latV = 0;
  },
  flight() {
    clearCaptions();
    show('mission', false);
    show('alt', true);
    $('ring').style.opacity = 0;
    $('count').innerHTML = '';
    audio.bed('wind', 0, 2.5);
    songStartCtx = audio.now() + 0.08;
    songT = -0.08;
    sched = 0; nextNote = 0;
    audio.play('ignite', { when: songStartCtx, gain: 0.55 });
    notes.visible(true);
    shake = 1;
    keyLane = 5;
  },
  apogee() {
    show('mission', false);
    rocket.eject();
    tipStar.visible = false;
    const now = audio.now();
    audio.play('eject', { when: now, gain: 0.8 });
    audio.play('rise', { when: now + 0.05, gain: 0.5 });
    audio.play('chute', { when: now + 0.3, gain: 0.55 });
    audio.play('sleigh', { when: now + 0.2, gain: 0.55, reverb: true });
    for (const n of FLOURISH) audio.note(n.pitch, now + 0.25 + n.time, n.vel, n.dur);
    audio.bed('roar', 0, 1.2);
    apo.A = rocket.root.position.clone().add(V(0, 1.27, 0));
    apo.side = apo.A.clone().add(V(15, 3, 16));
    apo.p0 = camera.position.clone();
    apo.l0 = camLook.clone();
    apo.bright = 0.45 + 0.55 * (notes.hits / NOTES.length);
    bigStar.visible = true;
    bigStar.material.opacity = 0;
  },
  finale() {
    finaleMode = 1;
    fogBoost = 1;
    show('alt', false);
    const cam = camera.clone();
    cam.position.copy(CF);
    cam.lookAt(CF_LOOK);
    cam.updateMatrixWorld();
    const ray = (x, y) => V(x, y, 0.5).unproject(cam).sub(CF).normalize();
    const sd = portrait ? ray(0.22, 0.52) : ray(0.3, 0.7);
    fin.S = CF.clone().addScaledVector(sd, 430);
    const th = (131 - CF.y) / Math.max(0.05, sd.y);
    const hc = CF.clone().addScaledVector(sd, th);
    world.setHole(hc.x, hc.z, 118);
    bigStar.position.copy(fin.S);
    bigStar.material.opacity = 1;
    const cd = portrait ? ray(-0.45, 0.3) : ray(0.4, 0.42);
    rocket.teleport(CF.clone().addScaledVector(cd, 32));
    audio.bed('wind', 0.28, 4);
    world.windAmt = 0.5;
  },
  card() {
    const h = notes.hits, n = NOTES.length;
    const stat = h === n ? `Wszystkie ${n} nut „Cichej nocy”. Czysto, jak na koncercie.`
      : h >= n - 6 ? `Zagrałeś ${h} z ${n} nut „Cichej nocy”. Gwiazdka świeci jasno.`
      : `Zagrałeś ${h} z ${n} nut „Cichej nocy”. Spróbuj jeszcze raz, a gwiazdka zaświeci jaśniej.`;
    document.querySelector('#card .stat').textContent = stat;
    const items = [...$('card').children];
    items.forEach((el, i) => setTimeout(() => el.classList.add('on'), 200 + i * 160));
  },
};

function resetWorld() {
  finaleMode = 0;
  fogBoost = 0;
  world.setHole(0, 0, 0);
  world.windows.forEach((w) => { w.mat.emissiveIntensity = w.lit ? 1 : 0; });
  world.setSpruce(0);
  world.villageMat.opacity = 0.75;
  bigStar.visible = false;
  for (const el of $('card').children) el.classList.remove('on');
}

function again() {
  if (fin.bells && audio.ok) {
    const g = fin.bells.g.gain, n = audio.now();
    g.cancelScheduledValues(n);
    g.setValueAtTime(g.value, n);
    g.linearRampToValueAtTime(0, n + 1.2);
    fin.bells = null;
  }
  resetWorld();
  fadeV = 1; fadeTarget = 0; fadeSpeed = 1.4;
  go('ready');
}
$('again').addEventListener('click', (e) => { e.stopPropagation(); audio.resume(); again(); });
$('again').addEventListener('pointerdown', (e) => e.stopPropagation());

const muteBtn = $('mute');
function toggleMute() { audio.setMuted(!audio.muted); muteBtn.classList.toggle('off', audio.muted); }
muteBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
muteBtn.addEventListener('click', (e) => { e.stopPropagation(); audio.resume(); toggleMute(); });

function press() {
  audio.resume();
  if (state === 'gift' && gift.openT < 0) {
    if (!loaded) return;
    show('title', false);
    $('progress').style.opacity = 0;
    gift.open();
    audio.bed('wind', 0.32, 2);
  } else if (state === 'intro' && st > 1.2) {
    fadeV = 1; fadeTarget = 0; fadeSpeed = 1.6;
    go('ready');
  } else if (state === 'ready') holding = true;
}
function release() { holding = false; }

addEventListener('pointerdown', (e) => { pointerX = e.clientX; control = 'pointer'; press(); });
addEventListener('pointerup', release);
addEventListener('pointercancel', release);
addEventListener('pointermove', (e) => { pointerX = e.clientX; if (e.pointerType !== 'mouse' || Math.abs(e.movementX) > 0) control = 'pointer'; });
addEventListener('keydown', (e) => {
  if (e.repeat && e.code === 'Space') return;
  if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (state === 'card' && e.code === 'Enter') { again(); return; } press(); }
  if (e.code === 'KeyM') toggleMute();
  if (state === 'flight' && (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowRight' || e.code === 'KeyD')) {
    if (control !== 'keys') { control = 'keys'; keyLane = Math.round(lat / spacing + 5); }
    keyLane = Math.max(0, Math.min(10, keyLane + (e.code === 'ArrowLeft' || e.code === 'KeyA' ? -1 : 1)));
  }
});
addEventListener('keyup', (e) => { if (e.code === 'Space') release(); });
document.addEventListener('visibilitychange', () => {
  if (!audio.ok) return;
  if (document.hidden) audio.ctx.suspend(); else audio.ctx.resume();
});

gift.onEvent = (k) => {
  if (k === 'ribbon') audio.play('ribbon', { gain: 0.8 });
  if (k === 'paper') audio.play('paper', { gain: 0.7 });
  if (k === 'lid') audio.play('lid', { gain: 0.9 });
  if (k === 'star') audio.play('rise', { gain: 0.45 });
};
const giftEv = {};

function lookCam(p, l) {
  camera.position.copy(p);
  camLook.copy(l);
  camera.lookAt(l);
}

const tmp = V(), tmp2 = V();
function notePos(i, v) {
  const n = NOTES[i];
  return v.set(PAD.x + (n.lane - 5) * spacing, rocketY(n.time) + COLLECT, PAD.z);
}

function chase(ry, k) {
  return [V(PAD.x + lat * 0.1, ry - 3.4 * k, PAD.z + 9 * k), V(PAD.x + lat * 0.05, ry + 2.35 * k, PAD.z)];
}

const update = {
  gift(dt) {
    const f = gift.update(dt, giftEv);
    if (gift.openT < 0) {
      if (st > 0.6) show('title', true);
      $('tap').style.opacity = loaded ? 1 : 0;
      $('progress').style.opacity = loaded ? 0 : 1;
      fadeTarget = 0;
    } else {
      fadeV = Math.max(fadeV, f);
      fadeTarget = f;
    }
    if (gift.done) {
      fadeV = 1;
      go('intro');
    }
  },

  intro(dt) {
    const u = easeIO(cl(st / 19));
    lookCam(introPos.getPointAt(Math.min(1, u)), introLook.getPointAt(Math.min(1, u)));
    if (once('c1', 1.0)) caption('24 grudnia &middot; Gzowo', 3.6, true);
    if (once('c2', 4.0)) caption('Chmury zasłoniły niebo. Nie widać pierwszej gwiazdki.', 4.2);
    if (once('c3', 8.8)) caption('A bez niej nikt w Gzowie nie zacznie Wigilii.', 3.8);
    if (once('c4', 13.2)) caption('Gwiazdka z prezentu czeka w nosie rakiety.', 4.2);
    if (st >= 19) go('ready');
  },

  ready(dt) {
    const b = Math.sin(clock * 0.4) * 0.05;
    lookCam(tmp.copy(CP).add(V(b, b * 0.5, 0)), CP_LOOK);
    if (once('c1', 0.4)) caption('Wiatr ucichł. Można startować.', 2.6);
    if (once('c2', 3.0)) ev.hint = caption(touch ? 'Przytrzymaj palec na ekranie, żeby odpalić' : 'Przytrzymaj spację albo przycisk myszy, żeby odpalić', 0, true);
    if (holding) {
      holdT += dt;
      $('ring').style.opacity = 1;
      const c = Math.floor(holdT);
      if (c !== countShown && c < 3) {
        countShown = c;
        $('count').innerHTML = `<span>${3 - c}</span>`;
        audio.play('tick', { gain: 0.9 });
        if (ev.hint) { ev.hint.classList.remove('on'); }
      }
      $('ring').firstElementChild.style.strokeDashoffset = 628.3 * (1 - cl(holdT / 3));
      if (holdT >= 3) go('flight');
    } else if (holdT > 0) {
      holdT = 0; countShown = -1;
      $('ring').style.opacity = 0;
      $('count').innerHTML = '';
      if (ev.hint) ev.hint.classList.add('on');
    }
  },

  flight(dt) {
    songT += dt;
    if (audio.running()) {
      const at = audio.now() - songStartCtx;
      const err = at - songT;
      songT = Math.abs(err) > 0.12 ? at : songT + err * 0.12;
    }
    const t = songT;
    const ry = rocketY(t);
    const k = camK();

    while (sched < ACCOMP.length && ACCOMP[sched].time < t + 0.3) {
      const a = ACCOMP[sched++];
      audio.note(a.pitch, songStartCtx + a.time, a.vel, a.dur);
    }
    if (once('roar', 0.9)) audio.bed('roar', 0.16, 2.2, { lowpass: 1500 });
    if (once('roarOff', T_BURN - 0.2)) audio.bed('roar', 0, 1.6);
    if (once('hint', 1.0)) caption(`Leć przez gwiazdki, każda zagra jedną nutę.<br><span style="font-size:12px;opacity:.7;letter-spacing:.08em">${touch ? 'PRZESUWAJ PALCEM' : 'MYSZ ALBO ← →'}</span>`, 4.4);

    laneXs.length = 0;
    for (let i = 0; i < 11; i++) {
      tmp.set(PAD.x + (i - 5) * spacing, ry + COLLECT, PAD.z).project(camera);
      laneXs.push((tmp.x * 0.5 + 0.5) * W);
    }
    let target = lat;
    if (control === 'pointer' && t > 0.3) {
      const f = ((pointerX - laneXs[0]) / (laneXs[10] - laneXs[0])) * 10;
      target = (Math.max(-0.4, Math.min(10.4, f)) - 5) * spacing;
    } else if (control === 'keys') target = (keyLane - 5) * spacing;
    if (t < 1.2) target *= ss(0.3, 1.2, t);
    const w = 17;
    latV += (w * w * (target - lat) - 2 * w * latV) * dt;
    lat += latV * dt;

    for (let i = nextNote; i < NOTES.length; i++) {
      const n = NOTES[i], s = notes.st[i];
      if (n.time > t + 0.035) break;
      if (s.hit || s.miss) continue;
      const lx = (n.lane - 5) * spacing;
      if (Math.abs(lat - lx) <= spacing * 0.62) {
        notes.markHit(i, t, notePos(i, tmp2));
        audio.note(n.pitch, songStartCtx + n.time, 0.8, n.len + 0.35);
      } else if (t > n.time + 0.085) notes.markMiss(i, t);
    }
    while (nextNote < NOTES.length && (notes.st[nextNote].hit || notes.st[nextNote].miss)) nextNote++;

    rocket.root.position.set(PAD.x + lat, ry, PAD.z);
    rocket.body.rotation.z = Math.max(-0.32, Math.min(0.32, -latV * 0.045));
    rocket.power = ss(0, 0.3, t) * (1 - ss(T_BURN, T_BURN + 0.9, t));
    if (once('burst', 0.05)) rocket.ignitionBurst(PAD.y);
    if (rocket.power > 0.2) {
      ev.acc = (ev.acc || 0) + dt * (t < 3 ? 60 : 24);
      while (ev.acc > 1) {
        ev.acc -= 1;
        tmp.set(rocket.root.position.x + (Math.random() - 0.5) * 0.04, ry - 0.1 - Math.random() * 0.3, PAD.z + (Math.random() - 0.5) * 0.04);
        tmp2.set((Math.random() - 0.5) * 0.5, -1.2 - Math.random() * 0.8, (Math.random() - 0.5) * 0.5);
        rocket.puff(tmp, tmp2, 1.8 + Math.random() * 1.4, 0.1, 0.55 + Math.random() * 0.4);
      }
    }
    tipStar.material.opacity = 0.35 + 0.6 * (notes.hits / NOTES.length);
    tipStar.scale.setScalar(0.12 + 0.2 * (notes.hits / NOTES.length) + Math.sin(clock * 6) * 0.01);

    const [pc, lc] = chase(ry, k);
    const bl = easeIO(cl((t - 0.5) / 3.6));
    camPos.lerpVectors(CP, pc, bl);
    tmp.set(PAD.x + lat * 0.3, ry + 0.6, PAD.z).lerp(lc, bl);
    shake = Math.max(0, shake - dt * 0.45);
    const sh = shake * shake * 0.035;
    camPos.x += (Math.random() - 0.5) * sh;
    camPos.y += (Math.random() - 0.5) * sh;
    lookCam(camPos, tmp);

    notes.update(dt, t, notePos, tmp2.copy(rocket.root.position).add(V(0, 1.1, 0)));
    $('alt').firstElementChild.textContent = Math.max(0, Math.round(ry - PAD_TOP.y));
    if (t >= T_EJECT) go('apogee');
  },

  apogee(dt) {
    const e = easeOut(cl(st / 3.6));
    const sp = apo.A.clone().add(V(-0.5 * e, 0.6 + 13.5 * e, -3 * e));
    if (st < 6) bigStar.position.copy(sp);
    bigStar.material.opacity = cl(st * 3);
    bigStar.scale.setScalar((0.8 + 6 * e) * apo.bright * (1 + Math.sin(clock * 4) * 0.025));
    const sw = easeIO(cl(st / 2.4));
    const p1 = apo.p0.clone().lerp(apo.side, sw);
    const l1 = apo.l0.clone().lerp(apo.A.clone().add(V(0, 6, 0)), ss(0, 1.6, st));
    const d = easeIO(cl((st - 3.6) / 2.9));
    const p2 = V(PAD.x - 10, CLOUD_TOP - 16, PAD.z - 72);
    const pos = p1.clone().lerp(p2, d);
    const look = l1.clone().lerp(pos.clone().add(V(-0.1, -0.85, -1).multiplyScalar(30)), ss(0, 0.7, d)).lerp(p2.clone().add(V(0, -40, -40)), ss(0.6, 1, d));
    lookCam(pos, look);
    if (once('cap', 1.4)) caption('Spadochron otworzył się za pierwszym razem.', 3.4);
    if (once('dive', 3.7)) audio.play('rise', { gain: 0.55, rate: 0.7 });
    $('alt').firstElementChild.textContent = Math.max(0, Math.round(pos.y - PAD_TOP.y));
    if (once('altOff', 3.4)) show('alt', false);
    notes.update(dt, SONG_END + 2 + st, notePos, tmp2.copy(rocket.root.position));
    if (st >= 6.5) go('finale');
  },

  finale(dt) {
    fogBoost = Math.max(0, 1 - st / 2.6);
    const u = easeIO(cl(st / 10.5));
    const drift = V(Math.sin(clock * 0.3) * 0.15 * ss(10, 13, st), Math.sin(clock * 0.23) * 0.08 * ss(10, 13, st), 0);
    lookCam(finPos.getPointAt(u).add(drift), finLook.getPointAt(u));
    bigStar.scale.setScalar(48 * apo.bright * (1 + Math.sin(clock * 3.1) * 0.03 + Math.sin(clock * 7.7) * 0.015));
    if (once('bells', 0.8)) fin.bells = audio.play('bells', { gain: 0.32, fadeIn: 5, lowpass: 2200 });
    const wins = world.windows.filter((w) => !w.lit);
    wins.forEach((w, i) => { w.mat.emissiveIntensity = ss(3.2 + i * 0.7, 3.6 + i * 0.7, st); });
    world.setSpruce(ss(3.8, 8.6, st));
    world.villageMat.opacity = 0.75 + 0.25 * ss(6, 8, st);
    if (once('card', 9.6)) go('card');
  },

  card(dt) {
    const drift = V(Math.sin(clock * 0.3) * 0.15, Math.sin(clock * 0.23) * 0.08, 0);
    lookCam(CF.clone().add(drift), CF_LOOK);
    bigStar.scale.setScalar(48 * apo.bright * (1 + Math.sin(clock * 3.1) * 0.03 + Math.sin(clock * 7.7) * 0.015));
  },
};

function drawOverlay() {
  kx.setTransform(PX, 0, 0, PX, 0, 0);
  kx.clearRect(0, 0, W, H);
  if (state !== 'flight') return;
  const a = ss(1.2, 2.6, songT) * (1 - ss(SONG_END - 0.5, SONG_END + 0.6, songT));
  if (laneXs.length !== 11) return;
  const sp = laneXs[1] - laneXs[0];
  const kh = Math.max(22, Math.min(38, sp * 1.7));
  const bottom = H - 12 - kh;
  drawKeys(kx, laneXs, bottom, kh, notes.keyFlash, Math.round(lat / spacing + 5), a);
}

function compileAll() {
  rocket.chute.visible = true; rocket.cord.visible = true; notes.visible(true); bigStar.visible = true;
  camera.position.set(0, 20, -60);
  camera.lookAt(0, 10, 0);
  renderer.compile(scene, camera);
  renderer.compile(gift.scene, gift.camera);
  rocket.chute.visible = false; rocket.cord.visible = false; notes.visible(false); bigStar.visible = false;
}
compileAll();
rocket.reset(PAD_TOP.clone().setX(PAD.x).setZ(PAD.z));

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  clock += dt;
  st += dt;
  update[state](dt);
  const target = fadeTarget;
  fadeV += (target - fadeV) * Math.min(1, dt * (state === 'gift' && gift.openT >= 0 ? 60 : fadeSpeed * 2.2));
  $('fade').style.opacity = fadeV.toFixed(3);
  if (state === 'gift') {
    renderer.render(gift.scene, gift.camera);
  } else {
    applyAtmos();
    rocket.update(dt, clock);
    world.update(dt, clock, camera, PX);
    renderer.render(scene, camera);
  }
  drawOverlay();
}
fadeV = 1;
requestAnimationFrame(frame);
