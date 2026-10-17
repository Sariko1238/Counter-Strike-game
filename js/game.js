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

    // --- PERFORMANCE: cached DOM refs used every frame ---
    this._hudTimer = document.getElementById('round-timer');
    this._radarFrameSkip = 0; // render radar at ~20 fps, not 60

    // --- PERFORMANCE: shared geometries/materials for particle pools ---
    this._bloodGeoms = [
      new THREE.SphereGeometry(0.03, 4, 4),
      new THREE.SphereGeometry(0.055, 4, 4),
      new THREE.SphereGeometry(0.07, 4, 4)
    ];
    this._bloodMats = [
      new THREE.MeshBasicMaterial({ color: 0x8b0000 }),
      new THREE.MeshBasicMaterial({ color: 0xaa0000 }),
      new THREE.MeshBasicMaterial({ color: 0xcc1111 })
    ];
    this._sparkGeom = new THREE.BoxGeometry(0.024, 0.024, 0.024);
    this._sparkMats = [
      new THREE.MeshBasicMaterial({ color: 0xffdd44 }),
      new THREE.MeshBasicMaterial({ color: 0xff6600 })
    ];
    this._dustGeom  = new THREE.SphereGeometry(0.065, 4, 4);
    this._dustMat   = new THREE.MeshBasicMaterial({ color: 0xc4b59d, transparent: true, opacity: 0.65 });
    this._mistGeom  = new THREE.SphereGeometry(0.075, 4, 4);
    this._mistMat   = new THREE.MeshBasicMaterial({ color: 0x660000, transparent: true, opacity: 0.35 });
    this._waterDropletGeom = new THREE.SphereGeometry(0.045, 4, 4);
    this._waterDropletMat = new THREE.MeshBasicMaterial({ color: 0xccf2f4, transparent: true, opacity: 0.85 });
    this._waterRingGeom = new THREE.RingGeometry(0.2, 0.45, 16);
    this._waterRingMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, side: THREE.DoubleSide });
    this._tracerMat = new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.95 });
    this._tracerGeomCache = {}; // keyed by rounded length

    // Decals bounded ring-buffer (max 40 decals to prevent scene graph bloat)
    this._decals = [];
    this._maxDecals = 40;
    this._decalGeom = new THREE.PlaneGeometry(0.14, 0.14);
    this._decalMat = new THREE.MeshBasicMaterial({
      color: 0x121212,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      transparent: true,
      opacity: 0.94
    });

    // Blood pools bounded array (max 8 pools in scene)
    this._bloodPools = [];
    this._maxBloodPools = 8;

    // pending PointLights to remove (avoids setTimeout closures)
    this._pendingFlashes = [];

    this.initThree();
    this.initUI();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initThree() {
    this.selectedMap = localStorage.getItem('cs_game_map') || 'dust2';

    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 350);
    this.scene.add(this.camera);

    // 3. WebGL Renderer with Realistic 3D Shaders & Filmic Tone Mapping
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Photorealistic ACES Filmic tone mapping & sRGB color pipeline
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.physicallyCorrectLights = true;
    this.container.appendChild(this.renderer.domElement);

    // 4. Map & Player (loads selected map: de_minecraft, de_dust2 or de_beach)
    this.map = null;
    this.loadMap(this.selectedMap, false);

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

  loadMap(mapName, rebuild = true) {
    if (this.map && this.map.destroy) {
      try {
        this.map.destroy();
      } catch (err) {
        console.warn('[CS1.6] Error destroying previous map:', err);
      }
    }

    let norm = (mapName || 'dust2').toLowerCase().trim();
    if (norm.startsWith('de_')) norm = norm.substring(3);
    else if (norm.startsWith('cs_')) norm = norm.substring(3);
    else if (norm.startsWith('fy_')) norm = norm.substring(3);

    this.selectedMap = norm;
    localStorage.setItem('cs_game_map', norm);

    try {
      switch (norm) {
        case 'minecraft':
          this.scene.fog = new THREE.FogExp2(0x8fc5ff, 0.0035);
          this.map = new window.CSMinecraftMap(this.scene);
          break;
        case 'beach':
          this.scene.fog = new THREE.FogExp2(0xa2d2ff, 0.0030);
          this.map = new window.CSBeachMap(this.scene);
          break;
        case 'pool_day':
          this.scene.fog = new THREE.FogExp2(0x60b0ff, 0.0022);
          this.map = new window.CSPoolDayMap(this.scene);
          break;
        case 'inferno':
          this.scene.fog = new THREE.FogExp2(0x3a251b, 0.0032);
          this.map = new window.CSInfernoMap(this.scene);
          break;
        case 'assault':
          this.scene.fog = new THREE.FogExp2(0x1a2129, 0.0032);
          this.map = new window.CSAssaultMap(this.scene);
          break;
        case 'nuke':
          this.scene.fog = new THREE.FogExp2(0x283038, 0.0030);
          this.map = new window.CSNukeMap(this.scene);
          break;
        case 'awp_india':
          this.scene.fog = new THREE.FogExp2(0xc89e65, 0.0032);
          this.map = new window.CSAwpIndiaMap(this.scene);
          break;
        case 'universal':
          this.scene.fog = new THREE.FogExp2(0x151b24, 0.0032);
          this.map = new window.CSUniversalMap(this.scene);
          break;
        case 'dust2':
        default:
          this.scene.fog = new THREE.FogExp2(0x3a7bd5, 0.0016);
          this.map = new window.CSDust2Map(this.scene);
          break;
      }
      this.map.buildMap();
    } catch (err) {
      console.error(`[CS1.6] Error building map "${norm}", falling back to Dust II:`, err);
      this.scene.fog = new THREE.FogExp2(0x3a7bd5, 0.0016);
      this.map = new window.CSDust2Map(this.scene);
      this.map.buildMap();
    }

    // Update real map name in HUD (top-left) & Scoreboard
    const hudMapNameEl = document.getElementById('hud-map-name');
    const titles = {
      minecraft: 'DE_MINECRAFT • 1 VS 5',
      beach: 'DE_BEACH • 1 VS 5',
      pool_day: 'FY_POOL_DAY • DEATHMATCH',
      inferno: 'DE_INFERNO • 1 VS 5',
      assault: 'CS_ASSAULT • HOSTAGE RESCUE',
      nuke: 'DE_NUKE • 1 VS 5',
      awp_india: 'AWP_INDIA • SNIPER DUEL',
      universal: 'DE_UNIVERSAL • 1 VS 5',
      dust2: 'DE_DUST2 • 1 VS 5'
    };
    const titleText = titles[norm] || `${norm.toUpperCase()} • 1 VS 5`;
    if (hudMapNameEl) {
      hudMapNameEl.textContent = titleText;
    }

    const sbTitle = document.getElementById('sb-map-title');
    if (sbTitle) {
      sbTitle.textContent = titleText.replace('•', '-');
    }

    if (rebuild) {
      if (this.player) {
        this.player.map = this.map;
        // Invalidate cached map mesh list so next shot rebuilds it
        if (this.player.invalidateMapMeshCache) this.player.invalidateMapMeshCache();
        const playerSpawnList = this.playerTeam === 'ct' ? this.map.spawnPoints.ct : this.map.spawnPoints.t;
        const pSpawn = (playerSpawnList && playerSpawnList.length > 0) ? playerSpawnList[0] : { x: 0, z: 0 };
        this.player.spawn(pSpawn);
      }
      this.setupBots();
    }
  }

  showHitmarker(isHeadshot = false) {
    const hm = document.getElementById('hitmarker');
    if (!hm) return;
    hm.classList.remove('hidden');
    hm.classList.remove('active');
    if (isHeadshot) {
      hm.classList.add('hm-headshot');
    } else {
      hm.classList.remove('hm-headshot');
    }
    void hm.offsetWidth; // Force CSS animation restart
    hm.classList.add('active');

    clearTimeout(this.hitmarkerTimer);
    this.hitmarkerTimer = setTimeout(() => {
      hm.classList.remove('active');
      setTimeout(() => {
        if (!hm.classList.contains('active')) hm.classList.add('hidden');
      }, 60);
    }, 130);
  }

  showEliminationToast(victimName, isHeadshot = false) {
    const banner = document.getElementById('kill-streak-banner');
    if (!banner) return;
    const hsPrefix = isHeadshot ? '★ HEADSHOT! ' : '';
    banner.textContent = `+300$ ${hsPrefix}ELIMINATED: ${victimName.toUpperCase()}`;
    if (isHeadshot) banner.classList.add('hs-elim');
    else banner.classList.remove('hs-elim');
    banner.classList.remove('hidden');
    banner.classList.add('active');

    clearTimeout(this.elimToastTimer);
    this.elimToastTimer = setTimeout(() => {
      banner.classList.remove('active');
      setTimeout(() => {
        if (!banner.classList.contains('active')) banner.classList.add('hidden');
      }, 200);
    }, 1800);
  }

  updateLobbyBadge(team) {
    const titleEl = document.getElementById('lobby-op-title');
    const weaponEl = document.getElementById('lobby-op-weapon');
    const teamEl = document.getElementById('lobby-op-team');
    const statusEl = document.querySelector('.op-status-tag');
    const i18n = window.csI18n;

    if (team === 'ct') {
      if (teamEl) teamEl.textContent = i18n ? i18n.t('badge_team_ct') : 'СПЕЦНАЗ (CT)';
      if (titleEl) titleEl.textContent = 'SAS OPERATIVE';
      if (weaponEl) weaponEl.textContent = i18n ? i18n.t('badge_wpn_m4') : 'ВООРУЖЕНИЕ: M4A1 CARBINE';
    } else {
      if (teamEl) teamEl.textContent = i18n ? i18n.t('badge_team_t') : 'ТЕРРОРИСТЫ (T)';
      if (titleEl) titleEl.textContent = 'PHOENIX ENFORCER';
      if (weaponEl) weaponEl.textContent = i18n ? i18n.t('badge_wpn_ak') : 'ВООРУЖЕНИЕ: AK-47 ASSAULT RIFLE';
    }
    if (statusEl && i18n) {
      statusEl.textContent = i18n.t('badge_status');
    }
  }

  initUI() {
    this.initPanoramaUI();
    this.initAudioMixerUI();

    // Start / Resume / Restart buttons
    this.btnStart = document.getElementById('btn-start-game');
    this.btnRestart = document.getElementById('btn-restart-game');

    // Unlock AudioContext on very first touch on mobile
    const unlockAudioTouch = () => {
      if (window.csAudio) {
        window.csAudio.init();
        window.csAudio.resume();
      }
      window.removeEventListener('touchstart', unlockAudioTouch);
    };
    window.addEventListener('touchstart', unlockAudioTouch, { passive: true });

    // Mobile Portrait Rotation Overlay
    const checkOrientation = () => {
      const warning = document.getElementById('mobile-portrait-warning');
      if (!warning) return;
      const isPortrait = window.innerHeight > window.innerWidth && this.isTouchDevice();
      if (isPortrait) {
        warning.classList.remove('hidden');
      } else {
        warning.classList.add('hidden');
      }
    };
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    checkOrientation();

    const btnForce = document.getElementById('btn-force-landscape');
    if (btnForce) {
      btnForce.addEventListener('click', () => {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').catch(() => {});
        }
      });
    }

    if (this.btnStart) {
      this.btnStart.addEventListener('click', () => {
        window.csAudio.init();
        window.csAudio.resume();

        if (this.isTouchDevice()) {
          if (window.csTouch) {
            window.csTouch.setEnabled(true);
          }
          if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
          if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {});
          }
        }

        if (!this.isGameStarted) {
          this.startMatchWithLoadingScreen(this.selectedMap || 'dust2', this.gameMode || 'defusal');
        } else {
          this.resumeMatch();
        }
      });
    }

    if (this.btnRestart) {
      this.btnRestart.addEventListener('click', () => {
        window.csAudio.init();
        window.csAudio.resume();
        if (this.isTouchDevice() && window.csTouch) {
          window.csTouch.setEnabled(true);
        }
        this.startMatchWithLoadingScreen(this.selectedMap || 'dust2', this.gameMode || 'defusal');
      });
    }

    // Re-lock pointer when clicking on canvas during gameplay (Desktop only)
    this.container.addEventListener('click', () => {
      if (this.isTouchDevice()) return;
      if (this.isGameStarted && !this.isMenuOpen() && !this.isBuyMenuOpen && (!this.player || !this.player.isDead)) {
        this.requestPointerLock();
      }
    });

    // Touch Pause / Menu Button on Mobile HUD
    const btnTouchPause = document.getElementById('btn-touch-pause');
    if (btnTouchPause) {
      const handlePause = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.togglePause();
      };
      btnTouchPause.addEventListener('click', handlePause);
      btnTouchPause.addEventListener('touchend', handlePause, { passive: false });
    }

    // Death Overlay interactive buttons
    const btnRespawn = document.getElementById('btn-respawn');
    if (btnRespawn) {
      btnRespawn.addEventListener('click', () => {
        this.respawnPlayer();
      });
    }

    // Buy Menu Items Click & Touch
    document.querySelectorAll('.buy-item-btn').forEach(btn => {
      const handleBuy = (e) => {
        e.preventDefault();
        const itemType = btn.getAttribute('data-weapon');
        const cost = parseInt(btn.getAttribute('data-cost'));
        this.buyItem(itemType, cost);
      };
      btn.addEventListener('click', handleBuy);
      btn.addEventListener('touchend', handleBuy, { passive: false });
    });

    // Close Buy Menu Button
    const btnCloseBuy = document.getElementById('btn-close-buy');
    if (btnCloseBuy) {
      const handleClose = (e) => {
        e.preventDefault();
        this.toggleBuyMenu(false);
      };
      btnCloseBuy.addEventListener('click', handleClose);
      btnCloseBuy.addEventListener('touchend', handleClose, { passive: false });
    }

    // Audio feedback on hover & click for all buttons, cards, tabs, and selects
    this.attachAudioFeedback('button, .nav-tab-btn, .mode-pill-btn, .map-card, .loadout-card, .faction-card, .ch-preset-btn, .color-chip, select');
  }

  attachAudioFeedback(selector) {
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
  }

  // =========================================================================
  // CS:GO PANORAMA UI CONTROLLER
  // =========================================================================
  initPanoramaUI() {
    this.gameMode = 'defusal';
    this.activeLoadoutWeapon = 'ak47';

    // 1. Navigation Tab Switching
    const tabButtons = document.querySelectorAll('#panorama-tabs .nav-tab-btn');
    const panes = document.querySelectorAll('.panorama-pane');

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        panes.forEach(pane => {
          if (pane.id === `pane-${targetTab}`) {
            pane.classList.add('active');
          } else {
            pane.classList.remove('active');
          }
        });

        if (window.csAudio && window.csAudio.playMechanicalClick) {
          window.csAudio.playMechanicalClick(1.2, 850);
        }
      });
    });

    // 2. 3D Lobby Theme Selector
    const themeSelect = document.getElementById('select-lobby-theme');
    if (themeSelect) {
      const savedTheme = localStorage.getItem('cs_lobby_theme') || 'dust2';
      themeSelect.value = savedTheme;
      themeSelect.addEventListener('change', (e) => {
        if (this.lobby3d) {
          this.lobby3d.applyTheme(e.target.value);
        }
        if (window.csAudio && window.csAudio.playMechanicalClick) {
          window.csAudio.playMechanicalClick(1.5, 950);
        }
      });
    }

    // 3. Ambient Drone Music Button
    const btnMusic = document.getElementById('btn-ambient-music');
    if (btnMusic) {
      btnMusic.addEventListener('click', () => {
        if (this.lobby3d) {
          const willPlay = !this.lobby3d.ambientPlaying;
          this.lobby3d.toggleAmbientMusic(willPlay);
          if (willPlay) {
            btnMusic.classList.add('active');
          } else {
            btnMusic.classList.remove('active');
          }
        }
      });
    }

    // 4. Sound Pack Nav Button
    const btnSoundpackNav = document.getElementById('btn-open-soundpack-nav');
    if (btnSoundpackNav) {
      btnSoundpackNav.addEventListener('click', () => {
        const modal = document.getElementById('soundpack-modal');
        if (modal) {
          modal.classList.remove('hidden');
          this.renderSoundPackSlots(this.currentSoundPackCat || 'all');
        }
      });
    }

    // 5. Bilingual Switcher
    if (window.csI18n) {
      window.csI18n.init();
      window.addEventListener('cs_language_changed', () => {
        this.updateLobbyBadge(this.playerTeam);
        if (this.isPaused && this.btnStart) {
          this.btnStart.textContent = window.csI18n.t('resume_btn');
        } else if (this.btnStart && !this.isGameStarted) {
          this.btnStart.innerHTML = `<span class="play-icon">▶</span> <span class="play-text">${window.csI18n.t('play_btn')}</span>`;
        }
        const sbTitle = document.getElementById('sb-map-title');
        if (sbTitle) {
          sbTitle.textContent = (this.selectedMap === 'beach')
            ? window.csI18n.t('sb_title_beach')
            : window.csI18n.t('sb_title_dust2');
        }
      });
    }

    // 6. Player Profile Card Widget & Editable Nickname
    this.initProfileCard();

    // 7. Play Pane: Game Mode Pills
    const modePills = document.querySelectorAll('.mode-pill-btn');
    modePills.forEach(pill => {
      pill.addEventListener('click', () => {
        modePills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.gameMode = pill.getAttribute('data-mode');
        if (window.csAudio && window.csAudio.playMechanicalClick) {
          window.csAudio.playMechanicalClick(1.4, 750);
        }
      });
    });

    // 8. Play Pane: 3D Tilt Map Cards
    this.initMapCards();

    // 9. Factions Selection (CT vs T)
    const btnCt = document.getElementById('btn-join-ct');
    const btnT = document.getElementById('btn-join-t');
    const avatarIcon = document.getElementById('profile-avatar-icon');

    if (btnCt && btnT) {
      btnCt.addEventListener('click', () => {
        this.playerTeam = 'ct';
        btnCt.classList.add('active');
        btnT.classList.remove('active');
        if (this.lobby3d) this.lobby3d.setTeam('ct');
        this.updateLobbyBadge('ct');
        if (avatarIcon) avatarIcon.textContent = '👮';
        if (window.csAudio && window.csAudio.playRadio) {
          window.csAudio.playRadio('radio_lets_go');
        }
      });

      btnT.addEventListener('click', () => {
        this.playerTeam = 't';
        btnT.classList.add('active');
        btnCt.classList.remove('active');
        if (this.lobby3d) this.lobby3d.setTeam('t');
        this.updateLobbyBadge('t');
        if (avatarIcon) avatarIcon.textContent = '🥷';
        if (window.csAudio && window.csAudio.playRadio) {
          window.csAudio.playRadio('radio_lock_n_load');
        }
      });
    }

    // 10. Match Settings: Difficulty, Bot count, Money, Time
    const diffSelect = document.getElementById('select-difficulty');
    if (diffSelect) {
      diffSelect.addEventListener('change', (e) => {
        this.difficulty = e.target.value;
        this.bots.forEach(b => b.setDifficulty(this.difficulty));
      });
    }

    const botSelect = document.getElementById('select-bot-count');
    if (botSelect) {
      botSelect.addEventListener('change', (e) => {
        this.botCount = parseInt(e.target.value);
      });
    }

    const moneySelect = document.getElementById('select-start-money');
    if (moneySelect) {
      moneySelect.addEventListener('change', (e) => {
        this.startingMoney = parseInt(e.target.value);
        if (this.player && !this.isGameStarted) {
          this.player.money = this.startingMoney;
          this.player.updateHUD();
        }
      });
    }

    const roundTimeSelect = document.getElementById('select-round-time');
    if (roundTimeSelect) {
      roundTimeSelect.addEventListener('change', (e) => {
        this.roundTimeMax = parseInt(e.target.value);
      });
    }

    const sensSlider = document.getElementById('range-sensitivity');
    const sensVal = document.getElementById('sens-val');
    if (sensSlider) {
      sensSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (this.player) this.player.mouseSensitivity = val;
        if (sensVal) sensVal.textContent = val.toFixed(1);
      });
    }

    // 11. Loadout Weapon Inspector
    this.initLoadoutInspector();

    // 12. Dedicated Server Browser
    this.initServerBrowser();

    // 13. Live Crosshair Generator
    this.initCrosshairGenerator();

    // 14. PWA & Desktop App 1-Click Installer
    this.initPWAInstaller();

    // 15. Touch Controller (Mobile & Android APK)
    if (window.csTouch && window.csTouch.init) {
      window.csTouch.init();
    }
  }

  // =========================================================================
  // PWA & DESKTOP APP 1-CLICK INSTALLER, TELEGRAM SHARE & DOWNLOAD MODAL
  // =========================================================================
  initPWAInstaller() {
    let deferredPrompt = null;
    const GITHUB_PAGES_URL = 'https://sariko1238.github.io/Counter-Strike-game/';
    const onlineUrl = (window.location.protocol === 'http:' || window.location.protocol === 'https:')
      ? window.location.origin + window.location.pathname
      : GITHUB_PAGES_URL;

    const btnCenter = document.getElementById('btn-download-app-center');
    const modal = document.getElementById('app-download-modal');
    const btnClose = document.getElementById('btn-close-app-modal');
    const btnCloseFooter = document.getElementById('btn-close-app-modal-footer');
    const btnModalInstall = document.getElementById('btn-modal-install-pwa');
    const pwaHint = document.getElementById('pwa-install-hint');
    const btnModalTouch = document.getElementById('btn-modal-toggle-touch');
    const touchStatusText = document.getElementById('modal-touch-status-text');
    const btnCopyTg = document.getElementById('btn-copy-tg-link');
    const btnOpenTg = document.getElementById('btn-open-tg-share');
    const tgUrlInput = document.getElementById('tg-share-url-input');
    const tgToast = document.getElementById('tg-copy-toast');
    const qrImage = document.getElementById('modal-qr-image');

    // Update share URL input and QR code if online
    if (tgUrlInput) tgUrlInput.value = GITHUB_PAGES_URL;
    if (qrImage) {
      const qrTarget = encodeURIComponent(GITHUB_PAGES_URL);
      qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=00e5ff&bgcolor=0e1620&data=${qrTarget}`;
    }

    // Capture beforeinstallprompt for instant 1-click PWA installation
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (btnCenter) btnCenter.classList.add('ready-to-install');
      if (btnModalInstall) {
        btnModalInstall.innerHTML = '<span>📲</span> <span>Установить приложение в 1 клик [ГОТОВО]</span>';
      }
      if (pwaHint) {
        pwaHint.textContent = '★ Устройство готово! Нажмите для мгновенной установки иконки игры';
        pwaHint.style.color = '#00ffaa';
      }
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      if (btnModalInstall) {
        btnModalInstall.innerHTML = '<span>✓</span> <span>ПРИЛОЖЕНИЕ УСТАНОВЛЕНО!</span>';
      }
      if (pwaHint) {
        pwaHint.textContent = '★ Игра добавлена на ваш главный экран / Рабочий стол';
        pwaHint.style.color = '#00ffaa';
      }
    });

    const openModal = () => {
      if (modal) modal.classList.remove('hidden');
      if (touchStatusText && window.csTouch) {
        touchStatusText.textContent = window.csTouch.enabled
          ? 'Отключить джойстик (ВКЛ)'
          : 'Включить джойстик (ВЫКЛ)';
      }
      if (window.csAudio && window.csAudio.playMechanicalClick) {
        window.csAudio.playMechanicalClick(1.4, 850);
      }
    };

    const closeModal = () => {
      if (modal) modal.classList.add('hidden');
      if (window.csAudio && window.csAudio.playMechanicalClick) {
        window.csAudio.playMechanicalClick(1.1, 700);
      }
    };

    if (btnCenter) btnCenter.addEventListener('click', openModal);
    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCloseFooter) btnCloseFooter.addEventListener('click', closeModal);

    // 1-Click PWA Install button for Mobile & PC
    if (btnModalInstall) {
      btnModalInstall.addEventListener('click', async () => {
        if (window.csAudio && window.csAudio.playMechanicalClick) {
          window.csAudio.playMechanicalClick(1.6, 950);
        }

        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

        if (deferredPrompt) {
          deferredPrompt.prompt();
          const choice = await deferredPrompt.userChoice;
          if (choice && choice.outcome === 'accepted') {
            console.log('[CS 1.6] User accepted PWA installation');
          }
          deferredPrompt = null;
        } else if (isIOS) {
          alert('★ КАК УСТАНОВИТЬ COUNTER-STRIKE 1.6 НА IPHONE / IPAD:\n\n1. Нажмите иконку «Поделиться» (квадрат со стрелкой вверх ⎋) в браузере Safari.\n2. В появившемся меню выберите «На экран „Домой“» (➕).\n3. Иконка игры появится на главном экране телефона и будет запускаться на весь экран без рамок!');
        } else {
          const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
          if (isStandalone) {
            alert(window.csI18n?.currentLang === 'en'
              ? '★ Counter-Strike 1.6 is already running in standalone Desktop App mode!'
              : '★ Игра Counter-Strike 1.6 уже запущена в автономном режиме приложения!');
          } else {
            const isAndroid = /android/i.test(navigator.userAgent);
            if (isAndroid) {
              alert('★ КАК УСТАНОВИТЬ НА ANDROID В 1 КЛИК:\n\n1. Нажмите на три точки ⋮ в правом верхнем углу Chrome.\n2. Выберите пункт «Установить приложение» (или «Добавить на гл. экран»).\n3. Официальная иконка появится рядом с вашими играми без вирусов и без предупреждений APK!');
            } else {
              const msg = window.csI18n?.currentLang === 'en'
                ? '★ HOW TO INSTALL CS 1.6 AS A DESKTOP APP:\n\n1. In Chrome / Edge: Click the "Install" icon (🖥) on the right side of the address bar.\n2. On macOS: Launch "Counter-Strike 1.6.app" on your Desktop!\n3. On Windows: Run "Counter-Strike 1.6.bat" to launch instantly without browser borders.'
                : '★ КАК ЗАПУСКАТЬ CS 1.6 КАК ОТДЕЛЬНОЕ ПРИЛОЖЕНИЕ:\n\n1. В браузере (Chrome / Edge): нажмите иконку «Установить» (🖥) справа в адресной строке.\n2. На macOS: запустите ярлык «Counter-Strike 1.6.app» на Рабочем столе!\n3. На Windows: запустите файл «Counter-Strike 1.6.bat» для мгновенного входа без рамок браузера.';
              alert(msg);
            }
          }
        }
      });
    }

    // Telegram link copy button with toast
    if (btnCopyTg) {
      btnCopyTg.addEventListener('click', async () => {
        const textToCopy = `🔥 Заходи в Counter-Strike 1.6 3D прямо в браузере или на телефоне! Сенсорный джойстик, боты, скины и 60+ FPS:\n${GITHUB_PAGES_URL}`;
        
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(textToCopy);
          } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = textToCopy;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
          }

          if (tgToast) {
            tgToast.classList.remove('hidden');
            setTimeout(() => {
              tgToast.classList.add('hidden');
            }, 3500);
          }

          if (window.csAudio && window.csAudio.playMechanicalClick) {
            window.csAudio.playMechanicalClick(1.5, 900);
          }
        } catch (err) {
          console.error('[CS 1.6] Copy error:', err);
          prompt('Скопируйте ссылку для друга вручную:', GITHUB_PAGES_URL);
        }
      });
    }

    // Telegram open share button
    if (btnOpenTg) {
      btnOpenTg.addEventListener('click', () => {
        const shareMsg = encodeURIComponent('🔥 Заходи в Counter-Strike 1.6 3D прямо в браузере или на телефоне!\nСенсорный джойстик, умные боты и оффлайн-режим:\n' + GITHUB_PAGES_URL);
        window.open(`https://t.me/share/url?url=${encodeURIComponent(GITHUB_PAGES_URL)}&text=${shareMsg}`, '_blank');
        if (window.csAudio && window.csAudio.playMechanicalClick) {
          window.csAudio.playMechanicalClick(1.2, 750);
        }
      });
    }

    // Modal touch toggle button
    if (btnModalTouch) {
      btnModalTouch.addEventListener('click', () => {
        if (window.csTouch) {
          window.csTouch.setEnabled(!window.csTouch.enabled);
          if (touchStatusText) {
            touchStatusText.textContent = window.csTouch.enabled
              ? 'Отключить джойстик (ВКЛ)'
              : 'Включить джойстик (ВЫКЛ)';
          }
        }
        if (window.csAudio && window.csAudio.playMechanicalClick) {
          window.csAudio.playMechanicalClick(1.3, 800);
        }
      });
    }
  }

  // =========================================================================
  // PROFILE CARD & RANKS
  // =========================================================================
  initProfileCard() {
    const nickEl = document.getElementById('profile-nickname');
    const btnEditNick = document.getElementById('btn-edit-nick');
    const savedNick = localStorage.getItem('cs_profile_nickname') || 'CS_WARRIOR';

    if (nickEl) nickEl.textContent = savedNick;
    if (this.player) this.player.name = savedNick;

    const handleEditNick = () => {
      const current = nickEl ? nickEl.textContent : 'CS_WARRIOR';
      const newNick = prompt(
        window.csI18n?.currentLang === 'en'
          ? 'Enter your tactical nickname:'
          : 'Введите боевой никнейм игрока:',
        current
      );
      if (newNick && newNick.trim().length > 0) {
        const clean = newNick.trim().substring(0, 16);
        if (nickEl) nickEl.textContent = clean;
        localStorage.setItem('cs_profile_nickname', clean);
        if (this.player) this.player.name = clean;
      }
    };

    if (nickEl) nickEl.addEventListener('click', handleEditNick);
    if (btnEditNick) btnEditNick.addEventListener('click', handleEditNick);

    // Rank selector in Stats tab
    const rankSelect = document.getElementById('select-player-rank');
    const rankTitleEl = document.getElementById('profile-rank-title');
    const rankIconEl = document.getElementById('profile-rank-icon');
    const statsRankTitle = document.getElementById('stats-rank-title');
    const statsRankIcon = document.getElementById('stats-rank-icon');

    const ranksMap = {
      silver1: { title: 'SILVER I', icon: '🥈' },
      silver_elite: { title: 'SILVER ELITE', icon: '⚔️' },
      gold_nova: { title: 'GOLD NOVA III', icon: '🥇' },
      master_guardian: { title: 'MASTER GUARDIAN', icon: '🎖️' },
      dmg: { title: 'DISTINGUISHED GUARDIAN', icon: '🦅' },
      supreme: { title: 'SUPREME FIRST MASTER', icon: '👑' },
      global: { title: 'THE GLOBAL ELITE', icon: '⭐' }
    };

    if (rankSelect) {
      const savedRank = localStorage.getItem('cs_profile_rank') || 'global';
      rankSelect.value = savedRank;
      const rData = ranksMap[savedRank] || ranksMap.global;
      if (rankTitleEl) rankTitleEl.textContent = rData.title;
      if (rankIconEl) rankIconEl.textContent = rData.icon;
      if (statsRankTitle) statsRankTitle.textContent = rData.title;
      if (statsRankIcon) statsRankIcon.textContent = rData.icon;

      rankSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        const rd = ranksMap[val] || ranksMap.global;
        if (rankTitleEl) rankTitleEl.textContent = rd.title;
        if (rankIconEl) rankIconEl.textContent = rd.icon;
        if (statsRankTitle) statsRankTitle.textContent = rd.title;
        if (statsRankIcon) statsRankIcon.textContent = rd.icon;
        localStorage.setItem('cs_profile_rank', val);
        if (window.csAudio && window.csAudio.playMechanicalClick) {
          window.csAudio.playMechanicalClick(1.6, 900);
        }
      });
    }
  }

  // =========================================================================
  // 3D TILT MAP CARDS INTERACTION
  // =========================================================================
  initMapCards() {
    const mapCards = document.querySelectorAll('.map-card');
    const savedMap = localStorage.getItem('cs_game_map') || 'dust2';

    mapCards.forEach(card => {
      const cardMap = card.getAttribute('data-map');
      if (cardMap === savedMap) {
        mapCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.selectedMap = cardMap;
      }

      // 3D Parallax Tilt effect on mousemove
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        const rotX = -y * 16;
        const rotY = x * 16;
        card.style.transform = `perspective(700px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(1.035, 1.035, 1.035)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      });

      // Card Selection
      card.addEventListener('click', () => {
        mapCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.selectedMap = card.getAttribute('data-map');
        localStorage.setItem('cs_game_map', this.selectedMap);

        // Metallic lock-in sound
        if (window.csAudio && window.csAudio.playMechanicalClick) {
          window.csAudio.playMechanicalClick(1.65, 920);
        }

        // When paused (after ESC) or match is in progress, immediately reload and start the selected map!
        if (this.isPaused || this.isGameStarted) {
          this.restartMatch(this.selectedMap);
        }
      });
    });
  }

  // =========================================================================
  // LOADOUT & 3D WEAPON INSPECTOR
  // =========================================================================
  initLoadoutInspector() {
    const catButtons = document.querySelectorAll('.loadout-cat-btn');
    const weaponCards = document.querySelectorAll('.loadout-card');
    const inspectTitle = document.getElementById('inspect-title');
    const inspectBanner = document.getElementById('inspect-banner-preview');
    const inspectCatLabel = document.getElementById('inspect-category-label');
    const skinSelect = document.getElementById('inspect-skin-select');
    const btnEquip = document.getElementById('btn-equip-loadout');

    // Category Filter
    catButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        catButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.getAttribute('data-cat');

        weaponCards.forEach(card => {
          const wId = card.getAttribute('data-weapon');
          const wData = window.WEAPONS_DATA[wId];
          if (!wData) return;

          let matches = (cat === 'all');
          if (cat === 'rifles' && (wId === 'ak47' || wId === 'm4a1')) matches = true;
          if (cat === 'snipers' && (wId === 'awp' || wId === 'scout' || wId === 'scar20')) matches = true;
          if (cat === 'pistols' && (wId === 'glock' || wId === 'usp' || wId === 'deagle')) matches = true;
          if (cat === 'knives' && wId === 'knife') matches = true;

          card.style.display = matches ? 'block' : 'none';
        });
      });
    });

    const updateInspectTelemetry = (wId) => {
      const wData = window.WEAPONS_DATA[wId] || window.WEAPONS_DATA.ak47;
      if (!wData) return;

      const damageVal = document.getElementById('stat-val-damage');
      const damageFill = document.getElementById('stat-fill-damage');
      const firerateVal = document.getElementById('stat-val-firerate');
      const firerateFill = document.getElementById('stat-fill-firerate');
      const recoilVal = document.getElementById('stat-val-recoil');
      const recoilFill = document.getElementById('stat-fill-recoil');
      const armorVal = document.getElementById('stat-val-armor');
      const armorFill = document.getElementById('stat-fill-armor');
      const speedVal = document.getElementById('stat-val-speed');
      const speedFill = document.getElementById('stat-fill-speed');

      if (damageVal) damageVal.textContent = `${wData.damage} HP (В тело) / ${wData.damage * 4} HP (Хедшот)`;
      if (damageFill) damageFill.style.width = `${Math.min(100, (wData.damage / 115) * 100)}%`;

      const rpm = wData.fireRate > 0 ? Math.round(60 / wData.fireRate) : 60;
      if (firerateVal) firerateVal.textContent = `${rpm} RPM`;
      if (firerateFill) firerateFill.style.width = `${Math.min(100, (rpm / 800) * 100)}%`;

      const recoilPct = Math.round(Math.max(20, 100 - (wData.recoil || 0) * 800));
      if (recoilVal) recoilVal.textContent = `${recoilPct}% • Контроль`;
      if (recoilFill) recoilFill.style.width = `${recoilPct}%`;

      const armorPct = Math.round((wData.penetrationPower || 0.75) * 100);
      if (armorVal) armorVal.textContent = `${armorPct}%`;
      if (armorFill) armorFill.style.width = `${armorPct}%`;

      const spd = wData.speedUnits || 250;
      if (speedVal) speedVal.textContent = `${spd} Units/sec`;
      if (speedFill) speedFill.style.width = `${(spd / 250) * 100}%`;
    };

    // Weapon Card Click
    weaponCards.forEach(card => {
      card.addEventListener('click', () => {
        weaponCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const wId = card.getAttribute('data-weapon');
        this.activeLoadoutWeapon = wId;

        const wData = window.WEAPONS_DATA[wId];
        if (wData) {
          if (inspectTitle) inspectTitle.textContent = `${wData.name.toUpperCase()}`;
          if (inspectBanner) inspectBanner.textContent = wData.id.toUpperCase();
          if (inspectCatLabel) {
            inspectCatLabel.textContent = (wData.slot === 1) ? 'ОСНОВНОЕ ВООРУЖЕНИЕ' : (wData.slot === 2 ? 'ВТОРИЧНОЕ ОРУЖИЕ' : 'ХОЛОДНОЕ ОРУЖИЕ');
          }
        }

        updateInspectTelemetry(wId);

        // Update 3D operative in lobby
        const curSkin = (window.WEAPON_SKIN_SELECTION && window.WEAPON_SKIN_SELECTION[wId]) || 'default';
        if (this.lobby3d) {
          this.lobby3d.setWeapon(wId, curSkin);
        }

        if (window.csAudio && window.csAudio.playMechanicalClick) {
          window.csAudio.playMechanicalClick(1.3, 800);
        }
      });
    });

    // Skin Selector
    if (skinSelect) {
      skinSelect.addEventListener('change', (e) => {
        const skinVal = e.target.value;
        if (!window.WEAPON_SKIN_SELECTION) window.WEAPON_SKIN_SELECTION = {};
        window.WEAPON_SKIN_SELECTION[this.activeLoadoutWeapon] = skinVal;

        if (this.lobby3d) {
          this.lobby3d.setWeapon(this.activeLoadoutWeapon, skinVal);
        }

        if (this.player && this.player.currentWeapon && this.player.currentWeapon.id === this.activeLoadoutWeapon) {
          this.player.selectSlot(this.player.currentSlot);
        }
      });
    }

    // Equip button
    if (btnEquip) {
      btnEquip.addEventListener('click', () => {
        const wId = this.activeLoadoutWeapon;
        const curSkin = (window.WEAPON_SKIN_SELECTION && window.WEAPON_SKIN_SELECTION[wId]) || 'default';
        if (this.lobby3d) {
          this.lobby3d.setWeapon(wId, curSkin);
        }
        if (window.csAudio && window.csAudio.playSound) {
          window.csAudio.playSound('m4a1_draw', { volume: 0.9, bus: 'weapons' });
        }
        btnEquip.textContent = '✓ ЭКИПИРОВАНО!';
        setTimeout(() => {
          btnEquip.textContent = '✓ ЭКИПИРОВАТЬ В ЛОББИ';
        }, 1500);
      });
    }

    // Initial telemetry update
    updateInspectTelemetry('ak47');
  }

  // =========================================================================
  // DEDICATED SERVER BROWSER
  // =========================================================================
  initServerBrowser() {
    const connectButtons = document.querySelectorAll('.btn-connect-server');
    connectButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const row = btn.closest('tr');
        if (!row) return;
        const mapName = row.getAttribute('data-map') || 'dust2';
        const modeName = row.getAttribute('data-mode') || 'defusal';
        this.startMatchWithLoadingScreen(mapName, modeName);
      });
    });

    const refreshBtn = document.getElementById('btn-refresh-servers');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        document.querySelectorAll('.srv-ping').forEach(p => {
          const newPing = Math.floor(Math.random() * 20 + 10);
          p.textContent = `${newPing} ms`;
        });
        if (window.csAudio && window.csAudio.playMechanicalClick) {
          window.csAudio.playMechanicalClick(1.8, 1100);
        }
      });
    }
  }

  // =========================================================================
  // LIVE INTERACTIVE CROSSHAIR GENERATOR
  // =========================================================================
  initCrosshairGenerator() {
    const livePreview = document.getElementById('live-crosshair-preview');
    const inGameCrosshair = document.getElementById('crosshair');

    const sliderSize = document.getElementById('slider-ch-size');
    const sliderThick = document.getElementById('slider-ch-thick');
    const sliderGap = document.getElementById('slider-ch-gap');
    const chkDot = document.getElementById('chk-ch-dot');
    const selectReticle = document.getElementById('select-reticle');

    const valSize = document.getElementById('ch-size-val');
    const valThick = document.getElementById('ch-thick-val');
    const valGap = document.getElementById('ch-gap-val');

    let currentColor = '#00ff44';

    const applyCrosshairStyles = () => {
      const size = sliderSize ? parseInt(sliderSize.value) : 10;
      const thick = sliderThick ? parseInt(sliderThick.value) : 2;
      const gap = sliderGap ? parseInt(sliderGap.value) : 4;
      const hasDot = chkDot ? chkDot.checked : false;
      const reticle = selectReticle ? selectReticle.value : 'cs_classic';

      if (valSize) valSize.textContent = `${size}px`;
      if (valThick) valThick.textContent = `${thick}px`;
      if (valGap) valGap.textContent = `${gap}px`;

      const targets = [livePreview, inGameCrosshair];
      targets.forEach(el => {
        if (!el) return;
        el.style.setProperty('--ch-size', `${size}px`);
        el.style.setProperty('--ch-thick', `${thick}px`);
        el.style.setProperty('--ch-gap', `${gap}px`);
        el.style.setProperty('--ch-spread', `${gap}px`);

        // Color & parts
        el.querySelectorAll('.ch-part').forEach(part => {
          part.style.backgroundColor = currentColor;
          part.style.boxShadow = `0 0 2px rgba(0,0,0,0.9), 0 0 5px ${currentColor}`;
          if (part.classList.contains('ch-top') || part.classList.contains('ch-bottom')) {
            part.style.width = `${thick}px`;
            part.style.height = `${size}px`;
          } else {
            part.style.height = `${thick}px`;
            part.style.width = `${size}px`;
          }
        });

        const dot = el.querySelector('.ch-dot');
        if (dot) {
          dot.style.display = hasDot ? 'block' : 'none';
          dot.style.backgroundColor = currentColor;
        }

        // Apply reticle style class
        el.className = el.className.replace(/reticle-\w+/g, '');
        el.classList.add(`reticle-${reticle}`);
      });
    };

    if (sliderSize) sliderSize.addEventListener('input', applyCrosshairStyles);
    if (sliderThick) sliderThick.addEventListener('input', applyCrosshairStyles);
    if (sliderGap) sliderGap.addEventListener('input', applyCrosshairStyles);
    if (chkDot) chkDot.addEventListener('change', applyCrosshairStyles);
    if (selectReticle) selectReticle.addEventListener('change', applyCrosshairStyles);

    // Color Palette chips
    document.querySelectorAll('.color-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.color-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentColor = chip.getAttribute('data-color') || '#00ff44';
        applyCrosshairStyles();
        if (window.csAudio && window.csAudio.playMechanicalClick) {
          window.csAudio.playMechanicalClick(1.4, 800);
        }
      });
    });

    // Pro player presets
    const presets = {
      s1mple: { size: 6, thick: 2, gap: 1, dot: false, color: '#00ff44', reticle: 'cs_classic' },
      niko: { size: 5, thick: 2, gap: -1, dot: false, color: '#00e5ff', reticle: 'cs_classic' },
      zywoo: { size: 8, thick: 2, gap: 3, dot: false, color: '#00ff44', reticle: 'cs_classic' },
      monesy: { size: 4, thick: 1, gap: 0, dot: true, color: '#ffffff', reticle: 'cs_classic' },
      cs16: { size: 12, thick: 2, gap: 5, dot: false, color: '#00ff44', reticle: 'cs_classic' }
    };

    document.querySelectorAll('.ch-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pKey = btn.getAttribute('data-preset');
        const p = presets[pKey];
        if (!p) return;

        if (sliderSize) sliderSize.value = p.size;
        if (sliderThick) sliderThick.value = p.thick;
        if (sliderGap) sliderGap.value = p.gap;
        if (chkDot) chkDot.checked = p.dot;
        if (selectReticle) selectReticle.value = p.reticle;
        currentColor = p.color;

        applyCrosshairStyles();
        if (window.csAudio && window.csAudio.playMechanicalClick) {
          window.csAudio.playMechanicalClick(1.5, 900);
        }
      });
    });

    // Initial crosshair apply
    applyCrosshairStyles();
  }

  // =========================================================================
  // TACTICAL MATCH LOADING SCREEN TRANSITION
  // =========================================================================
  startMatchWithLoadingScreen(mapName = 'dust2', modeName = 'defusal') {
    const loadingScreen = document.getElementById('loading-screen');
    const mapTitleEl = document.getElementById('loading-map-name');
    const mapDescEl = document.getElementById('loading-map-desc');
    const stepTextEl = document.getElementById('loading-step-text');
    const pctTextEl = document.getElementById('loading-pct');
    const fillEl = document.getElementById('loading-bar-fill');
    const tipTextEl = document.getElementById('loading-tip-text');

    const tips = [
      'Удерживайте [SHIFT] во время ходьбы — шаги оперативника становятся абсолютно бесшумными!',
      'При стрельбе очередями (спрее) из AK-47 плавно ведите мышь вниз и влево для кучности.',
      'Первая пуля из Desert Eagle и AWP летит точно в перекрестие прицела.',
      'Нажмите [CTRL], чтобы присесть — это увеличит точность стрельбы и снизит силу отдачи.',
      'Звук тиканья бомбы C4 ускоряется по мере приближения времени к детонации (45 сек).'
    ];

    if (tipTextEl) {
      tipTextEl.textContent = tips[Math.floor(Math.random() * tips.length)];
    }

    if (mapTitleEl) {
      mapTitleEl.textContent = `DE_${mapName.toUpperCase()}`;
    }

    if (mapDescEl) {
      const modeLabel = (modeName === 'deathmatch') ? 'БОЙ НАСМЕРТЬ (DM)' : (modeName === 'sniper' ? 'AWP ДУЭЛЬ' : 'СОРЕВНОВАТЕЛЬНЫЙ 5x5');
      mapDescEl.textContent = `РЕЖИМ: ${modeLabel} • TICKRATE 128 • VAC SECURED`;
    }

    if (loadingScreen) {
      loadingScreen.classList.remove('hidden', 'fade-out');
    }

    // Play gun cocking / reload transition sound
    if (window.csAudio && window.csAudio.playSound) {
      window.csAudio.playSound('ak47_reload', { volume: 0.95, bus: 'weapons' });
    }

    // Simulated high-fidelity progress steps
    const steps = [
      { pct: 25, text: 'Загрузка 3D-геометрии карты и коллизий...' },
      { pct: 55, text: 'Кэширование текстур, шейдеров и освещения...' },
      { pct: 85, text: 'Инициализация навигационной сетки ботов...' },
      { pct: 100, text: 'Подключение звукового движка CS:GO... Готово!' }
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        const s = steps[currentStep];
        if (pctTextEl) pctTextEl.textContent = `${s.pct}%`;
        if (fillEl) fillEl.style.width = `${s.pct}%`;
        if (stepTextEl) stepTextEl.textContent = s.text;
        currentStep++;
      } else {
        clearInterval(interval);

        // Load the actual map and start match
        this.loadMap(mapName, true);
        this.startNewMatch();

        // Smooth fade-out of loading screen
        if (loadingScreen) {
          loadingScreen.classList.add('fade-out');
          setTimeout(() => {
            loadingScreen.classList.add('hidden');
            loadingScreen.classList.remove('fade-out');
          }, 450);
        }
      }
    }, 280);
  }

  initAudioMixerUI() {
    // Weapons volume slider
    const wpnSlider = document.getElementById('range-vol-weapons');
    const wpnVal = document.getElementById('vol-weapons-val');
    if (wpnSlider) {
      wpnSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (window.csAudio) window.csAudio.setMixerVolume('weapons', val);
        if (wpnVal) wpnVal.textContent = Math.round(val * 100) + '%';
      });
    }

    // Footsteps volume slider
    const stepSlider = document.getElementById('range-vol-footsteps');
    const stepVal = document.getElementById('vol-footsteps-val');
    if (stepSlider) {
      stepSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (window.csAudio) window.csAudio.setMixerVolume('footsteps', val);
        if (stepVal) stepVal.textContent = Math.round(val * 100) + '%';
      });
    }

    // Effects volume slider
    const effSlider = document.getElementById('range-vol-effects');
    const effVal = document.getElementById('vol-effects-val');
    if (effSlider) {
      effSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (window.csAudio) window.csAudio.setMixerVolume('effects', val);
        if (effVal) effVal.textContent = Math.round(val * 100) + '%';
      });
    }

    // Voice volume slider
    const voiceSlider = document.getElementById('range-vol-voice');
    const voiceVal = document.getElementById('vol-voice-val');
    if (voiceSlider) {
      voiceSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (window.csAudio) window.csAudio.setMixerVolume('voice', val);
        if (voiceVal) voiceVal.textContent = Math.round(val * 100) + '%';
      });
    }

    // 3D Spatial Audio Checkbox
    const chkSpatial = document.getElementById('chk-spatial-3d');
    if (chkSpatial) {
      chkSpatial.addEventListener('change', (e) => {
        if (window.csAudio) window.csAudio.setSpatialAudio(e.target.checked);
      });
    }

    // Reverb Checkbox
    const chkReverb = document.getElementById('chk-reverb');
    if (chkReverb) {
      chkReverb.addEventListener('change', (e) => {
        if (window.csAudio) window.csAudio.setReverbEnabled(e.target.checked);
      });
    }

    // Sound Pack Modal toggle
    const btnOpen = document.getElementById('btn-open-soundpack');
    const modal = document.getElementById('soundpack-modal');
    const btnClose = document.getElementById('btn-close-soundpack');
    const btnCloseFooter = document.getElementById('btn-sp-close-footer');

    if (btnOpen && modal) {
      btnOpen.addEventListener('click', () => {
        modal.classList.remove('hidden');
        this.renderSoundPackSlots(this.currentSoundPackCat || 'all');
      });
    }

    const closeModal = () => {
      if (modal) modal.classList.add('hidden');
    };
    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCloseFooter) btnCloseFooter.addEventListener('click', closeModal);

    // Master Drag and Drop zone
    const dropzone = document.getElementById('sp-dropzone');
    if (dropzone) {
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-active');
      });
      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-active');
      });
      dropzone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-active');
        if (e.dataTransfer && e.dataTransfer.files && window.csAudio) {
          await window.csAudio.handleBatchDroppedFiles(e.dataTransfer.files);
          this.renderSoundPackSlots(this.currentSoundPackCat || 'all');
        }
      });
    }

    // Batch file input browse
    const btnBrowseBatch = document.getElementById('btn-sp-browse-batch');
    const batchFileInput = document.getElementById('sp-batch-file-input');
    if (btnBrowseBatch && batchFileInput) {
      btnBrowseBatch.addEventListener('click', () => batchFileInput.click());
      batchFileInput.addEventListener('change', async () => {
        if (batchFileInput.files && window.csAudio) {
          await window.csAudio.handleBatchDroppedFiles(batchFileInput.files);
          this.renderSoundPackSlots(this.currentSoundPackCat || 'all');
          batchFileInput.value = '';
        }
      });
    }

    // Category Tabs
    document.querySelectorAll('.sp-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sp-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.getAttribute('data-cat');
        this.currentSoundPackCat = cat;
        this.renderSoundPackSlots(cat);
      });
    });

    // Reset All Sounds Button
    const btnResetAll = document.getElementById('btn-sp-reset-all');
    if (btnResetAll) {
      btnResetAll.addEventListener('click', () => {
        if (window.csAudio) {
          window.csAudio.resetAllSoundsToDefault();
          this.renderSoundPackSlots(this.currentSoundPackCat || 'all');
        }
      });
    }

    // Listen for custom sound updates
    window.addEventListener('cs_sound_updated', () => {
      if (modal && !modal.classList.contains('hidden')) {
        this.renderSoundPackSlots(this.currentSoundPackCat || 'all');
      }
    });
  }

  renderSoundPackSlots(category = 'all') {
    const grid = document.getElementById('sp-slots-grid');
    if (!grid || !window.csAudio) return;
    grid.innerHTML = '';

    const catalog = window.csAudio.soundCatalog || [];
    const filtered = (category === 'all')
      ? catalog
      : catalog.filter(item => item.category === category);

    filtered.forEach(item => {
      const card = document.createElement('div');
      const isCustom = Boolean(window.csAudio.isCustomSound && window.csAudio.isCustomSound[item.key]);
      card.className = `sp-slot-card ${isCustom ? 'is-custom' : ''}`;

      const badgeText = isCustom ? 'Пользовательский 🟢' : 'CS:GO Default';
      const badgeClass = isCustom ? 'sp-badge-custom' : 'sp-badge-default';

      card.innerHTML = `
        <div class="sp-slot-top">
          <span class="sp-slot-name">${item.name}</span>
          <span class="sp-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="sp-slot-desc">${item.desc}</div>
        <div class="sp-slot-actions">
          <button type="button" class="sp-btn-preview" title="Прослушать">▶ Тест</button>
          <label class="sp-btn-upload" title="Загрузить свой .wav/.mp3">
            📁 Загрузить
            <input type="file" accept=".wav,.mp3,.ogg" style="display:none" class="sp-slot-file-input">
          </label>
          ${isCustom ? `<button type="button" class="sp-btn-reset-slot" title="Сбросить на эталонный CS:GO">↺</button>` : ''}
        </div>
      `;

      // Preview button
      const btnPrev = card.querySelector('.sp-btn-preview');
      btnPrev.addEventListener('click', () => {
        if (window.csAudio) {
          window.csAudio.playSound(item.key, { volume: 1.0, bus: 'ui' });
        }
      });

      // Individual file input
      const fileInp = card.querySelector('.sp-slot-file-input');
      fileInp.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0] && window.csAudio) {
          await window.csAudio.loadCustomAudioFile(item.key, e.target.files[0]);
          this.renderSoundPackSlots(category);
        }
      });

      // Reset button
      const btnReset = card.querySelector('.sp-btn-reset-slot');
      if (btnReset) {
        btnReset.addEventListener('click', () => {
          if (window.csAudio) {
            window.csAudio.resetSoundToDefault(item.key);
            this.renderSoundPackSlots(category);
          }
        });
      }

      grid.appendChild(card);
    });
  }

  isTouchDevice() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 950);
  }

  requestPointerLock() {
    if (this.isTouchDevice()) {
      return; // Do not request desktop mouse pointer lock on mobile devices
    }
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
    if (window.csTouch && window.csTouch.updateVisibility) {
      window.csTouch.updateVisibility();
    }
  }

  isMenuOpen() {
    const overlay = document.getElementById('menu-overlay');
    return Boolean(overlay && !overlay.classList.contains('hidden'));
  }

  resumeMatch() {
    this.isPaused = false;
    this.showMenuOverlay(false);
    if (!this.isTouchDevice()) {
      this.requestPointerLock();
    }
    if (window.csTouch) {
      window.csTouch.updateVisibility();
    }
  }

  restartMatch(mapName = null) {
    if (mapName) {
      this.selectedMap = mapName;
    }
    this.isPaused = false;
    this.showMenuOverlay(false);
    this.loadMap(this.selectedMap, true);
    this.startNewMatch();
    if (!this.isTouchDevice()) {
      this.requestPointerLock();
    }
    if (window.csTouch && window.csTouch.updateVisibility) {
      window.csTouch.updateVisibility();
    }
  }

  pauseGame() {
    if (!this.isGameStarted || this.isRoundOver) return;
    this.isPaused = true;
    this.showMenuOverlay(true);
    if (this.btnStart) {
      const resumeText = window.csI18n ? window.csI18n.t('resume_btn') : 'ПРОДОЛЖИТЬ (RESUME)';
      const playTextEl = this.btnStart.querySelector('.play-text');
      if (playTextEl) {
        playTextEl.textContent = resumeText;
      } else {
        this.btnStart.textContent = resumeText;
      }
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
        const resumeText = window.csI18n ? window.csI18n.t('resume_btn') : 'ПРОДОЛЖИТЬ (RESUME)';
        const playTextEl = this.btnStart.querySelector('.play-text');
        if (playTextEl) {
          playTextEl.textContent = resumeText;
        } else {
          this.btnStart.textContent = resumeText;
        }
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
      if (!this.isTouchDevice()) {
        document.exitPointerLock();
      }
      buyMenu.classList.remove('hidden');
      document.getElementById('buy-current-money').textContent = `$${this.player.money}`;
    } else {
      this.isBuyMenuOpen = false;
      buyMenu.classList.add('hidden');
      if (this.isGameStarted && !this.isPaused && !this.isTouchDevice()) {
        this.requestPointerLock();
      }
    }
    if (window.csTouch && window.csTouch.updateVisibility) {
      window.csTouch.updateVisibility();
    }
  }

  buyItem(itemId, cost) {
    if (this.player.money < cost) {
      this.showRadioSubtitle(window.csI18n ? window.csI18n.t('buy_no_money') : 'Недостаточно денег для покупки!');
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
    const sbTitle = document.getElementById('sb-map-title');
    if (sbTitle) {
      const mapKey = this.selectedMap === 'dust2' ? 'sb_title_dust2' : 'sb_title_beach';
      sbTitle.textContent = window.csI18n ? window.csI18n.t(mapKey) : (this.selectedMap === 'dust2' ? 'DE_DUST2 - СЧЁТ МАТЧА' : 'DE_BEACH - СЧЁТ МАТЧА');
    }

    const winsLabel = window.csI18n ? window.csI18n.t('sb_wins') : 'ПОБЕД';
    document.getElementById('sb-ct-rounds').textContent = `${this.scoreCT} ${winsLabel}`;
    document.getElementById('sb-t-rounds').textContent = `${this.scoreT} ${winsLabel}`;

    const ctBody = document.getElementById('sb-ct-body');
    const tBody = document.getElementById('sb-t-body');
    ctBody.innerHTML = '';
    tBody.innerHTML = '';

    const aliveLabel = window.csI18n ? window.csI18n.t('sb_status_alive') : 'Жив';
    const deadLabel = window.csI18n ? window.csI18n.t('sb_status_dead') : 'Мёртв';

    const addRow = (tbody, name, kills, deaths, isDead, isPlayer) => {
      const tr = document.createElement('tr');
      if (isPlayer) tr.classList.add('is-player');
      if (isDead) tr.classList.add('is-dead');
      tr.innerHTML = `<td>${name}</td><td>${kills}</td><td>${deaths}</td><td>${isDead ? deadLabel : aliveLabel}</td>`;
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
    if (!this.isTouchDevice()) {
      this.requestPointerLock();
    }
    if (window.csTouch) {
      if (this.isTouchDevice()) {
        window.csTouch.setEnabled(true);
      }
      window.csTouch.updateVisibility();
    }

    if (this.btnStart) {
      const resumeText = window.csI18n ? window.csI18n.t('resume_btn') : 'ПРОДОЛЖИТЬ (RESUME)';
      const playTextEl = this.btnStart.querySelector('.play-text');
      if (playTextEl) {
        playTextEl.textContent = resumeText;
      } else {
        this.btnStart.textContent = resumeText;
      }
    }
    if (this.btnRestart) {
      this.btnRestart.classList.remove('hidden');
    }
  }

  setupBots() {
    // Cleanly remove and dispose existing bots from scene
    this.bots.forEach(b => {
      if (b.destroy) b.destroy();
      else if (b.meshGroup) this.scene.remove(b.meshGroup);
    });
    this.bots = [];

    // 1 vs N mode: 0 friendly bots, enemy bots based on selected botCount
    const enemyTeam = (this.playerTeam === 'ct' ? 't' : 'ct');
    const botNamesT = ['Phoenix_Leader', 'Desert_Fox', 'Anarchist', 'Rebel_Strike', 'Guerilla_Elite', 'Balkan_Veteran', 'Pirate_One', 'Separatist'];
    const botNamesCT = ['Seal_Alpha', 'Ghost_Rider', 'Bravo_Six', 'Viper_SAS', 'GSG9_Sniper', 'GIGN_Breacher', 'FBI_Agent', 'SWAT_Defender'];
    const botNames = (enemyTeam === 't' ? botNamesT : botNamesCT);

    const count = this.botCount || 5;
    for (let i = 0; i < count; i++) {
      const name = botNames[i % botNames.length] + ` [BOT ${i + 1}]`;
      const bot = new window.CSBot(`${enemyTeam}_${i}`, name, enemyTeam, this.scene, this.map);
      bot.setDifficulty(this.gameMode === 'aimbotz' ? 'passive' : this.difficulty);
      if (this.gameMode === 'sniper' || this.selectedMap === 'awp_india') {
        bot.respawn(null, (i % 2 === 0 ? 'awp' : 'scout'));
      }
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

    // Special Game Mode Loadouts
    if (this.gameMode === 'sniper' || this.selectedMap === 'awp_india') {
      if (window.WEAPONS_DATA && window.WEAPONS_DATA.awp) {
        this.player.inventory[1] = { ...window.WEAPONS_DATA.awp };
        this.player.inventory[1].currentClip = this.player.inventory[1].clipSize;
        this.player.inventory[1].reserve = this.player.inventory[1].maxAmmo;
        this.player.selectSlot(1);
      }
      if (window.WEAPONS_DATA && window.WEAPONS_DATA.deagle) {
        this.player.inventory[2] = { ...window.WEAPONS_DATA.deagle };
        this.player.inventory[2].currentClip = this.player.inventory[2].clipSize;
        this.player.inventory[2].reserve = this.player.inventory[2].maxAmmo;
      }
    }

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
    const modeMsg = window.csI18n?.currentLang === 'en'
      ? '«1 vs 5» Mode: You are alone against 5 enemies! Fight!'
      : 'Режим «1 против 5»: вы один против 5 врагов! В бой!';
    this.showRadioSubtitle(modeMsg);
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
    const plantMsg = window.csI18n?.currentLang === 'en'
      ? `Bomb planted at site [${siteLetter}]!`
      : `Бомба заложена на точке [${siteLetter}]!`;
    this.showRadioSubtitle(plantMsg);

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
    const dropMsg = window.csI18n?.currentLang === 'en'
      ? 'Bomb dropped! Retrieve the C4!'
      : 'Бомба потеряна! Заберите C4!';
    this.showRadioSubtitle(dropMsg);
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
      const pickMsg = window.csI18n?.currentLang === 'en' ? 'You picked up the bomb (C4)!' : 'Вы подобрали бомбу (C4)!';
      this.showRadioSubtitle(pickMsg);
    } else if (carrier && carrier.isBot) {
      carrier.hasC4 = true;
      window.csAudio.playMechanicalClick(1.2, 800);
      const botPickMsg = window.csI18n?.currentLang === 'en' ? `${carrier.name} picked up the bomb!` : `${carrier.name} подобрал бомбу!`;
      this.showRadioSubtitle(botPickMsg);
    }
  }

  defuseBomb(defuser) {
    if (!this.isBombPlanted || this.isBombDefused) return;
    this.isBombDefused = true;
    document.getElementById('c4-indicator').classList.add('hidden');

    window.csAudio.playMechanicalClick(1.8, 1200);
    window.csAudio.speakRadio('Bomb has been defused!');
    this.showRadioSubtitle(window.csI18n ? window.csI18n.t('bomb_defused_announcement') : 'Бомба успешно обезврежена!');

    if (defuser === this.player) {
      this.player.money = Math.min(16000, this.player.money + 300);
      this.player.updateHUD();
    }

    const reasonText = window.csI18n ? window.csI18n.t('bomb_defused_announcement') : 'Бомба обезврежена';
    this.endRound('ct', reasonText);
  }

  detonateBomb() {
    if (this.isBombDefused || !this.isBombPlanted) return;
    window.csAudio.playExplosion(this.plantedBombPos);

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

    const rText = window.csI18n ? window.csI18n.t('target_bombed_announcement') : 'Точка подорвана';
    this.endRound('t', rText);
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

      // Show CS:GO style elimination toast!
      this.showEliminationToast(bot.name, isHeadshot);

      if (isHeadshot) {
        const hsText = window.csI18n ? `${window.csI18n.t('radio_headshot')} +$300` : 'В ГОЛОВУ! (HEADSHOT) +$300';
        this.showRadioSubtitle(hsText);
        if (window.csAudio && window.csAudio.playHeadshot) {
          window.csAudio.playHeadshot();
        }
      } else {
        const killText = window.csI18n ? `+1 ${window.csI18n.t('radio_kill')}! +$300` : '+1 ФРАГ! +$300';
        this.showRadioSubtitle(killText);
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
        const rText = window.csI18n ? window.csI18n.t('reason_t_elim') : 'Все террористы нейтрализованы';
        this.endRound('ct', rText);
      }
    } else if (!ctAlive) {
      const rText = window.csI18n ? window.csI18n.t('reason_ct_elim') : 'Все спецназовцы уничтожены';
      this.endRound('t', rText);
    }
  }

  endRound(winningTeam, reason) {
    if (this.isRoundOver) return;
    this.isRoundOver = true;

    if (winningTeam === 'ct') {
      this.scoreCT++;
      document.getElementById('score-ct').textContent = this.scoreCT;
      window.csAudio.speakRadio('Counter-Terrorists Win!');
      const winText = window.csI18n ? window.csI18n.t('ct_win') : 'COUNTER-TERRORISTS WIN';
      this.showAnnouncement(winText, '#4a90e2');
      if (this.playerTeam === 'ct') this.player.money = Math.min(16000, this.player.money + 3250);
    } else {
      this.scoreT++;
      document.getElementById('score-t').textContent = this.scoreT;
      window.csAudio.speakRadio('Terrorists Win!');
      const winText = window.csI18n ? window.csI18n.t('t_win') : 'TERRORISTS WIN';
      this.showAnnouncement(winText, '#e74c3c');
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

  // 3D Visual Effects: Blood & Bullet Decals (High performance shared materials)
  createBloodSpurt(pos, isHeadshot = false) {
    if (this.particles.length > 200) return;

    const count = isHeadshot ? 16 : 9;
    const speed = isHeadshot ? 6.0 : 3.8;

    for (let i = 0; i < count; i++) {
      const sizeBucket = isHeadshot
        ? (Math.random() < 0.35 ? 2 : 0)
        : (Math.random() < 0.25 ? 1 : 0);
      const geom = this._bloodGeoms[sizeBucket];
      const mat = this._bloodMats[i % this._bloodMats.length];
      const p = new THREE.Mesh(geom, mat);
      p.position.copy(pos);
      const angle = Math.random() * Math.PI * 2;
      const upward = Math.random() * speed * 0.6 + 0.5;
      const lateral = Math.random() * speed;
      p.userData = {
        vel: new THREE.Vector3(
          Math.cos(angle) * lateral,
          upward,
          Math.sin(angle) * lateral
        ),
        life: 0.45 + Math.random() * 0.35,
        initialLife: 0.8,
        isBlood: true
      };
      this.scene.add(p);
      this.particles.push(p);
    }

    // Blood mist cloud
    const mistCount = isHeadshot ? 4 : 2;
    for (let i = 0; i < mistCount; i++) {
      const mist = new THREE.Mesh(this._mistGeom, this._mistMat);
      mist.position.copy(pos);
      mist.userData = {
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 1.0,
          Math.random() * 0.5 + 0.1,
          (Math.random() - 0.5) * 1.0
        ),
        life: 0.6 + Math.random() * 0.3,
        initialLife: 0.9,
        isDust: true
      };
      this.scene.add(mist);
      this.particles.push(mist);
    }
  }

  // Persistent blood pool decal that grows under a dead body (bounded pool to prevent leaks)
  createBloodPool(pos) {
    const groundY = pos.y + 0.02;
    const maxScale = 0.7 + Math.random() * 0.5;

    if (!this._bloodPools) this._bloodPools = [];
    if (this._bloodPools.length >= (this._maxBloodPools || 8)) {
      const oldest = this._bloodPools.shift();
      if (oldest) {
        this.scene.remove(oldest);
        if (oldest.geometry) oldest.geometry.dispose();
        if (oldest.material) oldest.material.dispose();
      }
    }

    // Main pool disc
    const poolGeom = new THREE.CircleGeometry(maxScale, 10);
    const poolMat = new THREE.MeshBasicMaterial({
      color: 0x660000,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3
    });
    const pool = new THREE.Mesh(poolGeom, poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(pos.x + (Math.random() - 0.5) * 0.2, groundY, pos.z + (Math.random() - 0.5) * 0.2);
    pool.scale.set(0.1, 0.1, 0.1);

    this.scene.add(pool);
    this._bloodPools.push(pool);

    // Fast initial scale up
    let pScale = 0.1;
    const growInterval = setInterval(() => {
      pScale += 0.15;
      if (pool) pool.scale.set(pScale, pScale, pScale);
      if (pScale >= 1.0) clearInterval(growInterval);
    }, 40);
  }

  createBulletDecal(pos, normal) {
    if (!this._decals) this._decals = [];
    // Recycle oldest decal when exceeding limit (smooth constant performance)
    if (this._decals.length >= (this._maxDecals || 40)) {
      const oldest = this._decals.shift();
      if (oldest) this.scene.remove(oldest);
    }

    const mark = new THREE.Mesh(this._decalGeom, this._decalMat);
    mark.position.copy(pos).addScaledVector(normal, 0.012);
    mark.lookAt(pos.clone().add(normal));
    this.scene.add(mark);
    this._decals.push(mark);
  }

  // Sparkling orange ricochet debris on stone, metal, and wood
  createSparks(pos, normal) {
    if (this.particles.length > 200) return;
    const sparkCount = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < sparkCount; i++) {
      const mat = this._sparkMats[i % this._sparkMats.length];
      const spark = new THREE.Mesh(this._sparkGeom, mat);
      spark.position.copy(pos).addScaledVector(normal, 0.02);

      const spread = new THREE.Vector3(
        (Math.random() - 0.5) * 3.5,
        (Math.random() - 0.5) * 3.5,
        (Math.random() - 0.5) * 3.5
      );
      const vel = normal.clone().multiplyScalar(Math.random() * 2.8 + 2.0).add(spread);

      spark.userData = {
        vel: vel,
        life: 0.22 + Math.random() * 0.12,
        initialLife: 0.34
      };
      this.scene.add(spark);
      this.particles.push(spark);
    }
  }

  // Expanding dust / smoke puff from bullet penetration impact
  createDustPuff(pos, normal) {
    if (this.particles.length > 200) return;
    const dustCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < dustCount; i++) {
      const dust = new THREE.Mesh(this._dustGeom, this._dustMat);
      dust.position.copy(pos).addScaledVector(normal, 0.02);

      const vel = normal.clone().multiplyScalar(Math.random() * 0.7 + 0.3).add(
        new THREE.Vector3((Math.random() - 0.5) * 0.8, Math.random() * 0.6, (Math.random() - 0.5) * 0.8)
      );

      dust.userData = {
        vel: vel,
        life: 0.35 + Math.random() * 0.15,
        initialLife: 0.50,
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

    // Reuse geometry bucketed by rounded length (avoids new allocation every shot)
    const lenKey = Math.round(len * 2) / 2;
    if (!this._tracerGeomCache[lenKey]) {
      this._tracerGeomCache[lenKey] = new THREE.CylinderGeometry(0.02, 0.02, lenKey, 4);
    }
    const tracer = new THREE.Mesh(this._tracerGeomCache[lenKey], this._tracerMat);
    tracer.position.copy(fromPos).addScaledVector(dir, 0.5);
    tracer.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());

    tracer.userData = { life: 0.08, initialLife: 0.08 };
    this.scene.add(tracer);
    this.tracers.push(tracer);

    // Dynamic 3D Muzzle Flash Light — tracked for synchronous removal (no setTimeout leak)
    if (this.scene) {
      const flash = new THREE.PointLight(0xffea9f, 3.5, 14);
      flash.position.copy(fromPos);
      flash.userData = { removeAt: performance.now() + 40 };
      this.scene.add(flash);
      this._pendingFlashes.push(flash);
    }
  }

  // Ocean Water Splash Effect (Droplets + Expanding Ripple Ring)
  createWaterSplash(pos) {
    // Water droplets spray (shared geometry and material)
    for (let i = 0; i < 10; i++) {
      const droplet = new THREE.Mesh(this._waterDropletGeom, this._waterDropletMat);
      droplet.position.set(pos.x, 0.05, pos.z);
      droplet.userData = {
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 3.0,
          Math.random() * 3.2 + 1.5,
          (Math.random() - 0.5) * 3.0
        ),
        life: 0.45,
        initialLife: 0.45
      };
      this.scene.add(droplet);
      this.particles.push(droplet);
    }

    // Expanding water ripple ring (shared geometry and material)
    const ring = new THREE.Mesh(this._waterRingGeom, this._waterRingMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, 0.06, pos.z);
    ring.userData = { isRipple: true, life: 0.7, scaleSpeed: 3.0 };
    this.scene.add(ring);
    this.particles.push(ring);
  }

  // Directional Red Damage Indicator Arc on HUD
  showDamageIndicator(angle) {
    if (!this._damageIndicator) {
      this._damageIndicator = document.getElementById('damage-dir-indicator');
    }
    const ind = this._damageIndicator;
    if (!ind) return;

    const deg = THREE.MathUtils.radToDeg(angle);
    ind.style.transform = `translate(-50%, -50%) rotate(${deg}deg)`;
    ind.classList.add('active');
    if (this._damageIndicatorTimer) clearTimeout(this._damageIndicatorTimer);
    this._damageIndicatorTimer = setTimeout(() => {
      ind.classList.remove('active');
    }, 500);
  }

  // 2D Tactical Minimap / Radar Rendering (Positioned top-right)
  renderRadar() {
    const ctx = this.radarCtx;
    if (!ctx) return;
    const w = this.radarCanvas.width || 170;
    const h = this.radarCanvas.height || 170;
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

    // 1. Radar Range Rings & Crosshairs
    ctx.strokeStyle = 'rgba(0, 255, 102, 0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 32, 0, Math.PI * 2);
    ctx.arc(centerX, centerY, 64, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX, 0); ctx.lineTo(centerX, h);
    ctx.moveTo(0, centerY); ctx.lineTo(w, centerY);
    ctx.stroke();

    ctx.save();
    ctx.translate(centerX, centerY);
    // Rotate radar with player or spectator yaw so top of radar is forward
    ctx.rotate(pYaw);

    // 2. Draw Map Wall Colliders on Radar
    if (this.map && this.map.colliders && Array.isArray(this.map.colliders)) {
      ctx.fillStyle = 'rgba(0, 255, 102, 0.18)';
      ctx.strokeStyle = 'rgba(0, 255, 102, 0.35)';
      ctx.lineWidth = 0.8;
      for (let i = 0; i < this.map.colliders.length; i++) {
        const box = this.map.colliders[i];
        const minX = (box.min.x - pPos.x) * scale;
        const maxX = (box.max.x - pPos.x) * scale;
        const minZ = (box.min.z - pPos.z) * scale;
        const maxZ = (box.max.z - pPos.z) * scale;
        const boxDist = Math.hypot((minX + maxX) / 2, (minZ + maxZ) / 2);
        if (boxDist > 90) continue;
        ctx.fillRect(minX, minZ, maxX - minX, maxZ - minZ);
        ctx.strokeRect(minX, minZ, maxX - minX, maxZ - minZ);
      }
    }

    // 3. Draw Bomb Sites
    if (this.map && this.map.bombsiteA && this.map.bombsiteB) {
      const aX = (this.map.bombsiteA.x - pPos.x) * scale;
      const aZ = (this.map.bombsiteA.z - pPos.z) * scale;
      ctx.fillStyle = '#ff3333';
      ctx.font = 'bold 12px "Share Tech Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('A', aX, aZ);

      const bX = (this.map.bombsiteB.x - pPos.x) * scale;
      const bZ = (this.map.bombsiteB.z - pPos.z) * scale;
      ctx.fillStyle = '#3388ff';
      ctx.fillText('B', bX, bZ);
    }

    // 4. Draw Planted Bomb (blinking red / gold)
    if (this.isBombPlanted && this.plantedBombPos) {
      const pbx = (this.plantedBombPos.x - pPos.x) * scale;
      const pbz = (this.plantedBombPos.z - pPos.z) * scale;
      const blink = (Math.sin(Date.now() * 0.015) > 0);
      ctx.fillStyle = blink ? '#ff0033' : '#ffff00';
      ctx.beginPath();
      ctx.arc(pbx, pbz, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Draw Dropped Bomb (blinking orange / yellow)
    if (this.droppedBombPos && !this.isBombPlanted) {
      const dbx = (this.droppedBombPos.x - pPos.x) * scale;
      const dbz = (this.droppedBombPos.z - pPos.z) * scale;
      const blink = (Math.sin(Date.now() * 0.01) > 0);
      ctx.fillStyle = blink ? '#ff8800' : '#ffff33';
      ctx.beginPath();
      ctx.arc(dbx, dbz, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Draw Bots
    if (this.bots && Array.isArray(this.bots)) {
      this.bots.forEach(b => {
        if (!b || b.isDead || !b.position) return;
        const bx = (b.position.x - pPos.x) * scale;
        const bz = (b.position.z - pPos.z) * scale;
        if (Math.hypot(bx, bz) > 80) return;

        if (b.team === pTeam) {
          // Teammate: bright green dot
          ctx.fillStyle = '#00ff88';
          ctx.beginPath();
          ctx.arc(bx, bz, 3.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Enemy: red dot
          ctx.fillStyle = '#ff2222';
          ctx.beginPath();
          ctx.arc(bx, bz, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    ctx.restore();

    // 7. Player Vision Cone & Center Arrow
    ctx.save();
    const coneGrad = ctx.createRadialGradient(centerX, centerY, 4, centerX, centerY, 46);
    coneGrad.addColorStop(0, 'rgba(0, 255, 102, 0.28)');
    coneGrad.addColorStop(1, 'rgba(0, 255, 102, 0)');
    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, 46, -Math.PI / 2 - 0.42, -Math.PI / 2 + 0.42);
    ctx.closePath();
    ctx.fill();

    // Center Player Arrow (pointing forward)
    ctx.fillStyle = '#ffbb00';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 7);
    ctx.lineTo(centerX - 5, centerY + 5);
    ctx.lineTo(centerX + 5, centerY + 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
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
          window.csAudio.playBombBeep(pitch, this.plantedBombPos);
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

      // Update timer HUD (use cached DOM ref)
      const mins = Math.floor(this.roundTimer / 60);
      const secs = Math.floor(this.roundTimer % 60);
      if (this._hudTimer) {
        this._hudTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }
    }

    // Update Player & Bots
    this.player.update(delta);
    this.bots.forEach(b => b.update(delta, this.player, this.bots));

    // Update Web Audio API 3D HRTF listener position and orientation
    if (window.csAudio && window.csAudio.updateListener && this.camera) {
      window.csAudio.updateListener(this.camera);
    }

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
        const progress = Math.max(0.05, p.userData.life / (p.userData.initialLife || 0.6));
        p.scale.setScalar(progress);
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

    // Expire pending PointLight muzzle flashes (synchronous, no setTimeout)
    if (this._pendingFlashes.length > 0) {
      const now = performance.now();
      for (let i = this._pendingFlashes.length - 1; i >= 0; i--) {
        if (now >= this._pendingFlashes[i].userData.removeAt) {
          this.scene.remove(this._pendingFlashes[i]);
          this._pendingFlashes.splice(i, 1);
        }
      }
    }

    // Render Radar at ~20 fps (every 3rd frame) to reduce Canvas 2D overhead
    this._radarFrameSkip = (this._radarFrameSkip + 1) % 3;
    if (this._radarFrameSkip === 0) {
      this.renderRadar();
    }

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
      const isEn = (window.csI18n?.currentLang === 'en');
      const prefix = isEn ? 'Eliminated by: ' : 'Вас уничтожил: ';
      const hsSuffix = isHeadshot ? (isEn ? ' (HEADSHOT)' : ' (В ГОЛОВУ)') : '';
      killerInfo.textContent = `${prefix}${killer} [${weapon}]${hsSuffix}`;
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
      specTargetName.textContent = window.csI18n ? window.csI18n.t('death_spectator') : 'Режим «1 против 5» • Нажмите [ПРОБЕЛ] или кнопку для мгновенного возрождения';
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

    if (!this.isTouchDevice()) {
      this.requestPointerLock();
    }
    const respawnMsg = (window.csI18n?.currentLang === 'en')
      ? 'RESPAWN! SPAWN SHIELD: 2 SEC'
      : 'ВОЗРОЖДЕНИЕ! ЩИТ СПАВНА: 2 СЕК';
    this.showAnnouncement(respawnMsg, '#00ff66');
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
