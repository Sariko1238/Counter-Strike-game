/**
 * CS 1.6 de_beach (Tropical Coastline Resort) 3D Map Architecture
 * Features scenic ocean water, golden sand beaches, palm groves, boardwalk pier (Site A),
 * tiki cabana resort (Site B), market stalls, beach umbrellas, deck chairs, and coastal rocks.
 */

class CSBeachMap {
  constructor(scene) {
    this.scene = scene;
    this.mapGroup = new THREE.Group();
    this.colliders = []; // Array of THREE.Box3 for collision detection
    this.platforms = []; // Array of { box: THREE.Box3, topY: number, isRamp: boolean }
    this.waterMesh = null;
    this.palmLeaves = [];

    // Bombsite coordinates
    this.bombsiteA = { x: 22, z: 28, radius: 8 }; // Boardwalk Pier & Cargo Docks
    this.bombsiteB = { x: -22, z: -16, radius: 8 }; // Tiki Cabanas & Lagoon

    // Spawn points
    this.spawnPoints = {
      ct: [
        { x: 0, y: 0, z: 42 },
        { x: 4, y: 0, z: 44 },
        { x: -4, y: 0, z: 42 },
        { x: 2, y: 0, z: 46 }
      ],
      t: [
        { x: 0, y: 0, z: -54 },
        { x: 5, y: 0, z: -56 },
        { x: -5, y: 0, z: -54 },
        { x: 2, y: 0, z: -52 }
      ]
    };

    // Bot tactical navigation waypoints for de_beach
    this.waypoints = [
      // T Spawn (Pirate Cove / Beach Landing)
      { id: 't_spawn', x: 0, z: -54, type: 'spawn_t' },
      { id: 't_beach_exit', x: -8, z: -44, type: 'path' },
      { id: 't_mid_approach', x: 0, z: -38, type: 'path' },
      { id: 't_dunes', x: 18, z: -42, type: 'path' },

      // Mid Beach Promenade
      { id: 'mid_entry_t', x: 0, z: -20, type: 'choke' },
      { id: 'mid_center', x: 0, z: 0, type: 'path' },
      { id: 'mid_entry_ct', x: 0, z: 22, type: 'choke' },

      // Route to Bombsite A (Boardwalk Pier)
      { id: 'a_path_lower', x: 22, z: -20, type: 'path' },
      { id: 'a_ramp_approach', x: 24, z: 5, type: 'path' },
      { id: 'a_boardwalk_ramp', x: 22, z: 18, type: 'ramp' },
      { id: 'site_a', x: 22, z: 28, type: 'bombsite' },
      { id: 'a_pier_end', x: 28, z: 36, type: 'path' },

      // Route to Bombsite B (Tiki Cabanas & Lagoon)
      { id: 'b_shore_path', x: -22, z: -40, type: 'path' },
      { id: 'b_lagoon_turn', x: -26, z: -28, type: 'path' },
      { id: 'site_b', x: -22, z: -16, type: 'bombsite' },
      { id: 'b_resort_exit', x: -16, z: 5, type: 'choke' },

      // CT Spawn (Resort Promenade)
      { id: 'ct_spawn', x: 0, z: 42, type: 'spawn_ct' },
      { id: 'ct_to_a', x: 14, z: 34, type: 'path' },
      { id: 'ct_to_b', x: -14, z: 28, type: 'path' }
    ];

    this.navConnections = {
      t_spawn: ['t_beach_exit', 't_mid_approach', 't_dunes'],
      t_beach_exit: ['b_shore_path', 'mid_entry_t'],
      t_mid_approach: ['mid_entry_t', 't_dunes'],
      t_dunes: ['a_path_lower'],
      mid_entry_t: ['mid_center', 'b_lagoon_turn'],
      mid_center: ['mid_entry_ct', 'a_ramp_approach', 'b_resort_exit'],
      mid_entry_ct: ['ct_spawn', 'ct_to_a', 'ct_to_b'],
      a_path_lower: ['a_ramp_approach'],
      a_ramp_approach: ['a_boardwalk_ramp'],
      a_boardwalk_ramp: ['site_a'],
      site_a: ['a_pier_end', 'ct_to_a'],
      a_pier_end: ['site_a'],
      b_shore_path: ['b_lagoon_turn'],
      b_lagoon_turn: ['site_b'],
      site_b: ['b_resort_exit', 'ct_to_b'],
      b_resort_exit: ['ct_to_b', 'mid_center'],
      ct_spawn: ['ct_to_a', 'ct_to_b', 'mid_entry_ct'],
      ct_to_a: ['site_a'],
      ct_to_b: ['site_b']
    };
  }

  destroy() {
    if (this.mapGroup) {
      this.mapGroup.traverse(obj => {
        if (obj.geometry) {
          try { obj.geometry.dispose(); } catch (e) {}
        }
      });
      this.scene.remove(this.mapGroup);
    }
    this.colliders = [];
    this.platforms = [];
    this.palmLeaves = [];
  }

  buildMap() {
    this.mapGroup = new THREE.Group();
    this.scene.add(this.mapGroup);
    const origAdd = this.scene.add.bind(this.scene);
    this.scene.add = (obj) => { this.mapGroup.add(obj); };

    this.createSky();
    this.createLights();
    this.createOceanAndBeach();
    this.createPerimeterWalls();
    this.buildBoardwalkAndPier();     // Bombsite A
    this.buildTikiCabanasAndLagoon();  // Bombsite B
    this.buildMidPromenade();          // Mid
    this.buildTacticalProps();         // Crates, Umbrellas, Deck Chairs
    this.buildPalmGroves();            // 3D Palm Trees
    this.buildCoastalRocks();          // Boulders
    this.buildSiteDecals();            // A & B Markings

    this.scene.add = origAdd;
  }

  // 1. Tropical Sky Dome
  createSky() {
    const skyGeom = new THREE.SphereGeometry(180, 32, 16);
    const skyMat = window.csTextures.getSkyMaterial();
    const sky = new THREE.Mesh(skyGeom, skyMat);
    this.scene.add(sky);
  }

  // 2. Warm Tropical Sunlight & Ocean Reflections
  createLights() {
    // Ambient light: toned down to eliminate blown-out white walls
    const ambient = new THREE.AmbientLight(0xfff1dc, 0.45);
    this.scene.add(ambient);

    // Warm Sun Directional Light
    const sun = new THREE.DirectionalLight(0xfffae8, 1.10);
    sun.position.set(45, 65, -35);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 180;
    sun.shadow.camera.left = -65;
    sun.shadow.camera.right = 65;
    sun.shadow.camera.top = 65;
    sun.shadow.camera.bottom = -65;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);

    // Subtle blue fill from turquoise ocean
    const oceanBounce = new THREE.DirectionalLight(0x48cae4, 0.35);
    oceanBounce.position.set(-45, 20, 0);
    this.scene.add(oceanBounce);
  }

  // 3. Turquoise Ocean & Golden Sand Beach
  createOceanAndBeach() {
    // --- MAIN GOLDEN SAND TERRAIN ---
    const sandTex = window.csTextures.getSandTexture();
    const groundMat = new THREE.MeshStandardMaterial({
      map: sandTex,
      roughness: 0.92,
      metalness: 0.02
    });

    const groundGeom = new THREE.PlaneGeometry(160, 160, 32, 32);
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // --- WET SHORE SAND BELT ---
    const wetSandTex = window.csTextures.getWetSandTexture();
    const wetSandMat = new THREE.MeshStandardMaterial({
      map: wetSandTex,
      roughness: 0.45,
      metalness: 0.15
    });
    const wetSandGeom = new THREE.PlaneGeometry(16, 150);
    const wetSand = new THREE.Mesh(wetSandGeom, wetSandMat);
    wetSand.rotation.x = -Math.PI / 2;
    wetSand.position.set(-28, 0.015, 0);
    wetSand.receiveShadow = true;
    this.scene.add(wetSand);

    // --- SPARKLING TURQUOISE OCEAN SURFACE ---
    const waterTex = window.csTextures.getWaterTexture();
    const waterMat = new THREE.MeshStandardMaterial({
      map: waterTex,
      color: 0x00b4d8,
      roughness: 0.1,
      metalness: 0.65,
      transparent: true,
      opacity: 0.88
    });

    const waterGeom = new THREE.PlaneGeometry(100, 180, 24, 24);
    const water = new THREE.Mesh(waterGeom, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(-58, 0.03, 0);
    water.receiveShadow = true;
    this.scene.add(water);
    this.waterMesh = water;

    // --- WHITE WATER FOAM SHORELINE CREST ---
    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.45
    });
    const foamGeom = new THREE.PlaneGeometry(2.5, 150);
    const foam = new THREE.Mesh(foamGeom, foamMat);
    foam.rotation.x = -Math.PI / 2;
    foam.position.set(-34, 0.04, 0);
    this.scene.add(foam);
  }

  // Solid wall helper with collision box
  addWall(x, y, z, w, h, d, customMat = null) {
    const wallTex = window.csTextures.getWallTexture();
    const mat = customMat || new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.82,
      metalness: 0.05
    });

    const geom = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    // Bounding box for collision
    const box = new THREE.Box3();
    box.setFromObject(mesh);
    this.colliders.push(box);
    return mesh;
  }

  // Solid platform helper with top surface registration
  addPlatform(x, y, z, w, h, d, customMat = null) {
    const mat = customMat || new THREE.MeshStandardMaterial({
      map: window.csTextures.getWoodPlankTexture(),
      roughness: 0.75,
      metalness: 0.05
    });

    const geom = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const box = new THREE.Box3();
    box.setFromObject(mesh);
    this.colliders.push(box);

    const topY = y + h;
    this.platforms.push({ box, topY, isRamp: false });
    return mesh;
  }

  // Smooth Walkable Ramp Helper
  addRamp(x, y, z, w, h, d, rotY = 0) {
    const mat = new THREE.MeshStandardMaterial({
      map: window.csTextures.getWoodPlankTexture(),
      roughness: 0.75
    });
    const geom = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y + h / 2, z);
    mesh.rotation.y = rotY;
    // Slight incline
    mesh.rotation.x = Math.atan2(h, d);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const box = new THREE.Box3();
    box.setFromObject(mesh);
    this.platforms.push({ box, topY: y + h, isRamp: true, startY: y, endY: y + h, minZ: z - d / 2, maxZ: z + d / 2 });
    return mesh;
  }

  // 4. Perimeter boundaries
  createPerimeterWalls() {
    const h = 7;
    // South boundary (Resort entrance behind CT spawn)
    this.addWall(0, 0, 56, 120, h, 4);
    // North boundary (Pirate cove cliffs behind T spawn)
    this.addWall(0, 0, -68, 120, h, 4);
    // East boundary (Inland coastal villas)
    this.addWall(50, 0, 0, 4, h, 130);
    // West boundary (Ocean coral barrier)
    this.addWall(-52, 0, 0, 4, h, 130);
  }

  // 5. Bombsite A: The Beach Boardwalk Pier & Coastal Watchtower
  buildBoardwalkAndPier() {
    const woodMat = new THREE.MeshStandardMaterial({
      map: window.csTextures.getWoodPlankTexture(),
      roughness: 0.72
    });

    // Elevated Wooden Boardwalk Deck (Y = 1.0)
    this.addPlatform(22, 0, 28, 22, 1.0, 20, woodMat);

    // Smooth Walkable Ramp from Sand (Y=0) up to Boardwalk (Y=1.0)
    this.addRamp(22, 0, 15, 10, 1.0, 6);

    // Boardwalk Guard Railings (Slender wood bars)
    const railMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.6 });
    // East railing
    this.addWall(32.8, 1.0, 28, 0.4, 1.1, 20, railMat);
    // South railing
    this.addWall(22, 1.0, 37.8, 22, 1.1, 0.4, railMat);

    // Wooden Support Pilings underneath
    for (let px = 12; px <= 32; px += 5) {
      for (let pz = 19; pz <= 37; pz += 6) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.2, 8), woodMat);
        post.position.set(px, 0.5, pz);
        this.scene.add(post);
      }
    }

    // --- LIFEGUARD / OBSERVATION TOWER (Overlooking Site A) ---
    const towerMat = new THREE.MeshStandardMaterial({ color: 0xef233c, roughness: 0.5 }); // Iconic Red & White
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfdf0d5, roughness: 0.6 });

    // 4 Tower Legs
    const legGeom = new THREE.CylinderGeometry(0.18, 0.18, 3.6, 8);
    const legCoords = [
      [27, 33], [31, 33], [27, 37], [31, 37]
    ];
    legCoords.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeom, whiteMat);
      leg.position.set(lx, 2.8, lz);
      this.scene.add(leg);
      const legBox = new THREE.Box3().setFromObject(leg);
      this.colliders.push(legBox);
    });

    // Tower Observation Floor Platform (Y = 4.4)
    this.addPlatform(29, 4.4, 35, 5, 0.3, 5, woodMat);

    // Tower Sun Canopy Roof
    const roofGeom = new THREE.ConeGeometry(3.6, 1.4, 4);
    const roof = new THREE.Mesh(roofGeom, towerMat);
    roof.position.set(29, 6.8, 35);
    roof.rotation.y = Math.PI / 4;
    this.scene.add(roof);

    // Maritime Pier Divider Wall
    this.addWall(10, 0, 24, 2, 4.5, 14);
  }

  // 6. Bombsite B: Tiki Beach Cabanas, Lagoon & Resort Bar
  buildTikiCabanasAndLagoon() {
    const thatchMat = new THREE.MeshStandardMaterial({
      map: window.csTextures.getThatchTexture(),
      roughness: 0.95
    });
    const bambooMat = new THREE.MeshStandardMaterial({
      map: window.csTextures.getWoodPlankTexture(),
      roughness: 0.7
    });

    // --- MAIN TIKI CABANA (Site B Center) ---
    const cabanaW = 14;
    const cabanaD = 12;
    const cabanaH = 3.6;
    const cx = -22;
    const cz = -16;

    // Wooden deck floor
    this.addPlatform(cx, 0, cz, cabanaW, 0.25, cabanaD, bambooMat);

    // 4 Bamboo corner posts
    const postGeom = new THREE.CylinderGeometry(0.25, 0.25, cabanaH, 8);
    const corners = [
      [cx - cabanaW / 2 + 0.4, cz - cabanaD / 2 + 0.4],
      [cx + cabanaW / 2 - 0.4, cz - cabanaD / 2 + 0.4],
      [cx - cabanaW / 2 + 0.4, cz + cabanaD / 2 - 0.4],
      [cx + cabanaW / 2 - 0.4, cz + cabanaD / 2 - 0.4]
    ];
    corners.forEach(([kx, kz]) => {
      const post = new THREE.Mesh(postGeom, bambooMat);
      post.position.set(kx, cabanaH / 2, kz);
      post.castShadow = true;
      this.scene.add(post);
      const box = new THREE.Box3().setFromObject(post);
      this.colliders.push(box);
    });

    // West solid wall (facing ocean)
    this.addWall(cx - cabanaW / 2, 0, cz, 0.6, cabanaH, cabanaD);
    // North wall with door opening
    this.addWall(cx - 3.5, 0, cz - cabanaD / 2, 6, cabanaH, 0.6);
    this.addWall(cx + 4.5, 0, cz - cabanaD / 2, 4, cabanaH, 0.6);
    // South wall
    this.addWall(cx, 0, cz + cabanaD / 2, cabanaW, cabanaH, 0.6);

    // Massive Thatched Pyramid Roof
    const thatchRoof = new THREE.Mesh(new THREE.ConeGeometry(10.5, 2.6, 4), thatchMat);
    thatchRoof.position.set(cx, cabanaH + 1.2, cz);
    thatchRoof.rotation.y = Math.PI / 4;
    thatchRoof.castShadow = true;
    this.scene.add(thatchRoof);

    // --- BEACH RESORT COCKTAIL BAR COUNTER ---
    const barMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.6 });
    // L-shaped bar counter
    this.addPlatform(cx + 2, 0, cz - 1, 4.5, 1.15, 1.2, barMat);
    this.addPlatform(cx + 4, 0, cz + 1.5, 1.2, 1.15, 4.0, barMat);

    // Connecting wall between Cabanas and Mid
    this.addWall(-12, 0, -2, 2, 5.0, 24);
  }

  // 7. Mid Beach Promenade & Market Stalls
  buildMidPromenade() {
    // West mid wall
    this.addWall(-10, 0, 14, 2, 5.0, 16);
    // East mid wall
    this.addWall(8, 0, -14, 2, 5.0, 22);

    // --- BEACH MARKET STALLS WITH STRIPED AWNINGS ---
    const woodMat = new THREE.MeshStandardMaterial({ map: window.csTextures.getWoodPlankTexture() });
    const awningMat = new THREE.MeshStandardMaterial({
      map: window.csTextures.getUmbrellaTexture('#06d6a0', '#ffffff'),
      roughness: 0.5
    });

    // Stall 1 (Mid Left)
    this.addPlatform(-4, 0, -4, 4.2, 1.0, 2.2, woodMat);
    // Awning overhead
    const awn1 = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.15, 2.6), awningMat);
    awn1.position.set(-4, 2.8, -4);
    awn1.rotation.x = 0.15;
    this.scene.add(awn1);

    // Stall 2 (Mid Right)
    this.addPlatform(4, 0, 4, 4.2, 1.0, 2.2, woodMat);
    const awn2 = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.15, 2.6), awningMat);
    awn2.position.set(4, 2.8, 4);
    awn2.rotation.x = -0.15;
    this.scene.add(awn2);

    // Central Sandbag Fortification in Mid
    const sandbagMat = new THREE.MeshStandardMaterial({ color: 0xc2a679, roughness: 0.95 });
    this.addWall(0, 0, -1, 3.5, 1.1, 1.0, sandbagMat);
  }

  // 8. Tactical Beach Props: Freight Crates, Striped Umbrellas, Sun Loungers & Surfboards
  buildTacticalProps() {
    const crateMat = new THREE.MeshStandardMaterial({
      map: window.csTextures.getCrateTexture(),
      roughness: 0.7,
      metalness: 0.15
    });

    const addCrate = (x, y, z, size = 1.8) => {
      this.addPlatform(x, y, z, size, size, size, crateMat);
    };

    // --- BOMBSITE A CRATES (Boardwalk Tactical Cover) ---
    addCrate(20, 1.0, 24, 1.8);
    addCrate(20, 2.8, 24, 1.6); // Stacked double crate!
    addCrate(24, 1.0, 24, 1.8);
    addCrate(22, 1.0, 33, 1.8);
    addCrate(15, 0, 8, 1.8);
    addCrate(17, 0, 8, 1.8);

    // --- BOMBSITE B CRATES & CABANA COVER ---
    addCrate(-25, 0.25, -14, 1.8);
    addCrate(-25, 2.05, -14, 1.6); // Stacked crate!
    addCrate(-18, 0.25, -20, 1.8);
    addCrate(-28, 0, -6, 1.8);

    // --- T & CT SPAWN COVER CRATES ---
    addCrate(3, 0, -46, 1.8);
    addCrate(-4, 0, -46, 1.8);
    addCrate(4, 0, 36, 1.8);
    addCrate(-4, 0, 36, 1.8);

    // --- STRIPED RESORT BEACH UMBRELLAS ---
    const colors = [
      ['#e63946', '#f1faee'], // Coral Red & Cream
      ['#1d3557', '#a8dadc'], // Navy Blue & Aqua
      ['#ffb703', '#ffffff']  // Golden Yellow & White
    ];

    const addUmbrella = (x, z, colIdx = 0) => {
      const [cA, cB] = colors[colIdx % colors.length];
      const canopyMat = new THREE.MeshStandardMaterial({
        map: window.csTextures.getUmbrellaTexture(cA, cB),
        roughness: 0.5,
        side: THREE.DoubleSide
      });
      const poleMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.8, roughness: 0.2 });

      // Metal pole
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.8, 8), poleMat);
      pole.position.set(x, 1.4, z);
      this.scene.add(pole);

      // Umbrella Canopy
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.2, 0.7, 16), canopyMat);
      canopy.position.set(x, 2.7, z);
      canopy.castShadow = true;
      this.scene.add(canopy);

      // Umbrella pole collider
      const box = new THREE.Box3();
      box.setFromCenterAndSize(new THREE.Vector3(x, 1.4, z), new THREE.Vector3(0.5, 2.8, 0.5));
      this.colliders.push(box);
    };

    addUmbrella(-16, -10, 0);
    addUmbrella(-20, -6, 1);
    addUmbrella(-14, 2, 2);
    addUmbrella(14, 20, 0);
    addUmbrella(28, 22, 1);

    // --- BEACH DECK CHAIRS / SUN LOUNGERS ---
    const addDeckChair = (x, z, rotY = 0) => {
      const chairMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
      const chair = new THREE.Group();
      // Base frame
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 1.8), chairMat);
      frame.position.y = 0.18;
      chair.add(frame);
      // Incline backrest
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.7), chairMat);
      back.position.set(0, 0.45, -0.6);
      back.rotation.x = -0.55;
      chair.add(back);

      chair.position.set(x, 0, z);
      chair.rotation.y = rotY;
      chair.castShadow = true;
      this.scene.add(chair);

      const box = new THREE.Box3().setFromObject(chair);
      this.colliders.push(box);
    };

    addDeckChair(-17, -10, Math.PI / 4);
    addDeckChair(-19, -8, Math.PI / 4);
    addDeckChair(-15, 2, -Math.PI / 3);

    // --- COLORFUL SURFBOARDS PROPPED IN SAND ---
    const addSurfboard = (x, z, colorHex = 0xff006e, rotY = 0) => {
      const boardMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.25, metalness: 0.1 });
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.0, 0.1), boardMat);
      board.position.set(x, 0.9, z);
      board.rotation.set(0.18, rotY, 0.08);
      board.castShadow = true;
      this.scene.add(board);
    };

    addSurfboard(-14.2, -15.8, 0xff006e, 0.4);
    addSurfboard(-13.8, -15.5, 0x3a86ff, 0.6);
    addSurfboard(11.2, 23.5, 0xffbe0b, -0.5);
  }

  // 9. Lush 3D Coconut Palm Tree Groves
  buildPalmGroves() {
    const palmPositions = [
      // Along Shoreline & Dunes
      [-26, -35], [-28, -20], [-26, 0], [-28, 18], [-25, 34],
      // Around Cabanas (Site B)
      [-14, -22], [-30, -10], [-18, -4],
      // Along Boardwalk & Pier (Site A)
      [12, 14], [34, 18], [14, 32], [34, 38],
      // Central Promenade & Spawns
      [-6, -48], [6, -48], [8, -32], [-8, 22], [8, 24], [-6, 38], [8, 44]
    ];

    palmPositions.forEach(([px, pz], idx) => {
      this.createPalmTree(px, 0, pz, 6.5 + (idx % 3) * 0.8, (idx * 1.3) % (Math.PI * 2));
    });
  }

  createPalmTree(x, y, z, height = 7, leanAngle = 0) {
    const barkMat = new THREE.MeshStandardMaterial({
      map: window.csTextures.getPalmBarkTexture(),
      roughness: 0.85
    });
    const leafMat = new THREE.MeshStandardMaterial({
      map: window.csTextures.getPalmLeafTexture(),
      roughness: 0.5,
      side: THREE.DoubleSide
    });
    const coconutMat = new THREE.MeshStandardMaterial({ color: 0x4a2e18, roughness: 0.8 });

    const tree = new THREE.Group();
    tree.position.set(x, y, z);

    // Curved Trunk Segments
    const segments = 6;
    const segH = height / segments;
    let currY = 0;
    let currX = 0;
    const curveDir = Math.sin(leanAngle) * 0.18;

    for (let s = 0; s < segments; s++) {
      const radiusTop = 0.32 - (s * 0.025);
      const radiusBottom = 0.36 - (s * 0.025);
      const segMesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, segH, 8), barkMat);
      segMesh.position.set(currX, currY + segH / 2, 0);
      segMesh.rotation.z = curveDir * (s * 0.4);
      segMesh.castShadow = true;
      tree.add(segMesh);

      currY += segH;
      currX += Math.sin(curveDir * (s * 0.4)) * segH;
    }

    // Cluster of 4 Coconuts under the crown
    for (let c = 0; c < 4; c++) {
      const coco = new THREE.Mesh(new THREE.SphereGeometry(0.24, 6, 6), coconutMat);
      const angle = (c * Math.PI) / 2;
      coco.position.set(currX + Math.cos(angle) * 0.28, currY - 0.2, Math.sin(angle) * 0.28);
      tree.add(coco);
    }

    // Layered 3D Palm Fronds radiating outward
    const frondCount = 9;
    for (let f = 0; f < frondCount; f++) {
      const fAngle = (f / frondCount) * Math.PI * 2;
      const frondGeom = new THREE.PlaneGeometry(3.6, 0.9);
      const frond = new THREE.Mesh(frondGeom, leafMat);
      frond.position.set(currX, currY, 0);
      frond.rotation.order = 'YXZ';
      frond.rotation.y = fAngle;
      frond.rotation.x = -0.45; // Downward drooping arch
      frond.rotation.z = (Math.random() - 0.5) * 0.2;
      frond.castShadow = true;
      tree.add(frond);
      this.palmLeaves.push(frond);
    }

    this.scene.add(tree);

    // Trunk collider at base
    const baseCollider = new THREE.Box3();
    baseCollider.setFromCenterAndSize(new THREE.Vector3(x, 1.5, z), new THREE.Vector3(0.9, 3.0, 0.9));
    this.colliders.push(baseCollider);
  }

  // 10. Coastal Rock Formations & Granite Boulders
  buildCoastalRocks() {
    const rockMat = new THREE.MeshStandardMaterial({
      map: window.csTextures.getRockTexture(),
      roughness: 0.9
    });

    const addBoulder = (x, y, z, rx, ry, rz) => {
      const geom = new THREE.DodecahedronGeometry(1.0, 1);
      const rock = new THREE.Mesh(geom, rockMat);
      rock.scale.set(rx, ry, rz);
      rock.position.set(x, y + ry * 0.7, z);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);

      const box = new THREE.Box3().setFromObject(rock);
      this.colliders.push(box);
      this.platforms.push({ box, topY: y + ry * 1.4, isRamp: false });
    };

    // Rocks scattered on the shore and boundaries
    addBoulder(-32, 0, -42, 2.8, 1.8, 2.5);
    addBoulder(-34, 0, -22, 3.2, 2.2, 3.0);
    addBoulder(-32, 0, 8, 2.4, 1.6, 2.2);
    addBoulder(-30, 0, 30, 3.0, 2.0, 2.8);
    addBoulder(36, 0, -32, 3.5, 2.4, 3.2);
    addBoulder(38, 0, 5, 2.8, 1.9, 2.6);
  }

  // 11. Bombsite Decals
  buildSiteDecals() {
    // Decal A on Boardwalk Pier Shipping Crate
    const decalMatA = new THREE.MeshBasicMaterial({
      map: window.csTextures.getSiteDecalTexture('A'),
      transparent: true,
      depthWrite: false
    });
    const meshA = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), decalMatA);
    meshA.position.set(22, 2.6, 33.91);
    this.scene.add(meshA);

    // Decal B on Tiki Cabana Wall
    const decalMatB = new THREE.MeshBasicMaterial({
      map: window.csTextures.getSiteDecalTexture('B'),
      transparent: true,
      depthWrite: false
    });
    const meshB = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), decalMatB);
    meshB.position.set(-22, 2.2, -10.05);
    this.scene.add(meshB);

    // Glowing Ground Plant Zones (Red / Amber perimeter rings on ground)
    const ringGeom = new THREE.RingGeometry(7.5, 7.9, 32);

    const ringMatA = new THREE.MeshBasicMaterial({ color: 0xff3b30, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
    const groundZoneA = new THREE.Mesh(ringGeom, ringMatA);
    groundZoneA.rotation.x = -Math.PI / 2;
    groundZoneA.position.set(22, 0.95, 28);
    this.scene.add(groundZoneA);

    const ringMatB = new THREE.MeshBasicMaterial({ color: 0xff9500, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
    const groundZoneB = new THREE.Mesh(ringGeom, ringMatB);
    groundZoneB.rotation.x = -Math.PI / 2;
    groundZoneB.position.set(-22, 0.05, -16);
    this.scene.add(groundZoneB);
  }

  // Robust Ground Height Query (Smooth Walking, Stairs, Ramps, Zero Flying!)
  getGroundHeight(x, z, currentY = 0) {
    let highestGround = 0; // Default flat beach sand Y = 0

    // Shallow ocean water dip along west shoreline
    if (x < -32) {
      highestGround = -0.15;
    }

    // Check all registered solid platforms and ramps
    for (let i = 0; i < this.platforms.length; i++) {
      const plat = this.platforms[i];
      const box = plat.box;

      // Check horizontal footprint with 0.35m character margin
      if (x >= box.min.x - 0.35 && x <= box.max.x + 0.35 &&
          z >= box.min.z - 0.35 && z <= box.max.z + 0.35) {

        if (plat.isRamp) {
          // Linear interpolation along ramp Z length
          const t = Math.max(0, Math.min(1, (z - plat.minZ) / (plat.maxZ - plat.minZ)));
          const rampY = plat.startY + (plat.endY - plat.startY) * t;
          if (rampY > highestGround) {
            highestGround = rampY;
          }
        } else {
          // Only step onto platform if character is roughly at or above its base
          if (currentY >= box.min.y - 0.5 && plat.topY > highestGround) {
            highestGround = plat.topY;
          }
        }
      }
    }

    return highestGround;
  }

  // Collision detection helper (ignores platform tops below feet to prevent jitter)
  checkCollision(position, radius = 0.42, feetY = null) {
    // Reuse a cached sphere instead of allocating a new one each call
    if (!this._collisionSphere) this._collisionSphere = new THREE.Sphere();
    this._collisionSphere.center.copy(position);
    this._collisionSphere.radius = radius;
    for (let i = 0; i < this.colliders.length; i++) {
      const box = this.colliders[i];
      // If feet level is known, skip colliders whose top is below or near feet height
      if (feetY !== null && box.max.y <= feetY + 0.35) {
        continue;
      }
      if (box.intersectsSphere(this._collisionSphere)) {
        return true;
      }
    }
    return false;
  }

  // Get nearest waypoint for bots
  getNearestWaypoint(x, z) {
    let nearest = null;
    let minDist = Infinity;
    for (const wp of this.waypoints) {
      const d = Math.hypot(wp.x - x, wp.z - z);
      if (d < minDist) {
        minDist = d;
        nearest = wp;
      }
    }
    return nearest;
  }

  // Animation update for swaying palm leaves and ocean water
  update(delta) {
    // Gentle sway of palm leaves in ocean breeze
    const time = performance.now() * 0.002;
    for (let i = 0; i < this.palmLeaves.length; i++) {
      const leaf = this.palmLeaves[i];
      leaf.rotation.z += Math.sin(time + i) * 0.0015;
    }

    // Update animated ocean caustics & wave reflections
    if (window.csTextures && window.csTextures.updateWater) {
      window.csTextures.updateWater(delta);
    }
  }
}

// ==========================================================================
// AUTHENTIC DE_DUST2 (LEGENDARY DESERT FORTRESS) 3D MAP ARCHITECTURE
// ==========================================================================

class CSDust2Map {
  constructor(scene) {
    this.scene = scene;
    this.mapGroup = new THREE.Group();
    this.colliders = []; // Array of THREE.Box3 for collision detection
    this.platforms = []; // Array of { box: THREE.Box3, topY: number, isRamp: boolean }

    // Bombsite coordinates
    this.bombsiteA = { x: 20, z: 28, radius: 8.5 }; // Raised A Platform & Goose
    this.bombsiteB = { x: -22, z: 12, radius: 8.5 }; // Raised B Platform, Window & Doors

    // Spawn points
    this.spawnPoints = {
      ct: [
        { x: 2, y: 0, z: 42 },
        { x: 6, y: 0, z: 44 },
        { x: -2, y: 0, z: 42 },
        { x: 0, y: 0, z: 46 }
      ],
      t: [
        { x: 0, y: 0, z: -56 },
        { x: 4, y: 0, z: -58 },
        { x: -4, y: 0, z: -56 },
        { x: 2, y: 0, z: -54 }
      ]
    };

    // Bot tactical navigation waypoints for de_dust2
    this.waypoints = [
      // T Spawn
      { id: 't_spawn', x: 0, z: -56, type: 'spawn_t' },
      { id: 't_suicide', x: 0, z: -36, type: 'path' },
      { id: 't_long_outside', x: 22, z: -46, type: 'path' },
      { id: 't_tunnels_entry', x: -14, z: -46, type: 'path' },

      // Long A Route
      { id: 'long_doors_out', x: 28, z: -36, type: 'choke' },
      { id: 'long_doors_in', x: 28, z: -26, type: 'choke' },
      { id: 'pit', x: 36, z: -20, type: 'path' },
      { id: 'long_a_corner', x: 32, z: 0, type: 'path' },
      { id: 'long_a_ramp', x: 24, z: 16, type: 'ramp' },
      { id: 'site_a', x: 20, z: 28, type: 'bombsite' },
      { id: 'site_a_goose', x: 24, z: 34, type: 'path' },

      // Mid & Catwalk / Short A
      { id: 'mid_doors_t', x: 0, z: -8, type: 'choke' },
      { id: 'mid_doors_ct', x: 0, z: 6, type: 'choke' },
      { id: 'catwalk_ramp', x: 10, z: -6, type: 'ramp' },
      { id: 'catwalk_short', x: 11, z: 8, type: 'path' },
      { id: 'short_a_stairs', x: 12, z: 18, type: 'path' },

      // B Tunnels Route
      { id: 'b_upper_1', x: -20, z: -35, type: 'path' },
      { id: 'b_upper_2', x: -22, z: -18, type: 'path' },
      { id: 'b_tunnel_exit', x: -22, z: -4, type: 'choke' },
      { id: 'site_b', x: -22, z: 12, type: 'bombsite' },
      { id: 'b_platform', x: -26, z: 15, type: 'path' },
      { id: 'b_doors_exit', x: -11, z: 18, type: 'choke' },
      { id: 'b_window_exit', x: -13, z: 11, type: 'path' },

      // CT Spawn & Mid
      { id: 'ct_mid', x: 2, z: 14, type: 'path' },
      { id: 'ct_spawn', x: 2, z: 42, type: 'spawn_ct' },
      { id: 'ct_to_a', x: 14, z: 38, type: 'path' },
      { id: 'ct_to_b', x: -10, z: 32, type: 'path' }
    ];

    this.navConnections = {
      t_spawn: ['t_suicide', 't_long_outside', 't_tunnels_entry'],
      t_suicide: ['mid_doors_t', 't_long_outside'],
      t_long_outside: ['long_doors_out'],
      long_doors_out: ['long_doors_in'],
      long_doors_in: ['long_a_corner', 'pit'],
      pit: ['long_a_corner'],
      long_a_corner: ['long_a_ramp'],
      long_a_ramp: ['site_a'],
      site_a: ['site_a_goose', 'short_a_stairs', 'ct_to_a'],
      site_a_goose: ['site_a'],
      mid_doors_t: ['mid_doors_ct', 'catwalk_ramp'],
      mid_doors_ct: ['ct_mid', 'catwalk_ramp'],
      catwalk_ramp: ['catwalk_short'],
      catwalk_short: ['short_a_stairs'],
      short_a_stairs: ['site_a'],
      t_tunnels_entry: ['b_upper_1'],
      b_upper_1: ['b_upper_2'],
      b_upper_2: ['b_tunnel_exit'],
      b_tunnel_exit: ['site_b', 'b_platform'],
      site_b: ['b_platform', 'b_doors_exit', 'b_window_exit'],
      b_platform: ['site_b'],
      b_doors_exit: ['ct_to_b'],
      b_window_exit: ['ct_mid'],
      ct_mid: ['mid_doors_ct', 'ct_spawn', 'b_window_exit'],
      ct_spawn: ['ct_to_a', 'ct_to_b', 'ct_mid'],
      ct_to_a: ['site_a'],
      ct_to_b: ['b_doors_exit']
    };
  }

  destroy() {
    if (this.mapGroup) {
      this.mapGroup.traverse(obj => {
        if (obj.geometry) {
          try { obj.geometry.dispose(); } catch (e) {}
        }
      });
      this.scene.remove(this.mapGroup);
    }
    this.colliders = [];
    this.platforms = [];
  }

  buildMap() {
    this.mapGroup = new THREE.Group();
    this.scene.add(this.mapGroup);

    this.createSky();
    this.createLights();
    this.createGroundAndBoundaries();
    this.buildTSpawnAndSuicide();
    this.buildLongDoorsAndLongA();
    this.buildBombsiteA();
    this.buildCatwalkAndShortA();
    this.buildMidAndDoubleDoors();
    this.buildTunnelsToB();
    this.buildBombsiteB();
    this.buildCTSpawn();
    this.buildSiteDecals();
  }

  // 1. Desert Sky Dome
  createSky() {
    const skyGeom = new THREE.SphereGeometry(180, 32, 16);
    const skyMat = window.csTextures.getDustSkyMaterial();
    const sky = new THREE.Mesh(skyGeom, skyMat);
    this.mapGroup.add(sky);
  }

  // 2. Blazing Desert Sun & Warm Ambient Haze
  createLights() {
    // Toned-down desert ambient light to provide volumetric shadows and eliminate washed-out white walls
    const ambient = new THREE.AmbientLight(0xd4be9e, 0.46);
    this.mapGroup.add(ambient);

    // Warm Sun Directional Light
    const sun = new THREE.DirectionalLight(0xfffaec, 1.15);
    sun.position.set(45, 75, -25);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 190;
    sun.shadow.camera.left = -65;
    sun.shadow.camera.right = 65;
    sun.shadow.camera.top = 65;
    sun.shadow.camera.bottom = -65;
    sun.shadow.bias = -0.0005;
    this.mapGroup.add(sun);

    // Sky azure bounce light
    const skyBounce = new THREE.DirectionalLight(0x7da4cc, 0.22);
    skyBounce.position.set(-40, 25, 30);
    this.mapGroup.add(skyBounce);
  }

  // 3. Desert Ground Terrain & Perimeter Walls
  createGroundAndBoundaries() {
    // Sandy dust ground with BumpMap
    const groundGeom = new THREE.PlaneGeometry(120, 150);
    const groundMat = new THREE.MeshStandardMaterial({
      map: window.csTextures.getDustGroundTexture(),
      bumpMap: window.csTextures.getDustGroundBump(),
      bumpScale: 0.05,
      roughness: 0.92,
      metalness: 0.04
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, -2);
    ground.receiveShadow = true;
    this.mapGroup.add(ground);

    // Solid base ground collider platform
    this.platforms.push({
      box: new THREE.Box3(new THREE.Vector3(-55, -1, -70), new THREE.Vector3(55, 0, 65)),
      topY: 0,
      isRamp: false
    });

    const wallMat = new THREE.MeshStandardMaterial({
      map: window.csTextures.getDustWallTexture(),
      bumpMap: window.csTextures.getDustWallBump(),
      bumpScale: 0.08,
      roughness: 0.82,
      metalness: 0.05
    });

    // Outer Perimeter Boundary Walls (South, North, West, East)
    const boundaries = [
      { x: 0, y: 3.5, z: -64, w: 110, h: 7, d: 2 },  // South (behind T Spawn)
      { x: 0, y: 3.5, z: 54, w: 110, h: 7, d: 2 },   // North (behind CT Spawn)
      { x: -42, y: 3.5, z: -5, w: 2, h: 7, d: 120 }, // West (behind B)
      { x: 44, y: 3.5, z: -5, w: 2, h: 7, d: 120 }   // East (behind Long A)
    ];

    boundaries.forEach(b => {
      const geom = new THREE.BoxGeometry(b.w, b.h, b.d);
      const mesh = new THREE.Mesh(geom, wallMat);
      mesh.position.set(b.x, b.y, b.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.mapGroup.add(mesh);
      this.colliders.push(new THREE.Box3().setFromObject(mesh));
    });
  }

  // 4. T Spawn Courtyard & Suicide Alley
  buildTSpawnAndSuicide() {
    const wallMat = new THREE.MeshStandardMaterial({
      map: window.csTextures.getDustWallTexture(),
      roughness: 0.88
    });

    // Separator walls dividing T Spawn routes
    const walls = [
      { x: 10, y: 3.0, z: -46, w: 2, h: 6, d: 20 },  // Wall between suicide & Long approach
      { x: -10, y: 3.0, z: -46, w: 2, h: 6, d: 20 }, // Wall between suicide & Tunnel approach
      { x: 18, y: 3.0, z: -54, w: 14, h: 6, d: 2 }   // T Spawn eastern barrier
    ];

    walls.forEach(w => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w.w, w.h, w.d), wallMat);
      mesh.position.set(w.x, w.y, w.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.mapGroup.add(mesh);
      this.colliders.push(new THREE.Box3().setFromObject(mesh));
    });

    // T Spawn crates
    this.addCrate(4, 1.0, -52, 2.0);
    this.addCrate(-6, 1.0, -54, 2.0);
  }

  // 5. Long A Doors & Long A Corridor
  buildLongDoorsAndLongA() {
    const wallMat = new THREE.MeshStandardMaterial({
      map: window.csTextures.getDustWallTexture(),
      roughness: 0.88
    });

    // Long Double Doors Sandstone Gateway
    const gatewayL = new THREE.Mesh(new THREE.BoxGeometry(8, 6.5, 2.5), wallMat);
    gatewayL.position.set(22, 3.25, -32);
    this.mapGroup.add(gatewayL);
    this.colliders.push(new THREE.Box3().setFromObject(gatewayL));

    const gatewayR = new THREE.Mesh(new THREE.BoxGeometry(8, 6.5, 2.5), wallMat);
    gatewayR.position.set(34, 3.25, -32);
    this.mapGroup.add(gatewayR);
    this.colliders.push(new THREE.Box3().setFromObject(gatewayR));

    // Lintel arch spanning across Long doors
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(6, 1.8, 2.5), wallMat);
    lintel.position.set(28, 5.6, -32);
    this.mapGroup.add(lintel);

    // Green Metal Double Doors at Long A
    const doorMat = new THREE.MeshStandardMaterial({
      map: window.csTextures.getDustDoorTexture(),
      roughness: 0.55,
      metalness: 0.35
    });

    const doorL = new THREE.Mesh(new THREE.BoxGeometry(2.2, 4.2, 0.16), doorMat);
    doorL.position.set(26.8, 2.1, -32);
    doorL.rotation.y = -0.15;
    this.mapGroup.add(doorL);

    const doorR = new THREE.Mesh(new THREE.BoxGeometry(2.2, 4.2, 0.16), doorMat);
    doorR.position.set(29.2, 2.1, -32);
    doorR.rotation.y = 0.12;
    this.mapGroup.add(doorR);

    // Long A corridor walls (dividing Mid from Long A)
    const longWall = new THREE.Mesh(new THREE.BoxGeometry(2, 6.5, 42), wallMat);
    longWall.position.set(22, 3.25, -7);
    this.mapGroup.add(longWall);
    this.colliders.push(new THREE.Box3().setFromObject(longWall));

    // Pit corner barrier
    const pitWall = new THREE.Mesh(new THREE.BoxGeometry(6, 2.4, 2), wallMat);
    pitWall.position.set(38, 1.2, -16);
    this.mapGroup.add(pitWall);
    this.colliders.push(new THREE.Box3().setFromObject(pitWall));

    // Long A crates
    this.addCrate(29, 1.0, 10, 2.0);
    this.addCrate(36, 1.0, -22, 2.0);
  }

  // 6. Bombsite A (Platform, Ramp, Goose, and Crates)
  buildBombsiteA() {
    const wallMat = new THREE.MeshStandardMaterial({
      map: window.csTextures.getDustWallTexture(),
      roughness: 0.88
    });

    // Raised A Platform (16m wide, 1.6m high, 16m deep)
    const platGeom = new THREE.BoxGeometry(16, 1.6, 16);
    const plat = new THREE.Mesh(platGeom, wallMat);
    plat.position.set(20, 0.8, 28);
    plat.castShadow = true;
    plat.receiveShadow = true;
    this.mapGroup.add(plat);

    this.platforms.push({
      box: new THREE.Box3(new THREE.Vector3(12, 0, 20), new THREE.Vector3(28, 1.6, 36)),
      topY: 1.6,
      isRamp: false
    });

    // Long A Ramp onto A Platform (Z: 14 to 20, rises 0 -> 1.6m)
    const rampGeom = new THREE.BoxGeometry(6, 1.6, 6);
    const ramp = new THREE.Mesh(rampGeom, wallMat);
    ramp.position.set(23, 0.8, 17);
    ramp.rotation.x = 0.26; // Smooth inclined ramp
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    this.mapGroup.add(ramp);

    this.platforms.push({
      box: new THREE.Box3(new THREE.Vector3(20, 0, 14), new THREE.Vector3(26, 1.6, 20)),
      topY: 1.6,
      isRamp: true,
      minZ: 14,
      maxZ: 20,
      startY: 0,
      endY: 1.6
    });

    // The Goose Wall at back of A (Z: 36)
    const gooseWall = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 2), wallMat);
    gooseWall.position.set(20, 4.0, 36);
    this.mapGroup.add(gooseWall);
    this.colliders.push(new THREE.Box3().setFromObject(gooseWall));

    // A Site Defensive Crates
    this.addCrate(23, 2.7, 26, 2.2); // Default plant crate
    this.addCrate(18, 2.7, 30, 2.2); // Goose crate
    this.addCrate(15, 2.6, 23, 2.0); // Short cover crate
  }

  // 7. Catwalk & Short A Walkway
  buildCatwalkAndShortA() {
    const wallMat = new THREE.MeshStandardMaterial({
      map: window.csTextures.getDustWallTexture(),
      roughness: 0.88
    });

    // Catwalk elevated walkway (topY = 2.2m, x: 8 to 14, z: -4 to 18)
    const catwalkGeom = new THREE.BoxGeometry(6, 2.2, 22);
    const catwalk = new THREE.Mesh(catwalkGeom, wallMat);
    catwalk.position.set(11, 1.1, 7);
    catwalk.castShadow = true;
    catwalk.receiveShadow = true;
    this.mapGroup.add(catwalk);

    this.platforms.push({
      box: new THREE.Box3(new THREE.Vector3(8, 0, -4), new THREE.Vector3(14, 2.2, 18)),
      topY: 2.2,
      isRamp: false
    });

    // Ramp from Mid up to Catwalk (Z: -10 to -4, rises 0 -> 2.2m)
    const catRampGeom = new THREE.BoxGeometry(6, 2.2, 6);
    const catRamp = new THREE.Mesh(catRampGeom, wallMat);
    catRamp.position.set(11, 1.1, -7);
    catRamp.rotation.x = -0.34;
    catRamp.castShadow = true;
    catRamp.receiveShadow = true;
    this.mapGroup.add(catRamp);

    this.platforms.push({
      box: new THREE.Box3(new THREE.Vector3(8, 0, -10), new THREE.Vector3(14, 2.2, -4)),
      topY: 2.2,
      isRamp: true,
      minZ: -10,
      maxZ: -4,
      startY: 0,
      endY: 2.2
    });

    // Short A steps connecting Catwalk onto A Platform (Z: 18 to 21)
    const shortSteps = new THREE.Mesh(new THREE.BoxGeometry(4, 1.6, 3), wallMat);
    shortSteps.position.set(12, 0.8, 19.5);
    this.mapGroup.add(shortSteps);

    this.platforms.push({
      box: new THREE.Box3(new THREE.Vector3(10, 0, 18), new THREE.Vector3(14, 1.8, 21)),
      topY: 1.6,
      isRamp: false
    });

    // The iconic Mid "Xbox" crate
    this.addCrate(5, 1.1, -5, 2.2);
  }

  // 8. Mid Corridor & Iconic Mid Double Doors
  buildMidAndDoubleDoors() {
    const wallMat = new THREE.MeshStandardMaterial({
      map: window.csTextures.getDustWallTexture(),
      roughness: 0.88
    });

    // Mid double doors frame walls
    const midWallL = new THREE.Mesh(new THREE.BoxGeometry(6, 6.5, 2.0), wallMat);
    midWallL.position.set(-4.5, 3.25, 0);
    this.mapGroup.add(midWallL);
    this.colliders.push(new THREE.Box3().setFromObject(midWallL));

    const midWallR = new THREE.Mesh(new THREE.BoxGeometry(6, 6.5, 2.0), wallMat);
    midWallR.position.set(4.5, 3.25, 0);
    this.mapGroup.add(midWallR);
    this.colliders.push(new THREE.Box3().setFromObject(midWallR));

    // Archway spanning across mid doors
    const midArch = new THREE.Mesh(new THREE.BoxGeometry(5.0, 2.0, 2.0), wallMat);
    midArch.position.set(0, 5.5, 0);
    this.mapGroup.add(midArch);

    // Iconic Mid Double Doors (Green metal with sniper peek slit)
    const doorMat = new THREE.MeshStandardMaterial({
      map: window.csTextures.getDustDoorTexture(),
      roughness: 0.55,
      metalness: 0.35
    });

    const doorL = new THREE.Mesh(new THREE.BoxGeometry(2.1, 4.2, 0.16), doorMat);
    doorL.position.set(-1.25, 2.1, 0);
    doorL.rotation.y = -0.22; // Slightly open
    this.mapGroup.add(doorL);
    this.colliders.push(new THREE.Box3().setFromObject(doorL));

    const doorR = new THREE.Mesh(new THREE.BoxGeometry(2.1, 4.2, 0.16), doorMat);
    doorR.position.set(1.25, 2.1, 0);
    doorR.rotation.y = 0.08;
    this.mapGroup.add(doorR);
    this.colliders.push(new THREE.Box3().setFromObject(doorR));

    // Mid cover crates
    this.addCrate(-3.5, 1.0, -8, 2.0);
    this.addCrate(2.5, 1.0, 8, 2.0);
  }

  // 9. B Tunnels (Upper & Lower)
  buildTunnelsToB() {
    const wallMat = new THREE.MeshStandardMaterial({
      map: window.csTextures.getDustWallTexture(),
      roughness: 0.88
    });

    // Upper B Tunnel outer walls
    const tunnelWallW = new THREE.Mesh(new THREE.BoxGeometry(2, 6.5, 46), wallMat);
    tunnelWallW.position.set(-28, 3.25, -24);
    this.mapGroup.add(tunnelWallW);
    this.colliders.push(new THREE.Box3().setFromObject(tunnelWallW));

    const tunnelWallE = new THREE.Mesh(new THREE.BoxGeometry(2, 6.5, 36), wallMat);
    tunnelWallE.position.set(-16, 3.25, -29);
    this.mapGroup.add(tunnelWallE);
    this.colliders.push(new THREE.Box3().setFromObject(tunnelWallE));

    // Tunnel arched ceiling structures
    for (let z = -42; z <= -8; z += 12) {
      const arch = new THREE.Mesh(new THREE.BoxGeometry(10, 1.5, 2), wallMat);
      arch.position.set(-22, 5.5, z);
      this.mapGroup.add(arch);
    }

    // Lower tunnel divider wall connecting to Mid
    const lowerDiv = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 2), wallMat);
    lowerDiv.position.set(-11, 2.5, -11);
    this.mapGroup.add(lowerDiv);
    this.colliders.push(new THREE.Box3().setFromObject(lowerDiv));
  }

  // 10. Bombsite B (Platform, Ramp, B Doors & Window)
  buildBombsiteB() {
    const wallMat = new THREE.MeshStandardMaterial({
      map: window.csTextures.getDustWallTexture(),
      roughness: 0.88
    });

    // Raised B Platform (14m wide, 1.4m high, 14m deep)
    const bPlatGeom = new THREE.BoxGeometry(14, 1.4, 14);
    const bPlat = new THREE.Mesh(bPlatGeom, wallMat);
    bPlat.position.set(-23, 0.7, 13);
    bPlat.castShadow = true;
    bPlat.receiveShadow = true;
    this.mapGroup.add(bPlat);

    this.platforms.push({
      box: new THREE.Box3(new THREE.Vector3(-30, 0, 6), new THREE.Vector3(-16, 1.4, 20)),
      topY: 1.4,
      isRamp: false
    });

    // Ramp down from B Platform to B ground floor (Z: 2 to 6, rises 0 -> 1.4m)
    const bRampGeom = new THREE.BoxGeometry(6, 1.4, 4);
    const bRamp = new THREE.Mesh(bRampGeom, wallMat);
    bRamp.position.set(-23, 0.7, 4);
    bRamp.rotation.x = -0.32;
    bRamp.castShadow = true;
    bRamp.receiveShadow = true;
    this.mapGroup.add(bRamp);

    this.platforms.push({
      box: new THREE.Box3(new THREE.Vector3(-26, 0, 2), new THREE.Vector3(-20, 1.4, 6)),
      topY: 1.4,
      isRamp: true,
      minZ: 2,
      maxZ: 6,
      startY: 0,
      endY: 1.4
    });

    // B Double Doors Gateway (leading to CT spawn)
    const bDoorWallL = new THREE.Mesh(new THREE.BoxGeometry(4, 6.5, 2), wallMat);
    bDoorWallL.position.set(-14, 3.25, 20);
    this.mapGroup.add(bDoorWallL);
    this.colliders.push(new THREE.Box3().setFromObject(bDoorWallL));

    const bDoorWallR = new THREE.Mesh(new THREE.BoxGeometry(4, 6.5, 2), wallMat);
    bDoorWallR.position.set(-6, 3.25, 20);
    this.mapGroup.add(bDoorWallR);
    this.colliders.push(new THREE.Box3().setFromObject(bDoorWallR));

    // Green Metal B Doors
    const doorMat = new THREE.MeshStandardMaterial({
      map: window.csTextures.getDustDoorTexture(),
      roughness: 0.55,
      metalness: 0.35
    });
    const bDoor = new THREE.Mesh(new THREE.BoxGeometry(3.6, 4.2, 0.16), doorMat);
    bDoor.position.set(-10, 2.1, 20);
    bDoor.rotation.y = -0.18;
    this.mapGroup.add(bDoor);

    // B Window structure & opening
    const bWinWall = new THREE.Mesh(new THREE.BoxGeometry(2, 6.5, 6), wallMat);
    bWinWall.position.set(-10, 3.25, 10);
    this.mapGroup.add(bWinWall);
    this.colliders.push(new THREE.Box3().setFromObject(bWinWall));

    this.platforms.push({
      box: new THREE.Box3(new THREE.Vector3(-12, 0, 9), new THREE.Vector3(-8, 1.8, 13)),
      topY: 1.8,
      isRamp: false
    });

    // B Site Crates
    this.addCrate(-25, 2.5, 14, 2.2); // Double stack crate
    this.addCrate(-25, 4.7, 14, 2.2); // Top crate of double stack
    this.addCrate(-19, 2.5, 8, 2.2);  // Big box
    this.addCrate(-16, 2.3, 15, 1.8); // Window box
  }

  // 11. CT Spawn Area
  buildCTSpawn() {
    const wallMat = new THREE.MeshStandardMaterial({
      map: window.csTextures.getDustWallTexture(),
      roughness: 0.88
    });

    // CT Spawn protective barriers
    const ctBar1 = new THREE.Mesh(new THREE.BoxGeometry(8, 3.0, 1.5), wallMat);
    ctBar1.position.set(-6, 1.5, 36);
    this.mapGroup.add(ctBar1);
    this.colliders.push(new THREE.Box3().setFromObject(ctBar1));

    const ctBar2 = new THREE.Mesh(new THREE.BoxGeometry(8, 3.0, 1.5), wallMat);
    ctBar2.position.set(10, 1.5, 44);
    this.mapGroup.add(ctBar2);
    this.colliders.push(new THREE.Box3().setFromObject(ctBar2));

    this.addCrate(2, 1.0, 48, 2.0);
  }

  // Helper: Adds a tactical military crate with Box3 collider
  addCrate(x, y, z, size) {
    const crateMat = new THREE.MeshStandardMaterial({
      map: window.csTextures.getDustCrateTexture(),
      roughness: 0.72,
      metalness: 0.15
    });
    const geom = new THREE.BoxGeometry(size, size, size);
    const crate = new THREE.Mesh(geom, crateMat);
    crate.position.set(x, y, z);
    crate.castShadow = true;
    crate.receiveShadow = true;
    this.mapGroup.add(crate);

    const box = new THREE.Box3().setFromObject(crate);
    this.colliders.push(box);
    this.platforms.push({
      box: box,
      topY: y + size / 2,
      isRamp: false
    });
  }

  // 12. Bombsite A & B Ground Spray Decals
  buildSiteDecals() {
    const decalMatA = new THREE.MeshBasicMaterial({
      map: window.csTextures.getSiteDecalTexture('A'),
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide
    });
    const ringA = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), decalMatA);
    ringA.rotation.x = -Math.PI / 2;
    ringA.position.set(20, 1.62, 28); // On top of A platform
    this.mapGroup.add(ringA);

    const decalMatB = new THREE.MeshBasicMaterial({
      map: window.csTextures.getSiteDecalTexture('B'),
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide
    });
    const ringB = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), decalMatB);
    ringB.rotation.x = -Math.PI / 2;
    ringB.position.set(-22, 1.42, 12); // On top of B platform
    this.mapGroup.add(ringB);
  }

  // Robust Ground Height Query (Smooth Walking, Stairs, Ramps, Zero Flying!)
  getGroundHeight(x, z, currentY = 0) {
    let highestGround = 0; // Default flat desert sand Y = 0

    // Check all registered solid platforms and ramps
    for (let i = 0; i < this.platforms.length; i++) {
      const plat = this.platforms[i];
      const box = plat.box;

      // Check horizontal footprint with 0.35m character margin
      if (x >= box.min.x - 0.35 && x <= box.max.x + 0.35 &&
          z >= box.min.z - 0.35 && z <= box.max.z + 0.35) {

        if (plat.isRamp) {
          // Linear interpolation along ramp Z length
          const t = Math.max(0, Math.min(1, (z - plat.minZ) / (plat.maxZ - plat.minZ)));
          const rampY = plat.startY + (plat.endY - plat.startY) * t;
          if (rampY > highestGround) {
            highestGround = rampY;
          }
        } else {
          // Only step onto platform if character is roughly at or above its base
          if (currentY >= box.min.y - 0.5 && plat.topY > highestGround) {
            highestGround = plat.topY;
          }
        }
      }
    }

    return highestGround;
  }

  // Collision detection helper (ignores platform tops below feet to prevent jitter)
  checkCollision(position, radius = 0.42, feetY = null) {
    if (!this._collisionSphere) this._collisionSphere = new THREE.Sphere();
    this._collisionSphere.center.copy(position);
    this._collisionSphere.radius = radius;
    for (let i = 0; i < this.colliders.length; i++) {
      const box = this.colliders[i];
      if (feetY !== null && box.max.y <= feetY + 0.35) {
        continue;
      }
      if (box.intersectsSphere(this._collisionSphere)) {
        return true;
      }
    }
    return false;
  }

  // Get nearest waypoint for bots
  getNearestWaypoint(x, z) {
    let nearest = null;
    let minDist = Infinity;
    for (const wp of this.waypoints) {
      const d = Math.hypot(wp.x - x, wp.z - z);
      if (d < minDist) {
        minDist = d;
        nearest = wp;
      }
    }
    return nearest;
  }

  update(delta) {
    // Dynamic dust atmosphere update
  }
}

// ==========================================================================
// AUTHENTIC DE_MINECRAFT (BLOCK WORLD & VOXEL BATTLEGROUND) 3D MAP ARCHITECTURE
// ==========================================================================

class CSMinecraftMap {
  constructor(scene) {
    this.scene = scene;
    this.mapGroup = new THREE.Group();
    this.colliders = []; // Array of THREE.Box3 for collision detection
    this.platforms = []; // Array of { box: THREE.Box3, topY: number, isRamp: boolean }
    this.portalMesh = null;
    this.portalLight = null;

    // Bombsite coordinates
    this.bombsiteA = { x: 22, z: 26, radius: 8.5 }; // Raised Nether Portal Terrace & TNT Caches
    this.bombsiteB = { x: -22, z: -16, radius: 8.5 }; // Mineshaft Quarry & Ore Bastion

    // Spawn points
    this.spawnPoints = {
      ct: [
        { x: 0, y: 0, z: 44 },
        { x: 4, y: 0, z: 46 },
        { x: -4, y: 0, z: 44 },
        { x: 2, y: 0, z: 48 }
      ],
      t: [
        { x: 0, y: 0, z: -52 },
        { x: 4, y: 0, z: -54 },
        { x: -4, y: 0, z: -52 },
        { x: 2, y: 0, z: -50 }
      ]
    };

    // Bot tactical navigation waypoints for de_minecraft
    this.waypoints = [
      // T Spawn (Pillager Outpost / Block Fort)
      { id: 't_spawn', x: 0, z: -52, type: 'spawn_t' },
      { id: 't_outpost_exit', x: -6, z: -42, type: 'path' },
      { id: 't_mid_approach', x: 0, z: -36, type: 'path' },
      { id: 't_valley_a', x: 16, z: -40, type: 'path' },

      // Mid Village Crossroads
      { id: 'mid_entry_t', x: 0, z: -20, type: 'choke' },
      { id: 'mid_center', x: 0, z: 0, type: 'path' },
      { id: 'mid_tree', x: -4, z: 2, type: 'path' },
      { id: 'mid_entry_ct', x: 0, z: 22, type: 'choke' },

      // Route to Bombsite A (Nether Portal Terrace)
      { id: 'a_long_path', x: 22, z: -18, type: 'path' },
      { id: 'a_ramp_approach', x: 24, z: 6, type: 'path' },
      { id: 'a_terrace_steps', x: 22, z: 18, type: 'ramp' },
      { id: 'site_a', x: 22, z: 26, type: 'bombsite' },
      { id: 'a_portal_flank', x: 28, z: 34, type: 'path' },

      // Route to Bombsite B (Mineshaft Quarry & Diamond Bastion)
      { id: 'b_quarry_path', x: -22, z: -38, type: 'path' },
      { id: 'b_cave_turn', x: -26, z: -26, type: 'path' },
      { id: 'site_b', x: -22, z: -16, type: 'bombsite' },
      { id: 'b_cabin_exit', x: -16, z: 6, type: 'choke' },

      // CT Spawn (Village Townhall & Fortified Gate)
      { id: 'ct_spawn', x: 0, z: 44, type: 'spawn_ct' },
      { id: 'ct_to_a', x: 14, z: 34, type: 'path' },
      { id: 'ct_to_b', x: -14, z: 28, type: 'path' }
    ];

    this.navConnections = {
      t_spawn: ['t_outpost_exit', 't_mid_approach', 't_valley_a'],
      t_outpost_exit: ['b_quarry_path', 'mid_entry_t'],
      t_mid_approach: ['mid_entry_t', 't_valley_a'],
      t_valley_a: ['a_long_path'],
      mid_entry_t: ['mid_center', 'b_cave_turn'],
      mid_center: ['mid_tree', 'mid_entry_ct', 'a_ramp_approach', 'b_cabin_exit'],
      mid_tree: ['mid_center', 'b_cabin_exit'],
      mid_entry_ct: ['ct_spawn', 'ct_to_a', 'ct_to_b'],
      a_long_path: ['a_ramp_approach'],
      a_ramp_approach: ['a_terrace_steps'],
      a_terrace_steps: ['site_a'],
      site_a: ['a_portal_flank', 'ct_to_a'],
      a_portal_flank: ['site_a'],
      b_quarry_path: ['b_cave_turn'],
      b_cave_turn: ['site_b'],
      site_b: ['b_cabin_exit', 'ct_to_b'],
      b_cabin_exit: ['ct_to_b', 'mid_center'],
      ct_spawn: ['ct_to_a', 'ct_to_b', 'mid_entry_ct'],
      ct_to_a: ['site_a'],
      ct_to_b: ['site_b']
    };
  }

  destroy() {
    if (this.mapGroup) {
      this.mapGroup.traverse(obj => {
        if (obj.geometry) {
          try { obj.geometry.dispose(); } catch (e) {}
        }
      });
      this.scene.remove(this.mapGroup);
    }
    this.colliders = [];
    this.platforms = [];
  }

  buildMap() {
    this.mapGroup = new THREE.Group();
    this.scene.add(this.mapGroup);
    const origAdd = this.scene.add.bind(this.scene);
    this.scene.add = (obj) => { this.mapGroup.add(obj); };

    this.initMaterials();
    this.createSky();
    this.createLights();
    this.createVoxelTerrain();
    this.createPerimeterMountains();
    this.buildVillageMid();            // Village Square with giant Oak Tree & Well
    this.buildBombsiteA_NetherPortal(); // Bombsite A (Nether Portal Terrace & TNT Crate Fort)
    this.buildBombsiteB_Mineshaft();    // Bombsite B (Quarry & Diamond Ore Bastion)
    this.buildTSpawnFort();            // T Spawn Outpost
    this.buildCTSpawnVillage();        // CT Spawn Townhall Gate
    this.buildMinecraftTrees();        // Blocky Oak Trees throughout the map
    this.buildTacticalProps();         // Stacked TNT, Crafting Tables, Torches

    this.scene.add = origAdd;
  }

  initMaterials() {
    const tex = window.csTextures;
    // 1. Grass block multi-material
    const grassTop = tex.getMinecraftGrassTopTexture();
    const grassSide = tex.getMinecraftGrassSideTexture();
    const dirt = tex.getMinecraftDirtTexture();

    const grassSideMat = new THREE.MeshStandardMaterial({ map: grassSide, roughness: 0.9, metalness: 0.02 });
    const grassTopMat = new THREE.MeshStandardMaterial({ map: grassTop, roughness: 0.85, metalness: 0.02 });
    const dirtMat = new THREE.MeshStandardMaterial({ map: dirt, roughness: 0.95, metalness: 0.01 });

    // Multi-material for cube: [right, left, top, bottom, front, back]
    this.grassMatArray = [grassSideMat, grassSideMat, grassTopMat, dirtMat, grassSideMat, grassSideMat];
    this.dirtMat = dirtMat;

    // 2. Stone & Cobblestone
    this.cobblestoneMat = new THREE.MeshStandardMaterial({
      map: tex.getMinecraftCobblestoneTexture(),
      roughness: 0.9,
      metalness: 0.05
    });

    this.stoneBrickMat = new THREE.MeshStandardMaterial({
      map: tex.getMinecraftStoneBrickTexture(),
      roughness: 0.85,
      metalness: 0.08
    });

    // 3. Wood Planks & Logs
    this.oakPlanksMat = new THREE.MeshStandardMaterial({
      map: tex.getMinecraftOakPlanksTexture(),
      roughness: 0.8,
      metalness: 0.02
    });

    const logSide = tex.getMinecraftOakLogSideTexture();
    const logTop = tex.getMinecraftOakLogTopTexture();
    const logSideMat = new THREE.MeshStandardMaterial({ map: logSide, roughness: 0.85 });
    const logTopMat = new THREE.MeshStandardMaterial({ map: logTop, roughness: 0.85 });
    this.logMatArray = [logSideMat, logSideMat, logTopMat, logTopMat, logSideMat, logSideMat];

    // 4. Leaves
    this.leavesMat = new THREE.MeshStandardMaterial({
      map: tex.getMinecraftLeavesTexture(),
      roughness: 0.9,
      transparent: true,
      alphaTest: 0.35,
      side: THREE.DoubleSide
    });

    // 5. TNT with real TNT Top cap
    const tntSide = tex.getMinecraftTNTTexture();
    const tntTop = tex.getMinecraftTNTTopTexture();
    const tntSideMat = new THREE.MeshStandardMaterial({ map: tntSide, roughness: 0.7 });
    const tntTopMat = new THREE.MeshStandardMaterial({ map: tntTop, roughness: 0.7 });
    this.tntMatArray = [tntSideMat, tntSideMat, tntTopMat, dirtMat, tntSideMat, tntSideMat];

    // Chest multi-material
    const chestSide = tex.getMinecraftChestSideTexture();
    const chestFront = tex.getMinecraftChestFrontTexture();
    const cSideMat = new THREE.MeshStandardMaterial({ map: chestSide, roughness: 0.8 });
    const cFrontMat = new THREE.MeshStandardMaterial({ map: chestFront, roughness: 0.8 });
    this.chestMatArray = [cSideMat, cSideMat, cSideMat, cSideMat, cFrontMat, cSideMat];

    // 6. Crafting Table
    const craftSide = tex.getMinecraftCraftingTableTexture();
    const craftSideMat = new THREE.MeshStandardMaterial({ map: craftSide, roughness: 0.75 });
    this.craftMatArray = [craftSideMat, craftSideMat, this.oakPlanksMat, dirtMat, craftSideMat, craftSideMat];

    // 7. Ores
    this.diamondOreMat = new THREE.MeshStandardMaterial({
      map: tex.getMinecraftDiamondOreTexture(),
      roughness: 0.5,
      metalness: 0.3,
      emissive: 0x00ffff,
      emissiveIntensity: 0.15
    });

    this.goldOreMat = new THREE.MeshStandardMaterial({
      map: tex.getMinecraftGoldOreTexture(),
      roughness: 0.5,
      metalness: 0.35,
      emissive: 0xffcc00,
      emissiveIntensity: 0.12
    });

    // 8. Nether Portal
    this.portalMat = new THREE.MeshBasicMaterial({
      map: tex.getMinecraftPortalTexture(),
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide
    });

    // 9. Obsidian
    this.obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x181024,
      roughness: 0.4,
      metalness: 0.6
    });
  }

  // 1. Minecraft Sky Dome with square clouds & square sun
  createSky() {
    const skyGeom = new THREE.SphereGeometry(180, 32, 16);
    const skyMat = window.csTextures.getMinecraftSkyMaterial();
    const sky = new THREE.Mesh(skyGeom, skyMat);
    this.scene.add(sky);
  }

  // 2. Realistic Three.js Sunlight & Ambient Light
  createLights() {
    // Rich sky and grass bounce ambient illumination - balanced to avoid white glare
    const hemiLight = new THREE.HemisphereLight(0x73abff, 0x4c7828, 0.48);
    hemiLight.position.set(0, 50, 0);
    this.scene.add(hemiLight);

    // Warm, crisp sunlight with cascading soft shadows
    const sun = new THREE.DirectionalLight(0xfffaea, 1.05);
    sun.position.set(40, 75, -30);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 190;
    sun.shadow.camera.left = -65;
    sun.shadow.camera.right = 65;
    sun.shadow.camera.top = 65;
    sun.shadow.camera.bottom = -65;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun);

    // Atmospheric warm torch light
    const torchLight = new THREE.PointLight(0xffaa33, 1.4, 25);
    torchLight.position.set(0, 4.5, 0);
    this.scene.add(torchLight);

    // Mystic purple glow from Nether portal on Site A
    const portalLight = new THREE.PointLight(0xaa00ff, 2.4, 30);
    portalLight.position.set(22, 5, 26);
    this.scene.add(portalLight);
    this.portalLight = portalLight;
  }

  // Helper to add voxel blocks with collision registration
  addBlock(x, y, z, sx = 2, sy = 2, sz = 2, type = 'grass', canWalkOnTop = true) {
    let mat = this.cobblestoneMat;
    if (type === 'grass') mat = this.grassMatArray;
    else if (type === 'dirt') mat = this.dirtMat;
    else if (type === 'stone_brick') mat = this.stoneBrickMat;
    else if (type === 'wood') mat = this.oakPlanksMat;
    else if (type === 'log') mat = this.logMatArray;
    else if (type === 'leaves') mat = this.leavesMat;
    else if (type === 'tnt') mat = this.tntMatArray;
    else if (type === 'chest') mat = this.chestMatArray;
    else if (type === 'craft') mat = this.craftMatArray;
    else if (type === 'diamond_ore') mat = this.diamondOreMat;
    else if (type === 'gold_ore') mat = this.goldOreMat;
    else if (type === 'obsidian') mat = this.obsidianMat;

    const geom = new THREE.BoxGeometry(sx, sy, sz);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y + sy / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    // Register Box3 collider
    const box = new THREE.Box3();
    box.setFromObject(mesh);
    this.colliders.push(box);

    if (canWalkOnTop) {
      this.platforms.push({
        box,
        topY: y + sy,
        isRamp: false
      });
    }

    return mesh;
  }

  // Add ramp/stair helper for smooth bot & player climbing
  addStairs(x, y, z, w, h, d, type = 'stone_brick') {
    const steps = 4;
    const stepH = h / steps;
    const stepD = d / steps;
    for (let i = 0; i < steps; i++) {
      const stepY = y + i * stepH;
      const stepZ = z - (d / 2) + (i + 0.5) * stepD;
      this.addBlock(x, stepY, stepZ, w, stepH, stepD, type, true);
    }

    // Also register smooth ramp bounding box for physics
    const rampBox = new THREE.Box3(
      new THREE.Vector3(x - w / 2, y, z - d / 2),
      new THREE.Vector3(x + w / 2, y + h, z + d / 2)
    );
    this.platforms.push({
      box: rampBox,
      topY: y + h,
      isRamp: true,
      minZ: z - d / 2,
      maxZ: z + d / 2,
      minY: y,
      maxY: y + h
    });
  }

  // 3. Main Voxel Landscape Ground
  createVoxelTerrain() {
    // Vast grassy main plane
    const groundGeom = new THREE.PlaneGeometry(160, 160, 1, 1);
    const grassTopTex = window.csTextures.getMinecraftGrassTopTexture();
    const groundMat = new THREE.MeshStandardMaterial({
      map: grassTopTex,
      roughness: 0.9,
      metalness: 0.01
    });
    // Repeat grass texture across the map
    grassTopTex.repeat.set(80, 80);
    grassTopTex.wrapS = THREE.RepeatWrapping;
    grassTopTex.wrapT = THREE.RepeatWrapping;

    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Cobblestone Pathways connecting Spawns, Mid, Site A and Site B
    const createPath = (x, z, w, d) => {
      const cobbleTex = window.csTextures.getMinecraftCobblestoneTexture();
      cobbleTex.repeat.set(w / 2, d / 2);
      cobbleTex.wrapS = THREE.RepeatWrapping;
      cobbleTex.wrapT = THREE.RepeatWrapping;
      const pMat = new THREE.MeshStandardMaterial({ map: cobbleTex, roughness: 0.85 });
      const pGeom = new THREE.PlaneGeometry(w, d);
      const pMesh = new THREE.Mesh(pGeom, pMat);
      pMesh.rotation.x = -Math.PI / 2;
      pMesh.position.set(x, 0.02, z);
      pMesh.receiveShadow = true;
      this.scene.add(pMesh);
    };

    // Central Mid Highway
    createPath(0, 0, 8, 50);
    // Path to Site A (Long)
    createPath(14, 10, 20, 6);
    // Path to Site B (Quarry lane)
    createPath(-14, -10, 20, 6);
    // Spawns access roads
    createPath(0, 36, 10, 16);
    createPath(0, -42, 10, 16);
  }

  // 4. Stepped Perimeter Mountains (Enclosing the map naturally with blocks)
  createPerimeterMountains() {
    const wallHeight = 8;
    // North wall (Z = -68)
    for (let x = -60; x <= 60; x += 6) {
      this.addBlock(x, 0, -68, 6, wallHeight, 6, 'stone_brick');
      this.addBlock(x, wallHeight, -68, 6, 4, 6, 'grass');
    }
    // South wall (Z = +68)
    for (let x = -60; x <= 60; x += 6) {
      this.addBlock(x, 0, 68, 6, wallHeight, 6, 'stone_brick');
      this.addBlock(x, wallHeight, 68, 6, 4, 6, 'grass');
    }
    // West wall (X = -48)
    for (let z = -64; z <= 64; z += 6) {
      this.addBlock(-48, 0, z, 6, wallHeight, 6, 'stone_brick');
      this.addBlock(-48, wallHeight, z, 6, 4, 6, 'grass');
    }
    // East wall (X = +48)
    for (let z = -64; z <= 64; z += 6) {
      this.addBlock(48, 0, z, 6, wallHeight, 6, 'stone_brick');
      this.addBlock(48, wallHeight, z, 6, 4, 6, 'grass');
    }
  }

  // 5. Mid Village Crossroads (Giant Oak Tree, Well, Houses & Cover)
  buildVillageMid() {
    // Central Village Well (Cobblestone with water inside)
    this.addBlock(0, 0, 0, 4, 1.2, 4, 'cobblestone');
    // Well corner posts
    this.addBlock(-1.6, 1.2, -1.6, 0.8, 2.4, 0.8, 'wood');
    this.addBlock(1.6, 1.2, -1.6, 0.8, 2.4, 0.8, 'wood');
    this.addBlock(-1.6, 1.2, 1.6, 0.8, 2.4, 0.8, 'wood');
    this.addBlock(1.6, 1.2, 1.6, 0.8, 2.4, 0.8, 'wood');
    // Well roof
    this.addBlock(0, 3.6, 0, 5, 0.8, 5, 'wood');

    // Giant Mid Oak Tree (at x: -6, z: 6)
    this.buildSingleTree(-6, 6, 8, 4);

    // Mid Tactical Cover Walls (crouch & peek cover)
    this.addBlock(8, 0, -4, 4, 1.4, 1.4, 'cobblestone');
    this.addBlock(8, 0, 4, 4, 1.4, 1.4, 'cobblestone');
    this.addBlock(-10, 0, -4, 4, 1.4, 1.4, 'wood');

    // Mid to A connector archway
    this.addBlock(16, 0, -2, 2, 4.5, 2, 'stone_brick');
    this.addBlock(16, 0, 6, 2, 4.5, 2, 'stone_brick');
    this.addBlock(16, 4.5, 2, 2, 1.5, 10, 'wood');

    // Mid to B connector covered tunnel wall
    this.addBlock(-18, 0, -2, 2, 4.5, 2, 'cobblestone');
    this.addBlock(-18, 0, 6, 2, 4.5, 2, 'cobblestone');
    this.addBlock(-18, 4.5, 2, 2, 1.5, 10, 'wood');
  }

  // 6. Bombsite A: The Nether Portal Terrace & TNT Caches
  buildBombsiteA_NetherPortal() {
    const siteX = 22;
    const siteZ = 26;

    // Raised terrace platform (2 meters tall, 16x16 wide)
    this.addBlock(siteX, 0, siteZ, 16, 2, 16, 'stone_brick');

    // Access stairs from A-Long and CT approach
    this.addStairs(siteX, 0, siteZ - 10, 4, 2, 4, 'stone_brick');
    this.addStairs(siteX - 10, 0, siteZ, 4, 2, 4, 'stone_brick');

    // Massive Obsidian Nether Portal (X: 22, Z: 32)
    // Left & Right Pillars (Obsidian)
    this.addBlock(siteX - 3, 2, siteZ + 6, 1.6, 6.4, 1.6, 'obsidian');
    this.addBlock(siteX + 3, 2, siteZ + 6, 1.6, 6.4, 1.6, 'obsidian');
    // Top & Bottom Obsidian lintel
    this.addBlock(siteX, 2, siteZ + 6, 4.4, 1.2, 1.6, 'obsidian');
    this.addBlock(siteX, 7.2, siteZ + 6, 7.6, 1.2, 1.6, 'obsidian');

    // Mystic Glowing Purple Portal Vortex
    const portalGeom = new THREE.PlaneGeometry(4.4, 4.2);
    const portalMesh = new THREE.Mesh(portalGeom, this.portalMat);
    portalMesh.position.set(siteX, 5.2, siteZ + 6);
    this.scene.add(portalMesh);
    this.portalMesh = portalMesh;

    // Tactical Bomb Site Cover: Stacked TNT & Chests
    this.addBlock(siteX - 4, 2, siteZ - 2, 2, 2, 2, 'tnt');
    this.addBlock(siteX - 2, 2, siteZ - 2, 2, 2, 2, 'tnt');
    this.addBlock(siteX - 3, 4, siteZ - 2, 2, 2, 2, 'tnt');

    // Oak Wood Crates & Crafting Table cover
    this.addBlock(siteX + 4, 2, siteZ - 3, 2, 2, 2, 'craft');
    this.addBlock(siteX + 4, 2, siteZ - 1, 2, 2, 2, 'wood');

    // Defensive Stone Rampart Walls
    this.addBlock(siteX + 7, 2, siteZ, 1.2, 1.8, 12, 'cobblestone');
    this.addBlock(siteX, 2, siteZ + 7, 12, 1.8, 1.2, 'cobblestone');

    // Red "A" Site Decal Banner
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 128;
    bannerCanvas.height = 128;
    const bctx = bannerCanvas.getContext('2d');
    bctx.fillStyle = '#b71c1c';
    bctx.fillRect(0, 0, 128, 128);
    bctx.fillStyle = '#ffffff';
    bctx.font = 'bold 88px monospace';
    bctx.textAlign = 'center';
    bctx.textBaseline = 'middle';
    bctx.fillText('A', 64, 64);
    const bTex = new THREE.CanvasTexture(bannerCanvas);
    const bMat = new THREE.MeshBasicMaterial({ map: bTex, side: THREE.DoubleSide });
    const bMesh = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), bMat);
    bMesh.position.set(siteX, 2.05, siteZ);
    bMesh.rotation.x = -Math.PI / 2;
    this.scene.add(bMesh);
  }

  // 7. Bombsite B: The Mineshaft & Diamond Ore Bastion
  buildBombsiteB_Mineshaft() {
    const siteX = -22;
    const siteZ = -16;

    // Sunken Quarry Pit with Cobblestone Wall Surrounds
    this.addBlock(siteX, 0, siteZ, 16, 0.4, 16, 'cobblestone');

    // Mineshaft Wooden Headframe & Support Beams
    this.addBlock(siteX - 5, 0, siteZ - 5, 1.2, 6, 1.2, 'log');
    this.addBlock(siteX + 5, 0, siteZ - 5, 1.2, 6, 1.2, 'log');
    this.addBlock(siteX - 5, 0, siteZ + 5, 1.2, 6, 1.2, 'log');
    this.addBlock(siteX + 5, 0, siteZ + 5, 1.2, 6, 1.2, 'log');
    // Top cross beams
    this.addBlock(siteX, 6, siteZ - 5, 11.2, 1.2, 1.2, 'wood');
    this.addBlock(siteX, 6, siteZ + 5, 11.2, 1.2, 1.2, 'wood');
    this.addBlock(siteX - 5, 6, siteZ, 1.2, 1.2, 11.2, 'wood');
    this.addBlock(siteX + 5, 6, siteZ, 1.2, 1.2, 11.2, 'wood');

    // Rare Ore Vein Block Formations (Diamond & Gold Ores!)
    this.addBlock(siteX - 6, 0, siteZ - 2, 2, 2, 2, 'diamond_ore');
    this.addBlock(siteX - 6, 2, siteZ - 2, 2, 2, 2, 'diamond_ore');
    this.addBlock(siteX - 6, 0, siteZ, 2, 2, 2, 'gold_ore');
    this.addBlock(siteX + 6, 0, siteZ + 2, 2, 2, 2, 'diamond_ore');

    // Tactical Bomb Site Cover: Stacked TNT & Stone Crates
    this.addBlock(siteX + 3, 0, siteZ - 3, 2, 2, 2, 'tnt');
    this.addBlock(siteX + 3, 0, siteZ - 1, 2, 2, 2, 'tnt');
    this.addBlock(siteX + 3, 2, siteZ - 2, 2, 2, 2, 'tnt');

    this.addBlock(siteX - 2, 0, siteZ + 3, 2, 2, 2, 'cobblestone');
    this.addBlock(siteX, 0, siteZ + 3, 2, 2, 2, 'craft');

    // Blue "B" Site Decal Banner
    const bannerCanvas = document.createElement('canvas');
    bannerCanvas.width = 128;
    bannerCanvas.height = 128;
    const bctx = bannerCanvas.getContext('2d');
    bctx.fillStyle = '#0d47a1';
    bctx.fillRect(0, 0, 128, 128);
    bctx.fillStyle = '#ffffff';
    bctx.font = 'bold 88px monospace';
    bctx.textAlign = 'center';
    bctx.textBaseline = 'middle';
    bctx.fillText('B', 64, 64);
    const bTex = new THREE.CanvasTexture(bannerCanvas);
    const bMat = new THREE.MeshBasicMaterial({ map: bTex, side: THREE.DoubleSide });
    const bMesh = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), bMat);
    bMesh.position.set(siteX, 0.45, siteZ);
    bMesh.rotation.x = -Math.PI / 2;
    this.scene.add(bMesh);
  }

  // 8. T Spawn Outpost (Pillager Fort & Watchtower)
  buildTSpawnFort() {
    const spX = 0;
    const spZ = -52;

    // Outpost Base walls
    this.addBlock(spX - 10, 0, spZ, 2, 4, 12, 'cobblestone');
    this.addBlock(spX + 10, 0, spZ, 2, 4, 12, 'cobblestone');

    // Watchtower at rear
    this.addBlock(spX, 0, spZ - 8, 6, 8, 6, 'wood');
    this.addBlock(spX, 8, spZ - 8, 7, 1.2, 7, 'cobblestone');

    // Cover blocks in spawn
    this.addBlock(spX - 4, 0, spZ + 4, 2, 2, 2, 'craft');
    this.addBlock(spX + 4, 0, spZ + 4, 2, 2, 2, 'wood');
  }

  // 9. CT Spawn (Village Townhall & Fortified Gate)
  buildCTSpawnVillage() {
    const spX = 0;
    const spZ = 44;

    // Gatehouse pillars
    this.addBlock(spX - 8, 0, spZ, 3, 6, 3, 'stone_brick');
    this.addBlock(spX + 8, 0, spZ, 3, 6, 3, 'stone_brick');
    // Gate arch
    this.addBlock(spX, 5, spZ, 16, 1.5, 3, 'wood');

    // Village Houses (left and right)
    this.addBlock(spX - 14, 0, spZ + 6, 8, 4.5, 8, 'wood');
    this.addBlock(spX + 14, 0, spZ + 6, 8, 4.5, 8, 'wood');

    // Cover crates in spawn
    this.addBlock(spX - 4, 0, spZ - 3, 2, 2, 2, 'wood');
    this.addBlock(spX + 4, 0, spZ - 3, 2, 2, 2, 'cobblestone');
  }

  // Helper for creating a Minecraft Oak Tree
  buildSingleTree(x, z, trunkHeight = 6, canopyRadius = 3) {
    // 1. Trunk (Oak Logs)
    for (let y = 0; y < trunkHeight; y += 2) {
      this.addBlock(x, y, z, 2, 2, 2, 'log', false);
    }

    // 2. Canopy Layers (Oak Leaves)
    const baseY = trunkHeight - 2;
    // Lower 5x5 canopy layer
    for (let lx = -canopyRadius; lx <= canopyRadius; lx += 2) {
      for (let lz = -canopyRadius; lz <= canopyRadius; lz += 2) {
        if (Math.abs(lx) === canopyRadius && Math.abs(lz) === canopyRadius) continue; // Rounded corners
        this.addBlock(x + lx, baseY, z + lz, 2, 2, 2, 'leaves', true);
      }
    }
    // Mid 3x3 canopy layer
    for (let lx = -2; lx <= 2; lx += 2) {
      for (let lz = -2; lz <= 2; lz += 2) {
        this.addBlock(x + lx, baseY + 2, z + lz, 2, 2, 2, 'leaves', true);
      }
    }
    // Top 1x1 leaf cap
    this.addBlock(x, baseY + 4, z, 2, 2, 2, 'leaves', true);
  }

  // 10. Spread Minecraft Trees throughout the map
  buildMinecraftTrees() {
    const treeLocs = [
      [14, -28], [24, -34], [-12, -32], [-28, -2],
      [-16, 18], [12, 18], [26, 8], [-8, 32], [20, 42]
    ];
    for (const [tx, tz] of treeLocs) {
      this.buildSingleTree(tx, tz, 5 + Math.floor(Math.random() * 2), 2.5);
    }
  }

  // 11. Tactical Props (Stacked TNT, Crafting Tables, Chests, Glowing Torches)
  buildTacticalProps() {
    const props = [
      { x: -14, z: -8, type: 'tnt' },
      { x: 14, z: 2, type: 'tnt' },
      { x: -6, z: -18, type: 'chest' },
      { x: 8, z: 12, type: 'chest' },
      { x: 0, z: -32, type: 'wood' },
      { x: 0, z: 30, type: 'wood' }
    ];
    for (const p of props) {
      this.addBlock(p.x, 0, p.z, 2, 2, 2, p.type);
    }

    // Glowing torches on posts
    const torchPosts = [
      { x: 0, y: 2, z: 0 },
      { x: 22, y: 3, z: 26 },
      { x: -22, y: 2, z: -16 },
      { x: -6, y: 2, z: -36 },
      { x: 6, y: 2, z: 36 }
    ];
    for (const tp of torchPosts) {
      const torchGeom = new THREE.BoxGeometry(0.35, 1.0, 0.35);
      const torchMat = new THREE.MeshStandardMaterial({
        map: window.csTextures.getMinecraftTorchTexture(),
        emissive: 0xffaa22,
        emissiveIntensity: 0.9
      });
      const torchMesh = new THREE.Mesh(torchGeom, torchMat);
      torchMesh.position.set(tp.x, tp.y + 0.5, tp.z);
      this.scene.add(torchMesh);

      const tLight = new THREE.PointLight(0xff9922, 1.4, 18);
      tLight.position.set(tp.x, tp.y + 0.9, tp.z);
      this.scene.add(tLight);
    }
  }

  // Height query helper for gravity and jumping
  getGroundHeight(x, z, currentY = 0) {
    let highestGround = 0; // Flat ground level is 0
    const testPoint = new THREE.Vector2(x, z);

    for (let i = 0; i < this.platforms.length; i++) {
      const plat = this.platforms[i];
      const box = plat.box;

      if (x >= box.min.x - 0.25 && x <= box.max.x + 0.25 &&
          z >= box.min.z - 0.25 && z <= box.max.z + 0.25) {

        if (plat.isRamp) {
          const t = Math.max(0, Math.min(1, (z - plat.minZ) / (plat.maxZ - plat.minZ)));
          const rampY = plat.minY + t * (plat.maxY - plat.minY);
          if (rampY > highestGround) {
            highestGround = rampY;
          }
        } else {
          // Only step onto platform if character is roughly near or above its top/base
          if (currentY >= box.min.y - 0.5 && plat.topY > highestGround) {
            highestGround = plat.topY;
          }
        }
      }
    }

    return highestGround;
  }

  // Collision detection helper
  checkCollision(position, radius = 0.42, feetY = null) {
    if (!this._collisionSphere) this._collisionSphere = new THREE.Sphere();
    this._collisionSphere.center.copy(position);
    this._collisionSphere.radius = radius;
    for (let i = 0; i < this.colliders.length; i++) {
      const box = this.colliders[i];
      // Skip platforms that are below character feet
      if (feetY !== null && box.max.y <= feetY + 0.35) {
        continue;
      }
      if (box.intersectsSphere(this._collisionSphere)) {
        return true;
      }
    }
    return false;
  }

  getNearestWaypoint(x, z) {
    let nearest = null;
    let minDist = Infinity;
    for (const wp of this.waypoints) {
      const d = Math.hypot(wp.x - x, wp.z - z);
      if (d < minDist) {
        minDist = d;
        nearest = wp;
      }
    }
    return nearest;
  }

  // Dynamic animation update for glowing Nether Portal
  update(delta) {
    if (this.portalMesh) {
      const t = performance.now() * 0.003;
      this.portalMesh.material.opacity = 0.75 + Math.sin(t) * 0.18;
      if (this.portalLight) {
        this.portalLight.intensity = 2.0 + Math.sin(t * 1.5) * 0.7;
      }
    }
  }
}

// =============================================================================
// DE_UNIVERSAL: УНИВЕРСАЛЬНАЯ АРЕНА (2-Level Bridge, Towers, Neon Passage, A/B)
// =============================================================================
class CSUniversalMap {
  constructor(scene) {
    this.scene = scene;
    this.mapGroup = new THREE.Group();
    this.colliders = [];
    this.platforms = [];

    // Bombsite coordinates
    this.bombsiteA = { x: 18, z: 24, radius: 8.5 }; // Reactor Platform & Upper Deck
    this.bombsiteB = { x: -18, z: -24, radius: 8.5 }; // Cargo Depot & Underground Vent

    // Spawn points
    this.spawnPoints = {
      ct: [
        { x: 0, y: 0, z: 40 },
        { x: 4, y: 0, z: 42 },
        { x: -4, y: 0, z: 40 },
        { x: 2, y: 0, z: 44 }
      ],
      t: [
        { x: 0, y: 0, z: -40 },
        { x: 4, y: 0, z: -42 },
        { x: -4, y: 0, z: -40 },
        { x: 2, y: 0, z: -44 }
      ]
    };

    // Bot tactical navigation waypoints
    this.waypoints = [
      { id: 't_spawn', x: 0, z: -40, type: 'spawn_t' },
      { id: 't_approach_mid', x: 0, z: -24, type: 'path' },
      { id: 't_approach_b', x: -16, z: -32, type: 'path' },
      { id: 't_approach_a', x: 16, z: -32, type: 'path' },
      { id: 'site_b', x: -18, z: -24, type: 'bombsite' },
      { id: 'tower_west', x: -24, z: 0, type: 'sniper' },
      { id: 'bridge_lower_t', x: 0, z: -10, type: 'path' },
      { id: 'bridge_upper', x: 0, z: 0, type: 'ramp' },
      { id: 'bridge_lower_ct', x: 0, z: 10, type: 'path' },
      { id: 'neon_tunnel_mid', x: 0, z: 0, type: 'choke' },
      { id: 'tower_east', x: 24, z: 0, type: 'sniper' },
      { id: 'site_a', x: 18, z: 24, type: 'bombsite' },
      { id: 'ct_approach_a', x: 16, z: 32, type: 'path' },
      { id: 'ct_approach_b', x: -16, z: 32, type: 'path' },
      { id: 'ct_approach_mid', x: 0, z: 24, type: 'path' },
      { id: 'ct_spawn', x: 0, z: 40, type: 'spawn_ct' }
    ];

    this.navConnections = {
      t_spawn: ['t_approach_mid', 't_approach_b', 't_approach_a'],
      t_approach_b: ['site_b', 'tower_west'],
      t_approach_mid: ['bridge_lower_t', 'bridge_upper', 'neon_tunnel_mid'],
      t_approach_a: ['tower_east', 'bridge_upper'],
      site_b: ['tower_west', 'bridge_lower_t', 'ct_approach_b'],
      tower_west: ['site_b', 'bridge_upper', 'ct_approach_b'],
      bridge_lower_t: ['bridge_lower_ct', 'neon_tunnel_mid'],
      bridge_upper: ['tower_west', 'tower_east', 'bridge_lower_ct'],
      bridge_lower_ct: ['ct_approach_mid', 'site_a'],
      neon_tunnel_mid: ['tower_west', 'tower_east', 'bridge_lower_ct'],
      tower_east: ['site_a', 'ct_approach_a', 'bridge_upper'],
      site_a: ['tower_east', 'ct_approach_a', 'bridge_lower_ct'],
      ct_approach_a: ['ct_spawn', 'site_a'],
      ct_approach_b: ['ct_spawn', 'site_b'],
      ct_approach_mid: ['ct_spawn', 'bridge_lower_ct'],
      ct_spawn: ['ct_approach_a', 'ct_approach_b', 'ct_approach_mid']
    };
  }

  destroy() {
    if (this.mapGroup) {
      this.mapGroup.traverse(obj => {
        if (obj.geometry) {
          try { obj.geometry.dispose(); } catch (e) {}
        }
      });
      this.scene.remove(this.mapGroup);
    }
    this.colliders = [];
    this.platforms = [];
  }

  buildMap() {
    this.mapGroup = new THREE.Group();
    this.scene.add(this.mapGroup);

    this.createLights();
    this.createGroundAndBoundaries();
    this.buildTwoLevelBridge();
    this.buildSniperTowers();
    this.buildNeonUndergroundPassage();
    this.buildBombsiteA();
    this.buildBombsiteB();
    this.buildVoxelCoverProps();
  }

  createLights() {
    // Rich contrast cyber ambient
    const ambient = new THREE.AmbientLight(0x1a2332, 0.45);
    this.mapGroup.add(ambient);

    // Moonlight sun keylight
    const sun = new THREE.DirectionalLight(0xd6e4ff, 1.15);
    sun.position.set(35, 60, -25);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.bias = -0.0004;
    this.mapGroup.add(sun);

    // Neon atmospheric fill
    const fillLight = new THREE.DirectionalLight(0x00e5ff, 0.25);
    fillLight.position.set(-30, 20, 20);
    this.mapGroup.add(fillLight);
  }

  createGroundAndBoundaries() {
    const tex = window.csTextures;
    // Ground platform
    const groundGeom = new THREE.PlaneGeometry(100, 110);
    const groundMat = new THREE.MeshStandardMaterial({
      map: tex.getUniversalFloorTexture(),
      roughness: 0.85,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.mapGroup.add(ground);

    this.platforms.push({
      box: new THREE.Box3(new THREE.Vector3(-50, -1, -55), new THREE.Vector3(50, 0, 55)),
      topY: 0,
      isRamp: false
    });

    // Perimeter modular walls
    const wallMat = new THREE.MeshStandardMaterial({
      map: tex.getUniversalWallTexture(),
      bumpMap: tex.getUniversalWallBump(),
      bumpScale: 0.08,
      roughness: 0.75,
      metalness: 0.3
    });

    const perim = [
      { x: 0, y: 4, z: -52, w: 96, h: 8, d: 2 },
      { x: 0, y: 4, z: 52, w: 96, h: 8, d: 2 },
      { x: -48, y: 4, z: 0, w: 2, h: 8, d: 104 },
      { x: 48, y: 4, z: 0, w: 2, h: 8, d: 104 }
    ];
    perim.forEach(p => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), wallMat);
      mesh.position.set(p.x, p.y, p.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.mapGroup.add(mesh);
      this.colliders.push(new THREE.Box3().setFromObject(mesh));
    });
  }

  // 1. Two-Level Central Bridge (Upper steel walkway & lower road pass)
  buildTwoLevelBridge() {
    const tex = window.csTextures;
    const bridgeMat = new THREE.MeshStandardMaterial({
      map: tex.getUniversalBridgeTexture(),
      roughness: 0.6,
      metalness: 0.6
    });
    const pillarMat = new THREE.MeshStandardMaterial({
      map: tex.getIndustrialConcreteTexture(),
      roughness: 0.85
    });

    // Bridge deck platform at Y=4.5
    const deck = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 28), bridgeMat);
    deck.position.set(0, 4.5, 0);
    deck.castShadow = true;
    deck.receiveShadow = true;
    this.mapGroup.add(deck);

    const deckBox = new THREE.Box3().setFromObject(deck);
    this.colliders.push(deckBox);
    this.platforms.push({ box: deckBox, topY: 4.7, isRamp: false });

    // Bridge Guardrails
    const railMat = new THREE.MeshStandardMaterial({
      map: tex.getHazardStripeTexture(),
      roughness: 0.4,
      metalness: 0.4
    });
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 28), railMat);
    railL.position.set(-5, 5.3, 0);
    this.mapGroup.add(railL);
    this.colliders.push(new THREE.Box3().setFromObject(railL));

    const railR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 28), railMat);
    railR.position.set(5, 5.3, 0);
    this.mapGroup.add(railR);
    this.colliders.push(new THREE.Box3().setFromObject(railR));

    // Support pillars (leaves open central passage at Y=0 underneath)
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 4.5, 1.4), pillarMat);
    p1.position.set(-4, 2.25, -12);
    this.mapGroup.add(p1);
    this.colliders.push(new THREE.Box3().setFromObject(p1));

    const p2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 4.5, 1.4), pillarMat);
    p2.position.set(4, 2.25, -12);
    this.mapGroup.add(p2);
    this.colliders.push(new THREE.Box3().setFromObject(p2));

    const p3 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 4.5, 1.4), pillarMat);
    p3.position.set(-4, 2.25, 12);
    this.mapGroup.add(p3);
    this.colliders.push(new THREE.Box3().setFromObject(p3));

    const p4 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 4.5, 1.4), pillarMat);
    p4.position.set(4, 2.25, 12);
    this.mapGroup.add(p4);
    this.colliders.push(new THREE.Box3().setFromObject(p4));

    // Ramps leading up to the bridge (North & South)
    const rampGeom = new THREE.BoxGeometry(8, 0.4, 12);

    const rampSouth = new THREE.Mesh(rampGeom, bridgeMat);
    rampSouth.position.set(0, 2.25, -20);
    rampSouth.rotation.x = 0.38;
    this.mapGroup.add(rampSouth);
    const rsBox = new THREE.Box3().setFromObject(rampSouth);
    this.colliders.push(rsBox);
    this.platforms.push({ box: rsBox, topY: 4.5, isRamp: true });

    const rampNorth = new THREE.Mesh(rampGeom, bridgeMat);
    rampNorth.position.set(0, 2.25, 20);
    rampNorth.rotation.x = -0.38;
    this.mapGroup.add(rampNorth);
    const rnBox = new THREE.Box3().setFromObject(rampNorth);
    this.colliders.push(rnBox);
    this.platforms.push({ box: rnBox, topY: 4.5, isRamp: true });
  }

  // 2. High Sniper Watchtowers (East & West)
  buildSniperTowers() {
    const tex = window.csTextures;
    const towerMat = new THREE.MeshStandardMaterial({
      map: tex.getIndustrialConcreteTexture(),
      roughness: 0.8
    });
    const platformMat = new THREE.MeshStandardMaterial({
      map: tex.getUniversalBridgeTexture(),
      roughness: 0.5,
      metalness: 0.7
    });

    const towerLocs = [{ x: -26, z: 0 }, { x: 26, z: 0 }];
    towerLocs.forEach(t => {
      // Main tower base
      const base = new THREE.Mesh(new THREE.BoxGeometry(8, 5.5, 8), towerMat);
      base.position.set(t.x, 2.75, t.z);
      this.mapGroup.add(base);
      const bBox = new THREE.Box3().setFromObject(base);
      this.colliders.push(bBox);
      this.platforms.push({ box: bBox, topY: 5.5, isRamp: false });

      // Sniper Parapet
      const railFront = new THREE.Mesh(new THREE.BoxGeometry(8, 1.2, 0.4), towerMat);
      railFront.position.set(t.x, 6.1, t.z + (t.x < 0 ? 3.8 : -3.8));
      this.mapGroup.add(railFront);
      this.colliders.push(new THREE.Box3().setFromObject(railFront));

      // Access Ramp
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 10), platformMat);
      ramp.position.set(t.x, 2.75, t.z + (t.x < 0 ? -9 : 9));
      ramp.rotation.x = (t.x < 0 ? -0.55 : 0.55);
      this.mapGroup.add(ramp);
      const rampBox = new THREE.Box3().setFromObject(ramp);
      this.colliders.push(rampBox);
      this.platforms.push({ box: rampBox, topY: 5.5, isRamp: true });
    });
  }

  // 3. Underground Neon Passage (Sunken tunnel with glowing neon strips)
  buildNeonUndergroundPassage() {
    const tex = window.csTextures;
    const tunnelWallMat = new THREE.MeshStandardMaterial({
      map: tex.getUniversalWallTexture(),
      roughness: 0.7
    });

    // Sunken Corridor Walls
    const tWallL = new THREE.Mesh(new THREE.BoxGeometry(32, 3.5, 1.2), tunnelWallMat);
    tWallL.position.set(0, 1.75, -4);
    this.mapGroup.add(tWallL);
    this.colliders.push(new THREE.Box3().setFromObject(tWallL));

    const tWallR = new THREE.Mesh(new THREE.BoxGeometry(32, 3.5, 1.2), tunnelWallMat);
    tWallR.position.set(0, 1.75, 4);
    this.mapGroup.add(tWallR);
    this.colliders.push(new THREE.Box3().setFromObject(tWallR));

    // Glowing Cyan & Magenta Neon Strips
    const neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const stripCyan = new THREE.Mesh(new THREE.BoxGeometry(30, 0.15, 0.15), neonCyanMat);
    stripCyan.position.set(0, 3.2, -3.3);
    this.mapGroup.add(stripCyan);

    const neonMagentaMat = new THREE.MeshBasicMaterial({ color: 0xff007f });
    const stripMag = new THREE.Mesh(new THREE.BoxGeometry(30, 0.15, 0.15), neonMagentaMat);
    stripMag.position.set(0, 3.2, 3.3);
    this.mapGroup.add(stripMag);

    // Dynamic PointLights inside the tunnel
    const pCyan = new THREE.PointLight(0x00e5ff, 1.8, 14);
    pCyan.position.set(-8, 2.5, 0);
    this.mapGroup.add(pCyan);

    const pMag = new THREE.PointLight(0xff007f, 1.8, 14);
    pMag.position.set(8, 2.5, 0);
    this.mapGroup.add(pMag);
  }

  // 4. Bombsite A: Cyber Reactor Platform
  buildBombsiteA() {
    const tex = window.csTextures;
    const siteX = 18;
    const siteZ = 24;

    // Raised Terrace
    const terrace = new THREE.Mesh(new THREE.BoxGeometry(16, 1.2, 16), new THREE.MeshStandardMaterial({
      map: tex.getUniversalFloorTexture(),
      roughness: 0.7
    }));
    terrace.position.set(siteX, 0.6, siteZ);
    this.mapGroup.add(terrace);
    const tBox = new THREE.Box3().setFromObject(terrace);
    this.colliders.push(tBox);
    this.platforms.push({ box: tBox, topY: 1.2, isRamp: false });

    // Glowing Cyber Core in Center
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x00e5ff,
      emissive: 0x00c3ff,
      emissiveIntensity: 0.8,
      metalness: 0.9,
      roughness: 0.1
    });
    const core = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3.2, 16), coreMat);
    core.position.set(siteX, 2.8, siteZ);
    this.mapGroup.add(core);
    this.colliders.push(new THREE.Box3().setFromObject(core));

    const coreLight = new THREE.PointLight(0x00e5ff, 2.2, 16);
    coreLight.position.set(siteX, 3.5, siteZ);
    this.mapGroup.add(coreLight);

    // Bombsite A Decal on Ground
    this.addSiteDecal(siteX, 1.25, siteZ - 4, 'A');
  }

  // 5. Bombsite B: Freight Shipping Depot
  buildBombsiteB() {
    const tex = window.csTextures;
    const siteX = -18;
    const siteZ = -24;

    // Red and Blue Shipping Containers
    const cRedMat = new THREE.MeshStandardMaterial({
      map: tex.getShippingContainerTexture('#b33939'),
      roughness: 0.6
    });
    const cBlueMat = new THREE.MeshStandardMaterial({
      map: tex.getShippingContainerTexture('#192a56'),
      roughness: 0.6
    });

    const c1 = new THREE.Mesh(new THREE.BoxGeometry(10, 3.5, 4), cRedMat);
    c1.position.set(siteX - 2, 1.75, siteZ - 3);
    this.mapGroup.add(c1);
    const c1Box = new THREE.Box3().setFromObject(c1);
    this.colliders.push(c1Box);
    this.platforms.push({ box: c1Box, topY: 3.5, isRamp: false });

    const c2 = new THREE.Mesh(new THREE.BoxGeometry(4, 3.5, 10), cBlueMat);
    c2.position.set(siteX + 4, 1.75, siteZ + 2);
    this.mapGroup.add(c2);
    const c2Box = new THREE.Box3().setFromObject(c2);
    this.colliders.push(c2Box);
    this.platforms.push({ box: c2Box, topY: 3.5, isRamp: false });

    // Bombsite B Decal on Ground
    this.addSiteDecal(siteX, 0.05, siteZ, 'B');
  }

  // 6. Tactical Voxel Blocks & Barricades
  buildVoxelCoverProps() {
    const tex = window.csTextures;
    const crateMat = new THREE.MeshStandardMaterial({
      map: tex.getDustCrateTexture(),
      roughness: 0.75
    });

    const coverPoints = [
      { x: -6, z: -16 }, { x: 6, z: -16 },
      { x: -10, z: 16 }, { x: 10, z: 16 },
      { x: -12, z: 0 }, { x: 12, z: 0 }
    ];
    coverPoints.forEach(cp => {
      const cr = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), crateMat);
      cr.position.set(cp.x, 1.1, cp.z);
      cr.castShadow = true;
      this.mapGroup.add(cr);
      const b = new THREE.Box3().setFromObject(cr);
      this.colliders.push(b);
      this.platforms.push({ box: b, topY: 2.2, isRamp: false });
    });
  }

  addSiteDecal(x, y, z, letter) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = (letter === 'A') ? '#b71c1c' : '#0d47a1';
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 88px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, 64, 64);

    const tex = new THREE.CanvasTexture(canvas);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 3.5), new THREE.MeshBasicMaterial({ map: tex }));
    mesh.position.set(x, y, z);
    mesh.rotation.x = -Math.PI / 2;
    this.mapGroup.add(mesh);
  }

  getGroundHeight(x, z, currentY = 0) {
    let highestGround = 0;
    for (let i = 0; i < this.platforms.length; i++) {
      const plat = this.platforms[i];
      const box = plat.box;
      if (x >= box.min.x && x <= box.max.x && z >= box.min.z && z <= box.max.z) {
        if (plat.isRamp) {
          const depth = box.max.z - box.min.z;
          const prog = (z - box.min.z) / depth;
          const rampY = prog * plat.topY;
          if (rampY > highestGround) highestGround = rampY;
        } else {
          if (currentY >= box.min.y - 0.5 && plat.topY > highestGround) {
            highestGround = plat.topY;
          }
        }
      }
    }
    return highestGround;
  }

  checkCollision(position, radius = 0.42, feetY = null) {
    if (!this._collisionSphere) this._collisionSphere = new THREE.Sphere();
    this._collisionSphere.center.copy(position);
    this._collisionSphere.radius = radius;
    for (let i = 0; i < this.colliders.length; i++) {
      const box = this.colliders[i];
      if (feetY !== null && box.max.y <= feetY + 0.35) continue;
      if (box.intersectsSphere(this._collisionSphere)) return true;
    }
    return false;
  }

  getNearestWaypoint(x, z) {
    let nearest = null;
    let minDist = Infinity;
    for (const wp of this.waypoints) {
      const d = Math.hypot(wp.x - x, wp.z - z);
      if (d < minDist) {
        minDist = d;
        nearest = wp;
      }
    }
    return nearest;
  }

  update(delta) {}
}

// =============================================================================
// DE_INFERNO: Italian Mediterranean Town with Terracotta & Cobblestone
// =============================================================================
class CSInfernoMap extends CSDust2Map {
  constructor(scene) {
    super(scene);
    this.bombsiteA = { x: 22, z: 26, radius: 8.5 };
    this.bombsiteB = { x: -20, z: -18, radius: 8.5 };
  }

  createLights() {
    const ambient = new THREE.AmbientLight(0xd18a68, 0.44);
    this.mapGroup.add(ambient);
    const sun = new THREE.DirectionalLight(0xffcaa0, 1.15);
    sun.position.set(40, 65, -30);
    sun.castShadow = true;
    this.mapGroup.add(sun);
  }

  createGroundAndBoundaries() {
    const tex = window.csTextures;
    const groundGeom = new THREE.PlaneGeometry(120, 150);
    const groundMat = new THREE.MeshStandardMaterial({
      map: tex.getInfernoCobbleTexture(),
      bumpMap: tex.getInfernoCobbleBump(),
      bumpScale: 0.08,
      roughness: 0.85
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, -2);
    ground.receiveShadow = true;
    this.mapGroup.add(ground);

    this.platforms.push({
      box: new THREE.Box3(new THREE.Vector3(-55, -1, -70), new THREE.Vector3(55, 0, 65)),
      topY: 0,
      isRamp: false
    });

    const wallMat = new THREE.MeshStandardMaterial({
      map: tex.getInfernoWallTexture(),
      bumpMap: tex.getInfernoWallBump(),
      bumpScale: 0.10,
      roughness: 0.8
    });

    const boundaries = [
      { x: 0, y: 3.5, z: -64, w: 110, h: 7, d: 2 },
      { x: 0, y: 3.5, z: 54, w: 110, h: 7, d: 2 },
      { x: -42, y: 3.5, z: -5, w: 2, h: 7, d: 120 },
      { x: 44, y: 3.5, z: -5, w: 2, h: 7, d: 120 }
    ];
    boundaries.forEach(b => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), wallMat);
      mesh.position.set(b.x, b.y, b.z);
      this.mapGroup.add(mesh);
      this.colliders.push(new THREE.Box3().setFromObject(mesh));
    });
  }
}

// =============================================================================
// CS_ASSAULT: Industrial Siege Warehouse (Concrete, Corrugated Metal, Hazard)
// =============================================================================
class CSAssaultMap extends CSDust2Map {
  createLights() {
    const ambient = new THREE.AmbientLight(0x506272, 0.45);
    this.mapGroup.add(ambient);
    const sun = new THREE.DirectionalLight(0xdfe6e9, 1.10);
    sun.position.set(20, 70, -20);
    sun.castShadow = true;
    this.mapGroup.add(sun);
  }

  createGroundAndBoundaries() {
    const tex = window.csTextures;
    const groundGeom = new THREE.PlaneGeometry(120, 150);
    const groundMat = new THREE.MeshStandardMaterial({
      map: tex.getIndustrialConcreteTexture(),
      bumpMap: tex.getIndustrialConcreteBump(),
      bumpScale: 0.08,
      roughness: 0.82
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.mapGroup.add(ground);

    this.platforms.push({
      box: new THREE.Box3(new THREE.Vector3(-55, -1, -70), new THREE.Vector3(55, 0, 65)),
      topY: 0,
      isRamp: false
    });

    const wallMat = new THREE.MeshStandardMaterial({
      map: tex.getCorrugatedMetalTexture(),
      bumpMap: tex.getCorrugatedMetalBump(),
      bumpScale: 0.12,
      roughness: 0.55,
      metalness: 0.45
    });

    const boundaries = [
      { x: 0, y: 4, z: -64, w: 110, h: 8, d: 2 },
      { x: 0, y: 4, z: 54, w: 110, h: 8, d: 2 },
      { x: -42, y: 4, z: -5, w: 2, h: 8, d: 120 },
      { x: 44, y: 4, z: -5, w: 2, h: 8, d: 120 }
    ];
    boundaries.forEach(b => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), wallMat);
      mesh.position.set(b.x, b.y, b.z);
      this.mapGroup.add(mesh);
      this.colliders.push(new THREE.Box3().setFromObject(mesh));
    });
  }
}

// =============================================================================
// DE_NUKE: Nuclear Facility with Concrete, Catwalks & Hazard Markings
// =============================================================================
class CSNukeMap extends CSAssaultMap {
  createLights() {
    const ambient = new THREE.AmbientLight(0x405565, 0.46);
    this.mapGroup.add(ambient);
    const sun = new THREE.DirectionalLight(0xe8f0f8, 1.15);
    sun.position.set(30, 80, -10);
    sun.castShadow = true;
    this.mapGroup.add(sun);
  }
}

// =============================================================================
// FY_POOL_DAY: Mosaic Cyan & White Ceramic Tiles, Clean Water
// =============================================================================
class CSPoolDayMap extends CSBeachMap {
  createLights() {
    const ambient = new THREE.AmbientLight(0x54a0ff, 0.48);
    this.scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 1.20);
    sun.position.set(20, 75, -20);
    sun.castShadow = true;
    this.scene.add(sun);
  }

  createGround() {
    const tex = window.csTextures;
    // Blue & White Ceramic Tiles
    const groundGeom = new THREE.PlaneGeometry(120, 150);
    const groundMat = new THREE.MeshStandardMaterial({
      map: tex.getPoolTileTexture('white'),
      bumpMap: tex.getPoolTileBump(),
      bumpScale: 0.08,
      roughness: 0.25,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.platforms.push({
      box: new THREE.Box3(new THREE.Vector3(-60, -1, -75), new THREE.Vector3(60, 0, 75)),
      topY: 0,
      isRamp: false
    });

    // Central Pool Water
    const waterGeom = new THREE.PlaneGeometry(24, 36);
    const waterMat = new THREE.MeshStandardMaterial({
      map: tex.getPoolWaterTexture(),
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.75
    });
    const water = new THREE.Mesh(waterGeom, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.04, 0);
    this.scene.add(water);
  }
}

// =============================================================================
// AWP_INDIA: Ancient Sandstone Sniper Temple
// =============================================================================
class CSAwpIndiaMap extends CSDust2Map {
  createLights() {
    const ambient = new THREE.AmbientLight(0xc68c53, 0.45);
    this.mapGroup.add(ambient);
    const sun = new THREE.DirectionalLight(0xffeaad, 1.20);
    sun.position.set(40, 75, -30);
    sun.castShadow = true;
    this.mapGroup.add(sun);
  }

  createGroundAndBoundaries() {
    const tex = window.csTextures;
    const groundGeom = new THREE.PlaneGeometry(120, 150);
    const groundMat = new THREE.MeshStandardMaterial({
      map: tex.getAwpIndiaStoneTexture(),
      bumpMap: tex.getDustGroundBump(),
      bumpScale: 0.08,
      roughness: 0.85
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.mapGroup.add(ground);

    this.platforms.push({
      box: new THREE.Box3(new THREE.Vector3(-55, -1, -70), new THREE.Vector3(55, 0, 65)),
      topY: 0,
      isRamp: false
    });

    const wallMat = new THREE.MeshStandardMaterial({
      map: tex.getAwpIndiaStoneTexture(),
      bumpMap: tex.getDustWallBump(),
      bumpScale: 0.10,
      roughness: 0.82
    });

    const boundaries = [
      { x: 0, y: 4, z: -64, w: 110, h: 8, d: 2 },
      { x: 0, y: 4, z: 54, w: 110, h: 8, d: 2 },
      { x: -42, y: 4, z: -5, w: 2, h: 8, d: 120 },
      { x: 44, y: 4, z: -5, w: 2, h: 8, d: 120 }
    ];
    boundaries.forEach(b => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), wallMat);
      mesh.position.set(b.x, b.y, b.z);
      this.mapGroup.add(mesh);
      this.colliders.push(new THREE.Box3().setFromObject(mesh));
    });
  }
}

// Global exposure
window.CSBeachMap = CSBeachMap;
window.CSDust2Map = CSDust2Map;
window.CSMinecraftMap = CSMinecraftMap;
window.CSInfernoMap = CSInfernoMap;
window.CSAssaultMap = CSAssaultMap;
window.CSNukeMap = CSNukeMap;
window.CSPoolDayMap = CSPoolDayMap;
window.CSAwpIndiaMap = CSAwpIndiaMap;
window.CSUniversalMap = CSUniversalMap;

