// Gwiazdka: Web Audio engine. Salamander grand piano samples, recorded beds and one-shots, simple room reverb.

const SAMPLE_NOTES = ['C2', 'Ds2', 'Fs2', 'A2', 'C3', 'Ds3', 'Fs3', 'A3', 'C4', 'Ds4', 'Fs4', 'A4', 'C5', 'Ds5', 'Fs5', 'A5', 'C6', 'Ds6'];
const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function midi(name) {
  const m = /^([A-G])(s|#|b)?(-?\d)$/.exec(name);
  if (!m) return 60;
  let n = STEP[m[1]] + (m[2] === 's' || m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return n + (parseInt(m[3], 10) + 1) * 12;
}

export class AudioEngine {
  constructor() {
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ok = !!AC;
    this.buffers = {};
    this.piano = [];
    this.beds = {};
    this.muted = false;
    if (!this.ok) return;
    this.ctx = new AC({ latencyHint: 'interactive' });
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 10;
    comp.ratio.value = 3;
    comp.attack.value = 0.004;
    comp.release.value = 0.25;
    this.master.connect(comp).connect(this.ctx.destination);
    this.pianoBus = this.ctx.createGain();
    this.pianoBus.gain.value = 0.85;
    this.pianoBus.connect(this.master);
    this.fxBus = this.ctx.createGain();
    this.fxBus.connect(this.master);
    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this.impulse(2.8, 2.6);
    this.wet = this.ctx.createGain();
    this.wet.gain.value = 0.32;
    this.reverb.connect(this.wet).connect(this.master);
    this.pianoBus.connect(this.reverb);
  }

  impulse(seconds, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        lp = lp * 0.6 + (Math.random() * 2 - 1) * 0.4;
        d[i] = lp * Math.pow(1 - t, decay) * (i < rate * 0.012 ? i / (rate * 0.012) : 1);
      }
    }
    return buf;
  }

  async fetchBuffer(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(url);
    const ab = await r.arrayBuffer();
    return await new Promise((res, rej) => this.ctx.decodeAudioData(ab, res, rej));
  }

  async load(list, onProgress) {
    if (!this.ok) return;
    const jobs = [];
    let done = 0;
    const total = SAMPLE_NOTES.length + Object.keys(list).length;
    const tick = () => onProgress && onProgress(++done / total);
    for (const n of SAMPLE_NOTES) {
      jobs.push(this.fetchBuffer(`audio/piano/${n}.mp3`).then(b => {
        this.piano.push({ midi: midi(n), buf: b });
      }).catch(() => {}).finally(tick));
    }
    for (const [key, url] of Object.entries(list)) {
      jobs.push(this.fetchBuffer(url).then(b => { this.buffers[key] = b; }).catch(() => {}).finally(tick));
    }
    await Promise.all(jobs);
    this.piano.sort((a, b) => a.midi - b.midi);
  }

  resume() {
    if (this.ok && this.ctx.state !== 'running') this.ctx.resume();
  }

  now() {
    return this.ok ? this.ctx.currentTime : performance.now() / 1000;
  }

  running() {
    return this.ok && this.ctx.state === 'running';
  }

  setMuted(m) {
    this.muted = m;
    if (!this.ok) return;
    const g = this.master.gain;
    g.cancelScheduledValues(this.ctx.currentTime);
    g.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
  }

  note(name, when = 0, vel = 0.7, dur = 2.5) {
    if (!this.ok || !this.piano.length) return null;
    const m = midi(name);
    let best = this.piano[0];
    for (const s of this.piano) if (Math.abs(s.midi - m) < Math.abs(best.midi - m)) best = s;
    const t = Math.max(when, this.ctx.currentTime);
    const src = this.ctx.createBufferSource();
    src.buffer = best.buf;
    src.playbackRate.value = Math.pow(2, (m - best.midi) / 12);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900 + vel * vel * 9000;
    lp.Q.value = 0.3;
    const g = this.ctx.createGain();
    const peak = 0.12 + vel * vel * 0.9;
    g.gain.setValueAtTime(peak, t);
    g.gain.setValueAtTime(peak, t + dur);
    g.gain.setTargetAtTime(0, t + dur, 0.35);
    src.connect(lp).connect(g).connect(this.pianoBus);
    src.start(t);
    src.stop(t + dur + 2.5);
    return { g, t };
  }

  play(key, opts = {}) {
    const buf = this.buffers[key];
    if (!this.ok || !buf) return null;
    const t = Math.max(opts.when || 0, this.ctx.currentTime);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = opts.rate || 1;
    const g = this.ctx.createGain();
    const vol = opts.gain ?? 1;
    if (opts.fadeIn) {
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + opts.fadeIn);
    } else g.gain.value = vol;
    let node = src;
    if (opts.lowpass) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.lowpass;
      node.connect(f);
      node = f;
    }
    node.connect(g).connect(opts.reverb ? this.reverb : this.fxBus);
    if (opts.reverb) g.connect(this.fxBus);
    const offset = opts.offset || 0;
    if (opts.duration) src.start(t, offset, opts.duration);
    else src.start(t, offset);
    if (opts.fadeOutAt) {
      g.gain.setValueAtTime(vol, t + opts.fadeOutAt);
      g.gain.linearRampToValueAtTime(0, t + opts.fadeOutAt + (opts.fadeOut || 0.5));
    }
    return { src, g };
  }

  bed(key, target, fade = 1.5, opts = {}) {
    if (!this.ok) return;
    let b = this.beds[key];
    const now = this.ctx.currentTime;
    if (!b) {
      const buf = this.buffers[key];
      if (!buf || target <= 0) return;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.loopStart = opts.loopStart || 0;
      src.loopEnd = opts.loopEnd || buf.duration;
      const g = this.ctx.createGain();
      g.gain.value = 0;
      let node = src;
      if (opts.lowpass) {
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = opts.lowpass;
        node.connect(f);
        node = f;
        b = { filter: f };
      }
      node.connect(g).connect(this.fxBus);
      src.start(now, opts.offset || 0);
      b = Object.assign(b || {}, { src, g });
      this.beds[key] = b;
    }
    b.g.gain.cancelScheduledValues(now);
    b.g.gain.setValueAtTime(b.g.gain.value, now);
    b.g.gain.linearRampToValueAtTime(Math.max(0, target), now + fade);
    if (target <= 0) {
      const ref = b;
      setTimeout(() => {
        if (this.beds[key] === ref && ref.g.gain.value < 0.001) {
          try { ref.src.stop(); } catch (e) {}
          delete this.beds[key];
        }
      }, fade * 1000 + 200);
    }
  }

  bedFilter(key, freq, time = 0.5) {
    const b = this.beds[key];
    if (b && b.filter) b.filter.frequency.setTargetAtTime(freq, this.ctx.currentTime, time);
  }
}
