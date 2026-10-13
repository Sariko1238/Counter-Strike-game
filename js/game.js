/**
 * Master Game Engine & Match Orchestrator for Counter-Strike 1.6 3D
 */

class CSGame {
  constructor() {
    this.container = document.getElementById('game-container');
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // Components
    this.map = null;
    this.player = null;
    this.bots = [];
    this.particles = [];
    this.tracers = [];
    this.ambientTimer = 0;
    this.plantedBombMesh = null;
    this.plantedBombPos = null;
    this.droppedBombMesh = null;
    this.droppedBombPos = null;

    // Match State
    this.roundTimeMax = 120; // 2 minutes
    this.roundTimer = 120;
    this.scoreCT = 0;
    this.scoreT = 0;
    this.isRoundOver = false;
    this.isBombPlanted = false;
    this.isBombDefused = false;
    this.bombTimer = 45;
    this.bombBeepTimer = 0;
    this.bombSitePlanted = '';

    // Gameplay State
    this.isGameStarted = false;
    this.isPaused = false;
    this.isBuyMenuOpen = false;

    // Settings
    this.difficulty = 'normal';
    this.botCount = 6;
    this.playerTeam = 'ct';

    // Spectator & Death State
    this.spectatingBot = null;
    this.spectatingBotIndex = 0;

    // Radar & Clock
    this.radarCanvas = document.getElementById('radar-canvas');
    this.radarCtx = this.radarCanvas.getContext('2d');
    this.clock = new THREE.Clock();

    this.initThree();
    this.initUI();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    // 1. Scene with crystal tropical coastal horizon haze
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xa2d2ff, 0.0032);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 350);
    this.scene.add(this.camera);

    // 3. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 4. Map & Player
    this.map = new window.CSDust2Map(this.scene);
    this.map.buildMap();

    this.player = new window.CSPlayer(this.camera, this.scene, this.map);

    // 5. 3D CS:GO Lobby Showcase
    if (window.CSLobby3D) {
      this.lobby3d = new window.CSLobby3D(this.renderer, this.container);
    }

    // Resize listener
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  updateLobbyBadge(team) {
    const titleEl = document.getElementById('lobby-op-title');
    const weaponEl = document.getElementById('lobby-op-weapon');
    const teamEl = document.getElementById('lobby-op-team');
    if (team === 'ct') {
      if (teamEl) teamEl.textContent = 'СПЕЦНАЗ (CT)';
      if (titleEl) titleEl.textContent = 'SAS OPERATIVE';
      if (weaponEl) weaponEl.textContent = 'ВООРУЖЕНИЕ: M4A1 CARBINE';
    } else {
      if (teamEl) teamEl.textContent = 'ТЕРРОРИСТЫ (T)';
      if (titleEl) titleEl.textContent = 'PHOENIX ENFORCER';
      if (weaponEl) weaponEl.textContent = 'ВООРУЖЕНИЕ: AK-47 ASSAULT RIFLE';
    }
  }

  initUI() {
    // Menu Team Selection
    const btnCt = document.getElementById('btn-join-ct');
    const btnT = document.getElementById('btn-join-t');

    btnCt.addEventListener('click', () => {
      this.playerTeam = 'ct';
      btnCt.classList.add('active');
      btnT.classList.remove('active');
      if (this.lobby3d) this.lobby3d.setTeam('ct');
      this.updateLobbyBadge('ct');
    });

    btnT.addEventListener('click', () => {
      this.playerTeam = 't';
      btnT.classList.add('active');
      btnCt.classList.remove('active');
      if (this.lobby3d) this.lobby3d.setTeam('t');
      this.updateLobbyBadge('t');
    });

    // Settings
    const diffSelect = document.getElementById('select-difficulty');
    diffSelect.addEventListener('change', (e) => {
      this.difficulty = e.target.value;
      this.bots.forEach(b => b.setDifficulty(this.difficulty));
    });

    const botSelect = document.getElementById('select-bot-count');
    botSelect.addEventListener('change', (e) => {
      this.botCount = parseInt(e.target.value);
    });

    const sensSlider = document.getElementById('range-sensitivity');
    const sensVal = document.getElementById('sens-val');
    sensSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      this.player.mouseSensitivity = val;
      sensVal.textContent = val.toFixed(1);
    });

    const volSlider = document.getElementById('range-volume');
    const volVal = document.getElementById('vol-val');
    volSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      window.csAudio.setVolume(val);
      volVal.textContent = Math.round(val * 100) + '%';
    });

    // Start / Resume / Restart buttons
    this.btnStart = document.getElementById('btn-start-game');
    this.btnRestart = document.getElementById('btn-restart-game');

    this.btnStart.addEventListener('click', () => {
      window.csAudio.init();
      window.csAudio.resume();

      if (!this.isGameStarted) {
        this.startNewMatch();
      } else {
        this.resumeMatch();
      }
    });

    if (this.btnRestart) {
      this.btnRestart.addEventListener('click', () => {
        window.csAudio.init();
        window.csAudio.resume();
        this.startNewMatch();
      });
    }

    // Re-lock pointer when clicking on canvas during gameplay
    this.container.addEventListener('click', () => {
      if (this.isGameStarted && !this.isMenuOpen() && !this.isBuyMenuOpen && (!this.player || !this.player.isDead)) {
        this.requestPointerLock();
      }
    });

    // Death Overlay interactive buttons
    const btnRespawn = document.getElementById('btn-respawn');
    if (btnRespawn) {
      btnRespawn.addEventListener('click', () => {
        this.respawnPlayer();
      });
    }

    // Buy Menu Items Click
    document.querySelectorAll('.buy-item-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemType = btn.getAttribute('data-weapon');
        const cost = parseInt(btn.getAttribute('data-cost'));
        this.buyItem(itemType, cost);
      });
    });

    // Close Buy Menu Button
    document.getElementById('btn-close-buy').addEventListener('click', () => {
      this.toggleBuyMenu(false);
    });

    // Character Skin Selector (Minecraft Steve / Creeper / Diamond / CS Classic)
    const charSkinSelect = document.getElementById('select-char-skin');
    if (charSkinSelect) {
      charSkinSelect.addEventListener('change', (e) => {
        window.CHARACTER_SKIN_SELECTION = e.target.value;
        if (this.player && this.player.currentSlot) {
          this.player.selectSlot(this.player.currentSlot);
        }
        // Update bots with chosen character theme
        this.bots.forEach(b => {
          if (b.meshGroup) {
            b.scene.remove(b.meshGroup);
            b.meshGroup = new THREE.Group();
            b.limbs = {};
            b.buildCharacterMesh();
            b.scene.add(b.meshGroup);
          }
        });
      });
    }

    // Reticle Selector
    const reticleSelect = document.getElementById('select-reticle');
    if (reticleSelect) {
      reticleSelect.addEventListener('change', (e) => {
        window.ACTIVE_RETICLE_STYLE = e.target.value;
        if (this.player) {
          this.player.activeReticle = e.target.value;
          this.player.applyReticleClass(e.target.value);
        }
      });
    }

    // Weapon Skins Selectors
    const bindSkinSelector = (elemId, weaponKey) => {
      const el = document.getElementById(elemId);
      if (el) {
        el.addEventListener('change', (e) => {
          if (!window.WEAPON_SKIN_SELECTION) window.WEAPON_SKIN_SELECTION = {};
          window.WEAPON_SKIN_SELECTION[weaponKey] = e.target.value;
          if (this.player && this.player.currentWeapon && this.player.currentWeapon.id === weaponKey) {
            this.player.selectSlot(this.player.currentSlot);
          }
        });
      }
    };

    bindSkinSelector('select-awp-skin', 'awp');
    bindSkinSelector('select-ak-skin', 'ak47');
    bindSkinSelector('select-m4-skin', 'm4a1');
    bindSkinSelector('select-deagle-skin', 'deagle');
    bindSkinSelector('select-knife-skin', 'knife');
    bindSkinSelector('select-scout-skin', 'scout');

    // Audio feedback on hover & click for all menu buttons, options and items
    const attachAudioFeedback = (selector) => {
      document.querySelectorAll(selector).forEach(el => {
        el.addEventListener('mouseenter', () => {
          if (window.csAudio && window.csAudio.playMenuHover) {
            window.csAudio.playMenuHover();
          }
        });
        el.addEventListener('click', () => {
          if (window.csAudio && window.csAudio.playMenuClick) {
            window.csAudio.playMenuClick();
          }
        });
      });
    };
    attachAudioFeedback('button, .team-btn, .buy-item-btn, .death-action-btn, select');
  }

  requestPointerLock() {
    try {
      const el = this.renderer.domElement;
      if (document.pointerLockElement !== el) {
        const promise = el.requestPointerLock();
        if (promise && promise.catch) {
          promise.catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Pointer lock failed:', e);
    }
  }

  showMenuOverlay(show) {
    const overlay = document.getElementById('menu-overlay');
    if (!overlay) return;
    if (show) {
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
    }
  }

  isMenuOpen() {
    const overlay = document.getElementById('menu-overlay');
    return Boolean(overlay && !overlay.classList.contains('hidden'));
  }

  resumeMatch() {
    this.isPaused = false;
    this.showMenuOverlay(false);
    this.requestPointerLock();
  }

  pauseGame() {
    if (!this.isGameStarted || this.isRoundOver) return;
    this.isPaused = true;
    this.showMenuOverlay(true);
    if (this.btnStart) {
      this.btnStart.textContent = 'ПРОДОЛЖИТЬ (RESUME)';
    }
    if (this.btnRestart) {
      this.btnRestart.classList.remove('hidden');
    }
  }

  togglePause() {
    if (!this.isGameStarted) return;
    if (this.isPaused || this.isMenuOpen()) {
      this.resumeMatch();
    } else {
      this.pauseGame();
    }
  }

  onPointerLockChange(isLocked, wasLocked) {
    if (isLocked) {
      this.showMenuOverlay(false);
      this.isPaused = false;
      if (this.btnStart) {
        this.btnStart.textContent = 'ПРОДОЛЖИТЬ (RESUME)';
      }
      if (this.btnRestart) {
        this.btnRestart.classList.remove('hidden');
      }
    } else {
      // Pointer lock was released: only pause if match is active, player is alive, and buy menu not open
      if (this.isGameStarted && wasLocked && !this.isRoundOver && !this.isBuyMenuOpen && (!this.player || !this.player.isDead)) {
        this.pauseGame();
      }
    }
  }

  toggleBuyMenu(explicitState = null) {
    const buyMenu = document.getElementById('buy-menu');
    const isHidden = buyMenu.classList.contains('hidden');
    const shouldShow = explicitState !== null ? explicitState : isHidden;

    if (shouldShow) {
      if (this.player.isDead || !this.isGameStarted || this.isPaused) return;
      this.isBuyMenuOpen = true;
      document.exitPointerLock();
      buyMenu.classList.remove('hidden');
      document.getElementById('buy-current-money').textContent = `$${this.player.money}`;
    } else {
      this.isBuyMenuOpen = false;
      buyMenu.classList.add('hidden');
      if (this.isGameStarted && !this.isPaused) {
        this.requestPointerLock();
      }
    }
  }

  buyItem(itemId, cost) {
    if (this.player.money < cost) {
      this.showRadioSubtitle('Недостаточно денег для покупки!');
      window.csAudio.playMechanicalClick(0.5, 300);
      return;
    }

    // Process purchase
    let bought = false;
    if (itemId === 'armor') {
      if (this.player.armor >= 100) return;
      this.player.armor = 100;
      this.player.hasHelmet = true;
      bought = true;
    } else if (itemId === 'defusekit') {
      this.player.hasDefuseKit = true;
      bought = true;
    } else if (itemId === 'ammo') {
      if (this.player.currentWeapon && this.player.currentWeapon.clipSize > 0) {
        this.player.currentWeapon.reserve = this.player.currentWeapon.maxAmmo;
        bought = true;
      }
    } else if (window.WEAPONS_DATA[itemId]) {
      const wData = window.WEAPONS_DATA[itemId];
      this.player.inventory[wData.slot] = {
        ...wData,
        currentClip: wData.clipSize,
        reserve: wData.maxAmmo
      };
      this.player.selectSlot(wData.slot);
      bought = true;
    }

    if (bought) {
      this.player.money -= cost;
      window.csAudio.playMechanicalClick(1.4, 800);
      document.getElementById('buy-current-money').textContent = `$${this.player.money}`;
      this.player.updateHUD();
    }
  }

  showScoreboard(show) {
    const sb = document.getElementById('scoreboard');
    if (show) {
      this.updateScoreboardContent();
      sb.classList.remove('hidden');
    } else {
      sb.classList.add('hidden');
    }
  }

  updateScoreboardContent() {
    document.getElementById('sb-ct-rounds').textContent = `${this.scoreCT} ПОБЕД`;
    document.getElementById('sb-t-rounds').textContent = `${this.scoreT} ПОБЕД`;

    const ctBody = document.getElementById('sb-ct-body');
    const tBody = document.getElementById('sb-t-body');
    ctBody.innerHTML = '';
    tBody.innerHTML = '';

    const addRow = (tbody, name, kills, deaths, isDead, isPlayer) => {
      const tr = document.createElement('tr');
      if (isPlayer) tr.classList.add('is-player');
      if (isDead) tr.classList.add('is-dead');
      tr.innerHTML = `<td>${name}</td><td>${kills}</td><td>${deaths}</td><td>${isDead ? 'Мёртв' : 'Жив'}</td>`;
      tbody.appendChild(tr);
    };

    // Add player
    if (this.player.team === 'ct') {
      addRow(ctBody, this.player.name, this.player.kills, this.player.deaths, this.player.isDead, true);
    } else {
      addRow(tBody, this.player.name, this.player.kills, this.player.deaths, this.player.isDead, true);
    }

    // Add bots
    this.bots.forEach(b => {
      const targetBody = b.team === 'ct' ? ctBody : tBody;
      addRow(targetBody, b.name, b.kills, b.deaths, b.isDead, false);
    });
  }

  startNewMatch() {
    this.isGameStarted = true;
    this.isPaused = false;
    this.scoreCT = 0;
    this.scoreT = 0;
    document.getElementById('score-ct').textContent = '0';
    document.getElementById('score-t').textContent = '0';
    this.setupBots();
    this.startRound();
    this.showMenuOverlay(false);
    this.requestPointerLock();

    if (this.btnStart) {
      this.btnStart.textContent = 'ПРОДОЛЖИТЬ (RESUME)';
    }
    if (this.btnRestart) {
      this.btnRestart.classList.remove('hidden');
    }
  }

  setupBots() {
    // Remove existing bots from scene
    this.bots.forEach(b => {
      if (b.meshGroup) this.scene.remove(b.meshGroup);
    });
    this.bots = [];

    // Strictly 1 vs 5 mode: 0 friendly bots, exactly 5 enemy bots
    const enemyTeam = (this.playerTeam === 'ct' ? 't' : 'ct');
    const botNamesT = ['Phoenix_Leader', 'Desert_Fox', 'Anarchist', 'Rebel_Strike', 'Guerilla_Elite'];
    const botNamesCT = ['Seal_Alpha', 'Ghost_Rider', 'Bravo_Six', 'Viper_SAS', 'GSG9_Sniper'];
    const botNames = (enemyTeam === 't' ? botNamesT : botNamesCT);

    for (let i = 0; i < 5; i++) {
      const name = botNames[i % botNames.length] + ` [BOT ${i + 1}]`;
      const bot = new window.CSBot(`${enemyTeam}_${i}`, name, enemyTeam, this.scene, this.map);
      bot.setDifficulty(this.difficulty);
      this.bots.push(bot);
    }
  }

  startRound() {
    this.isRoundOver = false;
    this.isBombPlanted = false;
    this.isBombDefused = false;
    this.roundTimer = this.roundTimeMax;
    this.bombTimer = 45;

    this.hideDeathOverlay();
    this.spectatingBot = null;
    this.spectatingBotIndex = 0;

    document.getElementById('c4-indicator').classList.add('hidden');
    document.getElementById('announcement-banner').classList.add('hidden');

    if (this.plantedBombMesh) {
      this.scene.remove(this.plantedBombMesh);
      this.plantedBombMesh = null;
    }
    this.plantedBombPos = null;

    if (this.droppedBombMesh) {
      this.scene.remove(this.droppedBombMesh);
      this.droppedBombMesh = null;
    }
    this.droppedBombPos = null;

    // Spawn Player (sole warrior on their team)
    this.player.setTeam(this.playerTeam);
    const playerSpawnList = this.playerTeam === 'ct' ? this.map.spawnPoints.ct : this.map.spawnPoints.t;
    const pSpawn = (playerSpawnList && playerSpawnList.length > 0) ? playerSpawnList[0] : { x: 0, z: 0 };
    this.player.spawn(pSpawn);

    // Spawn all 5 Enemy Bots
    const enemySpawnList = this.playerTeam === 'ct' ? this.map.spawnPoints.t : this.map.spawnPoints.ct;
    let c4Given = false;
    this.bots.forEach((bot, idx) => {
      bot.hasC4 = false;
      const sp = (enemySpawnList && enemySpawnList.length > 0) ? enemySpawnList[idx % enemySpawnList.length] : { x: 0, z: 0 };
      bot.spawn(sp);
      if (!c4Given && bot.team === 't' && this.playerTeam === 'ct') {
        bot.hasC4 = true;
        c4Given = true;
      }
    });

    // If player is T, give C4 to player!
    if (this.playerTeam === 't') {
      this.player.inventory[5] = { ...window.WEAPONS_DATA.c4, currentClip: 1, reserve: 0 };
    } else {
      delete this.player.inventory[5];
    }
    this.player.updateHUD();

    window.csAudio.speakRadio('Go, go, go!');
    this.showRadioSubtitle('Режим «1 против 5»: вы один против 5 врагов! В бой!');
  }

  plantBomb(position, siteLetter, planter) {
    if (this.isBombPlanted) return;
    this.isBombPlanted = true;
    this.bombSitePlanted = siteLetter;

    // Ground elevation check: do not bury the bomb underneath wooden boardwalks or decks!
    const groundY = (this.map && typeof this.map.getGroundHeight === 'function')
      ? this.map.getGroundHeight(position.x, position.z, position.y)
      : (position.y || 0);

    this.plantedBombPos = new THREE.Vector3(position.x, groundY + 0.08, position.z);

    // Clean up any dropped bomb mesh
    if (this.droppedBombMesh) {
      this.scene.remove(this.droppedBombMesh);
      this.droppedBombMesh = null;
    }
    this.droppedBombPos = null;

    // Build 3D planted C4 mesh on ground
    const bombGeom = new THREE.BoxGeometry(0.32, 0.16, 0.42);
    const bombMat = new THREE.MeshStandardMaterial({ color: 0x4a5441, roughness: 0.65 });
    this.plantedBombMesh = new THREE.Mesh(bombGeom, bombMat);
    this.plantedBombMesh.position.copy(this.plantedBombPos);
    this.scene.add(this.plantedBombMesh);

    // Red LED blinker
    const ledGeom = new THREE.SphereGeometry(0.045, 8, 8);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const led = new THREE.Mesh(ledGeom, ledMat);
    led.position.set(0, 0.09, 0);
    this.plantedBombMesh.add(led);

    document.getElementById('c4-indicator').classList.remove('hidden');
    window.csAudio.speakRadio('The bomb has been planted!');
    this.showRadioSubtitle(`Бомба заложена на точке [${siteLetter}]!`);

    // Alert CT bots to rush bomb site to defuse
    this.bots.filter(b => b.team === 'ct' && !b.isDead).forEach(b => {
      b.state = 'DEFUSE';
    });

    // Alert T bots to guard the planted bomb
    this.bots.filter(b => b.team === 't' && !b.isDead).forEach(b => {
      b.state = 'GUARD_BOMB';
    });
  }

  dropBomb(position) {
    if (this.isBombPlanted || this.isBombDefused) return;

    if (this.droppedBombMesh) {
      this.scene.remove(this.droppedBombMesh);
      this.droppedBombMesh = null;
    }

    const groundY = (this.map && typeof this.map.getGroundHeight === 'function')
      ? this.map.getGroundHeight(position.x, position.z, position.y)
      : (position.y || 0);

    const pos = new THREE.Vector3(position.x, groundY + 0.08, position.z);
    this.droppedBombPos = pos;

    const bombGeom = new THREE.BoxGeometry(0.32, 0.16, 0.42);
    const bombMat = new THREE.MeshStandardMaterial({ color: 0x56604c, roughness: 0.7 });
    this.droppedBombMesh = new THREE.Mesh(bombGeom, bombMat);
    this.droppedBombMesh.position.copy(pos);

    // Blinking orange/yellow LED
    const ledGeom = new THREE.SphereGeometry(0.045, 8, 8);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const led = new THREE.Mesh(ledGeom, ledMat);
    led.position.set(0, 0.09, 0);
    this.droppedBombMesh.add(led);

    this.scene.add(this.droppedBombMesh);

    window.csAudio.speakRadio('Bomb has been dropped!');
    this.showRadioSubtitle('Бомба потеряна! Заберите C4!');
  }

  pickUpBomb(carrier) {
    if (!this.droppedBombPos || this.isBombPlanted) return;

    if (this.droppedBombMesh) {
      this.scene.remove(this.droppedBombMesh);
      this.droppedBombMesh = null;
    }
    this.droppedBombPos = null;

    if (carrier === this.player) {
      this.player.inventory[5] = { ...window.WEAPONS_DATA.c4, currentClip: 1, reserve: 0 };
      this.player.updateHUD();
      window.csAudio.playMechanicalClick(1.2, 800);
      window.csAudio.speakRadio('I have the bomb!');
      this.showRadioSubtitle('Вы подобрали бомбу (C4)!');
    } else if (carrier && carrier.isBot) {
      carrier.hasC4 = true;
      window.csAudio.playMechanicalClick(1.2, 800);
      this.showRadioSubtitle(`${carrier.name} подобрал бомбу!`);
    }
  }

  defuseBomb(defuser) {
    if (!this.isBombPlanted || this.isBombDefused) return;
    this.isBombDefused = true;
    document.getElementById('c4-indicator').classList.add('hidden');

    window.csAudio.playMechanicalClick(1.8, 1200);
    window.csAudio.speakRadio('Bomb has been defused!');
    this.showRadioSubtitle('Бомба успешно обезврежена!');

    if (defuser === this.player) {
      this.player.money = Math.min(16000, this.player.money + 300);
      this.player.updateHUD();
    }

    this.endRound('ct', 'Бомба обезврежена');
  }

  detonateBomb() {
    if (this.isBombDefused || !this.isBombPlanted) return;
    window.csAudio.playExplosion();

    // Shockwave explosion flash
    const overlay = document.getElementById('damage-overlay');
    overlay.style.backgroundColor = 'rgba(255, 180, 50, 0.9)';
    overlay.style.opacity = '1';
    setTimeout(() => {
      overlay.style.opacity = '0';
      overlay.style.backgroundColor = '';
    }, 800);

    // Damage all entities near explosion
    const killRadius = 35;
    if (this.player && !this.player.isDead && this.player.position && this.plantedBombPos) {
      if (this.player.position.distanceTo(this.plantedBombPos) < killRadius) {
        this.player.takeDamage(500, false, null);
      }
    }
    this.bots.forEach(b => {
      if (!b.isDead && b.position && this.plantedBombPos && b.position.distanceTo(this.plantedBombPos) < killRadius) {
        b.takeDamage(500, false, null);
      }
    });

    this.endRound('t', 'Точка подорвана');
  }

  handlePlayerDeath(player, attacker, isHeadshot) {
    const killerName = attacker ? attacker.name : 'Враг';
    const weaponName = attacker && attacker.currentWeapon ? attacker.currentWeapon.name : 'Винтовка';
    this.addKillfeed(killerName, attacker ? attacker.team : 't', player.name, player.team, weaponName, isHeadshot);

    // If player had C4, drop it safely on the ground!
    if (player.inventory && player.inventory[5]) {
      delete player.inventory[5];
      player.updateHUD();
      if (player.position) {
        this.dropBomb(player.position.clone());
      }
    }

    // Reset all enemy bots targeting player so they stop shooting into the void
    this.bots.forEach(b => {
      if (b.currentTarget === player) {
        b.currentTarget = null;
        b.burstShotsRemaining = 0;
        b.state = 'PATROL';
        if (b.pickNextPatrolDestination) b.pickNextPatrolDestination();
      }
    });

    // Show death and spectator controls overlay
    this.showDeathOverlay(killerName, weaponName, isHeadshot);
  }

  handleBotDeath(bot, attacker, isHeadshot) {
    const killerName = attacker ? attacker.name : 'World';
    const killerTeam = attacker ? attacker.team : (bot.team === 'ct' ? 't' : 'ct');
    const weaponName = attacker && (attacker.currentWeapon || attacker.weapon) ? (attacker.currentWeapon?.name || attacker.weapon?.name) : 'CV-47';

    this.addKillfeed(killerName, killerTeam, bot.name, bot.team, weaponName, isHeadshot);

    if (attacker && attacker === this.player) {
      this.player.kills++;
      this.player.money = Math.min(16000, this.player.money + 300);
      this.player.updateHUD();
      if (isHeadshot) {
        this.showRadioSubtitle('В ГОЛОВУ! (HEADSHOT) +$300');
        if (window.csAudio && window.csAudio.playHeadshot) {
          window.csAudio.playHeadshot();
        }
      } else {
        this.showRadioSubtitle('+1 ФРАГ! +$300');
      }
    } else if (attacker && attacker.isBot) {
      attacker.kills++;
    }

    // 1 VS 5 INFINITE RESPAWN SYSTEM:
    // Exactly 3 seconds after death, this bot respawns at a random enemy spawn point with randomized loadout
    setTimeout(() => {
      if (this.isGameStarted) {
        this.respawnBot(bot);
      }
    }, 3000);
  }

  respawnBot(bot) {
    if (!this.isGameStarted || !bot) return;
    const enemySpawnList = this.playerTeam === 'ct' ? this.map.spawnPoints.t : this.map.spawnPoints.ct;
    const sp = (enemySpawnList && enemySpawnList.length > 0)
      ? enemySpawnList[Math.floor(Math.random() * enemySpawnList.length)]
      : { x: 0, z: 0 };

    // Randomized weapons: AK-47, Galil, Deagle, M4A1, Scout
    const weapons = ['ak47', 'galil', 'deagle', 'm4a1', 'scout'];
    const chosenWeapon = weapons[Math.floor(Math.random() * weapons.length)];

    bot.respawn(sp, chosenWeapon);
  }

  addKillfeed(killer, killerTeam, victim, victimTeam, weapon, isHeadshot) {
    const feed = document.getElementById('killfeed');
    const row = document.createElement('div');
    row.classList.add('kill-row');
    row.innerHTML = `
      <span class="kill-killer ${killerTeam}">${killer}</span>
      <span class="kill-weapon">[${weapon}]</span>
      ${isHeadshot ? '<span class="kill-hs">(HS)</span>' : ''}
      <span class="kill-victim ${victimTeam}">${victim}</span>
    `;
    feed.appendChild(row);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (row.parentNode) row.parentNode.removeChild(row);
    }, 5000);
  }

  checkRoundWinConditions() {
    if (this.isRoundOver || !this.isGameStarted) return;

    const ctAlive = (this.playerTeam === 'ct' && !this.player.isDead) || this.bots.some(b => b.team === 'ct' && !b.isDead);
    const tAlive = (this.playerTeam === 't' && !this.player.isDead) || this.bots.some(b => b.team === 't' && !b.isDead);

    if (!tAlive) {
      if (this.isBombPlanted && !this.isBombDefused) {
        // Round continues until bomb defused or exploded!
      } else {
        this.endRound('ct', 'Все террористы нейтрализованы');
      }
    } else if (!ctAlive) {
      this.endRound('t', 'Все спецназовцы уничтожены');
    }
  }

  endRound(winningTeam, reason) {
    if (this.isRoundOver) return;
    this.isRoundOver = true;

    if (winningTeam === 'ct') {
      this.scoreCT++;
      document.getElementById('score-ct').textContent = this.scoreCT;
      window.csAudio.speakRadio('Counter-Terrorists Win!');
      this.showAnnouncement('COUNTER-TERRORISTS WIN', '#4a90e2');
      if (this.playerTeam === 'ct') this.player.money = Math.min(16000, this.player.money + 3250);
    } else {
      this.scoreT++;
      document.getElementById('score-t').textContent = this.scoreT;
      window.csAudio.speakRadio('Terrorists Win!');
      this.showAnnouncement('TERRORISTS WIN', '#e74c3c');
      if (this.playerTeam === 't') this.player.money = Math.min(16000, this.player.money + 3250);
    }

    this.player.updateHUD();

    // Restart next round in 4.5 seconds
    setTimeout(() => {
      if (this.isGameStarted) {
        this.startRound();
      }
    }, 4500);
  }

  showAnnouncement(text, color = '#ffaa00') {
    const banner = document.getElementById('announcement-banner');
    const label = document.getElementById('announcement-text');
    label.textContent = text;
    label.style.color = color;
    banner.classList.remove('hidden');
  }

  showRadioSubtitle(text) {
    const sub = document.getElementById('radio-subtitle');
    sub.textContent = text;
    sub.classList.remove('hidden');
    clearTimeout(this.subTimer);
    this.subTimer = setTimeout(() => {
      sub.classList.add('hidden');
    }, 3000);
  }

  // 3D Visual Effects: Blood & Bullet Decals
  createBloodSpurt(pos) {
    for (let i = 0; i < 12; i++) {
      const geom = new THREE.SphereGeometry(0.04, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color: 0x990000 });
      const p = new THREE.Mesh(geom, mat);
      p.position.copy(pos);
      p.userData = {
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          Math.random() * 3 + 1,
          (Math.random() - 0.5) * 4
        ),
        life: 0.6
      };
      this.scene.add(p);
      this.particles.push(p);
    }
  }

  createBulletDecal(pos, normal) {
    // Authentic CS 1.6 bullet impact decal
    const decalGeom = new THREE.PlaneGeometry(0.14, 0.14);
    const decalMat = new THREE.MeshBasicMaterial({
      color: 0x121212,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      transparent: true,
      opacity: 0.94
    });
    const mark = new THREE.Mesh(decalGeom, decalMat);
    mark.position.copy(pos).addScaledVector(normal, 0.012);
    mark.lookAt(pos.clone().add(normal));
    this.scene.add(mark);

    // Auto remove after 25s
    setTimeout(() => {
      this.scene.remove(mark);
    }, 25000);
  }

  // Sparkling orange ricochet debris on stone, metal, and wood
  createSparks(pos, normal) {
    const sparkCount = 7 + Math.floor(Math.random() * 5);
    for (let i = 0; i < sparkCount; i++) {
      const geom = new THREE.BoxGeometry(0.024, 0.024, 0.024);
      const mat = new THREE.MeshBasicMaterial({
        color: (Math.random() > 0.35 ? 0xffdd44 : 0xff6600),
        transparent: true,
        opacity: 1.0
      });
      const spark = new THREE.Mesh(geom, mat);
      spark.position.copy(pos).addScaledVector(normal, 0.02);

      const spread = new THREE.Vector3(
        (Math.random() - 0.5) * 4.2,
        (Math.random() - 0.5) * 4.2,
        (Math.random() - 0.5) * 4.2
      );
      const vel = normal.clone().multiplyScalar(Math.random() * 3.2 + 2.2).add(spread);

      spark.userData = {
        vel: vel,
        life: 0.28 + Math.random() * 0.14,
        initialLife: 0.42
      };
      this.scene.add(spark);
      this.particles.push(spark);
    }
  }

  // Expanding dust / smoke puff from bullet penetration impact
  createDustPuff(pos, normal) {
    const dustCount = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < dustCount; i++) {
      const geom = new THREE.SphereGeometry(0.05 + Math.random() * 0.03, 4, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xc4b59d,
        transparent: true,
        opacity: 0.65
      });
      const dust = new THREE.Mesh(geom, mat);
      dust.position.copy(pos).addScaledVector(normal, 0.02);

      const vel = normal.clone().multiplyScalar(Math.random() * 0.8 + 0.3).add(
        new THREE.Vector3((Math.random() - 0.5) * 1.0, Math.random() * 0.7, (Math.random() - 0.5) * 1.0)
      );

      dust.userData = {
        vel: vel,
        life: 0.42 + Math.random() * 0.18,
        initialLife: 0.55,
        isDust: true
      };
      this.scene.add(dust);
      this.particles.push(dust);
    }
  }

  // Glowing Bullet Tracer projectile beam (Player and Bots)
  createBulletTracer(fromPos, toPos) {
    const dir = new THREE.Vector3().subVectors(toPos, fromPos);
    const len = dir.length();
    if (len < 0.2) return;

    const geom = new THREE.CylinderGeometry(0.02, 0.02, len, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.95
    });
    const tracer = new THREE.Mesh(geom, mat);
    tracer.position.copy(fromPos).addScaledVector(dir, 0.5);
    tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());

    tracer.userData = { life: 0.08, initialLife: 0.08 };
    this.scene.add(tracer);
    this.tracers.push(tracer);
  }

  // Ocean Water Splash Effect (Droplets + Expanding Ripple Ring)
  createWaterSplash(pos) {
    // Water droplets spray
    for (let i = 0; i < 14; i++) {
      const geom = new THREE.SphereGeometry(0.045, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color: 0xccf2f4, transparent: true, opacity: 0.85 });
      const droplet = new THREE.Mesh(geom, mat);
      droplet.position.set(pos.x, 0.05, pos.z);
      droplet.userData = {
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 3.5,
          Math.random() * 3.8 + 1.8,
          (Math.random() - 0.5) * 3.5
        ),
        life: 0.55
      };
      this.scene.add(droplet);
      this.particles.push(droplet);
    }

    // Expanding water ripple ring
    const ringGeom = new THREE.RingGeometry(0.2, 0.45, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, 0.06, pos.z);
    ring.userData = { isRipple: true, life: 0.8, scaleSpeed: 3.2 };
    this.scene.add(ring);
    this.particles.push(ring);
  }

  // Directional Red Damage Indicator Arc on HUD
  showDamageIndicator(angle) {
    let ind = document.getElementById('damage-dir-indicator');
    if (!ind) {
      ind = document.createElement('div');
      ind.id = 'damage-dir-indicator';
      document.body.appendChild(ind);
    }

    const deg = THREE.MathUtils.radToDeg(angle);
    ind.style.transform = `translate(-50%, -50%) rotate(${deg}deg)`;
    ind.classList.remove('active');
    void ind.offsetWidth; // Force CSS reflow
    ind.classList.add('active');
  }

  // 2D Mini-Radar Rendering
  renderRadar() {
    const ctx = this.radarCtx;
    if (!ctx) return;
    const w = 160;
    const h = 160;
    ctx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;
    const scale = 1.35; // Map to radar scale

    const pPos = (this.player && this.player.position)
      ? this.player.position
      : (this.spectatingBot && this.spectatingBot.position ? this.spectatingBot.position : new THREE.Vector3(0, 0, 0));
    const pYaw = (this.player && typeof this.player.yaw === 'number')
      ? this.player.yaw
      : (this.spectatingBot && typeof this.spectatingBot.rotationY === 'number' ? this.spectatingBot.rotationY : 0);
    const pTeam = (this.player && this.player.team) ? this.player.team : this.playerTeam;

    ctx.save();
    ctx.translate(centerX, centerY);
    // Rotate radar with player or spectator yaw
    ctx.rotate(pYaw);

    // Draw Bomb Sites
    if (this.map && this.map.bombsiteA && this.map.bombsiteB) {
      const aX = (this.map.bombsiteA.x - pPos.x) * scale;
      const aZ = (this.map.bombsiteA.z - pPos.z) * scale;
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('A', aX, aZ);

      const bX = (this.map.bombsiteB.x - pPos.x) * scale;
      const bZ = (this.map.bombsiteB.z - pPos.z) * scale;
      ctx.fillText('B', bX, bZ);
    }

    // Draw Planted Bomb (blinking red / gold)
    if (this.isBombPlanted && this.plantedBombPos) {
      const pbx = (this.plantedBombPos.x - pPos.x) * scale;
      const pbz = (this.plantedBombPos.z - pPos.z) * scale;
      const blink = (Math.sin(Date.now() * 0.012) > 0);
      ctx.fillStyle = blink ? '#ff0033' : '#ffff00';
      ctx.beginPath();
      ctx.arc(pbx, pbz, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('💣', pbx - 6, pbz + 4);
    }

    // Draw Dropped Bomb (blinking orange / yellow)
    if (this.droppedBombPos && !this.isBombPlanted) {
      const dbx = (this.droppedBombPos.x - pPos.x) * scale;
      const dbz = (this.droppedBombPos.z - pPos.z) * scale;
      const blink = (Math.sin(Date.now() * 0.009) > 0);
      ctx.fillStyle = blink ? '#ff8800' : '#ffff33';
      ctx.beginPath();
      ctx.arc(dbx, dbz, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('C4', dbx - 6, dbz + 3);
    }

    // Draw Bots
    if (this.bots && Array.isArray(this.bots)) {
      this.bots.forEach(b => {
        if (!b || b.isDead || !b.position) return;
        const bx = (b.position.x - pPos.x) * scale;
        const bz = (b.position.z - pPos.z) * scale;

        if (b.team === pTeam) {
          // Teammates: bright green dot
          ctx.fillStyle = '#00ff66';
          ctx.beginPath();
          ctx.arc(bx, bz, 3.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Enemies: red dot if engaged or close
          ctx.fillStyle = '#ff2222';
          ctx.beginPath();
          ctx.arc(bx, bz, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    ctx.restore();

    // Player arrow in center (pointing forward)
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 6);
    ctx.lineTo(centerX - 5, centerY + 5);
    ctx.lineTo(centerX + 5, centerY + 5);
    ctx.closePath();
    ctx.fill();
  }

  // Main Loop
  animate() {
    requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);

    // If game has not started yet or is currently paused, render the CS:GO 3D Lobby
    if (!this.isGameStarted || this.isPaused) {
      if (this.lobby3d && !this.isGameStarted) {
        this.lobby3d.update(delta);
        this.lobby3d.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
      return;
    }

    // Round Timer countdown
    if (!this.isRoundOver) {
      if (this.isBombPlanted) {
        this.bombTimer -= delta;
        this.bombBeepTimer += delta;

        // Accelerate beep rate as countdown nears zero
        const beepInterval = Math.max(0.12, this.bombTimer / 38);
        if (this.bombBeepTimer >= beepInterval) {
          this.bombBeepTimer = 0;
          const pitch = 1100 + (45 - this.bombTimer) * 15;
          window.csAudio.playBombBeep(pitch);
        }

        if (this.bombTimer <= 0) {
          this.detonateBomb();
        }
      } else {
        this.roundTimer -= delta;
        if (this.roundTimer <= 0) {
          this.roundTimer = 0;
          this.endRound('ct', 'Время раунда истекло');
        }
      }

      // Update timer HUD
      const mins = Math.floor(this.roundTimer / 60);
      const secs = Math.floor(this.roundTimer % 60);
      document.getElementById('round-timer').textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // Update Player & Bots
    this.player.update(delta);
    this.bots.forEach(b => b.update(delta, this.player, this.bots));

    // Update Map (swaying palm leaves & animated ocean water)
    if (this.map && this.map.update) {
      this.map.update(delta);
    }

    // Ambient tropical beach audio (distant seagulls)
    this.ambientTimer += delta;
    if (this.ambientTimer > 11.0) {
      this.ambientTimer = 0;
      if (Math.random() > 0.4 && window.csAudio && window.csAudio.playSeagull) {
        window.csAudio.playSeagull();
      }
    }

    // Update Bullet Tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.userData.life -= delta;
      if (t.userData.life <= 0) {
        this.scene.remove(t);
        this.tracers.splice(i, 1);
      } else {
        t.material.opacity = (t.userData.life / t.userData.initialLife) * 0.95;
      }
    }

    // Update particles (blood spray & water splashes)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.userData.life -= delta;

      if (p.userData.isRipple) {
        // Expanding water ripple ring
        p.scale.x += delta * p.userData.scaleSpeed;
        p.scale.y += delta * p.userData.scaleSpeed;
        p.material.opacity = Math.max(0, p.userData.life * 0.85);
      } else if (p.userData.isDust) {
        // Dust cloud expansion and drag
        p.scale.multiplyScalar(1 + delta * 2.2);
        p.position.addScaledVector(p.userData.vel, delta);
        p.userData.vel.multiplyScalar(0.92);
        p.material.opacity = Math.max(0, (p.userData.life / p.userData.initialLife) * 0.65);
      } else {
        // Droplet / spark / blood physics
        p.userData.vel.y -= 13.0 * delta; // Gravity
        p.position.addScaledVector(p.userData.vel, delta);
        if (p.position.y < 0.04) p.position.y = 0.04;
        if (p.userData.initialLife) {
          p.material.opacity = Math.max(0, p.userData.life / p.userData.initialLife);
        }
      }

      if (p.userData.life <= 0) {
        this.scene.remove(p);
        this.particles.splice(i, 1);
      }
    }

    // Animate Planted and Dropped C4 LED beacons
    if (this.isBombPlanted && this.plantedBombMesh && this.plantedBombMesh.children[0]) {
      const led = this.plantedBombMesh.children[0];
      const isLit = (Math.sin(Date.now() * 0.016) > 0.15);
      led.material.color.setHex(isLit ? 0xff0000 : 0x330000);
    }
    if (this.droppedBombMesh && this.droppedBombMesh.children[0]) {
      const led = this.droppedBombMesh.children[0];
      const isLit = (Math.sin(Date.now() * 0.01) > 0);
      led.material.color.setHex(isLit ? 0xffaa00 : 0x332200);
    }

    // Render Radar
    this.renderRadar();

    // Render 3D Scene
    this.renderer.render(this.scene, this.camera);
  }

  // =========================================================================
  // DEATH, RESPAWN & BOT TAKEOVER (CS:GO / CS 1.6 AUTHENTIC SYSTEM)
  // =========================================================================
  showDeathOverlay(killer = 'Враг', weapon = 'Rifle', isHeadshot = false) {
    const overlay = document.getElementById('death-overlay');
    if (!overlay) return;

    const killerInfo = document.getElementById('death-killer-info');
    if (killerInfo) {
      killerInfo.textContent = `Вас уничтожил: ${killer} [${weapon}]${isHeadshot ? ' (В ГОЛОВУ)' : ''}`;
    }

    this.spectatingBot = null;
    this.spectatingBotIndex = -1;
    this.updateDeathOverlayUI();
    overlay.classList.remove('hidden');

    // Free mouse cursor so player can click Respawn button with mouse
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    // 3-second auto respawn countdown
    this.deathCountdownSec = 3;
    this.updateRespawnCountdownUI();
    if (this.deathCountdownInterval) {
      clearInterval(this.deathCountdownInterval);
    }
    this.deathCountdownInterval = setInterval(() => {
      this.deathCountdownSec--;
      this.updateRespawnCountdownUI();
      if (this.deathCountdownSec <= 0) {
        clearInterval(this.deathCountdownInterval);
        this.deathCountdownInterval = null;
        this.respawnPlayer();
      }
    }, 1000);
  }

  updateRespawnCountdownUI() {
    const cdEl = document.getElementById('respawn-countdown-val');
    if (cdEl) {
      cdEl.textContent = Math.max(0, this.deathCountdownSec);
    }
  }

  hideDeathOverlay() {
    if (this.deathCountdownInterval) {
      clearInterval(this.deathCountdownInterval);
      this.deathCountdownInterval = null;
    }
    const overlay = document.getElementById('death-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  updateDeathOverlayUI() {
    const specTargetName = document.getElementById('spectator-target-name');
    if (specTargetName) {
      specTargetName.textContent = 'Режим «1 против 5» • Нажмите [ПРОБЕЛ] или кнопку для мгновенного возрождения';
    }
  }

  cycleSpectator(dir = 1) {
    if (!this.player || !this.player.isDead) return;
    const aliveAllies = this.bots.filter(b => b.team === this.playerTeam && !b.isDead);
    if (aliveAllies.length === 0) {
      this.spectatingBot = null;
      this.updateDeathOverlayUI();
      return;
    }

    if (!this.spectatingBot) {
      this.spectatingBotIndex = 0;
    } else {
      let curr = aliveAllies.indexOf(this.spectatingBot);
      if (curr === -1) curr = 0;
      this.spectatingBotIndex = (curr + dir + aliveAllies.length) % aliveAllies.length;
    }
    this.spectatingBot = aliveAllies[this.spectatingBotIndex];
    this.updateDeathOverlayUI();

    if (window.csAudio && window.csAudio.playMechanicalClick) {
      window.csAudio.playMechanicalClick(1.1, 750);
    }
  }

  respawnPlayer() {
    if (!this.player || !this.player.isDead) return;

    if (this.deathCountdownInterval) {
      clearInterval(this.deathCountdownInterval);
      this.deathCountdownInterval = null;
    }

    // Mid-round instant respawn
    const spawnList = this.playerTeam === 'ct' ? this.map.spawnPoints.ct : this.map.spawnPoints.t;
    const spawnPoint = (spawnList && spawnList.length > 0)
      ? spawnList[Math.floor(Math.random() * spawnList.length)]
      : { x: 0, z: 0 };

    this.hideDeathOverlay();
    this.spectatingBot = null;

    // Respawns player: resets position, restores 100 HP, 100 armor, ammo, and grants 2s spawn invulnerability
    this.player.respawn(spawnPoint);

    // Reset any bots that were targeting the dead player
    this.bots.forEach(b => {
      if (b.currentTarget === this.player) {
        b.currentTarget = null;
        b.burstShotsRemaining = 0;
        b.state = 'PATROL';
        if (b.pickNextPatrolDestination) b.pickNextPatrolDestination();
      }
    });

    this.requestPointerLock();
    this.showAnnouncement('ВОЗРОЖДЕНИЕ! ЩИТ СПАВНА: 2 СЕК', '#00ff66');
  }

  takeoverAlliedBot() {
    if (!this.player || !this.player.isDead) return;
    this.respawnPlayer();
  }
}

// Bootstrap Game on Window Load
window.addEventListener('DOMContentLoaded', () => {
  window.csGame = new CSGame();
});
