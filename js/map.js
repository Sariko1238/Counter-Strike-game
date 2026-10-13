/**
 * CS 1.6 de_beach (Tropical Coastline Resort) 3D Map Architecture
 * Features scenic ocean water, golden sand beaches, palm groves, boardwalk pier (Site A),
 * tiki cabana resort (Site B), market stalls, beach umbrellas, deck chairs, and coastal rocks.
 */

class CSBeachMap {
  constructor(scene) {
    this.scene = scene;
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

  buildMap() {
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
    // Ambient light: warm sunlit haze
    const ambient = new THREE.AmbientLight(0xfff1dc, 0.82);
    this.scene.add(ambient);

    // Warm Sun Directional Light
    const sun = new THREE.DirectionalLight(0xfffae8, 1.15);
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
    const playerSphere = new THREE.Sphere(position, radius);
    for (let i = 0; i < this.colliders.length; i++) {
      const box = this.colliders[i];
      // If feet level is known, skip colliders whose top is below or near feet height
      if (feetY !== null && box.max.y <= feetY + 0.35) {
        continue;
      }
      if (box.intersectsSphere(playerSphere)) {
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

// Global exposure
window.CSBeachMap = CSBeachMap;
window.CSDust2Map = CSBeachMap; // Backward compatibility alias
