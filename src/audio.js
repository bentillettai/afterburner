export const audio = {
  ctx: null, muted: false,
  start() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    try {
      const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(ctx.destination);
      this.filter = ctx.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.frequency.value = 600; this.filter.Q.value = 6;
      this.eng = ctx.createGain(); this.eng.gain.value = 0.0;
      this.o1 = ctx.createOscillator(); this.o1.type = 'sawtooth';
      this.o2 = ctx.createOscillator(); this.o2.type = 'square'; this.o2.detune.value = 7;
      this.o1.connect(this.filter); this.o2.connect(this.filter); this.filter.connect(this.eng); this.eng.connect(this.master);
      this.o1.start(); this.o2.start();
      const len = ctx.sampleRate; const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
    } catch (e) { this.ctx = null; }
  },
  update(speed, boost, thrust) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const f = 48 + speed * 0.95 + boost * 40;
    this.o1.frequency.setTargetAtTime(f, t, 0.05); this.o2.frequency.setTargetAtTime(f * 1.5, t, 0.05);
    this.filter.frequency.setTargetAtTime(380 + speed * 16 + boost * 1400, t, 0.08);
    this.eng.gain.setTargetAtTime(this.muted ? 0 : 0.05 + thrust * 0.04 + boost * 0.05, t, 0.08);
  },
  burst(dur, freq, vol) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(freq * 3, t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t); src.stop(t + dur);
  },
  ding() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [[1320, 0], [1980, 0.07]].forEach(([f, d]) => {
      const o = this.ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.2, t + d + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.18);
      o.connect(g); g.connect(this.master); o.start(t + d); o.stop(t + d + 0.2);
    });
  },
  zap(freq, vol = 0.12) {
    if (!this.ctx || this.muted || vol <= 0) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.25, t + 0.14);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.16);
  },
  beep(freq, dur = 0.16, vol = 0.18) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = 'square'; o.frequency.value = freq;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur);
  },
};
