// Gwiazdka: Gzowo 34 on Christmas Eve. Terrain, Narew, house, cabins, pines, sky, clouds, snow.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const CLOUD_BASE = 112;
export const CLOUD_TOP = 150;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = rng(2412);
const rr = (a, b) => a + (b - a) * R();
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const col = (hex) => new THREE.Color(hex);

function edgeZ(x) { return -18 + 2.2 * Math.sin(x * 0.031 + 0.4) + 1.3 * Math.sin(x * 0.083 + 2.1); }
function shoreZ(x) { return -42 + 3 * Math.sin(x * 0.022 + 1.3) + 1.6 * Math.sin(x * 0.061); }

export function heightAt(x, z) {
  const e = edgeZ(x);
  const top = 8 + 0.3 * Math.sin(x * 0.06 + z * 0.045) + 0.22 * Math.sin(x * 0.13 - z * 0.11) + Math.max(0, z - e - 40) * 0.035;
  const valley = 0.35 + 0.15 * Math.sin(x * 0.09 + z * 0.07);
  let h = valley + (top - valley) * ss(e - 12, e + 0.5, z);
  const sh = shoreZ(x);
  h -= ss(sh + 2, sh - 7, z) * 2.2;
  h += ss(-165, -190, z) * 2.6 + ss(-190, -260, z) * 3;
  return h;
}

export const PAD = new THREE.Vector3(14, heightAt(14, -12), -12);
export const HOUSE = new THREE.Vector3(0, 8.05, -6);

const PATH = [[-24, 12], [-12, 6], [-4, 1], [6, -1], [13, -8], [18, -2], [24, 6], [31, 14], [19, 18]];
function pathDist(x, z) {
  let d = 1e9;
  for (let i = 0; i < PATH.length - 1; i++) {
    const [ax, az] = PATH[i], [bx, bz] = PATH[i + 1];
    const vx = bx - ax, vz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
    d = Math.min(d, Math.hypot(x - ax - vx * t, z - az - vz * t));
  }
  return d;
}

function axis(min, max, dmin, dmax, fine, coarse) {
  const a = [];
  let v = min;
  while (v < max) {
    a.push(v);
    const dist = v >= dmin && v <= dmax ? 0 : Math.min(Math.abs(v - dmin), Math.abs(v - dmax));
    v += Math.min(coarse, fine + dist * 0.09);
  }
  a.push(max);
  return a;
}

function faceColors(geo, fn) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position;
  const c = new Float32Array(p.count * 3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); d.fromBufferAttribute(p, i + 2);
    n.subVectors(d, b).cross(new THREE.Vector3().subVectors(a, b)).normalize();
    const cy = (a.y + b.y + d.y) / 3;
    const k = fn(n, cy);
    for (let j = 0; j < 3; j++) { c[(i + j) * 3] = k.r; c[(i + j) * 3 + 1] = k.g; c[(i + j) * 3 + 2] = k.b; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  g.computeVertexNormals();
  return g;
}

function lambert(hex, o = {}) { return new THREE.MeshLambertMaterial({ color: hex, flatShading: true, ...o }); }

export class World {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.low = !!opts.low;
    this.clear = opts.clear || [];
    this.windows = [];
    this.update$ = [];
    this.buildLights();
    this.buildSky();
    this.buildTerrain();
    this.buildWater();
    this.buildFarBank();
    this.buildPines();
    this.buildHouse();
    this.buildSpruce();
    this.buildCabins();
    this.buildWiata();
    this.buildPad();
    this.buildClouds();
    this.buildSnow();
  }

  buildLights() {
    const s = this.scene;
    this.hemi = new THREE.HemisphereLight(0x6b7fa8, 0x1c212c, 1.15);
    s.add(this.hemi);
    this.moonDir = new THREE.Vector3(-0.42, 0.52, -0.74).normalize();
    this.moon = new THREE.DirectionalLight(0xbcd0ff, 0.15);
    this.moon.position.copy(this.moonDir).multiplyScalar(100);
    s.add(this.moon, this.moon.target);
    this.houseLight = new THREE.PointLight(0xffa860, 60, 34, 1.6);
    this.houseLight.position.set(HOUSE.x, HOUSE.y + 2.4, HOUSE.z - 1.5);
    s.add(this.houseLight);
    this.cabinLight = new THREE.PointLight(0xffa458, 0, 14, 1.8);
    s.add(this.cabinLight);
    this.spruceLight = new THREE.PointLight(0xffc27a, 0, 16, 1.8);
    s.add(this.spruceLight);
  }

  buildSky() {
    this.sky = new THREE.Group();
    this.skyU = {
      top: { value: col(0x172238) },
      mid: { value: col(0x33405e) },
      bot: { value: col(0x4a5675) },
      warm: { value: col(0x6a5a72) },
    };
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1500, 32, 16),
      new THREE.ShaderMaterial({
        uniforms: this.skyU,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bot; uniform vec3 warm; varying vec3 vDir;
          void main(){ vec3 d = normalize(vDir); float h = d.y;
            vec3 c = mix(mid, top, smoothstep(0.02, 0.55, h));
            c = mix(bot, c, smoothstep(-0.08, 0.1, h));
            float w = pow(max(0.0, dot(normalize(vec2(d.x, d.z)), normalize(vec2(-0.9, 0.45)))), 3.0) * (1.0 - smoothstep(0.0, 0.25, abs(h)));
            c = mix(c, warm, w * 0.55);
            gl_FragColor = vec4(c, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      })
    );
    dome.renderOrder = -10;
    this.sky.add(dome);

    const N = this.low ? 1400 : 2800;
    const pos = new Float32Array(N * 3), sz = new Float32Array(N), ph = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const u = R(), v = rr(-0.08, 1);
      const th = u * Math.PI * 2, y = Math.sign(v) * Math.pow(Math.abs(v), 0.8), r = Math.sqrt(1 - y * y);
      pos[i * 3] = Math.cos(th) * r * 1400; pos[i * 3 + 1] = y * 1400; pos[i * 3 + 2] = Math.sin(th) * r * 1400;
      sz[i] = Math.pow(R(), 7) * 4.2 + 1.2;
      ph[i] = R() * 100;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sg.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
    sg.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1));
    this.starU = { uOpacity: { value: 0 }, uTime: { value: 0 }, uPx: { value: 1 } };
    this.stars = new THREE.Points(sg, new THREE.ShaderMaterial({
      uniforms: this.starU, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float aSize; attribute float aPhase; uniform float uTime; uniform float uPx; varying float vA;
        void main(){ vA = 0.55 + 0.45 * sin(uTime * (1.3 + fract(aPhase) * 2.0) + aPhase);
          gl_PointSize = aSize * uPx; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uOpacity; varying float vA;
        void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vec3(0.86, 0.9, 1.0), a * vA * uOpacity); }`,
    }));
    this.stars.renderOrder = -9;
    this.sky.add(this.stars);

    const mc = document.createElement('canvas');
    mc.width = mc.height = 256;
    const g = mc.getContext('2d');
    g.fillStyle = '#e9ecf2';
    g.beginPath(); g.arc(128, 128, 122, 0, Math.PI * 2); g.fill();
    const MR = rng(77);
    for (let i = 0; i < 26; i++) {
      const x = 128 + (MR() - 0.5) * 170, y = 128 + (MR() - 0.5) * 170, r = 8 + MR() * 30;
      g.fillStyle = `rgba(150,160,178,${0.15 + MR() * 0.3})`;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    g.globalCompositeOperation = 'destination-in';
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(128, 128, 122, 0, Math.PI * 2); g.fill();
    const mt = new THREE.CanvasTexture(mc);
    mt.colorSpace = THREE.SRGBColorSpace;
    this.moonMesh = new THREE.Mesh(new THREE.PlaneGeometry(38, 38), new THREE.MeshBasicMaterial({ map: mt, transparent: true, fog: false, depthWrite: false, opacity: 0, toneMapped: false }));
    this.moonMesh.position.copy(this.moonDir).multiplyScalar(1300);
    this.moonMesh.lookAt(0, 0, 0);
    this.moonMesh.renderOrder = -8;
    this.sky.add(this.moonMesh);
    this.scene.add(this.sky);
  }

  buildTerrain() {
    const xs = axis(-460, 460, -75, 75, this.low ? 3 : 2, 16);
    const zs = axis(-520, 300, -55, 45, this.low ? 2 : 1.5, 16);
    const nx = xs.length, nz = zs.length;
    const pos = new Float32Array(nx * nz * 3), colr = new Float32Array(nx * nz * 3);
    const snow = col(0xe4eaf3), snowB = col(0xc8d3e4), soil = col(0x584a3e), sand = col(0x9a8f80), trod = col(0xb6c0cf), reed = col(0x6f6a4e);
    const c = new THREE.Color();
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = xs[i], z = zs[j], h = heightAt(x, z), k = (j * nx + i) * 3;
      pos[k] = x; pos[k + 1] = h; pos[k + 2] = z;
      const gx = heightAt(x + 0.8, z) - heightAt(x - 0.8, z), gz = heightAt(x, z + 0.8) - heightAt(x, z - 0.8);
      const slope = Math.hypot(gx, gz) / 1.6;
      const n = Math.sin(x * 0.37 + z * 0.23) * Math.sin(x * 0.11 - z * 0.31);
      c.copy(snow).lerp(snowB, 0.35 + 0.35 * n);
      if (slope > 0.55) c.lerp(soil, ss(0.55, 1.25, slope) * (0.55 + 0.3 * Math.sin(x * 1.7 + z * 0.9)));
      const sh = shoreZ(x);
      if (z < sh + 5 && z > sh - 3 && h > -0.4) c.lerp(sand, 0.45 * ss(sh + 5, sh + 1, z));
      if (z < sh + 2 && z > sh - 2 && Math.sin(x * 0.8) > 0.2) c.lerp(reed, 0.5);
      if (h > 7) c.lerp(trod, ss(1.6, 0.4, pathDist(x, z)) * 0.8);
      const pd = Math.hypot(x - PAD.x, z - PAD.z);
      if (pd < 3) c.lerp(trod, ss(3, 1, pd) * 0.6);
      colr[k] = c.r; colr[k + 1] = c.g; colr[k + 2] = c.b;
    }
    const idx = [];
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, d = a + nx, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colr, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    this.terrain = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    this.scene.add(this.terrain);
  }

  buildWater() {
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1200, 190), new THREE.MeshPhongMaterial({ color: 0x15233a, specular: 0x6a7a98, shininess: 120 }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.06, -133);
    this.scene.add(water);
    const ice = [];
    for (let x = -200; x < 200; x += rr(7, 14)) {
      const w = rr(8, 16), d = rr(2, 6), sh = shoreZ(x);
      const s = new THREE.Shape();
      s.moveTo(-w / 2, 0);
      for (let k = 0; k <= 6; k++) s.lineTo(-w / 2 + (w * k) / 6, -(d * (0.6 + 0.4 * Math.sin(k * 1.7 + x))));
      s.lineTo(w / 2, 1.5); s.lineTo(-w / 2, 1.5); s.closePath();
      const g = new THREE.ShapeGeometry(s);
      g.rotateX(-Math.PI / 2);
      g.translate(x, 0, sh - 1.2);
      ice.push(g);
    }
    for (let i = 0; i < 40; i++) {
      const g = new THREE.CircleGeometry(rr(0.8, 3.4), 6);
      g.rotateX(-Math.PI / 2);
      g.rotateY(R() * 3);
      g.scale(1, 1, rr(0.5, 1));
      const x = rr(-140, 140);
      g.translate(x, 0, shoreZ(x) - rr(8, 60));
      ice.push(g);
    }
    const im = new THREE.Mesh(mergeGeometries(ice), lambert(0xa3b2c8));
    im.position.y = -0.02;
    this.scene.add(im);
  }

  buildFarBank() {
    const cone = faceColors(new THREE.ConeGeometry(1, 1, 7, 2).translate(0, 0.5, 0), (n, y) => (n.y > 0.55 && R() > 0.4 ? col(0x9aa6b8) : col(0x18241f).lerp(col(0x24342c), R())));
    const spots = [];
    for (let i = 0; i < (this.low ? 380 : 640); i++) {
      const x = rr(-460, 460), z = rr(-200, -275);
      spots.push([x, z, rr(9, 19)]);
    }
    for (let i = 0; i < (this.low ? 220 : 360); i++) {
      const x = rr(-420, 420), z = rr(85, 260);
      if (Math.abs(x) < 60 && z < 120) continue;
      spots.push([x, z, rr(12, 22)]);
    }
    const im = new THREE.InstancedMesh(cone, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), spots.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    spots.forEach(([x, z, h], i) => {
      e.set(0, R() * 6, 0);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, heightAt(x, z) - 0.3, z), q, new THREE.Vector3(h * 0.28, h, h * 0.28));
      im.setMatrixAt(i, m);
    });
    this.scene.add(im);

    const lp = [];
    const hamlets = [[-260, -205], [-120, -212], [-30, -208], [70, -214], [190, -206], [310, -210]];
    for (const [hx, hz] of hamlets) {
      const n = 3 + Math.floor(R() * 6);
      for (let i = 0; i < n; i++) {
        const x = hx + rr(-22, 22), z = hz + rr(-5, 5);
        lp.push(x, heightAt(x, z) + rr(1.2, 3.5), z);
      }
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    this.villageMat = new THREE.PointsMaterial({ color: 0xffb466, size: 2.6, sizeAttenuation: false, transparent: true, opacity: 0.75, fog: false });
    this.scene.add(new THREE.Points(lg, this.villageMat));
  }

  free(x, z) {
    if (x > -10 && x < 10 && z > -19 && z < 2) return false;
    if (Math.hypot(x - PAD.x, z - PAD.z) < 9) return false;
    if (x > PAD.x - 9 && x < PAD.x + 9 && z > PAD.z && z < PAD.z + 14) return false;
    for (const [cx, cz] of [[24, 4], [32, 15], [18, 21], [-22, 12], [-8.2, -14.2]]) if (Math.hypot(x - cx, z - cz) < 6.5) return false;
    if (pathDist(x, z) < 1.4) return false;
    for (const [cx, cz, r] of this.clear) if (Math.hypot(x - cx, z - cz) < r) return false;
    return true;
  }

  buildPines() {
    const trunk = new THREE.CylinderGeometry(0.55, 1, 1, 7, 3).translate(0, 0.5, 0);
    {
      const p = trunk.attributes.position, c = new Float32Array(p.count * 3), lo = col(0x3d332d), hi = col(0xa8603a), t = new THREE.Color();
      for (let i = 0; i < p.count; i++) { t.copy(lo).lerp(hi, ss(0.25, 0.85, p.getY(i))); c[i * 3] = t.r; c[i * 3 + 1] = t.g; c[i * 3 + 2] = t.b; }
      trunk.setAttribute('color', new THREE.BufferAttribute(c, 3));
    }
    const blobBase = new THREE.IcosahedronGeometry(1, 0);
    blobBase.scale(1, 0.74, 1);
    const blob = faceColors(blobBase, (n) => (n.y > 0.42 ? col(0xdfe6f0).lerp(col(0xb9c6d8), R() * 0.6) : col(0x1f3326).lerp(col(0x2c4632), R())));
    const pines = [];
    let tries = 0;
    while (pines.length < (this.low ? 55 : 72) && tries++ < 4000) {
      const x = rr(-85, 85), z = rr(-45, 80);
      if (!this.free(x, z)) continue;
      if (z < -30 && R() > 0.25) continue;
      if (z < -17 && x > -48 && x < 34) continue;
      if (pines.some(p => Math.hypot(p.x - x, p.z - z) < 5)) continue;
      pines.push({ x, z, h: rr(12, 24) });
    }
    const crowns = [];
    const tm = new THREE.InstancedMesh(trunk, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), pines.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3();
    pines.forEach((p, i) => {
      e.set(rr(-0.05, 0.05), R() * 6, rr(-0.05, 0.05));
      q.setFromEuler(e);
      const base = new THREE.Vector3(p.x, heightAt(p.x, p.z) - 0.2, p.z), r = rr(0.18, 0.3);
      m.compose(base, q, new THREE.Vector3(r, p.h * 0.93, r));
      tm.setMatrixAt(i, m);
      const n = 5 + Math.floor(R() * 5), lean = R() * 6.28, lk = rr(0, 1.4);
      for (let k = 0; k < n; k++) {
        const a = R() * 6.28, d = k === 0 ? 0 : rr(0.7, 2.4), hy = k === 0 ? 0.97 : rr(0.7, 0.95);
        v.set(Math.cos(a) * d + Math.cos(lean) * lk * hy, p.h * hy, Math.sin(a) * d + Math.sin(lean) * lk * hy).applyQuaternion(q).add(base);
        crowns.push([v.clone(), rr(1.5, 3.0) * (k === 0 ? 1.15 : 1) * (0.8 + p.h / 60)]);
      }
    });
    const cm = new THREE.InstancedMesh(blob, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), crowns.length);
    crowns.forEach(([p, s], i) => {
      e.set(rr(-0.25, 0.25), R() * 6, rr(-0.25, 0.25));
      q.setFromEuler(e);
      m.compose(p, q, new THREE.Vector3(s * rr(0.85, 1.3), s * rr(0.72, 1.12), s * rr(0.85, 1.3)));
      cm.setMatrixAt(i, m);
    });
    this.scene.add(tm, cm);

    const small = [];
    tries = 0;
    while (small.length < (this.low ? 18 : 32) && tries++ < 3000) {
      const x = rr(-70, 70), z = rr(-40, 60);
      if (!this.free(x, z)) continue;
      if (pines.some(p => Math.hypot(p.x - x, p.z - z) < 2.5)) continue;
      small.push([x, z, rr(1.6, 4.6)]);
    }
    const sg = this.spruceGeometry(4, false);
    const sm = new THREE.InstancedMesh(sg, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), small.length);
    small.forEach(([x, z, h], i) => {
      e.set(0, R() * 6, 0); q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, heightAt(x, z) - 0.1, z), q, new THREE.Vector3(h, h, h));
      sm.setMatrixAt(i, m);
    });
    this.scene.add(sm);
  }

  spruceGeometry(tiers, dense) {
    const parts = [];
    for (let i = 0; i < tiers; i++) {
      const t = i / tiers;
      const r = 0.42 * (1 - t * 0.78), h = 0.42 * (1 - t * 0.35);
      const g = new THREE.ConeGeometry(r, h, dense ? 11 : 8, 1);
      g.translate(0, 0.12 + t * 0.72 + h / 2, 0);
      parts.push(g);
    }
    parts.push(new THREE.CylinderGeometry(0.03, 0.045, 0.2, 6).translate(0, 0.1, 0));
    const merged = mergeGeometries(parts.map(p => p.toNonIndexed()));
    return faceColors(merged, (n, y) => (y < 0.12 ? col(0x3b2c22) : n.y > 0.5 && R() > 0.35 ? col(0xe2e8f1) : col(0x1b3324).lerp(col(0x29472f), R())));
  }

  buildHouse() {
    const g = new THREE.Group();
    g.position.copy(HOUSE);
    const W = 12, D = 8, H = 3.1;
    const concrete = lambert(0x3b3e44), dark = lambert(0x202227), snow = lambert(0xe6ecf4), frame = lambert(0x121316);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 1.6, D + 0.4), concrete);
    plinth.position.y = -0.5;
    g.add(plinth);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 0.8, 0.36, D + 0.8), dark);
    roof.position.y = 0.3 + H + 0.18;
    const roofSnow = new THREE.Mesh(new THREE.BoxGeometry(W + 0.7, 0.16, D + 0.7), snow);
    roofSnow.position.y = roof.position.y + 0.26;
    g.add(roof, roofSnow);
    const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.25), lambert(0x2a2b2f));
    back.position.set(0, 0.3 + H / 2, D / 2 - 0.12);
    g.add(back);

    const warm = (hex, e = 0.35) => new THREE.MeshLambertMaterial({ color: hex, emissive: hex, emissiveIntensity: e, flatShading: true });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(W - 0.2, 0.06, D - 0.2), warm(0xd9d3c8, 0.12));
    floor.position.y = 0.33;
    const osb = new THREE.Mesh(new THREE.BoxGeometry(W - 0.3, H, 0.05), warm(0xb88f5c, 0.22));
    osb.position.set(0, 0.3 + H / 2, D / 2 - 0.28);
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(W - 0.2, 0.05, D - 0.2), warm(0xc79c69, 0.25));
    ceil.position.y = 0.3 + H - 0.04;
    g.add(floor, osb, ceil);
    for (let i = -2; i <= 2; i++) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(W - 0.4, 0.05, 0.06), frame);
      rail.position.set(0, 0.3 + H - 0.1, i * 1.4);
      g.add(rail);
    }
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.42, 8), new THREE.MeshBasicMaterial({ color: 0x5aa2ff }));
    lamp.position.set(-1.6, 0.3 + 2.1, D / 2 - 0.31);
    lamp.rotation.y = Math.PI;
    g.add(lamp);
    const onyx = new THREE.Mesh(new THREE.BoxGeometry(W - 0.6, 0.08, 0.04), new THREE.MeshBasicMaterial({ color: 0xffc98a }));
    onyx.position.set(0, 0.42, D / 2 - 0.32);
    g.add(onyx);

    const table = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.05, 1.1), warm(0xc9a77a, 0.2));
    top.position.y = 0.76;
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.02, 1.22), warm(0xf4f1ea, 0.35));
    cloth.position.y = 0.795;
    table.add(top, cloth);
    const lime = warm(0xb6d43c, 0.25);
    for (const sx of [-1.25, 1.25]) for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 0.05), lime);
      leg.position.set(sx + sz * 0.12, 0.38, sz * 0.38);
      leg.rotation.z = sz * 0.28;
      table.add(leg);
    }
    for (let i = 0; i < 8; i++) {
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.02, 12), warm(0xffffff, 0.3));
      plate.position.set(-1.2 + (i % 4) * 0.8, 0.815, i < 4 ? -0.36 : 0.36);
      table.add(plate);
    }
    for (const cx of [-0.4, 0.4]) {
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 8), warm(0xf6f1e4, 0.5));
      candle.position.set(cx, 0.92, 0);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffd08a }));
      flame.scale.y = 1.8;
      flame.position.set(cx, 1.06, 0);
      table.add(candle, flame);
    }
    table.position.set(1.2, 0.36, -0.6);
    g.add(table);

    const piano = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.13, 0.34), lambert(0x111113));
    body.position.y = 0.76;
    const keys = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.02, 0.15), warm(0xf2f2f2, 0.3));
    keys.position.set(0, 0.835, 0.08);
    piano.add(body, keys);
    for (const s of [-1, 1]) {
      const x = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.85, 0.04), lambert(0x111113));
      x.position.set(s * 0.35, 0.36, 0);
      x.rotation.z = s * 0.55;
      piano.add(x);
    }
    piano.position.set(4.2, 0.36, 2.6);
    piano.rotation.y = Math.PI;
    g.add(piano);

    const koza = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.9, 10), lambert(0x111113));
    koza.position.set(-4.8, 0.8, 2.4);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, H - 1.0, 8), lambert(0x111113));
    pipe.position.set(-4.8, 0.3 + 0.9 + (H - 1.0) / 2, 2.4);
    const fire = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.2), new THREE.MeshBasicMaterial({ color: 0xff8a3a }));
    fire.position.set(-4.8, 0.72, 2.1);
    fire.rotation.y = Math.PI;
    g.add(koza, pipe, fire);
    const sofa = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.75, 0.9), lambert(0x18181b));
    sofa.position.set(-2.6, 0.7, 1.6);
    g.add(sofa);

    const tree = new THREE.Mesh(this.spruceGeometry(5, true), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: 0x1a2a1c, emissiveIntensity: 0.6 }));
    tree.scale.setScalar(2.5);
    tree.position.set(-4.3, 0.36, -2.6);
    g.add(tree);
    const bulbs = [];
    for (let i = 0; i < 46; i++) {
      const t = i / 46, a = t * 30;
      const y = 0.25 + t * 1.85, r = (0.95 * (1 - t * 0.85));
      bulbs.push(new THREE.Vector3(-4.3 + Math.cos(a) * r, 0.36 + y, -2.6 + Math.sin(a) * r));
    }
    const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), bulbs.length);
    bulbs.forEach((p, i) => bm.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)));
    g.add(bm);

    const glass = new THREE.MeshBasicMaterial({ color: 0x9fb4c8, transparent: true, opacity: 0.1, depthWrite: false });
    const front = new THREE.Mesh(new THREE.PlaneGeometry(W, H), glass);
    front.position.set(0, 0.3 + H / 2, -D / 2);
    front.rotation.y = Math.PI;
    g.add(front);
    for (const s of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.PlaneGeometry(D, H), glass);
      side.position.set(s * W / 2, 0.3 + H / 2, 0);
      side.rotation.y = s * Math.PI / 2;
      g.add(side);
    }
    for (let i = 0; i <= 6; i++) {
      const mull = new THREE.Mesh(new THREE.BoxGeometry(0.07, H, 0.07), frame);
      mull.position.set(-W / 2 + (W * i) / 6, 0.3 + H / 2, -D / 2);
      g.add(mull);
    }
    for (const s of [-1, 1]) for (let i = 1; i < 4; i++) {
      const mull = new THREE.Mesh(new THREE.BoxGeometry(0.07, H, 0.07), frame);
      mull.position.set(s * W / 2, 0.3 + H / 2, -D / 2 + (D * i) / 4);
      g.add(mull);
    }
    const sill = new THREE.Mesh(new THREE.BoxGeometry(W + 0.1, 0.08, 0.1), frame);
    sill.position.set(0, 0.32, -D / 2);
    g.add(sill);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.22, 5.2), lambert(0x5e4a3a));
    deck.position.set(0.3, 0.05, -D / 2 - 2.65);
    const deckSnow = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.06, 3.8), snow);
    deckSnow.position.set(0.1, 0.19, -D / 2 - 3.1);
    g.add(deck, deckSnow);
    for (let i = 0; i < 12; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.01, 0.03), lambert(0x3c2f25));
      plank.position.set(0.3, 0.165, -D / 2 - 0.2 - i * 0.42);
      g.add(plank);
    }
    this.scene.add(g);
    this.house = g;
  }

  buildSpruce() {
    const x = -8.2, z = -14.2, y = heightAt(x, z) - 0.05;
    const s = new THREE.Mesh(this.spruceGeometry(6, true), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    s.scale.setScalar(4.8);
    s.position.set(x, y, z);
    this.scene.add(s);
    const n = this.low ? 60 : 90;
    this.spruceBulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), n);
    this.bulbOrder = [];
    for (let i = 0; i < n; i++) {
      const t = i / n, a = t * 44 + R() * 0.3;
      const h = 0.75 + t * 3.55, r = 1.9 * (1 - t * 0.86) + 0.06;
      this.spruceBulbs.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x + Math.cos(a) * r, y + h, z + Math.sin(a) * r));
      this.spruceBulbs.setColorAt(i, col(0x1d1d1f));
      this.bulbOrder.push(t);
    }
    this.scene.add(this.spruceBulbs);
    this.spruceLight.position.set(x, y + 2.4, z - 1.2);
    this.spruceTop = new THREE.Vector3(x, y + 4.6, z);
  }

  setSpruce(p) {
    const on = col(0xffd497), off = col(0x1d1d1f), c = new THREE.Color();
    for (let i = 0; i < this.bulbOrder.length; i++) {
      const k = ss(this.bulbOrder[i] - 0.04, this.bulbOrder[i] + 0.04, p * 1.1);
      c.copy(off).lerp(on, k);
      this.spruceBulbs.setColorAt(i, c);
    }
    this.spruceBulbs.instanceColor.needsUpdate = true;
    this.spruceLight.intensity = 9 * ss(0, 1, p);
  }

  buildCabins() {
    const defs = [[24, 4, 0.3, true, 'Ośrodek Wypoczynkowy'], [32, 15, -0.2, false], [18, 21, 1.5, false]];
    for (const [x, z, rot, lit, sign] of defs) {
      const g = new THREE.Group();
      g.position.set(x, heightAt(x, z) + 0.3, z);
      g.rotation.y = rot;
      const w = 3.6, hw = 2.2, rh = 1.3, d = 3.2;
      const shape = new THREE.Shape();
      shape.moveTo(-w / 2, 0); shape.lineTo(w / 2, 0); shape.lineTo(w / 2, hw); shape.lineTo(0, hw + rh); shape.lineTo(-w / 2, hw); shape.closePath();
      const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false }).translate(0, 0, -d / 2), lambert(0x3a2d25));
      g.add(body);
      for (let k = 1; k < 7; k++) {
        const board = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.025, d + 0.02), lambert(0x2a211b));
        board.position.y = k * 0.34;
        g.add(board);
      }
      const ang = Math.atan2(rh, w / 2), len = Math.hypot(w / 2, rh) + 0.45;
      for (const s of [-1, 1]) {
        const slab = new THREE.Mesh(new THREE.BoxGeometry(len, 0.1, d + 0.7), lambert(0x222326));
        slab.position.set(s * (w / 4 + 0.08), hw + rh / 2 + 0.06, 0);
        slab.rotation.z = -s * ang;
        const sn = new THREE.Mesh(new THREE.BoxGeometry(len - 0.05, 0.14, d + 0.6), lambert(0xe3e9f2));
        sn.position.set(s * (w / 4 + 0.08 - Math.sin(ang) * 0.1 * s * s), hw + rh / 2 + 0.17, 0);
        sn.rotation.z = -s * ang;
        g.add(slab, sn);
      }
      const red = lambert(0x7e2a22);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.85, 0.06), red);
      door.position.set(-0.8, 0.93, d / 2 + 0.02);
      const fr = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.85, 0.06), red);
      fr.position.set(0.75, 1.3, d / 2 + 0.02);
      const winMat = new THREE.MeshLambertMaterial({ color: 0x141b26, emissive: 0xffa95a, emissiveIntensity: lit ? 1 : 0 });
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.68), winMat);
      win.position.set(0.75, 1.3, d / 2 + 0.06);
      g.add(door, fr, win);
      this.windows.push({ mat: winMat, lit });
      for (const bx of [-1.6, 1.6]) for (const bz of [-1.4, 1.4]) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.5, 0.36), lambert(0x6b6e74));
        b.position.set(bx, -0.2, bz);
        g.add(b);
      }
      if (sign) {
        const c = document.createElement('canvas');
        c.width = 256; c.height = 48;
        const cx = c.getContext('2d');
        cx.fillStyle = '#f2f0ea'; cx.fillRect(0, 0, 256, 48);
        cx.fillStyle = '#222'; cx.font = '600 22px -apple-system, Helvetica, Arial'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
        cx.fillText(sign, 128, 25);
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
        const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.17), new THREE.MeshLambertMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.15 }));
        plate.position.set(-0.8, 2.05, d / 2 + 0.04);
        g.add(plate);
      }
      if (lit) {
        const wp = new THREE.Vector3(0.75, 1.3, d / 2 + 1.3).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot).add(g.position);
        this.cabinLight.position.copy(wp);
        this.cabinLight.intensity = 6;
      }
      if (!lit && x > 30) {
        const logs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09, 0.09, 0.55, 7).rotateZ(Math.PI / 2), lambert(0x8a6a4c), 24);
        for (let i = 0; i < 24; i++) {
          logs.setMatrixAt(i, new THREE.Matrix4().makeTranslation(w / 2 + 0.45, 0.0 + Math.floor(i / 6) * 0.17, -1.2 + (i % 6) * 0.19 + (Math.floor(i / 6) % 2) * 0.08));
        }
        logs.rotation.y = Math.PI / 2;
        logs.position.set(w / 2 + 0.4, -0.1, 0);
        g.add(logs);
      }
      this.scene.add(g);
    }
  }

  buildWiata() {
    const g = new THREE.Group();
    const x = -22, z = 12;
    g.position.set(x, heightAt(x, z), z);
    g.rotation.y = -0.4;
    const wood = lambert(0x4a3a2e);
    for (const sx of [-2, 2]) for (const sz of [-1.6, 1.6]) {
      const h = sz < 0 ? 2.9 : 2.4;
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, h, 0.16), wood);
      p.position.set(sx, h / 2, sz);
      g.add(p);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.14, 4.0), lambert(0x26272b));
    roof.position.set(0, 2.72, 0);
    roof.rotation.x = 0.15;
    const sn = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.16, 3.9), lambert(0xe3e9f2));
    sn.position.set(0, 2.86, 0.02);
    sn.rotation.x = 0.15;
    g.add(roof, sn);
    const logs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 7).rotateX(Math.PI / 2), lambert(0x8f6e50), 40);
    for (let i = 0; i < 40; i++) logs.setMatrixAt(i, new THREE.Matrix4().makeTranslation(-1.5 + (i % 10) * 0.21 + (Math.floor(i / 10) % 2) * 0.1, 0.1 + Math.floor(i / 10) * 0.19, 1.1));
    g.add(logs);
    const chair = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.6), lambert(0x355c8a));
    seat.position.y = 0.42;
    const backr = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.08), lambert(0xd7d2c2));
    backr.position.set(0, 0.72, 0.3);
    backr.rotation.x = -0.3;
    chair.add(seat, backr);
    chair.position.set(0.8, 0, -0.3);
    chair.rotation.y = 0.6;
    g.add(chair);
    this.scene.add(g);
  }

  buildPad() {
    const g = new THREE.Group();
    g.position.copy(PAD);
    const steel = new THREE.MeshStandardMaterial({ color: 0x8a8f96, metalness: 0.7, roughness: 0.45 });
    const black = lambert(0x161618);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.4;
      const foot = new THREE.Vector3(Math.cos(a) * 0.42, -0.05, Math.sin(a) * 0.42), head = new THREE.Vector3(0, 0.68, 0);
      const dir = head.clone().sub(foot);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, dir.length(), 5), black);
      leg.position.copy(foot).addScaledVector(dir, 0.5);
      leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      g.add(leg);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.08, 8), black);
    hub.position.y = 0.68;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.008, 0.22), steel);
    plate.position.y = 0.73;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1.5, 5), steel);
    rod.position.set(0.055, 0.73 + 0.75, 0);
    g.add(hub, plate, rod);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 0.14), lambert(0xd8b02a));
    box.position.set(1.8, 0.05, 4.6);
    box.rotation.y = 0.4;
    g.add(box);
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      pts.push(new THREE.Vector3(0.05 + 1.75 * t, 0.68 * (1 - t) * (1 - t) + 0.02, 0.0 + 4.6 * t + Math.sin(t * 3) * 0.3));
    }
    const cable = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x0c0c0d }));
    g.add(cable);
    const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.1, 5), lambert(0x6c4f36));
    stake.position.set(-1.3, 0.55, 1.1);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.2), new THREE.MeshLambertMaterial({ color: 0xff7a1a, side: THREE.DoubleSide }));
    flag.position.set(-1.14, 1.0, 1.1);
    this.flag = flag;
    g.add(stake, flag);
    this.scene.add(g);
    this.padTop = PAD.clone().add(new THREE.Vector3(0, 0.735, 0));
    this.rodX = 0.055;
  }

  buildClouds() {
    const N = this.low ? 1000 : 1600;
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, emissive: 0x1b2232 });
    const im = new THREE.InstancedMesh(geo, mat, N);
    this.cloudBase = [];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
    let i = 0, tries = 0;
    while (i < N && tries++ < 20000) {
      const a = R() * Math.PI * 2, r = Math.sqrt(R()) * 600;
      const x = PAD.x + Math.cos(a) * r, z = PAD.z + Math.sin(a) * r;
      const sx = rr(18, 40), sy = rr(7, 14), sz = rr(18, 40);
      const dc = Math.hypot(x - PAD.x, (z - PAD.z) * 0.85);
      if (dc < 15 + sx * 0.75) continue;
      const y = rr(CLOUD_BASE + sy * 0.6, CLOUD_TOP - sy * 0.4);
      e.set(rr(-0.2, 0.2), R() * 6, rr(-0.2, 0.2));
      q.setFromEuler(e);
      const p = new THREE.Vector3(x, y, z), s = new THREE.Vector3(sx, sy, sz);
      this.cloudBase.push({ p, q: q.clone(), s });
      m.compose(p, q, s);
      im.setMatrixAt(i, m);
      c.setHex(0x8e99b0).lerp(col(0xaab3c6), R());
      im.setColorAt(i, c);
      i++;
    }
    im.count = i;
    this.clouds = im;
    this.scene.add(im);
    this.holeR = 0;
  }

  setHole(cx, cz, r) {
    if (Math.abs(r - this.holeR) < 0.05 && this.holeC && this.holeC[0] === cx) return;
    this.holeR = r;
    this.holeC = [cx, cz];
    const m = new THREE.Matrix4(), s = new THREE.Vector3(), p = new THREE.Vector3();
    this.cloudBase.forEach((b, i) => {
      const dx = b.p.x - cx, dz = b.p.z - cz, d = Math.hypot(dx, dz);
      const k = r <= 0 ? 1 : ss(r * 0.75, r * 1.25 + 20, d);
      const push = (1 - k) * 30;
      p.set(b.p.x + (dx / (d || 1)) * push, b.p.y, b.p.z + (dz / (d || 1)) * push);
      s.copy(b.s).multiplyScalar(Math.max(0.0001, k));
      m.compose(p, b.q, s);
      this.clouds.setMatrixAt(i, m);
    });
    this.clouds.instanceMatrix.needsUpdate = true;
  }

  buildSnow() {
    const N = this.low ? 1400 : 3200;
    const seed = new Float32Array(N * 3), sz = new Float32Array(N);
    for (let i = 0; i < N; i++) { seed[i * 3] = R(); seed[i * 3 + 1] = R(); seed[i * 3 + 2] = R(); sz[i] = rr(0.018, 0.05); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
    this.snowU = { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uBox: { value: 34 }, uOpacity: { value: 1 }, uScale: { value: 600 }, uWind: { value: 0.4 } };
    this.snow = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.snowU, transparent: true, depthWrite: false,
      vertexShader: `attribute vec3 seed; attribute float aSize; uniform float uTime; uniform vec3 uCam; uniform float uBox; uniform float uOpacity; uniform float uScale; uniform float uWind; varying float vA;
        void main(){ vec3 p = seed * uBox;
          p.y -= uTime * (0.75 + seed.x * 0.55);
          p.x += sin(uTime * 0.7 + seed.z * 12.0) * 0.5 + uTime * uWind;
          p.z += cos(uTime * 0.5 + seed.y * 9.0) * 0.45;
          p = mod(p - uCam + 0.5 * uBox, uBox) - 0.5 * uBox + uCam;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); float d = -mv.z;
          vA = uOpacity * smoothstep(0.9, 2.6, d) * (1.0 - smoothstep(uBox * 0.32, uBox * 0.5, d));
          gl_PointSize = clamp(aSize * uScale / max(d, 0.1), 1.0, 9.0);
          gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.12, d) * vA; if (a < 0.01) discard; gl_FragColor = vec4(0.93, 0.95, 1.0, a); }`,
    }));
    this.snow.frustumCulled = false;
    this.snow.renderOrder = 5;
    this.scene.add(this.snow);
  }

  setAtmos(a) {
    const s = this.scene;
    s.fog.color.copy(a.fog);
    s.fog.density = a.density;
    this.skyU.top.value.copy(a.top);
    this.skyU.mid.value.copy(a.mid);
    this.skyU.bot.value.copy(a.bot);
    this.skyU.warm.value.copy(a.warm);
    this.starU.uOpacity.value = a.stars;
    this.moonMesh.material.opacity = a.moon;
    this.moon.intensity = a.moonLight;
    this.hemi.intensity = a.hemi;
    this.snowU.uOpacity.value = a.snow;
  }

  update(dt, t, camera, pxScale) {
    this.sky.position.copy(camera.position);
    this.starU.uTime.value = t;
    this.starU.uPx.value = pxScale;
    this.snowU.uTime.value = t;
    this.snowU.uCam.value.copy(camera.position);
    if (this.flag) {
      this.flag.rotation.y = Math.sin(t * 1.3) * 0.25 * this.windAmt;
      this.flag.scale.x = 1 - 0.1 * Math.abs(Math.sin(t * 2.1)) * this.windAmt;
    }
    this.houseLight.intensity = 60 * (0.97 + 0.03 * Math.sin(t * 7.1) * Math.sin(t * 3.3));
  }
}
World.prototype.windAmt = 1;
