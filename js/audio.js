/**
 * Counter-Strike 1.6 Sound Synthesizer Engine
 * Pure Web Audio API + SpeechSynthesis (Zero external asset dependencies, 100% reliable)
 */

class CSAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.volume = 0.7;
    this.isMuted = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;

      // Pre-generate a 2-second high-density noise buffer once to eliminate GC thrash during gunfights
      const noiseSamples = Math.floor(this.ctx.sampleRate * 2.0);
      this.sharedNoiseBuffer = this.ctx.createBuffer(1, noiseSamples, this.ctx.sampleRate);
      const noiseData = this.sharedNoiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseSamples; i++) {
        noiseData[i] = Math.random() * 2 - 1;
      }
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  // Play a noise burst with envelope and filter (Zero-allocation high performance)
  playNoiseBurst(duration, filterType, filterFreq, gainVal, decaySpeed = 15) {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    if (!this.sharedNoiseBuffer) {
      const noiseSamples = Math.floor(this.ctx.sampleRate * 2.0);
      this.sharedNoiseBuffer = this.ctx.createBuffer(1, noiseSamples, this.ctx.sampleRate);
      const noiseData = this.sharedNoiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseSamples; i++) {
        noiseData[i] = Math.random() * 2 - 1;
      }
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.sharedNoiseBuffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;
    gain.gain.setValueAtTime(gainVal, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.onended = () => {
      try {
        noise.disconnect();
        filter.disconnect();
        gain.disconnect();
      } catch (e) {}
    };

    noise.start();
    noise.stop(t + duration);
  }

  // ==========================================
  // WEAPONS AUDIO (CS 1.6 AUTHENTIC SIGNATURES)
  // ==========================================

  playAK47() {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    // Punchy low transient kick
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    oscGain.gain.setValueAtTime(1.0, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.15);

    // Crack and distortion noise (famous AK-47 sharp crack)
    this.playNoiseBurst(0.24, 'bandpass', 1400, 0.9, 12);
    this.playNoiseBurst(0.12, 'highpass', 2200, 0.6, 20);
  }

  playM4A1(silenced = false) {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    if (silenced) {
      // Characteristic CS 1.6 "pfft" suppressor sound
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);
      oscGain.gain.setValueAtTime(0.4, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.09);

      this.playNoiseBurst(0.12, 'lowpass', 1200, 0.45, 18);
    } else {
      // Unsilenced M4 snap
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
      oscGain.gain.setValueAtTime(0.7, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.12);

      this.playNoiseBurst(0.2, 'bandpass', 1800, 0.75, 15);
    }
  }

  playDeagle() {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    // Heavy cannon boom
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.18);
    oscGain.gain.setValueAtTime(1.2, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);

    this.playNoiseBurst(0.3, 'lowpass', 2400, 1.0, 10);
    this.playNoiseBurst(0.15, 'highpass', 3000, 0.7, 18);
  }

  playGlock() {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.08);
    oscGain.gain.setValueAtTime(0.4, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.09);

    this.playNoiseBurst(0.14, 'bandpass', 1900, 0.5, 20);
  }

  playUSP() {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.09);
    oscGain.gain.setValueAtTime(0.5, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.1);

    this.playNoiseBurst(0.16, 'bandpass', 1600, 0.6, 18);
  }

  playAWP() {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    // Massive sub-bass explosion
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.45);
    oscGain.gain.setValueAtTime(1.3, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.5);

    // Deep thunder tail
    this.playNoiseBurst(0.65, 'lowpass', 1800, 1.2, 5);
    this.playNoiseBurst(0.3, 'highpass', 2800, 0.8, 12);

    // Bolt action mechanical cycle sound after 0.5s
    setTimeout(() => {
      this.playMechanicalClick();
    }, 450);
  }

  // SSG 08 (Scout) - Lightweight crisp .308 bolt action rifle
  playScout() {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.25);
    oscGain.gain.setValueAtTime(1.1, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.28);

    this.playNoiseBurst(0.35, 'bandpass', 2200, 1.0, 10);
    this.playNoiseBurst(0.18, 'highpass', 3200, 0.7, 18);

    // Fast bolt cycle
    setTimeout(() => {
      this.playMechanicalClick(1.3, 750);
    }, 320);
  }

  // SCAR-20 - Semi-automatic tactical auto-sniper DMR
  playScar20() {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.16);
    oscGain.gain.setValueAtTime(1.15, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.18);

    this.playNoiseBurst(0.28, 'lowpass', 2100, 0.95, 12);
    this.playNoiseBurst(0.12, 'highpass', 2900, 0.65, 20);
  }

  // Optic Sight Zoom / ADS Sound
  playAimZoom(isZoomIn = true) {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    const startFreq = isZoomIn ? 500 : 850;
    const endFreq = isZoomIn ? 900 : 450;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.08);
    oscGain.gain.setValueAtTime(0.15, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  // C4 Keypad dial tone during planting
  playC4KeypadPress(freq = 1200) {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    oscGain.gain.setValueAtTime(0.25, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  // Wire cutting / disarm sound
  playC4Disarm() {
    this.playMechanicalClick(1.8, 1400);
    this.playNoiseBurst(0.08, 'highpass', 4500, 0.3, 30);
  }

  playKnifeSlash() {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    // Air whoosh
    this.playNoiseBurst(0.12, 'bandpass', 800, 0.4, 25);
  }

  playKnifeHit() {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(650, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.1);
    oscGain.gain.setValueAtTime(0.7, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.12);

    this.playNoiseBurst(0.15, 'highpass', 2400, 0.5, 20);
  }

  // Reload sound
  playReload() {
    if (!this.initialized) this.init();
    this.resume();
    // Clip out
    this.playMechanicalClick(1.0, 400);
    // Clip in
    setTimeout(() => this.playMechanicalClick(1.2, 600), 700);
    // Slide rack
    setTimeout(() => this.playMechanicalClick(0.9, 850), 1400);
  }

  playMechanicalClick(pitchMod = 1.0, freq = 500) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq * pitchMod, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.05);
    oscGain.gain.setValueAtTime(0.3, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  // Headshot "Dink" (CS 1.6 iconic helmet hit)
  playHeadshot() {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2600, t);
    osc.frequency.exponentialRampToValueAtTime(1800, t + 0.15);
    oscGain.gain.setValueAtTime(0.9, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);

    this.playNoiseBurst(0.08, 'highpass', 4000, 0.4, 30);
  }

  // CS 1.6 Empty Magazine Dry-Fire Click
  playEmptyAmmoClick() {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    // Sharp firing pin click
    const osc1 = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1800, t);
    osc1.frequency.exponentialRampToValueAtTime(320, t + 0.04);
    g1.gain.setValueAtTime(0.55, t);
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    osc1.connect(g1);
    g1.connect(this.masterGain);
    osc1.start(t);
    osc1.stop(t + 0.05);

    // Metallic receiver hollow resonance
    const osc2 = this.ctx.createOscillator();
    const g2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(740, t);
    osc2.frequency.exponentialRampToValueAtTime(180, t + 0.08);
    g2.gain.setValueAtTime(0.3, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc2.connect(g2);
    g2.connect(this.masterGain);
    osc2.start(t);
    osc2.stop(t + 0.09);

    this.playNoiseBurst(0.03, 'highpass', 3500, 0.25, 45);
  }

  // Authentic CS 1.6 Character Death Sound (Male vocal groan / collapse)
  playDeathSound(isHeadshot = false) {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;

    if (isHeadshot) {
      // Sudden choked headshot death gasp
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      const baseFreq = 260 + Math.random() * 40;
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.22);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(950, t);
      filter.frequency.exponentialRampToValueAtTime(350, t + 0.22);

      oscGain.gain.setValueAtTime(0.7, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

      osc.connect(filter);
      filter.connect(oscGain);
      oscGain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.25);

      this.playNoiseBurst(0.25, 'bandpass', 1100, 0.35, 12);
      this.playLandingThud(0.8);
    } else {
      // Classic deep guttural death groan ("Ugh!", "Aaargh!")
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      const startPitch = 220 + Math.random() * 60;
      osc.frequency.setValueAtTime(startPitch, t);
      osc.frequency.linearRampToValueAtTime(startPitch * 1.08, t + 0.08); // initial vocal pitch surge
      osc.frequency.exponentialRampToValueAtTime(65, t + 0.42); // dying breath pitch drop

      // Formant filtering for human chest/throat resonance
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(750, t);
      filter.Q.setValueAtTime(2.2, t);

      oscGain.gain.setValueAtTime(0.65, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(filter);
      filter.connect(oscGain);
      oscGain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.46);

      // Exhaled breath noise
      this.playNoiseBurst(0.38, 'lowpass', 800, 0.3, 8);
      // Body collapse thud on floor after short delay
      setTimeout(() => this.playLandingThud(0.9), 180);
    }
  }

  // Flesh bullet impact
  playFleshHit() {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.09);
    oscGain.gain.setValueAtTime(0.5, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  // Wall ricochet / bullet impact
  playWallHit() {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    const randFreq = 1600 + Math.random() * 800;
    osc.frequency.setValueAtTime(randFreq, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.07);
    oscGain.gain.setValueAtTime(0.35, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.08);

    this.playNoiseBurst(0.06, 'highpass', 3000, 0.25, 40);
  }

  // Footstep on different surfaces (sand, wood, water splash)
  playFootstep(surfaceType = 'sand') {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    if (surfaceType === 'water') {
      // Slosh / splash in shallow ocean water
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(70, t + 0.12);
      oscGain.gain.setValueAtTime(0.25, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.13);
      this.playNoiseBurst(0.12, 'bandpass', 1200, 0.22, 16);
    } else if (surfaceType === 'wood') {
      // Hollow clatter on boardwalk pier planks
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);
      oscGain.gain.setValueAtTime(0.3, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.09);
      this.playNoiseBurst(0.06, 'highpass', 1800, 0.18, 32);
    } else {
      // Crisp sand crunch under combat boots
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(105, t);
      osc.frequency.exponentialRampToValueAtTime(32, t + 0.08);
      oscGain.gain.setValueAtTime(0.22, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.09);
      this.playNoiseBurst(0.08, 'bandpass', 850, 0.25, 22);
    }
  }

  // Heavy realistic landing thud upon hitting the ground
  playLandingThud(intensity = 1.0) {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.18);
    oscGain.gain.setValueAtTime(Math.min(0.7, 0.35 * intensity), t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);

    this.playNoiseBurst(0.16, 'lowpass', 550, Math.min(0.6, 0.3 * intensity), 12);
  }

  // Water splash when bullets or entities hit the ocean
  playWaterSplash() {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);
    oscGain.gain.setValueAtTime(0.3, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.16);

    this.playNoiseBurst(0.2, 'bandpass', 1500, 0.35, 12);
  }

  // Supersonic bullet whiz-by near the player
  playBulletWhiz() {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1600, t);
    osc.frequency.exponentialRampToValueAtTime(350, t + 0.08);
    oscGain.gain.setValueAtTime(0.22, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  // Distant tropical seagull call
  playSeagull() {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.linearRampToValueAtTime(2200, t + 0.12);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.35);

    oscGain.gain.setValueAtTime(0.08, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.36);
  }

  // Bomb Beep
  playBombBeep(pitch = 1200) {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, t);
    oscGain.gain.setValueAtTime(0.35, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  // Explosion
  playExplosion() {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 1.2);
    oscGain.gain.setValueAtTime(1.5, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 1.5);

    this.playNoiseBurst(1.8, 'lowpass', 900, 1.4, 3);
  }

  // Radio beep / walkie-talkie chirp
  playRadioChirp() {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.setValueAtTime(1400, t + 0.04);
    oscGain.gain.setValueAtTime(0.2, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  // Authentic Voice Lines via Speech Synthesis with military radio styling
  speakRadio(text) {
    this.playRadioChirp();
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.15;
        u.pitch = 0.95;
        u.volume = this.volume;
        // Try English voice for authentic military sound
        const voices = window.speechSynthesis.getVoices();
        const enVoice = voices.find(v => v.lang.startsWith('en') && !v.name.includes('Google')) || voices.find(v => v.lang.startsWith('en'));
        if (enVoice) u.voice = enVoice;
        window.speechSynthesis.speak(u);
      } catch (e) {
        console.warn('SpeechSynthesis error:', e);
      }
    }
  }

  // Authentic CS 1.6 Menu Button Hover Sound (light metallic click/blip)
  playMenuHover() {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(1900, t + 0.035);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.045);
  }

  // Authentic CS 1.6 Menu Button Click Sound (crisp metallic click)
  playMenuClick() {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    // Low mechanical transient
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.06);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.07);

    // High crisp noise transient
    this.playNoiseBurst(0.04, 'highpass', 3500, 0.25, 40);
  }

  // Spawn Shield Activation Pulse Sound
  playShieldActive() {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(750, t + 0.18);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.36);
  }
}

// Global singleton instance
window.csAudio = new CSAudioEngine();
