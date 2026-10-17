/**
 * Weapon Definitions & 3D Procedural Viewmodels for Counter-Strike 1.6
 */

const WEAPONS_DATA = {
  knife: {
    id: 'knife',
    name: 'Tactical Knife',
    slot: 3,
    damage: 45,
    backstabDamage: 120,
    fireRate: 0.45,
    range: 2.8,
    clipSize: 0,
    maxAmmo: 0,
    reloadTime: 0,
    recoil: 0,
    spread: 0,
    speedUnits: 250, // CS 1.6 speed: 250 units/s
    moveSpeedMod: 1.0,
    isAutomatic: false,
    price: 0
  },
  glock: {
    id: 'glock',
    name: 'Glock-18 (9mm)',
    slot: 2,
    damage: 22,
    fireRate: 0.16,
    range: 65,
    clipSize: 20,
    maxAmmo: 120,
    reloadTime: 2.1,
    recoil: 0.02,
    spread: 0.035,
    penetration: 1,
    penetrationPower: 0.35,
    speedUnits: 250, // 250 units/s
    moveSpeedMod: 1.0,
    isAutomatic: false,
    price: 400
  },
  usp: {
    id: 'usp',
    name: 'KM Tactical .45 (USP)',
    slot: 2,
    damage: 28,
    fireRate: 0.18,
    range: 75,
    clipSize: 12,
    maxAmmo: 100,
    reloadTime: 2.3,
    recoil: 0.025,
    spread: 0.028,
    penetration: 1,
    penetrationPower: 0.45,
    speedUnits: 250, // 250 units/s
    moveSpeedMod: 1.0,
    isAutomatic: false,
    price: 500
  },
  deagle: {
    id: 'deagle',
    name: 'Desert Eagle (.50 AE)',
    slot: 2,
    damage: 54,
    fireRate: 0.32,
    range: 90,
    clipSize: 7,
    maxAmmo: 35,
    reloadTime: 2.2,
    recoil: 0.065,
    spread: 0.022,
    penetration: 2,
    penetrationPower: 0.85,
    speedUnits: 250, // 250 units/s
    moveSpeedMod: 1.0,
    isAutomatic: false,
    price: 650
  },
  ak47: {
    id: 'ak47',
    name: 'CV-47 (AK-47)',
    slot: 1,
    damage: 36,
    fireRate: 0.1, // 100 ms between shots
    range: 120,
    clipSize: 30,
    maxAmmo: 90,
    reloadTime: 2.4,
    recoil: 0.038,
    spread: 0.02,
    penetration: 2,
    penetrationPower: 0.90,
    speedUnits: 221, // CS 1.6 AK-47 speed: 221 units/s
    moveSpeedMod: 0.884, // 221 / 250
    isAutomatic: true,
    price: 2500
  },
  galil: {
    id: 'galil',
    name: 'IDF Defender (Galil AR)',
    slot: 1,
    damage: 30,
    fireRate: 0.105,
    range: 110,
    clipSize: 35,
    maxAmmo: 90,
    reloadTime: 2.5,
    recoil: 0.034,
    spread: 0.022,
    penetration: 2,
    penetrationPower: 0.82,
    speedUnits: 224,
    moveSpeedMod: 0.896,
    isAutomatic: true,
    price: 2000
  },
  m4a1: {
    id: 'm4a1',
    name: 'Maverick M4A1 Carbine',
    slot: 1,
    damage: 32,
    fireRate: 0.09,
    range: 120,
    clipSize: 30,
    maxAmmo: 90,
    reloadTime: 2.6,
    recoil: 0.03,
    spread: 0.016,
    penetration: 2,
    penetrationPower: 0.85,
    speedUnits: 230, // CS 1.6 M4A1 speed: 230 units/s
    moveSpeedMod: 0.92, // 230 / 250
    isAutomatic: true,
    price: 3100
  },
  scout: {
    id: 'scout',
    name: 'Schmidt Scout (SSG 08)',
    slot: 1,
    damage: 85,
    fireRate: 0.95,
    range: 190,
    clipSize: 10,
    maxAmmo: 90,
    reloadTime: 2.7,
    recoil: 0.065,
    spread: 0.003,
    penetration: 2,
    penetrationPower: 0.95,
    speedUnits: 260, // CS 1.6 Scout speed: 260 units/s (fastest rifle)
    moveSpeedMod: 1.04, // 260 / 250
    isAutomatic: false,
    hasScope: true,
    price: 1700
  },
  awp: {
    id: 'awp',
    name: 'Magnum Sniper (AWP)',
    slot: 1,
    damage: 115,
    fireRate: 1.45,
    range: 200,
    clipSize: 10,
    maxAmmo: 30,
    reloadTime: 3.2,
    recoil: 0.12,
    spread: 0.002,
    penetration: 3,
    penetrationPower: 1.35,
    speedUnits: 210, // CS 1.6 AWP speed: 210 units/s (scoped: 150)
    moveSpeedMod: 0.84, // 210 / 250
    isAutomatic: false,
    hasScope: true,
    price: 4750
  },
  scar20: {
    id: 'scar20',
    name: 'SCAR-20 Auto-Sniper',
    slot: 1,
    damage: 72,
    fireRate: 0.25,
    range: 195,
    clipSize: 20,
    maxAmmo: 90,
    reloadTime: 3.1,
    recoil: 0.07,
    spread: 0.005,
    penetration: 3,
    penetrationPower: 1.2,
    speedUnits: 210, // 210 units/s
    moveSpeedMod: 0.84,
    isAutomatic: false,
    hasScope: true,
    price: 5000
  },
  c4: {
    id: 'c4',
    name: 'C4 Explosive',
    slot: 5,
    damage: 500,
    fireRate: 1.0,
    range: 2.0,
    clipSize: 1,
    maxAmmo: 1,
    reloadTime: 0,
    recoil: 0,
    spread: 0,
    penetration: 0,
    penetrationPower: 0,
    speedUnits: 250, // 250 units/s
    moveSpeedMod: 1.0,
    isAutomatic: false,
    price: 0
  }
};

// Global active skin configurations
window.WEAPON_SKIN_SELECTION = {
  awp: 'dragon_lore',
  ak47: 'asiimov',
  m4a1: 'howl',
  deagle: 'printstream',
  scout: 'bloodsport',
  knife: 'doppler'
};

window.CHARACTER_SKIN_SELECTION = 'steve'; // Options: 'steve', 'creeper', 'diamond', 'ct', 't'
window.ACTIVE_RETICLE_STYLE = 'red_dot';   // Options: 'cs_classic', 'red_dot', 'holographic', 'tactical_cross', 'mil_dot'


class CSWeaponViewmodelBuilder {
  constructor() {
    this.materials = this.initMaterials();
  }

  initMaterials() {
    return {
      hands: new THREE.MeshStandardMaterial({
        color: 0xd2a679, // skin tone
        roughness: 0.6,
        metalness: 0.1
      }),
      sleevesCT: new THREE.MeshStandardMaterial({
        color: 0x243242, // Navy blue tactical sleeve
        roughness: 0.8
      }),
      sleevesT: new THREE.MeshStandardMaterial({
        color: 0x4a4338, // Tan/Khaki rebel sleeve
        roughness: 0.8
      }),
      gloves: new THREE.MeshStandardMaterial({
        color: 0x242830, // Tactical combat glove
        roughness: 0.65,
        metalness: 0.25
      }),
      gloveDark: new THREE.MeshStandardMaterial({
        color: 0x23272e,
        roughness: 0.65,
        metalness: 0.20
      }),
      gloveKnuckle: new THREE.MeshStandardMaterial({
        color: 0x181a1f,
        roughness: 0.40,
        metalness: 0.45
      }),
      sleeveCuff: new THREE.MeshStandardMaterial({
        color: 0x363e48,
        roughness: 0.8
      }),
      gunMetal: new THREE.MeshStandardMaterial({
        color: 0x3d434a,
        metalness: 0.65,
        roughness: 0.40,
        emissive: 0x14181c,
        emissiveIntensity: 0.25
      }),
      gunSteel: new THREE.MeshStandardMaterial({
        color: 0x5a626c,
        metalness: 0.75,
        roughness: 0.35,
        emissive: 0x161a1f,
        emissiveIntensity: 0.25
      }),
      picatinnyRail: new THREE.MeshStandardMaterial({
        color: 0x2b3036,
        metalness: 0.55,
        roughness: 0.55,
        emissive: 0x101316,
        emissiveIntensity: 0.20
      }),
      woodAK: new THREE.MeshStandardMaterial({
        color: 0x824424,
        metalness: 0.1,
        roughness: 0.5
      }),
      greenAWP: new THREE.MeshStandardMaterial({
        color: 0x3d483b,
        metalness: 0.2,
        roughness: 0.6
      }),
      knifeBlade: new THREE.MeshStandardMaterial({
        color: 0xd8dee9,
        metalness: 0.90,
        roughness: 0.15
      }),
      knifeChromeBlade: new THREE.MeshStandardMaterial({
        color: 0xd8dee9,
        metalness: 0.90,
        roughness: 0.15
      }),
      knifeHandleRibbed: new THREE.MeshStandardMaterial({
        color: 0x1f2328,
        metalness: 0.25,
        roughness: 0.80
      }),
      knifeGuard: new THREE.MeshStandardMaterial({
        color: 0x3d434c,
        metalness: 0.80,
        roughness: 0.30
      }),
      // Pistol Silver-Blued Steel Slide (bright & crisp, never pitch black)
      pistolSlide: new THREE.MeshStandardMaterial({
        color: 0xb0bac5,
        metalness: 0.60,
        roughness: 0.30,
        emissive: 0x1a1e24,
        emissiveIntensity: 0.35
      }),
      // Pistol Ergonomic Graphite Frame (tactical charcoal grey)
      pistolGrip: new THREE.MeshStandardMaterial({
        color: 0x3d444d,
        metalness: 0.30,
        roughness: 0.65,
        emissive: 0x0f1216,
        emissiveIntensity: 0.20
      }),
      // Bright glowing green Tritium dots
      tritiumSight: new THREE.MeshStandardMaterial({
        color: 0x00ff66,
        emissive: 0x00ff66,
        emissiveIntensity: 2.0,
        roughness: 0.2
      }),
      c4Plastic: new THREE.MeshStandardMaterial({
        color: 0x8a7f5d,
        roughness: 0.7
      }),
      ledRed: new THREE.MeshBasicMaterial({
        color: 0xff1111
      }),
      // --- CS:GO ICONIC WEAPON SKINS ---
      dragonLore: new THREE.MeshStandardMaterial({
        map: window.csTextures.getDragonLoreTexture(),
        roughness: 0.35,
        metalness: 0.4
      }),
      asiimov: new THREE.MeshStandardMaterial({
        map: window.csTextures.getAsiimovTexture(),
        roughness: 0.28,
        metalness: 0.2
      }),
      howl: new THREE.MeshStandardMaterial({
        map: window.csTextures.getHowlTexture(),
        roughness: 0.32,
        metalness: 0.35
      }),
      printstream: new THREE.MeshStandardMaterial({
        map: window.csTextures.getPrintstreamTexture(),
        roughness: 0.18,
        metalness: 0.65
      }),
      doppler: new THREE.MeshStandardMaterial({
        map: window.csTextures.getDopplerTexture(),
        roughness: 0.1,
        metalness: 0.95
      }),
      bloodsport: new THREE.MeshStandardMaterial({
        map: window.csTextures.getBloodsportTexture(),
        roughness: 0.3,
        metalness: 0.25
      }),
      // --- MINECRAFT & SPECIAL CHARACTER SLEEVES ---
      steveSleeve: new THREE.MeshStandardMaterial({
        map: window.csTextures.getSteveShirtTexture(),
        roughness: 0.8
      }),
      creeperSleeve: new THREE.MeshStandardMaterial({
        map: window.csTextures.getCreeperTexture(),
        roughness: 0.85
      }),
      diamondSleeve: new THREE.MeshStandardMaterial({
        map: window.csTextures.getDiamondArmorTexture(),
        roughness: 0.35,
        metalness: 0.5
      }),
      steveSkin: new THREE.MeshStandardMaterial({
        color: 0xb87b50,
        roughness: 0.75
      }),
      creeperSkin: new THREE.MeshStandardMaterial({
        color: 0x2e7d32,
        roughness: 0.85
      }),
      diamondSkin: new THREE.MeshStandardMaterial({
        color: 0x20c9ad,
        roughness: 0.4,
        metalness: 0.45
      })
    };
  }

  // Create First-Person Hands Holding Weapon (adapts to Minecraft Steve / Creeper skins)
  createFirstPersonRig(weaponId, isCT = true) {
    const root = new THREE.Group();
    const mats = this.materials;
    const charSkin = window.CHARACTER_SKIN_SELECTION || (isCT ? 'ct' : 't');

    let sleeveMat = isCT ? mats.sleevesCT : mats.sleevesT;
    let handMat = mats.gloves;

    if (charSkin === 'steve') {
      sleeveMat = mats.steveSleeve;
      handMat = mats.steveSkin;
    } else if (charSkin === 'creeper') {
      sleeveMat = mats.creeperSleeve;
      handMat = mats.creeperSkin;
    } else if (charSkin === 'diamond') {
      sleeveMat = mats.diamondSleeve;
      handMat = mats.diamondSkin;
    }

    const isBlocky = (charSkin === 'steve' || charSkin === 'creeper' || charSkin === 'diamond');

    // Right Arm / Hand (Articulated Tactical Glove with Fingers)
    const rightArmGroup = new THREE.Group();
    if (isBlocky) {
      const rightForearmGeom = new THREE.BoxGeometry(0.08, 0.45, 0.08);
      const rightForearm = new THREE.Mesh(rightForearmGeom, sleeveMat);
      rightForearm.position.set(0.18, -0.22, 0.18);
      rightForearm.rotation.set(-0.9, 0.2, -0.4);
      rightArmGroup.add(rightForearm);

      const rightHandGeom = new THREE.BoxGeometry(0.08, 0.08, 0.08);
      const rightHand = new THREE.Mesh(rightHandGeom, handMat);
      rightHand.position.set(0.12, -0.12, -0.05);
      rightHand.rotation.set(-0.2, 0.1, -0.2);
      rightArmGroup.add(rightHand);
    } else {
      // Realistic Tactical Glove Rig with Articulated Fingers
      const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.056, 0.45, 12), sleeveMat);
      rightForearm.position.set(0.18, -0.22, 0.18);
      rightForearm.rotation.set(-0.9, 0.2, -0.4);
      rightArmGroup.add(rightForearm);

      // Forearm tactical cuff & velcro strap
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.052, 0.045, 12), mats.sleeveCuff);
      cuff.position.set(0.14, -0.15, 0.04);
      cuff.rotation.set(-0.9, 0.2, -0.4);
      rightArmGroup.add(cuff);

      // Glove Palm Body
      const palmGroup = new THREE.Group();
      palmGroup.position.set(0.12, -0.11, -0.05);
      palmGroup.rotation.set(-0.2, 0.1, -0.2);

      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.065, 0.075), mats.gloveDark);
      palmGroup.add(palm);

      // Reinforced carbon knuckle armor
      const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.018, 0.024), mats.gloveKnuckle);
      knuckle.position.set(0, 0.035, -0.015);
      palmGroup.add(knuckle);

      // 4 Tactical Fingers wrapping around the grip
      const fingerOffsets = [-0.018, -0.006, 0.006, 0.018];
      fingerOffsets.forEach((fx, idx) => {
        const finger = new THREE.Group();
        finger.position.set(fx, 0.02, -0.038);
        const fLength = (idx === 1 || idx === 2) ? 0.034 : 0.028;
        const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.006, fLength, 8), mats.gloveDark);
        p1.rotation.x = 0.8;
        p1.position.z = -fLength * 0.4;
        finger.add(p1);

        const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.005, fLength * 0.7, 8), mats.gloveDark);
        p2.rotation.x = 1.4;
        p2.position.set(0, -fLength * 0.35, -fLength * 0.7);
        finger.add(p2);
        palmGroup.add(finger);
      });

      // Opposing Thumb
      const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0065, 0.036, 8), mats.gloveDark);
      thumb.position.set(-0.032, 0.01, -0.01);
      thumb.rotation.set(0.3, 0.4, -0.9);
      palmGroup.add(thumb);

      rightArmGroup.add(palmGroup);
    }

    // Left Arm / Hand (supporting gun)
    const leftArmGroup = new THREE.Group();
    if (isBlocky) {
      const leftForearmGeom = new THREE.BoxGeometry(0.08, 0.45, 0.08);
      const leftForearm = new THREE.Mesh(leftForearmGeom, sleeveMat);
      leftForearm.position.set(-0.2, -0.25, 0.12);
      leftForearm.rotation.set(-0.8, -0.4, 0.5);
      leftArmGroup.add(leftForearm);

      const leftHandGeom = new THREE.BoxGeometry(0.08, 0.08, 0.08);
      const leftHand = new THREE.Mesh(leftHandGeom, handMat);
      leftHand.position.set(-0.06, -0.13, -0.18);
      leftHand.rotation.set(0.3, -0.4, 0.5);
      leftArmGroup.add(leftHand);
    } else {
      const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.056, 0.45, 12), sleeveMat);
      leftForearm.position.set(-0.2, -0.25, 0.12);
      leftForearm.rotation.set(-0.8, -0.4, 0.5);
      leftArmGroup.add(leftForearm);

      // Left cuff
      const lCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.052, 0.045, 12), mats.sleeveCuff);
      lCuff.position.set(-0.13, -0.18, -0.02);
      lCuff.rotation.set(-0.8, -0.4, 0.5);
      leftArmGroup.add(lCuff);

      // Left Palm supporting handguard
      const lPalmGroup = new THREE.Group();
      lPalmGroup.position.set(-0.06, -0.13, -0.18);
      lPalmGroup.rotation.set(0.3, -0.4, 0.5);

      const lPalm = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.065, 0.075), mats.gloveDark);
      lPalmGroup.add(lPalm);

      const lKnuckle = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.018, 0.024), mats.gloveKnuckle);
      lKnuckle.position.set(0, 0.035, -0.015);
      lPalmGroup.add(lKnuckle);

      // Fingers cupping the underside of the rifle handguard
      [-0.016, -0.005, 0.006, 0.017].forEach((fx) => {
        const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.0055, 0.038, 8), mats.gloveDark);
        finger.position.set(fx, 0.032, -0.035);
        finger.rotation.set(0.6, 0, 0.2);
        lPalmGroup.add(finger);
      });

      // Left thumb resting on side rail
      const lThumb = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.006, 0.034, 8), mats.gloveDark);
      lThumb.position.set(0.030, 0.01, -0.01);
      lThumb.rotation.set(0.2, -0.3, 0.8);
      lPalmGroup.add(lThumb);

      leftArmGroup.add(lPalmGroup);
    }

    root.add(rightArmGroup);
    if (weaponId !== 'knife' && weaponId !== 'glock' && weaponId !== 'usp' && weaponId !== 'deagle') {
      root.add(leftArmGroup);
    }

    // Build specific 3D gun mesh with chosen skin
    const weaponMesh = this.buildWeaponMesh(weaponId);
    weaponMesh.position.set(0.08, -0.08, -0.15);
    root.add(weaponMesh);
    root.weaponMesh = weaponMesh;

    // Viewmodel dedicated local illumination so weapons are NEVER pitch black in shadows!
    const vmHemi = new THREE.HemisphereLight(0xffffff, 0x444b58, 0.75);
    root.add(vmHemi);
    const vmPoint = new THREE.PointLight(0xffffff, 0.65, 3.5);
    vmPoint.position.set(0.25, 0.25, 0.05);
    root.add(vmPoint);

    // Add muzzle flash point
    const flashGeom = new THREE.SphereGeometry(0.04, 6, 6);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffea78, transparent: true, opacity: 0 });
    const muzzleFlash = new THREE.Mesh(flashGeom, flashMat);
    muzzleFlash.position.set(0.08, -0.05, -0.65);
    root.add(muzzleFlash);
    root.muzzleFlash = muzzleFlash;

    // Light for gunshot burst
    const flashLight = new THREE.PointLight(0xffaa22, 0, 8);
    flashLight.position.set(0.08, -0.05, -0.65);
    root.add(flashLight);
    root.flashLight = flashLight;

    return root;
  }

  // Build specific 3D geometry for weapon
  buildWeaponMesh(weaponId) {
    const group = new THREE.Group();
    const mats = this.materials;
    const skins = window.WEAPON_SKIN_SELECTION || {};

    switch (weaponId) {
      case 'knife': {
        // Detailed tactical combat knife (M9 Bayonet / Karambit)
        const bladeMat = (skins.knife === 'doppler') ? mats.doppler : mats.knifeChromeBlade;

        // Ergonomic ribbed handle
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.019, 0.14, 12), mats.knifeHandleRibbed);
        handle.rotation.x = Math.PI / 2;
        group.add(handle);

        // Tactile handle grip rings
        for (let rz = -0.05; rz <= 0.05; rz += 0.02) {
          const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.006, 12), mats.gunMetal);
          ring.rotation.x = Math.PI / 2;
          ring.position.z = rz;
          group.add(ring);
        }

        // Steel pommel at base
        const pommel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.019, 0.018, 12), mats.knifeGuard);
        pommel.rotation.x = Math.PI / 2;
        pommel.position.z = 0.075;
        group.add(pommel);

        // Steel crossguard with barrel ring
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.075, 0.018), mats.knifeGuard);
        guard.position.z = -0.07;
        group.add(guard);

        // Main chrome blade
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.046, 0.19), bladeMat);
        blade.position.set(0, 0.005, -0.17);
        group.add(blade);

        // Honed cutting edge bevel
        const bevel = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.014, 0.18), mats.knifeChromeBlade);
        bevel.position.set(0, -0.022, -0.165);
        group.add(bevel);

        // Blood groove (fuller) along blade
        const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.0082, 0.006, 0.12), mats.gunMetal);
        fuller.position.set(0, 0.005, -0.16);
        group.add(fuller);

        // Sawback serrations along spine
        for (let sz = -0.10; sz >= -0.22; sz -= 0.018) {
          const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.0075, 0.008, 0.008), bladeMat);
          tooth.position.set(0, 0.030, sz);
          tooth.rotation.x = 0.4;
          group.add(tooth);
        }
        break;
      }

      case 'glock':
      case 'usp': {
        const isUSP = (weaponId === 'usp');
        // 1. Tactical Composite Frame & Ergonomic Textured Grip (Never pitch black!)
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.12, 0.052), mats.pistolGrip);
        grip.rotation.x = 0.24;
        group.add(grip);

        // Grip side checkering panels
        const panelL = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.08, 0.036), mats.gunMetal);
        panelL.position.set(-0.015, -0.01, 0.003);
        panelL.rotation.x = 0.24;
        group.add(panelL);

        const panelR = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.08, 0.036), mats.gunMetal);
        panelR.position.set(0.015, -0.01, 0.003);
        panelR.rotation.x = 0.24;
        group.add(panelR);

        // Ergonomic trigger guard with finger shelf
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.036, 0.046), mats.pistolGrip);
        guard.position.set(0, 0.018, -0.05);
        group.add(guard);

        // Polished steel curved trigger
        const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.020, 0.012), mats.gunSteel);
        trigger.position.set(0, 0.018, -0.045);
        trigger.rotation.x = 0.25;
        group.add(trigger);

        // Magazine baseplate
        const magBase = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.014, 0.056), mats.pistolGrip);
        magBase.position.set(0, -0.065, 0.02);
        group.add(magBase);

        // 2. Crisp Silver-Blued Steel Slide with Top Chamfers (0xb0bac5)
        const slide = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.038, 0.19), mats.pistolSlide);
        slide.position.set(0, 0.060, -0.04);
        group.add(slide);

        // Chamfered top plate
        const slideTop = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.006, 0.188), mats.pistolSlide);
        slideTop.position.set(0, 0.079, -0.04);
        group.add(slideTop);

        // Cocking serrations at rear of slide
        for (let rz = 0.02; rz <= 0.045; rz += 0.008) {
          const rib = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.026, 0.003), mats.gunMetal);
          rib.position.set(0, 0.060, rz);
          group.add(rib);
        }

        // Ejection port cutout with brass casing
        const ejectPort = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.015, 0.036), mats.gunMetal);
        ejectPort.position.set(0.011, 0.070, -0.03);
        group.add(ejectPort);

        const brassShell = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.022, 8), new THREE.MeshStandardMaterial({
          color: 0xd4af37, metalness: 0.85, roughness: 0.25
        }));
        brassShell.rotation.z = Math.PI / 2;
        brassShell.position.set(0.008, 0.067, -0.03);
        group.add(brassShell);

        // 3. Bright Glowing Green Tritium Sights (0x00ff66)
        const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.009, 0.009), mats.pistolSlide);
        frontSight.position.set(0, 0.086, -0.125);
        group.add(frontSight);

        const frontDot = new THREE.Mesh(new THREE.SphereGeometry(0.003, 6, 6), mats.tritiumSight);
        frontDot.position.set(0, 0.086, -0.121);
        group.add(frontDot);

        // Rear notch & 2 tritium dots
        const rearDotL = new THREE.Mesh(new THREE.SphereGeometry(0.0025, 6, 6), mats.tritiumSight);
        rearDotL.position.set(-0.009, 0.086, 0.045);
        group.add(rearDotL);

        const rearDotR = new THREE.Mesh(new THREE.SphereGeometry(0.0025, 6, 6), mats.tritiumSight);
        rearDotR.position.set(0.009, 0.086, 0.045);
        group.add(rearDotR);

        // 4. Barrel Crown & Muzzle Bore
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.045, 10), mats.gunSteel);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.058, -0.145);
        group.add(barrel);

        // Hollow muzzle bore opening (never looks flat black!)
        const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.008, 10), mats.gunMetal);
        bore.rotation.x = Math.PI / 2;
        bore.position.set(0, 0.058, -0.168);
        group.add(bore);

        // Detachable tactical silencer for USP
        if (isUSP) {
          const silencer = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.17, 14), mats.pistolGrip);
          silencer.rotation.x = Math.PI / 2;
          silencer.position.set(0, 0.058, -0.245);

          // Knurled silencer ring
          const knurl = new THREE.Mesh(new THREE.CylinderGeometry(0.0168, 0.0168, 0.018, 14), mats.gunSteel);
          knurl.rotation.x = Math.PI / 2;
          knurl.position.set(0, 0.058, -0.17);
          silencer.add(knurl);

          group.add(silencer);
          group.silencerMesh = silencer;
        }
        break;
      }

      case 'deagle': {
        // Hand Cannon - Desert Eagle | Printstream or Silver-Blued Steel
        const slideMat = (skins.deagle === 'printstream') ? mats.printstream : mats.pistolSlide;

        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.14, 0.065), mats.pistolGrip);
        grip.rotation.x = 0.28;
        group.add(grip);

        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.04, 0.05), mats.pistolGrip);
        guard.position.set(0, 0.02, -0.055);
        group.add(guard);

        const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.022, 0.014), mats.gunSteel);
        trigger.position.set(0, 0.02, -0.05);
        group.add(trigger);

        const slide = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.052, 0.26), slideMat);
        slide.position.set(0, 0.068, -0.06);
        group.add(slide);

        // Polygonal top rail
        const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.012, 0.25), mats.picatinnyRail);
        topRail.position.set(0, 0.096, -0.06);
        group.add(topRail);

        // Huge bore crown
        const barrelCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.03, 12), mats.gunSteel);
        barrelCrown.rotation.x = Math.PI / 2;
        barrelCrown.position.set(0, 0.068, -0.195);
        group.add(barrelCrown);

        const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.01, 10), mats.gunMetal);
        bore.rotation.x = Math.PI / 2;
        bore.position.set(0, 0.068, -0.21);
        group.add(bore);

        // Tritium front dot
        const fDot = new THREE.Mesh(new THREE.SphereGeometry(0.0032, 6, 6), mats.tritiumSight);
        fDot.position.set(0, 0.104, -0.185);
        group.add(fDot);

        const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.02, 0.02), mats.gunSteel);
        hammer.position.set(0, 0.08, 0.075);
        group.add(hammer);
        break;
      }

      case 'ak47': {
        // AK-47 | Asiimov Skin or Classic Wood
        const woodMat = (skins.ak47 === 'asiimov') ? mats.asiimov : mats.woodAK;

        // Wooden Buttstock with angled comb
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.068, 0.22), woodMat);
        stock.position.set(0, -0.025, 0.15);
        stock.rotation.x = 0.08;
        group.add(stock);

        // Stamped Steel Receiver with bolt handle & selector
        const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.060, 0.23), mats.gunSteel);
        receiver.position.set(0, 0.012, -0.04);
        group.add(receiver);

        const boltHandle = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.008, 0.012), mats.gunMetal);
        boltHandle.position.set(0.024, 0.022, -0.02);
        group.add(boltHandle);

        // Ergonomic Pistol Grip
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.09, 0.042), woodMat);
        grip.position.set(0, -0.055, 0.03);
        grip.rotation.x = 0.32;
        group.add(grip);

        // Laminated Wood Handguard (upper gas tube + lower swell)
        const lowerHandguard = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.042, 0.17), woodMat);
        lowerHandguard.position.set(0, 0.005, -0.22);
        group.add(lowerHandguard);

        const upperGasTube = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.15, 10), woodMat);
        upperGasTube.rotation.x = Math.PI / 2;
        upperGasTube.position.set(0, 0.032, -0.22);
        group.add(upperGasTube);

        // Slender Steel Barrel & Cleaning Rod
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.28, 10), mats.gunSteel);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.018, -0.42);
        group.add(barrel);

        const cleanRod = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.22, 6), mats.gunMetal);
        cleanRod.rotation.x = Math.PI / 2;
        cleanRod.position.set(0, 0.006, -0.38);
        group.add(cleanRod);

        // Slant Muzzle Compensator
        const comp = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.035, 10), mats.gunSteel);
        comp.rotation.x = Math.PI / 2;
        comp.position.set(0, 0.018, -0.56);
        group.add(comp);

        // Curved 30-round Banana Magazine with stamped ribs
        const magMat = (skins.ak47 === 'asiimov') ? mats.asiimov : mats.gunMetal;
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.15, 0.065), magMat);
        mag.position.set(0, -0.095, -0.06);
        mag.rotation.x = -0.32;
        group.add(mag);

        // Front Sight Post with protective hood
        const sightPost = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.032, 0.016), mats.gunSteel);
        sightPost.position.set(0, 0.046, -0.52);
        group.add(sightPost);
        break;
      }

      case 'm4a1': {
        // M4A1 | Howl Skin or Tactical Black
        const bodyMat = (skins.m4a1 === 'howl') ? mats.howl : mats.gunMetal;

        // Telescoping Crane Stock with buffer tube
        const bufferTube = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 10), mats.gunSteel);
        bufferTube.rotation.x = Math.PI / 2;
        bufferTube.position.set(0, 0.012, 0.08);
        group.add(bufferTube);

        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.065, 0.15), bodyMat);
        stock.position.set(0, -0.015, 0.14);
        group.add(stock);

        // Precision Upper & Lower Receiver
        const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.062, 0.21), bodyMat);
        receiver.position.set(0, 0.012, -0.04);
        group.add(receiver);

        // Forward assist & brass deflector
        const fwdAssist = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.02, 8), mats.gunSteel);
        fwdAssist.position.set(0.022, 0.025, 0.01);
        fwdAssist.rotation.z = -Math.PI / 4;
        group.add(fwdAssist);

        // Tactical Pistol Grip
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.09, 0.04), bodyMat);
        grip.position.set(0, -0.055, 0.025);
        grip.rotation.x = 0.28;
        group.add(grip);

        // Slim Tactical Picatinny Handguard (quad-rail, NO chunky bricks!)
        const handguard = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.19, 8), mats.picatinnyRail);
        handguard.rotation.x = Math.PI / 2;
        handguard.position.set(0, 0.015, -0.22);
        group.add(handguard);

        // Individual Picatinny rail strips (Top, Bottom, Left, Right)
        const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.006, 0.20), mats.picatinnyRail);
        topRail.position.set(0, 0.038, -0.22);
        group.add(topRail);

        const bottomRail = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.006, 0.18), mats.picatinnyRail);
        bottomRail.position.set(0, -0.008, -0.22);
        group.add(bottomRail);

        // Carry Handle / Tactical Upper Rail
        const carryHandle = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.030, 0.15), bodyMat);
        carryHandle.position.set(0, 0.056, -0.04);
        group.add(carryHandle);

        // Precision Fluted Steel Barrel
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.26, 10), mats.gunSteel);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.015, -0.38);
        group.add(barrel);

        // Birdcage Flash Hider
        const flashHider = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.010, 0.035, 10), mats.gunSteel);
        flashHider.rotation.x = Math.PI / 2;
        flashHider.position.set(0, 0.015, -0.51);
        group.add(flashHider);

        // Curved 30-round STANAG Magazine
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.14, 0.055), mats.gunMetal);
        mag.position.set(0, -0.09, -0.06);
        mag.rotation.x = -0.16;
        group.add(mag);

        // Detachable Quick-Detach Tactical Silencer (Toggleable via RMB)
        const silencer = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.19, 14), bodyMat);
        silencer.rotation.x = Math.PI / 2;
        silencer.position.set(0, 0.015, -0.56);

        // Knurled silencer attachment collar
        const sCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.0185, 0.0185, 0.02, 14), mats.gunSteel);
        sCollar.rotation.x = Math.PI / 2;
        sCollar.position.set(0, 0.015, -0.47);
        silencer.add(sCollar);

        group.add(silencer);
        group.silencerMesh = silencer;
        break;
      }

      case 'scout': {
        // Schmidt Scout (SSG 08) - Bloodsport Skin or Tactical Composite
        const stockMat = (skins.scout === 'bloodsport') ? mats.bloodsport : mats.gunMetal;

        // Sleek Skeleton Stock
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.06, 0.32), stockMat);
        stock.position.set(0, -0.02, 0.08);
        group.add(stock);

        // Slender Forend
        const forend = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.05, 0.24), stockMat);
        forend.position.set(0, -0.01, -0.18);
        group.add(forend);

        // Fluted Precision Barrel
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.012, 0.42, 8), mats.gunSteel);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.018, -0.48);
        group.add(barrel);

        // Compact Muzzle Compensator
        const comp = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.045), mats.gunMetal);
        comp.position.set(0, 0.018, -0.70);
        group.add(comp);

        // Optical Sniper Scope
        const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 10), mats.gunMetal);
        scope.rotation.x = Math.PI / 2;
        scope.position.set(0, 0.062, -0.08);
        group.add(scope);

        // Scope Rings
        const ring1 = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.028, 0.018), mats.gunSteel);
        ring1.position.set(0, 0.038, -0.01);
        const ring2 = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.028, 0.018), mats.gunSteel);
        ring2.position.set(0, 0.038, -0.15);
        group.add(ring1, ring2);

        // Lightweight Bolt Handle
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 6), mats.gunSteel);
        bolt.rotation.z = Math.PI / 2;
        bolt.position.set(0.03, 0.025, 0.02);
        group.add(bolt);

        // 10-Round Flush Magazine
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.09, 0.05), mats.gunSteel);
        mag.position.set(0, -0.065, -0.06);
        mag.rotation.x = -0.1;
        group.add(mag);
        break;
      }

      case 'awp': {
        // AWP | Dragon Lore Skin or Factory Green
        const bodyMat = (skins.awp === 'dragon_lore') ? mats.dragonLore : mats.greenAWP;

        // Body Stock
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.08, 0.38), bodyMat);
        stock.position.set(0, -0.02, 0.08);
        group.add(stock);

        const forebody = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.065, 0.28), bodyMat);
        forebody.position.set(0, -0.01, -0.2);
        group.add(forebody);

        // Massive Heavy Fluted Barrel
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.45, 10), mats.gunSteel);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.02, -0.52);
        group.add(barrel);

        // Huge Muzzle Brake
        const brake = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.06), mats.gunMetal);
        brake.position.set(0, 0.02, -0.76);
        group.add(brake);

        // Sniper Scope Tube (decorated with Dragon Lore checkered pattern if skin active)
        const scopeMat = (skins.awp === 'dragon_lore') ? mats.dragonLore : mats.gunMetal;
        const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.26, 12), scopeMat);
        scope.rotation.x = Math.PI / 2;
        scope.position.set(0, 0.068, -0.1);
        group.add(scope);

        // Scope Mounts
        const mount1 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.03, 0.02), mats.gunMetal);
        mount1.position.set(0, 0.04, -0.02);
        const mount2 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.03, 0.02), mats.gunMetal);
        mount2.position.set(0, 0.04, -0.18);
        group.add(mount1, mount2);

        // Bolt Handle
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6), mats.gunSteel);
        bolt.rotation.z = Math.PI / 2;
        bolt.position.set(0.035, 0.03, 0.04);
        group.add(bolt);
        break;
      }

      case 'scar20': {
        // SCAR-20 Tactical Auto-Sniper DMR
        const upperMat = mats.gunMetal;
        const lowerMat = mats.gunSteel;

        // Heavy Tactical Stock
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.08, 0.28), upperMat);
        stock.position.set(0, -0.01, 0.12);
        group.add(stock);

        // Upper & Lower Receiver
        const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.075, 0.26), lowerMat);
        receiver.position.set(0, 0.01, -0.06);
        group.add(receiver);

        // Heavy Barrel with Quad-Rail
        const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.22), upperMat);
        handguard.position.set(0, 0.015, -0.26);
        group.add(handguard);

        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.36, 10), mats.gunSteel);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.018, -0.48);
        group.add(barrel);

        // Multi-Port Heavy Compensator
        const comp = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.032, 0.06), mats.gunMetal);
        comp.position.set(0, 0.018, -0.68);
        group.add(comp);

        // 20-Round Box Magazine
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.075), mats.gunMetal);
        mag.position.set(0, -0.1, -0.08);
        mag.rotation.x = -0.12;
        group.add(mag);

        // High-Magnification Tactical Scope
        const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 0.28, 12), mats.gunSteel);
        scope.rotation.x = Math.PI / 2;
        scope.position.set(0, 0.075, -0.1);
        group.add(scope);

        const mount = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.035, 0.16), mats.gunMetal);
        mount.position.set(0, 0.045, -0.1);
        group.add(mount);
        break;
      }

      case 'c4': {
        // Olive explosive brick
        const brick = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.22), mats.c4Plastic);
        group.add(brick);

        // Keypad & LED display
        const keypad = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.01, 0.08), mats.gunMetal);
        keypad.position.set(0, 0.045, -0.03);
        group.add(keypad);

        const led = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.02), mats.ledRed);
        led.position.set(0, 0.045, 0.04);
        group.add(led);

        // Detonator wires (colored curves)
        const wire1 = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 6), new THREE.MeshBasicMaterial({ color: 0x2255ff }));
        wire1.position.set(-0.03, 0.045, 0.01);
        wire1.rotation.y = 0.5;
        group.add(wire1);
        break;
      }
    }

    return group;
  }
}

window.csWeaponBuilder = new CSWeaponViewmodelBuilder();
window.WEAPONS_DATA = WEAPONS_DATA;
