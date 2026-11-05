// Web Audio: music with crossfaded loops, sound effects, ambience loops.
const SFX_DIR = 'assets/audio/sfx/', MUSIC_DIR = 'assets/audio/music/';

export const audio = {
  ctx: null, master: null, musicGain: null, sfxGain: null, filter: null,
  buffers: {}, loading: {},
  musicName: null, musicSrc: null, musicNodeGain: null, musicTimer: null,
  ambName: null, ambSrc: null, ambGain: null,
  loops: {},
  musicVol: 0.6, sfxVol: 0.8, muted: false,
  lastSfx: null,

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.filter = this.ctx.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.frequency.value = 20000;
      this.musicGain = this.ctx.createGain(); this.musicGain.connect(this.filter); this.filter.connect(this.master);
      // two music buses: the world track, and the flare track that takes over while you flare
      this.worldBus = this.ctx.createGain(); this.worldBus.connect(this.musicGain);
      this.flareBus = this.ctx.createGain(); this.flareBus.connect(this.musicGain);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.master);
      this.applyVolumes();
      if (this.pendingMusic) { const m = this.pendingMusic; this.pendingMusic = null; this.music(m); }
      if (this.pendingAmb) { const a = this.pendingAmb; this.pendingAmb = null; this.ambience(a); }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = this.muted ? 0 : 1;
    this.musicGain.gain.value = this.musicVol * 0.55;
    this.sfxGain.gain.value = this.sfxVol;
  },
  setMuted(m) { this.muted = m; this.applyVolumes(); },

  async load(path) {
    if (this.buffers[path]) return this.buffers[path];
    if (this.loading[path]) return this.loading[path];
    this.loading[path] = (async () => {
      try {
        const res = await fetch(path);
        if (!res.ok) return null;
        const arr = await res.arrayBuffer();
        const ctx = this.ctx || new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, 44100, 44100);
        const buf = await ctx.decodeAudioData(arr);
        this.buffers[path] = buf;
        return buf;
      } catch (e) { return null; }
    })();
    return this.loading[path];
  },
  preload(names, kind = 'sfx') { return Promise.all(names.map(n => this.load((kind === 'sfx' ? SFX_DIR : MUSIC_DIR) + n + '.mp3'))); },

  sfx(name, { rate = 1, vol = 1, semis = 0 } = {}) {
    this.lastSfx = name;
    if (!this.ctx) return;
    const buf = this.buffers[SFX_DIR + name + '.mp3'];
    if (!buf) { this.load(SFX_DIR + name + '.mp3'); return; }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate * Math.pow(2, semis / 12);
    const g = this.ctx.createGain(); g.gain.value = vol;
    src.connect(g); g.connect(this.sfxGain);
    src.start();
    return src;
  },

  loop(name, on, vol = 0.5) {
    if (!this.ctx) return;
    const cur = this.loops[name];
    if (on && !cur) {
      const buf = this.buffers[SFX_DIR + name + '.mp3'];
      if (!buf) { this.load(SFX_DIR + name + '.mp3'); return; }
      const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const g = this.ctx.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.4);
      src.connect(g); g.connect(this.sfxGain); src.start();
      this.loops[name] = { src, g };
    } else if (!on && cur) {
      cur.g.gain.cancelScheduledValues(this.ctx.currentTime);
      cur.g.gain.setValueAtTime(cur.g.gain.value, this.ctx.currentTime);
      cur.g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
      cur.src.stop(this.ctx.currentTime + 0.45);
      delete this.loops[name];
    }
  },

  ambience(name) {
    if (!this.ctx) { this.pendingAmb = name; return; }
    if (this.ambName === name) return;
    if (this.ambName) this.loop(this.ambName, false);
    this.ambName = name;
    if (name) {
      const path = SFX_DIR + name + '.mp3';
      if (this.buffers[path]) this.loop(name, true, 0.35);
      else this.load(path).then(() => { if (this.ambName === name) this.loop(name, true, 0.35); });
    }
  },

  // music: plays the track, crossfading 1.5 s into itself before the end
  async music(name) {
    if (!this.ctx) { this.pendingMusic = name; return; }
    if (this.musicName === name) return;
    this.flare(null, true);
    this.musicName = name;
    const token = this.musicToken = (this.musicToken || 0) + 1;
    this._fadeOutMusic();
    if (!name) return;
    const buf = await this.load(MUSIC_DIR + name + '.mp3');
    if (!buf || this.musicName !== name || token !== this.musicToken) return;
    this._startMusic(buf, name, 1.2);
  },
  _startMusic(buf, name, fadeIn) {
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + fadeIn);
    src.connect(g); g.connect(this.worldBus);
    src.start(t);
    this.musicSrc = src; this.musicNodeGain = g;
    const XF = 1.5;
    const dur = buf.duration;
    clearTimeout(this.musicTimer);
    if (dur > 20) {
      this.musicTimer = setTimeout(() => {
        if (this.musicName !== name) return;
        const old = this.musicNodeGain, oldSrc = this.musicSrc;
        const now = this.ctx.currentTime;
        old.gain.setValueAtTime(old.gain.value, now); old.gain.linearRampToValueAtTime(0, now + XF);
        oldSrc.stop(now + XF + 0.05);
        this._startMusic(buf, name, XF);
      }, Math.max(1000, (dur - XF - 0.3) * 1000));
    }
  },
  _fadeOutMusic() {
    clearTimeout(this.musicTimer);
    if (this.musicSrc && this.ctx) {
      const now = this.ctx.currentTime, g = this.musicNodeGain;
      g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(0, now + 0.8);
      this.musicSrc.stop(now + 0.85);
      this.musicSrc = null;
    }
  },
  sting(name) { // one-shot music (victory) over ducked music
    if (!this.ctx) return;
    this.load(MUSIC_DIR + name + '.mp3').then(buf => {
      if (!buf) return;
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const g = this.ctx.createGain(); g.gain.value = 1; src.connect(g); g.connect(this.worldBus);
      const now = this.ctx.currentTime;
      if (this.musicNodeGain) { this.musicNodeGain.gain.setValueAtTime(this.musicNodeGain.gain.value, now); this.musicNodeGain.gain.linearRampToValueAtTime(0.15, now + 0.3); this.musicNodeGain.gain.linearRampToValueAtTime(1, now + buf.duration); }
      src.start();
    });
  },
  // flare music: duck the world track (it keeps running) and play the flare track on its own looping slot
  flareName: null, flareSrc: null, flareToken: 0,
  flare(name, instant = false) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime, tok = ++this.flareToken;
    const ramp = (gain, v, sec) => { gain.cancelScheduledValues(now); gain.setValueAtTime(gain.value, now); if (sec <= 0) gain.setValueAtTime(v, now); else gain.linearRampToValueAtTime(v, now + sec); };
    if (name) {
      const buf = this.buffers[MUSIC_DIR + name + '.mp3'];
      if (!buf) { this.load(MUSIC_DIR + name + '.mp3'); return; } // not loaded yet: the visuals carry this flare
      if (this.flareSrc && this.flareName === name) { ramp(this.flareBus.gain, 1, 0.1); ramp(this.worldBus.gain, 0, 0.25); return; }
      this._stopFlareSrc(now);
      if (this.fadingSrc) { try { this.fadingSrc.stop(now); } catch { } this.fadingSrc = null; }
      const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(this.flareBus);
      ramp(this.flareBus.gain, 1, 0); ramp(this.worldBus.gain, 0, 0.25);
      src.start(now); this.flareSrc = src; this.flareName = name;
    } else {
      if (!this.flareSrc && this.worldBus.gain.value > 0.99) return;
      const sec = instant ? 0 : 0.6;
      ramp(this.flareBus.gain, 0, sec); ramp(this.worldBus.gain, 1, sec);
      const old = this.flareSrc; this.flareSrc = null; this.flareName = null; this.fadingSrc = old;
      if (old) try { old.stop(now + sec + 0.05); } catch { }
    }
    return tok;
  },
  _stopFlareSrc(now) { if (this.flareSrc) { try { this.flareSrc.stop(now); } catch { } this.flareSrc = null; this.flareName = null; } },
  duck(on) { // paused
    if (!this.ctx) return;
    this.filter.frequency.setTargetAtTime(on ? 700 : 20000, this.ctx.currentTime, 0.15);
    this.sfxGain.gain.setTargetAtTime(on ? this.sfxVol * 0.15 : this.sfxVol, this.ctx.currentTime, 0.1);
  },
  suspend(on) { if (!this.ctx) return; if (on) this.ctx.suspend(); else this.ctx.resume(); },
  state() { return { context: this.ctx?.state || 'none', music: this.musicName, flare: this.flareName, worldBus: this.worldBus ? +this.worldBus.gain.value.toFixed(2) : 1, flareBus: this.flareBus ? +this.flareBus.gain.value.toFixed(2) : 0, ambience: this.ambName, muted: this.muted, musicVol: this.musicVol, sfxVol: this.sfxVol, lastSfx: this.lastSfx }; },
};
