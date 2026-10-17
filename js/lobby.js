/**
 * CS:GO Panorama UI / CS2 Style Interactive 3D Lobby Engine
 * Features:
 * - Live 3D character showcase with procedural idle breathing & mouse tracking
 * - 360° mouse-drag character rotation
 * - Switchable 3D environments: Dust II, Mirage, Inferno (Night), CS 1.6 Classic Retro
 * - Dynamic weapon held in hands reflecting active player loadout & skins
 * - Cinematic lighting: Key spotlights, colored rim lights, volumetric fog & neon pedestals
 * - Floating atmospheric particles (dust motes, firefly embers, digital sparks)
 * - Built-in ambient tactical menu drone synthesizer (Web Audio API)
 */

class CSLobby3D {
  constructor(renderer, container) {
    this.renderer = renderer;
    this.container = container;
    this.time = 0;
    this.team = 'ct'; // 'ct' or 't'
    this.currentTheme = 'dust2'; // 'dust2', 'mirage', 'inferno', 'cs16'
    this.activeWeaponId = 'm4a1';
    this.activeSkinId = 'howl';

    // Interactive mouse rotation & tracking
    this.isDragging = false;
    this.dragStartX = 0;
    this.operativeRotation = -0.15;
    this.targetRotation = -0.15;
    this.mouseTarget = { x: 0, y: 0 };
    this.smoothMouse = { x: 0, y: 0 };

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 80);
    this.camera.position.set(0, 1.25, 3.6);
    this.camera.lookAt(new THREE.Vector3(0.3, 1.05, 0));

    this.operativeGroup = new THREE.Group();
    this.operativeGroup.position.set(0.45, 0, 0);
    this.scene.add(this.operativeGroup);

    this.environmentGroup = new THREE.Group();
    this.scene.add(this.environmentGroup);

    this.limbs = {};
    this.lights = {};
    this.particleSystem = null;

    // Ambient tactical drone synthesizer
    this.ambientPlaying = false;
    this.ambientGain = null;

    this.initLights();
    this.applyTheme(this.currentTheme);
    this.buildOperative(this.team, this.activeWeaponId);
    this.initMouseInteractions();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  // ==========================================
  // LIGHTING & ATMOSPHERE
  // ==========================================

  initLights() {
    this.lights.ambient = new THREE.AmbientLight(0x1a2432, 1.2);
    this.scene.add(this.lights.ambient);

    // Key Light from front-right
    this.lights.keySpot = new THREE.SpotLight(0xd4eaff, 4.5, 25, Math.PI / 4, 0.35, 1.0);
    this.lights.keySpot.position.set(2.0, 4.2, 3.0);
    this.lights.keySpot.target.position.set(0.45, 1.05, 0);
    this.scene.add(this.lights.keySpot);
    this.scene.add(this.lights.keySpot.target);

    // Cinematic Rim / Backlight
    this.lights.rimSpot = new THREE.SpotLight(0x4a90e2, 5.0, 20, Math.PI / 3, 0.45, 1.0);
    this.lights.rimSpot.position.set(-2.0, 3.5, -2.5);
    this.lights.rimSpot.target.position.set(0.45, 1.05, 0);
    this.scene.add(this.lights.rimSpot);
    this.scene.add(this.lights.rimSpot.target);

    // Floor glow
    this.lights.floorSpot = new THREE.SpotLight(0x00e5ff, 2.5, 12, Math.PI / 5, 0.7, 1.2);
    this.lights.floorSpot.position.set(0.45, 3.8, 0.3);
    this.lights.floorSpot.target.position.set(0.45, 0, 0);
    this.scene.add(this.lights.floorSpot);
    this.scene.add(this.lights.floorSpot.target);
  }

  // ==========================================
  // SWITCHABLE 3D LOBBY ENVIRONMENTS
  // ==========================================

  applyTheme(themeName) {
    this.currentTheme = themeName;
    localStorage.setItem('cs_lobby_theme', themeName);

    // Clear old environment meshes
    while (this.environmentGroup.children.length > 0) {
      this.environmentGroup.remove(this.environmentGroup.children[0]);
    }

    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.particleSystem = null;
    }

    switch (themeName) {
      case 'dust2':
        this.buildDust2Theme();
        break;
      case 'mirage':
        this.buildMirageTheme();
        break;
      case 'inferno':
        this.buildInfernoTheme();
        break;
      case 'cs16':
        this.buildCS16Theme();
        break;
      default:
        this.buildDust2Theme();
        break;
    }
  }

  buildDust2Theme() {
    this.scene.fog = new THREE.FogExp2(0xd4be96, 0.040);
    this.lights.ambient.color.setHex(0x3a3022);
    this.lights.keySpot.color.setHex(0xfff3db);
    this.lights.keySpot.intensity = 4.8;
    this.lights.rimSpot.color.setHex(this.team === 'ct' ? 0x4aa3df : 0xff7700);
    this.lights.floorSpot.color.setHex(0xe8aa42);

    // Desert Sandstone Pedestal
    const padGeom = new THREE.CylinderGeometry(2.4, 2.6, 0.16, 40);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x9e805d,
      roughness: 0.85,
      metalness: 0.05
    });
    const pad = new THREE.Mesh(padGeom, padMat);
    pad.position.set(0.45, -0.08, 0);
    this.environmentGroup.add(pad);

    // Sandstone pillars & back archway in distant background
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xb59972, roughness: 0.9 });
    for (let i = -1; i <= 1; i += 2) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.40, 4.2, 16), stoneMat);
      col.position.set(0.45 + i * 2.2, 2.0, -2.5);
      this.environmentGroup.add(col);
    }
    const archTop = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.5, 0.7), stoneMat);
    archTop.position.set(0.45, 4.0, -2.5);
    this.environmentGroup.add(archTop);

    // Atmospheric warm dust motes
    this.createAtmosphericParticles(0xffe0a8, 65, 0.032, 0.09);
  }

  buildMirageTheme() {
    this.scene.fog = new THREE.FogExp2(0x946852, 0.045);
    this.lights.ambient.color.setHex(0x2c1f1d);
    this.lights.keySpot.color.setHex(0xffcfb3);
    this.lights.keySpot.intensity = 4.6;
    this.lights.rimSpot.color.setHex(0xff5533);
    this.lights.floorSpot.color.setHex(0xd1603d);

    // Terracotta ornate palace floor
    const padGeom = new THREE.CylinderGeometry(2.3, 2.5, 0.14, 36);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x6e3c28,
      roughness: 0.55,
      metalness: 0.2
    });
    const pad = new THREE.Mesh(padGeom, padMat);
    pad.position.set(0.45, -0.07, 0);
    this.environmentGroup.add(pad);

    // Golden mosaic trim ring
    const ringGeom = new THREE.RingGeometry(2.25, 2.32, 48);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0.45, 0.005, 0);
    this.environmentGroup.add(ring);

    this.createAtmosphericParticles(0xffaa77, 50, 0.035, 0.08);
  }

  buildInfernoTheme() {
    this.scene.fog = new THREE.FogExp2(0x0a1018, 0.055);
    this.lights.ambient.color.setHex(0x0e1824);
    this.lights.keySpot.color.setHex(0x8bc3ff);
    this.lights.keySpot.intensity = 3.8;
    this.lights.rimSpot.color.setHex(0xff9900); // warm lantern rim
    this.lights.floorSpot.color.setHex(0x3388ff);

    // Night Cobblestone Pedestal
    const padGeom = new THREE.CylinderGeometry(2.4, 2.6, 0.15, 36);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x181e24,
      roughness: 0.65,
      metalness: 0.2
    });
    const pad = new THREE.Mesh(padGeom, padMat);
    pad.position.set(0.45, -0.075, 0);
    this.environmentGroup.add(pad);

    // Warm street lamp post in background
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 3.8, 8), new THREE.MeshStandardMaterial({ color: 0x090b0e, metalness: 0.8 }));
    pole.position.set(-1.6, 1.9, -2.0);
    this.environmentGroup.add(pole);

    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.35, 0.24), new THREE.MeshBasicMaterial({ color: 0xffaa22 }));
    lantern.position.set(-1.6, 3.6, -2.0);
    this.environmentGroup.add(lantern);

    // Floating embers / sparks
    this.createAtmosphericParticles(0xff8822, 60, 0.038, 0.14);
  }

  buildCS16Theme() {
    this.scene.fog = new THREE.FogExp2(0x03140a, 0.048);
    this.lights.ambient.color.setHex(0x092612);
    this.lights.keySpot.color.setHex(0x44ff88);
    this.lights.keySpot.intensity = 3.6;
    this.lights.rimSpot.color.setHex(0x00ff66);
    this.lights.floorSpot.color.setHex(0x00ff88);

    // Retro Digital Wireframe Matrix Grid Pedestal
    const padGeom = new THREE.CylinderGeometry(2.3, 2.5, 0.12, 24);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x051a0c,
      roughness: 0.3,
      metalness: 0.7
    });
    const pad = new THREE.Mesh(padGeom, padMat);
    pad.position.set(0.45, -0.06, 0);
    this.environmentGroup.add(pad);

    // Neon green glowing ring
    const ringGeom = new THREE.RingGeometry(2.2, 2.28, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ff66,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0.45, 0.005, 0);
    this.environmentGroup.add(ring);

    // Digital green floating pixels
    this.createAtmosphericParticles(0x00ff66, 75, 0.04, 0.12);
  }

  createAtmosphericParticles(colorHex, count, size, baseSpeed) {
    const pGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    this.particleSpeeds = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 5.0 + 0.45;
      positions[i * 3 + 1] = Math.random() * 3.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4.5;
      this.particleSpeeds.push({
        y: baseSpeed * (0.6 + Math.random() * 0.8),
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.5 + Math.random() * 1.5
      });
    }

    pGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: colorHex,
      size: size,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });

    this.particleSystem = new THREE.Points(pGeom, pMat);
    this.scene.add(this.particleSystem);
  }

  // ==========================================
  // OPERATIVE 3D MODEL & WEAPON LOADOUT
  // ==========================================

  setTeam(team) {
    if (this.team === team) return;
    this.team = team;
    this.activeWeaponId = (team === 'ct') ? 'm4a1' : 'ak47';
    this.buildOperative(team, this.activeWeaponId);

    // Update lighting accent
    if (this.currentTheme === 'dust2' || this.currentTheme === 'inferno') {
      this.lights.rimSpot.color.setHex(team === 'ct' ? 0x4aa3df : 0xff7700);
    }
  }

  setWeapon(weaponId, skinId = null) {
    this.activeWeaponId = weaponId;
    if (skinId) this.activeSkinId = skinId;
    this.buildOperative(this.team, this.activeWeaponId);
  }

  buildOperative(team, weaponId = 'ak47') {
    while (this.operativeGroup.children.length > 0) {
      this.operativeGroup.remove(this.operativeGroup.children[0]);
    }
    this.limbs = {};

    const isCT = (team === 'ct');
    const bodyColor = isCT ? 0x223242 : 0x4a4338;
    const vestColor = isCT ? 0x16212d : 0x332b21;
    const skinColor = 0xd2a679;
    const bootColor = 0x11161b;

    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.75 });
    const vestMat = new THREE.MeshStandardMaterial({ color: vestColor, roughness: 0.65, metalness: 0.15 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
    const headMat = isCT ? new THREE.MeshStandardMaterial({ color: 0x1a232e, roughness: 0.7 }) : skinMat;
    const legMat = new THREE.MeshStandardMaterial({ color: isCT ? 0x19232d : 0x3c3427, roughness: 0.8 });
    const bootMat = new THREE.MeshStandardMaterial({ color: bootColor, roughness: 0.5, metalness: 0.3 });

    // 1. Torso Root
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 1.05, 0);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.62, 0.28), bodyMat);
    torsoGroup.add(torso);

    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.52, 0.33), vestMat);
    vest.position.set(0, 0.02, 0.01);
    torsoGroup.add(vest);

    // Tactical pouches
    for (let p = -1; p <= 1; p++) {
      const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.08), vestMat);
      pouch.position.set(p * 0.15, -0.06, 0.18);
      torsoGroup.add(pouch);
    }

    // Radio on shoulder
    const radio = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.08), vestMat);
    radio.position.set(-0.21, 0.22, 0.12);
    torsoGroup.add(radio);

    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.16, 6), vestMat);
    antenna.position.set(-0.21, 0.35, 0.12);
    torsoGroup.add(antenna);

    this.operativeGroup.add(torsoGroup);
    this.limbs.torso = torsoGroup;

    // 2. Head Group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.54, 0);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.30, 0.30), headMat);
    headGroup.add(head);

    if (isCT) {
      // PASGT Helmet & Dark Goggles
      const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.34), vestMat);
      helmet.position.set(0, 0.10, 0);
      headGroup.add(helmet);

      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.09, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x050c12, roughness: 0.15, metalness: 0.9 })
      );
      visor.position.set(0, 0.02, 0.16);
      headGroup.add(visor);
    } else {
      // Terrorist Balaclava slit
      const slit = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.06, 0.02), new THREE.MeshBasicMaterial({ color: 0x111111 }));
      slit.position.set(0, 0.02, 0.152);
      headGroup.add(slit);
    }

    this.operativeGroup.add(headGroup);
    this.limbs.head = headGroup;

    // 3. Legs
    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(-0.16, 0.72, 0);
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.68, 0.18), legMat);
    leftLeg.position.set(0, -0.34, 0);
    leftLegGroup.add(leftLeg);

    const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.18, 0.24), bootMat);
    leftBoot.position.set(0, -0.62, 0.03);
    leftLegGroup.add(leftBoot);
    this.operativeGroup.add(leftLegGroup);

    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(0.16, 0.72, 0);
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.68, 0.18), legMat);
    rightLeg.position.set(0, -0.34, 0);
    rightLegGroup.add(rightLeg);

    const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.18, 0.24), bootMat);
    rightBoot.position.set(0, -0.62, 0.03);
    rightLegGroup.add(rightBoot);
    this.operativeGroup.add(rightLegGroup);

    // 4. Arms & Weapon (Ready Tactical Stance)
    const armsGroup = new THREE.Group();
    armsGroup.position.set(0, 1.25, 0);

    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.14), bodyMat);
    leftArm.position.set(-0.28, -0.15, 0.18);
    leftArm.rotation.set(0.55, -0.3, -0.4);
    armsGroup.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.14), bodyMat);
    rightArm.position.set(0.28, -0.15, 0.14);
    rightArm.rotation.set(0.65, 0.25, 0.35);
    armsGroup.add(rightArm);

    // 5. 3D Weapon Model directly from CSWeaponViewmodelBuilder if available
    let weaponMesh = null;
    if (window.csWeaponBuilder && window.csWeaponBuilder.buildWeaponMesh) {
      weaponMesh = window.csWeaponBuilder.buildWeaponMesh(weaponId, isCT);
      weaponMesh.scale.set(0.85, 0.85, 0.85);
      weaponMesh.position.set(0.04, -0.18, 0.34);
      weaponMesh.rotation.set(-0.25, -0.22, 0.12);
    } else {
      // Fallback procedural weapon
      const gunMat = new THREE.MeshStandardMaterial({ color: 0x1a2128, metalness: 0.8, roughness: 0.3 });
      weaponMesh = new THREE.Group();
      weaponMesh.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.10, 0.45), gunMat));
      weaponMesh.position.set(0.04, -0.18, 0.34);
      weaponMesh.rotation.set(-0.25, -0.22, 0.12);
    }

    armsGroup.add(weaponMesh);
    this.operativeGroup.add(armsGroup);
    this.limbs.arms = armsGroup;
    this.limbs.weapon = weaponMesh;

    this.operativeGroup.rotation.y = this.operativeRotation;
  }

  // ==========================================
  // MOUSE INTERACTIONS & 360 ROTATION
  // ==========================================

  initMouseInteractions() {
    const isUIElement = (target) => {
      return target && target.closest && target.closest(
        '#panorama-navbar, .panorama-content-panel, .pane-content-wrapper, .soundpack-modal, #soundpack-modal, .buy-menu-panel, .sb-container, #app-download-modal, #mobile-portrait-warning, button, select, input'
      );
    };

    // Mouse handlers
    window.addEventListener('mousedown', (e) => {
      if (isUIElement(e.target)) return;
      this.isDragging = true;
      this.dragStartX = e.clientX;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.dragStartX;
        this.targetRotation += deltaX * 0.009;
        this.dragStartX = e.clientX;
      } else {
        this.mouseTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouseTarget.y = -(e.clientY / window.innerHeight) * 2 + 1;
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Touch handlers for mobile phones (Android / iOS)
    window.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0 && !isUIElement(e.target)) {
        this.isDragging = true;
        this.dragStartX = e.touches[0].clientX;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (this.isDragging && e.touches.length > 0) {
        const currentX = e.touches[0].clientX;
        const deltaX = currentX - this.dragStartX;
        this.targetRotation += deltaX * 0.012;
        this.dragStartX = currentX;
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    }, { passive: true });

    window.addEventListener('touchcancel', () => {
      this.isDragging = false;
    }, { passive: true });
  }

  // ==========================================
  // AMBIENT TACTICAL MENU DRONE
  // ==========================================

  toggleAmbientMusic(enabled) {
    if (!window.csAudio) return;
    if (!window.csAudio.initialized) window.csAudio.init();
    if (!window.csAudio.ctx) return;
    window.csAudio.resume();

    const ctx = window.csAudio.ctx;

    if (enabled) {
      if (this.ambientPlaying) return;
      this.ambientPlaying = true;

      // Create warm cinematic analog ambient drone
      const t = ctx.currentTime;
      this.droneOsc1 = ctx.createOscillator();
      this.droneOsc2 = ctx.createOscillator();
      this.droneGain = ctx.createGain();

      this.droneOsc1.type = 'sawtooth';
      this.droneOsc1.frequency.setValueAtTime(55, t); // Sub A1

      this.droneOsc2.type = 'triangle';
      this.droneOsc2.frequency.setValueAtTime(82.4, t); // E2 fifth

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, t);
      filter.Q.setValueAtTime(1.5, t);

      this.droneGain.gain.setValueAtTime(0.001, t);
      this.droneGain.gain.exponentialRampToValueAtTime(0.08, t + 2.0);

      this.droneOsc1.connect(filter);
      this.droneOsc2.connect(filter);
      filter.connect(this.droneGain);
      this.droneGain.connect(window.csAudio.masterGain);

      this.droneOsc1.start(t);
      this.droneOsc2.start(t);
    } else {
      if (!this.ambientPlaying) return;
      this.ambientPlaying = false;
      if (this.droneGain) {
        const t = ctx.currentTime;
        this.droneGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
        setTimeout(() => {
          try {
            if (this.droneOsc1) this.droneOsc1.stop();
            if (this.droneOsc2) this.droneOsc2.stop();
          } catch (e) {}
        }, 900);
      }
    }
  }

  // ==========================================
  // FRAME ANIMATION UPDATE
  // ==========================================

  update(delta) {
    this.time += delta;

    // Smooth lerp mouse tracking
    this.smoothMouse.x += (this.mouseTarget.x - this.smoothMouse.x) * 0.08;
    this.smoothMouse.y += (this.mouseTarget.y - this.smoothMouse.y) * 0.08;

    // Smooth operative 360 rotation
    this.operativeRotation += (this.targetRotation - this.operativeRotation) * 0.12;

    // Procedural Idle Breathing
    const breathCycle = Math.sin(this.time * 2.1);
    const breathSecondary = Math.cos(this.time * 1.3);

    // 1. Torso expands and gently rises
    if (this.limbs.torso) {
      this.limbs.torso.position.y = 1.05 + breathCycle * 0.012;
      this.limbs.torso.scale.set(
        1.0 + breathCycle * 0.010,
        1.0 + breathCycle * 0.008,
        1.0 + breathCycle * 0.012
      );
    }

    // 2. Head subtly nods and tracks mouse cursor
    if (this.limbs.head) {
      this.limbs.head.position.y = 1.54 + breathCycle * 0.014;
      this.limbs.head.rotation.x = breathCycle * 0.015 - this.smoothMouse.y * 0.22;
      this.limbs.head.rotation.y = breathSecondary * 0.020 + this.smoothMouse.x * 0.35;
    }

    // 3. Arms and weapon sway gently
    if (this.limbs.arms) {
      this.limbs.arms.position.y = 1.25 + breathCycle * 0.013;
      this.limbs.arms.rotation.y = this.smoothMouse.x * 0.15;
    }
    if (this.limbs.weapon) {
      this.limbs.weapon.position.y = -0.18 + breathCycle * 0.015;
      this.limbs.weapon.rotation.z = 0.12 + breathSecondary * 0.012;
      this.limbs.weapon.rotation.x = -0.25 + breathCycle * 0.015;
    }

    // 4. Overall operative rotation
    this.operativeGroup.rotation.y = this.operativeRotation;

    // 5. Update floating particles
    if (this.particleSystem && this.particleSpeeds) {
      const posAttr = this.particleSystem.geometry.attributes.position;
      const arr = posAttr.array;
      for (let i = 0; i < this.particleSpeeds.length; i++) {
        arr[i * 3 + 1] += this.particleSpeeds[i].y * delta;
        arr[i * 3 + 0] += Math.sin(this.time * this.particleSpeeds[i].wobbleSpeed + this.particleSpeeds[i].wobble) * 0.003;
        if (arr[i * 3 + 1] > 3.2) {
          arr[i * 3 + 1] = 0.05;
          arr[i * 3 + 0] = (Math.random() - 0.5) * 5.0 + 0.45;
          arr[i * 3 + 2] = (Math.random() - 0.5) * 4.5;
        }
      }
      posAttr.needsUpdate = true;
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

window.CSLobby3D = CSLobby3D;
