/**
 * 3D Humanoid Bot Character Models & Realistic Tactical AI for Counter-Strike 1.6
 *
 * Implements:
 * 1. Health & Hitbox System:
 *    - 100 HP base health.
 *    - Distinct hitbox zones: Head (100+ lethal damage / headshot dink),
 *      Body (25-35 damage), Legs (15-20 damage).
 *    - Fatal damage handling: immediate stop of movement and firing,
 *      smooth ragdoll fall/collapse animation, authentic CS death groan sound,
 *      corpses remain on the floor until round reset.
 * 2. Ballistics & Rate of Fire:
 *    - Controlled 2-3 round bursts (110-140ms between shots in burst).
 *    - 500-700ms cooldown pause between bursts.
 *    - Realistic human reaction delay (250-400ms) upon sighting enemies.
 *    - Distance & movement based spread (ballistic dispersion).
 * 3. Living AI State Machine (CS 1.6 POD-Bot / Z-Bot):
 *    - PATROL/ROAM: Active map traversal via waypoint navigation graph,
 *      corner checking glances, and obstacle avoidance raycasts. Never stands still!
 *    - ENGAGE/STRAFE: Dynamic combat movement with stutter-stepping (stopping for bursts),
 *      lateral strafe direction changes every 1.0-1.5s, tactical crouching during sprays.
 *    - CHASE: When enemy disappears behind cover, sprints to last known enemy position.
 *    - RETREAT: Falls back behind cover when HP < 25, taking defensive suppressive shots.
 *    - Objective states: PLANT, DEFUSE, GUARD_BOMB.
 * 4. Audiovisuals:
 *    - 3D barrel muzzle flash sprites and light pulses on bot weapon when shooting.
 *    - High-visibility bullet tracers, wall decals, sparks, dust, and death sounds.
 */

class CSBot {
  constructor(id, name, team, scene, map) {
    this.id = id;
    this.name = name;
    this.team = team; // 'ct' or 't'
    this.scene = scene;
    this.map = map;
    this.isBot = true;

    // Health, Armor & Life State
    this.health = 100;
    this.armor = 100;
    this.isDead = false;
    this.kills = 0;
    this.deaths = 0;

    // Spatial & Movement
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.rotationY = 0;
    this.targetRotationY = 0;
    this.moveSpeed = 4.4;
    this.walkCycle = 0;
    this.isCrouching = false;

    // Tactical State Machine: 'PATROL', 'ENGAGE', 'CHASE', 'RETREAT', 'PLANT', 'DEFUSE', 'GUARD_BOMB', 'DEAD'
    this.state = 'PATROL';
    this.currentTarget = null;
    this.lastKnownEnemyPos = null;
    this.chaseTimer = 0;
    this.chaseLookTimer = 0;
    this.retreatTimer = 0;
    this.hasC4 = false;
    this.assignedSite = Math.random() > 0.5 ? 'site_a' : 'site_b';

    // Waypoint Navigation Graph & Pathfinding
    this.navPath = [];
    this.currentPathIndex = 0;
    this.targetWaypointId = null;
    this.patrolPauseTimer = 0;
    this.cornerCheckTimer = 0;
    this.cornerGlanceOffset = 0;

    // Combat Reaction & Firing Ballistics
    this.reactionDelay = 0.32;       // 250 - 400 ms reaction delay
    this.reactionTimer = 0;
    this.flinchTimer = 0;
    this.burstShotsRemaining = 0;
    this.burstCooldown = 0;          // 500 - 700 ms pause between bursts
    this.shotCooldown = 0;           // 110 - 140 ms between shots in a burst
    this.lastShotTime = 0;
    this.baseAccuracy = 0.52;
    this.headshotChance = 0.08;

    // Lateral Combat Strafing & Stutter-Step
    this.strafeTimer = 0;
    this.strafeDir = Math.random() > 0.5 ? 1 : -1;
    this.strafeInterval = 1.0 + Math.random() * 0.5; // 1.0 - 1.5s
    this.isStutterStopping = false;

    // Death Fall / Ragdoll Collapse
    this.isFalling = false;
    this.deathFallTimer = 0;
    this.deathFallDuration = 0.45;
    this.deathFallAngle = 0;
    this.deathFallAxis = 'forward'; // 'forward', 'back', 'side_left', 'side_right'
    this.deathKnockback = new THREE.Vector3();
    this.deathTwitchTimer = 0;
    this.deathTwitchDuration = 0;
    this.deathTwitchPhase = 0;
    this.isTwitching = false;
    this.hitZoneOnDeath = 'body';
    this.bloodPoolMesh = null;

    // Weapon Selection
    const sniperChance = Math.random();
    let chosenGun = this.team === 'ct' ? 'm4a1' : 'ak47';
    if (sniperChance < 0.18) chosenGun = 'scout';
    else if (sniperChance < 0.30) chosenGun = (this.team === 'ct' ? 'scar20' : 'awp');
    else if (sniperChance < 0.42) chosenGun = 'deagle';

    this.weapon = { ...(window.WEAPONS_DATA[chosenGun] || (this.team === 'ct' ? window.WEAPONS_DATA.m4a1 : window.WEAPONS_DATA.ak47)) };
    this.weapon.currentClip = this.weapon.clipSize || 30;
    this.weapon.reserve = this.weapon.maxAmmo || 90;

    // CS 1.6 Tagging & Z-Bot Reload Behavior
    this.taggingTimer = 0;
    this.isReloading = false;
    this.reloadTimer = 0;

    // 3D Hierarchy & Limbs
    this.meshGroup = new THREE.Group();
    this.hitboxes = [];
    this.hitboxMesh = null; // compatibility reference
    this.limbs = {};

    this.buildCharacterMesh();
    this.scene.add(this.meshGroup);
  }

  getCurrentSpeed() {
    // 48% speed reduction under fire (CS 1.6 Tagging)
    return this.moveSpeed * (this.taggingTimer > 0 ? 0.52 : 1.0);
  }

  setDifficulty(level) {
    switch (level) {
      case 'easy':
        this.baseAccuracy = 0.38;
        this.moveSpeed = 4.0;
        this.reactionDelay = 0.35; // 350ms
        this.headshotChance = 0.04;
        break;
      case 'normal':
        this.baseAccuracy = 0.52;
        this.moveSpeed = 4.4;
        this.reactionDelay = 0.30; // 300ms
        this.headshotChance = 0.08;
        break;
      case 'hard':
        this.baseAccuracy = 0.68;
        this.moveSpeed = 4.9;
        this.reactionDelay = 0.25; // 250ms
        this.headshotChance = 0.15;
        break;
    }
  }

  buildCharacterMesh() {
    const isCT = this.team === 'ct';
    const charSkin = window.CHARACTER_SKIN_SELECTION || 'default';
    const hasTextures = !!window.CSTextures;

    let headMat, bodyMat, vestMat, armMat, legMat;
    let isMinecraft = (charSkin === 'steve' || charSkin === 'creeper' || charSkin === 'diamond');

    if (charSkin === 'steve' && hasTextures) {
      const faceTex = window.CSTextures.getSteveFaceTexture();
      const shirtTex = window.CSTextures.getSteveShirtTexture();
      const pantsTex = window.CSTextures.getStevePantsTexture();
      headMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.8 });
      bodyMat = new THREE.MeshStandardMaterial({ map: shirtTex, roughness: 0.8 });
      vestMat = new THREE.MeshStandardMaterial({ color: 0x00838f, roughness: 0.6 });
      armMat = new THREE.MeshStandardMaterial({ map: shirtTex, roughness: 0.8 });
      legMat = new THREE.MeshStandardMaterial({ map: pantsTex, roughness: 0.8 });
    } else if (charSkin === 'creeper' && hasTextures) {
      const creeperTex = window.CSTextures.getCreeperTexture();
      headMat = new THREE.MeshStandardMaterial({ map: creeperTex, roughness: 0.85 });
      bodyMat = new THREE.MeshStandardMaterial({ map: creeperTex, roughness: 0.85 });
      vestMat = new THREE.MeshStandardMaterial({ map: creeperTex, roughness: 0.85 });
      armMat = new THREE.MeshStandardMaterial({ map: creeperTex, roughness: 0.85 });
      legMat = new THREE.MeshStandardMaterial({ map: creeperTex, roughness: 0.85 });
    } else if (charSkin === 'diamond' && hasTextures) {
      const diamondTex = window.CSTextures.getDiamondArmorTexture();
      headMat = new THREE.MeshStandardMaterial({ map: diamondTex, roughness: 0.4, metalness: 0.5 });
      bodyMat = new THREE.MeshStandardMaterial({ map: diamondTex, roughness: 0.4, metalness: 0.5 });
      vestMat = new THREE.MeshStandardMaterial({ map: diamondTex, roughness: 0.3, metalness: 0.6 });
      armMat = new THREE.MeshStandardMaterial({ map: diamondTex, roughness: 0.4, metalness: 0.5 });
      legMat = new THREE.MeshStandardMaterial({ map: diamondTex, roughness: 0.4, metalness: 0.5 });
    } else {
      // Classic CS 1.6 Tactical CT (SAS/SEAL navy) vs T (Guerilla/Phoenix olive-brown)
      const bodyColor = isCT ? 0x22313f : 0x4a4338;
      const vestColor = isCT ? 0x1a242f : 0x332c22;
      const skinColor = 0xd2a679;
      bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.8 });
      vestMat = new THREE.MeshStandardMaterial({ color: vestColor, roughness: 0.7, metalness: 0.1 });
      const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
      headMat = isCT ? new THREE.MeshStandardMaterial({ color: 0x1f2a36 }) : skinMat;
      armMat = bodyMat;
      legMat = new THREE.MeshStandardMaterial({ color: isCT ? 0x19232d : 0x3d3528 });
    }

    const gunMat = new THREE.MeshStandardMaterial({ color: 0x1e272c, metalness: 0.8, roughness: 0.3 });

    this.meshGroup.userData = { bot: this };

    // 1. Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.3), bodyMat);
    torso.position.y = 1.05;
    torso.castShadow = true;
    torso.userData = { bot: this, hitZone: 'body' };
    this.meshGroup.add(torso);
    this.limbs.torso = torso;

    // Tactical Vest on torso
    if (charSkin !== 'creeper') {
      const vest = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.5, 0.34), vestMat);
      vest.position.y = 1.08;
      vest.userData = { bot: this, hitZone: 'body' };
      this.meshGroup.add(vest);
      this.limbs.vest = vest;
    }

    // 2. Head
    const headGeom = new THREE.BoxGeometry(0.30, 0.30, 0.30);
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.y = 1.55;
    head.castShadow = true;
    head.userData = { bot: this, hitZone: 'head', isHead: true };
    this.meshGroup.add(head);
    this.limbs.head = head;

    if (!isMinecraft) {
      if (isCT) {
        // Ballistic Visor
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.05), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 }));
        visor.position.set(0, 1.55, -0.15);
        visor.userData = { bot: this, hitZone: 'head' };
        this.meshGroup.add(visor);
      } else {
        // Terrorist Balaclava Eye Slit
        const slit = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.02), new THREE.MeshBasicMaterial({ color: 0x111111 }));
        slit.position.set(0, 1.56, -0.145);
        slit.userData = { bot: this, hitZone: 'head' };
        this.meshGroup.add(slit);
      }
    }

    // 3. Arms (Left & Right)
    const armGeom = new THREE.BoxGeometry(0.14, 0.55, 0.14);
    const leftArm = new THREE.Mesh(armGeom, armMat);
    leftArm.position.set(-0.35, 1.05, 0);
    leftArm.userData = { bot: this, hitZone: 'body' };
    this.meshGroup.add(leftArm);
    this.limbs.leftArm = leftArm;

    const rightArm = new THREE.Mesh(armGeom, armMat);
    rightArm.position.set(0.35, 1.05, 0);
    rightArm.userData = { bot: this, hitZone: 'body' };
    this.meshGroup.add(rightArm);
    this.limbs.rightArm = rightArm;

    // 4. Legs (Left & Right)
    const legGeom = new THREE.BoxGeometry(0.18, 0.72, 0.18);
    const leftLeg = new THREE.Mesh(legGeom, legMat);
    leftLeg.position.set(-0.16, 0.36, 0);
    leftLeg.castShadow = true;
    leftLeg.userData = { bot: this, hitZone: 'legs' };
    this.meshGroup.add(leftLeg);
    this.limbs.leftLeg = leftLeg;

    const rightLeg = new THREE.Mesh(legGeom, legMat);
    rightLeg.position.set(0.16, 0.36, 0);
    rightLeg.castShadow = true;
    rightLeg.userData = { bot: this, hitZone: 'legs' };
    this.meshGroup.add(rightLeg);
    this.limbs.rightLeg = rightLeg;

    // 5. Weapon held in hands
    const weaponMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.65), gunMat);
    weaponMesh.position.set(0.2, 1.05, -0.35);
    weaponMesh.userData = { bot: this, hitZone: 'body' };
    this.meshGroup.add(weaponMesh);
    this.limbs.weapon = weaponMesh;

    // 6. 3D Muzzle Flash on bot weapon barrel
    const flashGeom = new THREE.PlaneGeometry(0.28, 0.28);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const flash1 = new THREE.Mesh(flashGeom, flashMat);
    const flash2 = new THREE.Mesh(flashGeom, flashMat);
    flash2.rotation.y = Math.PI / 2;
    const muzzleGroup = new THREE.Group();
    muzzleGroup.add(flash1);
    muzzleGroup.add(flash2);
    muzzleGroup.position.set(0, 0, -0.42); // tip of barrel
    weaponMesh.add(muzzleGroup);
    this.muzzleFlash = muzzleGroup;
    this.muzzleMat = flashMat;

    // 7. MULTI-ZONE HITBOXES (Head, Body/Chest, Legs)
    // Head Hitbox (Zone: 'head') -> 100+ damage / instant death
    const headHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.38, 0.38),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    headHitbox.position.y = 1.55;
    headHitbox.userData = { bot: this, hitZone: 'head', isHead: true };
    this.meshGroup.add(headHitbox);

    // Body/Chest Hitbox (Zone: 'body') -> 25-35 damage
    const bodyHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.65, 0.38),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    bodyHitbox.position.y = 1.05;
    bodyHitbox.userData = { bot: this, hitZone: 'body', isHead: false };
    this.meshGroup.add(bodyHitbox);

    // Legs Hitbox (Zone: 'legs') -> 15-20 damage
    const legsHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.72, 0.34),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    legsHitbox.position.y = 0.36;
    legsHitbox.userData = { bot: this, hitZone: 'legs', isHead: false };
    this.meshGroup.add(legsHitbox);

    this.hitboxes = [headHitbox, bodyHitbox, legsHitbox];
    this.hitboxMesh = bodyHitbox; // legacy fallback
  }

  spawn(spawnPoint) {
    const startY = (this.map && this.map.getGroundHeight)
      ? this.map.getGroundHeight(spawnPoint.x, spawnPoint.z, 0)
      : 0;

    this.position.set(spawnPoint.x, startY, spawnPoint.z);
    this.meshGroup.position.copy(this.position);
    this.velocity.set(0, 0, 0);

    this.health = 100;
    this.armor = 100;
    this.isDead = false;
    this.isFalling = false;
    this.isTwitching = false;
    this.deathTwitchTimer = 0;
    this.hitZoneOnDeath = 'body';
    this.isCrouching = false;
    this.meshGroup.visible = true;
    this.meshGroup.rotation.set(0, 0, 0);

    // Reset limbs rotations
    this.limbs.torso.rotation.set(0, 0, 0);
    this.limbs.torso.position.y = 1.05;
    this.limbs.head.rotation.set(0, 0, 0);
    this.limbs.leftLeg.rotation.set(0, 0, 0);
    this.limbs.rightLeg.rotation.set(0, 0, 0);
    this.limbs.leftArm.rotation.set(0, 0, 0);
    this.limbs.rightArm.rotation.set(0, 0, 0);

    // Enable hitboxes and meshes
    if (this.hitboxes) {
      this.hitboxes.forEach(h => {
        h.userData.disabled = false;
      });
    }
    if (this.meshGroup) {
      this.meshGroup.userData.disabled = false;
      this.meshGroup.traverse(child => {
        if (child.userData) child.userData.disabled = false;
      });
    }

    // Reset AI State
    this.state = 'PATROL';
    this.currentTarget = null;
    this.lastKnownEnemyPos = null;
    this.chaseTimer = 0;
    this.retreatTimer = 0;
    this.reactionTimer = 0;
    this.burstShotsRemaining = 0;
    this.burstCooldown = 0;
    this.shotCooldown = 0;
    this.flinchTimer = 0;
    this.taggingTimer = 0;
    this.isReloading = false;
    this.reloadTimer = 0;
    this.weapon.currentClip = this.weapon.clipSize || 30;
    this.patrolPauseTimer = 0;
    this.cornerCheckTimer = 0;
    this.cornerGlanceOffset = 0;

    // Pick initial tactical patrol objective
    this.pickNextPatrolDestination();
  }

  respawn(spawnPoint, weaponKey = null) {
    if (!weaponKey) {
      const weaponsPool = ['ak47', 'galil', 'deagle', 'm4a1', 'scout'];
      weaponKey = weaponsPool[Math.floor(Math.random() * weaponsPool.length)];
    }
    if (window.WEAPONS_DATA && window.WEAPONS_DATA[weaponKey]) {
      this.weapon = { ...window.WEAPONS_DATA[weaponKey] };
      this.weapon.currentClip = this.weapon.clipSize || 30;
      this.weapon.reserve = this.weapon.maxAmmo || 90;
    }
    this.spawn(spawnPoint);
    if (this.scene && !this.scene.children.includes(this.meshGroup)) {
      this.scene.add(this.meshGroup);
    }
    this.meshGroup.visible = true;
  }

  triggerEnemySpottedRadio() {
    const now = Date.now();
    if (!window.lastBotRadioSpotted || now - window.lastBotRadioSpotted > 7000) {
      window.lastBotRadioSpotted = now;
      if (window.csAudio && window.csAudio.speakRadio) {
        window.csAudio.speakRadio('Enemy spotted!');
      }
      if (window.csGame && window.csGame.showRadioSubtitle) {
        const spotMsg = window.csI18n ? window.csI18n.t('radio_enemy_spotted') : 'Враг замечен! (Enemy spotted!)';
        window.csGame.showRadioSubtitle(`${this.name}: ${spotMsg}`);
      }
    }
  }

  takeDamage(amount, isHeadshot = false, attacker = null, hitZone = 'body') {
    if (this.isDead) return;

    // CS Hitbox Damage System: Head (100+ lethal headshot), Body (30-35 dmg), Legs (25-28 dmg)
    let actualDamage = 34;
    if (hitZone === 'head' || isHeadshot) {
      actualDamage = 120; // Instant death
      isHeadshot = true;
    } else if (hitZone === 'legs') {
      actualDamage = 26;
    } else {
      actualDamage = Math.max(30, Math.min(35, Math.round(amount || 34))); // Strictly 30-35 body damage
    }

    this.health = Math.max(0, this.health - actualDamage);
    this.flinchTimer = 0.12;

    // GOLDSRC TAGGING: Taking damage cuts velocity and speed for 0.4 seconds
    this.taggingTimer = 0.4;
    this.velocity.x *= 0.52;
    this.velocity.z *= 0.52;

    // Retaliation & Target Acquisition
    if (attacker && !attacker.isDead && attacker.position) {
      this.currentTarget = attacker;
      this.lastKnownEnemyPos = attacker.position.clone();
      if (this.state !== 'RETREAT' && this.state !== 'PLANT' && this.state !== 'DEFUSE') {
        this.state = 'ENGAGE';
        // Faster retaliation upon being damaged
        this.reactionTimer = Math.min(this.reactionTimer, 0.25);
      }
    }

    // Critical HP (< 25) -> Trigger RETREAT behavior
    if (this.health > 0 && this.health < 25 && this.state === 'ENGAGE') {
      this.state = 'RETREAT';
      this.retreatTimer = 3.5 + Math.random() * 1.5;
    }

    if (this.health <= 0) {
      this.die(attacker, isHeadshot, hitZone);
    }
  }

  die(attacker, isHeadshot, hitZone = 'body') {
    if (this.isDead) return;
    this.isDead = true;
    this.deaths++;
    this.state = 'DEAD';
    this.velocity.set(0, 0, 0);
    this.currentTarget = null;
    this.burstShotsRemaining = 0;
    this.hitZoneOnDeath = hitZone || 'body';

    // Disable all hitboxes and meshes immediately so dead bodies never block future bullets
    if (this.hitboxes) {
      this.hitboxes.forEach(h => {
        h.userData.disabled = true;
      });
    }
    if (this.meshGroup) {
      this.meshGroup.userData.disabled = true;
      this.meshGroup.traverse(child => {
        if (child.userData) child.userData.disabled = true;
      });
    }

    // Play authentic CS 1.6 death sound
    if (window.csAudio && window.csAudio.playDeathSound) {
      window.csAudio.playDeathSound(isHeadshot);
    }

    // Drop C4 on the ground if carrying it
    if (this.hasC4 && window.csGame && window.csGame.dropBomb) {
      window.csGame.dropBomb(this.position.clone());
      this.hasC4 = false;
    }

    // --- Realistic ragdoll direction based on hitzone and attacker position ---
    const attackerPos = attacker ? attacker.position : null;
    let fallDir = 'forward'; // default: fall backward from shooter
    if (attackerPos) {
      const toBot = new THREE.Vector3().subVectors(this.position, attackerPos).normalize();
      const botFwd = new THREE.Vector3(-Math.sin(this.rotationY), 0, -Math.cos(this.rotationY));
      const dot = toBot.dot(botFwd);
      const cross = botFwd.x * toBot.z - botFwd.z * toBot.x;
      if (dot > 0.55) fallDir = 'back';       // shot from behind: slump forward
      else if (dot < -0.55) fallDir = 'forward'; // shot from front: fall backward
      else if (cross > 0) fallDir = 'side_left';
      else fallDir = 'side_right';
    }
    // Headshot: always collapse hard backward
    if (isHeadshot) fallDir = 'forward';
    this.deathFallAxis = fallDir;

    // Fall angles based on direction
    const angles = {
      forward:    { x: Math.PI / 2.1,  z: (Math.random() - 0.5) * 0.3 },
      back:       { x: -Math.PI / 2.2, z: (Math.random() - 0.5) * 0.2 },
      side_left:  { x: (Math.random() - 0.5) * 0.4, z: Math.PI / 2.3 },
      side_right: { x: (Math.random() - 0.5) * 0.4, z: -Math.PI / 2.3 }
    };
    this.deathFallAngleX = angles[fallDir].x;
    this.deathFallAngleZ = angles[fallDir].z;

    this.isFalling = true;
    this.deathFallTimer = 0;
    // Leg shot = slower collapse; headshot = fast violent drop
    this.deathFallDuration = isHeadshot ? 0.32 : (hitZone === 'legs' ? 0.72 : 0.50);

    // Knockback from bullet impact
    if (attackerPos) {
      const pushDir = new THREE.Vector3().subVectors(this.position, attackerPos);
      pushDir.y = 0;
      pushDir.normalize();
      this.deathKnockback = pushDir.multiplyScalar(isHeadshot ? 2.8 : (hitZone === 'legs' ? 0.6 : 1.3));
    } else {
      this.deathKnockback = new THREE.Vector3(0, 0, 0);
    }

    // Twitch / convulse after collapse (leg shot or body shot)
    if (!isHeadshot) {
      this.isTwitching = true;
      this.deathTwitchTimer = 0;
      this.deathTwitchDuration = 0.9 + Math.random() * 0.8; // 0.9 - 1.7s
      this.deathTwitchPhase = 0;
    }

    // Spawn blood pool under the body (appears after fall completes)
    if (window.csGame && window.csGame.createBloodPool) {
      const poolDelay = this.deathFallDuration * 1000;
      setTimeout(() => {
        if (window.csGame && window.csGame.createBloodPool) {
          window.csGame.createBloodPool(this.position.clone());
        }
      }, poolDelay);
    }

    // Spray gore blood burst at hit position
    if (window.csGame && window.csGame.createBloodSpurt) {
      const spurtPos = this.position.clone();
      spurtPos.y += (hitZone === 'head' ? 1.55 : hitZone === 'legs' ? 0.4 : 1.05);
      window.csGame.createBloodSpurt(spurtPos, isHeadshot);
    }

    window.csGame.handleBotDeath(this, attacker, isHeadshot);
  }

  update(delta, player, allBots) {
    // 1. If Dead: execute realistic multi-phase ragdoll then remain on ground
    if (this.isDead) {
      if (this.isFalling) {
        this.deathFallTimer += delta;
        const t = Math.min(1, this.deathFallTimer / this.deathFallDuration);
        // Elastic ease: fast start then bounce-settle
        const ease = t < 0.5
          ? 4 * t * t * t
          : 1 - Math.pow(-2 * t + 2, 3) / 2;

        // Apply fall direction angles to whole meshGroup rotation
        const targetAngleX = this.deathFallAngleX || Math.PI / 2.2;
        const targetAngleZ = this.deathFallAngleZ || 0;
        this.meshGroup.rotation.x = targetAngleX * ease;
        this.meshGroup.rotation.z = targetAngleZ * ease;

        // Independent limb articulation during fall
        const legSpread = ease;
        const hitZ = this.hitZoneOnDeath;
        // Head/torso area impact: arms flail outward
        this.limbs.leftArm.rotation.z  = (hitZ !== 'legs' ? 0.85 : 0.3)  * ease;
        this.limbs.rightArm.rotation.z = (hitZ !== 'legs' ? -0.85 : -0.3) * ease;
        this.limbs.leftArm.rotation.x  = (hitZ === 'head' ? -0.6 : 0.2)  * ease;
        this.limbs.rightArm.rotation.x = (hitZ === 'head' ? -0.6 : 0.2)  * ease;
        // Leg kick on fall
        this.limbs.leftLeg.rotation.x  = (hitZ === 'legs' ? -0.7 : -0.3) * ease;
        this.limbs.rightLeg.rotation.x = (hitZ === 'legs' ?  0.9 :  0.4) * ease;
        // Neck/head snap
        if (this.limbs.head) {
          this.limbs.head.rotation.x = (this.deathFallAngleX > 0 ? 0.45 : -0.45) * ease;
        }

        // Sink toward ground
        const groundY = (this.map && this.map.getGroundHeight)
          ? this.map.getGroundHeight(this.position.x, this.position.z, this.position.y)
          : 0;
        this.meshGroup.position.y = THREE.MathUtils.lerp(this.meshGroup.position.y, groundY, ease);

        // Slide from knockback
        if (this.deathKnockback.lengthSq() > 0.01) {
          this.position.x += this.deathKnockback.x * delta * (1 - ease) * 1.5;
          this.position.z += this.deathKnockback.z * delta * (1 - ease) * 1.5;
          this.meshGroup.position.x = this.position.x;
          this.meshGroup.position.z = this.position.z;
        }

        if (t >= 1) {
          this.isFalling = false;
        }
      }

      // Twitching phase: convulsive micro-spasms after collapse
      if (this.isTwitching) {
        this.deathTwitchTimer += delta;
        const tp = this.deathTwitchTimer / this.deathTwitchDuration;
        const decay = 1 - tp; // gradually weaker
        const spasm = Math.sin(this.deathTwitchTimer * 18) * 0.08 * decay;
        const spasm2 = Math.cos(this.deathTwitchTimer * 22) * 0.06 * decay;
        if (this.limbs.leftLeg)  this.limbs.leftLeg.rotation.z  += spasm;
        if (this.limbs.rightLeg) this.limbs.rightLeg.rotation.z -= spasm * 0.7;
        if (this.limbs.leftArm)  this.limbs.leftArm.rotation.x  += spasm2;
        if (this.limbs.rightArm) this.limbs.rightArm.rotation.x -= spasm2;
        if (tp >= 1) this.isTwitching = false;
      }

      return;
    }

    // 2. Flinch, Tagging, Reload & Cooldown decay
    if (this.flinchTimer > 0) this.flinchTimer -= delta;
    if (this.taggingTimer > 0) this.taggingTimer -= delta;
    if (this.burstCooldown > 0) this.burstCooldown -= delta;
    if (this.shotCooldown > 0) this.shotCooldown -= delta;

    if (this.isReloading) {
      this.reloadTimer -= delta;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        this.weapon.currentClip = this.weapon.clipSize || 30;
      }
    }

    // Strict dead-player check: if player is dead or invalid, immediately drop targeting and return to patrol
    if (!player || player.isDead) {
      if (this.currentTarget === player) {
        this.currentTarget = null;
        this.burstShotsRemaining = 0;
        this.state = 'PATROL';
        this.isCrouching = false;
        if (this.pickNextPatrolDestination) this.pickNextPatrolDestination();
      }
    }

    // 3. Scan for enemies / update line of sight
    this.scanForTargets(player, allBots);

    // 4. Finite State Machine Execution
    switch (this.state) {
      case 'PATROL':
        this.updatePatrol(delta);
        break;
      case 'ENGAGE':
        this.updateEngage(delta);
        break;
      case 'CHASE':
        this.updateChase(delta);
        break;
      case 'RETREAT':
        this.updateRetreat(delta);
        break;
      case 'PLANT':
        this.updatePlant(delta);
        break;
      case 'DEFUSE':
        this.updateDefuse(delta);
        break;
      case 'GUARD_BOMB':
        this.updateGuardBomb(delta);
        break;
    }

    // 5. Ground Height Clamping
    const groundY = (this.map && this.map.getGroundHeight)
      ? this.map.getGroundHeight(this.position.x, this.position.z, this.position.y)
      : 0;
    this.position.y = THREE.MathUtils.lerp(this.position.y, groundY, delta * 14);

    // 6. Smooth Facing Rotation with Corner Glance Offset
    const finalRotY = this.targetRotationY + this.cornerGlanceOffset;
    this.meshGroup.rotation.y = THREE.MathUtils.lerp(this.meshGroup.rotation.y, finalRotY, delta * 9);

    // 7. Procedural Stride / Walk Cycle Animation
    if (this.velocity.lengthSq() > 0.08) {
      this.walkCycle += delta * (this.isCrouching ? 6 : 11);
      const stride = this.isCrouching ? 0.3 : 0.55;
      this.limbs.leftLeg.rotation.x = Math.sin(this.walkCycle) * stride;
      this.limbs.rightLeg.rotation.x = -Math.sin(this.walkCycle) * stride;
      this.limbs.leftArm.rotation.x = -Math.sin(this.walkCycle) * (stride * 0.8);
      this.limbs.rightArm.rotation.x = Math.sin(this.walkCycle) * (stride * 0.8);
    } else {
      this.limbs.leftLeg.rotation.x = 0;
      this.limbs.rightLeg.rotation.x = 0;
      this.limbs.leftArm.rotation.x = 0;
      this.limbs.rightArm.rotation.x = 0;
    }

    // 8. Crouching Visual Adjustment
    const targetTorsoY = this.isCrouching ? 0.82 : 1.05;
    this.limbs.torso.position.y = THREE.MathUtils.lerp(this.limbs.torso.position.y, targetTorsoY, delta * 12);
  }

  scanForTargets(player, allBots) {
    // If engaged, verify current target is still active, valid and visible
    if (this.currentTarget) {
      if (this.currentTarget.isDead || !this.currentTarget.position || (this.currentTarget === player && (!player || player.isDead))) {
        this.currentTarget = null;
        this.burstShotsRemaining = 0;
        this.state = 'PATROL';
        this.pickNextPatrolDestination();
        return;
      }

      const dist = this.position.distanceTo(this.currentTarget.position);
      const canSee = this.hasLineOfSight(this.currentTarget.position);

      if (dist > 65) {
        this.currentTarget = null;
        this.burstShotsRemaining = 0;
        this.state = 'PATROL';
        this.pickNextPatrolDestination();
        return;
      }

      if (!canSee) {
        // Lost line of sight! Switch to CHASE mode towards last known position
        if (this.lastKnownEnemyPos && this.state !== 'RETREAT') {
          this.state = 'CHASE';
          this.chaseTimer = 4.2;
          this.chaseLookTimer = 0;
          this.burstShotsRemaining = 0;
          return;
        }
      } else {
        // Target is visible, update memory position
        this.lastKnownEnemyPos = this.currentTarget.position.clone();
      }
      return;
    }

    // Don't interrupt plant or defuse unless enemy is directly in face (< 6m)
    if (this.state === 'PLANT') return;
    if (this.state === 'DEFUSE') {
      if (player && !player.isDead && player.position && player.team !== this.team) {
        if (this.position.distanceTo(player.position) < 6.0 && this.hasLineOfSight(player.position)) {
          this.currentTarget = player;
          this.state = 'ENGAGE';
          this.isDefusing = false;
        }
      }
      return;
    }

    // Scan for Player
    if (player && !player.isDead && player.position && player.team !== this.team) {
      const dist = this.position.distanceTo(player.position);
      if (dist < 54 && this.hasLineOfSight(player.position)) {
        this.currentTarget = player;
        this.lastKnownEnemyPos = player.position.clone();
        this.state = 'ENGAGE';
        // Authentic Z-Bot human reaction delay (250 - 350 ms) before opening fire
        this.reactionTimer = 0.25 + Math.random() * 0.10;
        this.triggerEnemySpottedRadio();
        return;
      }
    }

    // Scan for Enemy Bots
    if (allBots && Array.isArray(allBots)) {
      for (const otherBot of allBots) {
        if (!otherBot || otherBot === this || otherBot.isDead || !otherBot.position || otherBot.team === this.team) continue;
        const dist = this.position.distanceTo(otherBot.position);
        if (dist < 48 && this.hasLineOfSight(otherBot.position)) {
          this.currentTarget = otherBot;
          this.lastKnownEnemyPos = otherBot.position.clone();
          this.state = 'ENGAGE';
          this.reactionTimer = 0.25 + Math.random() * 0.10; // 250 - 350 ms
          return;
        }
      }
    }
  }

  hasLineOfSight(targetPos) {
    if (!targetPos || typeof targetPos.x !== 'number' || typeof targetPos.z !== 'number') return false;
    const startY = this.position.y + (this.isCrouching ? 1.05 : 1.45);
    const targetY = (targetPos.y !== undefined ? targetPos.y : 0) + 1.25;
    const from = new THREE.Vector3(this.position.x, startY, this.position.z);
    const to = new THREE.Vector3(targetPos.x, targetY, targetPos.z);
    const distToTarget = from.distanceTo(to);
    if (distToTarget < 0.4) return true;

    const dir = new THREE.Vector3().subVectors(to, from).normalize();
    const ray = new THREE.Ray(from, dir);
    const hitPoint = new THREE.Vector3();

    if (this.map && this.map.colliders) {
      for (const box of this.map.colliders) {
        if (box.max.y <= Math.min(startY, targetY) - 0.25) continue;
        if (ray.intersectBox(box, hitPoint)) {
          const distToHit = from.distanceTo(hitPoint);
          if (distToHit > 0.6 && distToHit < distToTarget - 0.5) {
            return false;
          }
        }
      }
    }
    return true;
  }

  // =========================================================================
  // STATE 1: PATROL & ACTIVE MAP ROAMING (WAYPOINT NAVIGATION + AVOIDANCE)
  // =========================================================================
  pickNextPatrolDestination() {
    if (!this.map || !this.map.waypoints || this.map.waypoints.length === 0) return;

    // Pick a tactical destination based on team and objectives
    const isCT = this.team === 'ct';
    const siteAId = 'site_a';
    const siteBId = 'site_b';
    const candidates = [];

    if (isCT) {
      // CTs patrol between bombsite A, B, and Mid entry chokes
      candidates.push('site_a', 'site_b', 'mid_entry_ct', 'mid_center', 'ct_to_a', 'ct_to_b');
    } else {
      // Ts roam towards sites or mid
      candidates.push('site_a', 'site_b', 'mid_center', 'mid_entry_t', 'b_shore_path', 'a_path_lower');
    }

    const chosenId = candidates[Math.floor(Math.random() * candidates.length)];
    this.targetWaypointId = chosenId;
    this.navPath = this.findPathToWaypoint(chosenId);
    this.currentPathIndex = 0;
  }

  findPathToWaypoint(targetId) {
    if (!this.map || !this.map.waypoints || !this.map.navConnections) return [];

    // Find nearest waypoint to bot's current position
    let nearestId = null;
    let minDist = Infinity;
    for (const wp of this.map.waypoints) {
      const d = Math.hypot(wp.x - this.position.x, wp.z - this.position.z);
      if (d < minDist) {
        minDist = d;
        nearestId = wp.id;
      }
    }

    if (!nearestId || nearestId === targetId) {
      const targetWp = this.map.waypoints.find(w => w.id === targetId);
      return targetWp ? [targetWp] : [];
    }

    // Breadth-First-Search (BFS) pathfinding on navConnections graph
    const queue = [[nearestId]];
    const visited = new Set([nearestId]);

    while (queue.length > 0) {
      const path = queue.shift();
      const curr = path[path.length - 1];

      if (curr === targetId) {
        return path.map(id => this.map.waypoints.find(w => w.id === id)).filter(Boolean);
      }

      const neighbors = this.map.navConnections[curr] || [];
      for (const n of neighbors) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push([...path, n]);
        }
      }
    }

    // Fallback direct target
    const targetWp = this.map.waypoints.find(w => w.id === targetId);
    return targetWp ? [targetWp] : [];
  }

  updatePatrol(delta) {
    this.isCrouching = false;

    // 1. Objectives override
    if (this.team === 'ct' && window.csGame.isBombPlanted && !window.csGame.isBombDefused) {
      this.state = 'DEFUSE';
      return;
    }
    if (this.team === 't' && window.csGame.isBombPlanted && !window.csGame.isBombDefused) {
      this.state = 'GUARD_BOMB';
      return;
    }
    if (this.team === 't' && !this.hasC4 && window.csGame.droppedBombPos && !window.csGame.isBombPlanted) {
      const dropPos = window.csGame.droppedBombPos;
      const dx = dropPos.x - this.position.x;
      const dz = dropPos.z - this.position.z;
      const distDrop = Math.hypot(dx, dz);
      if (distDrop > 1.8) {
        this.targetRotationY = Math.atan2(dx, dz) + Math.PI;
        const dir = new THREE.Vector3(dx, 0, dz).normalize();
        this.velocity.copy(dir).multiplyScalar(this.getCurrentSpeed());
        this.position.x += this.velocity.x * delta;
        this.position.z += this.velocity.z * delta;
        this.meshGroup.position.copy(this.position);
        return;
      } else {
        window.csGame.pickUpBomb(this);
        return;
      }
    }

    // 2. Corner checking glance
    this.cornerCheckTimer += delta;
    if (this.cornerCheckTimer > 3.0 + Math.random() * 2.0) {
      this.cornerCheckTimer = 0;
      this.cornerGlanceOffset = (Math.random() - 0.5) * 0.7; // glance 40 degrees
      setTimeout(() => { this.cornerGlanceOffset = 0; }, 450);
    }

    // 3. Move along navPath
    if (!this.navPath || this.navPath.length === 0 || this.currentPathIndex >= this.navPath.length) {
      this.pickNextPatrolDestination();
      return;
    }

    const nextWp = this.navPath[this.currentPathIndex];
    const dx = nextWp.x - this.position.x;
    const dz = nextWp.z - this.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 2.0) {
      this.currentPathIndex++;
      if (this.currentPathIndex >= this.navPath.length) {
        // Reached destination!
        if (this.team === 't' && this.hasC4 && (nextWp.id === 'site_a' || nextWp.id === 'site_b') && !window.csGame.isBombPlanted) {
          this.state = 'PLANT';
          this.plantTimer = 0;
          return;
        }
        // Pick new patrol path immediately so bot NEVER freezes!
        this.pickNextPatrolDestination();
      }
      return;
    }

    // Compute desired movement vector
    const moveDir = new THREE.Vector3(dx, 0, dz).normalize();

    // Raycast obstacle avoidance steering
    const avoidDir = this.computeObstacleAvoidance(moveDir);
    const finalDir = moveDir.clone().add(avoidDir.multiplyScalar(0.7)).normalize();

    this.targetRotationY = Math.atan2(finalDir.x, finalDir.z) + Math.PI;
    this.velocity.copy(finalDir).multiplyScalar(this.getCurrentSpeed());
    this.position.x += this.velocity.x * delta;
    this.position.z += this.velocity.z * delta;
    this.meshGroup.position.copy(this.position);
  }

  computeObstacleAvoidance(desiredDir) {
    const avoid = new THREE.Vector3(0, 0, 0);
    if (!this.map || !this.map.colliders) return avoid;

    const waistY = this.position.y + 0.9;
    const forwardRay = new THREE.Ray(new THREE.Vector3(this.position.x, waistY, this.position.z), desiredDir);
    const hitPoint = new THREE.Vector3();

    for (const box of this.map.colliders) {
      if (box.max.y < waistY - 0.3) continue;
      if (forwardRay.intersectBox(box, hitPoint)) {
        const d = this.position.distanceTo(hitPoint);
        if (d < 1.4) {
          // Obstacle directly ahead, steer perpendicular
          avoid.set(-desiredDir.z, 0, desiredDir.x);
          break;
        }
      }
    }
    return avoid;
  }

  // =========================================================================
  // STATE 2: ENGAGE (STRAFE, COUNTER-STRAFE PRE-FIRE, CROUCH, BURSTS & RELOAD)
  // =========================================================================
  updateEngage(delta) {
    if (!this.currentTarget || this.currentTarget.isDead || !this.currentTarget.position) {
      this.state = 'PATROL';
      this.currentTarget = null;
      this.burstShotsRemaining = 0;
      this.isCrouching = false;
      this.pickNextPatrolDestination();
      return;
    }

    // If reloading: actively seek cover and evasively strafe!
    if (this.isReloading) {
      this.updateReloadManeuver(delta);
      return;
    }

    const dx = this.currentTarget.position.x - this.position.x;
    const dz = this.currentTarget.position.z - this.position.z;
    const dist = Math.hypot(dx, dz);

    // Aim smoothly at target
    this.targetRotationY = Math.atan2(dx, dz) + Math.PI;

    // Reaction delay before opening fire (authentic 250-350 ms human reaction window)
    if (this.reactionTimer > 0) {
      this.reactionTimer -= delta;
      return;
    }

    // Counter-strafe dead stop & crouch before & during burst fire
    if (this.burstShotsRemaining > 0) {
      // Actively firing: PRE-FIRE COUNTER-STRAFE DEAD STOP & CROUCH!
      this.velocity.set(0, 0, 0);
      this.isCrouching = true;
      this.isStutterStopping = true;
    } else {
      // Cooldown pause between bursts (500-700ms): Stand up and STRAFE actively!
      this.isStutterStopping = false;
      this.isCrouching = false;

      this.strafeTimer += delta;
      if (this.strafeTimer > this.strafeInterval) {
        this.strafeTimer = 0;
        this.strafeDir *= -1;
        this.strafeInterval = 0.9 + Math.random() * 0.5; // switch every 0.9 - 1.4s
      }

      let moveVec = new THREE.Vector3();
      if (dist > 22) {
        // Advance diagonally towards target
        const fwd = new THREE.Vector3(dx, 0, dz).normalize();
        const side = new THREE.Vector3(-dz, 0, dx).normalize().multiplyScalar(this.strafeDir);
        moveVec.addVectors(fwd.multiplyScalar(0.6), side.multiplyScalar(0.7)).normalize();
      } else if (dist < 6) {
        // Backpedal diagonally
        const back = new THREE.Vector3(-dx, 0, -dz).normalize();
        const side = new THREE.Vector3(-dz, 0, dx).normalize().multiplyScalar(this.strafeDir);
        moveVec.addVectors(back.multiplyScalar(0.7), side.multiplyScalar(0.6)).normalize();
      } else {
        // Pure lateral ADAD strafing
        moveVec.set(-dz, 0, dx).normalize().multiplyScalar(this.strafeDir);
      }

      this.velocity.copy(moveVec).multiplyScalar(this.getCurrentSpeed() * 0.75);
      this.position.x += this.velocity.x * delta;
      this.position.z += this.velocity.z * delta;
      this.meshGroup.position.copy(this.position);
    }

    // Firing execution
    this.executeBotFiring(dist);
  }

  executeBotFiring(dist) {
    if (!this.currentTarget || this.currentTarget.isDead || !this.currentTarget.position) {
      this.currentTarget = null;
      this.burstShotsRemaining = 0;
      this.state = 'PATROL';
      return;
    }

    const now = performance.now() / 1000;

    // Check if clip is depleted -> Trigger Z-Bot reload behavior
    if (this.weapon.currentClip <= 0) {
      this.startReload();
      return;
    }

    // Check if new burst should be started
    if (this.burstShotsRemaining <= 0) {
      if (this.burstCooldown <= 0) {
        // PRE-FIRE TACTICAL ACTION: Counter-strafe dead stop + crouch for accuracy!
        this.velocity.set(0, 0, 0);
        this.isCrouching = true;

        // Start 2-3 round controlled burst!
        this.burstShotsRemaining = 2 + Math.floor(Math.random() * 2); // strictly 2 or 3 shots
        this.shotCooldown = 0;
      } else {
        return; // Waiting out the 500-700ms cooldown pause
      }
    }

    // Execute single shot within burst
    if (this.burstShotsRemaining > 0 && this.shotCooldown <= 0) {
      this.burstShotsRemaining--;
      this.weapon.currentClip = Math.max(0, this.weapon.currentClip - 1);
      // 110 - 140 ms between shots in a burst
      this.shotCooldown = 0.11 + Math.random() * 0.03;
      this.lastShotTime = now;

      // Ensure bot remains stationary & crouched while firing
      this.velocity.set(0, 0, 0);
      this.isCrouching = true;

      if (this.burstShotsRemaining === 0) {
        // Burst finished! Apply 500-700 ms pause cooldown
        this.burstCooldown = 0.50 + Math.random() * 0.20;
        this.isCrouching = false; // Stand up after burst to strafe
      }

      this.fireBullet(dist);
    }
  }

  startReload() {
    if (this.isReloading) return;
    this.isReloading = true;
    this.reloadTimer = this.weapon.reloadTime || 2.4;
    this.isCrouching = false; // Stand up for mobility
    this.burstShotsRemaining = 0;

    // Play reload sound if within audible range of player
    if (window.csAudio && window.csGame && window.csGame.player && window.csGame.player.position && !window.csGame.player.isDead) {
      const distToPlayer = this.position.distanceTo(window.csGame.player.position);
      if (distToPlayer < 26) {
        window.csAudio.playReload();
      }
    }
  }

  updateReloadManeuver(delta) {
    // Evasive strafing & seeking cover while reloading
    this.isCrouching = false;
    this.strafeTimer += delta;
    if (this.strafeTimer > 0.5) {
      this.strafeTimer = 0;
      this.strafeDir *= -1; // Rapid evasive zigzag
    }

    if (this.currentTarget && this.currentTarget.position && !this.currentTarget.isDead) {
      const dx = this.currentTarget.position.x - this.position.x;
      const dz = this.currentTarget.position.z - this.position.z;
      // Perpendicular evasive vector + backpedal away from danger
      const side = new THREE.Vector3(-dz, 0, dx).normalize().multiplyScalar(this.strafeDir);
      const back = new THREE.Vector3(-dx, 0, -dz).normalize().multiplyScalar(0.7);
      const evadeDir = new THREE.Vector3().addVectors(side, back).normalize();

      this.velocity.copy(evadeDir).multiplyScalar(this.getCurrentSpeed() * 0.95);
      this.position.x += this.velocity.x * delta;
      this.position.z += this.velocity.z * delta;
      this.meshGroup.position.copy(this.position);
    }
  }

  fireBullet(dist) {
    if (!this.currentTarget || this.currentTarget.isDead || !this.currentTarget.position) return;

    // 1. Play authentic weapon sound
    if (this.weapon.id === 'awp') {
      window.csAudio.playAWP();
    } else if (this.weapon.id === 'scout') {
      window.csAudio.playScout();
    } else if (this.weapon.id === 'scar20') {
      window.csAudio.playScar20();
    } else if (this.weapon.id === 'deagle') {
      window.csAudio.playDeagle();
    } else if (this.weapon.id === 'galil') {
      window.csAudio.playAK47();
    } else if (this.team === 'ct') {
      window.csAudio.playM4A1(false);
    } else {
      window.csAudio.playAK47();
    }

    // 2. Visual 3D Muzzle Flash on gun barrel
    if (this.muzzleMat) {
      this.muzzleMat.opacity = 1.0;
      this.muzzleFlash.rotation.z = Math.random() * Math.PI;
      setTimeout(() => {
        if (this.muzzleMat) this.muzzleMat.opacity = 0;
      }, 40);
    }

    // 3. Gun muzzle position in world space for tracer
    const muzzlePos = new THREE.Vector3(
      this.position.x + Math.sin(this.meshGroup.rotation.y + 0.22) * 0.65,
      this.position.y + (this.isCrouching ? 0.95 : 1.2),
      this.position.z + Math.cos(this.meshGroup.rotation.y + 0.22) * 0.65
    );

    // 4. Realistic Ballistics & Spread Calculation
    let spreadAngle = 0.032; // base spread
    if (this.velocity.lengthSq() > 0.1) spreadAngle += 0.038; // movement spread penalty
    if (this.burstShotsRemaining > 0) spreadAngle += 0.015;   // burst bloom
    if (this.isCrouching) spreadAngle *= 0.65;                // crouching bonus
    if (this.flinchTimer > 0) spreadAngle += 0.04;            // flinch penalty

    // Target Aim Point: chest level with headshot probability
    const aimForHead = (Math.random() < this.headshotChance);
    const targetAimY = this.currentTarget.position.y + (aimForHead ? 1.55 : 1.15);
    const targetPoint = new THREE.Vector3(
      this.currentTarget.position.x,
      targetAimY,
      this.currentTarget.position.z
    );

    // Spread deflection offset
    const spreadOffset = new THREE.Vector3(
      (Math.random() - 0.5) * spreadAngle * dist * 1.6,
      (Math.random() - 0.5) * spreadAngle * dist * 1.2,
      (Math.random() - 0.5) * spreadAngle * dist * 1.6
    );
    const finalImpactTarget = targetPoint.clone().add(spreadOffset);

    // Determine hit against target
    const distToSpreadTarget = finalImpactTarget.distanceTo(targetPoint);
    const isDirectHit = distToSpreadTarget < 0.65; // Hit cylinder envelope

    if (isDirectHit) {
      // Determine Hit Zone (Head, Body, Legs)
      const hitHeight = finalImpactTarget.y - this.currentTarget.position.y;
      let hitZone = 'body';
      let isHeadshot = false;

      if (hitHeight > 1.40 || aimForHead) {
        hitZone = 'head';
        isHeadshot = true;
      } else if (hitHeight < 0.70) {
        hitZone = 'legs';
      }

      // Compute Damage with CS 1.6 Hitbox Multipliers: Head x4 (100+ lethal), Body 1.0, Legs 0.75
      const baseDmg = this.weapon.damage || 32;
      let dmg = baseDmg;
      if (hitZone === 'head') {
        dmg = Math.max(105, baseDmg * 4.0); // 100+ lethal headshot
      } else if (hitZone === 'legs') {
        dmg = Math.round(baseDmg * 0.75); // 0.75 multiplier (15-20 damage)
      } else {
        dmg = Math.round(baseDmg * 1.0);  // 1.0 multiplier (25-35 damage)
      }

      // Tracer to target
      if (window.csGame && window.csGame.createBulletTracer) {
        window.csGame.createBulletTracer(muzzlePos, finalImpactTarget);
      }

      // Deliver damage to target (Player or Enemy Bot)
      if (this.currentTarget && !this.currentTarget.isDead && typeof this.currentTarget.takeDamage === 'function') {
        this.currentTarget.takeDamage(dmg, isHeadshot, this, hitZone);
      }
      if (window.csGame && window.csGame.createBloodSpurt) {
        window.csGame.createBloodSpurt(finalImpactTarget, isHeadshot);
      }
    } else {
      // Bullet Missed: Raycast to wall/environment
      const rayDir = new THREE.Vector3().subVectors(finalImpactTarget, muzzlePos).normalize();
      const missRay = new THREE.Ray(muzzlePos, rayDir);
      let hitDist = dist + 15;
      let hitNormal = new THREE.Vector3(0, 1, 0);
      let hitPos = finalImpactTarget.clone();

      if (this.map && this.map.colliders) {
        const testHit = new THREE.Vector3();
        for (const box of this.map.colliders) {
          if (missRay.intersectBox(box, testHit)) {
            const d = muzzlePos.distanceTo(testHit);
            if (d < hitDist) {
              hitDist = d;
              hitPos.copy(testHit);
            }
          }
        }
      }

      // Visual tracer
      if (window.csGame && window.csGame.createBulletTracer) {
        window.csGame.createBulletTracer(muzzlePos, hitPos);
      }

      // Bullet whiz sound near player
      if (this.currentTarget === window.csGame?.player && window.csGame?.player?.position && !window.csGame?.player?.isDead) {
        if (finalImpactTarget.distanceTo(window.csGame.player.position) < 3.2) {
          window.csAudio.playBulletWhiz();
        }
      }

      // Wall decal, sparks & dust
      if (hitPos.y <= 0.1 && hitPos.x < -30 && window.csGame.createWaterSplash) {
        window.csGame.createWaterSplash(hitPos);
        window.csAudio.playWaterSplash();
      } else if (window.csGame) {
        if (window.csGame.createBulletDecal) window.csGame.createBulletDecal(hitPos, hitNormal);
        if (window.csGame.createSparks) window.csGame.createSparks(hitPos, hitNormal);
        if (window.csGame.createDustPuff) window.csGame.createDustPuff(hitPos, hitNormal);
        window.csAudio.playWallHit();
      }
    }
  }

  // =========================================================================
  // STATE 3: CHASE (PURSUING ENEMY WHO BROKE LINE OF SIGHT)
  // =========================================================================
  updateChase(delta) {
    this.isCrouching = false;
    this.chaseTimer -= delta;

    if (!this.lastKnownEnemyPos || this.chaseTimer <= 0) {
      this.state = 'PATROL';
      this.pickNextPatrolDestination();
      return;
    }

    const dx = this.lastKnownEnemyPos.x - this.position.x;
    const dz = this.lastKnownEnemyPos.z - this.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 1.8) {
      // Run swiftly to last known spot
      const dir = new THREE.Vector3(dx, 0, dz).normalize();
      this.targetRotationY = Math.atan2(dx, dz) + Math.PI;
      this.velocity.copy(dir).multiplyScalar(this.getCurrentSpeed() * 1.05);
      this.position.x += this.velocity.x * delta;
      this.position.z += this.velocity.z * delta;
      this.meshGroup.position.copy(this.position);
    } else {
      // Reached last known point: search area for 1.5s
      this.velocity.set(0, 0, 0);
      this.chaseLookTimer += delta;
      this.targetRotationY += Math.sin(this.chaseLookTimer * 3) * delta * 2;
      if (this.chaseLookTimer > 1.5) {
        this.state = 'PATROL';
        this.pickNextPatrolDestination();
      }
    }
  }

  // =========================================================================
  // STATE 4: RETREAT (FALL BACK WHEN CRITICAL HP < 25)
  // =========================================================================
  updateRetreat(delta) {
    this.retreatTimer -= delta;
    if (this.retreatTimer <= 0 || !this.currentTarget || this.currentTarget.isDead || !this.currentTarget.position) {
      this.state = 'PATROL';
      this.currentTarget = null;
      this.burstShotsRemaining = 0;
      this.pickNextPatrolDestination();
      return;
    }

    // Run in opposite direction of attacker
    const dx = this.position.x - this.currentTarget.position.x;
    const dz = this.position.z - this.currentTarget.position.z;
    const retreatDir = new THREE.Vector3(dx, 0, dz).normalize();

    this.targetRotationY = Math.atan2(retreatDir.x, retreatDir.z) + Math.PI;
    this.velocity.copy(retreatDir).multiplyScalar(this.getCurrentSpeed() * 1.0);
    this.position.x += this.velocity.x * delta;
    this.position.z += this.velocity.z * delta;
    this.meshGroup.position.copy(this.position);

    // Suppressive defensive potshots while retreating
    if (this.hasLineOfSight(this.currentTarget.position) && this.burstCooldown <= 0) {
      this.executeBotFiring(this.position.distanceTo(this.currentTarget.position));
    }
  }

  // =========================================================================
  // OBJECTIVE STATES: PLANT, DEFUSE, GUARD_BOMB
  // =========================================================================
  updatePlant(delta) {
    if (window.csGame.isBombPlanted || !this.hasC4) {
      this.state = 'PATROL';
      this.isCrouching = false;
      return;
    }

    this.velocity.set(0, 0, 0);
    this.isCrouching = true;
    this.plantTimer = (this.plantTimer || 0) + delta;

    this.plantBeepTimer = (this.plantBeepTimer || 0) + delta;
    if (this.plantBeepTimer > 0.45) {
      this.plantBeepTimer = 0;
      if (window.csAudio && window.csAudio.playC4KeypadPress) {
        window.csAudio.playC4KeypadPress();
      }
    }

    if (this.plantTimer >= 3.2) {
      const siteLetter = this.assignedSite === 'site_a' ? 'A' : 'B';
      window.csGame.plantBomb(this.position.clone(), siteLetter, this);
      this.hasC4 = false;
      this.isCrouching = false;
      this.state = 'GUARD_BOMB';
      this.plantTimer = 0;
    }
  }

  updateGuardBomb(delta) {
    if (!window.csGame.isBombPlanted || window.csGame.isBombDefused) {
      this.state = 'PATROL';
      this.pickNextPatrolDestination();
      return;
    }

    const bombPos = window.csGame.plantedBombPos;
    if (!bombPos) return;

    const dx = bombPos.x - this.position.x;
    const dz = bombPos.z - this.position.z;
    const distToBomb = Math.hypot(dx, dz);

    if (distToBomb > 14) {
      const moveDir = new THREE.Vector3(dx, 0, dz).normalize();
      this.targetRotationY = Math.atan2(dx, dz) + Math.PI;
      this.velocity.copy(moveDir).multiplyScalar(this.getCurrentSpeed() * 0.7);
      this.position.x += this.velocity.x * delta;
      this.position.z += this.velocity.z * delta;
      this.meshGroup.position.copy(this.position);
    } else {
      this.guardAngleTimer = (this.guardAngleTimer || 0) + delta;
      if (this.guardAngleTimer > 2.2) {
        this.guardAngleTimer = 0;
        this.targetRotationY += (Math.random() - 0.5) * Math.PI;
      }
      this.velocity.set(0, 0, 0);
    }
  }

  updateDefuse(delta) {
    if (!window.csGame.isBombPlanted || window.csGame.isBombDefused) {
      this.state = 'PATROL';
      this.isDefusing = false;
      this.defuseTimer = 0;
      this.isCrouching = false;
      this.pickNextPatrolDestination();
      return;
    }

    const bombPos = window.csGame.plantedBombPos;
    if (!bombPos) return;

    const dx = bombPos.x - this.position.x;
    const dz = bombPos.z - this.position.z;
    const distToBomb = Math.hypot(dx, dz);

    if (distToBomb > 2.2) {
      this.isDefusing = false;
      this.isCrouching = false;
      this.targetRotationY = Math.atan2(dx, dz) + Math.PI;
      const dir = new THREE.Vector3(dx, 0, dz).normalize();
      this.velocity.copy(dir).multiplyScalar(this.getCurrentSpeed() * 1.05);
      this.position.x += this.velocity.x * delta;
      this.position.z += this.velocity.z * delta;
      this.meshGroup.position.copy(this.position);
    } else {
      this.velocity.set(0, 0, 0);
      this.targetRotationY = Math.atan2(dx, dz) + Math.PI;
      this.isCrouching = true;
      this.isDefusing = true;

      const targetTime = 8.0;
      this.defuseTimer = (this.defuseTimer || 0) + delta;

      this.defuseSoundTimer = (this.defuseSoundTimer || 0) + delta;
      if (this.defuseSoundTimer > 0.7) {
        this.defuseSoundTimer = 0;
        if (window.csAudio && window.csAudio.playC4Disarm) {
          window.csAudio.playC4Disarm();
        }
      }

      if (this.defuseTimer >= targetTime) {
        window.csGame.defuseBomb(this);
        this.isDefusing = false;
        this.defuseTimer = 0;
        this.isCrouching = false;
        this.state = 'PATROL';
        this.pickNextPatrolDestination();
      }
    }
  }
}

window.CSBot = CSBot;
