/**
 * CS:GO / CS2 Style 3D Lobby & Operative Showcase
 * Renders an atmospheric 3D scene with a tactical operative in ready stance,
 * cinematic spot lighting, floating atmospheric dust particles,
 * and procedural idle breathing animation.
 */

class CSLobby3D {
  constructor(renderer, container) {
    this.renderer = renderer;
    this.container = container;
    this.time = 0;
    this.team = 'ct'; // 'ct' or 't'

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x080c10, 0.045);

    this.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 50);
    // Camera positioned to place operative in the right-center of view, leaving left open for UI
    this.camera.position.set(-0.15, 1.30, 3.4);
    this.camera.lookAt(new THREE.Vector3(0.35, 1.05, 0));

    this.operativeGroup = new THREE.Group();
    this.operativeGroup.position.set(0.35, 0, 0);
    this.scene.add(this.operativeGroup);

    this.limbs = {};
    this.particles = [];

    this.initLights();
    this.initEnvironment();
    this.buildOperative(this.team);
    this.initParticles();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    });
  }

  initLights() {
    // 1. Dark ambient illumination
    this.ambientLight = new THREE.AmbientLight(0x1a2432, 1.1);
    this.scene.add(this.ambientLight);

    // 2. Main dramatic key spotlight from front-right
    this.keySpot = new THREE.SpotLight(0xd4eaff, 4.5, 22, Math.PI / 4, 0.35, 1.0);
    this.keySpot.position.set(1.8, 4.2, 2.6);
    this.keySpot.target.position.set(0.35, 1.05, 0);
    this.scene.add(this.keySpot);
    this.scene.add(this.keySpot.target);

    // 3. Rim / Backlight spotlight for cinematic silhouette
    this.rimSpot = new THREE.SpotLight(0x4a90e2, 4.8, 18, Math.PI / 3, 0.45, 1.0);
    this.rimSpot.position.set(-1.8, 3.4, -2.4);
    this.rimSpot.target.position.set(0.35, 1.05, 0);
    this.scene.add(this.rimSpot);
    this.scene.add(this.rimSpot.target);

    // 4. Floor spotlight puddle beneath the operative
    this.floorSpot = new THREE.SpotLight(0x00e5ff, 2.4, 10, Math.PI / 5, 0.7, 1.2);
    this.floorSpot.position.set(0.35, 3.8, 0.2);
    this.floorSpot.target.position.set(0.35, 0, 0);
    this.scene.add(this.floorSpot);
    this.scene.add(this.floorSpot.target);
  }

  initEnvironment() {
    // Platform pedestal beneath the operative
    const padGeom = new THREE.CylinderGeometry(2.2, 2.4, 0.12, 36);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x121820,
      roughness: 0.35,
      metalness: 0.75
    });
    const pad = new THREE.Mesh(padGeom, padMat);
    pad.position.set(0.35, -0.06, 0);
    this.scene.add(pad);

    // Circular neon trim ring
    const ringGeom = new THREE.RingGeometry(2.15, 2.22, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4
    });
    this.neonRing = new THREE.Mesh(ringGeom, ringMat);
    this.neonRing.rotation.x = -Math.PI / 2;
    this.neonRing.position.set(0.35, 0.005, 0);
    this.scene.add(this.neonRing);
  }

  initParticles() {
    // Atmospheric floating dust motes
    const pGeom = new THREE.BufferGeometry();
    const count = 50;
    const positions = new Float32Array(count * 3);
    this.particleSpeeds = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 4.5 + 0.35;
      positions[i * 3 + 1] = Math.random() * 2.8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4.0;
      this.particleSpeeds.push({
        y: 0.08 + Math.random() * 0.12,
        wobble: Math.random() * Math.PI * 2
      });
    }

    pGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x88ccff,
      size: 0.035,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });

    this.particleSystem = new THREE.Points(pGeom, pMat);
    this.scene.add(this.particleSystem);
  }

  setTeam(team) {
    if (this.team === team) return;
    this.team = team;
    this.buildOperative(team);

    // Update lighting accent
    if (team === 'ct') {
      this.rimSpot.color.setHex(0x4a90e2); // CT Blue
      this.floorSpot.color.setHex(0x00e5ff); // Cyan
      this.neonRing.material.color.setHex(0x00e5ff);
    } else {
      this.rimSpot.color.setHex(0xff7700); // T Orange
      this.floorSpot.color.setHex(0xffaa00); // Amber
      this.neonRing.material.color.setHex(0xffaa00);
    }
  }

  buildOperative(team) {
    // Clear old operative parts
    while (this.operativeGroup.children.length > 0) {
      const obj = this.operativeGroup.children[0];
      this.operativeGroup.remove(obj);
    }
    this.limbs = {};

    const isCT = (team === 'ct');

    // Materials
    const bodyColor = isCT ? 0x223242 : 0x4a4338;
    const vestColor = isCT ? 0x16212d : 0x332b21;
    const skinColor = 0xd2a679;
    const gunColor = 0x1a2128;

    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.75 });
    const vestMat = new THREE.MeshStandardMaterial({ color: vestColor, roughness: 0.65, metalness: 0.15 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 });
    const headMat = isCT ? new THREE.MeshStandardMaterial({ color: 0x1a232e, roughness: 0.7 }) : skinMat;
    const legMat = new THREE.MeshStandardMaterial({ color: isCT ? 0x19232d : 0x3c3427, roughness: 0.8 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x11161b, roughness: 0.5, metalness: 0.3 });
    const gunMat = new THREE.MeshStandardMaterial({ color: gunColor, roughness: 0.35, metalness: 0.75 });

    // 1. Torso Root
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 1.05, 0);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.62, 0.28), bodyMat);
    torsoGroup.add(torso);

    // Tactical Vest with front armor plates
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.52, 0.33), vestMat);
    vest.position.set(0, 0.02, 0.01);
    torsoGroup.add(vest);

    // Ammo pouches on chest
    for (let p = -1; p <= 1; p++) {
      const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.08), vestMat);
      pouch.position.set(p * 0.15, -0.06, 0.18);
      torsoGroup.add(pouch);
    }

    // Radio on shoulder
    const radio = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.08), gunMat);
    radio.position.set(-0.21, 0.22, 0.12);
    torsoGroup.add(radio);

    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.16, 6), gunMat);
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
      // Ballistic PASGT Helmet
      const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.34), vestMat);
      helmet.position.set(0, 0.10, 0);
      headGroup.add(helmet);

      // Dark Tactical Visor / Goggles
      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.09, 0.06),
        new THREE.MeshStandardMaterial({ color: 0x050c12, roughness: 0.15, metalness: 0.9 })
      );
      visor.position.set(0, 0.02, 0.16);
      headGroup.add(visor);
    } else {
      // Terrorist Balaclava Eye Slit
      const slit = new THREE.Mesh(
        new THREE.BoxGeometry(0.20, 0.06, 0.02),
        new THREE.MeshBasicMaterial({ color: 0x111111 })
      );
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

    // 4. Arms & Weapon (Hold in ready tactical idle stance across chest)
    const armsGroup = new THREE.Group();
    armsGroup.position.set(0, 1.25, 0);

    // Left arm holding front handguard
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.14), bodyMat);
    leftArm.position.set(-0.28, -0.15, 0.18);
    leftArm.rotation.set(0.55, -0.3, -0.4);
    armsGroup.add(leftArm);

    // Right arm holding pistol grip
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.14), bodyMat);
    rightArm.position.set(0.28, -0.15, 0.14);
    rightArm.rotation.set(0.65, 0.25, 0.35);
    armsGroup.add(rightArm);

    // 5. Weapon Model (M4A1 for CT, AK-47 for T)
    const weaponGroup = new THREE.Group();
    weaponGroup.position.set(0.04, -0.18, 0.34);
    weaponGroup.rotation.set(-0.25, -0.22, 0.12);

    if (isCT) {
      // M4A1 Tactical Carbine
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.10, 0.42), gunMat);
      weaponGroup.add(receiver);

      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.34, 8), gunMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.01, 0.32);
      weaponGroup.add(barrel);

      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.08), gunMat);
      mag.position.set(0, -0.10, 0.08);
      weaponGroup.add(mag);

      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.22), gunMat);
      stock.position.set(0, -0.01, -0.28);
      weaponGroup.add(stock);
    } else {
      // AK-47 Assault Rifle with wooden furniture
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.6 });
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.40), gunMat);
      weaponGroup.add(receiver);

      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.36, 8), gunMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.02, 0.34);
      weaponGroup.add(barrel);

      // Curved banana magazine
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.20, 0.09), gunMat);
      mag.position.set(0, -0.12, 0.09);
      mag.rotation.x = 0.25;
      weaponGroup.add(mag);

      // Wooden stock
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.24), woodMat);
      stock.position.set(0, -0.02, -0.30);
      stock.rotation.x = -0.12;
      weaponGroup.add(stock);

      // Wooden handguard
      const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.20), woodMat);
      handguard.position.set(0, 0.01, 0.24);
      weaponGroup.add(handguard);
    }

    armsGroup.add(weaponGroup);
    this.operativeGroup.add(armsGroup);
    this.limbs.arms = armsGroup;
    this.limbs.weapon = weaponGroup;

    // Gentle slight rotation towards camera
    this.operativeGroup.rotation.y = -0.22;
  }

  update(delta) {
    this.time += delta;

    // Procedural Idle Breathing Simulation
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

    // 2. Head subtly nods and tilts with breathing
    if (this.limbs.head) {
      this.limbs.head.position.y = 1.54 + breathCycle * 0.014;
      this.limbs.head.rotation.x = breathCycle * 0.015;
      this.limbs.head.rotation.y = breathSecondary * 0.020;
    }

    // 3. Arms and weapon sway gently in rhythm with breath
    if (this.limbs.arms) {
      this.limbs.arms.position.y = 1.25 + breathCycle * 0.013;
    }
    if (this.limbs.weapon) {
      this.limbs.weapon.position.y = -0.18 + breathCycle * 0.015;
      this.limbs.weapon.rotation.z = 0.12 + breathSecondary * 0.012;
      this.limbs.weapon.rotation.x = -0.25 + breathCycle * 0.015;
    }

    // 4. Subtle full body weight shift
    this.operativeGroup.rotation.y = -0.22 + Math.sin(this.time * 0.8) * 0.025;

    // 5. Update floating atmospheric dust particles
    if (this.particleSystem) {
      const posAttr = this.particleSystem.geometry.attributes.position;
      const arr = posAttr.array;
      for (let i = 0; i < this.particleSpeeds.length; i++) {
        arr[i * 3 + 1] += this.particleSpeeds[i].y * delta;
        arr[i * 3 + 0] += Math.sin(this.time + this.particleSpeeds[i].wobble) * 0.003;
        if (arr[i * 3 + 1] > 2.8) {
          arr[i * 3 + 1] = 0.05;
          arr[i * 3 + 0] = (Math.random() - 0.5) * 4.5 + 0.35;
          arr[i * 3 + 2] = (Math.random() - 0.5) * 4.0;
        }
      }
      posAttr.needsUpdate = true;
    }

    // 6. Pulse neon ring
    if (this.neonRing) {
      this.neonRing.material.opacity = 0.30 + Math.sin(this.time * 3.0) * 0.12;
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

window.CSLobby3D = CSLobby3D;
