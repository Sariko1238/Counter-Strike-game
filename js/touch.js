/**
 * Counter-Strike 1.6 Web Edition - Mobile & Android APK Touch Controller
 * Provides a virtual dynamic 3D joystick for movement, right-hand swipe aim,
 * and ergonomic tactical touch buttons with haptic feedback.
 */

class CSTouchController {
  constructor() {
    this.enabled = false;
    this.hudElement = null;
    this.joystickZone = null;
    this.joystickBase = null;
    this.joystickStick = null;
    this.lookZone = null;

    // Joystick Touch Tracking
    this.joystickTouchId = null;
    this.joystickOrigin = { x: 0, y: 0 };
    this.joystickRadius = 55;

    // Look Touch Tracking
    this.lookTouchId = null;
    this.lookLastPos = { x: 0, y: 0 };
    this.lookSensitivity = 1.35;

    // Auto-detect mobile device or respect stored preference
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.innerWidth <= 960;
    const storedPref = localStorage.getItem('cs_touch_mode');
    this.enabled = storedPref !== null ? (storedPref === 'true') : isTouchDevice;
  }

  init() {
    this.hudElement = document.getElementById('touch-controls-hud');
    this.joystickZone = document.getElementById('touch-joystick-zone');
    this.joystickBase = document.getElementById('touch-joystick-base');
    this.joystickStick = document.getElementById('touch-joystick-stick');
    this.lookZone = document.getElementById('touch-look-zone');

    if (!this.hudElement || !this.joystickZone || !this.lookZone) {
      return;
    }

    this.bindJoystick();
    this.bindLookTrackpad();
    this.bindActionButtons();
    this.updateVisibility();

    // Checkbox in Settings Menu
    const chk = document.getElementById('chk-touch-controls');
    if (chk) {
      chk.checked = this.enabled;
      chk.addEventListener('change', (e) => {
        this.setEnabled(e.target.checked);
      });
    }

    // Auto-recheck on resize / orientation change
    window.addEventListener('resize', () => {
      this.updateVisibility();
    });
  }

  setEnabled(val) {
    this.enabled = val;
    localStorage.setItem('cs_touch_mode', val ? 'true' : 'false');
    this.updateVisibility();

    const chk = document.getElementById('chk-touch-controls');
    if (chk) chk.checked = val;
  }

  updateVisibility() {
    if (!this.hudElement) return;
    const game = window.csGame;
    const isPlaying = game && game.isGameStarted && !game.isPaused && !game.isBuyMenuOpen;

    if (this.enabled && isPlaying) {
      this.hudElement.classList.remove('hidden');
    } else {
      this.hudElement.classList.add('hidden');
    }
  }

  // =========================================================================
  // 1. VIRTUAL JOYSTICK (LEFT SCREEN - WASD MOVEMENT)
  // =========================================================================
  bindJoystick() {
    const zone = this.joystickZone;
    const base = this.joystickBase;
    const stick = this.joystickStick;

    const handleTouchStart = (e) => {
      if (this.joystickTouchId !== null) return;
      const touch = e.changedTouches[0];
      this.joystickTouchId = touch.identifier;

      const rect = zone.getBoundingClientRect();
      this.joystickOrigin = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };

      base.style.left = `${this.joystickOrigin.x}px`;
      base.style.top = `${this.joystickOrigin.y}px`;
      base.classList.add('active');
      stick.style.transform = `translate(0px, 0px)`;
      e.preventDefault();
    };

    const handleTouchMove = (e) => {
      if (this.joystickTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.joystickTouchId) {
          const rect = zone.getBoundingClientRect();
          const currentX = touch.clientX - rect.left;
          const currentY = touch.clientY - rect.top;

          let dx = currentX - this.joystickOrigin.x;
          let dy = currentY - this.joystickOrigin.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > this.joystickRadius) {
            dx = (dx / dist) * this.joystickRadius;
            dy = (dy / dist) * this.joystickRadius;
          }

          stick.style.transform = `translate(${dx}px, ${dy}px)`;

          // Normalize vector to [-1, 1]
          const normX = dx / this.joystickRadius;
          const normY = dy / this.joystickRadius;

          this.updatePlayerMovement(normX, normY);
          e.preventDefault();
          break;
        }
      }
    };

    const handleTouchEnd = (e) => {
      if (this.joystickTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystickTouchId) {
          this.joystickTouchId = null;
          base.classList.remove('active');
          stick.style.transform = `translate(0px, 0px)`;
          this.resetPlayerMovement();
          e.preventDefault();
          break;
        }
      }
    };

    zone.addEventListener('touchstart', handleTouchStart, { passive: false });
    zone.addEventListener('touchmove', handleTouchMove, { passive: false });
    zone.addEventListener('touchend', handleTouchEnd, { passive: false });
    zone.addEventListener('touchcancel', handleTouchEnd, { passive: false });
  }

  updatePlayerMovement(x, y) {
    const player = window.csGame?.player;
    if (!player || player.isDead) return;

    const deadzone = 0.22;

    // Forward / Backward (W / S)
    if (y < -deadzone) {
      player.keys['KeyW'] = true;
      player.keys['KeyS'] = false;
    } else if (y > deadzone) {
      player.keys['KeyS'] = true;
      player.keys['KeyW'] = false;
    } else {
      player.keys['KeyW'] = false;
      player.keys['KeyS'] = false;
    }

    // Strafe Left / Right (A / D)
    if (x < -deadzone) {
      player.keys['KeyA'] = true;
      player.keys['KeyD'] = false;
    } else if (x > deadzone) {
      player.keys['KeyD'] = true;
      player.keys['KeyA'] = false;
    } else {
      player.keys['KeyA'] = false;
      player.keys['KeyD'] = false;
    }
  }

  resetPlayerMovement() {
    const player = window.csGame?.player;
    if (!player) return;
    player.keys['KeyW'] = false;
    player.keys['KeyS'] = false;
    player.keys['KeyA'] = false;
    player.keys['KeyD'] = false;
  }

  // =========================================================================
  // 2. CAMERA AIM TRACKPAD (RIGHT SCREEN - SWIPE TO AIM)
  // =========================================================================
  bindLookTrackpad() {
    const zone = this.lookZone;

    const handleTouchStart = (e) => {
      if (this.lookTouchId !== null) return;
      const touch = e.changedTouches[0];
      this.lookTouchId = touch.identifier;
      this.lookLastPos = { x: touch.clientX, y: touch.clientY };
      e.preventDefault();
    };

    const handleTouchMove = (e) => {
      if (this.lookTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.lookTouchId) {
          const dx = touch.clientX - this.lookLastPos.x;
          const dy = touch.clientY - this.lookLastPos.y;
          this.lookLastPos = { x: touch.clientX, y: touch.clientY };

          this.rotatePlayerCamera(dx, dy);
          e.preventDefault();
          break;
        }
      }
    };

    const handleTouchEnd = (e) => {
      if (this.lookTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.lookTouchId) {
          this.lookTouchId = null;
          e.preventDefault();
          break;
        }
      }
    };

    zone.addEventListener('touchstart', handleTouchStart, { passive: false });
    zone.addEventListener('touchmove', handleTouchMove, { passive: false });
    zone.addEventListener('touchend', handleTouchEnd, { passive: false });
    zone.addEventListener('touchcancel', handleTouchEnd, { passive: false });
  }

  rotatePlayerCamera(dx, dy) {
    const player = window.csGame?.player;
    if (!player || player.isDead) return;

    const sens = (player.mouseSensitivity || 1.2) * 0.0038 * this.lookSensitivity;
    player.yaw -= dx * sens;
    player.pitch = Math.max(-1.46, Math.min(1.46, player.pitch - dy * sens));

    player.camera.rotation.y = player.yaw;
    player.camera.rotation.x = player.pitch;
  }

  // =========================================================================
  // 3. TACTICAL TOUCH ACTION BUTTONS
  // =========================================================================
  bindActionButtons() {
    const bindPress = (btnId, onDown, onUp = null) => {
      const btn = document.getElementById(btnId);
      if (!btn) return;

      const triggerDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        btn.classList.add('pressed');
        if (navigator.vibrate) navigator.vibrate(12);
        onDown();
      };

      const triggerUp = (e) => {
        e.preventDefault();
        e.stopPropagation();
        btn.classList.remove('pressed');
        if (onUp) onUp();
      };

      btn.addEventListener('touchstart', triggerDown, { passive: false });
      btn.addEventListener('touchend', triggerUp, { passive: false });
      btn.addEventListener('touchcancel', triggerUp, { passive: false });
      btn.addEventListener('mousedown', triggerDown);
      btn.addEventListener('mouseup', triggerUp);
    };

    // Shoot / Fire
    bindPress(
      'btn-touch-fire',
      () => {
        const player = window.csGame?.player;
        if (!player || player.isDead) return;
        player.isMouseDown = true;
        player.shoot();
      },
      () => {
        const player = window.csGame?.player;
        if (player) player.isMouseDown = false;
      }
    );

    // Scope / Aim
    bindPress('btn-touch-scope', () => {
      const player = window.csGame?.player;
      if (player && !player.isDead) {
        player.toggleScope();
      }
    });

    // Jump
    bindPress('btn-touch-jump', () => {
      const player = window.csGame?.player;
      if (player && !player.isDead) {
        player.keys['Space'] = true;
        setTimeout(() => {
          player.keys['Space'] = false;
        }, 160);
      }
    });

    // Crouch (Toggle)
    let isCrouched = false;
    bindPress('btn-touch-crouch', () => {
      const player = window.csGame?.player;
      if (!player || player.isDead) return;
      isCrouched = !isCrouched;
      player.keys['ControlLeft'] = isCrouched;
      const btn = document.getElementById('btn-touch-crouch');
      if (btn) {
        if (isCrouched) btn.classList.add('crouch-active');
        else btn.classList.remove('crouch-active');
      }
    });

    // Reload
    bindPress('btn-touch-reload', () => {
      const player = window.csGame?.player;
      if (player && !player.isDead) {
        player.reload();
      }
    });

    // Buy Menu
    bindPress('btn-touch-buy', () => {
      if (window.csGame) {
        window.csGame.toggleBuyMenu();
      }
    });

    // Weapon Slots
    bindPress('btn-touch-slot1', () => {
      const player = window.csGame?.player;
      if (player && !player.isDead) player.selectSlot(1);
    });

    bindPress('btn-touch-slot2', () => {
      const player = window.csGame?.player;
      if (player && !player.isDead) player.selectSlot(2);
    });

    bindPress('btn-touch-slot3', () => {
      const player = window.csGame?.player;
      if (player && !player.isDead) player.selectSlot(3);
    });

    // Action / Plant / Defuse (E)
    bindPress(
      'btn-touch-use',
      () => {
        const player = window.csGame?.player;
        if (player && !player.isDead) player.keys['KeyE'] = true;
      },
      () => {
        const player = window.csGame?.player;
        if (player) player.keys['KeyE'] = false;
      }
    );

    // Pause / Lobby / Settings Menu
    bindPress('btn-touch-pause', () => {
      if (window.csGame) {
        window.csGame.togglePause();
      }
    });
  }
}

window.csTouch = new CSTouchController();
