// Gwiazdka: melody stars in the sky, light motes, the drawn constellation line and the keyboard strip.
import * as THREE from 'three';
import { NOTES } from './song.js';

const GOLD = new THREE.Color(0xffcf73);
const MISS = new THREE.Color(0x5d6a86);

export class NoteField {
  constructor(scene) {
    this.scene = scene;
    const N = NOTES.length;
    this.N = N;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(N), 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(N), 1));
    g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    this.u = { uScale: { value: 600 } };
    const vs = `attribute float aSize; attribute float aAlpha; attribute vec3 aColor; uniform float uScale; varying float vA; varying vec3 vC;
      void main(){ vA = aAlpha; vC = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uScale / max(0.3, -mv.z); gl_Position = projectionMatrix * mv; }`;
    const fs = `varying float vA; varying vec3 vC;
      void main(){ vec2 p = gl_PointCoord * 2.0 - 1.0; float r = length(p);
        float core = smoothstep(0.3, 0.02, r);
        float sx = (1.0 - smoothstep(0.0, 0.06, abs(p.y))) * (1.0 - smoothstep(0.15, 1.0, abs(p.x)));
        float sy = (1.0 - smoothstep(0.0, 0.06, abs(p.x))) * (1.0 - smoothstep(0.15, 1.0, abs(p.y)));
        float a = max(core, max(sx, sy) * 0.9);
        if (a * vA < 0.01) discard;
        vec3 c = mix(vC, vec3(1.0), smoothstep(0.16, 0.0, r));
        gl_FragColor = vec4(c, a * vA); }`;
    this.points = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;
    scene.add(this.points);

    const M = 90;
    const mg = new THREE.BufferGeometry();
    mg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(M * 3), 3));
    mg.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(M), 1));
    mg.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(M), 1));
    mg.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(M * 3).fill(1), 3));
    this.motes = new THREE.Points(mg, this.points.material);
    this.motes.frustumCulled = false;
    this.motes.renderOrder = 7;
    scene.add(this.motes);
    this.moteData = Array.from({ length: M }, () => ({ t: 1, from: new THREE.Vector3(), side: 0 }));
    this.moteI = 0;

    const S = N;
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(S * 6 * 3), 3));
    lg.setDrawRange(0, 0);
    this.lineMat = new THREE.MeshBasicMaterial({ color: 0xffd58a, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false });
    this.lines = new THREE.Mesh(lg, this.lineMat);
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 5;
    scene.add(this.lines);
    this.reset();
  }

  reset() {
    this.st = NOTES.map(() => ({ hit: false, miss: false, at: 0 }));
    this.hits = 0;
    this.segs = [];
    this.lastHit = -2;
    this.lines.geometry.setDrawRange(0, 0);
    this.keyFlash = new Float32Array(11);
    for (const m of this.moteData) m.t = 1;
    this.visible(false);
  }

  visible(v) {
    this.points.visible = this.motes.visible = this.lines.visible = v;
  }

  markHit(i, now, pos) {
    const s = this.st[i];
    s.hit = true; s.at = now;
    this.hits++;
    this.keyFlash[NOTES[i].lane] = 1;
    if (this.lastHit === i - 1 && i > 0) this.segs.push({ a: i - 1, b: i, born: now });
    this.lastHit = i;
    for (let k = 0; k < 5; k++) {
      const m = this.moteData[this.moteI];
      this.moteI = (this.moteI + 1) % this.moteData.length;
      m.t = 0; m.from.copy(pos); m.side = (k - 2) * 0.35 + (Math.random() - 0.5) * 0.2; m.speed = 2.4 + Math.random() * 1.2;
    }
  }

  markMiss(i, now) {
    this.st[i].miss = true;
    this.st[i].at = now;
  }

  update(dt, now, posOf, target) {
    const g = this.points.geometry;
    const P = g.attributes.position.array, S = g.attributes.aSize.array, A = g.attributes.aAlpha.array, C = g.attributes.aColor.array;
    const c = new THREE.Color(), v = new THREE.Vector3();
    for (let i = 0; i < this.N; i++) {
      const n = NOTES[i], s = this.st[i];
      posOf(i, v);
      const tw = 0.9 + 0.1 * Math.sin(now * 5 + i * 1.7);
      let size = 0.72 + Math.sqrt(n.eighths) * 0.16, alpha = 1;
      c.copy(GOLD);
      const ahead = n.time - now;
      alpha *= Math.min(1, Math.max(0, (6 - ahead) / 2));
      if (s.hit) {
        const k = Math.min(1, (now - s.at) / 0.55);
        size *= 1 + k * 1.6;
        alpha *= Math.pow(1 - k, 2);
        c.lerp(new THREE.Color(1, 1, 1), 1 - k);
      } else if (s.miss) {
        const k = Math.min(1, (now - s.at) / 0.6);
        c.lerp(MISS, Math.min(1, k * 2));
        alpha *= 0.55 * (1 - k * 0.7);
        size *= 0.8;
      } else size *= tw;
      P[i * 3] = v.x; P[i * 3 + 1] = v.y; P[i * 3 + 2] = v.z;
      S[i] = size; A[i] = alpha;
      C[i * 3] = c.r; C[i * 3 + 1] = c.g; C[i * 3 + 2] = c.b;
    }
    g.attributes.position.needsUpdate = g.attributes.aSize.needsUpdate = g.attributes.aAlpha.needsUpdate = g.attributes.aColor.needsUpdate = true;

    const mg = this.motes.geometry;
    const mp = mg.attributes.position.array, ms = mg.attributes.aSize.array, ma = mg.attributes.aAlpha.array;
    this.moteData.forEach((m, i) => {
      if (m.t >= 1) { ma[i] = 0; ms[i] = 0; return; }
      m.t = Math.min(1, m.t + dt * m.speed);
      const e = 1 - Math.pow(1 - m.t, 3);
      v.copy(m.from).lerp(target, e);
      v.x += Math.sin(m.t * Math.PI) * m.side;
      v.y += Math.sin(m.t * Math.PI) * 0.35;
      mp[i * 3] = v.x; mp[i * 3 + 1] = v.y; mp[i * 3 + 2] = v.z;
      ms[i] = 0.12 * (1 - m.t * 0.5);
      ma[i] = 1 - m.t * 0.3;
    });
    mg.attributes.position.needsUpdate = mg.attributes.aSize.needsUpdate = mg.attributes.aAlpha.needsUpdate = true;

    const lp = this.lines.geometry.attributes.position.array;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), w = 0.018;
    this.segs.forEach((sg, k) => {
      posOf(sg.a, a); posOf(sg.b, b);
      const grow = Math.min(1, (now - sg.born) / 0.22);
      b.lerp(a, 1 - grow);
      let nx = -(b.y - a.y), ny = b.x - a.x;
      const l = Math.hypot(nx, ny) || 1;
      nx = (nx / l) * w; ny = (ny / l) * w;
      const q = [a.x + nx, a.y + ny, a.x - nx, a.y - ny, b.x + nx, b.y + ny, b.x - nx, b.y - ny];
      const o = k * 18, z = a.z;
      const put = (j, x, y) => { lp[o + j * 3] = x; lp[o + j * 3 + 1] = y; lp[o + j * 3 + 2] = z; };
      put(0, q[0], q[1]); put(1, q[2], q[3]); put(2, q[4], q[5]);
      put(3, q[2], q[3]); put(4, q[6], q[7]); put(5, q[4], q[5]);
    });
    this.lines.geometry.attributes.position.needsUpdate = true;
    this.lines.geometry.setDrawRange(0, this.segs.length * 6);
    for (let i = 0; i < 11; i++) this.keyFlash[i] = Math.max(0, this.keyFlash[i] - dt * 2.2);
  }
}

const WHITE_BLACK_AFTER = [true, true, false, true, true, true, false, true, true, false, false];

export function drawKeys(g, xs, y, kh, flash, hover, alpha) {
  if (alpha <= 0.01) return;
  g.save();
  g.globalAlpha = alpha;
  const edges = [];
  for (let i = 0; i <= xs.length; i++) {
    if (i === 0) edges.push(xs[0] - (xs[1] - xs[0]) / 2);
    else if (i === xs.length) edges.push(xs[i - 1] + (xs[i - 1] - xs[i - 2]) / 2);
    else edges.push((xs[i - 1] + xs[i]) / 2);
  }
  g.lineWidth = 1;
  for (let i = 0; i < xs.length; i++) {
    const x0 = edges[i] + 1, x1 = edges[i + 1] - 1, w = x1 - x0;
    g.beginPath();
    g.roundRect(x0, y, w, kh, [0, 0, 4, 4]);
    g.fillStyle = 'rgba(255,255,255,0.07)';
    g.fill();
    if (hover === i) { g.fillStyle = 'rgba(255,255,255,0.16)'; g.fill(); }
    if (flash[i] > 0) { g.fillStyle = `rgba(255,207,115,${0.85 * flash[i]})`; g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,0.42)';
    g.stroke();
  }
  for (let i = 0; i < xs.length - 1; i++) {
    if (!WHITE_BLACK_AFTER[i]) continue;
    const cx = edges[i + 1], bw = (xs[i + 1] - xs[i]) * 0.56;
    g.beginPath();
    g.roundRect(cx - bw / 2, y, bw, kh * 0.6, [0, 0, 3, 3]);
    g.fillStyle = 'rgba(8,12,22,0.82)';
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.3)';
    g.stroke();
  }
  g.restore();
}
