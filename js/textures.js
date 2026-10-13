/**
 * Procedural Texture Generator for Counter-Strike 1.6 — de_beach (Tropical Coastline Edition)
 * Generates rich, authentic high-resolution textures using HTML5 Canvas for Three.js materials.
 */

class CSTextureGenerator {
  constructor() {
    this.cache = {};
    this.animatedWaterCanvas = null;
    this.animatedWaterCtx = null;
    this.waterTexture = null;
    this.waterTime = 0;
  }

  // Create a canvas of given dimension
  createCanvas(w = 512, h = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    return { canvas, ctx };
  }

  // Convert canvas to Three.js CanvasTexture
  canvasToTexture(canvas, repeatX = 1, repeatY = 1) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    return texture;
  }

  // 1. Tropical Golden Beach Sand Texture (with delicate ripples and seashell flecks)
  getSandTexture() {
    if (this.cache.sand) return this.cache.sand;
    const { canvas, ctx } = this.createCanvas(512, 512);

    // Warm golden sand gradient
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#f2d59f');
    grad.addColorStop(0.35, '#ebd097');
    grad.addColorStop(0.7, '#dfc187');
    grad.addColorStop(1, '#d4b378');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Wind-swept sand ripples (curved gentle dunes)
    ctx.lineWidth = 6;
    for (let y = 0; y < 512; y += 28) {
      ctx.strokeStyle = 'rgba(195, 160, 100, 0.22)';
      ctx.beginPath();
      for (let x = 0; x <= 512; x += 16) {
        const offset = Math.sin((x + y * 2) * 0.035) * 6 + Math.cos(x * 0.02) * 3;
        if (x === 0) ctx.moveTo(x, y + offset);
        else ctx.lineTo(x, y + offset);
      }
      ctx.stroke();

      // Ripple highlight
      ctx.strokeStyle = 'rgba(255, 245, 215, 0.18)';
      ctx.beginPath();
      for (let x = 0; x <= 512; x += 16) {
        const offset = Math.sin((x + y * 2) * 0.035) * 6 + Math.cos(x * 0.02) * 3 - 2;
        if (x === 0) ctx.moveTo(x, y + offset);
        else ctx.lineTo(x, y + offset);
      }
      ctx.stroke();
    }

    // Micro-grain noise
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const noise = (Math.random() - 0.5) * 26;
      d[i] = Math.min(255, Math.max(0, d[i] + noise));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + noise * 0.9));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + noise * 0.7));
    }
    ctx.putImageData(imgData, 0, 0);

    // Shell fragments & glistening mineral specks
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = Math.random() * 2 + 0.8;
      const isShell = Math.random() > 0.6;
      ctx.fillStyle = isShell ? '#fff2e0' : (Math.random() > 0.5 ? '#b88c55' : '#eed0a2');
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = this.canvasToTexture(canvas, 8, 8);
    this.cache.sand = tex;
    return tex;
  }

  // 2. Wet Shore Sand Texture (near ocean water edge)
  getWetSandTexture() {
    if (this.cache.wetSand) return this.cache.wetSand;
    const { canvas, ctx } = this.createCanvas(512, 512);

    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#a68257');
    grad.addColorStop(0.5, '#997349');
    grad.addColorStop(1, '#8b653c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Water wave wash sheen
    for (let i = 0; i < 8; i++) {
      const y = i * 64;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.ellipse(256, y, 240, 24, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fine grain
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 18;
      d[i] = Math.min(255, Math.max(0, d[i] + n));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n * 0.9));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n * 0.75));
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = this.canvasToTexture(canvas, 6, 6);
    this.cache.wetSand = tex;
    return tex;
  }

  // 3. Crystal Clear Turquoise Ocean Water Texture (Animated Caustics & Foam)
  getWaterTexture() {
    if (this.waterTexture) return this.waterTexture;

    const { canvas, ctx } = this.createCanvas(512, 512);
    this.animatedWaterCanvas = canvas;
    this.animatedWaterCtx = ctx;

    this.renderWaterFrame(0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(12, 12);
    this.waterTexture = tex;
    return tex;
  }

  renderWaterFrame(time = 0) {
    const ctx = this.animatedWaterCtx;
    if (!ctx) return;

    // Deep turquoise to sparkling cyan gradient
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#00a896');
    grad.addColorStop(0.4, '#028090');
    grad.addColorStop(0.8, '#05668d');
    grad.addColorStop(1, '#024d6d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Multi-layered animated caustics
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = 'rgba(180, 245, 255, 0.45)';

    for (let y = 16; y < 512; y += 40) {
      ctx.beginPath();
      for (let x = 0; x <= 512; x += 12) {
        const wave = Math.sin((x * 0.04) + time * 2) * 8 + Math.cos((y * 0.05) - time * 1.5) * 6;
        if (x === 0) ctx.moveTo(x, y + wave);
        else ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }

    // Secondary criss-cross caustic cells
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = 'rgba(230, 255, 255, 0.3)';
    for (let x = 20; x < 512; x += 44) {
      ctx.beginPath();
      for (let y = 0; y <= 512; y += 14) {
        const wave2 = Math.sin((y * 0.045) + time * 1.8) * 7 + Math.cos((x * 0.03) + time * 1.2) * 5;
        if (y === 0) ctx.moveTo(x + wave2, y);
        else ctx.lineTo(x + wave2, y);
      }
      ctx.stroke();
    }

    // Sunlight glittering highlights
    for (let i = 0; i < 40; i++) {
      const sx = ((i * 123 + time * 80) % 500) + 6;
      const sy = ((i * 247 + time * 50) % 500) + 6;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  updateWater(delta) {
    if (!this.waterTexture || !this.animatedWaterCtx) return;
    this.waterTime += delta * 1.2;
    this.renderWaterFrame(this.waterTime);
    this.waterTexture.needsUpdate = true;
  }

  // 4. Weathered Beach Boardwalk & Pier Wood Planks Texture
  getWoodPlankTexture() {
    if (this.cache.woodPlank) return this.cache.woodPlank;
    const { canvas, ctx } = this.createCanvas(512, 512);

    // Warm sun-bleached cedar wood base
    ctx.fillStyle = '#9b7d59';
    ctx.fillRect(0, 0, 512, 512);

    const plankCount = 8;
    const plankH = 512 / plankCount;

    for (let i = 0; i < plankCount; i++) {
      const y = i * plankH;

      // Color variation between planks
      const tones = ['#a2825d', '#8e6f4b', '#b39169', '#7f6241', '#997a55'];
      ctx.fillStyle = tones[i % tones.length];
      ctx.fillRect(0, y, 512, plankH);

      // Wood grain lines
      ctx.strokeStyle = 'rgba(60, 40, 20, 0.28)';
      ctx.lineWidth = 1.5;
      for (let g = 0; g < 6; g++) {
        const gy = y + 8 + g * 8;
        ctx.beginPath();
        for (let x = 0; x <= 512; x += 32) {
          const wobble = Math.sin((x + i * 50) * 0.05) * 3;
          if (x === 0) ctx.moveTo(x, gy + wobble);
          else ctx.lineTo(x, gy + wobble);
        }
        ctx.stroke();
      }

      // Plank gap separator
      ctx.fillStyle = '#3a2717';
      ctx.fillRect(0, y, 512, 3);

      // Iron nail fasteners on both sides
      const nails = [24, 75, 437, 488];
      for (const nx of nails) {
        ctx.fillStyle = '#221912';
        ctx.beginPath();
        ctx.arc(nx, y + plankH / 2, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#7a6a5d';
        ctx.beginPath();
        ctx.arc(nx - 1, y + plankH / 2 - 1, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = this.canvasToTexture(canvas, 3, 3);
    this.cache.woodPlank = tex;
    return tex;
  }

  // 5. Coconut Palm Tree Bark Texture (Fibrous Ringed Trunk)
  getPalmBarkTexture() {
    if (this.cache.palmBark) return this.cache.palmBark;
    const { canvas, ctx } = this.createCanvas(256, 512);

    // Warm tropical bark brown
    ctx.fillStyle = '#654b38';
    ctx.fillRect(0, 0, 256, 512);

    // Palm trunk ring segments
    const ringH = 24;
    for (let y = 0; y < 512; y += ringH) {
      ctx.fillStyle = y % 48 === 0 ? '#543b2a' : '#735742';
      ctx.fillRect(0, y, 256, ringH);

      // Segment crease
      ctx.strokeStyle = '#382417';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= 256; x += 16) {
        ctx.lineTo(x, y + Math.sin(x * 0.08) * 3);
      }
      ctx.stroke();

      // Highlights
      ctx.strokeStyle = 'rgba(215, 180, 140, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, y + 4);
      for (let x = 0; x <= 256; x += 16) {
        ctx.lineTo(x, y + 4 + Math.sin(x * 0.08) * 3);
      }
      ctx.stroke();
    }

    // Vertical bark fibers
    const imgData = ctx.getImageData(0, 0, 256, 512);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 30;
      d[i] = Math.min(255, Math.max(0, d[i] + n));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n * 0.9));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n * 0.7));
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = this.canvasToTexture(canvas, 1, 3);
    this.cache.palmBark = tex;
    return tex;
  }

  // 6. Lush Tropical Palm Leaf Frond Texture
  getPalmLeafTexture() {
    if (this.cache.palmLeaf) return this.cache.palmLeaf;
    const { canvas, ctx } = this.createCanvas(512, 128);

    // Frond leaf gradient: deep jungle green to sunlit lime tips
    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, '#1b4332');
    grad.addColorStop(0.3, '#2d6a4f');
    grad.addColorStop(0.7, '#40916c');
    grad.addColorStop(1, '#74c69d');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 128);

    // Central yellow leaf stem / rib
    ctx.fillStyle = '#b7e4c7';
    ctx.fillRect(0, 60, 512, 8);
    ctx.fillStyle = '#d8f3dc';
    ctx.fillRect(0, 63, 512, 2);

    // Individual palm leaflet strips
    for (let x = 0; x < 512; x += 6) {
      ctx.strokeStyle = 'rgba(15, 50, 30, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, 64);
      ctx.lineTo(x + 20, 0);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(x, 64);
      ctx.lineTo(x + 20, 128);
      ctx.stroke();
    }

    const tex = this.canvasToTexture(canvas, 1, 1);
    this.cache.palmLeaf = tex;
    return tex;
  }

  // 7. Tropical Thatched Straw / Tiki Hut Roof Texture
  getThatchTexture() {
    if (this.cache.thatch) return this.cache.thatch;
    const { canvas, ctx } = this.createCanvas(512, 512);

    // Dried palm thatch golden-brown
    ctx.fillStyle = '#b08953';
    ctx.fillRect(0, 0, 512, 512);

    // Layered thatch rows
    const rows = 12;
    const rh = 512 / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * rh;
      ctx.fillStyle = r % 2 === 0 ? '#997340' : '#bfa068';
      ctx.fillRect(0, y, 512, rh);

      // Vertical straw fibers
      for (let x = 0; x < 512; x += 4) {
        ctx.strokeStyle = Math.random() > 0.5 ? '#735328' : '#d8b67b';
        ctx.lineWidth = 1.5;
        const len = rh * 1.3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (Math.random() - 0.5) * 8, y + len);
        ctx.stroke();
      }
    }

    const tex = this.canvasToTexture(canvas, 2, 2);
    this.cache.thatch = tex;
    return tex;
  }

  // 8. Coastal Coral & Granite Rock Texture
  getRockTexture() {
    if (this.cache.rock) return this.cache.rock;
    const { canvas, ctx } = this.createCanvas(512, 512);

    ctx.fillStyle = '#7a7a72';
    ctx.fillRect(0, 0, 512, 512);

    // Porous rock fissures and mineral crevices
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#575750' : '#99998e';
      ctx.beginPath();
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      const rw = Math.random() * 60 + 20;
      const rh = Math.random() * 40 + 15;
      ctx.ellipse(rx, ry, rw, rh, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    // Weathering noise
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 35;
      d[i] = Math.min(255, Math.max(0, d[i] + n));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = this.canvasToTexture(canvas, 3, 3);
    this.cache.rock = tex;
    return tex;
  }

  // 9. Striped Beach Parasol / Umbrella Canvas Texture
  getUmbrellaTexture(colorA = '#e63946', colorB = '#f1faee') {
    const key = `umbrella_${colorA}_${colorB}`;
    if (this.cache[key]) return this.cache[key];
    const { canvas, ctx } = this.createCanvas(512, 512);

    const stripes = 12;
    const angleStep = (Math.PI * 2) / stripes;
    const cx = 256;
    const cy = 256;

    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? colorA : colorB;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 256, i * angleStep, (i + 1) * angleStep);
      ctx.closePath();
      ctx.fill();
    }

    // Fabric weave texture
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 15;
      d[i] = Math.min(255, Math.max(0, d[i] + n));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    this.cache[key] = tex;
    return tex;
  }

  // 10. Maritime Beach Freight Crate Texture
  getCrateTexture() {
    if (this.cache.crate) return this.cache.crate;
    const { canvas, ctx } = this.createCanvas(512, 512);

    // Weathered coastal pine wood
    ctx.fillStyle = '#8f6843';
    ctx.fillRect(0, 0, 512, 512);

    const plankW = 512 / 6;
    for (let i = 0; i < 6; i++) {
      const x = i * plankW;
      ctx.fillStyle = i % 2 === 0 ? '#7d5936' : '#946d47';
      ctx.fillRect(x, 0, plankW, 512);

      ctx.strokeStyle = '#4e331e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }

    // Reinforced metal frame borders
    const border = 36;
    ctx.fillStyle = '#2b3a42'; // Maritime ocean slate
    ctx.fillRect(0, 0, 512, border);
    ctx.fillRect(0, 512 - border, 512, border);
    ctx.fillRect(0, 0, border, 512);
    ctx.fillRect(512 - border, 0, border, 512);

    // Diagonal metal brace
    ctx.save();
    ctx.strokeStyle = '#223037';
    ctx.lineWidth = 40;
    ctx.beginPath();
    ctx.moveTo(border, border);
    ctx.lineTo(512 - border, 512 - border);
    ctx.stroke();
    ctx.restore();

    // Rivets
    const boltPositions = [
      [18, 18], [512 - 18, 18], [18, 512 - 18], [512 - 18, 512 - 18],
      [256, 18], [256, 512 - 18], [18, 256], [512 - 18, 256], [256, 256]
    ];
    for (const [bx, by] of boltPositions) {
      ctx.fillStyle = '#141c20';
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#617a86';
      ctx.beginPath();
      ctx.arc(bx - 2, by - 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Stencil text: "DE_BEACH / SEASIDE FREIGHT"
    ctx.save();
    ctx.font = 'bold 34px "Share Tech Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.textAlign = 'center';
    ctx.fillText('CS 1.6 BEACH', 256, 210);
    ctx.font = 'bold 22px "Share Tech Mono", monospace';
    ctx.fillText('SEASIDE RESORT FREIGHT', 256, 330);
    ctx.restore();

    const tex = this.canvasToTexture(canvas, 1, 1);
    this.cache.crate = tex;
    return tex;
  }

  // 11. White Stucco Mediterranean Beach Resort Wall Texture
  getWallTexture() {
    if (this.cache.wall) return this.cache.wall;
    const { canvas, ctx } = this.createCanvas(512, 512);

    // Warm sunlit coastal stucco
    ctx.fillStyle = '#e8ded1';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle stone/mortar pattern
    const rows = 6;
    const rh = 512 / rows;
    ctx.strokeStyle = '#c5b5a2';
    ctx.lineWidth = 3;

    for (let r = 0; r < rows; r++) {
      const y = r * rh;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();

      const cols = 3;
      const cw = 512 / cols;
      const offset = (r % 2) * (cw / 2);
      for (let c = -1; c <= cols + 1; c++) {
        const x = c * cw + offset;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + rh);
        ctx.stroke();
      }
    }

    // Weathering & warm sunlight sheen
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 22;
      d[i] = Math.min(255, Math.max(0, d[i] + n));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = this.canvasToTexture(canvas, 3, 2);
    this.cache.wall = tex;
    return tex;
  }

  // 12. Bombsite Graffiti Decals
  getSiteDecalTexture(siteLetter = 'A') {
    const key = 'site_' + siteLetter;
    if (this.cache[key]) return this.cache[key];
    const { canvas, ctx } = this.createCanvas(256, 256);

    ctx.clearRect(0, 0, 256, 256);

    // Vibrant Red Spray Circle
    ctx.strokeStyle = 'rgba(235, 45, 45, 0.88)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(128, 128, 92, 0, Math.PI * 2);
    ctx.stroke();

    // Bold stencil Letter
    ctx.font = '900 120px "Teko", sans-serif';
    ctx.fillStyle = 'rgba(245, 40, 40, 0.95)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(siteLetter, 128, 128);

    // Spray Drips
    ctx.fillStyle = 'rgba(235, 45, 45, 0.75)';
    for (let i = 0; i < 5; i++) {
      const dx = 80 + i * 25;
      const dy = 180 + Math.random() * 15;
      const len = 20 + Math.random() * 35;
      ctx.fillRect(dx, dy, 3.5, len);
    }

    const tex = new THREE.CanvasTexture(canvas);
    this.cache[key] = tex;
    return tex;
  }

  // ==========================================
  // HIGH-DETAIL CS WEAPON SKINS TEXTURES
  // ==========================================

  // 1. AWP | Dragon Lore (Golden olive body, roaring fire dragon, knotwork, checker scope)
  getDragonLoreTexture() {
    if (this.cache.dragonLore) return this.cache.dragonLore;
    const { canvas, ctx } = this.createCanvas(1024, 512);

    // Warm royal olive-gold metallic gradient
    const grad = ctx.createLinearGradient(0, 0, 1024, 512);
    grad.addColorStop(0, '#756839');
    grad.addColorStop(0.3, '#9d8f4e');
    grad.addColorStop(0.6, '#b8aa63');
    grad.addColorStop(0.85, '#8c7e43');
    grad.addColorStop(1, '#5e532b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Subtle brushed metal and golden dragon scales pattern
    ctx.strokeStyle = 'rgba(255, 225, 130, 0.15)';
    ctx.lineWidth = 2;
    for (let y = 0; y < 512; y += 18) {
      ctx.beginPath();
      for (let x = 0; x < 1024; x += 24) {
        ctx.arc(x + (y % 36 === 0 ? 12 : 0), y, 10, 0, Math.PI);
      }
      ctx.stroke();
    }

    // Celtic Knotwork / Medieval Ornament on buttstock area (x: 0 to 320)
    ctx.strokeStyle = '#3d6b45'; // Antique Celtic green
    ctx.lineWidth = 6;
    ctx.strokeRect(40, 60, 240, 390);
    ctx.strokeStyle = '#d4af37'; // Gold inlay
    ctx.lineWidth = 3;
    ctx.strokeRect(48, 68, 224, 374);

    // Knot interlacing loops
    for (let ky = 100; ky < 420; ky += 60) {
      ctx.beginPath();
      ctx.arc(160, ky, 24, 0, Math.PI * 2);
      ctx.strokeStyle = '#2d5334';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Medieval Knight Checkered Pattern on scope section (x: 320 to 700, y: 0 to 120)
    const checkSize = 20;
    for (let cx = 320; cx < 700; cx += checkSize) {
      for (let cy = 10; cy < 110; cy += checkSize) {
        if (((cx / checkSize) + (cy / checkSize)) % 2 === 0) {
          ctx.fillStyle = '#222520';
          ctx.fillRect(cx, cy, checkSize, checkSize);
        } else {
          ctx.fillStyle = '#c5b367';
          ctx.fillRect(cx, cy, checkSize, checkSize);
        }
      }
    }

    // The Famous Roaring Fire Dragon (x: 340 to 860, y: 140 to 460)
    // 1. Dragon fiery body sweeps
    const dragonBodyGrad = ctx.createLinearGradient(320, 300, 800, 250);
    dragonBodyGrad.addColorStop(0, '#800e00');
    dragonBodyGrad.addColorStop(0.3, '#d12400');
    dragonBodyGrad.addColorStop(0.6, '#f36900');
    dragonBodyGrad.addColorStop(0.85, '#ffbc00');
    dragonBodyGrad.addColorStop(1, '#fff59d');

    ctx.save();
    ctx.beginPath();
    // Serpentine dragon body curve
    ctx.moveTo(320, 340);
    ctx.bezierCurveTo(380, 220, 520, 200, 620, 260);
    ctx.bezierCurveTo(720, 320, 780, 220, 850, 230); // neck
    ctx.lineTo(840, 290);
    ctx.bezierCurveTo(750, 370, 620, 380, 500, 320);
    ctx.bezierCurveTo(420, 420, 360, 400, 320, 340);
    ctx.fillStyle = dragonBodyGrad;
    ctx.shadowColor = 'rgba(255, 90, 0, 0.8)';
    ctx.shadowBlur = 24;
    ctx.fill();

    // Dragon head and roaring open jaw
    ctx.beginPath();
    ctx.moveTo(840, 220);
    ctx.lineTo(950, 190); // upper snout
    ctx.lineTo(970, 230); // nose tip
    ctx.lineTo(910, 250); // mouth inside
    ctx.lineTo(960, 290); // lower jaw
    ctx.lineTo(900, 300); // chin
    ctx.lineTo(830, 280); // jaw base
    ctx.closePath();
    ctx.fillStyle = '#e62e00';
    ctx.fill();

    // Sharp white dragon fangs
    ctx.fillStyle = '#fffce6';
    for (let fx = 0; fx < 3; fx++) {
      ctx.beginPath();
      ctx.moveTo(920 + fx * 14, 210);
      ctx.lineTo(925 + fx * 14, 230);
      ctx.lineTo(915 + fx * 14, 210);
      ctx.fill();
    }

    // Glowing golden dragon eye
    ctx.fillStyle = '#fffb00';
    ctx.beginPath();
    ctx.arc(885, 215, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.fillRect(883, 210, 3, 10); // slit pupil

    // Torrents of breath flame billowing towards muzzle (x: 930 to 1024)
    for (let i = 0; i < 18; i++) {
      const flX = 930 + Math.random() * 90;
      const flY = 220 + (Math.random() - 0.5) * 90;
      const flR = 8 + Math.random() * 22;
      const flGrad = ctx.createRadialGradient(flX, flY, 2, flX, flY, flR);
      flGrad.addColorStop(0, 'rgba(255, 255, 230, 0.95)');
      flGrad.addColorStop(0.4, 'rgba(255, 170, 0, 0.8)');
      flGrad.addColorStop(0.8, 'rgba(230, 40, 0, 0.5)');
      flGrad.addColorStop(1, 'rgba(150, 0, 0, 0)');
      ctx.fillStyle = flGrad;
      ctx.beginPath();
      ctx.arc(flX, flY, flR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const tex = this.canvasToTexture(canvas, 1, 1);
    this.cache.dragonLore = tex;
    return tex;
  }

  // 2. AK-47 | Asiimov (Polar stark white, high-vis neon orange panels, sci-fi cyber carbon)
  getAsiimovTexture() {
    if (this.cache.asiimov) return this.cache.asiimov;
    const { canvas, ctx } = this.createCanvas(1024, 512);

    // Stark polar white futuristic chassis
    ctx.fillStyle = '#f2f4f8';
    ctx.fillRect(0, 0, 1024, 512);

    // Subtle carbon weave texture on background
    ctx.fillStyle = 'rgba(215, 222, 230, 0.4)';
    for (let x = 0; x < 1024; x += 16) {
      for (let y = 0; y < 512; y += 16) {
        if ((x + y) % 32 === 0) ctx.fillRect(x, y, 8, 8);
      }
    }

    // Bold Cyber Neon Orange angular plates & stripes
    ctx.fillStyle = '#ff5b00';
    // Diagonal body wing
    ctx.beginPath();
    ctx.moveTo(180, 0);
    ctx.lineTo(440, 0);
    ctx.lineTo(310, 512);
    ctx.lineTo(80, 512);
    ctx.closePath();
    ctx.fill();

    // Front handguard orange chevron
    ctx.beginPath();
    ctx.moveTo(600, 80);
    ctx.lineTo(860, 80);
    ctx.lineTo(800, 320);
    ctx.lineTo(540, 320);
    ctx.closePath();
    ctx.fill();

    // Matte Carbon-Black sharp wedges & framing
    ctx.fillStyle = '#16191d';
    // Top rail section
    ctx.fillRect(0, 0, 1024, 45);

    // Sharp black geometric cutouts
    ctx.beginPath();
    ctx.moveTo(280, 120);
    ctx.lineTo(480, 120);
    ctx.lineTo(420, 360);
    ctx.lineTo(240, 360);
    ctx.closePath();
    ctx.fill();

    // White negative-space geometric arrow cuts
    ctx.fillStyle = '#f2f4f8';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      const ox = 320 + i * 40;
      ctx.moveTo(ox, 180);
      ctx.lineTo(ox + 20, 240);
      ctx.lineTo(ox, 300);
      ctx.lineTo(ox - 12, 300);
      ctx.lineTo(ox + 8, 240);
      ctx.lineTo(ox - 12, 180);
      ctx.closePath();
      ctx.fill();
    }

    // Cyberpunk Typography & Markings
    ctx.font = 'bold 36px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('ASIIMOV', 620, 210);

    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#ff5b00';
    ctx.fillText('// SPEC-01 [A-88]', 620, 245);
    ctx.fillStyle = '#16191d';
    ctx.fillText('DESIGNED BY CORIDIUM', 620, 275);

    // Black hazard triangle decals
    ctx.fillStyle = '#ff5b00';
    ctx.beginPath();
    ctx.moveTo(880, 200);
    ctx.lineTo(915, 260);
    ctx.lineTo(845, 260);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#16191d';
    ctx.beginPath();
    ctx.moveTo(880, 215);
    ctx.lineTo(902, 252);
    ctx.lineTo(858, 252);
    ctx.closePath();
    ctx.fill();

    const tex = this.canvasToTexture(canvas, 1, 1);
    this.cache.asiimov = tex;
    return tex;
  }

  // 3. M4A1 / M4A4 | Howl (Fiery howling wolf demon, crimson firestorm, charcoal matte)
  getHowlTexture() {
    if (this.cache.howl) return this.cache.howl;
    const { canvas, ctx } = this.createCanvas(1024, 512);

    // Deep volcanic charcoal base
    const grad = ctx.createLinearGradient(0, 0, 1024, 512);
    grad.addColorStop(0, '#101014');
    grad.addColorStop(0.4, '#1c1c22');
    grad.addColorStop(0.75, '#2b1010');
    grad.addColorStop(1, '#0e0e12');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Burning ember glow and flame clouds
    for (let i = 0; i < 40; i++) {
      const ex = Math.random() * 1024;
      const ey = Math.random() * 512;
      const er = 20 + Math.random() * 80;
      const eg = ctx.createRadialGradient(ex, ey, 2, ex, ey, er);
      eg.addColorStop(0, 'rgba(255, 60, 0, 0.45)');
      eg.addColorStop(0.6, 'rgba(180, 10, 0, 0.15)');
      eg.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.arc(ex, ey, er, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crimson and orange roaring flame sweeps
    ctx.save();
    ctx.lineWidth = 14;
    for (let f = 0; f < 8; f++) {
      ctx.strokeStyle = f % 2 === 0 ? '#e61e00' : '#ff7b00';
      ctx.beginPath();
      ctx.moveTo(100 + f * 50, 480);
      ctx.bezierCurveTo(240 + f * 40, 360, 300 - f * 20, 240, 480 + f * 50, 160);
      ctx.stroke();
    }

    // The Howling Wolf / Demon Silhouette (x: 420 to 860, y: 120 to 450)
    const wolfGrad = ctx.createLinearGradient(460, 160, 840, 380);
    wolfGrad.addColorStop(0, '#ffffff');
    wolfGrad.addColorStop(0.2, '#ffae00');
    wolfGrad.addColorStop(0.6, '#ff2600');
    wolfGrad.addColorStop(1, '#800000');

    ctx.beginPath();
    ctx.moveTo(520, 420); // neck base
    ctx.lineTo(580, 280); // chest
    ctx.lineTo(660, 220); // muzzle lower
    ctx.lineTo(760, 150); // nose pointing up in fierce howl
    ctx.lineTo(720, 190); // brow
    ctx.lineTo(735, 120); // pointed ear tip
    ctx.lineTo(680, 180); // back of skull
    ctx.lineTo(620, 240); // ruff mane
    ctx.lineTo(550, 360); // back
    ctx.closePath();
    ctx.fillStyle = wolfGrad;
    ctx.shadowColor = 'rgba(255, 60, 0, 0.95)';
    ctx.shadowBlur = 32;
    ctx.fill();

    // Sharp glowing wolf eye
    ctx.fillStyle = '#ffff66';
    ctx.beginPath();
    ctx.arc(680, 195, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.fillRect(679, 191, 3, 8);

    // Wolf Snarl Teeth
    ctx.fillStyle = '#ffffff';
    for (let t = 0; t < 4; t++) {
      ctx.beginPath();
      ctx.moveTo(680 + t * 14, 210);
      ctx.lineTo(687 + t * 14, 230);
      ctx.lineTo(675 + t * 14, 210);
      ctx.fill();
    }
    ctx.restore();

    const tex = this.canvasToTexture(canvas, 1, 1);
    this.cache.howl = tex;
    return tex;
  }

  // 4. Desert Eagle | Printstream (Iridescent pearlescent white, minimalist arrows, XX-01)
  getPrintstreamTexture() {
    if (this.cache.printstream) return this.cache.printstream;
    const { canvas, ctx } = this.createCanvas(1024, 512);

    // Pearlescent holographic iridescent white
    const grad = ctx.createLinearGradient(0, 0, 1024, 512);
    grad.addColorStop(0, '#eaf0f8');
    grad.addColorStop(0.25, '#f5eefc');
    grad.addColorStop(0.5, '#eefbfb');
    grad.addColorStop(0.75, '#fbf4ea');
    grad.addColorStop(1, '#edf1f5');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 512);

    // Matte pitch-black slide accents
    ctx.fillStyle = '#111315';
    ctx.fillRect(40, 40, 944, 40); // top rail
    ctx.fillRect(40, 420, 450, 60); // base grip block

    // Holographic rainbow accent stripe
    const holoGrad = ctx.createLinearGradient(40, 120, 984, 120);
    holoGrad.addColorStop(0, '#00f5d4');
    holoGrad.addColorStop(0.25, '#7b2cbf');
    holoGrad.addColorStop(0.5, '#f72585');
    holoGrad.addColorStop(0.75, '#4cc9f0');
    holoGrad.addColorStop(1, '#fee440');
    ctx.fillStyle = holoGrad;
    ctx.fillRect(40, 110, 944, 8);

    // Tech typography & minimalist decals
    ctx.font = '900 48px monospace';
    ctx.fillStyle = '#111315';
    ctx.fillText('XX - 01', 120, 220);

    ctx.font = 'bold 24px monospace';
    ctx.fillText('PRINTSTREAM // SOFTWARE', 120, 260);
    ctx.font = '16px monospace';
    ctx.fillStyle = '#6c757d';
    ctx.fillText('SYSTEM.VER: 4.8.19_DEBUG', 120, 290);

    // Minimalist geometric arrow array `> > > >`
    for (let a = 0; a < 6; a++) {
      const ax = 600 + a * 55;
      ctx.fillStyle = '#111315';
      ctx.beginPath();
      ctx.moveTo(ax, 190);
      ctx.lineTo(ax + 28, 225);
      ctx.lineTo(ax, 260);
      ctx.lineTo(ax + 14, 260);
      ctx.lineTo(ax + 42, 225);
      ctx.lineTo(ax + 14, 190);
      ctx.closePath();
      ctx.fill();
    }

    // Barcode block
    const barX = 120;
    const barY = 320;
    ctx.fillStyle = '#111315';
    const barPattern = [4, 2, 6, 2, 8, 4, 2, 6, 2, 4, 8, 2, 4, 6, 2, 8];
    let curX = barX;
    for (const w of barPattern) {
      ctx.fillRect(curX, barY, w, 40);
      curX += w + 4;
    }

    const tex = this.canvasToTexture(canvas, 1, 1);
    this.cache.printstream = tex;
    return tex;
  }

  // 5. Knife | Doppler Phase 2 Pink Galaxy & Fade (Deep galaxy purple to hot pink gradient)
  getDopplerTexture() {
    if (this.cache.doppler) return this.cache.doppler;
    const { canvas, ctx } = this.createCanvas(512, 512);

    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#0a0524');
    grad.addColorStop(0.2, '#1b004d');
    grad.addColorStop(0.45, '#7b0080');
    grad.addColorStop(0.7, '#ff007f'); // Hot Pink Galaxy
    grad.addColorStop(0.88, '#ff54a4');
    grad.addColorStop(1, '#ffccd5');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Shimmering metallic cloud swirls
    for (let i = 0; i < 30; i++) {
      const cx = Math.random() * 512;
      const cy = Math.random() * 512;
      const cr = 20 + Math.random() * 70;
      const cg = ctx.createRadialGradient(cx, cy, 2, cx, cy, cr);
      cg.addColorStop(0, 'rgba(255, 0, 160, 0.45)');
      cg.addColorStop(0.7, 'rgba(60, 0, 120, 0.15)');
      cg.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = this.canvasToTexture(canvas, 1, 1);
    this.cache.doppler = tex;
    return tex;
  }

  // 6. SSG 08 | Bloodsport / Dragonfire (Racing red, Japanese cyber stencils, yellow highlights)
  getBloodsportTexture() {
    if (this.cache.bloodsport) return this.cache.bloodsport;
    const { canvas, ctx } = this.createCanvas(1024, 512);

    // High-gloss fiery racing red
    ctx.fillStyle = '#d90429';
    ctx.fillRect(0, 0, 1024, 512);

    // Pure white angular speed stripes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(240, 0);
    ctx.lineTo(380, 0);
    ctx.lineTo(260, 512);
    ctx.lineTo(120, 512);
    ctx.closePath();
    ctx.fill();

    // Carbon black contrast panels
    ctx.fillStyle = '#141416';
    ctx.fillRect(440, 60, 480, 180);
    ctx.fillRect(0, 360, 1024, 152);

    // Vibrant racing yellow pinstripes
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(440, 52, 480, 8);
    ctx.fillRect(440, 240, 480, 8);

    // Stencil Racing Markings
    ctx.font = '900 42px monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('BLOODSPORT // 08', 460, 130);
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#ffd166';
    ctx.fillText('雷神 /// THUNDER RACING', 460, 170);

    const tex = this.canvasToTexture(canvas, 1, 1);
    this.cache.bloodsport = tex;
    return tex;
  }

  // ==========================================
  // MINECRAFT & CHARACTER SKINS TEXTURES
  // ==========================================

  // 1. Minecraft Steve Face (Pixelated 8x8 block texture scaled to 128x128)
  getSteveFaceTexture() {
    if (this.cache.steveFace) return this.cache.steveFace;
    const { canvas, ctx } = this.createCanvas(128, 128);
    ctx.imageSmoothingEnabled = false;

    // Steve Face 8x8 Palette:
    // Hair: #4a2f13, Skin: #b87b50, Eyes: #ffffff & #2c3a7a, Mouth/Goatee: #59351e
    const skin = '#b87b50';
    const hair = '#4a2f13';
    const darkHair = '#3b250e';
    const eyeWhite = '#ffffff';
    const eyePupil = '#2c3a7a'; // Indigo Steve eyes
    const mouth = '#59351e';
    const nose = '#9c643e';

    const p = 16; // 128 / 8 = 16px per pixel block

    const grid = [
      [hair, hair, hair, hair, hair, hair, hair, hair],
      [hair, hair, hair, hair, hair, hair, hair, hair],
      [darkHair, skin, eyeWhite, eyePupil, eyePupil, eyeWhite, skin, darkHair],
      [skin, skin, skin, skin, skin, skin, skin, skin],
      [skin, skin, nose, nose, nose, skin, skin, skin],
      [skin, mouth, mouth, mouth, mouth, mouth, skin, skin],
      [skin, skin, mouth, mouth, mouth, skin, skin, skin],
      [skin, skin, skin, skin, skin, skin, skin, skin]
    ];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        ctx.fillStyle = grid[r][c];
        ctx.fillRect(c * p, r * p, p, p);
      }
    }

    const tex = this.canvasToTexture(canvas, 1, 1);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    this.cache.steveFace = tex;
    return tex;
  }

  // 2. Minecraft Steve Shirt (Iconic Turquoise / Cyan Shirt with pixel shading)
  getSteveShirtTexture() {
    if (this.cache.steveShirt) return this.cache.steveShirt;
    const { canvas, ctx } = this.createCanvas(128, 128);
    ctx.imageSmoothingEnabled = false;

    const baseCyan = '#00a3a3';
    const lightCyan = '#00bebe';
    const darkCyan = '#008585';
    const skin = '#b87b50';
    const p = 16;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        // V-neck skin collar at top
        if (r === 0 && (c === 3 || c === 4)) {
          ctx.fillStyle = skin;
        } else if (r === 1 && (c === 3 || c === 4)) {
          ctx.fillStyle = skin;
        } else {
          // Pixelated cyan variations
          const rand = (r * 3 + c * 7) % 5;
          ctx.fillStyle = rand === 0 ? lightCyan : (rand === 1 ? darkCyan : baseCyan);
        }
        ctx.fillRect(c * p, r * p, p, p);
      }
    }

    const tex = this.canvasToTexture(canvas, 1, 1);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    this.cache.steveShirt = tex;
    return tex;
  }

  // 3. Minecraft Steve Pants (Blue Jeans pixel shading)
  getStevePantsTexture() {
    if (this.cache.stevePants) return this.cache.stevePants;
    const { canvas, ctx } = this.createCanvas(128, 128);
    ctx.imageSmoothingEnabled = false;

    const baseBlue = '#002699';
    const darkBlue = '#001a66';
    const lightBlue = '#1a3db8';
    const p = 16;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const rand = (r * 5 + c * 11) % 4;
        ctx.fillStyle = rand === 0 ? lightBlue : (rand === 1 ? darkBlue : baseBlue);
        ctx.fillRect(c * p, r * p, p, p);
      }
    }

    const tex = this.canvasToTexture(canvas, 1, 1);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    this.cache.stevePants = tex;
    return tex;
  }

  // 4. Minecraft Creeper (Camouflage Green + Iconic Black Frown Face)
  getCreeperTexture() {
    if (this.cache.creeper) return this.cache.creeper;
    const { canvas, ctx } = this.createCanvas(128, 128);
    ctx.imageSmoothingEnabled = false;

    const greens = ['#388e3c', '#4caf50', '#2e7d32', '#66bb6a', '#1b5e20', '#81c784'];
    const p = 16;

    // Green mottled background
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const gIdx = (r * 7 + c * 13) % greens.length;
        ctx.fillStyle = greens[gIdx];
        ctx.fillRect(c * p, r * p, p, p);
      }
    }

    // Iconic Creeper Face in Black (#000000)
    ctx.fillStyle = '#0a0a0a';
    // Eyes: (row 2, col 1-2) and (row 2, col 5-6)
    ctx.fillRect(1 * p, 2 * p, 2 * p, 2 * p);
    ctx.fillRect(5 * p, 2 * p, 2 * p, 2 * p);
    // Nose / bridge: (row 3-5, col 3-4)
    ctx.fillRect(3 * p, 3 * p, 2 * p, 2 * p);
    // Mouth frown wings:
    ctx.fillRect(2 * p, 4 * p, p, 3 * p);
    ctx.fillRect(5 * p, 4 * p, p, 3 * p);

    const tex = this.canvasToTexture(canvas, 1, 1);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    this.cache.creeper = tex;
    return tex;
  }

  // 5. Minecraft Diamond Armor (Crystalline cyan diamonds)
  getDiamondArmorTexture() {
    if (this.cache.diamondArmor) return this.cache.diamondArmor;
    const { canvas, ctx } = this.createCanvas(128, 128);
    ctx.imageSmoothingEnabled = false;

    const dShades = ['#33ebcb', '#20c9ad', '#5cfadc', '#189e87', '#99ffee'];
    const p = 16;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const idx = (r * 3 + c * 5) % dShades.length;
        ctx.fillStyle = dShades[idx];
        ctx.fillRect(c * p, r * p, p, p);
      }
    }

    const tex = this.canvasToTexture(canvas, 1, 1);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    this.cache.diamondArmor = tex;
    return tex;
  }

  // 13. Panoramic Tropical Sky & Ocean Horizon with Clouds and Distant Islands
  getSkyMaterial() {
    const { canvas, ctx } = this.createCanvas(1024, 512);

    // Sky Gradient: Rich tropical zenith blue down to warm ocean horizon
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 380);
    skyGrad.addColorStop(0, '#10529e');
    skyGrad.addColorStop(0.35, '#2e86de');
    skyGrad.addColorStop(0.7, '#64b5f6');
    skyGrad.addColorStop(0.92, '#bbdefb');
    skyGrad.addColorStop(1, '#ffeedb');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 1024, 380);

    // Ocean Horizon water strip
    const oceanGrad = ctx.createLinearGradient(0, 380, 0, 512);
    oceanGrad.addColorStop(0, '#0077b6');
    oceanGrad.addColorStop(0.5, '#0096c7');
    oceanGrad.addColorStop(1, '#03045e');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 380, 1024, 132);

    // Distant Tropical Mountain & Island Silhouettes on the Horizon!
    ctx.fillStyle = 'rgba(28, 80, 115, 0.72)';
    ctx.beginPath();
    ctx.moveTo(0, 380);
    // Draw sweeping tropical island peaks
    const peaks = [
      [60, 320], [140, 350], [210, 380],
      [420, 380], [520, 305], [590, 335], [660, 310], [740, 380],
      [860, 380], [920, 340], [980, 365], [1024, 380]
    ];
    for (const [px, py] of peaks) {
      ctx.lineTo(px, py);
    }
    ctx.lineTo(1024, 380);
    ctx.closePath();
    ctx.fill();

    // Fluffy procedural cumulus clouds
    const drawCloud = (cx, cy, scale) => {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.arc(cx, cy, 26 * scale, 0, Math.PI * 2);
      ctx.arc(cx + 28 * scale, cy - 8 * scale, 34 * scale, 0, Math.PI * 2);
      ctx.arc(cx + 62 * scale, cy - 4 * scale, 28 * scale, 0, Math.PI * 2);
      ctx.arc(cx + 88 * scale, cy + 4 * scale, 22 * scale, 0, Math.PI * 2);
      ctx.arc(cx + 42 * scale, cy + 12 * scale, 26 * scale, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    drawCloud(120, 160, 1.2);
    drawCloud(340, 110, 1.4);
    drawCloud(620, 180, 1.0);
    drawCloud(820, 130, 1.3);

    // Blazing Warm Tropical Sun with corona glow
    const sunX = 480;
    const sunY = 130;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, 220);
    sunGlow.addColorStop(0, 'rgba(255, 255, 240, 1)');
    sunGlow.addColorStop(0.15, 'rgba(255, 245, 180, 0.9)');
    sunGlow.addColorStop(0.4, 'rgba(255, 215, 120, 0.45)');
    sunGlow.addColorStop(0.75, 'rgba(255, 180, 80, 0.15)');
    sunGlow.addColorStop(1, 'rgba(255, 150, 50, 0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 220, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    return new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.BackSide
    });
  }

  // ==========================================
  // AUTHENTIC DE_DUST2 PROCEDURAL TEXTURES
  // ==========================================

  // Dust II Desert Ground (packed sand, arid dust, cracked clay)
  getDustGroundTexture() {
    if (this.cache.dustGround) return this.cache.dustGround;
    const { canvas, ctx } = this.createCanvas(512, 512);

    // Desert sandy earth base gradient
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#d9b382');
    grad.addColorStop(0.5, '#cba06f');
    grad.addColorStop(1, '#be915e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Weathered desert soil cracks
    ctx.strokeStyle = 'rgba(125, 88, 48, 0.28)';
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 28; i++) {
      let cx = Math.random() * 512;
      let cy = Math.random() * 512;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      for (let j = 0; j < 4; j++) {
        cx += (Math.random() - 0.5) * 55;
        cy += (Math.random() - 0.5) * 55;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }

    // Micro noise & sand grain speckles
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 24;
      d[i] = Math.min(255, Math.max(0, d[i] + n));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n * 0.9));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n * 0.75));
    }
    ctx.putImageData(imgData, 0, 0);

    // Desert pebbles and small stones
    for (let i = 0; i < 350; i++) {
      const px = Math.random() * 512;
      const py = Math.random() * 512;
      const r = Math.random() * 2.2 + 0.8;
      ctx.fillStyle = Math.random() > 0.5 ? '#9e7343' : '#ebd4b0';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = this.canvasToTexture(canvas, 12, 12);
    this.cache.dustGround = tex;
    return tex;
  }

  // Dust II Middle-Eastern Sandstone Wall & Brick Architecture
  getDustWallTexture() {
    if (this.cache.dustWall) return this.cache.dustWall;
    const { canvas, ctx } = this.createCanvas(512, 512);

    // Warm sandstone base
    ctx.fillStyle = '#e2c59b';
    ctx.fillRect(0, 0, 512, 512);

    // Sandstone block brick courses
    const rows = 8;
    const rowH = 512 / rows;
    ctx.lineWidth = 3;

    for (let r = 0; r <= rows; r++) {
      const y = r * rowH;
      // Mortar groove shadow & highlight
      ctx.strokeStyle = '#a68052';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();

      ctx.strokeStyle = '#f5e2c5';
      ctx.beginPath();
      ctx.moveTo(0, y + 2);
      ctx.lineTo(512, y + 2);
      ctx.stroke();

      // Vertical block seams
      const cols = 4;
      const colW = 512 / cols;
      const offset = (r % 2) * (colW / 2);
      for (let c = -1; c <= cols + 1; c++) {
        const x = c * colW + offset;
        ctx.strokeStyle = '#a68052';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + rowH);
        ctx.stroke();

        ctx.strokeStyle = '#f5e2c5';
        ctx.beginPath();
        ctx.moveTo(x + 2, y);
        ctx.lineTo(x + 2, y + rowH);
        ctx.stroke();
      }
    }

    // Weathering stains & dusty plaster gradients
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 28;
      d[i] = Math.min(255, Math.max(0, d[i] + n));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n * 0.95));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n * 0.8));
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = this.canvasToTexture(canvas, 4, 3);
    this.cache.dustWall = tex;
    return tex;
  }

  // Dust II Military & Wooden Crates
  getDustCrateTexture() {
    if (this.cache.dustCrate) return this.cache.dustCrate;
    const { canvas, ctx } = this.createCanvas(512, 512);

    // Warm aged pine wood background
    ctx.fillStyle = '#b68853';
    ctx.fillRect(0, 0, 512, 512);

    // Planks vertical lines
    const plankW = 512 / 5;
    for (let i = 0; i <= 5; i++) {
      ctx.strokeStyle = '#6f4f2a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(i * plankW, 0);
      ctx.lineTo(i * plankW, 512);
      ctx.stroke();
    }

    // Heavy outer wooden border
    ctx.lineWidth = 36;
    ctx.strokeStyle = '#8c6035';
    ctx.strokeRect(18, 18, 476, 476);

    // Diagonal structural support braces (CS 1.6 iconic crate X)
    ctx.lineWidth = 26;
    ctx.strokeStyle = '#8c6035';
    ctx.beginPath();
    ctx.moveTo(36, 36);
    ctx.lineTo(476, 476);
    ctx.moveTo(476, 36);
    ctx.lineTo(36, 476);
    ctx.stroke();

    // Steel corner brackets
    ctx.fillStyle = '#4a5359';
    const cornerSize = 64;
    ctx.fillRect(0, 0, cornerSize, 18);
    ctx.fillRect(0, 0, 18, cornerSize);
    ctx.fillRect(512 - cornerSize, 0, cornerSize, 18);
    ctx.fillRect(512 - 18, 0, 18, cornerSize);
    ctx.fillRect(0, 512 - 18, cornerSize, 18);
    ctx.fillRect(0, 512 - cornerSize, 18, cornerSize);
    ctx.fillRect(512 - cornerSize, 512 - 18, cornerSize, 18);
    ctx.fillRect(512 - 18, 512 - cornerSize, 18, cornerSize);

    // Stencil text "FRAGILE / DUST II"
    ctx.save();
    ctx.fillStyle = 'rgba(38, 26, 14, 0.72)';
    ctx.font = 'bold 32px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FRAGILE // DE_DUST2', 256, 266);
    ctx.font = 'bold 20px monospace';
    ctx.fillText('TACTICAL RESUPPLY', 256, 304);
    ctx.restore();

    const tex = this.canvasToTexture(canvas, 1, 1);
    this.cache.dustCrate = tex;
    return tex;
  }

  // Dust II Iconic Green Metal Double Doors (Mid Doors & B Doors)
  getDustDoorTexture() {
    if (this.cache.dustDoor) return this.cache.dustDoor;
    const { canvas, ctx } = this.createCanvas(512, 512);

    // Authentic CS 1.6 olive military green metal
    ctx.fillStyle = '#4a5d45';
    ctx.fillRect(0, 0, 512, 512);

    // Heavy reinforced metal perimeter trim
    ctx.lineWidth = 28;
    ctx.strokeStyle = '#2d3b2a';
    ctx.strokeRect(14, 14, 484, 484);

    // Center divider seam
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#1d271b';
    ctx.beginPath();
    ctx.moveTo(256, 0);
    ctx.lineTo(256, 512);
    ctx.stroke();

    // Rivet studs along panels
    ctx.fillStyle = '#6b7f65';
    for (let y = 30; y < 500; y += 45) {
      ctx.beginPath();
      ctx.arc(36, y, 4, 0, Math.PI * 2);
      ctx.arc(240, y, 4, 0, Math.PI * 2);
      ctx.arc(272, y, 4, 0, Math.PI * 2);
      ctx.arc(476, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Heavy door pull handles
    ctx.fillStyle = '#1e241c';
    ctx.fillRect(215, 230, 16, 75);
    ctx.fillRect(281, 230, 16, 75);
    ctx.fillStyle = '#7a8e73';
    ctx.fillRect(218, 233, 10, 69);
    ctx.fillRect(284, 233, 10, 69);

    // Stencil Arabic / Military warning markings
    ctx.save();
    ctx.fillStyle = 'rgba(235, 205, 145, 0.7)';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ZONE 8 // DANGER', 256, 120);
    ctx.restore();

    // Scratches & bullet impact scrapes
    ctx.strokeStyle = 'rgba(180, 200, 175, 0.35)';
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 20; i++) {
      const sx = Math.random() * 450 + 30;
      const sy = Math.random() * 450 + 30;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (Math.random() - 0.5) * 35, sy + (Math.random() - 0.5) * 35);
      ctx.stroke();
    }

    const tex = this.canvasToTexture(canvas, 1, 1);
    this.cache.dustDoor = tex;
    return tex;
  }

  // Dust II Desert Sky Material (blazing sun, arid horizon, warm midday haze)
  getDustSkyMaterial() {
    const { canvas, ctx } = this.createCanvas(1024, 512);

    // Warm desert sky gradient (from azure blue zenith to warm sandy horizon)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 512);
    skyGrad.addColorStop(0, '#3a7bd5');     // Deep blue zenith
    skyGrad.addColorStop(0.35, '#68a0e8');  // Clear midday blue
    skyGrad.addColorStop(0.70, '#b8d6f5');  // Bright horizon atmosphere
    skyGrad.addColorStop(0.92, '#eedbc5');  // Warm dust haze
    skyGrad.addColorStop(1, '#dfc49e');     // Sandy horizon line
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 1024, 512);

    // Distant arid mountain silhouettes along horizon
    ctx.fillStyle = 'rgba(175, 142, 108, 0.45)';
    ctx.beginPath();
    ctx.moveTo(0, 512);
    let my = 420;
    for (let mx = 0; mx <= 1024; mx += 32) {
      my = 400 + Math.sin(mx * 0.015) * 35 + Math.cos(mx * 0.04) * 18;
      ctx.lineTo(mx, my);
    }
    ctx.lineTo(1024, 512);
    ctx.closePath();
    ctx.fill();

    // Blazing Middle-Eastern Sun with intense lens flare
    const sunX = 512;
    const sunY = 120;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 260);
    sunGlow.addColorStop(0, 'rgba(255, 255, 245, 1.0)');
    sunGlow.addColorStop(0.12, 'rgba(255, 250, 200, 0.95)');
    sunGlow.addColorStop(0.35, 'rgba(255, 220, 130, 0.50)');
    sunGlow.addColorStop(0.70, 'rgba(255, 180, 80, 0.18)');
    sunGlow.addColorStop(1, 'rgba(255, 140, 50, 0)');
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 260, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    return new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.BackSide
    });
  }

  // ==========================================
  // AUTHENTIC MINECRAFT VOXEL BLOCK TEXTURES
  // ==========================================

  // 1. Minecraft Grass Top (16x16 pixelated lush foliage green)
  getMinecraftGrassTopTexture() {
    if (this.cache.mcGrassTop) return this.cache.mcGrassTop;
    const { canvas, ctx } = this.createCanvas(128, 128);
    ctx.imageSmoothingEnabled = false;

    const greens = ['#5b8c32', '#4c7828', '#659b38', '#3f6620', '#72ad3d', '#54822d', '#7ebb42'];
    const p = 8; // 16x16 grid

    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        const idx = Math.floor(Math.abs(Math.sin(r * 12.9898 + c * 78.233) * 43758.5453)) % greens.length;
        ctx.fillStyle = greens[idx];
        ctx.fillRect(c * p, r * p, p, p);
      }
    }

    const tex = this.canvasToTexture(canvas, 1, 1);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    this.cache.mcGrassTop = tex;
    return tex;
  }

  // 2. Minecraft Grass Side (Grass rim on top, jagged overhangs, brown soil below)
  getMinecraftGrassSideTexture() {
    if (this.cache.mcGrassSide) return this.cache.mcGrassSide;
    const { canvas, ctx } = this.createCanvas(128, 128);
    ctx.imageSmoothingEnabled = false;

    const dirtColors = ['#866043', '#735135', '#573d26', '#966c4b', '#684a30'];
    const grassColors = ['#5b8c32', '#4c7828', '#659b38', '#72ad3d', '#3f6620'];
    const p = 8; // 16x16 grid

    // Dirt base
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        const dIdx = Math.floor(Math.abs(Math.sin(r * 9.1 + c * 15.3) * 31415)) % dirtColors.length;
        ctx.fillStyle = dirtColors[dIdx];
        ctx.fillRect(c * p, r * p, p, p);
      }
    }

    // Grass overhang on top (columns vary between 2 and 5 pixels depth)
    const overhangDepths = [3, 4, 3, 2, 4, 5, 3, 2, 4, 3, 5, 4, 2, 3, 4, 3];
    for (let c = 0; c < 16; c++) {
      const depth = overhangDepths[c];
      for (let r = 0; r < depth; r++) {
        const gIdx = Math.floor(Math.abs(Math.sin(r * 7.7 + c * 11.2) * 27182)) % grassColors.length;
        ctx.fillStyle = grassColors[gIdx];
        ctx.fillRect(c * p, r * p, p, p);
      }
    }

    const tex = this.canvasToTexture(canvas, 1, 1);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    this.cache.mcGrassSide = tex;
    return tex;
  }

  // 3. Minecraft Dirt (Rich pixelated earthy soil)
  getMinecraftDirtTexture() {
    if (this.cache.mcDirt) return this.cache.mcDirt;
    const { canvas, ctx } = this.createCanvas(128, 128);
    ctx.imageSmoothingEnabled = false;

    const dirtColors = ['#866043', '#735135', '#573d26', '#966c4b', '#684a30', '#7a5639'];
    const p = 8;

    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        const idx = Math.floor(Math.abs(Math.sin(r * 13.7 + c * 23.1) * 45678)) % dirtColors.length;
        ctx.fillStyle = dirtColors[idx];
        ctx.fillRect(c * p, r * p, p, p);
      }
    }

    const tex = this.canvasToTexture(canvas, 1, 1);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    this.cache.mcDirt = tex;
    return tex;
  }

  // 4. Minecraft Cobblestone (Classic stone chunks with dark cracks)
  getMinecraftCobblestoneTexture() {
    if (this.cache.mcCobblestone) return this.cache.mcCobblestone;
    const { canvas, ctx } = this.createCanvas(128, 128);
    ctx.imageSmoothingEnabled = false;

    const stones = ['#7c7c7c', '#626262', '#8e8e8e', '#545454', '#9e9e9e', '#454545', '#383838'];
    const p = 8;

    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        // Pseudo-random stone pattern
        const noise = Math.abs(Math.sin(r * 5.3 + c * 17.9) * 89765);
        let idx = Math.floor(noise) % stones.length;
        // Edge seams
        if ((r % 4 === 0 && (c % 8 < 4)) || (r % 4 === 2 && (c % 8 >= 4)) || (c % 4 === 0)) {
          idx = stones.length - 1; // Dark mortar
        }
        ctx.fillStyle = stones[idx];
        ctx.fillRect(c * p, r * p, p, p);
      }
    }

    const tex = this.canvasToTexture(canvas, 1, 1);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    this.cache.mcCobblestone = tex;
    return tex;
  }

  // 5. Minecraft Stone Bricks (Carved stone fortress walls)
  getMinecraftStoneBrickTexture() {
    if (this.cache.mcStoneBrick) return this.cache.mcStoneBrick;
    const { canvas, ctx } = this.createCanvas(128, 128);
    ctx.imageSmoothingEnabled = false;

    const stoneColors = ['#7d7d7d', '#6e6e6e', '#8c8c8c', '#5e5e5e'];
    const p = 8;

    // 4 rows of bricks (4 pixels tall each)
    for (let r = 0; r < 16; r++) {
      const isHorizontalMortar = (r % 4 === 3);
      for (let c = 0; c < 16; c++) {
        const brickRow = Math.floor(r / 4);
        const colOffset = (brickRow % 2 === 0) ? 0 : 4;
        const isVerticalMortar = ((c + colOffset) % 8 === 7);

        if (isHorizontalMortar || isVerticalMortar) {
          ctx.fillStyle = '#3c3c3c'; // Dark mortar line
        } else if (r % 4 === 0 || (c + colOffset) % 8 === 0) {
          ctx.fillStyle = '#9b9b9b'; // Top-left highlight
        } else {
          const idx = Math.floor(Math.abs(Math.sin(r * 3.3 + c * 8.7) * 12345)) % stoneColors.length;
          ctx.fillStyle = stoneColors[idx];
        }
        ctx.fillRect(c * p, r * p, p, p);
      }
    }

    const tex = this.canvasToTexture(canvas, 1, 1);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    this.cache.mcStoneBrick = tex;
    return tex;
  }

  // 6. Minecraft Oak Planks (Warm horizontal wood planks)
  getMinecraftOakPlanksTexture() {
    if (this.cache.mcOakPlanks) return this.cache.mcOakPlanks;
    const { canvas, ctx } = this.createCanvas(128, 128);
    ctx.imageSmoothingEnabled = false;

    const woods = ['#b8945f', '#a88450', '#c29f69', '#9c7743', '#8e6c3a'];
    const p = 8;

    for (let r = 0; r < 16; r++) {
      const isPlankDivider = (r % 4 === 3);
      for (let c = 0; c < 16; c++) {
        if (isPlankDivider) {
          ctx.fillStyle = '#5c4323'; // Dark plank groove
        } else if (r % 4 === 0) {
          ctx.fillStyle = '#cca975'; // Plank highlight
        } else {
          const idx = Math.floor(Math.abs(Math.sin(r * 4.1 + c * 11.7) * 43210)) % woods.length;
          ctx.fillStyle = woods[idx];
        }
        ctx.fillRect(c * p, r * p, p, p);
      }
    }

    const tex = this.canvasToTexture(canvas, 1, 1);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    this.cache.mcOakPlanks = tex;
    return tex;
  }

  // 7. Minecraft Oak Log Side (Tree trunk bark)
  getMinecraftOakLogSideTexture() {
    if (this.cache.mcOakLogSide) return this.cache.mcOakLogSide;
    const { canvas, ctx } = this.createCanvas(128, 128);
    ctx.imageSmoothingEnabled = false;

    const barkShades = ['#6b5335', '#523e26', '#7d613e', '#3d2d1b', '#8a6c47'];
    const p = 8;

    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        // Vertical bark stripes
        const stripe = Math.sin(c * 1.5) * 2;
        const noise = Math.abs(Math.sin(r * 9.3 + c * 3.1) * 9876);
        const idx = Math.floor(Math.abs(stripe + noise)) % barkShades.length;
        ctx.fillStyle = barkShades[idx];
        ctx.fillRect(c * p, r * p, p, p);
      }
    }

    const tex = this.canvasToTexture(canvas, 1, 1);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    this.cache.mcOakLogSide = tex;
    return tex;
  }

  // 8. Minecraft Oak Log Top (Concentric wood rings)
  getMinecraftOakLogTopTexture() {
    if (this.cache.mcOakLogTop) return this.cache.mcOakLogTop;
    const { canvas, ctx } = this.createCanvas(128, 128);
    ctx.imageSmoothingEnabled = false;

    const p = 8;
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        const isBark = (r === 0 || r === 15 || c === 0 || c === 15);
        if (isBark) {
          ctx.fillStyle = '#523e26';
        } else {
          const dx = r - 7.5;
          const dy = c - 7.5;
          const dist = Math.hypot(dx, dy);
          if (dist > 5.5) ctx.fillStyle = '#6b5335';
          else if (dist > 3.8) ctx.fillStyle = '#8c6b41';
          else if (dist > 2.0) ctx.fillStyle = '#a38053';
          else ctx.fillStyle = '#785b37';
        }
        ctx.fillRect(c * p, r * p, p, p);
      }
    }

    const tex = this.canvasToTexture(canvas, 1, 1);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    this.cache.mcOakLogTop = tex;
    return tex;
  }

  // 9. Minecraft Leaves (Lush foliage with transparent holes)
  getMinecraftLeavesTexture() {
    if (this.cache.mcLeaves) return this.cache.mcLeaves;
    const { canvas, ctx } = this.createCanvas(128, 128);
    ctx.imageSmoothingEnabled = false;

    const leafGreens = ['#38761d', '#275413', '#4d9a27', '#1b3e0c', '#5cb330'];
    const p = 8;

    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        const isHole = (Math.abs(Math.sin(r * 11.1 + c * 17.3) * 6543) % 1) > 0.78;
        if (isHole) {
          ctx.clearRect(c * p, r * p, p, p);
        } else {
          const idx = Math.floor(Math.abs(Math.sin(r * 5.5 + c * 9.9) * 2345)) % leafGreens.length;
          ctx.fillStyle = leafGreens[idx];
          ctx.fillRect(c * p, r * p, p, p);
        }
      }
    }

    const tex = this.canvasToTexture(canvas, 1, 1);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    this.cache.mcLeaves = tex;
    return tex;
  }

  // 10. Minecraft TNT Side (Iconic red explosive with white band and TNT text)
  getMinecraftTNTTexture() {
    if (this.cache.mcTNT) return this.cache.mcTNT;
    const { canvas, ctx } = this.createCanvas(128, 128);
    ctx.imageSmoothingEnabled = false;

    const p = 8;
    const reds = ['#db3225', '#c4281c', '#eb3f31', '#aa1f15'];

    // Red body
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        const isBand = (r >= 6 && r <= 9);
        if (isBand) {
          ctx.fillStyle = '#f0f0f0';
        } else {
          const idx = Math.floor(Math.abs(Math.sin(r * 3.7 + c * 8.3) * 5678)) % reds.length;
          ctx.fillStyle = reds[idx];
        }
        ctx.fillRect(c * p, r * p, p, p);
      }
    }

    // Bold pixelated black "TNT" letters in center band
    ctx.fillStyle = '#111111';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TNT', 64, 64);

    const tex = this.canvasToTexture(canvas, 1, 1);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    this.cache.mcTNT = tex;
    return tex;
  }

  // 11. Minecraft Crafting Table Side (Oak wood with workbench tools)
  getMinecraftCraftingTableTexture() {
    if (this.cache.mcCraftTable) return this.cache.mcCraftTable;
    const { canvas, ctx } = this.createCanvas(128, 128);
    ctx.imageSmoothingEnabled = false;

    // Wood base
    const woodTex = this.getMinecraftOakPlanksTexture();
    ctx.drawImage(woodTex.image, 0, 0, 128, 128);

    // Saw & hammer tool silhouettes
    ctx.fillStyle = '#3a3a3a';
    // Saw blade
    ctx.fillRect(20, 36, 40, 10);
    ctx.fillRect(20, 30, 12, 6);
    // Hammer
    ctx.fillRect(76, 32, 28, 14);
    ctx.fillStyle = '#8c6b41';
    ctx.fillRect(86, 46, 8, 38);

    const tex = this.canvasToTexture(canvas, 1, 1);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    this.cache.mcCraftTable = tex;
    return tex;
  }

  // 12. Minecraft Diamond Ore Block (Stone with sparkling diamond crystals)
  getMinecraftDiamondOreTexture() {
    if (this.cache.mcDiamondOre) return this.cache.mcDiamondOre;
    const { canvas, ctx } = this.createCanvas(128, 128);
    ctx.imageSmoothingEnabled = false;

    // Smooth stone base
    const p = 8;
    const stones = ['#7c7c7c', '#686868', '#8e8e8e', '#545454'];
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        const idx = Math.floor(Math.abs(Math.sin(r * 4.9 + c * 11.3) * 9876)) % stones.length;
        ctx.fillStyle = stones[idx];
        ctx.fillRect(c * p, r * p, p, p);
      }
    }

    // Glowing Diamond Ore flecks
    const diamonds = [
      [3, 4], [4, 4], [4, 5],
      [11, 3], [12, 3], [12, 4],
      [2, 11], [3, 11], [3, 12],
      [9, 10], [10, 10], [10, 11], [9, 11]
    ];
    for (const [r, c] of diamonds) {
      ctx.fillStyle = '#2de6c9';
      ctx.fillRect(c * p, r * p, p, p);
      ctx.fillStyle = '#99ffee';
      ctx.fillRect(c * p + 2, r * p + 2, p - 4, p - 4);
    }

    const tex = this.canvasToTexture(canvas, 1, 1);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    this.cache.mcDiamondOre = tex;
    return tex;
  }

  // 13. Minecraft Gold Ore Block (Stone with rich golden nuggets)
  getMinecraftGoldOreTexture() {
    if (this.cache.mcGoldOre) return this.cache.mcGoldOre;
    const { canvas, ctx } = this.createCanvas(128, 128);
    ctx.imageSmoothingEnabled = false;

    const p = 8;
    const stones = ['#7c7c7c', '#686868', '#8e8e8e', '#545454'];
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        const idx = Math.floor(Math.abs(Math.sin(r * 4.9 + c * 11.3) * 9876)) % stones.length;
        ctx.fillStyle = stones[idx];
        ctx.fillRect(c * p, r * p, p, p);
      }
    }

    const goldNuggets = [
      [4, 3], [5, 3], [5, 4],
      [10, 5], [11, 5], [10, 6],
      [3, 12], [4, 12],
      [12, 11], [13, 11], [12, 12]
    ];
    for (const [r, c] of goldNuggets) {
      ctx.fillStyle = '#f5b82e';
      ctx.fillRect(c * p, r * p, p, p);
      ctx.fillStyle = '#ffec78';
      ctx.fillRect(c * p + 2, r * p + 2, p - 4, p - 4);
    }

    const tex = this.canvasToTexture(canvas, 1, 1);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    this.cache.mcGoldOre = tex;
    return tex;
  }

  // 14. Minecraft Nether Portal Vortex (Mystic pulsing purple obsidian rift)
  getMinecraftPortalTexture() {
    if (this.cache.mcPortal) return this.cache.mcPortal;
    const { canvas, ctx } = this.createCanvas(128, 128);

    const purples = ['#4a148c', '#6a1b9a', '#8e24aa', '#ab47bc', '#ba68c8', '#260e42'];
    const p = 8;
    for (let r = 0; r < 16; r++) {
      for (let c = 0; c < 16; c++) {
        const idx = Math.floor(Math.abs(Math.sin(r * 2.3 + c * 5.7) * 7890)) % purples.length;
        ctx.fillStyle = purples[idx];
        ctx.fillRect(c * p, r * p, p, p);
      }
    }

    const tex = this.canvasToTexture(canvas, 1, 1);
    tex.magFilter = THREE.NearestFilter;
    this.cache.mcPortal = tex;
    return tex;
  }

  // 15. Minecraft Blue Sky with Square Pixel Clouds and Square Sun
  getMinecraftSkyMaterial() {
    const { canvas, ctx } = this.createCanvas(1024, 512);

    // Iconic vibrant Minecraft blue sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 512);
    skyGrad.addColorStop(0, '#4b88e8');
    skyGrad.addColorStop(0.5, '#73abff');
    skyGrad.addColorStop(0.85, '#99c4ff');
    skyGrad.addColorStop(1, '#c5dcff');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 1024, 512);

    // Minecraft Square Cumulus Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    const drawPixelCloud = (x, y, w, h) => {
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(235, 242, 255, 0.95)';
      ctx.fillRect(x + 12, y + 8, w - 24, h - 16);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    };

    drawPixelCloud(60, 120, 220, 60);
    drawPixelCloud(380, 80, 280, 75);
    drawPixelCloud(740, 140, 240, 65);
    drawPixelCloud(180, 220, 180, 50);
    drawPixelCloud(600, 240, 260, 60);

    // Iconic Square Minecraft Sun!
    const sunX = 512;
    const sunY = 90;
    const sunSize = 70;
    // Sun outer corona glow
    const glow = ctx.createRadialGradient(sunX, sunY, sunSize * 0.5, sunX, sunY, sunSize * 2.5);
    glow.addColorStop(0, 'rgba(255, 255, 220, 0.9)');
    glow.addColorStop(0.4, 'rgba(255, 240, 160, 0.4)');
    glow.addColorStop(1, 'rgba(255, 230, 120, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunSize * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Square Sun core
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sunX - sunSize / 2, sunY - sunSize / 2, sunSize, sunSize);
    ctx.fillStyle = '#fff9d6';
    ctx.fillRect(sunX - sunSize / 2 + 4, sunY - sunSize / 2 + 4, sunSize - 8, sunSize - 8);

    const tex = new THREE.CanvasTexture(canvas);
    return new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.BackSide
    });
  }
}

// Global texture generator instance
window.csTextures = new CSTextureGenerator();
window.CSTextures = window.csTextures;
