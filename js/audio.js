/**
 * Counter-Strike CS:GO / CS2 Modern High-Fidelity Audio Engine
 * Built on Web Audio API (AudioContext) with:
 * - Zero-latency pre-cached AudioBuffers in memory
 * - True overlapping polyphony (no cut-offs during rapid sprays)
 * - 3D HRTF Spatial Audio (PannerNode) with Line-of-Sight Wall Occlusion
 * - Algorithmic Convolver Reverb for authentic outdoor/indoor barrel acoustics
 * - Authentic CS:GO sound profiles (Punchy gunshots, Kevlar hitmarker, Helmet dink, Footsteps)
 * - Custom Sound Pack Manager with Drag-and-Drop and IndexedDB persistence
 * - Multi-channel Volume Mixer (Master, Weapons, Footsteps, Voice, Effects)
 */

class CSAudioEngine {
  constructor() {
    this.ctx = null;
    this.initialized = false;

    // Master & Sub-busses
    this.masterGain = null;
    this.weaponsGain = null;
    this.footstepsGain = null;
    this.voiceGain = null;
    this.effectsGain = null;
    this.uiGain = null;

    // Convolver Reverb
    this.convolverNode = null;
    this.reverbGain = null;
    this.reverbEnabled = true;

    // Flashbang / Deafening Environmental Muffle Filter
    this.environmentFilter = null;
    this.tinnitusOsc = null;
    this.tinnitusGain = null;

    // Volume Mixer Settings
    this.volumes = {
      master: 0.75,
      weapons: 0.85,
      footsteps: 0.90,
      voice: 0.80,
      effects: 0.85,
      reverb: 0.35
    };
    this.spatialEnabled = true;

    // Sound Cache: key -> AudioBuffer
    this.audioBuffers = {};
    this.isCustomSound = {};

    // Temporary vectors for 3D calculations
    this._listenerPos = { x: 0, y: 1.7, z: 0 };
    this._forwardVec = null;
    this._upVec = null;

    // Sound catalog definitions for the Sound Pack Manager UI
    this.soundCatalog = [
      { key: 'ak47', name: 'AK-47 Shot', category: 'weapons', desc: 'Плотный удар 7.62mm, металлический затвор и эхо' },
      { key: 'm4a1', name: 'M4A4 Shot', category: 'weapons', desc: 'Хлёсткий треск 5.56mm и отдача затвора' },
      { key: 'm4a1_silenced', name: 'M4A1-S (Silenced)', category: 'weapons', desc: 'Фирменный глухой хлопок глушителя' },
      { key: 'awp', name: 'AWP Shot', category: 'weapons', desc: 'Мощнейший суб-басовый взрыв .338 Magnum и эхо' },
      { key: 'awp_bolt', name: 'AWP Bolt Cycle', category: 'weapons', desc: 'Передёргивание продольно-скользящего затвора' },
      { key: 'scout', name: 'SSG 08 (Scout)', category: 'weapons', desc: 'Звонкий щелчок лёгкой снайперской винтовки' },
      { key: 'scar20', name: 'SCAR-20 Auto-Sniper', category: 'weapons', desc: 'Тяжёлый темповый полуавтоматический выстрел' },
      { key: 'deagle', name: 'Desert Eagle (.50 AE)', category: 'weapons', desc: 'Громоподобный выстрел ручной пушки' },
      { key: 'usp', name: 'USP Tactical', category: 'weapons', desc: 'Чёткий выстрел армейского пистолета' },
      { key: 'usp_silenced', name: 'USP-S (Silenced)', category: 'weapons', desc: 'Тихий тактический свист глушителя' },
      { key: 'glock', name: 'Glock-18', category: 'weapons', desc: 'Быстрый щелчок полимерного затвора 9mm' },
      { key: 'knife_slash', name: 'Knife Slash', category: 'knife', desc: 'Рассекающий воздух взмах клинка' },
      { key: 'knife_hit', name: 'Knife Hit', category: 'knife', desc: 'Звонкий удар лезвия по телу или стене' },
      { key: 'deploy', name: 'Weapon Deploy', category: 'handling', desc: 'Доставание оружия, взвод и лязг затвора' },
      { key: 'clipout', name: 'Reload (Clip Out)', category: 'handling', desc: 'Вынимание пустого магазина' },
      { key: 'clipin', name: 'Reload (Clip In)', category: 'handling', desc: 'Чёткая фиксация нового магазина в шахте' },
      { key: 'boltpull', name: 'Reload (Bolt Pull)', category: 'handling', desc: 'Резкое передёргивание затвора' },
      { key: 'empty_ammo', name: 'Dry Fire (No Ammo)', category: 'handling', desc: 'Сухой металлический щелчок бойка' },
      { key: 'hitmarker', name: 'Kevlar Hit (Body)', category: 'hits', desc: 'Плотный шлепок попадания по бронежилету' },
      { key: 'headshot', name: 'Headshot ("Dink")', category: 'hits', desc: 'Легендарный звонкий металлический динк в каску' },
      { key: 'step_concrete', name: 'Footstep (Concrete/Stone)', category: 'footsteps', desc: 'Чёткий глухой шаг по асфальту/камню' },
      { key: 'step_sand', name: 'Footstep (Sand/Dirt)', category: 'footsteps', desc: 'Хрустящий шаг по песку и грунту' },
      { key: 'step_wood', name: 'Footstep (Wood)', category: 'footsteps', desc: 'Гулкий деревянный топот по доскам пирса' },
      { key: 'step_metal', name: 'Footstep (Metal)', category: 'footsteps', desc: 'Звонкий металлический шаг по решётке' },
      { key: 'step_water', name: 'Footstep (Water Splash)', category: 'footsteps', desc: 'Шлепок и брызги по мелководью' },
      { key: 'landing', name: 'Landing Thud', category: 'footsteps', desc: 'Тяжёлое приземление на ноги после прыжка' },
      { key: 'c4_beep', name: 'C4 Timer Beep', category: 'c4_grenades', desc: 'Ускоряющийся писк таймера бомбы' },
      { key: 'c4_plant', name: 'C4 Plant Keypad', category: 'c4_grenades', desc: 'Нажатие клавиш код-граббера C4' },
      { key: 'c4_defuse', name: 'C4 Defusing Snip', category: 'c4_grenades', desc: 'Кусачки и разминирование бомбы' },
      { key: 'explosion', name: 'C4 / HE Explosion', category: 'c4_grenades', desc: 'Оглушающий раскатистый взрыв с сотрясением' },
      { key: 'flashbang', name: 'Flashbang Tinnitus', category: 'c4_grenades', desc: 'Вспышка, оглушение и звон в ушах' },
      { key: 'grenade_bounce', name: 'Grenade Bounce', category: 'c4_grenades', desc: 'Отскок металлического корпуса гранаты' },
      { key: 'pinpull', name: 'Grenade Pin Pull', category: 'c4_grenades', desc: 'Выдёргивание чеки гранаты' },
      { key: 'radio_chirp', name: 'Radio Chirp', category: 'voice', desc: 'Шипение и щелчок армейской рации' },
      { key: 'ct_win', name: 'Counter-Terrorists Win', category: 'voice', desc: 'Голос диктора: Победа спецназа' },
      { key: 't_win', name: 'Terrorists Win', category: 'voice', desc: 'Голос диктора: Победа террористов' },
      { key: 'bomb_planted', name: 'Bomb Planted Voice', category: 'voice', desc: 'Голос диктора: Бомба заложена' },
      { key: 'bomb_defused', name: 'Bomb Defused Voice', category: 'voice', desc: 'Голос диктора: Бомба обезврежена' }
    ];

    // Try loading saved sound custom overrides from IndexedDB
    this.initIndexedDB();
  }

  // ==========================================
  // INITIALIZATION & AUDIO GRAPH SETUP
  // ==========================================

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });

      // Master output gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volumes.master, this.ctx.currentTime);

      // Environment Deafening Lowpass Filter (used for Flashbang / explosions)
      this.environmentFilter = this.ctx.createBiquadFilter();
      this.environmentFilter.type = 'lowpass';
      this.environmentFilter.frequency.setValueAtTime(20000, this.ctx.currentTime);
      this.environmentFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);

      this.environmentFilter.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // Sub-busses connected through environment filter
      this.weaponsGain = this.ctx.createGain();
      this.weaponsGain.gain.setValueAtTime(this.volumes.weapons, this.ctx.currentTime);
      this.weaponsGain.connect(this.environmentFilter);

      this.footstepsGain = this.ctx.createGain();
      this.footstepsGain.gain.setValueAtTime(this.volumes.footsteps, this.ctx.currentTime);
      this.footstepsGain.connect(this.environmentFilter);

      this.effectsGain = this.ctx.createGain();
      this.effectsGain.gain.setValueAtTime(this.volumes.effects, this.ctx.currentTime);
      this.effectsGain.connect(this.environmentFilter);

      this.voiceGain = this.ctx.createGain();
      this.voiceGain.gain.setValueAtTime(this.volumes.voice, this.ctx.currentTime);
      this.voiceGain.connect(this.environmentFilter);

      // UI sounds route directly to master gain (unaffected by flashbang muffle)
      this.uiGain = this.ctx.createGain();
      this.uiGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.uiGain.connect(this.masterGain);

      // Setup Algorithmic Spatial Convolver Reverb
      this.setupConvolver();

      // Synthesize all CS:GO audio buffers in memory
      this.synthesizeAllBuffers();

      // Pre-load saved custom sounds from IndexedDB
      this.loadSavedCustomSounds();

      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API initialization failed:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setupConvolver() {
    try {
      this.convolverNode = this.ctx.createConvolver();
      this.convolverNode.buffer = this.generateReverbIR(1.15, 3.8);

      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.setValueAtTime(this.volumes.reverb, this.ctx.currentTime);

      this.convolverNode.connect(this.reverbGain);
      this.reverbGain.connect(this.environmentFilter);
    } catch (e) {
      console.warn('Convolver setup warning:', e);
    }
  }

  // Procedural Reverb Impulse Response (stereo acoustic room/outdoor model)
  generateReverbIR(duration = 1.15, decay = 3.8) {
    const rate = this.ctx.sampleRate;
    const length = Math.floor(rate * duration);
    const irBuffer = this.ctx.createBuffer(2, length, rate);
    const left = irBuffer.getChannelData(0);
    const right = irBuffer.getChannelData(1);

    // Early discrete reflection taps
    const taps = [
      { time: 0.009, l: 0.65, r: 0.25 },
      { time: 0.018, l: 0.30, r: 0.60 },
      { time: 0.029, l: 0.45, r: 0.30 },
      { time: 0.042, l: 0.25, r: 0.40 },
      { time: 0.057, l: 0.35, r: 0.20 },
      { time: 0.075, l: 0.18, r: 0.28 }
    ];

    for (const tap of taps) {
      const idx = Math.floor(tap.time * rate);
      if (idx < length) {
        left[idx] += tap.l;
        right[idx] += tap.r;
      }
    }

    // Late diffuse tail with high-frequency absorption
    for (let i = 0; i < length; i++) {
      const t = i / rate;
      const env = Math.exp(-t * decay);
      const damp = Math.exp(-t * 2.2);
      const nL = (Math.random() * 2 - 1) * env * damp;
      const nR = (Math.random() * 2 - 1) * env * damp;
      left[i] += nL * 0.35;
      right[i] += nR * 0.35;
    }

    return irBuffer;
  }

  // ==========================================
  // PROCEDURAL SOUND SYNTHESIZER (CS:GO SOUND PROFILES)
  // ==========================================

  synthesizeAllBuffers() {
    const rate = this.ctx.sampleRate;

    // Helper: create empty stereo buffer
    const makeBuf = (durationSec) => {
      const samples = Math.floor(rate * durationSec);
      return {
        buffer: this.ctx.createBuffer(2, samples, rate),
        l: null,
        r: null,
        samples,
        rate
      };
    };

    // 1. AK-47: 7.62x39mm punchy low thump (195Hz -> 48Hz) + sharp bolt crack + stereo air
    {
      const b = makeBuf(0.72);
      const l = b.buffer.getChannelData(0);
      const r = b.buffer.getChannelData(1);
      for (let i = 0; i < b.samples; i++) {
        const t = i / rate;
        // Low punch with saturation
        const f = 195 * Math.exp(-t * 28) + 48;
        const sub = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 16);
        const subSat = Math.tanh(sub * 2.2);

        // Supersonic crack & gas noise
        const noise = (Math.random() * 2 - 1) * Math.exp(-t * 22);
        // Bolt mechanical transient
        const bolt = Math.sin(2 * Math.PI * 880 * t) * Math.exp(-t * 35) * 0.45;

        // Stereo body & tail
        const valL = (subSat * 0.75 + noise * 0.55 + bolt) * Math.max(0, 1 - t / 0.72);
        const valR = (subSat * 0.70 + (Math.random() * 2 - 1) * Math.exp(-t * 20) * 0.52 + bolt * 0.9) * Math.max(0, 1 - t / 0.72);

        l[i] = valL * 0.85;
        r[i] = valR * 0.85;
      }
      this.audioBuffers['ak47'] = b.buffer;
    }

    // 2. M4A4: 5.56mm snappy crack & rapid bolt recoil
    {
      const b = makeBuf(0.55);
      const l = b.buffer.getChannelData(0);
      const r = b.buffer.getChannelData(1);
      for (let i = 0; i < b.samples; i++) {
        const t = i / rate;
        const f = 165 * Math.exp(-t * 32) + 55;
        const sub = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 19);
        const subSat = Math.tanh(sub * 1.8);
        const crack = (Math.random() * 2 - 1) * Math.exp(-t * 26);
        const clack = Math.sin(2 * Math.PI * 1150 * t) * Math.exp(-t * 42) * 0.35;

        const val = (subSat * 0.65 + crack * 0.60 + clack) * Math.max(0, 1 - t / 0.55);
        l[i] = val * 0.78;
        r[i] = (val + (Math.random() - 0.5) * Math.exp(-t * 24) * 0.2) * 0.78;
      }
      this.audioBuffers['m4a1'] = b.buffer;
    }

    // 3. M4A1-S (Silenced): muffled sub-thump + suppressed hiss
    {
      const b = makeBuf(0.42);
      const l = b.buffer.getChannelData(0);
      const r = b.buffer.getChannelData(1);
      for (let i = 0; i < b.samples; i++) {
        const t = i / rate;
        const f = 120 * Math.exp(-t * 35) + 42;
        const sub = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 22) * 0.5;
        const hiss = (Math.random() * 2 - 1) * Math.exp(-t * 28) * 0.45;
        const baffle = Math.sin(2 * Math.PI * 450 * t) * Math.exp(-t * 30) * 0.25;

        const val = (sub + hiss + baffle) * Math.max(0, 1 - t / 0.42);
        l[i] = val * 0.75;
        r[i] = val * 0.75;
      }
      this.audioBuffers['m4a1_silenced'] = b.buffer;
    }

    // 4. AWP: .338 Lapua massive cannon blast + thunderous sub-bass echo
    {
      const b = makeBuf(1.35);
      const l = b.buffer.getChannelData(0);
      const r = b.buffer.getChannelData(1);
      for (let i = 0; i < b.samples; i++) {
        const t = i / rate;
        // Deep chest thump
        const f = 250 * Math.exp(-t * 12) + 28;
        const sub = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 6.5);
        const sub2 = Math.sin(2 * Math.PI * (f * 0.5) * t) * Math.exp(-t * 5.0) * 0.6;
        const subSat = Math.tanh((sub + sub2) * 2.5);

        // Supersonic crack & rolling thunder
        const crack = (Math.random() * 2 - 1) * Math.exp(-t * 16) * 0.85;
        const thunderL = (Math.random() * 2 - 1) * Math.exp(-t * 4.2) * 0.45;
        const thunderR = (Math.random() * 2 - 1) * Math.exp(-t * 4.0) * 0.45;

        // Metallic ping
        const ping = Math.sin(2 * Math.PI * 720 * t) * Math.exp(-t * 10) * 0.3;

        l[i] = (subSat * 0.85 + crack + thunderL + ping) * 0.85;
        r[i] = (subSat * 0.85 + crack + thunderR + ping * 0.9) * 0.85;
      }
      this.audioBuffers['awp'] = b.buffer;
    }

    // 5. AWP Bolt Action cycle
    {
      const b = makeBuf(0.55);
      const l = b.buffer.getChannelData(0);
      const r = b.buffer.getChannelData(1);
      for (let i = 0; i < b.samples; i++) {
        const t = i / rate;
        let val = 0;
        // Lift
        if (t >= 0.05 && t < 0.16) val += Math.sin(2 * Math.PI * 650 * (t - 0.05)) * Math.exp(-(t - 0.05) * 40);
        // Pull back
        if (t >= 0.20 && t < 0.35) val += (Math.random() * 2 - 1) * Math.exp(-(t - 0.20) * 35) * 0.6;
        // Push forward & lock
        if (t >= 0.38 && t < 0.52) val += Math.sin(2 * Math.PI * 880 * (t - 0.38)) * Math.exp(-(t - 0.38) * 45) * 0.8;
        l[i] = val * 0.4;
        r[i] = val * 0.4;
      }
      this.audioBuffers['awp_bolt'] = b.buffer;
    }

    // 6. SSG 08 (Scout): crisp .308 bolt action snap
    {
      const b = makeBuf(0.58);
      const l = b.buffer.getChannelData(0);
      const r = b.buffer.getChannelData(1);
      for (let i = 0; i < b.samples; i++) {
        const t = i / rate;
        const f = 240 * Math.exp(-t * 26) + 52;
        const sub = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 18);
        const crack = (Math.random() * 2 - 1) * Math.exp(-t * 24) * 0.7;
        const val = (Math.tanh(sub * 2.0) * 0.65 + crack) * Math.max(0, 1 - t / 0.58);
        l[i] = val * 0.8;
        r[i] = val * 0.8;
      }
      this.audioBuffers['scout'] = b.buffer;
    }

    // 7. SCAR-20: Heavy auto-sniper tactical report
    {
      const b = makeBuf(0.52);
      const l = b.buffer.getChannelData(0);
      const r = b.buffer.getChannelData(1);
      for (let i = 0; i < b.samples; i++) {
        const t = i / rate;
        const f = 210 * Math.exp(-t * 24) + 46;
        const sub = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 16);
        const crack = (Math.random() * 2 - 1) * Math.exp(-t * 22) * 0.65;
        const val = (Math.tanh(sub * 2.2) * 0.7 + crack) * Math.max(0, 1 - t / 0.52);
        l[i] = val * 0.82;
        r[i] = val * 0.82;
      }
      this.audioBuffers['scar20'] = b.buffer;
    }

    // 8. Desert Eagle (.50 Action Express): thunderous hand cannon
    {
      const b = makeBuf(0.68);
      const l = b.buffer.getChannelData(0);
      const r = b.buffer.getChannelData(1);
      for (let i = 0; i < b.samples; i++) {
        const t = i / rate;
        const f = 270 * Math.exp(-t * 22) + 42;
        const sub = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 14);
        const subSat = Math.tanh(sub * 2.4);
        const crack = (Math.random() * 2 - 1) * Math.exp(-t * 20) * 0.75;
        const ring = Math.sin(2 * Math.PI * 1250 * t) * Math.exp(-t * 16) * 0.35;

        const val = (subSat * 0.8 + crack + ring) * Math.max(0, 1 - t / 0.68);
        l[i] = val * 0.85;
        r[i] = val * 0.85;
      }
      this.audioBuffers['deagle'] = b.buffer;
    }

    // 9. USP Tactical
    {
      const b = makeBuf(0.42);
      const l = b.buffer.getChannelData(0);
      const r = b.buffer.getChannelData(1);
      for (let i = 0; i < b.samples; i++) {
        const t = i / rate;
        const f = 260 * Math.exp(-t * 30) + 60;
        const sub = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 22);
        const crack = (Math.random() * 2 - 1) * Math.exp(-t * 28) * 0.55;
        const val = (Math.tanh(sub * 1.8) * 0.6 + crack) * Math.max(0, 1 - t / 0.42);
        l[i] = val * 0.72;
        r[i] = val * 0.72;
      }
      this.audioBuffers['usp'] = b.buffer;
    }

    // 10. USP-S (Suppressed)
    {
      const b = makeBuf(0.35);
      const l = b.buffer.getChannelData(0);
      const r = b.buffer.getChannelData(1);
      for (let i = 0; i < b.samples; i++) {
        const t = i / rate;
        const f = 140 * Math.exp(-t * 40) + 50;
        const sub = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 30) * 0.4;
        const hiss = (Math.random() * 2 - 1) * Math.exp(-t * 32) * 0.38;
        const val = (sub + hiss) * Math.max(0, 1 - t / 0.35);
        l[i] = val * 0.7;
        r[i] = val * 0.7;
      }
      this.audioBuffers['usp_silenced'] = b.buffer;
    }

    // 11. Glock-18: snappy 9mm polymer pistol
    {
      const b = makeBuf(0.38);
      const l = b.buffer.getChannelData(0);
      const r = b.buffer.getChannelData(1);
      for (let i = 0; i < b.samples; i++) {
        const t = i / rate;
        const f = 240 * Math.exp(-t * 35) + 68;
        const sub = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 26);
        const snap = (Math.random() * 2 - 1) * Math.exp(-t * 32) * 0.55;
        const val = (sub * 0.5 + snap) * Math.max(0, 1 - t / 0.38);
        l[i] = val * 0.7;
        r[i] = val * 0.7;
      }
      this.audioBuffers['glock'] = b.buffer;
    }

    // 12. CS:GO HEADSHOT ("DINK"): iconic double metallic bell ping & armor crunch
    {
      const b = makeBuf(0.38);
      const l = b.buffer.getChannelData(0);
      const r = b.buffer.getChannelData(1);
      for (let i = 0; i < b.samples; i++) {
        const t = i / rate;
        // Ultra-sharp impact click
        const click = (Math.random() * 2 - 1) * Math.exp(-t * 350) * 0.8;
        // Signature dual ringing metallic frequencies
        const dink1 = Math.sin(2 * Math.PI * 3080 * t) * Math.exp(-t * 14.5) * 0.65;
        const dink2 = Math.sin(2 * Math.PI * 4220 * t) * Math.exp(-t * 19.0) * 0.45;
        const dink3 = Math.sin(2 * Math.PI * 1860 * t) * Math.exp(-t * 22.0) * 0.28;

        const val = (click + dink1 + dink2 + dink3) * Math.max(0, 1 - t / 0.38);
        l[i] = val * 0.88;
        r[i] = val * 0.88;
      }
      this.audioBuffers['headshot'] = b.buffer;
    }

    // 13. CS:GO HITMARKER (Kevlar Body Hit): punchy flesh & ballistic weave crunch
    {
      const b = makeBuf(0.14);
      const l = b.buffer.getChannelData(0);
      const r = b.buffer.getChannelData(1);
      for (let i = 0; i < b.samples; i++) {
        const t = i / rate;
        const thump = Math.sin(2 * Math.PI * (150 * Math.exp(-t * 40) + 40) * t) * Math.exp(-t * 35) * 0.65;
        const weave = (Math.random() * 2 - 1) * Math.exp(-t * 45) * 0.55;
        const val = (thump + weave) * Math.max(0, 1 - t / 0.14);
        l[i] = val * 0.75;
        r[i] = val * 0.75;
      }
      this.audioBuffers['hitmarker'] = b.buffer;
    }

    // 14. Knife Slash (air whoosh)
    {
      const b = makeBuf(0.22);
      const l = b.buffer.getChannelData(0);
      const r = b.buffer.getChannelData(1);
      for (let i = 0; i < b.samples; i++) {
        const t = i / rate;
        const env = Math.sin(Math.PI * (t / 0.22));
        const noise = (Math.random() * 2 - 1) * env * 0.5;
        const whoosh = Math.sin(2 * Math.PI * (600 - t * 1500) * t) * env * 0.3;
        l[i] = (noise + whoosh) * 0.6;
        r[i] = (noise + whoosh) * 0.6;
      }
      this.audioBuffers['knife_slash'] = b.buffer;
    }

    // 15. Knife Hit
    {
      const b = makeBuf(0.18);
      const l = b.buffer.getChannelData(0);
      const r = b.buffer.getChannelData(1);
      for (let i = 0; i < b.samples; i++) {
        const t = i / rate;
        const strike = Math.sin(2 * Math.PI * 750 * t) * Math.exp(-t * 45) * 0.6;
        const noise = (Math.random() * 2 - 1) * Math.exp(-t * 40) * 0.5;
        const val = (strike + noise) * Math.max(0, 1 - t / 0.18);
        l[i] = val * 0.7;
        r[i] = val * 0.7;
      }
      this.audioBuffers['knife_hit'] = b.buffer;
    }

    // 16. Weapon Deploy (draw & slide cock)
    {
      const b = makeBuf(0.28);
      const l = b.buffer.getChannelData(0);
      const r = b.buffer.getChannelData(1);
      for (let i = 0; i < b.samples; i++) {
        const t = i / rate;
        let val = (Math.random() * 2 - 1) * Math.exp(-t * 30) * 0.25;
        if (t > 0.08) {
          val += Math.sin(2 * Math.PI * 1450 * (t - 0.08)) * Math.exp(-(t - 0.08) * 45) * 0.5;
        }
        l[i] = val * 0.55;
        r[i] = val * 0.55;
      }
      this.audioBuffers['deploy'] = b.buffer;
    }

    // 17. Reload stages: Clip Out, Clip In, Bolt Pull
    {
      // Clip out
      const b1 = makeBuf(0.24);
      const l1 = b1.buffer.getChannelData(0);
      const r1 = b1.buffer.getChannelData(1);
      for (let i = 0; i < b1.samples; i++) {
        const t = i / rate;
        const click = Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-t * 50) * 0.5;
        const slide = (Math.random() * 2 - 1) * Math.exp(-t * 25) * 0.35;
        l1[i] = (click + slide) * 0.6;
        r1[i] = l1[i];
      }
      this.audioBuffers['clipout'] = b1.buffer;

      // Clip in
      const b2 = makeBuf(0.22);
      const l2 = b2.buffer.getChannelData(0);
      const r2 = b2.buffer.getChannelData(1);
      for (let i = 0; i < b2.samples; i++) {
        const t = i / rate;
        const thud = Math.sin(2 * Math.PI * 420 * t) * Math.exp(-t * 40) * 0.6;
        const latch = Math.sin(2 * Math.PI * 1850 * t) * Math.exp(-t * 60) * 0.55;
        l2[i] = (thud + latch) * 0.65;
        r2[i] = l2[i];
      }
      this.audioBuffers['clipin'] = b2.buffer;

      // Bolt pull
      const b3 = makeBuf(0.32);
      const l3 = b3.buffer.getChannelData(0);
      const r3 = b3.buffer.getChannelData(1);
      for (let i = 0; i < b3.samples; i++) {
        const t = i / rate;
        let val = (Math.random() * 2 - 1) * Math.exp(-t * 30) * 0.3;
        if (t > 0.12) {
          val += Math.sin(2 * Math.PI * 620 * (t - 0.12)) * Math.exp(-(t - 0.12) * 35) * 0.7;
        }
        l3[i] = val * 0.65;
        r3[i] = l3[i];
      }
      this.audioBuffers['boltpull'] = b3.buffer;
    }

    // 18. Dry fire empty ammo click
    {
      const b = makeBuf(0.12);
      const l = b.buffer.getChannelData(0);
      const r = b.buffer.getChannelData(1);
      for (let i = 0; i < b.samples; i++) {
        const t = i / rate;
        const click = Math.sin(2 * Math.PI * 1850 * t) * Math.exp(-t * 70) * 0.6;
        const res = Math.sin(2 * Math.PI * 740 * t) * Math.exp(-t * 50) * 0.35;
        l[i] = (click + res) * 0.5;
        r[i] = l[i];
      }
      this.audioBuffers['empty_ammo'] = b.buffer;
    }

    // 19. Footsteps on different surfaces: Concrete, Sand, Wood, Metal, Water
    {
      // Concrete / Stone
      const bc = makeBuf(0.18);
      const lc = bc.buffer.getChannelData(0);
      const rc = bc.buffer.getChannelData(1);
      for (let i = 0; i < bc.samples; i++) {
        const t = i / rate;
        const thump = Math.sin(2 * Math.PI * (160 * Math.exp(-t * 40) + 40) * t) * Math.exp(-t * 35) * 0.45;
        const scrape = (Math.random() * 2 - 1) * Math.exp(-t * 55) * 0.35;
        lc[i] = (thump + scrape) * 0.75;
        rc[i] = lc[i];
      }
      this.audioBuffers['step_concrete'] = bc.buffer;

      // Sand / Dirt
      const bs = makeBuf(0.19);
      const ls = bs.buffer.getChannelData(0);
      const rs = bs.buffer.getChannelData(1);
      for (let i = 0; i < bs.samples; i++) {
        const t = i / rate;
        const crunch = (Math.random() * 2 - 1) * Math.sin(Math.PI * Math.min(1, t / 0.08)) * Math.exp(-t * 22) * 0.45;
        const sub = Math.sin(2 * Math.PI * 85 * t) * Math.exp(-t * 30) * 0.3;
        ls[i] = (crunch + sub) * 0.7;
        rs[i] = ls[i];
      }
      this.audioBuffers['step_sand'] = bs.buffer;

      // Wood
      const bw = makeBuf(0.17);
      const lw = bw.buffer.getChannelData(0);
      const rw = bw.buffer.getChannelData(1);
      for (let i = 0; i < bw.samples; i++) {
        const t = i / rate;
        const knock = (Math.sin(2 * Math.PI * 135 * t) + Math.sin(2 * Math.PI * 310 * t) * 0.5) * Math.exp(-t * 35) * 0.55;
        const tap = (Math.random() * 2 - 1) * Math.exp(-t * 45) * 0.25;
        lw[i] = (knock + tap) * 0.72;
        rw[i] = lw[i];
      }
      this.audioBuffers['step_wood'] = bw.buffer;

      // Metal
      const bm = makeBuf(0.20);
      const lm = bm.buffer.getChannelData(0);
      const rm = bm.buffer.getChannelData(1);
      for (let i = 0; i < bm.samples; i++) {
        const t = i / rate;
        const clang = (Math.sin(2 * Math.PI * 460 * t) + Math.sin(2 * Math.PI * 1750 * t) * 0.6) * Math.exp(-t * 28) * 0.5;
        lm[i] = clang * 0.7;
        rm[i] = lm[i];
      }
      this.audioBuffers['step_metal'] = bm.buffer;

      // Water splash
      const bwt = makeBuf(0.22);
      const lwt = bwt.buffer.getChannelData(0);
      const rwt = bwt.buffer.getChannelData(1);
      for (let i = 0; i < bwt.samples; i++) {
        const t = i / rate;
        const bubble = Math.sin(2 * Math.PI * (420 - t * 800) * t) * Math.exp(-t * 25) * 0.4;
        const splash = (Math.random() * 2 - 1) * Math.exp(-t * 22) * 0.35;
        lwt[i] = (bubble + splash) * 0.65;
        rwt[i] = lwt[i];
      }
      this.audioBuffers['step_water'] = bwt.buffer;

      // Landing thud
      const bth = makeBuf(0.32);
      const lth = bth.buffer.getChannelData(0);
      const rth = bth.buffer.getChannelData(1);
      for (let i = 0; i < bth.samples; i++) {
        const t = i / rate;
        const heavy = Math.sin(2 * Math.PI * (110 * Math.exp(-t * 20) + 30) * t) * Math.exp(-t * 15) * 0.7;
        const dust = (Math.random() * 2 - 1) * Math.exp(-t * 20) * 0.4;
        lth[i] = (heavy + dust) * 0.8;
        rth[i] = lth[i];
      }
      this.audioBuffers['landing'] = bth.buffer;
    }

    // 20. C4 Beep & Electronic Tones
    {
      const b = makeBuf(0.09);
      const l = b.buffer.getChannelData(0);
      const r = b.buffer.getChannelData(1);
      for (let i = 0; i < b.samples; i++) {
        const t = i / rate;
        const beep = Math.sin(2 * Math.PI * 1280 * t) * Math.exp(-t * 40) * 0.55;
        l[i] = beep;
        r[i] = beep;
      }
      this.audioBuffers['c4_beep'] = b.buffer;
    }

    // 21. C4 Keypad Press
    {
      const b = makeBuf(0.08);
      const l = b.buffer.getChannelData(0);
      const r = b.buffer.getChannelData(1);
      for (let i = 0; i < b.samples; i++) {
        const t = i / rate;
        const tone = (Math.sin(2 * Math.PI * 1209 * t) + Math.sin(2 * Math.PI * 697 * t)) * 0.3 * Math.exp(-t * 45);
        l[i] = tone;
        r[i] = tone;
      }
      this.audioBuffers['c4_plant'] = b.buffer;
    }

    // 22. C4 Defuse wire snip
    {
      const b = makeBuf(0.12);
      const l = b.buffer.getChannelData(0);
      const r = b.buffer.getChannelData(1);
      for (let i = 0; i < b.samples; i++) {
        const t = i / rate;
        const snip = Math.sin(2 * Math.PI * 1600 * t) * Math.exp(-t * 60) * 0.5;
        l[i] = snip;
        r[i] = snip;
      }
      this.audioBuffers['c4_defuse'] = b.buffer;
    }

    // 23. Massive Explosion (C4 & HE Grenade)
    {
      const b = makeBuf(2.2);
      const l = b.buffer.getChannelData(0);
      const r = b.buffer.getChannelData(1);
      for (let i = 0; i < b.samples; i++) {
        const t = i / rate;
        const sub = Math.sin(2 * Math.PI * (90 * Math.exp(-t * 6) + 20) * t) * Math.exp(-t * 2.2);
        const subSat = Math.tanh(sub * 3.0);
        const rumbleL = (Math.random() * 2 - 1) * Math.exp(-t * 2.8) * 0.7;
        const rumbleR = (Math.random() * 2 - 1) * Math.exp(-t * 2.6) * 0.7;
        l[i] = (subSat * 0.8 + rumbleL) * 0.9;
        r[i] = (subSat * 0.8 + rumbleR) * 0.9;
      }
      this.audioBuffers['explosion'] = b.buffer;
    }

    // 24. Flashbang Ear-Ringing Tinnitus
    {
      const b = makeBuf(3.5);
      const l = b.buffer.getChannelData(0);
      const r = b.buffer.getChannelData(1);
      for (let i = 0; i < b.samples; i++) {
        const t = i / rate;
        // Initial blast pop
        const pop = (Math.random() * 2 - 1) * Math.exp(-t * 30) * 0.8;
        // Pure high frequency tinnitus ringing tone (3850 Hz)
        const ring = Math.sin(2 * Math.PI * 3850 * t) * Math.exp(-t * 1.1) * 0.35;
        l[i] = pop + ring;
        r[i] = pop + ring;
      }
      this.audioBuffers['flashbang'] = b.buffer;
    }

    // 25. Grenade bounce
    {
      const b = makeBuf(0.16);
      const l = b.buffer.getChannelData(0);
      const r = b.buffer.getChannelData(1);
      for (let i = 0; i < b.samples; i++) {
        const t = i / rate;
        const clink = Math.sin(2 * Math.PI * 2300 * t) * Math.exp(-t * 50) * 0.55;
        const thud = Math.sin(2 * Math.PI * 340 * t) * Math.exp(-t * 40) * 0.45;
        l[i] = (clink + thud) * 0.6;
        r[i] = l[i];
      }
      this.audioBuffers['grenade_bounce'] = b.buffer;
    }

    // 26. Pin pull
    {
      const b = makeBuf(0.24);
      const l = b.buffer.getChannelData(0);
      const r = b.buffer.getChannelData(1);
      for (let i = 0; i < b.samples; i++) {
        const t = i / rate;
        const scrape = (Math.random() * 2 - 1) * Math.exp(-t * 25) * 0.3;
        const click = Math.sin(2 * Math.PI * 2600 * t) * Math.exp(-t * 60) * 0.5;
        l[i] = (scrape + click) * 0.55;
        r[i] = l[i];
      }
      this.audioBuffers['pinpull'] = b.buffer;
    }

    // 27. Radio chirp
    {
      const b = makeBuf(0.09);
      const l = b.buffer.getChannelData(0);
      const r = b.buffer.getChannelData(1);
      for (let i = 0; i < b.samples; i++) {
        const t = i / rate;
        const chirp = (Math.sin(2 * Math.PI * 850 * t) + Math.sin(2 * Math.PI * 1480 * t)) * 0.35 * Math.exp(-t * 30);
        l[i] = chirp;
        r[i] = chirp;
      }
      this.audioBuffers['radio_chirp'] = b.buffer;
    }
  }

  // ==========================================
  // 3D SPATIAL AUDIO (HRTF) & ZERO-LATENCY POLYPHONY
  // ==========================================

  updateListener(camera) {
    if (!this.ctx || !camera) return;
    const t = this.ctx.currentTime;
    const listener = this.ctx.listener;

    this._listenerPos.x = camera.position.x;
    this._listenerPos.y = camera.position.y;
    this._listenerPos.z = camera.position.z;

    // Modern Web Audio AudioParam vs legacy fallback
    if (listener.positionX) {
      listener.positionX.setValueAtTime(camera.position.x, t);
      listener.positionY.setValueAtTime(camera.position.y, t);
      listener.positionZ.setValueAtTime(camera.position.z, t);
    } else if (listener.setPosition) {
      listener.setPosition(camera.position.x, camera.position.y, camera.position.z);
    }

    // Direction vectors
    if (typeof THREE !== 'undefined') {
      if (!this._forwardVec) this._forwardVec = new THREE.Vector3();
      if (!this._upVec) this._upVec = new THREE.Vector3();

      this._forwardVec.set(0, 0, -1).applyQuaternion(camera.quaternion);
      this._upVec.set(0, 1, 0).applyQuaternion(camera.quaternion);

      if (listener.forwardX) {
        listener.forwardX.setValueAtTime(this._forwardVec.x, t);
        listener.forwardY.setValueAtTime(this._forwardVec.y, t);
        listener.forwardZ.setValueAtTime(this._forwardVec.z, t);
        listener.upX.setValueAtTime(this._upVec.x, t);
        listener.upY.setValueAtTime(this._upVec.y, t);
        listener.upZ.setValueAtTime(this._upVec.z, t);
      } else if (listener.setOrientation) {
        listener.setOrientation(
          this._forwardVec.x, this._forwardVec.y, this._forwardVec.z,
          this._upVec.x, this._upVec.y, this._upVec.z
        );
      }
    }
  }

  // Check if a line from listener to sound source is occluded by walls
  checkOcclusion(sourcePos) {
    if (!window.csGame || !window.csGame.map || !window.csGame.map.colliders) return false;
    if (typeof THREE === 'undefined') return false;

    if (!this._occRay) {
      this._occRay = new THREE.Ray();
      this._occDir = new THREE.Vector3();
      this._occStart = new THREE.Vector3();
      this._occEnd = new THREE.Vector3();
    }

    this._occStart.set(this._listenerPos.x, this._listenerPos.y, this._listenerPos.z);
    this._occEnd.set(sourcePos.x, sourcePos.y || 1.5, sourcePos.z);
    this._occDir.subVectors(this._occEnd, this._occStart);
    const dist = this._occDir.length();
    if (dist < 1.0) return false;

    this._occDir.normalize();
    this._occRay.set(this._occStart, this._occDir);

    const colliders = window.csGame.map.colliders;
    for (let i = 0; i < colliders.length; i++) {
      const box = colliders[i];
      const hit = this._occRay.intersectBox(box, new THREE.Vector3());
      if (hit) {
        const hitDist = this._occStart.distanceTo(hit);
        if (hitDist > 0.5 && hitDist < dist - 0.5) {
          return true; // Wall between player and sound source!
        }
      }
    }
    return false;
  }

  // Core sound playback method with full polyphony & 3D spatialization
  playSound(key, { pos = null, pitch = 1.0, volume = 1.0, bus = 'weapons', loop = false } = {}) {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const buffer = this.audioBuffers[key];
    if (!buffer) return;

    const t = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(pitch, t);
    source.loop = loop;

    const voiceGain = this.ctx.createGain();
    voiceGain.gain.setValueAtTime(volume, t);

    // Get sub-bus
    let targetBus = this.masterGain;
    if (bus === 'weapons' && this.weaponsGain) targetBus = this.weaponsGain;
    else if (bus === 'footsteps' && this.footstepsGain) targetBus = this.footstepsGain;
    else if (bus === 'effects' && this.effectsGain) targetBus = this.effectsGain;
    else if (bus === 'voice' && this.voiceGain) targetBus = this.voiceGain;
    else if (bus === 'ui' && this.uiGain) targetBus = this.uiGain;

    // 3D Spatial Audio setup
    if (pos && this.spatialEnabled && typeof pos.x === 'number') {
      const panner = this.ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 3.0;
      panner.maxDistance = 120.0;
      panner.rolloffFactor = 1.0;

      const posX = pos.x;
      const posY = typeof pos.y === 'number' ? pos.y : 1.5;
      const posZ = pos.z;

      if (panner.positionX) {
        panner.positionX.setValueAtTime(posX, t);
        panner.positionY.setValueAtTime(posY, t);
        panner.positionZ.setValueAtTime(posZ, t);
      } else if (panner.setPosition) {
        panner.setPosition(posX, posY, posZ);
      }

      // Check wall occlusion & distance air absorption
      const isOccluded = this.checkOcclusion(pos);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';

      const dx = posX - this._listenerPos.x;
      const dy = posY - this._listenerPos.y;
      const dz = posZ - this._listenerPos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (isOccluded) {
        // Realistic muffled sound behind walls
        filter.frequency.setValueAtTime(850, t);
        filter.Q.setValueAtTime(0.7, t);
        voiceGain.gain.setValueAtTime(volume * 0.65, t);
      } else {
        // Natural high-frequency atmospheric damping over distance
        const airCutoff = Math.max(3000, 20000 - dist * 160);
        filter.frequency.setValueAtTime(airCutoff, t);
      }

      source.connect(filter);
      filter.connect(voiceGain);
      voiceGain.connect(panner);
      panner.connect(targetBus);

      // Reverb send for gunfire and explosions
      if (this.convolverNode && this.reverbGain && this.reverbEnabled && (bus === 'weapons' || bus === 'effects')) {
        panner.connect(this.convolverNode);
      }

      source.onended = () => {
        try {
          source.disconnect();
          filter.disconnect();
          voiceGain.disconnect();
          panner.disconnect();
        } catch (e) {}
      };
    } else {
      // 2D Stereo Direct (Player's own shots, own steps, UI)
      source.connect(voiceGain);
      voiceGain.connect(targetBus);

      if (this.convolverNode && this.reverbGain && this.reverbEnabled && (bus === 'weapons' || bus === 'effects')) {
        voiceGain.connect(this.convolverNode);
      }

      source.onended = () => {
        try {
          source.disconnect();
          voiceGain.disconnect();
        } catch (e) {}
      };
    }

    source.start(t);
    return source;
  }

  // ==========================================
  // WEAPON SOUND API (PUBLIC CS:GO SIGNATURES)
  // ==========================================

  playAK47(pos = null) {
    const pitch = 0.98 + Math.random() * 0.04;
    this.playSound('ak47', { pos, pitch, volume: 1.0, bus: 'weapons' });
  }

  playM4A1(silenced = false, pos = null) {
    const pitch = 0.98 + Math.random() * 0.04;
    const key = silenced ? 'm4a1_silenced' : 'm4a1';
    this.playSound(key, { pos, pitch, volume: silenced ? 0.85 : 0.95, bus: 'weapons' });
  }

  playAWP(pos = null) {
    const pitch = 0.99 + Math.random() * 0.02;
    this.playSound('awp', { pos, pitch, volume: 1.25, bus: 'weapons' });
    setTimeout(() => {
      this.playSound('awp_bolt', { pos, volume: 0.8, bus: 'weapons' });
    }, 450);
  }

  playScout(pos = null) {
    const pitch = 0.98 + Math.random() * 0.04;
    this.playSound('scout', { pos, pitch, volume: 0.95, bus: 'weapons' });
  }

  playScar20(pos = null) {
    const pitch = 0.98 + Math.random() * 0.04;
    this.playSound('scar20', { pos, pitch, volume: 1.0, bus: 'weapons' });
  }

  playDeagle(pos = null) {
    const pitch = 0.97 + Math.random() * 0.06;
    this.playSound('deagle', { pos, pitch, volume: 1.15, bus: 'weapons' });
  }

  playUSP(silenced = false, pos = null) {
    const pitch = 0.98 + Math.random() * 0.04;
    const key = silenced ? 'usp_silenced' : 'usp';
    this.playSound(key, { pos, pitch, volume: 0.85, bus: 'weapons' });
  }

  playGlock(pos = null) {
    const pitch = 0.98 + Math.random() * 0.04;
    this.playSound('glock', { pos, pitch, volume: 0.85, bus: 'weapons' });
  }

  playKnifeSlash(pos = null) {
    const pitch = 0.95 + Math.random() * 0.1;
    this.playSound('knife_slash', { pos, pitch, volume: 0.75, bus: 'weapons' });
  }

  playKnifeHit(pos = null) {
    const pitch = 0.95 + Math.random() * 0.1;
    this.playSound('knife_hit', { pos, pitch, volume: 0.85, bus: 'weapons' });
  }

  // ==========================================
  // RELOAD & HANDLING
  // ==========================================

  playDeploy(pos = null) {
    this.playSound('deploy', { pos, volume: 0.65, bus: 'weapons' });
  }

  playClipOut(pos = null) {
    this.playSound('clipout', { pos, volume: 0.75, bus: 'weapons' });
  }

  playClipIn(pos = null) {
    this.playSound('clipin', { pos, volume: 0.80, bus: 'weapons' });
  }

  playBoltPull(pos = null) {
    this.playSound('boltpull', { pos, volume: 0.85, bus: 'weapons' });
  }

  playReload(pos = null) {
    this.playClipOut(pos);
    setTimeout(() => this.playClipIn(pos), 650);
    setTimeout(() => this.playBoltPull(pos), 1350);
  }

  playMechanicalClick(pitchMod = 1.0, freq = 500, pos = null) {
    this.playSound('deploy', { pos, pitch: pitchMod, volume: 0.5, bus: 'ui' });
  }

  playEmptyAmmoClick(pos = null) {
    this.playSound('empty_ammo', { pos, volume: 0.85, bus: 'weapons' });
  }

  // ==========================================
  // HITS & DAMAGE (CS:GO DINK & HITMARKER)
  // ==========================================

  playHeadshot(pos = null) {
    this.playSound('headshot', { pos, volume: 1.15, bus: 'effects' });
  }

  playFleshHit(pos = null) {
    this.playSound('hitmarker', { pos, volume: 0.9, bus: 'effects' });
  }

  playWallHit(pos = null) {
    this.playSound('grenade_bounce', { pos, pitch: 1.4, volume: 0.45, bus: 'effects' });
  }

  playLandingThud(intensity = 1.0, pos = null) {
    this.playSound('landing', { pos, volume: Math.min(1.2, 0.6 * intensity), bus: 'footsteps' });
  }

  playWaterSplash(pos = null) {
    this.playSound('step_water', { pos, volume: 0.8, bus: 'effects' });
  }

  playBulletWhiz(pos = null) {
    if (!this.ctx) return;
    const pitch = 0.9 + Math.random() * 0.2;
    this.playSound('knife_slash', { pos, pitch: 2.2 * pitch, volume: 0.4, bus: 'effects' });
  }

  playDeathSound(isHeadshot = false, pos = null) {
    if (isHeadshot) {
      this.playHeadshot(pos);
    } else {
      this.playFleshHit(pos);
    }
    setTimeout(() => this.playLandingThud(0.8, pos), 200);
  }

  // ==========================================
  // FOOTSTEPS WITH SURFACE SYNC & SHIFT MUTING
  // ==========================================

  playFootstep(surface = 'concrete', pos = null) {
    let key = 'step_concrete';
    if (surface === 'sand') key = 'step_sand';
    else if (surface === 'wood') key = 'step_wood';
    else if (surface === 'metal') key = 'step_metal';
    else if (surface === 'water') key = 'step_water';

    const pitch = 0.95 + Math.random() * 0.1;
    this.playSound(key, { pos, pitch, volume: 0.85, bus: 'footsteps' });
  }

  // ==========================================
  // C4, GRENADES & FLASHBANG SIMULATION
  // ==========================================

  playBombBeep(pitch = 1200, pos = null) {
    const pitchFactor = pitch / 1200;
    this.playSound('c4_beep', { pos, pitch: pitchFactor, volume: 0.9, bus: 'effects' });
  }

  playC4KeypadPress(freq = 1200, pos = null) {
    this.playSound('c4_plant', { pos, volume: 0.6, bus: 'effects' });
  }

  playC4Disarm(pos = null) {
    this.playSound('c4_defuse', { pos, volume: 0.75, bus: 'effects' });
  }

  playExplosion(pos = null) {
    this.playSound('explosion', { pos, volume: 1.4, bus: 'effects' });
  }

  playGrenadeBounce(pos = null) {
    const pitch = 0.9 + Math.random() * 0.2;
    this.playSound('grenade_bounce', { pos, pitch, volume: 0.75, bus: 'effects' });
  }

  playPinPull(pos = null) {
    this.playSound('pinpull', { pos, volume: 0.8, bus: 'effects' });
  }

  // Flashbang ear-ringing tinnitus + environment deafening muffle filter
  playFlashbang(pos = null) {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();

    const t = this.ctx.currentTime;
    // Play tinnitus sound
    this.playSound('flashbang', { pos, volume: 1.2, bus: 'effects' });

    // Deafening environmental muffle (cut off everything above 350Hz, then slowly recover over 3.2 seconds)
    if (this.environmentFilter) {
      this.environmentFilter.frequency.cancelScheduledValues(t);
      this.environmentFilter.frequency.setValueAtTime(320, t);
      this.environmentFilter.frequency.exponentialRampToValueAtTime(20000, t + 3.2);
    }
  }

  // ==========================================
  // RADIO & VOICE ANNOUNCEMENTS
  // ==========================================

  playRadioChirp() {
    this.playSound('radio_chirp', { volume: 0.5, bus: 'ui' });
  }

  speakRadio(text) {
    this.playRadioChirp();

    // Check if we have a custom user-loaded audio file for this announcement
    const lower = text.toLowerCase();
    if (lower.includes('counter-terrorists win') && this.audioBuffers['ct_win']) {
      this.playSound('ct_win', { volume: 1.0, bus: 'voice' });
      return;
    }
    if (lower.includes('terrorists win') && this.audioBuffers['t_win']) {
      this.playSound('t_win', { volume: 1.0, bus: 'voice' });
      return;
    }
    if (lower.includes('planted') && this.audioBuffers['bomb_planted']) {
      this.playSound('bomb_planted', { volume: 1.0, bus: 'voice' });
      return;
    }
    if (lower.includes('defused') && this.audioBuffers['bomb_defused']) {
      this.playSound('bomb_defused', { volume: 1.0, bus: 'voice' });
      return;
    }

    // SpeechSynthesis fallback with authentic military radio styling
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.15;
        u.pitch = 0.95;
        u.volume = this.volumes.master * this.volumes.voice;
        const voices = window.speechSynthesis.getVoices();
        const enVoice = voices.find(v => v.lang.startsWith('en') && !v.name.includes('Google')) || voices.find(v => v.lang.startsWith('en'));
        if (enVoice) u.voice = enVoice;
        window.speechSynthesis.speak(u);
      } catch (e) {
        console.warn('SpeechSynthesis error:', e);
      }
    }
  }

  // UI Sounds
  playMenuHover() {
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(1800, t + 0.03);
    g.gain.setValueAtTime(0.06 * this.volumes.master, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  playMenuClick() {
    this.playSound('empty_ammo', { volume: 0.35, bus: 'ui' });
  }

  playShieldActive() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.18);
    g.gain.setValueAtTime(0.25 * this.volumes.master, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.26);
  }

  playAimZoom(isZoomIn = true) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isZoomIn ? 500 : 850, t);
    osc.frequency.exponentialRampToValueAtTime(isZoomIn ? 900 : 450, t + 0.08);
    g.gain.setValueAtTime(0.12 * this.volumes.master, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  playSeagull() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.linearRampToValueAtTime(2200, t + 0.12);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.35);
    g.gain.setValueAtTime(0.07 * this.volumes.master, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.36);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.37);
  }

  // ==========================================
  // VOLUME MIXER API
  // ==========================================

  setVolume(val) {
    this.setMixerVolume('master', val);
  }

  setMixerVolume(channel, val) {
    const clamped = Math.max(0, Math.min(1.0, val));
    this.volumes[channel] = clamped;
    const t = this.ctx ? this.ctx.currentTime : 0;

    if (!this.ctx) return;

    if (channel === 'master' && this.masterGain) {
      this.masterGain.gain.setValueAtTime(clamped, t);
    } else if (channel === 'weapons' && this.weaponsGain) {
      this.weaponsGain.gain.setValueAtTime(clamped, t);
    } else if (channel === 'footsteps' && this.footstepsGain) {
      this.footstepsGain.gain.setValueAtTime(clamped, t);
    } else if (channel === 'effects' && this.effectsGain) {
      this.effectsGain.gain.setValueAtTime(clamped, t);
    } else if (channel === 'voice' && this.voiceGain) {
      this.voiceGain.gain.setValueAtTime(clamped, t);
    } else if (channel === 'reverb' && this.reverbGain) {
      this.reverbGain.gain.setValueAtTime(clamped, t);
    }
  }

  setSpatialAudio(enabled) {
    this.spatialEnabled = !!enabled;
  }

  setReverbEnabled(enabled) {
    this.reverbEnabled = !!enabled;
    if (this.reverbGain && this.ctx) {
      this.reverbGain.gain.setValueAtTime(enabled ? this.volumes.reverb : 0, this.ctx.currentTime);
    }
  }

  // ==========================================
  // CUSTOM SOUND PACK LOADER & INDEXEDDB
  // ==========================================

  initIndexedDB() {
    if (!('indexedDB' in window)) return;
    try {
      const req = indexedDB.open('CS_AUDIO_PACK_DB', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('custom_sounds')) {
          db.createObjectStore('custom_sounds');
        }
      };
      req.onsuccess = (e) => {
        this.db = e.target.result;
        this.loadSavedCustomSounds();
      };
    } catch (e) {
      console.warn('IndexedDB unavailable:', e);
    }
  }

  loadSavedCustomSounds() {
    if (!this.db || !this.ctx) return;
    try {
      const tx = this.db.transaction('custom_sounds', 'readonly');
      const store = tx.objectStore('custom_sounds');
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const key = cursor.key;
          const arrayBuffer = cursor.value;
          this.ctx.decodeAudioData(arrayBuffer.slice(0), (decoded) => {
            this.audioBuffers[key] = decoded;
            this.isCustomSound[key] = true;
            this.notifySoundUpdated(key);
          }, (err) => console.warn('Saved sound decode error:', key, err));
          cursor.continue();
        }
      };
    } catch (e) {
      console.warn('Error loading custom sounds from DB:', e);
    }
  }

  async loadCustomAudioFile(key, file) {
    if (!this.initialized) this.init();
    if (!this.ctx) return false;
    this.resume();

    try {
      const arrayBuffer = await file.arrayBuffer();
      // Decode audio data (returns Promise in modern browsers)
      const decodedBuffer = await new Promise((resolve, reject) => {
        this.ctx.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
      });

      this.audioBuffers[key] = decodedBuffer;
      this.isCustomSound[key] = true;

      // Save to IndexedDB
      if (this.db) {
        const tx = this.db.transaction('custom_sounds', 'readwrite');
        tx.objectStore('custom_sounds').put(arrayBuffer, key);
      }

      this.notifySoundUpdated(key);
      return true;
    } catch (e) {
      console.error('Failed to load custom audio file:', key, e);
      return false;
    }
  }

  resetSoundToDefault(key) {
    this.synthesizeAllBuffers(); // Re-creates default procedural buffer
    this.isCustomSound[key] = false;
    if (this.db) {
      try {
        const tx = this.db.transaction('custom_sounds', 'readwrite');
        tx.objectStore('custom_sounds').delete(key);
      } catch (e) {}
    }
    this.notifySoundUpdated(key);
  }

  resetAllSoundsToDefault() {
    this.synthesizeAllBuffers();
    this.isCustomSound = {};
    if (this.db) {
      try {
        const tx = this.db.transaction('custom_sounds', 'readwrite');
        tx.objectStore('custom_sounds').clear();
      } catch (e) {}
    }
    this.soundCatalog.forEach(s => this.notifySoundUpdated(s.key));
  }

  // Auto-match dropped files by name (e.g. "ak47.wav", "headshot.wav", "dink.mp3")
  async handleBatchDroppedFiles(files) {
    const results = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = file.name.toLowerCase();
      let matchedKey = null;

      if (/ak47|cv47/.test(name)) matchedKey = 'ak47';
      else if (/m4a1-s|silenced_m4|m4a1_s/.test(name)) matchedKey = 'm4a1_silenced';
      else if (/m4a1|m4a4|maverick/.test(name)) matchedKey = 'm4a1';
      else if (/awp|magnum/.test(name)) matchedKey = 'awp';
      else if (/scout|ssg/.test(name)) matchedKey = 'scout';
      else if (/scar20|autosniper/.test(name)) matchedKey = 'scar20';
      else if (/deagle|desert_eagle/.test(name)) matchedKey = 'deagle';
      else if (/usp_s|usp_silenced/.test(name)) matchedKey = 'usp_silenced';
      else if (/usp/.test(name)) matchedKey = 'usp';
      else if (/glock/.test(name)) matchedKey = 'glock';
      else if (/headshot|dink|bhit_helmet/.test(name)) matchedKey = 'headshot';
      else if (/hitmarker|kevlar|flesh|bhit_armor/.test(name)) matchedKey = 'hitmarker';
      else if (/knife_slash|slash|whoosh/.test(name)) matchedKey = 'knife_slash';
      else if (/knife_hit|stab/.test(name)) matchedKey = 'knife_hit';
      else if (/clipout|magout/.test(name)) matchedKey = 'clipout';
      else if (/clipin|magin/.test(name)) matchedKey = 'clipin';
      else if (/boltpull|slide/.test(name)) matchedKey = 'boltpull';
      else if (/deploy|draw/.test(name)) matchedKey = 'deploy';
      else if (/c4_beep|bomb_beep/.test(name)) matchedKey = 'c4_beep';
      else if (/c4_plant|keypad/.test(name)) matchedKey = 'c4_plant';
      else if (/c4_defuse|defusing/.test(name)) matchedKey = 'c4_defuse';
      else if (/explosion|explode/.test(name)) matchedKey = 'explosion';
      else if (/flashbang|tinnitus/.test(name)) matchedKey = 'flashbang';
      else if (/grenade_bounce|bounce/.test(name)) matchedKey = 'grenade_bounce';
      else if (/pinpull|pin_pull/.test(name)) matchedKey = 'pinpull';
      else if (/step_concrete|concrete|stone/.test(name)) matchedKey = 'step_concrete';
      else if (/step_sand|sand|dirt/.test(name)) matchedKey = 'step_sand';
      else if (/step_wood|wood/.test(name)) matchedKey = 'step_wood';
      else if (/step_metal|metal/.test(name)) matchedKey = 'step_metal';
      else if (/step_water|water/.test(name)) matchedKey = 'step_water';
      else if (/landing/.test(name)) matchedKey = 'landing';
      else if (/ct_win/.test(name)) matchedKey = 'ct_win';
      else if (/t_win/.test(name)) matchedKey = 't_win';
      else if (/bomb_planted/.test(name)) matchedKey = 'bomb_planted';
      else if (/bomb_defused/.test(name)) matchedKey = 'bomb_defused';

      if (matchedKey) {
        const ok = await this.loadCustomAudioFile(matchedKey, file);
        results.push({ file: file.name, key: matchedKey, success: ok });
      }
    }
    return results;
  }

  notifySoundUpdated(key) {
    const event = new CustomEvent('cs_sound_updated', { detail: { key, isCustom: !!this.isCustomSound[key] } });
    window.dispatchEvent(event);
  }
}

// Global Singleton
window.csAudio = new CSAudioEngine();
