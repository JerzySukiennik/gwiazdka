// Gwiazdka: the wrapped present that opens onto a box full of night with one star inside.
import * as THREE from 'three';

export function starTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const m = 128;
  const ray = (ang, len, w, a) => {
    g.save();
    g.translate(m, m);
    g.rotate(ang);
    const gr = g.createLinearGradient(0, 0, len, 0);
    gr.addColorStop(0, `rgba(255,248,230,${a})`);
    gr.addColorStop(1, 'rgba(255,240,210,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(0, -w); g.lineTo(len, 0); g.lineTo(0, w); g.closePath();
    g.fill();
    g.restore();
  };
  for (let i = 0; i < 4; i++) ray((i * Math.PI) / 2, 124, 2.6, 1);
  for (let i = 0; i < 4; i++) ray((i * Math.PI) / 2 + Math.PI / 4, 58, 1.6, 0.6);
  const core = g.createRadialGradient(m, m, 0, m, m, 30);
  core.addColorStop(0, 'rgba(255,255,255,1)');
  core.addColorStop(0.28, 'rgba(255,246,222,0.95)');
  core.addColorStop(0.6, 'rgba(255,214,150,0.25)');
  core.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = core;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function kraftTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#b48a5c';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * 512, y = Math.random() * 512, l = 4 + Math.random() * 14, a = Math.random() * Math.PI;
    g.strokeStyle = Math.random() < 0.5 ? `rgba(90,60,30,${0.05 + Math.random() * 0.08})` : `rgba(230,200,160,${0.05 + Math.random() * 0.08})`;
    g.lineWidth = 0.6 + Math.random();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function nightTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(256, 256, 20, 256, 256, 360);
  gr.addColorStop(0, '#13234a');
  gr.addColorStop(1, '#050a18');
  g.fillStyle = gr;
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) {
    const r = Math.pow(Math.random(), 4) * 1.6 + 0.4;
    g.fillStyle = `rgba(220,230,255,${0.3 + Math.random() * 0.7})`;
    g.beginPath(); g.arc(Math.random() * 512, Math.random() * 512, r, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function tagTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 296;
  const g = c.getContext('2d');
  g.fillStyle = '#f5efe2';
  g.beginPath(); g.roundRect(0, 0, 512, 296, 18); g.fill();
  g.fillStyle = '#b48a5c';
  g.beginPath(); g.arc(52, 148, 16, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1d1a16';
  g.font = 'italic 400 118px Newsreader, Georgia, serif';
  g.textBaseline = 'alphabetic';
  g.fillText('Jurek', 110, 170);
  g.font = '400 38px -apple-system, "Helvetica Neue", Arial, sans-serif';
  g.fillStyle = '#6b6259';
  g.fillText('od Claude', 114, 236);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const ease = {
  out3: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: (t) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2),
};
const cl = (x) => Math.min(1, Math.max(0, x));

export class Gift {
  constructor() {
    const s = (this.scene = new THREE.Scene());
    s.background = new THREE.Color(0x070c18);
    s.fog = new THREE.Fog(0x070c18, 4, 11);
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.02, 40);
    s.add(new THREE.HemisphereLight(0x9fb2d8, 0x2a2f3a, 1.3));
    const fill = new THREE.DirectionalLight(0xc8d6ff, 1.0);
    fill.position.set(3.5, 1.6, 2.5);
    s.add(fill);
    const key = new THREE.DirectionalLight(0xffd3a1, 2.3);
    key.position.set(-1.8, 4.5, 3.0);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = key.shadow.camera.bottom = -1.6;
    key.shadow.camera.right = key.shadow.camera.top = 1.6;
    key.shadow.camera.near = 1; key.shadow.camera.far = 10;
    key.shadow.bias = -0.0015;
    key.shadow.radius = 4;
    s.add(key);
    const rim = new THREE.DirectionalLight(0x9db6ff, 1.1);
    rim.position.set(2.5, 1.6, -3.5);
    s.add(rim);
    this.inner = new THREE.PointLight(0xffe2b0, 0, 2.2, 1.5);
    this.inner.position.set(0, 0.35, 0);
    s.add(this.inner);

    const gg = new THREE.CircleGeometry(9, 48);
    const gp = gg.attributes.position;
    for (let i = 0; i < gp.count; i++) {
      const x = gp.getX(i), y = gp.getY(i);
      gp.setZ(i, 0.025 * Math.sin(x * 3.1 + y * 1.7) + 0.02 * Math.sin(x * 7.3 - y * 5.1));
    }
    gg.computeVertexNormals();
    const ground = new THREE.Mesh(gg, new THREE.MeshLambertMaterial({ color: 0xe9eef6 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    s.add(ground);

    const W = 1, H = 0.62, D = 1;
    this.H = H;
    const kraft = new THREE.MeshStandardMaterial({ map: kraftTexture(), roughness: 0.88 });
    const hidden = new THREE.MeshBasicMaterial({ visible: false });
    const navy = new THREE.MeshLambertMaterial({ color: 0x0a1226, side: THREE.BackSide });
    const night = new THREE.MeshBasicMaterial({ map: nightTexture(), side: THREE.BackSide });
    this.box = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [kraft, kraft, hidden, kraft, kraft, kraft]);
    outer.position.y = H / 2;
    outer.castShadow = true;
    const innerBox = new THREE.Mesh(new THREE.BoxGeometry(W - 0.02, H - 0.01, D - 0.02), [navy, navy, hidden, night, navy, navy]);
    innerBox.position.y = H / 2 + 0.005;
    this.box.add(outer, innerBox);

    const ribbon = new THREE.MeshStandardMaterial({ color: 0xf2ece0, roughness: 0.32, metalness: 0.05, transparent: true });
    this.ribbon = ribbon;
    this.bands = new THREE.Group();
    const bw = 0.11, bt = 0.006;
    for (const sz of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(bw, H, bt), ribbon);
      b.position.set(0, H / 2, sz * (D / 2 + bt / 2));
      this.bands.add(b);
      const c = new THREE.Mesh(new THREE.BoxGeometry(bt, H, bw), ribbon);
      c.position.set(sz * (W / 2 + bt / 2), H / 2, 0);
      this.bands.add(c);
    }
    this.box.add(this.bands);

    this.lid = new THREE.Group();
    const LH = 0.17;
    const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(W + 0.04, LH, D + 0.04), kraft);
    lidMesh.castShadow = true;
    this.lid.add(lidMesh);
    const top = LH / 2 + bt / 2;
    const l1 = new THREE.Mesh(new THREE.BoxGeometry(W + 0.05, bt, bw), ribbon); l1.position.y = top;
    const l2 = new THREE.Mesh(new THREE.BoxGeometry(bw, bt, D + 0.05), ribbon); l2.position.y = top;
    this.lid.add(l1, l2);
    for (const sz of [-1, 1]) {
      const a = new THREE.Mesh(new THREE.BoxGeometry(bw, LH, bt), ribbon); a.position.z = sz * (D / 2 + 0.02 + bt / 2);
      const b = new THREE.Mesh(new THREE.BoxGeometry(bt, LH, bw), ribbon); b.position.x = sz * (W / 2 + 0.02 + bt / 2);
      this.lid.add(a, b);
    }
    this.bow = new THREE.Group();
    const loopGeo = new THREE.TorusGeometry(0.1, 0.02, 8, 28);
    loopGeo.scale(1, 0.62, 0.3);
    for (const s of [-1, 1]) {
      const loop = new THREE.Mesh(loopGeo, ribbon);
      loop.position.set(s * 0.085, 0.055, 0);
      loop.rotation.set(0, s * 0.25, s * -0.55);
      loop.castShadow = true;
      this.bow.add(loop);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.005, 0.26), ribbon);
      tail.position.set(s * 0.05, 0.004, 0.13);
      tail.rotation.y = s * 0.45;
      this.bow.add(tail);
    }
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 8), ribbon);
    knot.scale.set(1, 0.8, 0.8);
    knot.position.y = 0.03;
    this.bow.add(knot);
    this.bow.position.y = top + 0.004;
    this.lid.add(this.bow);
    this.lid.position.y = H + LH / 2 - 0.07;
    this.lidY = this.lid.position.y;
    this.box.add(this.lid);

    this.tag = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.173), new THREE.MeshStandardMaterial({ map: tagTexture(), roughness: 0.9, transparent: true }));
    this.tag.rotation.x = -Math.PI / 2;
    this.tag.rotation.z = 0.35;
    this.tag.position.set(0.22, H + LH - 0.06 + 0.012, 0.27);
    this.tag.castShadow = true;
    this.box.add(this.tag);
    this.box.rotation.y = -0.5;
    s.add(this.box);

    this.star = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false }));
    this.star.position.set(0, 0.1, 0);
    this.star.scale.setScalar(0.2);
    this.box.add(this.star);

    const N = 700, pos = new Float32Array(N * 3), seed = new Float32Array(N);
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 8; pos[i * 3 + 1] = Math.random() * 4; pos[i * 3 + 2] = (Math.random() - 0.5) * 8; seed[i] = Math.random(); }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sg.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    this.snowU = { uTime: { value: 0 }, uScale: { value: 600 } };
    this.snow = new THREE.Points(sg, new THREE.ShaderMaterial({
      uniforms: this.snowU, transparent: true, depthWrite: false,
      vertexShader: `attribute float seed; uniform float uTime; uniform float uScale; varying float vA;
        void main(){ vec3 p = position; p.y = mod(p.y - uTime * (0.25 + seed * 0.2), 4.0); p.x += sin(uTime * 0.6 + seed * 20.0) * 0.15;
          vec4 mv = modelViewMatrix * vec4(p, 1.0); vA = smoothstep(0.0, 0.4, p.y) * smoothstep(9.0, 3.0, -mv.z);
          gl_PointSize = max(1.0, (0.012 + seed * 0.014) * uScale / -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.1, d) * vA * 0.9; if (a < 0.01) discard; gl_FragColor = vec4(0.94, 0.96, 1.0, a); }`,
    }));
    this.snow.frustumCulled = false;
    s.add(this.snow);
    this.t = 0;
    this.openT = -1;
    this.done = false;
  }

  resize(w, h, px) {
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.8 ? 46 : 34;
    this.camera.updateProjectionMatrix();
    this.snowU.uScale.value = (h * px) / (2 * Math.tan((this.camera.fov * Math.PI) / 360));
  }

  open() {
    if (this.openT < 0) this.openT = 0;
  }

  update(dt, events) {
    this.t += dt;
    this.snowU.uTime.value = this.t;
    const t = this.t, cam = this.camera;
    const far = cam.aspect < 0.8 ? 1.55 : 1;
    const ang = 0.55 + Math.sin(t * 0.13) * 0.16;
    const idle = new THREE.Vector3(Math.sin(ang) * 3.25 * far, 1.45 * far + Math.sin(t * 0.21) * 0.05, Math.cos(ang) * 3.25 * far);
    const idleLook = new THREE.Vector3(0, 0.12, 0);
    if (this.openT < 0) {
      cam.position.copy(idle);
      cam.lookAt(idleLook);
      this.bow.rotation.y = Math.sin(t * 0.8) * 0.02;
      return 0;
    }
    const o = (this.openT += dt);
    const fire = (k, at) => { if (o >= at && !events[k]) { events[k] = true; this.onEvent && this.onEvent(k); } };
    fire('ribbon', 0); fire('paper', 0.42); fire('lid', 1.25); fire('star', 1.6);
    const b = cl(o / 0.45);
    this.bow.scale.setScalar(Math.max(0.0001, 1 - ease.out3(b)));
    this.bow.rotation.y = b * 2.2;
    const tg = cl((o - 0.08) / 0.7);
    this.tag.position.x = 0.22 + ease.out3(tg) * 0.9;
    this.tag.position.y = this.H + 0.122 - tg * tg * 0.6;
    this.tag.rotation.z = 0.35 + tg * 1.8;
    this.tag.material.opacity = 1 - tg;
    const bd = cl((o - 0.12) / 0.5);
    this.bands.scale.y = Math.max(0.0001, 1 - ease.out3(bd));
    const lift = cl((o - 0.38) / 0.55);
    const away = cl((o - 0.95) / 0.75);
    this.lid.position.y = this.lidY + ease.back(lift) * 0.42 + ease.inOut(away) * 1.4;
    this.lid.position.x = ease.inOut(away) * 1.9;
    this.lid.position.z = -ease.inOut(away) * 1.1;
    this.lid.rotation.z = -lift * 0.18 - away * 0.9;
    this.lid.rotation.x = lift * 0.08 + away * 0.4;
    const sg = cl((o - 1.1) / 1.2);
    this.star.material.opacity = ease.out3(sg);
    this.star.scale.setScalar(0.08 + ease.out3(sg) * 0.34 + Math.sin(t * 3) * 0.008);
    this.star.position.y = 0.06 + ease.out3(sg) * 0.12;
    this.inner.intensity = ease.out3(sg) * 2.2;
    const c1 = ease.inOut(cl((o - 0.5) / 1.6));
    const c2 = ease.inOut(cl((o - 2.3) / 1.3));
    const above = new THREE.Vector3(0.04, 2.05 * far, 0.62);
    const dive = new THREE.Vector3(0.0, 0.55, 0.05);
    const p = idle.clone().lerp(above, c1).lerp(dive, c2);
    const look = idleLook.clone().lerp(new THREE.Vector3(0, 0.12, 0), c1).lerp(new THREE.Vector3(0, 0.1, 0), c2);
    cam.position.copy(p);
    cam.up.set(0, 1, 0).lerp(new THREE.Vector3(0, 0, -1), c1 * 0.98).normalize();
    cam.lookAt(look);
    const fade = cl((o - 3.05) / 0.5);
    if (o > 3.6) this.done = true;
    return fade;
  }
}
