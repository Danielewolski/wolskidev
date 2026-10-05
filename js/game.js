/* Il mondo di gioco: generazione, fisica, rendering, punti di interesse */
(function () {
  'use strict';
  const WD = window.WD;
  const D = WD.data;
  const { B, tex, texDark, solid, items, faces, rng } = WD.tex;

  const W = 200, H = 44, BASE = 30;
  const G = 32, JUMP = 9.6;
  let fg, bg, heights;
  let cv, ctx, TS = 32, viewW = 30, viewH = 17;
  let torches = [];
  let photo = null, paintingCanvas = null;

  const P = { x: 8, y: BASE - 1.8, w: 0.6, h: 1.8, vx: 0, vy: 0, onGround: false, face: 1, walk: 0, fly: false };
  const cam = { x: 0, y: BASE - 12 };
  const input = { left: false, right: false, jump: false, down: false, sprint: false };
  const state = {
    running: false, paused: false, night: false, t: 0, zone: null, coffee: 10, walked: 0,
    adv: {}, visited: {}, poi: null, fps: 60, debug: false, lastStep: 0
  };
  let ents = [], pois = [], particles = [], cloudsW = [];
  const cat = { x: 14, vx: 0, timer: 0, face: 1, walk: 0 };

  const ZONES = [
    { id: 'spawn', a: 0, b: 18, title: 'Spawn', sub: 'Il punto di partenza' },
    { id: 'about', a: 24, b: 44, title: 'Chi Sono', sub: 'Entra in casa e leggi il libro' },
    { id: 'skills', a: 50, b: 74, title: 'Competenze', sub: "L'officina degli attrezzi" },
    { id: 'exp', a: 80, b: 150, title: 'Esperienza', sub: 'Dal passato al presente →' },
    { id: 'contact', a: 156, b: 178, title: 'Contatti', sub: 'Fai uno scambio con Daniele' },
    { id: 'end', a: 184, b: 200, title: 'Confini del mondo', sub: '...per ora!' }
  ];
  const TP = { spawn: 8, about: 29.2, skills: 55.5, exp: 82, contact: 162, end: 188.5 };
  const MILESTONE_X = [88, 100, 112, 124, 140];

  /* ---------- Generazione del mondo ---------- */
  const I = (x, y) => y * W + x;
  const SEE_THROUGH = { [B.GLASS]: true, [B.ENCHANT]: true, [B.BEACON]: true, [B.LEAVES]: true };
  function setF(x, y, id) { if (x >= 0 && x < W && y >= 0 && y < H) fg[I(x, y)] = id; }
  function setB(x, y, id) { if (x >= 0 && x < W && y >= 0 && y < H) bg[I(x, y)] = id; }
  function getF(x, y) { return (x < 0 || x >= W || y < 0 || y >= H) ? 0 : fg[I(x, y)]; }
  function solidAt(x, y) {
    if (x < 0 || x >= W) return true;
    if (y < 0) return false;
    if (y >= H) return true;
    return solid[fg[I(x, y)]];
  }

  function generate() {
    fg = new Uint8Array(W * H); bg = new Uint8Array(W * H); heights = new Int16Array(W);
    const r = rng(2026);
    for (let x = 0; x < W; x++) heights[x] = BASE;
    // colline tra le zone (pendenza max 1 blocco)
    [[18, 24, 2, 'hill'], [44, 50, 2, 'hill'], [74, 80, 2, 'hill'], [150, 156, 2, 'hill'], [178, 200, 6, 'rise']].forEach(([a, b, peak, mode]) => {
      const n = b - a;
      for (let i = 0; i < n; i++) {
        const off = mode === 'rise'
          ? Math.round(peak * Math.pow((i + 1) / n, 1.6))
          : Math.round(peak * Math.sin(Math.PI * (i + 1) / (n + 1)));
        heights[a + i] = BASE - off;
      }
    });
    for (let x = 0; x < W; x++) {
      const h = heights[x];
      const dirtDepth = 3 + (r() < 0.4 ? 1 : 0);
      for (let y = h; y < H; y++) {
        let id = y === h ? B.GRASS : y < h + dirtDepth ? B.DIRT : B.STONE;
        if (id === B.STONE) {
          const v = r();
          if (v < 0.035) id = B.COAL_ORE;
          else if (v < 0.05) id = B.IRON_ORE;
          else if (y > H - 9 && v < 0.058) id = B.GOLD_ORE;
          else if (y > H - 6 && v < 0.066) id = B.DIAMOND_ORE;
        }
        if (y === H - 1 || (y === H - 2 && r() < 0.5)) id = B.BEDROCK;
        setF(x, y, id);
        if (y > h) setB(x, y, y < h + dirtDepth ? B.DIRT : B.STONE);
      }
    }

    torches = []; ents = []; pois = [];
    buildSpawn(); buildHouse(); buildWorkshop(); buildExperience(); buildStall(); buildEnd();
    [2, 15, 21, 47, 77, 152, 181, 188].forEach(x => tree(x, 4 + (r() * 2 | 0)));
    buildMine(r);

    // erba e fiori
    const busy = [[26, 41], [51, 73], [84, 92], [96, 102], [108, 114], [120, 126], [136, 142], [158, 172], [192, 198]];
    for (let x = 1; x < W - 1; x++) {
      if (busy.some(([a, b]) => x >= a && x <= b)) continue;
      const y = heights[x] - 1;
      if (getF(x, y) || bg[I(x, y)]) continue;
      const v = r();
      if (v < 0.22) setF(x, y, B.TALLGRASS);
      else if (v < 0.28) setF(x, y, B.POPPY);
      else if (v < 0.33) setF(x, y, B.DANDELION);
    }
    // sorgenti di luce (torce e pietra luminosa), usate di notte e nella caverna
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const id = fg[I(x, y)];
      if (id === B.TORCH) torches.push({ x: x + 0.5, y: y + 0.35, id, r: 4.5 });
      else if (id === B.GLOWSTONE) torches.push({ x: x + 0.5, y: y + 0.5, id, r: 6 });
    }
    cloudsW = [];
    for (let i = 0; i < 16; i++) cloudsW.push({ x: r() * W * 1.2, y: 4 + r() * 10, w: 4 + r() * 7, h: 1 + r() * 0.8 });
  }

  /* ---------- Easter egg: miniera abbandonata e caverna con laghetto ---------- */
  const CAVE = { a: 158, b: 198, shaft: 196, chest: 193, treasure: 165 };
  let caveTop = [], caveBot = [];
  function buildMine(r) {
    const { a, b } = CAVE;
    caveTop = []; caveBot = [];
    for (let x = a; x <= b; x++) {
      const taper = Math.min(1, (x - a) / 5, (b - x) / 3);
      const yc = 36.5 + 1.2 * Math.sin(x * 0.35);
      const hh = (2.1 + 1.2 * Math.sin(x * 0.21 + 0.5)) * taper + 0.7;
      let top = 99, bot = -1;
      for (let y = 33; y <= 41; y++) if (Math.abs(y + 0.5 - yc) <= hh) { setF(x, y, 0); top = Math.min(top, y); bot = Math.max(bot, y); }
      caveTop[x] = top; caveBot[x] = bot;
    }
    // camera sotto il pozzo
    for (let x = CAVE.shaft - 2; x <= CAVE.shaft + 1; x++) for (let y = 36; y <= 38; y++) setF(x, y, 0);
    for (let x = CAVE.shaft - 2; x <= CAVE.shaft + 1; x++) { caveTop[x] = Math.min(caveTop[x], 36); caveBot[x] = Math.max(caveBot[x], 38); }
    // laghetto
    for (let x = 169; x <= 178; x++) {
      for (let y = Math.min(caveTop[x], 37); y <= 41; y++) setF(x, y, 0);
      const surf = (x === 169 || x === 178) ? 40 : 39;
      for (let y = surf; y <= 41; y++) setF(x, y, B.WATER);
      caveTop[x] = Math.min(caveTop[x], 37); caveBot[x] = 41;
    }
    // pareti: muschio e minerali preziosi
    const ORES = [B.DIAMOND_ORE, B.EMERALD_ORE, B.GOLD_ORE, B.LAPIS_ORE, B.REDSTONE_ORE, B.IRON_ORE, B.COAL_ORE, B.COAL_ORE];
    for (let x = a - 1; x <= b + 1; x++) for (let y = 31; y <= 42; y++) {
      const id = getF(x, y);
      if (id !== B.STONE && id !== B.DIRT) continue;
      const nearAir = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const n = getF(x + dx, y + dy); return n === 0 || n === B.WATER; }) && y > 31;
      if (!nearAir || x < a - 1) continue;
      const v = r();
      if (v < 0.11) setF(x, y, ORES[r() * ORES.length | 0]);
      else if (v < 0.4) setF(x, y, B.MOSSY);
    }
    // pavimento: erba, felci e fiori vicino alla luce, funghi altrove
    for (let x = a; x <= b; x++) {
      if (caveBot[x] < 0 || (x >= 169 && x <= 178)) continue;
      const fy = caveBot[x] + 1, py = caveBot[x];
      if (!solid[getF(x, fy)]) continue;
      const garden = (x >= 160 && x <= 168) || (x >= 179 && x <= 187);
      const v = r();
      if (garden) {
        setF(x, fy, B.GRASS);
        if (v < 0.35) setF(x, py, B.TALLGRASS);
        else if (v < 0.6) setF(x, py, B.FERN);
        else if (v < 0.7) setF(x, py, B.POPPY);
      } else if (v < 0.2) setF(x, py, r() < 0.5 ? B.MUSHROOM_RED : B.MUSHROOM_BROWN);
    }
    // soffitto: pietra luminosa e liane
    [163, 173, 182, 190].forEach(x => { if (caveTop[x] < 99) setF(x, caveTop[x] - 1, B.GLOWSTONE); });
    for (let x = a + 2; x <= b - 2; x++) {
      if (caveTop[x] >= 99 || getF(x, caveTop[x] - 1) === B.GLOWSTONE || r() > 0.35) continue;
      const len = 1 + (r() * 3 | 0);
      for (let k = 0; k < len; k++) {
        const y = caveTop[x] + k;
        if (y >= caveBot[x] - 1 || getF(x, y) !== 0) break;
        setF(x, y, B.VINE);
      }
    }
    // ninfee sul laghetto
    [171, 174, 176].forEach(x => setF(x, 38, B.LILY));
    // puntelli della miniera
    [189, 193].forEach(x => { for (let y = caveTop[x]; y <= caveBot[x]; y++) setB(x, y, B.LOG); });
    for (let x = 189; x <= 193; x++) setB(x, caveTop[x], B.PLANKS);
    setF(186, caveBot[186], B.TORCH); setF(191, caveBot[191], B.TORCH); setF(160, caveBot[160], B.TORCH);
    // baule del tesoro
    const tx = CAVE.treasure;
    setF(tx, caveBot[tx], B.CHEST); setF(tx, caveBot[tx] - 1, 0);
    pois.push({ id: 'treasure', x: tx + 0.5, r: 1.6, gy: caveBot[tx] + 1, label: 'Apri il baule del tesoro', act: () => { WD.ui.treasure(); grant('treasure'); } });

    // pozzo d'ingresso: scale, con ragnatele che lasciano intravedere la caverna
    const sx = CAVE.shaft, h = heights[sx];
    for (let y = h; y <= 38; y++) { setF(sx, y, B.LADDER); setB(sx, y, B.MOSSY); }
    setF(sx, h + 3, B.WEB); setF(sx, h + 4, B.WEB);
    setF(sx - 1, h, B.PLANKS); setF(sx + 1, h, B.PLANKS);
    sign(sx + 1.5, ['Miniera', 'abbandonata', 'Vietato entrare', 'senza piccone!']);
    // baule del minatore con il piccone
    const cx = CAVE.chest;
    setF(cx, heights[cx] - 1, B.CHEST);
    pois.push({ id: 'minechest', x: cx + 0.5, r: 1.5, label: 'Apri il baule del minatore', act: () => WD.ui.mineChest() });
  }

  /* ---------- Scavo con il piccone ---------- */
  const HARD = {
    [B.GRASS]: 0.3, [B.DIRT]: 0.3, [B.STONE]: 0.45, [B.MOSSY]: 0.45, [B.GLOWSTONE]: 0.3, [B.WEB]: 0.35,
    [B.COAL_ORE]: 0.6, [B.IRON_ORE]: 0.6, [B.GOLD_ORE]: 0.6, [B.DIAMOND_ORE]: 0.6, [B.EMERALD_ORE]: 0.6,
    [B.LAPIS_ORE]: 0.6, [B.REDSTONE_ORE]: 0.6, [B.LOG_DECO]: 0.5, [B.LEAVES_DECO]: 0.12,
    [B.TALLGRASS]: 0.05, [B.POPPY]: 0.05, [B.DANDELION]: 0.05, [B.FERN]: 0.05, [B.VINE]: 0.05,
    [B.MUSHROOM_RED]: 0.05, [B.MUSHROOM_BROWN]: 0.05, [B.LILY]: 0.05
  };
  const PLANTS = { [B.TALLGRASS]: 1, [B.POPPY]: 1, [B.DANDELION]: 1, [B.FERN]: 1, [B.MUSHROOM_RED]: 1, [B.MUSHROOM_BROWN]: 1 };
  const ORE_MSG = {
    [B.DIAMOND_ORE]: '§b+1 Diamante', [B.EMERALD_ORE]: '§a+1 Smeraldo', [B.GOLD_ORE]: '§6+1 Oro grezzo',
    [B.IRON_ORE]: '§7+1 Ferro grezzo', [B.COAL_ORE]: '§8+1 Carbone', [B.LAPIS_ORE]: '§9+1 Lapislazzuli', [B.REDSTONE_ORE]: '§c+1 Redstone'
  };
  const mine = { down: false, sx: -1, sy: -1, tx: -1, ty: -1, prog: 0, lastHit: 0, active: false };
  function holdingPick() { return state.hasPick && WD.ui.heldUse() === 'mine'; }
  function pointerTile() {
    return [Math.floor((mine.sx + Math.round(cam.x * TS)) / TS), Math.floor((mine.sy + Math.round(cam.y * TS)) / TS)];
  }
  function canBreak(tx, ty) {
    const id = getF(tx, ty);
    if (!HARD[id]) return false;
    const dx = tx + 0.5 - (P.x + P.w / 2), dy = ty + 0.5 - (P.y + 0.4);
    return dx * dx + dy * dy <= 4.8 * 4.8;
  }
  function frags(tx, ty, id, n) {
    for (let i = 0; i < n; i++) particles.push({ k: 'frag', id, x: tx + 0.2 + Math.random() * 0.6, y: ty + 0.2 + Math.random() * 0.6, vx: (Math.random() - 0.5) * 4, vy: -2 - Math.random() * 3, life: 0.5 + Math.random() * 0.4, u: Math.random() * 0.75, v: Math.random() * 0.75 });
  }
  function breakBlock(tx, ty, id) {
    setF(tx, ty, 0);
    if (solid[id] && PLANTS[getF(tx, ty - 1)]) setF(tx, ty - 1, 0);
    frags(tx, ty, id, 10);
    WD.audio.play('brk');
    mine.prog = 0; mine.tx = -1;
    state.mined = (state.mined || 0) + 1;
    if (ORE_MSG[id]) {
      WD.ui.chat(ORE_MSG[id]);
      for (let i = 0; i < 3; i++) particles.push({ k: 'orb', x: tx + 0.5, y: ty + 0.5, vx: (Math.random() - 0.5) * 3, vy: -2, life: 4, delay: i * 0.1, f: Math.random() * 3 | 0, seed: Math.random() * 16 });
    }
    if (id === B.DIAMOND_ORE) grant('diamonds');
  }
  function updateMining(dt) {
    mine.active = false;
    if (!mine.down || !holdingPick() || state.paused || WD.ui.isBlocking()) { mine.prog = 0; mine.tx = -1; return; }
    const [tx, ty] = pointerTile();
    if (!canBreak(tx, ty)) { mine.prog = 0; mine.tx = -1; return; }
    if (tx !== mine.tx || ty !== mine.ty) { mine.tx = tx; mine.ty = ty; mine.prog = 0; }
    const id = getF(tx, ty);
    mine.active = true;
    mine.prog += dt / HARD[id];
    P.face = tx + 0.5 > P.x + P.w / 2 ? 1 : -1;
    if (state.t - mine.lastHit > 0.2) { mine.lastHit = state.t; WD.audio.play('dig'); frags(tx, ty, id, 2); }
    if (mine.prog >= 1) breakBlock(tx, ty, id);
  }
  // eventi del puntatore dal canvas (coordinate in pixel del canvas)
  function pointer(type, x, y) {
    if (type === 'up') { mine.down = false; return false; }
    mine.sx = x; mine.sy = y;
    if (type === 'down') {
      const [tx, ty] = pointerTile();
      if (holdingPick() && canBreak(tx, ty)) { mine.down = true; return true; }
    }
    return false;
  }
  function drawMiningUi(camPx, camPy) {
    if (!holdingPick() || mine.sx < 0) return;
    const [tx, ty] = pointerTile();
    if (!canBreak(tx, ty)) return;
    const g = ctx, x = tx * TS - camPx, y = ty * TS - camPy;
    const stages = WD.tex.entity.destroy;
    if (mine.active && mine.tx === tx && mine.ty === ty && stages.length) {
      const st = stages[Math.min(stages.length - 1, Math.floor(mine.prog * stages.length))];
      g.save(); g.globalAlpha = 0.85; g.drawImage(st, x, y, TS, TS); g.restore();
    }
    g.strokeStyle = 'rgba(0,0,0,0.65)'; g.lineWidth = Math.max(1, TS / 24);
    g.strokeRect(x + 0.5, y + 0.5, TS - 1, TS - 1);
  }
  // oggetto in mano (bussola, piccone, caffè) disegnato davanti al braccio
  function drawHeld(g, cx, fy, u, face, arm, icon) {
    const it = items[icon];
    if (!it) return;
    g.save(); g.translate(Math.round(cx), Math.round(fy)); if (face < 0) g.scale(-1, 1);
    g.translate(0, -24 * u); g.rotate(arm); g.translate(0, 11 * u);
    g.imageSmoothingEnabled = false;
    g.drawImage(it, -2 * u, -8 * u, 9 * u, 9 * u);
    g.restore();
  }

  function tree(x, th) {
    const h = heights[x];
    for (let k = 1; k <= th; k++) setF(x, h - k, B.LOG_DECO);
    const top = h - th;
    for (let dy = -2; dy <= 1; dy++) {
      const rad = dy <= -2 ? 1 : 2;
      for (let dx = -rad; dx <= rad; dx++) {
        if (dx === 0 && dy >= 0) continue;
        if (Math.abs(dx) === 2 && dy === 1) continue;
        if (!getF(x + dx, top + dy)) setF(x + dx, top + dy, B.LEAVES_DECO);
      }
    }
  }

  function sign(x, lines, poiOpts) {
    ents.push({ k: 'sign', x, lines });
    if (poiOpts !== false) pois.push(Object.assign({ id: 'sign' + x, x, r: 1.4, label: 'Leggi il cartello', act: () => WD.ui.sign(lines) }, poiOpts || {}));
  }

  function buildSpawn() {
    sign(11.5, ['Benvenuto su', 'WOLSKIDEV!', '← → / A D: cammina', 'Spazio: salta · F: usa'], { label: 'Leggi il cartello di benvenuto' });
    setF(5, BASE - 1, B.TORCH);
  }

  function buildHouse() {
    const x0 = 27, x1 = 39;
    for (let x = x0; x <= x1; x++) setF(x, BASE, B.PLANKS);
    for (let y = BASE - 5; y <= BASE - 1; y++) for (let x = x0; x <= x1; x++) setB(x, y, B.PLANKS);
    [x0, x1].forEach(x => { for (let y = BASE - 5; y <= BASE - 3; y++) setF(x, y, B.LOG); });
    [[x0 + 2, x0 + 3], [x1 - 3, x1 - 2]].forEach(([a, b]) => { for (let x = a; x <= b; x++) for (let y = BASE - 4; y <= BASE - 3; y++) setB(x, y, B.GLASS); });
    [x0 + 1, x1 - 1].forEach(x => { setB(x, BASE - 1, B.BOOKSHELF); setB(x, BASE - 2, B.BOOKSHELF); });
    for (let k = 0; k < 5; k++) {
      const a = x0 - 1 + 2 * k, b = x1 + 1 - 2 * k;
      if (a > b) break;
      for (let x = a; x <= b; x++) setF(x, BASE - 6 - k, k === 0 ? B.LOG : B.BRICK);
    }
    setF(x0 + 4, BASE - 3, B.TORCH); setF(x1 - 4, BASE - 3, B.TORCH);
    ents.push({ k: 'painting', x: 32, y: BASE - 5, w: 3, h: 2 });
    ents.push({ k: 'lectern', x: 33.5 });
    sign(25.5, ['Casa di', 'Daniele', 'Entra e leggi', 'il libro!']);
    pois.push({ id: 'lectern', x: 33.5, r: 2.4, label: 'Leggi il libro «Chi Sono»', act: () => { WD.ui.book(); grant('about'); }, adv: 'about', ay: BASE - 1.6 });
    pois.push({ id: 'painting', x: 31.2, r: 0.6, label: 'Guarda il quadro', act: () => { WD.ui.book(3); grant('about'); } });
  }

  function buildWorkshop() {
    const wa = 52, wb = 72;
    for (let x = wa; x <= wb; x++) setF(x, BASE, B.COBBLE);
    for (let y = BASE - 5; y <= BASE - 1; y++) for (let x = wa; x <= wb; x++) setB(x, y, B.COBBLE);
    [wa, 62, wb].forEach(x => { for (let y = BASE - 5; y <= BASE - 1; y++) setB(x, y, B.LOG); });
    for (let x = wa - 1; x <= wb + 1; x++) setF(x, BASE - 6, B.PLANKS);
    [wa, 62, wb].forEach(x => setF(x, BASE - 6, B.LOG));
    const fw = D.skills.framework.items, tl = D.skills.tools.items;
    fw.forEach((s, i) => ents.push({ k: 'frame', x: 54 + i, y: BASE - 4, item: 'sk_' + s.id }));
    tl.forEach((s, i) => ents.push({ k: 'frame', x: 54 + i, y: BASE - 3, item: 'sk_' + s.id }));
    setF(57, BASE - 1, B.CRAFTING);
    setF(55, BASE - 1, B.CHEST);
    setF(62, BASE - 3, B.TORCH); setF(53, BASE - 4, B.TORCH);
    [64, 65, 69, 70].forEach(x => { setB(x, BASE - 1, B.BOOKSHELF); setB(x, BASE - 2, B.BOOKSHELF); });
    setF(67, BASE - 1, B.ENCHANT);
    ents.push({ k: 'float', x: 67.5, y: BASE - 1.9, item: 'ench_book', glint: true });
    sign(50.5, ['Officina delle', 'Competenze', '← Banco da lavoro', 'Incantesimi →']);
    pois.push({ id: 'crafting', x: 57, r: 3, label: 'Apri il banco da lavoro: competenze tecniche', act: () => { WD.ui.inventory(); grant('skills'); }, adv: 'skills', ay: BASE - 1.5 });
    pois.push({ id: 'enchant', x: 67.5, r: 2.6, label: 'Usa il tavolo da incantesimi: soft skills', act: () => { WD.ui.enchant(); grant('soft'); }, adv: 'soft', ay: BASE - 2.8 });
  }

  function buildExperience() {
    sign(81.5, ['Percorso', 'Esperienza', 'Dal 2016', 'ad oggi →']);
    D.timeline.forEach((m, i) => {
      const x = MILESTONE_X[i];
      if (m.id === 'diploma') {
        for (let xx = x - 2; xx <= x + 2; xx++) for (let y = BASE - 4; y <= BASE - 1; y++) setB(xx, y, B.BRICK);
        setB(x - 1, BASE - 3, B.GLASS); setB(x + 1, BASE - 3, B.GLASS);
        setB(x, BASE - 1, B.PLANKS); setB(x, BASE - 2, B.PLANKS);
        for (let xx = x - 3; xx <= x + 3; xx++) setF(xx, BASE - 5, B.COBBLE);
        ents.push({ k: 'float', x: x + 0.5, y: BASE - 6.3, item: m.icon });
      } else if (m.id === 'pcto') {
        setB(x, BASE - 1, B.PLANKS); setB(x, BASE - 2, B.PLANKS);
        ents.push({ k: 'float', x: x + 0.5, y: BASE - 3.2, item: m.icon });
      } else if (m.id === 'microsoft') {
        for (let xx = x - 1; xx <= x + 1; xx++) { setB(xx, BASE - 1, B.BOOKSHELF); setB(xx, BASE - 2, B.BOOKSHELF); }
        ents.push({ k: 'float', x: x + 0.5, y: BASE - 3.2, item: m.icon, glint: true });
      } else if (m.id === 'sincrono') {
        // lavoro concluso: piedistallo d'oro con il piccone
        for (let xx = x - 1; xx <= x + 1; xx++) setF(xx, BASE - 1, B.GOLD_BLOCK);
        ents.push({ k: 'float', x: x + 0.5, y: BASE - 2.2, item: m.icon });
      } else {
        // lavoro attuale: il faro con il fascio di luce
        for (let xx = x - 1; xx <= x + 1; xx++) setF(xx, BASE - 1, B.DIAMOND_BLOCK);
        setF(x, BASE - 2, B.BEACON);
        ents.push({ k: 'beam', x: x + 0.5, y: BASE - 2 });
      }
      sign(x - 2.5, [m.title, m.company, m.date], false);
      pois.push({ id: 'm_' + m.id, x: x + 0.5, r: 3.2, label: `Scopri: ${m.title}`, act: () => WD.ui.milestone(m), auto: 'm_' + m.id, adv: 'm_' + m.id, ay: { diploma: BASE - 7.3, pcto: BASE - 4.1, microsoft: BASE - 4.1, sincrono: BASE - 3.1, laser: BASE - 2.7 }[m.id] });
    });
  }

  function buildStall() {
    [161, 169].forEach(x => { for (let y = BASE - 4; y <= BASE - 1; y++) setB(x, y, B.LOG); });
    for (let x = 160; x <= 170; x++) setF(x, BASE - 5, x % 2 ? B.WOOL_RED : B.WOOL_WHITE);
    for (let x = 162; x <= 168; x++) setB(x, BASE - 1, B.PLANKS);
    setB(163, BASE - 2, B.CHEST); setB(167, BASE - 2, B.EMERALD_BLOCK);
    setF(159, BASE - 1, B.TORCH); setF(171, BASE - 1, B.TORCH);
    ents.push({ k: 'npc', x: 165.5, name: D.nick });
    sign(157.5, ['Bancarella di', 'Daniele', 'Uno smeraldo', 'per un contatto!']);
    pois.push({ id: 'npc', x: 165.5, r: 2.4, label: 'Fai uno scambio con Daniele', act: () => { WD.ui.trade(); grant('contact'); }, adv: 'contact', ay: BASE - 2.9 });
  }

  function buildEnd() {
    sign(190.5, ['Confini del mondo', '...per ora!', 'Grazie della visita', '♥'], { adv: 'end', auto: 'end' });
    const p = pois[pois.length - 1];
    p.act = () => { WD.ui.sign(['Confini del mondo', '...per ora!', 'Grazie della visita', '♥']); grant('end'); };
  }

  /* ---------- Progressi ---------- */
  const ADV = {
    join: { name: 'Benvenuto nel server!', desc: 'Entra nel mondo di WolskiDev', icon: 'compass' },
    about: { name: 'Piacere, Daniele!', desc: 'Leggi il libro «Chi Sono»', icon: 'book' },
    skills: { name: 'Cassetta degli attrezzi', desc: 'Apri il banco delle competenze', icon: 'crafting' },
    soft: { name: 'Incantato di conoscerti', desc: 'Scopri le soft skills', icon: 'ench_book' },
    m_diploma: { name: 'Diplomato!', desc: 'Perito Informatico (2016 - 2021)', icon: 'book' },
    m_pcto: { name: 'Il primo seme', desc: 'Corso Sincrono PCTO (2018)', icon: 'sapling' },
    m_microsoft: { name: 'Full-Stack in 3 mesi', desc: 'Corso Microsoft Full-Stack (2021)', icon: 'ench_book' },
    m_sincrono: { name: 'Assunto!', desc: 'Front-End Web Developer in Gruppo Sincrono (2022 - 2026)', icon: 'pickaxe' },
    m_laser: { name: 'Nuova avventura', desc: 'Frontend Web Developer in Laser Romae (2026 - oggi)', icon: 'diamond' },
    contact: { name: 'Affare fatto!', desc: 'Commercia con Daniele', icon: 'emerald' },
    end: { name: 'Esploratore', desc: 'Raggiungi i confini del mondo', icon: 'compass' },
    cat: { name: 'Miao!', desc: "Accarezza l'ocelot dello spawn", icon: 'heart' },
    coffee: { name: 'Pausa caffè', desc: 'Bevi una tazza di caffè', icon: 'coffee' },
    chat: { name: 'Chiacchierone', desc: 'Scrivi qualcosa in chat', icon: 'book' },
    pickaxe: { name: 'Ora sì che si ragiona', desc: 'Trova il piccone nascosto', icon: 'pickaxe', hidden: true },
    cave: { name: 'Speleologo', desc: 'Scopri la caverna segreta', icon: 'glowstone', hidden: true },
    diamonds: { name: 'Diamanti!', desc: 'Scava un minerale di diamante', icon: 'diamond', hidden: true },
    treasure: { name: 'Tesoro nascosto', desc: 'Apri il baule nella caverna', icon: 'chest', hidden: true }
  };
  function grant(id) {
    if (state.adv[id] || !ADV[id]) return;
    state.adv[id] = true;
    WD.ui.toast(ADV[id]);
    WD.ui.chat(`§fOspite ha ottenuto il progresso §a[${ADV[id].name}]`);
    if (id.startsWith('m_')) {
      for (let i = 0; i < 7; i++) particles.push({ k: 'orb', x: P.x + (Math.random() - 0.2) * 4, y: P.y - 1 - Math.random() * 2, vx: 0, vy: 0, life: 4, delay: i * 0.12, f: 2 + (Math.random() * 5 | 0), seed: Math.random() * 16 });
    }
    updateXP();
  }
  function updateXP() {
    const lvl = MILESTONE_X.filter((_, i) => state.adv['m_' + D.timeline[i].id]).length;
    const got = Object.keys(state.adv).length, total = Object.keys(ADV).length;
    WD.ui.xp(lvl, got / total);
    if (lvl === MILESTONE_X.length && !state.lvlMax) {
      state.lvlMax = true;
      WD.audio.play('levelup');
      WD.ui.title(`Livello ${lvl}!`, 'Percorso completato');
    }
  }

  /* ---------- Fisica ---------- */
  function moveX(dx) {
    P.x += dx;
    const y0 = Math.floor(P.y), y1 = Math.floor(P.y + P.h - 1e-6);
    if (dx > 0) {
      const tx = Math.floor(P.x + P.w);
      for (let y = y0; y <= y1; y++) if (solidAt(tx, y)) { P.x = tx - P.w - 1e-4; P.vx = 0; return true; }
    } else if (dx < 0) {
      const tx = Math.floor(P.x);
      for (let y = y0; y <= y1; y++) if (solidAt(tx, y)) { P.x = tx + 1 + 1e-4; P.vx = 0; return true; }
    }
    return false;
  }
  function moveY(dy) {
    P.y += dy;
    P.onGround = false;
    const x0 = Math.floor(P.x), x1 = Math.floor(P.x + P.w - 1e-6);
    if (dy > 0) {
      const ty = Math.floor(P.y + P.h);
      for (let x = x0; x <= x1; x++) if (solidAt(x, ty)) { P.y = ty - P.h; P.vy = 0; P.onGround = true; return; }
    } else if (dy < 0) {
      const ty = Math.floor(P.y);
      for (let x = x0; x <= x1; x++) if (solidAt(x, ty)) { P.y = ty + 1 + 1e-4; P.vy = 0; return; }
    }
  }

  function update(dt) {
    state.t += dt;
    const blocked = state.paused || WD.ui.isBlocking();
    const dir = blocked ? 0 : (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const speed = input.sprint ? 5.8 : 4.3;
    P.vx += (dir * speed - P.vx) * Math.min(1, dt * (P.onGround || P.fly ? 14 : 6));
    if (dir) P.face = dir;

    if (P.fly) {
      const v = blocked ? 0 : ((input.down ? 1 : 0) - (input.jump ? 1 : 0)) * 6;
      P.vy += (v - P.vy) * Math.min(1, dt * 10);
    } else if (onLadder()) {
      // sulle scale: su con salto, giù con S/freccia giù, altrimenti si scende piano
      P.vy = blocked ? 0 : input.jump ? -3.6 : input.down ? 4 : 1.2;
    } else if (inWater()) {
      if (!blocked && input.jump) P.vy = Math.max(-3.5, P.vy - 30 * dt);
      P.vy = Math.min(2.2, P.vy + G * 0.22 * dt);
      if (!state.wet) { state.wet = true; WD.audio.play('splash'); }
    } else {
      state.wet = false;
      if (!blocked && input.jump && P.onGround) { P.vy = -JUMP; P.onGround = false; }
      if (WD.opts.autojump && P.onGround && dir !== 0) {
        const ahead = dir > 0 ? P.x + P.w + 0.12 : P.x - 0.12;
        const footY = Math.floor(P.y + P.h - 0.01), tx = Math.floor(ahead);
        if (solidAt(tx, footY) && !solidAt(tx, footY - 1) && !solidAt(tx, footY - 2)) { P.vy = -JUMP; P.onGround = false; }
      }
      P.vy = Math.min(30, P.vy + G * dt);
    }
    const ox = P.x;
    // uscire dall'acqua: spinta verso l'alto quando si sbatte contro la riva
    if (moveX(P.vx * dt) && dir !== 0 && inWater()) P.vy = -6;
    moveY(P.vy * dt);
    if (P.fly && P.onGround) P.fly = false;

    const moved = Math.abs(P.x - ox);
    if (P.onGround && moved > 0.001) {
      P.walk += moved * 2.4;
      state.walked += moved;
      if (state.t - state.lastStep > 0.36 && Math.abs(P.vx) > 1) { state.lastStep = state.t; WD.audio.play('step'); }
      if (state.walked > 45) {
        state.walked = 0;
        if (state.coffee > 0) { state.coffee--; WD.ui.coffee(state.coffee); }
        if (state.coffee === 2) WD.ui.chat('§7Il tuo livello di caffè è basso... premi §e6§7 per berne uno!');
      }
    } else {
      const target = Math.round(P.walk / Math.PI) * Math.PI;
      P.walk += (target - P.walk) * Math.min(1, dt * 10);
    }

    // camera
    const tx = P.x + P.w / 2 - viewW / 2;
    const ty = P.y + P.h / 2 - viewH * 0.58;
    cam.x += (tx - cam.x) * Math.min(1, dt * 7);
    cam.y += (ty - cam.y) * Math.min(1, dt * 7);
    cam.x = Math.max(0, Math.min(W - viewW, cam.x));
    cam.y = Math.min(H - viewH, cam.y);

    // zona attuale
    const cx = P.x + P.w / 2;
    const under = (P.y + P.h) - heights[Math.max(0, Math.min(W - 1, Math.floor(cx)))];
    const z = ZONES.find(z => cx >= z.a && cx < z.b);
    if (z && z !== state.zone && under < 2) { state.zone = z; WD.ui.title(z.title, z.sub); }
    if (under > 4 && cx > CAVE.a && cx < CAVE.b && P.y > 32 && !state.caveShown) {
      state.caveShown = true;
      WD.ui.title('Caverna segreta', 'Un laghetto nascosto sotto il mondo...');
      grant('cave');
    }

    // punto di interesse più vicino
    let best = null, bd = 1e9;
    pois.forEach(p => {
      const d = Math.abs(cx - p.x);
      const gy = p.gy !== undefined ? p.gy : heights[Math.floor(p.x)];
      if (d <= p.r && d < bd && Math.abs((P.y + P.h) - gy) < 3) { best = p; bd = d; }
    });
    const cd = Math.abs(cx - (cat.x + 0.65));
    if (cd < 1.3 && cd < bd) best = catPoi;
    if (best && best.auto && !state.adv[best.auto]) grant(best.auto);
    if (best !== state.poi) { state.poi = best; WD.ui.prompt(best ? best.label : null); }

    updateMining(dt);
    updateCat(dt);
    updateNpc(dt);
    updateParticles(dt);
  }

  function tileAtPt(x, y) { return getF(Math.floor(x), Math.floor(y)); }
  function onLadder() { const x = P.x + P.w / 2; return [P.y + 0.2, P.y + P.h * 0.5, P.y + P.h - 0.1].some(y => tileAtPt(x, y) === B.LADDER); }
  function inWater() { const x = P.x + P.w / 2; return tileAtPt(x, P.y + P.h * 0.6) === B.WATER || tileAtPt(x, P.y + P.h - 0.1) === B.WATER; }

  const catPoi = { id: 'cat', label: "Accarezza l'ocelot", act: () => {
    WD.audio.play('meow');
    for (let i = 0; i < 4; i++) particles.push({ k: 'heart', x: cat.x + 0.65 + (Math.random() - 0.5), y: BASE - 1, vy: -1 - Math.random(), life: 1.4 });
    const lines = ["L'ocelot fa le fusa. Prrrr...", "L'ocelot approva il tuo codice.", "L'ocelot si è seduto sulla tastiera: \"asdfghjkl\"", 'Miao! (traduzione: "assumilo")'];
    WD.ui.chat('§7' + lines[Math.random() * lines.length | 0]);
    grant('cat');
  } };

  function updateCat(dt) {
    cat.timer -= dt;
    if (cat.timer <= 0) {
      const v = Math.random();
      cat.vx = v < 0.4 ? 0 : (v < 0.7 ? -1 : 1) * (0.8 + Math.random() * 0.6);
      cat.timer = 1.5 + Math.random() * 3;
    }
    cat.x += cat.vx * dt;
    if (cat.x < 3) { cat.x = 3; cat.vx = Math.abs(cat.vx); }
    if (cat.x > 16) { cat.x = 16; cat.vx = -Math.abs(cat.vx); }
    if (cat.vx) { cat.face = cat.vx > 0 ? 1 : -1; cat.walk += dt * 10; }
  }

  function updateParticles(dt) {
    particles = particles.filter(p => {
      if (p.delay > 0) { p.delay -= dt; return true; }
      p.life -= dt;
      if (p.k === 'orb') {
        const dx = (P.x + P.w / 2) - p.x, dy = (P.y + 1) - p.y, d = Math.hypot(dx, dy);
        if (d < 0.4) { WD.audio.play('pop'); return false; }
        p.vx += dx / d * dt * 30; p.vy += dy / d * dt * 30;
        p.vx *= 0.9; p.vy *= 0.9;
        p.x += p.vx * dt; p.y += p.vy * dt;
      } else if (p.k === 'heart' || p.k === 'note') {
        p.y += p.vy * dt;
      } else if (p.k === 'tp') {
        p.x += p.vx * dt; p.y += p.vy * dt;
      } else if (p.k === 'frag') {
        p.vy += 25 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      }
      return p.life > 0;
    });
  }

  /* ---------- Rendering ---------- */
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(cv.clientWidth * dpr);
    cv.height = Math.round(cv.clientHeight * dpr);
    TS = Math.max(12, Math.round(Math.min(cv.height / 16, cv.width / 13)));
    viewW = cv.width / TS; viewH = cv.height / TS;
    ctx.imageSmoothingEnabled = false;
  }

  function render() {
    const g = ctx, cw = cv.width, ch = cv.height;
    g.imageSmoothingEnabled = false;
    const night = state.night;
    const sky = g.createLinearGradient(0, 0, 0, ch);
    if (night) { sky.addColorStop(0, '#05081c'); sky.addColorStop(1, '#18204a'); }
    else { sky.addColorStop(0, '#6b9cf5'); sky.addColorStop(1, '#c4dbff'); }
    g.fillStyle = sky; g.fillRect(0, 0, cw, ch);

    if (night) {
      g.fillStyle = '#fff';
      for (let i = 0; i < 90; i++) {
        const sx = ((i * 9301 + 49297) % 233280) / 233280 * cw, sy = ((i * 4021 + 7919) % 1000) / 1000 * ch * 0.6;
        if ((i + Math.floor(state.t * 2)) % 17) g.fillRect(sx, sy, 2, 2);
      }
    }
    // sole / luna
    const sz = TS * 1.6;
    const SUN = WD.tex.entity.sun, MOON = WD.tex.entity.moon;
    if (night ? MOON : SUN) {
      // la texture ha lo sfondo nero: in modalità "lighter" il nero sparisce e resta il bagliore
      const big = TS * 6, sx = cw * 0.78 - cam.x * TS * 0.03 + sz / 2 - big / 2, sy = ch * 0.08 + sz / 2 - big / 2;
      g.save(); g.globalCompositeOperation = 'lighter';
      if (night) g.drawImage(MOON, 0, 0, MOON.width / 4, MOON.height / 2, sx, sy, big, big);
      else g.drawImage(SUN, sx, sy, big, big);
      g.restore();
    } else {
      g.fillStyle = night ? '#e8e8f0' : '#fff6a8';
      g.fillRect(cw * 0.78 - cam.x * TS * 0.03, ch * 0.08, sz, sz);
      if (!night) { g.fillStyle = 'rgba(255,246,168,0.25)'; g.fillRect(cw * 0.78 - cam.x * TS * 0.03 - sz * 0.25, ch * 0.08 - sz * 0.25, sz * 1.5, sz * 1.5); }
    }

    // nuvole (parallasse)
    if (WD.opts.clouds) {
      g.fillStyle = night ? 'rgba(200,200,230,0.18)' : 'rgba(255,255,255,0.85)';
      cloudsW.forEach(c => {
        const span = W * 1.2;
        const x = (((c.x + state.t * 0.25) - cam.x * 0.5) % span + span) % span - 10;
        g.fillRect(Math.round(x * TS), Math.round((c.y - cam.y * 0.3) * TS), Math.round(c.w * TS), Math.round(c.h * TS));
      });
    }

    const camPx = Math.round(cam.x * TS), camPy = Math.round(cam.y * TS);
    const x0 = Math.max(0, Math.floor(cam.x)), x1 = Math.min(W - 1, Math.ceil(cam.x + viewW));
    const y0 = Math.max(0, Math.floor(cam.y)), y1 = Math.min(H - 1, Math.ceil(cam.y + viewH));

    // sfondo
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const id = bg[I(x, y)];
      // lo sfondo resta visibile dietro ai blocchi con parti trasparenti (vetro, tavolo da incantesimi, faro)
      if (id && !(solid[fg[I(x, y)]] && !SEE_THROUGH[fg[I(x, y)]])) g.drawImage(texDark[id], x * TS - camPx, y * TS - camPy, TS, TS);
    }
    // entità appese al muro
    ents.forEach(e => { if (e.k === 'painting' || e.k === 'frame' || e.k === 'beam') drawEnt(e, camPx, camPy); });
    // primo piano
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const id = fg[I(x, y)];
      if (id && id !== B.WATER && id !== B.LILY) g.drawImage(tex[id], x * TS - camPx, y * TS - camPy, TS, TS);
    }
    ents.forEach(e => { if (!(e.k === 'painting' || e.k === 'frame' || e.k === 'beam')) drawEnt(e, camPx, camPy); });

    if (WD.tex.entity.ocelot) drawOcelot(camPx, camPy); else drawCat(camPx, camPy);
    // giocatore
    const u = TS * 1.8 / 32;
    const swing = Math.sin(P.walk) * 0.7;
    const px = (P.x + P.w / 2) * TS - camPx, py = (P.y + P.h) * TS - camPy, sw = P.onGround ? swing : 0.35;
    const held = WD.ui.heldIcon();
    const arm = mine.active ? -1.5 + 0.8 * Math.sin(state.t * 24) : held ? -0.35 - sw * 0.4 : -sw;
    if (WD.opts.steve && steve.ok) drawSideSkin(g, px, py, u, steve, P.face, sw, arm);
    else drawSide(g, px, py, u, PLAYER, P.face, sw, arm);
    if (held) drawHeld(g, px, py, u, P.face, arm, held);

    // acqua e ninfee sopra al giocatore (effetto immersione)
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const id = fg[I(x, y)];
      if (id === B.WATER) g.drawImage(tex[id], x * TS - camPx, y * TS - camPy, TS, TS);
      else if (id === B.LILY) g.drawImage(tex[id], x * TS - camPx, y * TS - camPy + TS * 0.86, TS, TS * 0.14);
    }
    drawMiningUi(camPx, camPy);

    // indicatori sopra i punti non ancora visitati
    pois.forEach(p => {
      if (!p.adv || state.adv[p.adv]) return;
      const bob = Math.sin(state.t * 4) * TS * 0.1;
      const ay = p.ay !== undefined ? p.ay : heights[Math.floor(p.x)] - 1.6;
      drawArrow(g, p.x * TS - camPx, ay * TS - camPy + bob, TS * 0.32);
    });

    drawParticles(camPx, camPy);

    // buio: di notte e sottoterra (più si scende, più è scuro)
    const under = (P.y + 0.9) - heights[Math.max(0, Math.min(W - 1, Math.floor(P.x + P.w / 2)))];
    const caveDark = Math.max(0, Math.min(1, (under - 1.5) / 4)) * 0.85;
    const darkA = Math.max(night ? 0.62 : 0, caveDark);
    if (darkA > 0.02 && !night) drawDarkness(camPx, camPy, darkA);
    if (night) {
      drawDarkness(camPx, camPy, darkA);
      // il raggio del faro resta luminoso anche di notte
      ents.forEach(e => { if (e.k === 'beam') drawEnt(e, camPx, camPy); });
    }
  }

  function drawArrow(g, x, y, s) {
    g.fillStyle = '#000';
    g.fillRect(x - s * 0.55, y - s * 1.05, s * 1.1, s * 0.75);
    g.beginPath(); g.moveTo(x - s * 0.9, y - s * 0.4); g.lineTo(x + s * 0.9, y - s * 0.4); g.lineTo(x, y + s * 0.55); g.fill();
    g.fillStyle = '#ffd84a';
    g.fillRect(x - s * 0.35, y - s * 0.9, s * 0.7, s * 0.6);
    g.beginPath(); g.moveTo(x - s * 0.6, y - s * 0.32); g.lineTo(x + s * 0.6, y - s * 0.32); g.lineTo(x, y + s * 0.3); g.fill();
  }

  let darkCv = null;
  function drawDarkness(camPx, camPy, alpha) {
    if (!darkCv) darkCv = document.createElement('canvas');
    if (darkCv.width !== cv.width || darkCv.height !== cv.height) { darkCv.width = cv.width; darkCv.height = cv.height; }
    const d = darkCv.getContext('2d');
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, darkCv.width, darkCv.height);
    d.fillStyle = `rgba(4,6,24,${alpha})`; d.fillRect(0, 0, darkCv.width, darkCv.height);
    d.globalCompositeOperation = 'destination-out';
    // solo le luci ancora presenti (la pietra luminosa si può rompere)
    const lights = torches.filter(t => getF(Math.floor(t.x), Math.floor(t.y)) === t.id).map(t => [t.x, t.y, t.r]);
    lights.push([P.x + P.w / 2, P.y + 0.9, 2.6]);
    ents.forEach(e => { if (e.k === 'beam') lights.push([e.x, e.y, 6]); });
    lights.forEach(([lx, ly, r]) => {
      const sx = lx * TS - camPx, sy = ly * TS - camPy, rr = r * TS;
      if (sx < -rr || sx > cv.width + rr || sy < -rr || sy > cv.height + rr) return;
      const gr = d.createRadialGradient(sx, sy, 0, sx, sy, rr);
      gr.addColorStop(0, 'rgba(0,0,0,0.95)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = gr; d.fillRect(sx - rr, sy - rr, rr * 2, rr * 2);
    });
    ctx.drawImage(darkCv, 0, 0);
  }

  function drawEnt(e, camPx, camPy) {
    const g = ctx;
    if (e.k === 'sign') {
      const gy = heights[Math.floor(e.x)] * TS - camPy, cx = e.x * TS - camPx;
      if (WD.tex.entity.sign) { drawSign(e, cx, gy); return; }
      g.fillStyle = '#4a3218'; g.fillRect(cx - TS * 0.07, gy - TS * 0.62, TS * 0.14, TS * 0.62);
      g.fillStyle = '#3b2611'; g.fillRect(cx - TS * 0.5, gy - TS * 1.22, TS * 1.0, TS * 0.62);
      g.fillStyle = '#b8945f'; g.fillRect(cx - TS * 0.46, gy - TS * 1.18, TS * 0.92, TS * 0.54);
      g.fillStyle = '#3b2a16';
      [0.3, 0.45, 0.6].forEach((yy, i) => g.fillRect(cx - TS * (0.32 - i * 0.04), gy - TS * 1.18 + TS * yy * 0.8, TS * (0.64 - i * 0.08), Math.max(1, TS * 0.05)));
    } else if (e.k === 'frame') {
      const x = e.x * TS - camPx, y = e.y * TS - camPy, b = TS / 16;
      g.fillStyle = '#5e4424'; g.fillRect(x + b, y + b, TS - 2 * b, TS - 2 * b);
      g.fillStyle = '#8f6d47'; g.fillRect(x + 3 * b, y + 3 * b, TS - 6 * b, TS - 6 * b);
      g.drawImage(items[e.item], x + 2 * b, y + 2 * b, TS - 4 * b, TS - 4 * b);
    } else if (e.k === 'painting') {
      const x = e.x * TS - camPx, y = e.y * TS - camPy, w = e.w * TS, h = e.h * TS, b = TS * 0.1;
      g.fillStyle = '#4a2f12'; g.fillRect(x, y, w, h);
      g.fillStyle = '#8a5a2b'; g.fillRect(x + b * 0.5, y + b * 0.5, w - b, h - b);
      if (paintingCanvas) g.drawImage(paintingCanvas, x + b, y + b, w - 2 * b, h - 2 * b);
      else { g.fillStyle = '#222'; g.fillRect(x + b, y + b, w - 2 * b, h - 2 * b); }
    } else if (e.k === 'lectern') {
      const gy = heights[Math.floor(e.x)] * TS - camPy, cx = e.x * TS - camPx;
      g.fillStyle = '#6e5530'; g.fillRect(cx - TS * 0.4, gy - TS * 0.12, TS * 0.8, TS * 0.12);
      g.fillStyle = '#8a6a3c'; g.fillRect(cx - TS * 0.14, gy - TS * 0.8, TS * 0.28, TS * 0.7);
      g.save(); g.translate(cx, gy - TS * 0.86); g.rotate(-0.25);
      g.fillStyle = '#a4834f'; g.fillRect(-TS * 0.45, -TS * 0.08, TS * 0.9, TS * 0.16);
      g.fillStyle = '#f2efe4'; g.fillRect(-TS * 0.36, -TS * 0.2, TS * 0.34, TS * 0.12); g.fillRect(TS * 0.02, -TS * 0.2, TS * 0.34, TS * 0.12);
      g.fillStyle = '#7a4a24'; g.fillRect(-TS * 0.02, -TS * 0.22, TS * 0.04, TS * 0.16);
      g.restore();
    } else if (e.k === 'float') {
      const bob = Math.sin(state.t * 2 + e.x) * TS * 0.12;
      const sx = Math.max(0.15, Math.abs(Math.cos(state.t * 1.4 + e.x)));
      const s = TS * 0.7;
      g.save(); g.translate(e.x * TS - camPx, e.y * TS - camPy + bob); g.scale(sx, 1);
      g.drawImage(items[e.item], -s / 2, -s / 2, s, s);
      if (e.glint) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.25 + 0.2 * Math.sin(state.t * 3); g.fillStyle = '#a060ff'; g.fillRect(-s / 2, -s / 2, s, s); }
      g.restore();
    } else if (e.k === 'beam' && WD.tex.entity.beam) {
      // raggio del faro: texture che scorre verso l'alto, nucleo pieno e alone esterno trasparente
      const BM = WD.tex.entity.beam;
      const x = e.x * TS - camPx, y = e.y * TS - camPy;
      const off = (state.t * TS * 1.2) % TS;
      g.save();
      g.beginPath(); g.rect(x - TS * 0.3, 0, TS * 0.6, y); g.clip();
      g.imageSmoothingEnabled = false;
      [[0.25, 0.5], [1, 0.4]].forEach(([alpha, w]) => {
        g.globalAlpha = alpha;
        for (let yy = y + off; yy > -TS; yy -= TS) g.drawImage(BM, x - TS * w / 2, yy - TS, TS * w, TS);
      });
      g.restore();
    } else if (e.k === 'beam') {
      const x = e.x * TS - camPx, y = e.y * TS - camPy;
      const a = 0.35 + 0.1 * Math.sin(state.t * 3);
      g.fillStyle = `rgba(150,235,255,${a})`; g.fillRect(x - TS * 0.18, 0, TS * 0.36, y);
      g.fillStyle = `rgba(255,255,255,${a + 0.2})`; g.fillRect(x - TS * 0.07, 0, TS * 0.14, y);
    } else if (e.k === 'npc') {
      const gy = heights[Math.floor(e.x)] * TS - camPy, cx = e.x * TS - camPx;
      const u = TS * 1.8 / 32;
      if (skin.ok) drawSkin(ctx, cx, gy, u, state.t, npc.back);
      else drawFront(ctx, cx, gy, u, DANIELE, faces.daniele, state.t);
      nameTag(e.name, cx, gy - 34 * u);
    }
  }

  function nameTag(text, cx, y) {
    const g = ctx;
    const fs = Math.max(12, Math.round(TS * 0.42));
    g.font = `${fs}px VT323, monospace`;
    const w = g.measureText(text).width + fs * 0.5;
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(cx - w / 2, y - fs, w, fs * 1.05);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillText(text, cx, y - fs * 0.15);
  }

  const PLAYER = { skin: '#c58c69', hair: '#3b2a1a', shirt: '#3c8527', shirtD: '#2c6a1c', pants: '#2e3a5c', pantsD: '#222c47', shoes: '#2a2a2a', eye: '#3b5dc9' };
  const DANIELE = { skin: '#e0ac85', hair: '#8a6a45', shirt: '#26283b', shirtD: '#1b1c2b', pants: '#3a3a3a', pantsD: '#2a2a2a', shoes: '#151515', eye: '#4b6ea8' };

  function limb(g, x, y, w, h, ang, c, endC, endL) {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.fillStyle = c; g.fillRect(-w / 2, 0, w, h);
    if (endC) { g.fillStyle = endC; g.fillRect(-w / 2, h - endL, w, endL); }
    g.restore();
  }
  function drawSide(g, cx, fy, u, c, face, swing, arm) {
    if (arm === undefined) arm = -swing;
    g.save(); g.translate(Math.round(cx), Math.round(fy)); if (face < 0) g.scale(-1, 1);
    limb(g, 0, -12 * u, 4 * u, 12 * u, -swing, c.pantsD, c.shoes, 2 * u);
    limb(g, 0, -24 * u, 4 * u, 12 * u, swing, c.shirtD, c.skin, 2 * u);
    g.fillStyle = c.shirt; g.fillRect(-2 * u, -24 * u, 4 * u, 12 * u);
    limb(g, 0, -12 * u, 4 * u, 12 * u, swing, c.pants, c.shoes, 2 * u);
    // testa
    g.fillStyle = c.skin; g.fillRect(-4 * u, -32 * u, 8 * u, 8 * u);
    g.fillStyle = c.hair; g.fillRect(-4 * u, -32 * u, 8 * u, 2 * u); g.fillRect(-4 * u, -30 * u, 3 * u, 4 * u);
    g.fillStyle = '#fff'; g.fillRect(2 * u, -28 * u, u, u);
    g.fillStyle = c.eye; g.fillRect(3 * u, -28 * u, u, u);
    limb(g, 0, -24 * u, 4 * u, 12 * u, arm, c.shirt, c.skin, 2 * u);
    g.restore();
  }
  function drawFront(g, cx, fy, u, c, faceCv, t) {
    cx = Math.round(cx); fy = Math.round(fy);
    const sway = Math.sin(t * 1.5) * 0.06;
    g.fillStyle = c.pants; g.fillRect(cx - 4 * u, fy - 12 * u, 4 * u, 12 * u);
    g.fillStyle = c.pantsD; g.fillRect(cx, fy - 12 * u, 4 * u, 12 * u);
    g.fillStyle = c.shoes; g.fillRect(cx - 4 * u, fy - 2 * u, 8 * u, 2 * u);
    g.fillStyle = c.shirt; g.fillRect(cx - 4 * u, fy - 24 * u, 8 * u, 12 * u);
    // logo </> sulla felpa
    g.fillStyle = '#7fd1ff'; g.fillRect(cx - 2 * u, fy - 20 * u, u, u); g.fillRect(cx - 3 * u, fy - 19 * u, u, u); g.fillRect(cx - 2 * u, fy - 18 * u, u, u);
    g.fillRect(cx + 1 * u, fy - 20 * u, u, u); g.fillRect(cx + 2 * u, fy - 19 * u, u, u); g.fillRect(cx + 1 * u, fy - 18 * u, u, u);
    limb(g, cx - 6 * u, fy - 24 * u, 4 * u, 12 * u, sway, c.shirtD, c.skin, 3 * u);
    limb(g, cx + 6 * u, fy - 24 * u, 4 * u, 12 * u, -sway, c.shirtD, c.skin, 3 * u);
    g.imageSmoothingEnabled = false;
    g.drawImage(faceCv, cx - 4 * u, fy - 32 * u, 8 * u, 8 * u);
  }

  /* ---------- Skin Minecraft (layout classico 64x64, anche in alta risoluzione) ---------- */
  const skin = { img: null, cape: null, ok: false, k: 1 };   // Woldanki (NPC Daniele)
  const steve = { img: null, ok: false, k: 1 };              // Steve di Faithful (giocatore ospite)
  const npc = { back: false, timer: 4 };
  // [x, y] di base e strato esterno per ogni parte, vista frontale e posteriore
  const SKIN_UV = {
    front: {
      head: [[8, 8], [40, 8]], body: [[20, 20], [20, 36]],
      armL: [[44, 20], [44, 36]], armR: [[36, 52], [52, 52]],
      legL: [[4, 20], [4, 36]], legR: [[20, 52], [4, 52]]
    },
    back: {
      head: [[24, 8], [56, 8]], body: [[32, 20], [32, 36]],
      armL: [[44, 52], [60, 52]], armR: [[52, 20], [52, 36]],
      legL: [[28, 52], [12, 52]], legR: [[12, 20], [12, 36]]
    },
    // lato destro del personaggio (quello visibile quando guarda verso destra);
    // gli arti "dietro" mostrano la faccia interna del braccio/gamba sinistra
    side: {
      head: [[0, 8], [32, 8]], body: [[16, 20], [16, 36]],
      armFront: [[40, 20], [40, 36]], armBack: [[32, 52], [48, 52]],
      legFront: [[0, 20], [0, 36]], legBack: [[16, 52], [0, 52]]
    }
  };
  function skinPart(g, sk, uv, w, h, dx, dy, u) {
    const k = sk.k;
    g.drawImage(sk.img, uv[0][0] * k, uv[0][1] * k, w * k, h * k, dx, dy, w * u, h * u);
    g.drawImage(sk.img, uv[1][0] * k, uv[1][1] * k, w * k, h * k, dx, dy, w * u, h * u);
  }
  // disegna il personaggio di fronte (back=false) o di spalle con il mantello (back=true);
  // L/R sono i lati come li vede chi guarda
  function drawSkin(g, cx, fy, u, t, back, sk) {
    sk = sk || skin;
    if (!sk.ok) return;
    cx = Math.round(cx); fy = Math.round(fy);
    const V = back ? SKIN_UV.back : SKIN_UV.front;
    const sway = Math.sin(t * 1.5) * 0.06;
    g.save();
    g.imageSmoothingEnabled = false;
    skinPart(g, sk, V.legL, 4, 12, cx - 4 * u, fy - 12 * u, u);
    skinPart(g, sk, V.legR, 4, 12, cx, fy - 12 * u, u);
    skinPart(g, sk, V.body, 8, 12, cx - 4 * u, fy - 24 * u, u);
    [[V.armL, -6, sway], [V.armR, 6, -sway]].forEach(([uv, ox, a]) => {
      g.save(); g.translate(cx + ox * u, fy - 24 * u); g.rotate(a);
      skinPart(g, sk, uv, 4, 12, -2 * u, 0, u);
      g.restore();
    });
    if (back && sk.cape) {
      g.save(); g.translate(cx, fy - 24 * u); g.rotate(0.06 + Math.sin(t * 2) * 0.03);
      g.drawImage(sk.cape, 1, 1, 10, 16, -5 * u, 0, 10 * u, 16 * u);
      g.restore();
    }
    skinPart(g, sk, V.head, 8, 8, cx - 4 * u, fy - 32 * u, u);
    g.restore();
  }
  // vista laterale con arti che oscillano (giocatore che cammina)
  function drawSideSkin(g, cx, fy, u, sk, face, swing, arm) {
    if (arm === undefined) arm = -swing;
    const V = SKIN_UV.side;
    const limbSkin = (uv, py, ang, dark) => {
      g.save(); g.translate(0, py); g.rotate(ang);
      skinPart(g, sk, uv, 4, 12, -2 * u, 0, u);
      if (dark) { g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(-2 * u, 0, 4 * u, 12 * u); }
      g.restore();
    };
    g.save(); g.translate(Math.round(cx), Math.round(fy)); if (face < 0) g.scale(-1, 1);
    g.imageSmoothingEnabled = false;
    limbSkin(V.legBack, -12 * u, -swing, true);
    limbSkin(V.armBack, -24 * u, swing, true);
    skinPart(g, sk, V.body, 4, 12, -2 * u, -24 * u, u);
    limbSkin(V.legFront, -12 * u, swing, false);
    skinPart(g, sk, V.head, 8, 8, -4 * u, -32 * u, u);
    limbSkin(V.armFront, -24 * u, arm, false);
    g.restore();
  }
  function updateNpc(dt) {
    const near = Math.abs((P.x + P.w / 2) - 165.5) < 5;
    if (near) { npc.back = false; npc.timer = 3; return; }
    npc.timer -= dt;
    if (npc.timer <= 0) { npc.back = !npc.back; npc.timer = npc.back ? 2.5 : 5 + Math.random() * 3; }
  }
  function loadSkin() {
    const load = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
    return Promise.all([load(D.skin), load(D.cape), load(D.guestSkin)]).then(([s, c, st]) => {
      skin.img = s; skin.cape = c; skin.ok = !!s; if (s) skin.k = s.width / 64;
      steve.img = st; steve.ok = !!st; if (st) steve.k = st.width / 64;
      return skin;
    });
  }

  // cartello con texture del pack (tavola 24x12 e palo 2x14, come il modello del gioco) e testo sopra
  function drawSign(e, cx, gy) {
    const S = WD.tex.entity.sign, g = ctx, u = TS / 16, k = S.width / 64;
    const by = gy - 20 * u;
    g.imageSmoothingEnabled = false;
    g.drawImage(S, 2 * k, 16 * k, 2 * k, 14 * k, cx - u, gy - 14 * u, 2 * u, 14 * u);
    g.drawImage(S, 2 * k, 2 * k, 24 * k, 12 * k, cx - 12 * u, by, 24 * u, 12 * u);
    const lines = e.lines || [];
    let fs = Math.round(2.9 * u);
    if (fs < 7 || !lines.length) return;
    g.fillStyle = '#000'; g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.slice(0, 4).forEach((l, i) => {
      let size = fs;
      g.font = `${size}px VT323, monospace`;
      const w = g.measureText(l).width;
      if (w > 22 * u) { size = Math.floor(size * 22 * u / w); g.font = `${size}px VT323, monospace`; }
      g.fillText(l, cx, by + (1.6 + 1.5 + i * 2.6) * u);
    });
  }

  // ocelot visto di lato, ricostruito dalla texture del modello (layout 64x32)
  function drawOcelot(camPx, camPy) {
    const O = WD.tex.entity.ocelot, g = ctx, u = TS / 16, k = O.width / 64;
    const part = (sx, sy, w, h, dx, dy) => g.drawImage(O, sx * k, sy * k, w * k, h * k, dx * u, dy * u, w * u, h * u);
    const gy = Math.round(BASE * TS - camPy), x = Math.round(cat.x * TS - camPx);
    const sw = cat.vx ? Math.sin(cat.walk) * 0.5 : 0;
    const leg = (sx, sy, len, px, ang, dark) => {
      g.save(); g.translate((px + 1) * u, -len * u); g.rotate(ang);
      part(sx, sy, 2, len, -1, 0);
      if (dark) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(-u, 0, 2 * u, len * u); }
      g.restore();
    };
    g.save();
    g.translate(x + 10 * u, gy); if (cat.face < 0) g.scale(-1, 1); g.translate(-10 * u, 0);
    g.imageSmoothingEnabled = false;
    // zampe sul lato lontano
    leg(8, 15, 6, 1, -sw, true);
    leg(40, 2, 10, 12, sw, true);
    // coda in due segmenti
    const wag = Math.sin(state.t * 2.5) * 0.15;
    g.save(); g.translate(0.5 * u, -11 * u); g.rotate(1.1 + wag);
    part(0, 16, 1, 8, -0.5, 0);
    g.translate(0, 8 * u); g.rotate(-0.5 + wag * 0.5);
    part(4, 16, 1, 8, -0.5, 0);
    g.restore();
    // corpo (il modello è sdraiato: la texture va ruotata di 90°)
    g.save(); g.translate(16 * u, -12 * u); g.rotate(Math.PI / 2);
    g.drawImage(O, 20 * k, 6 * k, 6 * k, 16 * k, 0, 0, 6 * u, 16 * u);
    g.restore();
    // zampe sul lato vicino
    leg(8, 15, 6, 1, sw, false);
    leg(40, 2, 10, 12, -sw, false);
    // testa, muso e orecchie
    part(0, 5, 5, 4, 15, -13);
    part(0, 26, 2, 2, 19, -11);
    part(0, 12, 2, 1, 15, -14);
    part(6, 12, 2, 1, 18, -14);
    g.restore();
  }

  function drawCat(camPx, camPy) {
    const g = ctx, s = TS / 16;
    const gy = Math.round(BASE * TS - camPy), x = Math.round(cat.x * TS - camPx);
    g.save(); g.translate(x + 6 * s, gy); if (cat.face < 0) g.scale(-1, 1); g.translate(-6 * s, 0);
    const leg = Math.sin(cat.walk) * s;
    g.fillStyle = '#c96f1f';
    g.fillRect(1 * s, -3 * s + (cat.vx ? leg : 0), 1.5 * s, 3 * s); g.fillRect(8 * s, -3 * s - (cat.vx ? leg : 0), 1.5 * s, 3 * s);
    g.fillStyle = '#e08a2e'; g.fillRect(0, -7 * s, 10 * s, 4 * s);
    g.fillStyle = '#c96f1f'; g.fillRect(2 * s, -7 * s, 1 * s, 4 * s); g.fillRect(5 * s, -7 * s, 1 * s, 4 * s);
    g.fillStyle = '#e08a2e'; g.fillRect(8 * s, -11 * s, 5 * s, 5 * s);
    g.fillRect(8 * s, -12 * s, 1 * s, 1 * s); g.fillRect(12 * s, -12 * s, 1 * s, 1 * s);
    g.fillStyle = '#1a1a1a'; g.fillRect(11 * s, -10 * s, 1 * s, 1 * s);
    g.fillStyle = '#f2d1b0'; g.fillRect(11 * s, -8 * s, 2 * s, 1 * s);
    g.fillStyle = '#e08a2e'; g.fillRect(-2 * s, -9 * s + Math.sin(state.t * 3) * s, 2 * s, 1 * s); g.fillRect(-1 * s, -8 * s, 1 * s, 2 * s);
    g.restore();
  }

  // fotogramma dell'orb colorato come nel gioco: rosso che pulsa, verde pieno, un filo di blu
  const orbCache = {};
  function orbSprite(frame, step) {
    const key = frame + '_' + step;
    if (orbCache[key]) return orbCache[key];
    const O = WD.tex.entity.xp, fs = O.width / 4;
    const c = document.createElement('canvas'); c.width = c.height = fs;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    const sx = (frame % 4) * fs, sy = Math.floor(frame / 4) * fs;
    g.drawImage(O, sx, sy, fs, fs, 0, 0, fs, fs);
    const ph = step / 16 * Math.PI * 2;
    const r = (Math.sin(ph) + 1) * 0.5, b = (Math.sin(ph + 4.1888) + 1) * 0.1;
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = `rgb(${Math.round(r * 255)},255,${Math.round(b * 255)})`; g.fillRect(0, 0, fs, fs);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(O, sx, sy, fs, fs, 0, 0, fs, fs);
    orbCache[key] = c;
    return c;
  }

  function drawParticles(camPx, camPy) {
    const g = ctx;
    particles.forEach(p => {
      if (p.delay > 0) return;
      const x = p.x * TS - camPx, y = p.y * TS - camPy;
      if (p.k === 'orb' && WD.tex.entity.xp) {
        const s = TS * 0.5;
        const step = Math.floor(state.t * 10 + (p.seed || 0)) % 16;
        g.drawImage(orbSprite(p.f || 3, step), x - s / 2, y - s / 2, s, s);
      } else if (p.k === 'orb') {
        const s = TS * 0.22 * (1 + 0.15 * Math.sin(state.t * 12));
        g.fillStyle = '#3c6e00'; g.fillRect(x - s / 2 - 1, y - s / 2 - 1, s + 2, s + 2);
        g.fillStyle = Math.sin(state.t * 8) > 0 ? '#c6ff3a' : '#8cff2a'; g.fillRect(x - s / 2, y - s / 2, s, s);
      } else if (p.k === 'heart') {
        const s = TS * 0.4; g.globalAlpha = Math.min(1, p.life);
        g.drawImage(WD.tex.hud.heart, x - s / 2, y - s / 2, s, s * 8 / 9); g.globalAlpha = 1;
      } else if (p.k === 'frag') {
        const t = tex[p.id], q = t.width / 4, s = TS * 0.16;
        g.drawImage(t, p.u * t.width, p.v * t.width, q, q, x - s / 2, y - s / 2, s, s);
      } else if (p.k === 'tp') {
        g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.c; g.fillRect(x, y, TS * 0.12, TS * 0.12); g.globalAlpha = 1;
      }
    });
  }

  /* ---------- Azioni ---------- */
  function interact() {
    if (state.poi) { WD.audio.play('click'); state.poi.act(); return true; }
    return false;
  }
  // zoneId: una zona di TP oppure "m0".."m3" per le tappe dell'esperienza
  function teleport(zoneId) {
    const m = /^m(\d)$/.exec(zoneId);
    const x = m ? MILESTONE_X[+m[1]] - 1 : TP[zoneId];
    if (x === undefined) return false;
    for (let i = 0; i < 18; i++) particles.push({ k: 'tp', x: P.x + Math.random() * 0.6, y: P.y + Math.random() * 1.8, vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2, life: 0.8, c: '#b54dff' });
    P.x = x; P.y = heights[Math.floor(x)] - P.h - 0.05; P.vx = 0; P.vy = 0; P.fly = false;
    cam.x = Math.max(0, Math.min(W - viewW, P.x - viewW / 2));
    cam.y = Math.min(H - viewH, P.y + P.h / 2 - viewH * 0.58);
    for (let i = 0; i < 18; i++) particles.push({ k: 'tp', x: P.x + Math.random() * 0.6, y: P.y + Math.random() * 1.8, vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2, life: 0.8, c: '#e3a3ff' });
    WD.audio.play('tp');
    return true;
  }
  function drinkCoffee() {
    state.coffee = 10; WD.ui.coffee(10);
    WD.audio.play('gulp');
    WD.ui.chat('§7Hai bevuto un caffè. §aProduttività +100%');
    grant('coffee');
  }

  function command(raw) {
    const [cmd, ...args] = raw.slice(1).trim().split(/\s+/);
    const c = (cmd || '').toLowerCase();
    const say = WD.ui.chat;
    const open = { chisono: () => WD.ui.book(), competenze: () => WD.ui.inventory(), skills: () => WD.ui.inventory(), softskills: () => WD.ui.enchant(), contatti: () => WD.ui.trade() };
    if (c === 'help' || c === 'aiuto') {
      say('§e--- Comandi disponibili ---');
      ['§b/chisono §7- apri il libro su Daniele', '§b/competenze §7- inventario delle competenze', '§b/softskills §7- il libro incantato',
        '§b/esperienza §7- percorso lavoro e formazione', '§b/contatti §7- scambi con Daniele', '§b/tp <spawn|about|skills|exp|contact>',
        '§b/time set <day|night>', '§b/skin <steve|classica>', '§b/gamemode <creative|survival>', '§b/email §7· §b/seed §7· §b/clear'].forEach(l => say(l));
    } else if (open[c]) { open[c](); }
    else if (c === 'esperienza') {
      say('§e--- Esperienza ---');
      D.timeline.slice().reverse().forEach(m => say(`§a${m.title} §7(${m.date}) §f- ${m.company}`));
    } else if (c === 'tp') {
      const map = { spawn: 'spawn', about: 'about', chisono: 'about', skills: 'skills', competenze: 'skills', exp: 'exp', esperienza: 'exp', contact: 'contact', contatti: 'contact' };
      const z = map[(args[0] || '').toLowerCase()];
      if (z && teleport(z)) say(`§7Teletrasportato a §f${z}`);
      else say('§cUso: /tp <spawn|about|skills|exp|contact>');
    } else if (c === 'time') {
      const v = (args[1] || args[0] || '').toLowerCase();
      if (v === 'night' || v === 'notte') { state.night = true; say('§7Orario impostato su §fnotte'); }
      else if (v === 'day' || v === 'giorno') { state.night = false; say('§7Orario impostato su §fgiorno'); }
      else say('§cUso: /time set <day|night>');
    } else if (c === 'gamemode') {
      const v = (args[0] || '').toLowerCase();
      if (v === 'creative' || v === 'creativa' || v === '1') { P.fly = true; P.vy = -3; say('§7Modalità di gioco impostata su §fCreativa §7(vola con Spazio/Shift... e con la fantasia)'); }
      else if (v === 'survival' || v === 'sopravvivenza' || v === '0') { P.fly = false; say('§7Modalità di gioco impostata su §fSopravvivenza'); }
      else say('§cUso: /gamemode <creative|survival>');
    } else if (c === 'skin') {
      const v = (args[0] || '').toLowerCase();
      if (v === 'steve' || v === 'classica') {
        WD.opts.steve = v === 'steve';
        try { localStorage.setItem('wd-opts', JSON.stringify(WD.opts)); } catch (e) { /* ignora */ }
        say(`§7Skin impostata su §f${v === 'steve' ? 'Steve' : 'Classica'}`);
      } else say('§cUso: /skin <steve|classica>');
    } else if (c === 'email') { say(`§7Email: §b${D.email}`); }
    else if (c === 'seed') { say('§7Seed: §a[wolskidev-2026]'); }
    else if (c === 'clear') { WD.ui.clearChat(); }
    else if (c === 'give') { say('§7Ti è stato dato §a[Un colloquio con Daniele] §7x1. Usalo con /contatti!'); }
    else if (c === 'kill') { say('§7Ospite è caduto nel vuoto... scherzo, qui sei al sicuro.'); }
    else if (c === 'op') { say('§cSolo Daniele è operatore su questo server!'); }
    else { WD.audio.play('error'); say('§cComando sconosciuto. Scrivi §e/help §cper la lista dei comandi.'); }
  }

  function chatMessage(msg) {
    WD.ui.chat(`<Ospite> ${msg}`);
    grant('chat');
    const m = msg.toLowerCase();
    let reply;
    if (/ciao|salve|hey|buongiorno|buonasera/.test(m)) reply = 'Ciao! Benvenuto nel mio mondo. Scrivi /help per i comandi!';
    else if (/lavor|assum|colloquio|opportunit|progett|collabor/.test(m)) reply = `Sono sempre interessato a nuove opportunità! Scrivimi a ${D.email}`;
    else if (/angular|typescript|javascript|front/.test(m)) reply = 'Angular e TypeScript sono il mio pane quotidiano!';
    else if (/palestra|sport|gym/.test(m)) reply = 'Quando non sono davanti a uno schermo, mi trovi in palestra!';
    else if (/caff/.test(m)) reply = 'Il caffè è la vera fonte di energia di questo server.';
    else reply = 'Messaggio ricevuto! Per contattarmi davvero usa /contatti';
    setTimeout(() => WD.ui.chat(`§e<${D.nick}>§f ${reply}`), 700);
  }

  /* ---------- Avvio ---------- */
  function init(canvasEl) {
    cv = canvasEl; ctx = cv.getContext('2d');
    generate();
    photo = new Image();
    photo.onload = () => {
      paintingCanvas = document.createElement('canvas');
      paintingCanvas.width = 48; paintingCanvas.height = 32;
      const pg = paintingCanvas.getContext('2d');
      const sw = photo.width, sh = photo.height, ratio = 48 / 32;
      let cw = sw, chh = sw / ratio; if (chh > sh) { chh = sh; cw = sh * ratio; }
      pg.drawImage(photo, (sw - cw) / 2, (sh - chh) / 2, cw, chh, 0, 0, 48, 32);
    };
    photo.src = D.photo;
    WD.skinReady = loadSkin();
    window.addEventListener('resize', () => { if (state.running) resize(); });
  }

  function start(mode) {
    resize();
    state.running = true; state.paused = false;
    if (!state.joined) {
      state.joined = true;
      P.x = TP.spawn; P.y = BASE - P.h;
      cam.x = Math.max(0, P.x - viewW / 2); cam.y = P.y - viewH * 0.5;
      setTimeout(() => {
        WD.ui.chat(`§e${D.nick} è entrato nel gioco`);
        WD.ui.chat('§eOspite è entrato nel gioco');
        setTimeout(() => WD.ui.chat(`§e<${D.nick}>§f Ciao! Benvenuto nel mio portfolio. Esplora il mondo verso destra →`), 900);
        setTimeout(() => WD.ui.chat('§7Comandi: §fA/D §7o §f←/→ §7cammina, §fSpazio §7salta, §fF §7interagisci, §fE §7inventario, §fT §7chat, §fTasto destro §7con la bussola: navigatore, §fEsc §7pausa'), 1900);
        grant('join');
      }, 400);
      state.zone = ZONES[0];
      WD.ui.select(0);
      WD.ui.title('WOLSKIDEV', `Il portfolio di ${D.name}`);
    }
    if (mode === 'contact') { teleport('contact'); }
  }

  WD.game = {
    init, start, update, render, drawSkin, steve, pointer,
    givePick() { state.hasPick = true; grant('pickaxe'); }, resize, interact, teleport, drinkCoffee, command, chatMessage, grant,
    input, state, ADV, P,
    stop() { state.running = false; },
    debugInfo() {
      return [
        'WolskiDev 1.0 (portfolio/vanilla)',
        `${state.fps | 0} fps`,
        `XYZ: ${P.x.toFixed(3)} / ${(H - P.y - P.h).toFixed(3)} / 0.000`,
        `Bioma: ${D.location}`,
        `Zona: ${state.zone ? state.zone.title : '-'}`,
        'Stack: Angular + TypeScript',
        `Caffè: ${state.coffee}/10`,
        `Progressi: ${Object.keys(state.adv).length}/${Object.keys(ADV).length}`
      ];
    }
  };
})();
