// Gwiazdka: Gzofajfus Classic Mk V with flame, exhaust smoke, ejection and the blue parachute.
import * as THREE from 'three';

const L = 1.25, RAD = 0.04;

function labelTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#f1f0eb'; g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#141414';
  g.font = '800 54px -apple-system, "Helvetica Neue", Arial, sans-serif';
  g.textBaseline = 'middle';
  g.fillText('GZOFAJFUS', 24, 52);
  g.font = '600 26px -apple-system, "Helvetica Neue", Arial, sans-serif';
  g.fillText('MK V  ·  GZOWO LABS', 26, 100);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export class Rocket {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    const white = new THREE.MeshStandardMaterial({ color: 0xf1f0eb, roughness: 0.5, metalness: 0 });
    const orange = new THREE.MeshStandardMaterial({ color: 0xe8461c, roughness: 0.45, metalness: 0 });
    const black = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.4, metalness: 0.1 });
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(RAD, RAD, 0.5, 20), orange);
    lower.position.y = 0.25;
    const labelMat = new THREE.MeshStandardMaterial({ map: labelTexture(), roughness: 0.5 });
    const upperGeo = new THREE.CylinderGeometry(RAD, RAD, 0.48, 20, 1, true);
    const uv = upperGeo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i) * 4);
    labelMat.map.wrapS = labelMat.map.wrapT = THREE.RepeatWrapping;
    const upper = new THREE.Mesh(upperGeo, labelMat);
    upper.position.y = 0.74;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(RAD + 0.001, RAD + 0.001, 0.012, 20), black);
    ring.position.y = 0.5;
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(RAD * 0.55, RAD * 0.7, 0.05, 14), black);
    nozzle.position.y = -0.02;
    this.body.add(lower, upper, ring, nozzle);
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      pts.push(new THREE.Vector2(RAD * Math.sqrt(1 - t * t * 0.98) * (1 - t * 0.02), t * 0.28));
    }
    pts.push(new THREE.Vector2(0, 0.28));
    this.nose = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), black);
    this.nose.position.y = 0.98;
    this.body.add(this.nose);
    const fin = new THREE.Shape();
    fin.moveTo(0, 0); fin.lineTo(0, 0.17); fin.lineTo(0.09, 0.06); fin.lineTo(0.09, -0.02); fin.closePath();
    const finGeo = new THREE.ExtrudeGeometry(fin, { depth: 0.004, bevelEnabled: false }).translate(0, 0, -0.002);
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(finGeo, black);
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      f.position.set(Math.cos(a) * RAD, 0.01, Math.sin(a) * RAD);
      f.rotation.y = -a;
      this.body.add(f);
    }
    const lug = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 6), white);
    lug.position.set(RAD + 0.006, 0.6, 0);
    this.body.add(lug);

    this.flameU = { uTime: { value: 0 }, uPower: { value: 0 } };
    const flameMat = (inner) => new THREE.ShaderMaterial({
      uniforms: this.flameU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uTime; uniform float uPower; varying float vT; varying float vR;
        void main(){ vT = uv.y; vR = uv.x; vec3 p = position;
          float wob = sin(uTime * 41.0 + p.y * 30.0) * 0.08 + sin(uTime * 23.0) * 0.06;
          p.xz *= 1.0 + wob * (1.0 - uv.y);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
      fragmentShader: inner
        ? `uniform float uPower; varying float vT; void main(){ float a = pow(1.0 - vT, 0.6) * uPower; gl_FragColor = vec4(1.0, 0.95, 0.82, a); }`
        : `uniform float uPower; varying float vT; void main(){ float a = pow(1.0 - vT, 1.4) * uPower * 0.85; vec3 c = mix(vec3(1.0, 0.55, 0.18), vec3(1.0, 0.82, 0.45), 1.0 - vT); gl_FragColor = vec4(c, a); }`,
    });
    const outer = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.62, 14, 1, true).rotateX(Math.PI).translate(0, -0.31, 0), flameMat(false));
    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.26, 12, 1, true).rotateX(Math.PI).translate(0, -0.13, 0), flameMat(true));
    this.flame = new THREE.Group();
    this.flame.add(outer, inner);
    this.flame.position.y = -0.04;
    this.body.add(this.flame);
    this.light = new THREE.PointLight(0xff9a4a, 0, 16, 1.7);
    this.light.position.y = -0.35;
    this.body.add(this.light);

    this.glowMat = new THREE.MeshBasicMaterial({ color: 0xfff1cc, transparent: true, opacity: 0 });
    this.noseGlow = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), this.glowMat);
    this.noseGlow.position.y = 1.0;
    this.body.add(this.noseGlow);

    this.buildChute();
    this.buildSmoke();
    scene.add(this.root);
    this.power = 0;
    this.vel = new THREE.Vector3();
    this.ejected = false;
  }

  buildChute() {
    const g = new THREE.SphereGeometry(0.62, 16, 5, 0, Math.PI * 2, 0, Math.PI * 0.42).toNonIndexed();
    const p = g.attributes.position, c = new Float32Array(p.count * 3);
    const a = new THREE.Color(0x2463d4), b = new THREE.Color(0x5b93ef);
    for (let i = 0; i < p.count; i += 3) {
      const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
      const k = Math.floor(((Math.atan2(cz, cx) + Math.PI) / (Math.PI * 2)) * 16) % 2 ? a : b;
      for (let j = 0; j < 3; j++) { c[(i + j) * 3] = k.r; c[(i + j) * 3 + 1] = k.g; c[(i + j) * 3 + 2] = k.b; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    g.computeVertexNormals();
    this.canopy = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide, emissive: 0x0a1a3a }));
    const lines = [];
    const rim = 0.62 * Math.sin(Math.PI * 0.42), rimY = 0.62 * Math.cos(Math.PI * 0.42);
    for (let i = 0; i < 8; i++) {
      const an = (i / 8) * Math.PI * 2;
      lines.push(Math.cos(an) * rim, rimY, Math.sin(an) * rim, 0, -0.95, 0);
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    this.shrouds = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xe9eef5, transparent: true, opacity: 0.8 }));
    this.chute = new THREE.Group();
    this.chute.add(this.canopy, this.shrouds);
    this.chute.visible = false;
    this.cord = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xffb02e }));
    this.cord.visible = false;
    this.cord.frustumCulled = false;
    this.scene.add(this.chute, this.cord);
  }

  buildSmoke() {
    const N = 220;
    this.smoke = { n: N, i: 0, pos: new Float32Array(N * 3), vel: new Float32Array(N * 3), age: new Float32Array(N).fill(99), life: new Float32Array(N), size: new Float32Array(N), grow: new Float32Array(N) };
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.smoke.pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(N), 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(N), 1));
    g.setAttribute('aWarm', new THREE.BufferAttribute(new Float32Array(N), 1));
    this.smokeU = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uScale: { value: 600 } }]);
    this.smokePts = new THREE.Points(g, new THREE.ShaderMaterial({
      uniforms: this.smokeU, transparent: true, depthWrite: false, fog: true,
      vertexShader: `attribute float aSize; attribute float aAlpha; attribute float aWarm; uniform float uScale; varying float vA; varying float vW;
        #include <fog_pars_vertex>
        void main(){ vA = aAlpha; vW = aWarm; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uScale / max(0.2, -mvPosition.z); gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `varying float vA; varying float vW;
        #include <fog_pars_fragment>
        void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q); float a = smoothstep(0.5, 0.05, d) * vA; if (a < 0.004) discard;
          vec3 c = mix(vec3(0.62, 0.66, 0.74), vec3(1.0, 0.72, 0.45), vW);
          gl_FragColor = vec4(c, a);
          #include <fog_fragment>
        }`,
    }));
    this.smokePts.frustumCulled = false;
    this.smokePts.renderOrder = 4;
    this.scene.add(this.smokePts);
  }

  puff(p, v, life, size, grow) {
    const s = this.smoke, i = s.i;
    s.i = (s.i + 1) % s.n;
    s.pos[i * 3] = p.x; s.pos[i * 3 + 1] = p.y; s.pos[i * 3 + 2] = p.z;
    s.vel[i * 3] = v.x; s.vel[i * 3 + 1] = v.y; s.vel[i * 3 + 2] = v.z;
    s.age[i] = 0; s.life[i] = life; s.size[i] = size; s.grow[i] = grow;
  }

  ignitionBurst(groundY) {
    const p = new THREE.Vector3(), v = new THREE.Vector3();
    for (let k = 0; k < 70; k++) {
      const a = Math.random() * Math.PI * 2, sp = 0.6 + Math.random() * 2.2;
      p.set(this.root.position.x + Math.cos(a) * 0.15, groundY + 0.1 + Math.random() * 0.3, this.root.position.z + Math.sin(a) * 0.15);
      v.set(Math.cos(a) * sp, 0.15 + Math.random() * 0.6, Math.sin(a) * sp);
      this.puff(p, v, 2.5 + Math.random() * 3, 0.35 + Math.random() * 0.4, 0.9 + Math.random() * 0.8);
    }
  }

  updateSmoke(dt) {
    const s = this.smoke, g = this.smokePts.geometry;
    const size = g.attributes.aSize.array, alpha = g.attributes.aAlpha.array, warm = g.attributes.aWarm.array;
    const fp = this.root.position;
    for (let i = 0; i < s.n; i++) {
      s.age[i] += dt;
      const t = s.age[i] / s.life[i];
      if (t >= 1) { alpha[i] = 0; size[i] = 0; continue; }
      const drag = Math.exp(-dt * 1.6);
      s.vel[i * 3] = s.vel[i * 3] * drag + 0.25 * dt;
      s.vel[i * 3 + 1] = s.vel[i * 3 + 1] * drag + 0.05 * dt;
      s.vel[i * 3 + 2] *= drag;
      s.pos[i * 3] += s.vel[i * 3] * dt;
      s.pos[i * 3 + 1] += s.vel[i * 3 + 1] * dt;
      s.pos[i * 3 + 2] += s.vel[i * 3 + 2] * dt;
      size[i] = s.size[i] + s.grow[i] * s.age[i];
      alpha[i] = Math.min(1, t * 12) * Math.pow(1 - t, 1.6) * 0.42;
      const dy = s.pos[i * 3 + 1] - fp.y, dx = s.pos[i * 3] - fp.x, dz = s.pos[i * 3 + 2] - fp.z;
      warm[i] = this.power * Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy + dz * dz) / 3.5) * 0.8;
    }
    g.attributes.position.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
    g.attributes.aWarm.needsUpdate = true;
  }

  reset(pos) {
    this.root.position.copy(pos);
    this.root.rotation.set(0, 0, 0);
    this.body.rotation.set(0, 0, 0);
    this.body.position.set(0, 0, 0);
    this.nose.position.set(0, 0.98, 0);
    this.nose.rotation.set(0, 0, 0);
    this.body.add(this.nose);
    this.power = 0;
    this.ejected = false;
    this.chute.visible = false;
    this.cord.visible = false;
    this.glowMat.opacity = 0;
    this.smoke.age.fill(99);
  }

  eject() {
    this.ejected = true;
    this.ejectT = 0;
    const wp = new THREE.Vector3();
    this.nose.getWorldPosition(wp);
    this.scene.add(this.nose);
    this.nose.position.copy(wp);
    this.noseVel = new THREE.Vector3(0.6, 3.2, -0.4);
    this.chute.visible = true;
    this.chute.scale.setScalar(0.05);
    this.chute.position.copy(wp);
    this.cord.visible = true;
    this.fall = new THREE.Vector3(0, 0, 0);
    const p = new THREE.Vector3(), v = new THREE.Vector3();
    for (let k = 0; k < 16; k++) {
      p.copy(wp);
      v.set((Math.random() - 0.5) * 1.2, 1 + Math.random() * 1.5, (Math.random() - 0.5) * 1.2);
      this.puff(p, v, 1.5 + Math.random(), 0.12, 0.5);
    }
  }

  teleport(p) {
    const d = p.clone().sub(this.root.position);
    this.root.position.add(d);
    this.chute.position.add(d);
    if (this.nose.parent === this.scene) this.nose.position.add(d);
  }

  update(dt, t) {
    this.flameU.uTime.value = t;
    this.flameU.uPower.value = this.power;
    const fl = 0.85 + Math.sin(t * 53) * 0.08 + Math.sin(t * 31 + 1) * 0.07;
    this.flame.scale.set(1, this.power * fl * 1.15 + 0.001, 1);
    this.flame.visible = this.power > 0.01;
    this.light.intensity = this.power * 5.5 * fl;
    if (this.ejected) {
      this.ejectT += dt;
      const e = this.ejectT;
      const open = Math.min(1, e / 0.9);
      const k = 1 + 2.2 * Math.pow(open - 1, 3) + 1.2 * Math.pow(open - 1, 2);
      this.chute.scale.setScalar(Math.max(0.05, k));
      this.fall.y = Math.max(-2.2, this.fall.y - dt * (e < 0.8 ? 6 : 1.5));
      if (e > 1.2) this.fall.y += (-2.2 - this.fall.y) * Math.min(1, dt * 2);
      this.root.position.addScaledVector(this.fall, dt);
      const sway = Math.sin(e * 1.3) * 0.12;
      const target = this.root.position.clone().add(new THREE.Vector3(Math.sin(e * 0.9) * 0.3, 2.6 * Math.min(1, e * 1.5) + 0.6, 0));
      this.chute.position.lerp(target, Math.min(1, dt * 4));
      this.chute.rotation.set(sway, 0, sway * 0.7);
      this.body.rotation.z += (1.15 - this.body.rotation.z) * Math.min(1, dt * 1.5);
      this.noseVel.y -= 9.8 * dt;
      this.nose.position.addScaledVector(this.noseVel, dt);
      const conf = this.chute.position.clone().add(new THREE.Vector3(0, -0.95 * this.chute.scale.y, 0));
      if (e > 0.25) {
        const to = conf.clone().add(new THREE.Vector3(0.12, -0.25, 0));
        this.nose.position.lerp(to, Math.min(1, dt * 5));
        this.noseVel.multiplyScalar(0.9);
        this.nose.rotation.z += (1.2 - this.nose.rotation.z) * Math.min(1, dt * 2);
      }
      const top = new THREE.Vector3(0, 1.0, 0);
      this.body.localToWorld(top);
      const pa = this.cord.geometry.attributes.position;
      pa.setXYZ(0, top.x, top.y, top.z);
      pa.setXYZ(1, this.nose.position.x, this.nose.position.y, this.nose.position.z);
      pa.setXYZ(2, conf.x, conf.y, conf.z);
      pa.needsUpdate = true;
    }
    this.updateSmoke(dt);
  }
}
