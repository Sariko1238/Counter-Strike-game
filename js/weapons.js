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
        color: 0x1f2421, // Tactical combat glove
        roughness: 0.7,
        metalness: 0.2
      }),
      gunMetal: new THREE.MeshStandardMaterial({
        color: 0x222629,
        metalness: 0.85,
        roughness: 0.35
      }),
      gunSteel: new THREE.MeshStandardMaterial({
        color: 0x484d52,
        metalness: 0.9,
        roughness: 0.3
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
        color: 0xdcdde1,
        metalness: 0.95,
        roughness: 0.15
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

    // Right Arm / Hand
    const rightArmGroup = new THREE.Group();
    const rightForearmGeom = isBlocky
      ? new THREE.BoxGeometry(0.08, 0.45, 0.08)
      : new THREE.CylinderGeometry(0.045, 0.055, 0.45, 10);
    const rightForearm = new THREE.Mesh(rightForearmGeom, sleeveMat);
    rightForearm.position.set(0.18, -0.22, 0.18);
    rightForearm.rotation.set(-0.9, 0.2, -0.4);
    rightArmGroup.add(rightForearm);

    const rightHandGeom = isBlocky
      ? new THREE.BoxGeometry(0.08, 0.08, 0.08)
      : new THREE.BoxGeometry(0.065, 0.075, 0.09);
    const rightHand = new THREE.Mesh(rightHandGeom, handMat);
    rightHand.position.set(0.12, -0.12, -0.05);
    rightHand.rotation.set(-0.2, 0.1, -0.2);
    rightArmGroup.add(rightHand);

    // Left Arm / Hand (supporting gun)
    const leftArmGroup = new THREE.Group();
    const leftForearmGeom = isBlocky
      ? new THREE.BoxGeometry(0.08, 0.45, 0.08)
      : new THREE.CylinderGeometry(0.045, 0.055, 0.45, 10);
    const leftForearm = new THREE.Mesh(leftForearmGeom, sleeveMat);
    leftForearm.position.set(-0.2, -0.25, 0.12);
    leftForearm.rotation.set(-0.8, -0.4, 0.5);
    leftArmGroup.add(leftForearm);

    const leftHandGeom = isBlocky
      ? new THREE.BoxGeometry(0.08, 0.08, 0.08)
      : new THREE.BoxGeometry(0.065, 0.075, 0.09);
    const leftHand = new THREE.Mesh(leftHandGeom, handMat);
    leftHand.position.set(-0.06, -0.13, -0.18);
    leftHand.rotation.set(0.3, -0.4, 0.5);
    leftArmGroup.add(leftHand);

    root.add(rightArmGroup);
    if (weaponId !== 'knife' && weaponId !== 'glock' && weaponId !== 'usp' && weaponId !== 'deagle') {
      root.add(leftArmGroup);
    }

    // Build specific 3D gun mesh with chosen skin
    const weaponMesh = this.buildWeaponMesh(weaponId);
    weaponMesh.position.set(0.08, -0.08, -0.15);
    root.add(weaponMesh);
    root.weaponMesh = weaponMesh;

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
        // Handle
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.14, 8), mats.gloves);
        handle.rotation.x = Math.PI / 2;
        group.add(handle);

        // Guard
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.07, 0.015), mats.gunMetal);
        guard.position.z = -0.07;
        group.add(guard);

        // Blade (curved combat style - Doppler Phase 2 Pink Galaxy Skin)
        const bladeMat = (skins.knife === 'doppler') ? mats.doppler : mats.knifeBlade;
        const bladeGeom = new THREE.BoxGeometry(0.008, 0.045, 0.18);
        const blade = new THREE.Mesh(bladeGeom, bladeMat);
        blade.position.z = -0.16;
        group.add(blade);
        break;
      }

      case 'glock':
      case 'usp': {
        // Receiver & Grip
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.12, 0.05), mats.gunMetal);
        grip.rotation.x = 0.25;
        group.add(grip);

        // Slide
        const slide = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.042, 0.18), mats.gunSteel);
        slide.position.set(0, 0.06, -0.04);
        group.add(slide);

        // Barrel
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.06, 8), mats.gunMetal);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.058, -0.14);
        group.add(barrel);
        break;
      }

      case 'deagle': {
        // Chunky Hand Cannon - Desert Eagle | Printstream Skin
        const slideMat = (skins.deagle === 'printstream') ? mats.printstream : mats.gunSteel;

        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.14, 0.065), mats.gunMetal);
        grip.rotation.x = 0.28;
        group.add(grip);

        const slide = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.055, 0.26), slideMat);
        slide.position.set(0, 0.07, -0.06);
        group.add(slide);

        const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.02, 0.02), mats.gunMetal);
        hammer.position.set(0, 0.08, 0.075);
        group.add(hammer);
        break;
      }

      case 'ak47': {
        // AK-47 | Asiimov Skin or Classic Wood
        const bodyMat = (skins.ak47 === 'asiimov') ? mats.asiimov : mats.woodAK;

        // Stock
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.07, 0.22), bodyMat);
        stock.position.set(0, -0.03, 0.15);
        stock.rotation.x = 0.1;
        group.add(stock);

        // Dark Receiver
        const receiverMat = (skins.ak47 === 'asiimov') ? mats.asiimov : mats.gunMetal;
        const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.065, 0.24), receiverMat);
        receiver.position.set(0, 0.01, -0.04);
        group.add(receiver);

        // Wooden / Asiimov Handguard
        const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.055, 0.18), bodyMat);
        handguard.position.set(0, 0.015, -0.22);
        group.add(handguard);

        // Long Barrel & Gas Tube
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.28, 8), mats.gunSteel);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.02, -0.42);
        group.add(barrel);

        // Curved Banana Magazine
        const magMat = (skins.ak47 === 'asiimov') ? mats.asiimov : mats.gunMetal;
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.15, 0.07), magMat);
        mag.position.set(0, -0.1, -0.06);
        mag.rotation.x = -0.3;
        group.add(mag);

        // Front Sight Post
        const sight = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.035, 0.015), mats.gunSteel);
        sight.position.set(0, 0.05, -0.52);
        group.add(sight);
        break;
      }

      case 'm4a1': {
        // M4A1 | Howl Skin or Tactical Black
        const bodyMat = (skins.m4a1 === 'howl') ? mats.howl : mats.gunMetal;

        // Tactical Stock
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.065, 0.18), bodyMat);
        stock.position.set(0, -0.02, 0.12);
        group.add(stock);

        // Receiver
        const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.065, 0.22), bodyMat);
        receiver.position.set(0, 0.01, -0.04);
        group.add(receiver);

        // Carry Handle / Top Sight
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.035, 0.16), bodyMat);
        handle.position.set(0, 0.055, -0.04);
        group.add(handle);

        // Ribbed Barrel
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 8), mats.gunSteel);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.01, -0.3);
        group.add(barrel);

        // Straight Magazine
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.14, 0.05), mats.gunMetal);
        mag.position.set(0, -0.09, -0.05);
        mag.rotation.x = -0.15;
        group.add(mag);

        // Removable Silencer Tube (toggleable)
        const silencer = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.18, 10), bodyMat);
        silencer.rotation.x = Math.PI / 2;
        silencer.position.set(0, 0.01, -0.52);
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
