/**
 * First-Person Player Controller & Weapon System for Counter-Strike 1.6
 */

// Realistic Spray & Recoil Pattern Tables (Vertical kick & horizontal drift compensation)
const WEAPON_RECOIL_PATTERNS = {
  ak47: [
    { pitch: 0.024, yaw: 0.002 },
    { pitch: 0.028, yaw: -0.003 },
    { pitch: 0.034, yaw: 0.005 },
    { pitch: 0.038, yaw: 0.008 },
    { pitch: 0.040, yaw: 0.012 },
    { pitch: 0.036, yaw: 0.018 },
    { pitch: 0.028, yaw: 0.022 },
    { pitch: 0.018, yaw: 0.020 },
    { pitch: 0.012, yaw: -0.015 },
    { pitch: 0.010, yaw: -0.025 },
    { pitch: 0.008, yaw: -0.028 },
    { pitch: 0.006, yaw: -0.022 },
    { pitch: 0.005, yaw: 0.015 },
    { pitch: 0.005, yaw: 0.020 }
  ],
  m4a1: [
    { pitch: 0.018, yaw: 0.001 },
    { pitch: 0.022, yaw: -0.002 },
    { pitch: 0.026, yaw: 0.004 },
    { pitch: 0.028, yaw: 0.007 },
    { pitch: 0.025, yaw: 0.010 },
    { pitch: 0.020, yaw: -0.012 },
    { pitch: 0.015, yaw: -0.016 },
    { pitch: 0.010, yaw: 0.008 }
  ],
  deagle: [
    { pitch: 0.075, yaw: 0.005 },
    { pitch: 0.085, yaw: -0.008 },
    { pitch: 0.090, yaw: 0.012 }
  ],
  scout: [
    { pitch: 0.065, yaw: 0.002 }
  ],
  awp: [
    { pitch: 0.12, yaw: 0.005 }
  ],
  scar20: [
    { pitch: 0.045, yaw: 0.004 },
    { pitch: 0.052, yaw: -0.006 },
    { pitch: 0.058, yaw: 0.008 }
  ],
  glock: [
    { pitch: 0.018, yaw: 0.001 },
    { pitch: 0.022, yaw: -0.002 }
  ],
  usp: [
    { pitch: 0.022, yaw: 0.002 },
    { pitch: 0.026, yaw: -0.003 }
  ]
};

// Authentic GoldSrc CS 1.6 Full-Auto Spray Trajectory (Offsets in NDC screen-space)
// Shots 1-2: 100% pinpoint accuracy on the crosshair.
// Shots 3-6: Recoil climbs strictly vertically upwards (X: 0, Y climbs).
// Shots 7-15: Horizontal drift left-to-right at top vertical recoil ceiling.
const GOLDSRC_FULL_AUTO_SPRAY = [
  // Shots 1-2: 100% pinpoint accuracy
  { x: 0.0000, y: 0.0000 }, // Shot 1
  { x: 0.0000, y: 0.0000 }, // Shot 2
  // Shots 3-6: Climbs strictly vertically upwards
  { x: 0.0000, y: 0.0135 }, // Shot 3
  { x: 0.0000, y: 0.0255 }, // Shot 4
  { x: 0.0000, y: 0.0365 }, // Shot 5
  { x: 0.0000, y: 0.0465 }, // Shot 6 (reaches apex vertical height)
  // Shots 7-15: Weaves horizontally left-to-right at top vertical height
  { x: 0.0125, y: 0.0470 }, // Shot 7 (drifts right)
  { x: 0.0215, y: 0.0475 }, // Shot 8 (hard right)
  { x: 0.0265, y: 0.0480 }, // Shot 9 (right apex)
  { x: 0.0145, y: 0.0475 }, // Shot 10 (re-centering)
  { x: -0.0055, y: 0.0470 }, // Shot 11 (crossing left)
  { x: -0.0195, y: 0.0475 }, // Shot 12 (hard left)
  { x: -0.0265, y: 0.0480 }, // Shot 13 (left apex)
  { x: -0.0155, y: 0.0475 }, // Shot 14 (re-centering)
  { x: 0.0085, y: 0.0470 }  // Shot 15 (swinging back right)
];

class CSPlayer {
  constructor(camera, scene, map) {
    this.camera = camera;
    this.scene = scene;
    this.map = map;

    // Team & Identity
    this.name = 'Player (You)';
    this.team = 'ct'; // 'ct' or 't'
    this.health = 100;
    this.armor = 100;
    this.hasHelmet = true;
    this.hasDefuseKit = true;
    this.money = 16000;
    this.kills = 0;
    this.deaths = 0;
    this.isDead = false;
    this.isInvulnerable = false;
    this.invulnerableTimer = 0;

    // Movement & Physics
    this.position = new THREE.Vector3(2, 1.6, 38);
    this.velocity = new THREE.Vector3();
    this.pitch = 0; // vertical camera rotation
    this.yaw = 0;   // horizontal camera rotation
    this.eyeHeightStanding = 1.65;
    this.eyeHeightCrouching = 1.05;
    this.eyeHeight = this.eyeHeightStanding;
    this.isCrouching = false;
    this.isOnGround = true;
    this.moveSpeed = 5.4;
    this.mouseSensitivity = 1.2;

    // Tactical Leaning (Q & E peek like PUBG / Rainbow Six Siege)
    this.leanTarget = 0; // -1 (left), 0 (center), +1 (right)
    this.leanAmount = 0; // horizontal camera translation in meters
    this.leanRoll = 0;   // camera banking in radians

    // Realistic Camera Dynamics & Headbob
    this.bobTimer = 0;
    this.bobIntensity = 0;
    this.cameraRoll = 0;
    this.landingDip = 0;
    this.prevVelocityY = 0;
    this.mouseSway = new THREE.Vector2();
    this.punchAngle = new THREE.Vector2(); // GoldSrc punchangle spring recoil

    // Viewmodel & Arms Rig
    this.viewmodelRoot = new THREE.Group();
    this.camera.add(this.viewmodelRoot);
    this.currentViewmodelMesh = null;
    this.viewmodelBob = 0;
    this.recoilOffset = new THREE.Vector3();
    this.recoilRot = new THREE.Vector3();

    // Aim Down Sights (ADS) & Custom Crosshairs
    this.isAds = false;
    this.adsProgress = 0; // 0 (hipfire) to 1 (full ADS)
    this.activeReticle = window.ACTIVE_RETICLE_STYLE || 'red_dot';

    // Inventory & Weapons
    this.inventory = {
      1: null, // primary
      2: null, // secondary
      3: { ...window.WEAPONS_DATA.knife, currentClip: 0, reserve: 0 },
      4: null, // grenade
      5: null  // c4
    };
    this.activeSlot = 3;
    this.currentWeapon = null;
    this.lastShotTime = 0;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.isScoped = false;
    this.scopeLevel = 0; // 0: off, 1: 4x, 2: 9x

    // Controls State
    this.keys = {};
    this.isMouseDown = false;
    this.isRightMouseDown = false;
    this.isPointerLocked = false;
    this.footstepTimer = 0;

    // Dynamic Recoil & Spread
    this.sprayCount = 0;
    this.lastSprayTime = 0;
    this.currentSpread = 0.02;
    this.taggingTimer = 0;
    this.crosshairPulse = 0;

    // Interaction & C4 Planting / Defusing
    this.isInteracting = false;
    this.interactionProgress = 0;
    this.targetInteractionTime = 5.0;

    this.isPlanting = false;
    this.plantingProgress = 0;
    this.targetPlantTime = 3.2;

    this.initControls();
    this.applyReticleClass();
  }

  initControls() {
    // Disable default browser context menu on right-click for AWP zooming and M4A1 silencer
    window.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    window.addEventListener('keydown', (e) => {
      // Don't intercept inputs inside form controls
      if (['input', 'select', 'textarea'].includes(document.activeElement?.tagName?.toLowerCase())) {
        return;
      }

      this.keys[e.code] = true;

      // Dead Player actions: [Space], [E], or [Enter] for instant Respawn
      if (this.isDead) {
        if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') {
          e.preventDefault();
          if (window.csGame && window.csGame.respawnPlayer) {
            window.csGame.respawnPlayer();
          }
          return;
        }
      }

      // Escape key: close buy menu or toggle pause
      if (e.code === 'Escape') {
        if (window.csGame) {
          if (window.csGame.isBuyMenuOpen) {
            window.csGame.toggleBuyMenu(false);
            return;
          }
          if (window.csGame.isGameStarted && !window.csGame.isRoundOver) {
            window.csGame.togglePause();
            return;
          }
        }
      }

      // Slot switching (1-5)
      if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(e.code)) {
        const slot = parseInt(e.code.replace('Digit', ''));
        this.selectSlot(slot);
      }

      // Reload
      if (e.code === 'KeyR') {
        this.reload();
      }

      // Cycle Crosshair / Reticle (Key H)
      if (e.code === 'KeyH') {
        this.cycleReticle();
      }

      // Buy menu toggle (B)
      if (e.code === 'KeyB') {
        if (window.csGame) window.csGame.toggleBuyMenu();
      }

      // Scoreboard (Tab)
      if (e.code === 'Tab') {
        e.preventDefault();
        if (window.csGame) window.csGame.showScoreboard(true);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
      if (e.code === 'Tab') {
        if (window.csGame) window.csGame.showScoreboard(false);
      }
    });

    window.addEventListener('mousedown', (e) => {
      // If pointer is not locked yet, let click request pointer lock if game is active
      if (!this.isPointerLocked) {
        if (window.csGame && window.csGame.isGameStarted && !window.csGame.isMenuOpen() && !window.csGame.isBuyMenuOpen) {
          window.csGame.requestPointerLock();
        }
        return;
      }

      // Spectator mode cycling when dead
      if (this.isDead) {
        if (e.button === 0 && window.csGame && window.csGame.cycleSpectator) {
          window.csGame.cycleSpectator(1);
        } else if (e.button === 2 && window.csGame && window.csGame.cycleSpectator) {
          window.csGame.cycleSpectator(-1);
        }
        return;
      }

      if (e.button === 0) {
        this.isMouseDown = true;
        this.handleFirePress();
      } else if (e.button === 2) {
        this.isRightMouseDown = true;
        this.handleSecondaryFire();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.isMouseDown = false;
      if (e.button === 2) this.isRightMouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked || this.isDead) return;
      const sens = 0.0018 * this.mouseSensitivity * (this.isScoped ? 0.4 : (this.isAds ? 0.65 : 1.0));
      this.yaw -= e.movementX * sens;
      this.pitch -= e.movementY * sens;
      this.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.pitch));

      // Realistic viewmodel inertia sway
      this.mouseSway.x -= e.movementX * 0.00035;
      this.mouseSway.y += e.movementY * 0.00035;
      this.mouseSway.x = Math.max(-0.06, Math.min(0.06, this.mouseSway.x));
      this.mouseSway.y = Math.max(-0.04, Math.min(0.04, this.mouseSway.y));
    });

    // Pointer Lock change listener
    document.addEventListener('pointerlockchange', () => {
      const isLocked = Boolean(document.pointerLockElement);
      const wasLocked = this.isPointerLocked;
      this.isPointerLocked = isLocked;

      if (window.csGame) {
        window.csGame.onPointerLockChange(isLocked, wasLocked);
      }
    });

    document.addEventListener('pointerlockerror', (e) => {
      console.warn('Pointer lock request error / blocked:', e);
    });
  }

  cycleReticle() {
    const reticles = ['red_dot', 'holographic', 'tactical_cross', 'mil_dot', 'cs_classic'];
    const names = {
      red_dot: 'Красная точка (Red Dot Sight)',
      holographic: 'Голографический (Holographic EOTech)',
      tactical_cross: 'Тактический уголок (Tactical Sight)',
      mil_dot: 'Снайперский Mil-Dot',
      cs_classic: 'Классический CS 1.6 (Dynamic Crosshair)'
    };
    const curIdx = reticles.indexOf(this.activeReticle);
    const nextIdx = (curIdx + 1) % reticles.length;
    this.activeReticle = reticles[nextIdx];
    window.ACTIVE_RETICLE_STYLE = this.activeReticle;

    this.applyReticleClass();
    window.csAudio.playMechanicalClick(1.5, 950);
    if (window.csGame) {
      window.csGame.showRadioSubtitle(`Прицел: [${names[this.activeReticle]}]`);
    }
  }

  applyReticleClass() {
    const crosshairEl = document.getElementById('crosshair');
    if (!crosshairEl) return;
    crosshairEl.className = '';
    crosshairEl.classList.add(`reticle-${this.activeReticle}`);
  }

  setTeam(team) {
    this.team = team;
    this.resetInventory();
  }

  resetInventory() {
    this.inventory = {
      1: null,
      2: null,
      3: { ...window.WEAPONS_DATA.knife, currentClip: 0, reserve: 0 },
      4: null,
      5: null
    };

    if (this.team === 'ct') {
      this.inventory[2] = { ...window.WEAPONS_DATA.usp, currentClip: 12, reserve: 100 };
      this.inventory[1] = { ...window.WEAPONS_DATA.m4a1, currentClip: 30, reserve: 90 };
      this.hasDefuseKit = true;
    } else {
      this.inventory[2] = { ...window.WEAPONS_DATA.glock, currentClip: 20, reserve: 120 };
      this.inventory[1] = { ...window.WEAPONS_DATA.ak47, currentClip: 30, reserve: 90 };
      this.inventory[5] = { ...window.WEAPONS_DATA.c4, currentClip: 1, reserve: 0 };
      this.hasDefuseKit = false;
    }

    this.selectSlot(1);
  }

  spawn(spawnPoint) {
    const startY = (this.map && this.map.getGroundHeight) ? this.map.getGroundHeight(spawnPoint.x, spawnPoint.z, 0) : 0;
    this.position.set(spawnPoint.x, startY, spawnPoint.z);
    this.velocity.set(0, 0, 0);
    this.isOnGround = true;
    this.landingDip = 0;
    this.bobTimer = 0;
    this.cameraRoll = 0;
    this.health = 100;
    this.armor = 100;
    this.isDead = false;
    this.eyeHeight = this.eyeHeightStanding;
    this.cameraRoll = 0;
    this.taggingTimer = 0;
    this.crosshairPulse = 0;
    this.sprayCount = 0;
    this.punchAngle.set(0, 0);
    this.isScoped = false;
    this.scopeLevel = 0;
    this.isAds = false;
    this.adsProgress = 0;
    if (this.currentViewmodelMesh) {
      this.currentViewmodelMesh.visible = true;
    }
    this.updateSniperOverlay();
    this.updateHUD();
    this.updateSpawnShieldHUD();
  }

  respawn(spawnPoint) {
    this.spawn(spawnPoint);
    this.health = 100;
    this.armor = 100;
    this.hasHelmet = true;
    this.isDead = false;

    // Grant 2 seconds of spawn invulnerability shield
    this.isInvulnerable = true;
    this.invulnerableTimer = 2.0;

    // Fully reload all owned weapons
    for (const s of [1, 2, 3, 4, 5]) {
      const w = this.inventory[s];
      if (w && w.clipSize > 0) {
        w.currentClip = w.clipSize;
        w.reserve = w.maxAmmo;
      }
    }

    if (this.inventory[1]) {
      this.selectSlot(1);
    } else if (this.inventory[2]) {
      this.selectSlot(2);
    }

    this.updateHUD();
    this.updateSpawnShieldHUD();

    if (window.csAudio && window.csAudio.playShieldActive) {
      window.csAudio.playShieldActive();
    }
  }

  updateSpawnShieldHUD() {
    const shieldEl = document.getElementById('spawn-shield-indicator');
    if (!shieldEl) return;
    if (this.isInvulnerable && this.invulnerableTimer > 0) {
      shieldEl.classList.remove('hidden');
      const timerSpan = document.getElementById('shield-timer-val');
      if (timerSpan) {
        timerSpan.textContent = this.invulnerableTimer.toFixed(1) + 'с';
      }
    } else {
      shieldEl.classList.add('hidden');
    }
  }

  selectSlot(slot) {
    if (!this.inventory[slot] || this.isDead) return;
    this.activeSlot = slot;
    this.currentWeapon = this.inventory[slot];
    this.isReloading = false;
    this.isAds = false;

    // Reset scope if switching away from scoped weapons
    if (this.isScoped && !this.currentWeapon.hasScope) {
      this.isScoped = false;
      this.scopeLevel = 0;
      this.updateSniperOverlay();
    }

    this.rebuildViewmodel();
    this.updateHUD();

    // Play switch whoosh / click sound
    window.csAudio.playMechanicalClick(1.2, 700);
  }

  rebuildViewmodel() {
    if (this.currentViewmodelMesh) {
      this.viewmodelRoot.remove(this.currentViewmodelMesh);
      this.currentViewmodelMesh = null;
    }

    if (!this.currentWeapon) return;

    const rig = window.csWeaponBuilder.createFirstPersonRig(this.currentWeapon.id, this.team === 'ct');
    this.currentViewmodelMesh = rig;
    this.viewmodelRoot.add(rig);

    // Initial draw animation offset
    rig.position.set(0, -0.3, 0);
  }

  handleFirePress() {
    if (this.isDead || !this.currentWeapon || this.isReloading) return;
    if (this.currentWeapon.clipSize > 0 && this.currentWeapon.currentClip <= 0) {
      // Authentic CS 1.6 empty clip dry-fire click
      if (window.csAudio && window.csAudio.playEmptyAmmoClick) {
        window.csAudio.playEmptyAmmoClick();
      } else {
        window.csAudio.playMechanicalClick(1.5, 900);
      }
      this.reload();
      return;
    }
    this.fireWeapon();
  }

  handleSecondaryFire() {
    if (this.isDead || !this.currentWeapon || this.isReloading) return;

    // 1. Sniper Rifles (AWP, Scout, SCAR-20)
    if (this.currentWeapon.hasScope) {
      const maxLevels = (this.currentWeapon.id === 'awp' || this.currentWeapon.id === 'scar20') ? 2 : 1;
      this.scopeLevel = (this.scopeLevel + 1) % (maxLevels + 1);
      this.isScoped = (this.scopeLevel > 0);
      this.isAds = false;

      this.updateSniperOverlay();
      if (window.csAudio) {
        if (window.csAudio.playAimZoom) {
          window.csAudio.playAimZoom(this.isScoped);
        } else {
          window.csAudio.playMechanicalClick(1.6, 950);
        }
      }
      return;
    }

    // 2. Knife: Powerful heavy secondary stab
    if (this.currentWeapon.id === 'knife') {
      this.performHeavyKnifeStab();
      return;
    }

    // 3. C4: Check plant
    if (this.currentWeapon.id === 'c4') {
      this.attemptPlantBomb();
      return;
    }

    // 4. All other Firearms (AK-47, M4A1, Desert Eagle, Glock, USP)
    // Toggle ADS (Aim Down Sights) with smooth optical zoom
    this.isAds = !this.isAds;
    this.isScoped = false;
    this.scopeLevel = 0;

    if (window.csAudio) {
      if (window.csAudio.playAimZoom) {
        window.csAudio.playAimZoom(this.isAds);
      } else {
        window.csAudio.playMechanicalClick(1.3, this.isAds ? 900 : 700);
      }
    }
  }

  performHeavyKnifeStab() {
    const now = performance.now() / 1000;
    if (now - this.lastShotTime < 0.65) return;
    this.lastShotTime = now;

    if (window.csAudio) {
      window.csAudio.playKnifeSlash();
    }

    // Viewmodel stab forward punch
    this.recoilOffset.z += 0.12;
    this.recoilRot.x -= 0.18;

    // Hitscan with heavy backstab/stab damage
    this.performHitscan(true);
  }

  updateSniperOverlay() {
    const scopeEl = document.getElementById('sniper-scope');
    const crosshairEl = document.getElementById('crosshair');

    if (this.isScoped) {
      if (scopeEl) scopeEl.classList.remove('hidden');
      if (crosshairEl) crosshairEl.classList.add('hidden');
      if (this.currentViewmodelMesh) this.currentViewmodelMesh.visible = false;
    } else {
      if (scopeEl) scopeEl.classList.add('hidden');
      if (crosshairEl) crosshairEl.classList.remove('hidden');
      if (this.currentViewmodelMesh && !this.isDead) this.currentViewmodelMesh.visible = true;
    }
  }

  fireWeapon() {
    const now = performance.now() / 1000;
    if (now - this.lastShotTime < this.currentWeapon.fireRate) return;
    this.lastShotTime = now;

    // Decrement ammo
    if (this.currentWeapon.clipSize > 0) {
      this.currentWeapon.currentClip--;
    }

    // Play weapon sound
    switch (this.currentWeapon.id) {
      case 'knife':
        window.csAudio.playKnifeSlash();
        break;
      case 'ak47':
        window.csAudio.playAK47();
        break;
      case 'm4a1': {
        const isSil = Boolean(this.currentViewmodelMesh?.weaponMesh?.silencerMesh?.visible);
        window.csAudio.playM4A1(isSil);
        break;
      }
      case 'scout':
        window.csAudio.playScout();
        break;
      case 'awp':
        window.csAudio.playAWP();
        break;
      case 'scar20':
        window.csAudio.playScar20();
        break;
      case 'deagle':
        window.csAudio.playDeagle();
        break;
      case 'glock':
        window.csAudio.playGlock();
        break;
      case 'usp':
        window.csAudio.playUSP();
        break;
      case 'c4':
        this.attemptPlantBomb();
        return;
    }

    // Recoil kick on viewmodel and camera
    this.applyRecoilKick();

    // Raycast bullet projectile
    this.performHitscan();

    this.updateHUD();
  }

  applyRecoilKick() {
    const wid = this.currentWeapon.id;
    const pattern = WEAPON_RECOIL_PATTERNS[wid] || [{ pitch: this.currentWeapon.recoil || 0.02, yaw: 0 }];
    const patIdx = Math.min(this.sprayCount, pattern.length - 1);
    const pat = pattern[patIdx];

    // Dampen kick if crouching or ADS
    let kickMod = 1.0;
    if (this.isCrouching) kickMod *= 0.55;
    if (this.isAds) kickMod *= 0.60;

    const pitchKick = (pat.pitch + (Math.random() - 0.5) * 0.003) * kickMod;
    const yawKick = (pat.yaw + (Math.random() - 0.5) * 0.005) * kickMod;

    // Authentic GoldSrc punchangle spring kickback (view pitch jolts upward on each shot)
    this.punchAngle.x += pitchKick * 0.85;
    this.punchAngle.y += yawKick * 0.75;

    // Direct slight view drift (mouse compensation feels natural)
    this.pitch += pitchKick * 0.20;
    this.yaw += yawKick * 0.25;

    // Viewmodel physical kickback
    this.recoilOffset.z += (this.isAds ? 0.035 : 0.075);
    this.recoilRot.x -= (this.isAds ? 0.045 : 0.11);
    this.recoilRot.y += yawKick * 1.8;

    // Muzzle flash visual
    if (this.currentViewmodelMesh && this.currentViewmodelMesh.muzzleFlash && !this.isScoped) {
      const flash = this.currentViewmodelMesh.muzzleFlash;
      const light = this.currentViewmodelMesh.flashLight;
      flash.material.opacity = 0.95;
      flash.scale.set(1 + Math.random(), 1 + Math.random(), 1 + Math.random());
      if (light) light.intensity = 2.8;

      setTimeout(() => {
        flash.material.opacity = 0;
        if (light) light.intensity = 0;
      }, 40);
    }

    // Dynamic crosshair expansion and firing pulse
    this.sprayCount++;
    this.crosshairPulse = 9.0;
    this.lastSprayTime = performance.now();
  }

  reload() {
    if (this.isReloading || !this.currentWeapon || this.currentWeapon.clipSize === 0) return;
    if (this.currentWeapon.currentClip >= this.currentWeapon.clipSize) return;
    if (this.currentWeapon.reserve <= 0) return;

    this.isReloading = true;
    this.reloadTimer = this.currentWeapon.reloadTime;
    this.isAds = false; // Drop ADS on reload
    window.csAudio.playReload();

    // Viewmodel multi-stage reload animation
    if (this.currentViewmodelMesh) {
      this.currentViewmodelMesh.position.y = -0.16;
      this.currentViewmodelMesh.rotation.z = -0.15;
    }
  }

  performHitscan(isHeavyKnife = false) {
    const raycaster = new THREE.Raycaster();

    let screenX = 0;
    let screenY = 0;

    if (this.currentWeapon.id === 'knife') {
      screenX = 0;
      screenY = 0;
    } else {
      // Authentic GoldSrc CS 1.6 spray trajectory:
      // Shots 1-2: 100% pinpoint accuracy on crosshair
      // Shots 3-6: Barrel climbs strictly vertically upwards
      // Shots 7-15: Horizontal drift left-right at apex vertical height
      const sprayIdx = Math.min(Math.max(0, this.sprayCount - 1), GOLDSRC_FULL_AUTO_SPRAY.length - 1);
      const sprayNode = GOLDSRC_FULL_AUTO_SPRAY[sprayIdx];
      const recoilScale = (this.currentWeapon.recoil || 0.03) / 0.038;

      let baseSprayX = sprayNode.x * recoilScale;
      let baseSprayY = sprayNode.y * recoilScale;

      // Crouch & ADS stability bonuses
      if (this.isCrouching) {
        baseSprayX *= 0.65;
        baseSprayY *= 0.65;
      }
      if (this.isAds) {
        baseSprayX *= 0.55;
        baseSprayY *= 0.55;
      }

      // Movement & dynamic accuracy calculation
      const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
      let spreadFactor = this.currentWeapon.spread || 0.02;

      if (this.isOnGround && horizSpeed < 0.25) {
        // Stationary on ground: shots 1 & 2 have 100% pinpoint accuracy!
        if (sprayIdx < 2) {
          spreadFactor = 0.0000;
        } else {
          spreadFactor *= 0.25;
        }
      } else if (!this.isOnGround) {
        // Jumping / in air has huge spread penalty
        spreadFactor *= 3.8;
      } else {
        // Running spread penalty
        spreadFactor *= (1.0 + horizSpeed * 0.45);
      }

      const jitterX = (Math.random() - 0.5) * spreadFactor;
      const jitterY = (Math.random() - 0.5) * spreadFactor;

      screenX = baseSprayX + jitterX;
      screenY = baseSprayY + jitterY;
    }

    const screenCenter = new THREE.Vector2(screenX, screenY);
    raycaster.setFromCamera(screenCenter, this.camera);
    const range = this.currentWeapon.range || 100;
    raycaster.far = range;

    // Check hit against bots (include both hitboxes and visible operative meshes)
    const botTargets = [];
    if (window.csGame && window.csGame.bots) {
      window.csGame.bots.forEach(b => {
        if (!b.isDead) {
          if (b.hitboxes && b.hitboxes.length > 0) {
            b.hitboxes.forEach(h => {
              if (!h.userData.disabled) botTargets.push(h);
            });
          }
          if (b.meshGroup && (!b.meshGroup.userData || !b.meshGroup.userData.disabled)) {
            b.meshGroup.traverse(child => {
              if (child.isMesh && (!child.userData || !child.userData.disabled)) {
                botTargets.push(child);
              }
            });
          }
        }
      });
    }
    const intersects = raycaster.intersectObjects(botTargets, true);

    // Hit against walls / map geometry (strictly exclude all bot meshes)
    const mapMeshes = [];
    this.scene.traverse((obj) => {
      if (obj.isMesh && obj !== this.currentViewmodelMesh) {
        let isBotObj = botTargets.includes(obj);
        if (!isBotObj) {
          let curr = obj;
          while (curr) {
            if (curr.userData && curr.userData.bot) {
              isBotObj = true;
              break;
            }
            curr = curr.parent;
          }
        }
        if (!isBotObj) {
          mapMeshes.push(obj);
        }
      }
    });

    const wallIntersects = raycaster.intersectObjects(mapMeshes);
    const wallHitDist = wallIntersects.length > 0 ? wallIntersects[0].distance : Infinity;

    // Gun muzzle position in world space for tracer beam
    const muzzlePos = this.camera.position.clone().add(
      new THREE.Vector3(0.2, -0.15, -0.5).applyEuler(this.camera.rotation)
    );

    if (intersects.length > 0 && intersects[0].distance < wallHitDist) {
      const hit = intersects[0];
      
      // Recursively search for bot root object to guarantee damage registration
      let bot = null;
      let hitZone = null;
      let curr = hit.object;
      while (curr) {
        if (curr.userData && curr.userData.bot) {
          bot = curr.userData.bot;
          if (curr.userData.hitZone) hitZone = curr.userData.hitZone;
          break;
        }
        curr = curr.parent;
      }

      if (bot && !bot.isDead) {
        // Spawn visual bullet tracer
        if (this.currentWeapon.id !== 'knife' && window.csGame && window.csGame.createBulletTracer) {
          window.csGame.createBulletTracer(muzzlePos, hit.point);
        }

        if (this.currentWeapon.id === 'knife') {
          window.csAudio.playKnifeHit();
        }

        // Precise Hitbox Zone Calculation (Head: instant kill / 100+ lethal, Body: 30-35, Legs: 26)
        if (!hitZone) {
          if (hit.point.y > bot.position.y + 1.40) hitZone = 'head';
          else if (hit.point.y < bot.position.y + 0.65) hitZone = 'legs';
          else hitZone = 'body';
        }
        const isHeadshot = (hitZone === 'head');

        let dmg = 34; // Body: strictly 30-35 damage
        if (isHeadshot) {
          dmg = 120; // Headshot: instant death (100+ lethal)
        } else if (hitZone === 'legs') {
          dmg = 26; // Legs: 25-28 damage
        }
        if (this.currentWeapon.id === 'knife') {
          dmg = isHeavyKnife ? 120 : 40;
        }

        if (isHeadshot && window.csAudio && window.csAudio.playHeadshot) {
          window.csAudio.playHeadshot();
        }

        bot.takeDamage(dmg, isHeadshot, this, hitZone);
        if (window.csGame && window.csGame.createBloodSpurt) {
          window.csGame.createBloodSpurt(hit.point);
        }
        return;
      }
    }

    if (wallIntersects.length > 0) {
      const hit = wallIntersects[0];

      // Spawn visual bullet tracer
      if (this.currentWeapon.id !== 'knife' && window.csGame && window.csGame.createBulletTracer) {
        window.csGame.createBulletTracer(muzzlePos, hit.point);
      }

      // Check if bullet hit the turquoise ocean water
      if (hit.point.y <= 0.1 && hit.point.x < -30) {
        if (window.csGame && window.csGame.createWaterSplash) {
          window.csGame.createWaterSplash(hit.point);
        }
        window.csAudio.playWaterSplash();
      } else {
        window.csGame.createBulletDecal(hit.point, hit.face.normal);
        if (window.csGame.createSparks) window.csGame.createSparks(hit.point, hit.face.normal);
        if (window.csGame.createDustPuff) window.csGame.createDustPuff(hit.point, hit.face.normal);
        window.csAudio.playWallHit();
      }

      // Authentic GoldSrc Wallbang (Penetration through wooden crates, planks, cabanas, thin walls)
      const penPower = this.currentWeapon.penetrationPower || 0;
      if (penPower > 0 && this.currentWeapon.id !== 'knife') {
        const rayDir = raycaster.ray.direction.clone();
        const maxPenDist = penPower * 1.6;
        const behindRay = new THREE.Raycaster();
        behindRay.far = Math.max(1, range - hit.distance);

        for (let d = 0.25; d <= maxPenDist; d += 0.25) {
          const testOrigin = hit.point.clone().addScaledVector(rayDir, d);
          behindRay.set(testOrigin, rayDir);
          const penHits = behindRay.intersectObjects(botTargets, true);
          if (penHits.length > 0 && penHits[0].distance < 35) {
            const penHit = penHits[0];
            const bot = penHit.object.userData.bot;
            if (bot && !bot.isDead) {
              const penFactor = Math.max(0.2, 1.0 - (d / maxPenDist));
              const penZone = penHit.object.userData.hitZone || (
                penHit.point.y > bot.position.y + 1.40 ? 'head' : (penHit.point.y < bot.position.y + 0.70 ? 'legs' : 'body')
              );
              const isHeadshot = (penZone === 'head');
              let penDmg = (isHeadshot ? 95 : 24) * penFactor;

              bot.takeDamage(penDmg, isHeadshot, this, penZone);
              window.csGame.createBloodSpurt(penHit.point);
              window.csAudio.playMechanicalClick(1.5, 800);
              break;
            }
          }
        }
      }
    } else if (this.currentWeapon.id !== 'knife') {
      // Stray bullet tracer into the distance
      const farPoint = muzzlePos.clone().add(raycaster.ray.direction.clone().multiplyScalar(range));
      if (window.csGame && window.csGame.createBulletTracer) {
        window.csGame.createBulletTracer(muzzlePos, farPoint);
      }
    }
  }

  takeDamage(amount, isHeadshot = false, attacker = null, hitZone = 'body') {
    if (this.isDead || this.isInvulnerable) return;

    // CS 1.6 Hitbox Multipliers: Head x4 (instant death / 100+ lethal), Body 1.0, Legs 0.75
    let actualDamage = amount;
    if (hitZone === 'head' || isHeadshot) {
      actualDamage = Math.max(105, actualDamage * 4.0);
      isHeadshot = true;
    } else if (hitZone === 'legs') {
      actualDamage = actualDamage * 0.75;
    } else {
      actualDamage = actualDamage * 1.0;
    }

    if (this.armor > 0 && !isHeadshot) {
      const absorbed = actualDamage * 0.45;
      this.armor = Math.max(0, this.armor - absorbed);
      actualDamage -= absorbed;
    }

    this.health = Math.max(0, this.health - actualDamage);

    // GOLDSRC TAGGING: Taking damage instantly cuts player speed and velocity by 48% for 0.4 seconds
    this.taggingTimer = 0.4;
    this.velocity.x *= 0.52;
    this.velocity.z *= 0.52;

    // Directional damage indicator on HUD
    if (attacker && attacker.position && this.position && window.csGame && window.csGame.showDamageIndicator) {
      const dx = attacker.position.x - this.position.x;
      const dz = attacker.position.z - this.position.z;
      const hitAngle = Math.atan2(dx, dz) - this.yaw;
      window.csGame.showDamageIndicator(hitAngle);
    }

    // Screen flash red damage overlay
    const overlay = document.getElementById('damage-overlay');
    if (overlay) {
      overlay.style.opacity = '0.65';
      setTimeout(() => { overlay.style.opacity = '0'; }, 180);
    }

    if (isHeadshot) {
      window.csAudio.playHeadshot();
    } else {
      window.csAudio.playFleshHit();
    }

    this.updateHUD();

    if (this.health <= 0) {
      this.die(attacker, isHeadshot);
    }
  }

  die(attacker, isHeadshot) {
    this.isDead = true;
    this.deaths++;
    if (this.isScoped) {
      this.isScoped = false;
      this.updateSniperOverlay();
    }
    if (this.currentViewmodelMesh) {
      this.currentViewmodelMesh.visible = false;
    }

    // Play authentic CS 1.6 death groan sound
    if (window.csAudio && window.csAudio.playDeathSound) {
      window.csAudio.playDeathSound(isHeadshot);
    }

    // Drop camera down to ground and roll (death ragdoll view)
    this.eyeHeight = 0.22;
    this.cameraRoll = 0.42;

    window.csGame.handlePlayerDeath(this, attacker, isHeadshot);
  }

  updateDeathCam(delta) {
    if (window.csGame && window.csGame.spectatingBot) {
      const specBot = window.csGame.spectatingBot;
      if (specBot && !specBot.isDead && specBot.position) {
        // Smoothly follow spectated ally bot in first-person/over-shoulder
        const targetEyeY = specBot.position.y + (specBot.isCrouching ? 1.05 : 1.60);
        this.camera.position.lerp(new THREE.Vector3(specBot.position.x, targetEyeY, specBot.position.z), delta * 12);

        this.yaw = THREE.MathUtils.lerp(this.yaw, specBot.rotationY || 0, delta * 10);
        this.pitch = THREE.MathUtils.lerp(this.pitch, 0, delta * 8);
        this.cameraRoll = THREE.MathUtils.lerp(this.cameraRoll, 0, delta * 8);

        this.camera.rotation.set(0, 0, 0);
        this.camera.rotation.y = this.yaw;
        this.camera.rotation.x = this.pitch;
        return;
      }
    }

    // Classic CS Ragdoll Ground Cam: smoothly drop to floor with tilted camera
    const groundY = (this.map && this.map.getGroundHeight)
      ? this.map.getGroundHeight(this.position.x, this.position.z, this.position.y)
      : 0;
    const targetCamY = groundY + 0.22;
    this.camera.position.x = this.position.x;
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetCamY, delta * 6);
    this.camera.position.z = this.position.z;

    this.cameraRoll = THREE.MathUtils.lerp(this.cameraRoll, 0.42, delta * 6);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = this.cameraRoll;
  }

  update(delta) {
    if (this.isDead) {
      this.updateDeathCam(delta);
      return;
    }

    // Spawn Invulnerability Shield Decay (2 seconds on respawn)
    if (this.isInvulnerable) {
      this.invulnerableTimer -= delta;
      if (this.invulnerableTimer <= 0) {
        this.isInvulnerable = false;
        this.invulnerableTimer = 0;
      }
      this.updateSpawnShieldHUD();
    }

    // Movement logic
    this.handleMovement(delta);

    // Auto-fire continuous spray for rifles
    if (this.isMouseDown && this.currentWeapon && this.currentWeapon.isAutomatic) {
      this.fireWeapon();
    }

    // Reload timer
    if (this.isReloading) {
      this.reloadTimer -= delta;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        const needed = this.currentWeapon.clipSize - this.currentWeapon.currentClip;
        const take = Math.min(needed, this.currentWeapon.reserve);
        this.currentWeapon.currentClip += take;
        this.currentWeapon.reserve -= take;
        this.updateHUD();
        if (this.currentViewmodelMesh) this.currentViewmodelMesh.position.y = 0;
      }
    }

    // PUBG-style Leaning (Q for Left, E for Right)
    let targetLean = 0;
    const isEInteracting = this.isInteracting || this.isPlanting;
    if (this.keys['KeyQ']) targetLean -= 1.0;
    if (this.keys['KeyE'] && !isEInteracting) targetLean += 1.0;

    this.leanAmount = THREE.MathUtils.lerp(this.leanAmount, targetLean, delta * 11);
    this.leanRoll = THREE.MathUtils.lerp(this.leanRoll, targetLean * 0.175, delta * 11);

    // Smooth ADS transition
    const targetAds = (this.isAds && !this.isScoped) ? 1.0 : 0.0;
    this.adsProgress = THREE.MathUtils.lerp(this.adsProgress, targetAds, delta * 12);

    // Smooth Camera FOV Zoom for ADS & Sniper Scopes
    let targetFov = 75;
    if (this.isScoped) {
      targetFov = (this.scopeLevel === 1) ? 32 : 14;
    } else if (this.isAds) {
      // Pistol vs Rifle zoom
      targetFov = (this.currentWeapon && this.currentWeapon.slot === 2) ? 58 : 50;
    }
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, delta * 14);
    this.camera.updateProjectionMatrix();

    // Toggle ADS reticle class on crosshair
    const crosshairEl = document.getElementById('crosshair');
    if (crosshairEl) {
      crosshairEl.classList.toggle('ads-active', this.isAds && !this.isScoped);
    }

    // Smooth Recoil & Viewmodel Sway recovery
    this.recoilOffset.lerp(new THREE.Vector3(0, 0, 0), delta * 12);
    this.recoilRot.lerp(new THREE.Vector3(0, 0, 0), delta * 14);
    this.mouseSway.lerp(new THREE.Vector2(0, 0), delta * 8);

    if (this.currentViewmodelMesh) {
      // Idle breathing subtle sway (dampened during ADS)
      const swayDamp = 1.0 - this.adsProgress * 0.8;
      const time = performance.now() * 0.002;
      const breathY = Math.sin(time) * 0.0015 * swayDamp;
      const breathX = Math.cos(time * 0.5) * 0.001 * swayDamp;

      // Weapon-specific ADS sight alignment (bringing iron sights / optic directly into camera eye)
      const isPistol = (this.currentWeapon && this.currentWeapon.slot === 2);
      const isM4 = (this.currentWeapon && this.currentWeapon.id === 'm4a1');
      const adsOffsetX = -0.080 * this.adsProgress;
      const adsOffsetY = (isPistol ? 0.038 : (isM4 ? 0.042 : 0.039)) * this.adsProgress;
      const adsOffsetZ = (isPistol ? 0.045 : 0.065) * this.adsProgress;

      // Multi-stage tactile reload viewmodel movement
      let reloadOffsetY = 0;
      let reloadRotX = 0;
      let reloadRotZ = 0;
      if (this.isReloading && this.currentWeapon && this.currentWeapon.reloadTime > 0) {
        const relProgress = Math.max(0, Math.min(1.0, 1.0 - (this.reloadTimer / this.currentWeapon.reloadTime)));
        if (relProgress < 0.35) {
          const p = relProgress / 0.35;
          reloadOffsetY = -0.15 * Math.sin(p * Math.PI * 0.5);
          reloadRotZ = 0.16 * p;
          reloadRotX = -0.12 * p;
        } else if (relProgress < 0.7) {
          const p = (relProgress - 0.35) / 0.35;
          reloadOffsetY = -0.15 * (1.0 - p * 0.45);
          reloadRotZ = 0.16 * (1.0 - p * 0.45);
          reloadRotX = -0.12 + 0.10 * Math.sin(p * Math.PI);
        } else {
          const p = (relProgress - 0.7) / 0.3;
          reloadOffsetY = -0.08 * (1.0 - p);
          reloadRotZ = 0.088 * (1.0 - p);
          reloadRotX = 0.06 * Math.sin(p * Math.PI);
        }
      }

      this.currentViewmodelMesh.position.set(
        adsOffsetX + this.recoilOffset.x + this.mouseSway.x * swayDamp + breathX,
        adsOffsetY + reloadOffsetY + this.recoilOffset.y + this.mouseSway.y * swayDamp + breathY,
        adsOffsetZ + this.recoilOffset.z
      );

      this.currentViewmodelMesh.rotation.set(
        reloadRotX + this.recoilRot.x - (this.mouseSway.y * 0.5 * swayDamp),
        this.recoilRot.y + (this.mouseSway.x * 0.6 * swayDamp),
        reloadRotZ + this.recoilRot.z - (this.cameraRoll * 0.4) - (this.leanRoll * 0.5)
      );

      // Weapon bobbing when moving on ground (heavily dampened in ADS)
      const hSpeed = Math.hypot(this.velocity.x, this.velocity.z);
      if (hSpeed > 0.4 && this.isOnGround) {
        this.viewmodelBob += delta * (this.keys['ShiftLeft'] ? 12 : 9.5);
        this.currentViewmodelMesh.position.x += Math.sin(this.viewmodelBob) * (0.012 * swayDamp);
        this.currentViewmodelMesh.position.y += Math.abs(Math.cos(this.viewmodelBob)) * (0.009 * swayDamp);
      }
    }

    // Camera banking / roll during strafing
    let targetRoll = 0;
    if (this.keys['KeyA']) targetRoll += 0.012;
    if (this.keys['KeyD']) targetRoll -= 0.012;
    this.cameraRoll = THREE.MathUtils.lerp(this.cameraRoll, targetRoll, delta * 8);

    // Smooth GoldSrc-style Camera Head-Bobbing
    const hSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const targetBobIntensity = (this.isOnGround && hSpeed > 0.3) ? Math.min(1.0, hSpeed / 5.4) : 0;
    this.bobIntensity = THREE.MathUtils.lerp(this.bobIntensity, targetBobIntensity, delta * 10);

    let verticalBob = 0;
    let horizontalBob = 0;
    if (this.bobIntensity > 0.01) {
      const bobFreq = this.keys['ShiftLeft'] ? 12 : 9.2;
      this.bobTimer += delta * bobFreq;
      const bobAmp = (this.isCrouching ? 0.008 : 0.022) * this.bobIntensity * (1.0 - this.adsProgress * 0.5);
      verticalBob = Math.sin(this.bobTimer) * bobAmp;
      horizontalBob = Math.cos(this.bobTimer * 0.5) * (bobAmp * 0.45);
    }

    // Recover landing compression dip smoothly
    this.landingDip = THREE.MathUtils.lerp(this.landingDip, 0, delta * 9);

    // Camera placement in world space with local horizontal head sway and PUBG-style lean
    const camPos = this.position.clone();
    camPos.y += this.eyeHeight + verticalBob - this.landingDip;

    const camRight = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    if (Math.abs(horizontalBob) > 0.0001) {
      camPos.addScaledVector(camRight, horizontalBob);
    }

    // PUBG Leaning offset with wall clipping avoidance
    if (Math.abs(this.leanAmount) > 0.001) {
      const maxLeanDist = 0.42 * this.leanAmount;
      const leanOffset = camRight.clone().multiplyScalar(maxLeanDist);
      const testPos = camPos.clone().add(leanOffset);

      // Check collision with world walls
      const isBlocked = this.map && this.map.checkCollision
        ? this.map.checkCollision(testPos, 0.22, this.position.y)
        : false;

      if (!isBlocked) {
        camPos.add(leanOffset);
        camPos.y -= Math.abs(this.leanAmount) * 0.055; // natural torso tilt drop
      } else {
        // Try partial 50% lean
        const halfOffset = leanOffset.clone().multiplyScalar(0.5);
        const testHalf = camPos.clone().add(halfOffset);
        if (!this.map.checkCollision(testHalf, 0.22, this.position.y)) {
          camPos.add(halfOffset);
          camPos.y -= Math.abs(this.leanAmount) * 0.028;
        }
      }
    }

    this.camera.position.copy(camPos);

    // Decay punchangle spring back towards center (GoldSrc view punch spring)
    this.punchAngle.lerp(new THREE.Vector2(0, 0), Math.min(1.0, delta * 12.0));
    if (this.crosshairPulse > 0) {
      this.crosshairPulse = Math.max(0, this.crosshairPulse - delta * 32.0);
    }

    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw + this.punchAngle.y;
    this.camera.rotation.x = this.pitch + this.punchAngle.x;
    this.camera.rotation.z = this.cameraRoll - this.leanRoll;

    // Dynamic Crosshair Spread update
    this.updateCrosshairSpread();

    // Check interaction (E key or LMB for defusing or planting)
    this.checkInteraction(delta);
  }

  handleMovement(delta) {
    // Crouch handling
    this.isCrouching = !!this.keys['ControlLeft'] || !!this.keys['KeyC'];
    const targetHeight = this.isCrouching ? this.eyeHeightCrouching : this.eyeHeightStanding;
    this.eyeHeight += (targetHeight - this.eyeHeight) * delta * 14;

    // CS 1.6 GoldSrc Weapon Speed: knife: 250, pistols: 250, AK-47: 221, AWP: 210 (scoped: 150)
    let speedUnits = (this.currentWeapon && this.currentWeapon.speedUnits) ? this.currentWeapon.speedUnits : 250;
    if (this.isScoped) {
      speedUnits = Math.min(speedUnits, 150); // Scoped zoom mobility penalty (AWP: 150 units/s)
    }
    // Baseline conversion: 250 units/s = 6.0 m/s
    const baseSpeed = (speedUnits / 250.0) * 6.0;

    // Movement state multipliers (duck: ~34%, walk: ~52%, run: 100%)
    let currentSpeed = baseSpeed;
    if (this.isCrouching) {
      currentSpeed = baseSpeed * 0.34;
    } else if (this.keys['ShiftLeft']) {
      currentSpeed = baseSpeed * 0.52; // Silent walk
    }

    if (this.adsProgress > 0.25) {
      currentSpeed *= 0.75;
    }

    // GOLDSRC TAGGING: 48% speed reduction under fire for 0.4 seconds
    if (this.taggingTimer > 0) {
      this.taggingTimer -= delta;
      currentSpeed *= 0.52; // Instant 48% speed reduction
    }

    // Input direction vectors
    const moveDir = new THREE.Vector3();
    if (this.keys['KeyW']) moveDir.z -= 1;
    if (this.keys['KeyS']) moveDir.z += 1;
    if (this.keys['KeyA']) moveDir.x -= 1;
    if (this.keys['KeyD']) moveDir.x += 1;
    moveDir.normalize();

    // Transform by camera yaw
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const wishDir = new THREE.Vector3()
      .addScaledVector(forward, -moveDir.z)
      .addScaledVector(right, moveDir.x);

    if (this.isOnGround) {
      const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);

      // GOLDSRC COUNTER-STRAFING: Instant dead-stop braking when tapping opposing key
      if (horizSpeed > 0.1 && wishDir.lengthSq() > 0) {
        const dot = (this.velocity.x * wishDir.x + this.velocity.z * wishDir.z) / horizSpeed;
        if (dot < -0.1) {
          // Sharp counter-strafe brake (dead stop)
          const brake = Math.min(1.0, delta * 36.0);
          this.velocity.x *= (1.0 - brake);
          this.velocity.z *= (1.0 - brake);
        }
      }

      // Ground acceleration
      if (wishDir.lengthSq() > 0) {
        const accelRate = (this.taggingTimer > 0 ? 5.5 : 9.5);
        this.velocity.x += wishDir.x * currentSpeed * delta * accelRate;
        this.velocity.z += wishDir.z * currentSpeed * delta * accelRate;

        // Surface footsteps (silent when shift-walking)
        if (!this.keys['ShiftLeft']) {
          this.footstepTimer += delta;
          const stepInterval = (this.isCrouching ? 0.55 : 0.38);
          if (this.footstepTimer > stepInterval) {
            this.footstepTimer = 0;
            let surface = 'sand';
            if (this.position.x < -30 && this.position.y <= 0.05) {
              surface = 'water';
            } else if (this.position.x >= 10 && this.position.x <= 34 && this.position.z >= 16 && this.position.z <= 38) {
              surface = 'wood';
            }
            window.csAudio.playFootstep(surface);
          }
        }
      }

      // Ground friction
      const friction = 9.0;
      this.velocity.x -= this.velocity.x * friction * delta;
      this.velocity.z -= this.velocity.z * friction * delta;
      if (Math.hypot(this.velocity.x, this.velocity.z) < 0.03) {
        this.velocity.x = 0;
        this.velocity.z = 0;
      }

      // Bunnyhop: Jumping off the ground preserves horizontal speed!
      if (this.keys['Space']) {
        this.velocity.y = 5.5; // Authentic jump impulse
        this.isOnGround = false;
        const surface = (this.position.x >= 10 && this.position.z >= 16) ? 'wood' : 'sand';
        window.csAudio.playFootstep(surface);
      }
    } else {
      // GoldSrc PM_AirAccelerate / Air-Strafing
      if (wishDir.lengthSq() > 0) {
        const wishSpeed = Math.min(wishDir.length() * currentSpeed, 30);
        const currentSpeedInWish = this.velocity.dot(wishDir);
        const addSpeed = wishSpeed - currentSpeedInWish;
        if (addSpeed > 0) {
          const accel = Math.min(addSpeed, 70 * delta);
          this.velocity.addScaledVector(wishDir, accel);
        }
      }

      // Minimal air drag
      const airFriction = 0.4;
      this.velocity.x -= this.velocity.x * airFriction * delta;
      this.velocity.z -= this.velocity.z * airFriction * delta;

      // Gravity
      this.velocity.y -= 19.5 * delta;
    }

    // Save previous vertical speed for impact detection
    this.prevVelocityY = this.velocity.y;

    // Collision Resolution with Map
    const nextPos = this.position.clone().addScaledVector(this.velocity, delta);

    // Query exact physical ground height from the map (platforms, ramps, sand)
    const targetGroundY = (this.map && this.map.getGroundHeight)
      ? this.map.getGroundHeight(nextPos.x, nextPos.z, this.position.y)
      : 0;

    // Ground stepping without jitter or snapping
    if (this.isOnGround) {
      const heightDiff = targetGroundY - this.position.y;
      if (Math.abs(heightDiff) <= 0.45) {
        // Smoothly interpolate up/down curbs, ramps and boardwalk
        nextPos.y = THREE.MathUtils.lerp(this.position.y, targetGroundY, Math.min(1.0, delta * 18));
      } else if (heightDiff > 0.45) {
        // Too high to step up without jumping - treat as block
        nextPos.x = this.position.x;
        nextPos.z = this.position.z;
        nextPos.y = this.position.y;
      } else {
        // Walked off an edge / ledge - start falling smoothly
        this.isOnGround = false;
        nextPos.y = this.position.y + this.velocity.y * delta;
      }
    } else {
      // In mid-air (jumping or falling)
      if (nextPos.y <= targetGroundY) {
        // Landed!
        nextPos.y = targetGroundY;
        if (this.prevVelocityY < -3.2) {
          this.landingDip = Math.min(0.2, Math.abs(this.prevVelocityY) * 0.025);
          window.csAudio.playLandingThud(Math.min(1.5, Math.abs(this.prevVelocityY) / 5));
        }
        this.velocity.y = 0;
        this.isOnGround = true;
      }
    }

    // Sliding wall collision resolution
    const testX = new THREE.Vector3(nextPos.x, nextPos.y + 0.5, this.position.z);
    if (!this.map.checkCollision(testX, 0.40, this.position.y)) {
      this.position.x = nextPos.x;
    } else {
      this.velocity.x = 0;
    }

    const testZ = new THREE.Vector3(this.position.x, nextPos.y + 0.5, nextPos.z);
    if (!this.map.checkCollision(testZ, 0.40, this.position.y)) {
      this.position.z = nextPos.z;
    } else {
      this.velocity.z = 0;
    }

    this.position.y = nextPos.y;
  }

  updateCrosshairSpread() {
    let spread = 4; // base 4px gap

    // Dynamic movement expansion (running spreads risks outward)
    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (horizSpeed > 0.4) {
      spread += Math.min(14, horizSpeed * 2.3);
    }

    // In air jumping bloom
    if (!this.isOnGround) {
      spread += 18;
    }

    // Tactical crouching narrows crosshair
    if (this.isCrouching) {
      spread = Math.max(2, spread - 3);
    }

    // Shooting pulse kick
    if (this.crosshairPulse > 0) {
      spread += this.crosshairPulse;
    }

    // Progressive spray count expansion
    const timeSinceShot = (performance.now() - this.lastSprayTime) / 1000;
    if (timeSinceShot > 0.16) {
      this.sprayCount = Math.max(0, this.sprayCount - 1);
    }
    spread += Math.min(16, this.sprayCount * 2.2);

    if (this.adsProgress > 0.5) spread = 1; // Pinpoint reticle during ADS

    document.documentElement.style.setProperty('--ch-spread', `${spread}px`);
  }

  checkInteraction(delta) {
    const isEKeyDown = !!this.keys['KeyE'];
    const actionBar = document.getElementById('action-bar-container');
    const actionLabel = document.getElementById('action-bar-label');
    const actionFill = document.getElementById('action-bar-fill');
    const promptContainer = document.getElementById('interaction-prompt');
    const promptText = document.getElementById('interaction-prompt-text');

    let showPrompt = false;

    // 1. Defuse check (CT only)
    if (this.team === 'ct' && window.csGame.isBombPlanted && !window.csGame.isBombDefused && window.csGame.plantedBombPos) {
      const bombPos = window.csGame.plantedBombPos;
      const dist = this.position.distanceTo(bombPos);

      if (dist < 4.2) {
        showPrompt = true;
        if (promptText) {
          promptText.textContent = this.hasDefuseKit
            ? 'УДЕРЖИВАЙТЕ ДЛЯ ОБЕЗВРЕЖИВАНИЯ (С НАБОРОМ 5.0с)'
            : 'УДЕРЖИВАЙТЕ ДЛЯ ОБЕЗВРЕЖИВАНИЯ БОМБЫ (10.0с)';
        }

        if (dist < 3.2 && isEKeyDown) {
          this.isInteracting = true;
          this.targetInteractionTime = this.hasDefuseKit ? 5.0 : 10.0;
          this.interactionProgress += delta;

          // Periodic disarm tool audio
          this.defuseBeepTimer = (this.defuseBeepTimer || 0) + delta;
          if (this.defuseBeepTimer > 0.65) {
            this.defuseBeepTimer = 0;
            if (window.csAudio && window.csAudio.playC4Disarm) {
              window.csAudio.playC4Disarm();
            }
          }

          if (actionBar) {
            actionBar.classList.remove('hidden');
            actionLabel.textContent = this.hasDefuseKit
              ? 'ОБЕЗВРЕЖИВАНИЕ (С НАБОРОМ САПЕРА 5.0с)...'
              : 'ОБЕЗВРЕЖИВАНИЕ БОМБЫ (10.0с)...';
            actionFill.style.width = `${Math.min(100, (this.interactionProgress / this.targetInteractionTime) * 100)}%`;
          }

          if (this.interactionProgress >= this.targetInteractionTime) {
            window.csGame.defuseBomb(this);
            if (actionBar) actionBar.classList.add('hidden');
            if (promptContainer) promptContainer.classList.add('hidden');
            this.isInteracting = false;
            this.interactionProgress = 0;
          }
          return;
        }
      }
    }

    // 2. C4 Pickup check (T only, if bomb was dropped)
    if (this.team === 't' && window.csGame.droppedBombPos) {
      const distDrop = this.position.distanceTo(window.csGame.droppedBombPos);
      if (distDrop < 2.2) {
        window.csGame.pickUpBomb(this);
      }
    }

    // 3. Plant check (T with C4 on bombsite)
    if (this.team === 't' && !window.csGame.isBombPlanted && this.inventory[5]) {
      const inSiteA = this.map && this.position.distanceTo(new THREE.Vector3(this.map.bombsiteA.x, 0, this.map.bombsiteA.z)) < this.map.bombsiteA.radius;
      const inSiteB = this.map && this.position.distanceTo(new THREE.Vector3(this.map.bombsiteB.x, 0, this.map.bombsiteB.z)) < this.map.bombsiteB.radius;

      if (inSiteA || inSiteB) {
        showPrompt = true;
        if (promptText) {
          promptText.textContent = `УДЕРЖИВАЙТЕ ДЛЯ ЗАКЛАДКИ C4 НА ТОЧКЕ [${inSiteA ? 'A' : 'B'}] (3.2с)`;
        }

        const isHoldingC4 = (this.currentWeapon && this.currentWeapon.id === 'c4');
        const wantPlant = (isHoldingC4 && this.isMouseDown) || isEKeyDown;

        if (wantPlant) {
          if (!isHoldingC4) {
            this.selectSlot(5); // Automatically equip C4
          }

          this.isPlanting = true;
          this.targetPlantTime = 3.2; // Authentic CS plant duration
          this.plantingProgress += delta;

          // Keypad button beeps (7355608 code input sequence)
          this.plantBeepTimer = (this.plantBeepTimer || 0) + delta;
          if (this.plantBeepTimer > 0.42) {
            this.plantBeepTimer = 0;
            if (window.csAudio && window.csAudio.playC4KeypadPress) {
              window.csAudio.playC4KeypadPress();
            }
          }

          if (actionBar) {
            actionBar.classList.remove('hidden');
            actionLabel.textContent = `УСТАНОВКА БОМБЫ C4 НА ТОЧКЕ [${inSiteA ? 'A' : 'B'}] (3.2с)...`;
            actionFill.style.width = `${Math.min(100, (this.plantingProgress / this.targetPlantTime) * 100)}%`;
          }

          if (this.plantingProgress >= this.targetPlantTime) {
            const siteLetter = inSiteA ? 'A' : 'B';
            window.csGame.plantBomb(this.position.clone(), siteLetter, this);
            delete this.inventory[5]; // C4 consumed
            this.updateHUD();
            this.selectSlot(1); // Switch to primary
            if (actionBar) actionBar.classList.add('hidden');
            if (promptContainer) promptContainer.classList.add('hidden');
            this.isPlanting = false;
            this.plantingProgress = 0;
          }
          return;
        }
      }
    }

    if (promptContainer) {
      promptContainer.classList.toggle('hidden', !showPrompt);
    }

    // Reset action state when interaction stopped or cancelled
    if (this.isInteracting || this.isPlanting) {
      this.isInteracting = false;
      this.isPlanting = false;
      this.interactionProgress = 0;
      this.plantingProgress = 0;
      if (actionBar) actionBar.classList.add('hidden');
    }
  }

  attemptPlantBomb() {
    if (this.team !== 't' || window.csGame.isBombPlanted) return;
    const inSiteA = this.map && this.position.distanceTo(new THREE.Vector3(this.map.bombsiteA.x, 0, this.map.bombsiteA.z)) < this.map.bombsiteA.radius;
    const inSiteB = this.map && this.position.distanceTo(new THREE.Vector3(this.map.bombsiteB.x, 0, this.map.bombsiteB.z)) < this.map.bombsiteB.radius;

    if (inSiteA || inSiteB) {
      if (window.csGame) window.csGame.showRadioSubtitle('Удерживайте ЛКМ или [E] для закладки C4 (3.2 сек)!');
    } else {
      if (window.csGame) window.csGame.showRadioSubtitle('Необходимо зайти на точку закладки A или B!');
    }
  }

  updateHUD() {
    const hpVal = Math.round(this.health);
    const hpElem = document.getElementById('hud-health');
    const hpBox = document.querySelector('.health-box');

    if (hpElem) {
      hpElem.textContent = hpVal;
      if (hpVal > 50) {
        hpElem.style.color = '#00ff66'; // CS 1.6 classic neon green
        if (hpBox) {
          hpBox.classList.remove('critical', 'warning');
        }
      } else if (hpVal >= 25) {
        hpElem.style.color = '#ffaa00'; // Amber warning
        if (hpBox) {
          hpBox.classList.remove('critical');
          hpBox.classList.add('warning');
        }
      } else {
        hpElem.style.color = '#ff2222'; // Critical blinking red
        if (hpBox) {
          hpBox.classList.remove('warning');
          hpBox.classList.add('critical');
        }
      }
    }

    const armorElem = document.getElementById('hud-armor');
    if (armorElem) armorElem.textContent = Math.round(this.armor);

    const moneyElem = document.getElementById('hud-money');
    if (moneyElem) moneyElem.textContent = this.money;

    if (this.currentWeapon) {
      const nameElem = document.getElementById('hud-weapon-name');
      if (nameElem) nameElem.textContent = this.currentWeapon.name;

      const ammoBox = document.querySelector('.ammo-box');
      if (this.currentWeapon.clipSize > 0) {
        const clipElem = document.getElementById('hud-ammo-clip');
        const resElem = document.getElementById('hud-ammo-reserve');
        if (clipElem) clipElem.textContent = this.currentWeapon.currentClip;
        if (resElem) resElem.textContent = this.currentWeapon.reserve;
        if (ammoBox) ammoBox.style.visibility = 'visible';
      } else {
        if (ammoBox) ammoBox.style.visibility = 'hidden';
      }
    }
  }
}

window.CSPlayer = CSPlayer;
