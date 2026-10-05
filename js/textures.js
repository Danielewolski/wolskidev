/* Texture procedurali in pixel art (16x16), generate al volo: nessuna immagine esterna */
(function () {
  'use strict';
  const WD = window.WD = window.WD || {};
  const S = 16;

  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hex(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function col(h, f) {
    const [r, g, b] = hex(h);
    const c = v => Math.max(0, Math.min(255, Math.round(v * (f === undefined ? 1 : f))));
    return `rgb(${c(r)},${c(g)},${c(b)})`;
  }
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h || w; return c; }
  function make(seed, fn) { const c = canvas(S); const g = c.getContext('2d'); fn(g, rng(seed)); return c; }
  function px(g, x, y, c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); }
  function noise(g, r, base, v) {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) px(g, x, y, col(base, 1 + (r() - 0.5) * v));
  }
  function fromMap(rows, pal, oy) {
    const c = canvas(S); const g = c.getContext('2d');
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) { const ch = row[x]; if (pal[ch]) px(g, x, y + (oy || 0), pal[ch]); }
    });
    return c;
  }

  /* ---------- Blocchi ---------- */
  function dirt(g, r) {
    noise(g, r, '#866043', 0.35);
    for (let i = 0; i < 14; i++) px(g, r() * 16 | 0, r() * 16 | 0, '#5e4128');
    for (let i = 0; i < 10; i++) px(g, r() * 16 | 0, r() * 16 | 0, '#a07a55');
  }
  function grass(g, r) {
    dirt(g, r);
    for (let x = 0; x < S; x++) {
      const d = 2 + (r() * 3 | 0);
      for (let y = 0; y < d; y++) px(g, x, y, col('#5ea33a', 1 + (r() - 0.5) * 0.35));
      if (r() < 0.45) px(g, x, d, col('#4a8a2c', 1));
    }
  }
  function stone(g, r) {
    noise(g, r, '#7f7f7f', 0.16);
    for (let i = 0; i < 16; i++) { const x = r() * 15 | 0, y = r() * 16 | 0; px(g, x, y, '#686868'); px(g, x + 1, y, '#6e6e6e'); }
    for (let i = 0; i < 10; i++) px(g, r() * 16 | 0, r() * 16 | 0, '#949494');
  }
  function cobble(g, r) {
    const pts = [];
    for (let i = 0; i < 9; i++) pts.push([r() * 16, r() * 16, 0.78 + r() * 0.4]);
    const map = [];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let best = 0, bd = 1e9;
      for (let i = 0; i < pts.length; i++) for (let ox = -16; ox <= 16; ox += 16) for (let oy = -16; oy <= 16; oy += 16) {
        const dx = x + 0.5 - pts[i][0] - ox, dy = y + 0.5 - pts[i][1] - oy, d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = i; }
      }
      map[y * S + x] = best;
    }
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const id = map[y * S + x];
      const edge = map[y * S + ((x + 1) % S)] !== id || map[((y + 1) % S) * S + x] !== id;
      px(g, x, y, edge ? col('#4a4a4a', 1 + (r() - 0.5) * 0.2) : col('#8a8a8a', pts[id][2] + (r() - 0.5) * 0.14));
    }
  }
  function bedrock(g, r) {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const v = r();
      px(g, x, y, v < 0.4 ? col('#2c2c2c', 1 + (r() - 0.5) * 0.3) : v < 0.75 ? col('#565656', 1) : col('#7a7a7a', 1));
    }
  }
  function log(g, r) {
    const stripes = [];
    for (let x = 0; x < S; x++) stripes.push(0.85 + r() * 0.25);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) px(g, x, y, col('#6a5130', stripes[x] * (1 + (r() - 0.5) * 0.12)));
    for (let i = 0; i < 6; i++) {
      const x = r() * 16 | 0, y0 = r() * 16 | 0, l = 2 + (r() * 4 | 0);
      for (let k = 0; k < l; k++) px(g, x, (y0 + k) % S, '#4a3820');
    }
  }
  function planks(g, r) {
    const seams = [3, 11, 7, 13];
    for (let y = 0; y < S; y++) {
      const row = y >> 2;
      for (let x = 0; x < S; x++) {
        let c;
        if (y % 4 === 3) c = col('#6e5530', 1);
        else if (x === seams[row]) c = col('#7d6237', 1);
        else c = col('#a4834f', (row % 2 ? 0.95 : 1.02) * (1 + (r() - 0.5) * 0.1));
        px(g, x, y, c);
      }
    }
    for (let i = 0; i < 8; i++) { const x = r() * 15 | 0, y = r() * 16 | 0; if (y % 4 !== 3) { px(g, x, y, '#94753f'); px(g, x + 1, y, '#94753f'); } }
  }
  function leaves(g, r) {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const v = r();
      px(g, x, y, v < 0.14 ? '#1f4f14' : col('#3d8a29', 1 + (r() - 0.5) * 0.5));
    }
  }
  function glass(g, r) {
    g.fillStyle = 'rgba(190,225,255,0.14)'; g.fillRect(0, 0, S, S);
    g.fillStyle = 'rgba(225,242,255,0.95)';
    g.fillRect(0, 0, S, 1); g.fillRect(0, 15, S, 1); g.fillRect(0, 0, 1, S); g.fillRect(15, 0, 1, S);
    g.fillStyle = 'rgba(255,255,255,0.75)';
    [[3, 2], [2, 3], [4, 2], [2, 4], [11, 11], [12, 10], [10, 12], [6, 3], [5, 4], [4, 5]].forEach(p => g.fillRect(p[0], p[1], 1, 1));
  }
  function bookshelf(g, r) {
    planks(g, r);
    const pal = ['#8c2b2b', '#2b4f8c', '#2b8c4a', '#8c7a2b', '#6a2b8c', '#3a3a3a', '#b05a1e'];
    [[1, 6], [9, 14]].forEach(([a, b]) => {
      g.fillStyle = '#3b2a16'; g.fillRect(1, a, 14, b - a + 1);
      let x = 1;
      while (x < 15) {
        const w = Math.min(15 - x, 1 + (r() * 2 | 0));
        const top = a + (r() * 2 | 0);
        g.fillStyle = col(pal[r() * pal.length | 0], 0.9 + r() * 0.25);
        g.fillRect(x, top, w, b - top + 1);
        x += w + (r() < 0.2 ? 1 : 0);
      }
    });
  }
  function crafting(g, r) {
    planks(g, r);
    for (let y = 0; y < 3; y++) for (let x = 0; x < S; x++) px(g, x, y, col('#7a5532', 1 + (r() - 0.5) * 0.15));
    for (let x = 0; x < S; x += 4) for (let y = 0; y < 3; y++) px(g, x, y, '#5b3b1c');
    // sega e martello
    g.fillStyle = '#9a9a9a'; g.fillRect(3, 6, 5, 2);
    g.fillStyle = '#5b3b1c'; g.fillRect(2, 6, 1, 3);
    g.fillStyle = '#9a9a9a'; g.fillRect(9, 5, 4, 2);
    g.fillStyle = '#5b3b1c'; g.fillRect(10, 7, 1, 6);
  }
  function enchant(g, r) {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (y < 4) px(g, x, y, col('#a3262a', 1 + (r() - 0.5) * 0.25));
      else px(g, x, y, r() < 0.1 ? '#3c2a5a' : col('#18121f', 1 + (r() - 0.5) * 0.4));
    }
    g.fillStyle = '#e0c45a'; g.fillRect(0, 3, S, 1);
    g.fillStyle = '#6ee8e0'; g.fillRect(1, 6, 2, 2); g.fillRect(13, 6, 2, 2);
    g.fillStyle = '#c4fffb'; g.fillRect(1, 6, 1, 1); g.fillRect(13, 6, 1, 1);
  }
  function gemBlock(base) {
    return function (g, r) {
      noise(g, r, base, 0.08);
      g.fillStyle = col(base, 1.25); g.fillRect(0, 0, S, 1); g.fillRect(0, 0, 1, S);
      g.fillStyle = col(base, 0.7); g.fillRect(0, 15, S, 1); g.fillRect(15, 0, 1, S);
      g.fillStyle = col(base, 1.35);
      [[2, 2], [3, 2], [2, 3], [10, 3], [11, 3], [5, 9], [6, 9], [12, 11]].forEach(p => g.fillRect(p[0], p[1], 1, 1));
      g.fillStyle = col(base, 0.82);
      [[7, 5], [8, 5], [3, 12], [4, 12], [12, 6], [9, 13]].forEach(p => g.fillRect(p[0], p[1], 1, 1));
    };
  }
  function ore(color) {
    return function (g, r) {
      stone(g, r);
      for (let k = 0; k < 5; k++) {
        const cx = 2 + (r() * 11 | 0), cy = 2 + (r() * 11 | 0);
        [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0]].forEach(([dx, dy]) => { if (r() < 0.85) px(g, cx + dx, cy + dy, col(color, 0.85 + r() * 0.3)); });
      }
    };
  }
  function brick(g, r) {
    g.fillStyle = '#a19c96'; g.fillRect(0, 0, S, S);
    for (let row = 0; row < 4; row++) {
      const off = row % 2 ? 4 : 0;
      for (let b = -1; b < 3; b++) {
        const x0 = b * 8 + off;
        for (let y = row * 4; y < row * 4 + 3; y++) for (let x = x0; x < x0 + 7; x++) {
          if (x >= 0 && x < S) px(g, x, y, col('#97503f', 1 + (r() - 0.5) * 0.2));
        }
      }
    }
  }
  function chest(g, r) {
    noise(g, r, '#a8702d', 0.15);
    g.fillStyle = '#3b250d';
    g.fillRect(0, 0, S, 1); g.fillRect(0, 15, S, 1); g.fillRect(0, 0, 1, S); g.fillRect(15, 0, 1, S); g.fillRect(0, 6, S, 1);
    g.fillStyle = '#c0c0c0'; g.fillRect(7, 4, 2, 4);
    g.fillStyle = '#3b3b3b'; g.fillRect(7, 7, 2, 1);
  }
  function wool(base) { return function (g, r) { noise(g, r, base, 0.1); for (let i = 0; i < 20; i++) px(g, r() * 16 | 0, r() * 16 | 0, col(base, 0.88)); }; }
  function obsidian(g, r) { noise(g, r, '#1a1426', 0.4); for (let i = 0; i < 14; i++) px(g, r() * 16 | 0, r() * 16 | 0, '#3c2a5a'); }
  function beacon(g, r) {
    glass(g, r);
    g.fillStyle = '#1b1b2a'; g.fillRect(2, 11, 12, 3);
    g.fillStyle = '#6ee8e0'; g.fillRect(4, 4, 8, 7);
    g.fillStyle = '#c9fffb'; g.fillRect(5, 5, 6, 4);
  }
  function water(g, r) {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const v = 1 + (r() - 0.5) * 0.15;
      g.fillStyle = `rgba(${Math.round(48 * v)},${Math.round(88 * v)},${Math.round(200 * v)},0.78)`; g.fillRect(x, y, 1, 1);
    }
  }
  function tallgrass(g, r) {
    for (let i = 0; i < 8; i++) {
      const x = 1 + (r() * 14 | 0), h = 4 + (r() * 8 | 0);
      for (let y = 16 - h; y < 16; y++) px(g, x + (y < 16 - h / 2 && r() < 0.3 ? 1 : 0), y, col('#4f9a2c', 0.8 + r() * 0.4));
    }
  }
  function flower(petal, center) {
    return function (g) {
      g.fillStyle = '#3f7d23'; g.fillRect(8, 9, 1, 7); g.fillRect(7, 12, 1, 1); g.fillRect(9, 11, 1, 1);
      g.fillStyle = petal; g.fillRect(6, 6, 5, 3); g.fillRect(7, 5, 3, 5);
      g.fillStyle = center; g.fillRect(8, 7, 1, 1);
    };
  }
  function torch(g) {
    g.fillStyle = '#6b4a24'; g.fillRect(7, 7, 2, 9);
    g.fillStyle = '#4a3218'; g.fillRect(8, 7, 1, 9);
    g.fillStyle = '#ffb62e'; g.fillRect(7, 4, 2, 3);
    g.fillStyle = '#fff1a0'; g.fillRect(7, 5, 1, 1);
    g.fillStyle = '#ff7a1a'; g.fillRect(8, 6, 1, 1);
  }

  const B = {
    AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, COBBLE: 4, BEDROCK: 5, LOG: 6, PLANKS: 7, LEAVES: 8, GLASS: 9,
    BOOKSHELF: 10, CRAFTING: 11, ENCHANT: 12, DIAMOND_BLOCK: 13, GOLD_BLOCK: 14, EMERALD_BLOCK: 15,
    COAL_ORE: 16, IRON_ORE: 17, GOLD_ORE: 18, DIAMOND_ORE: 19, BRICK: 20, CHEST: 21, WOOL_WHITE: 22,
    WOOL_RED: 23, OBSIDIAN: 24, BEACON: 25, GLOWSTONE: 26, WEB: 27, EMERALD_ORE: 28, MOSSY: 29,
    TALLGRASS: 30, POPPY: 31, DANDELION: 32, TORCH: 33, LOG_DECO: 34, LEAVES_DECO: 35, WATER: 36,
    LADDER: 37, VINE: 38, MUSHROOM_RED: 39, MUSHROOM_BROWN: 40, FERN: 41, LILY: 42, LAPIS_ORE: 43, REDSTONE_ORE: 44
  };
  const gens = {};
  gens[B.GRASS] = grass; gens[B.DIRT] = dirt; gens[B.STONE] = stone; gens[B.COBBLE] = cobble;
  gens[B.BEDROCK] = bedrock; gens[B.LOG] = log; gens[B.PLANKS] = planks; gens[B.LEAVES] = leaves;
  gens[B.GLASS] = glass; gens[B.BOOKSHELF] = bookshelf; gens[B.CRAFTING] = crafting; gens[B.ENCHANT] = enchant;
  gens[B.DIAMOND_BLOCK] = gemBlock('#5fd8d2'); gens[B.GOLD_BLOCK] = gemBlock('#f5d33b'); gens[B.EMERALD_BLOCK] = gemBlock('#2fcf64');
  gens[B.COAL_ORE] = ore('#262626'); gens[B.IRON_ORE] = ore('#d8af93'); gens[B.GOLD_ORE] = ore('#fcee4b'); gens[B.DIAMOND_ORE] = ore('#5decf5');
  gens[B.BRICK] = brick; gens[B.CHEST] = chest; gens[B.WOOL_WHITE] = wool('#e9ecec'); gens[B.WOOL_RED] = wool('#a12722');
  gens[B.OBSIDIAN] = obsidian; gens[B.BEACON] = beacon;
  gens[B.TALLGRASS] = tallgrass; gens[B.POPPY] = flower('#d22a2a', '#2a1a10'); gens[B.DANDELION] = flower('#f3e03b', '#c9a21a');
  gens[B.TORCH] = torch; gens[B.WATER] = water;
  // riserve semplici per i blocchi della miniera (normalmente sostituite dal texture pack)
  gens[B.GLOWSTONE] = (g, r) => noise(g, r, '#e8c060', 0.35);
  gens[B.WEB] = (g) => { g.strokeStyle = 'rgba(235,235,235,0.9)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(16, 16); g.moveTo(16, 0); g.lineTo(0, 16); g.moveTo(8, 0); g.lineTo(8, 16); g.moveTo(0, 8); g.lineTo(16, 8); g.stroke(); };
  gens[B.EMERALD_ORE] = ore('#17dd62'); gens[B.LAPIS_ORE] = ore('#1d4fb8'); gens[B.REDSTONE_ORE] = ore('#c41010');
  gens[B.MOSSY] = (g, r) => { cobble(g, r); for (let i = 0; i < 40; i++) px(g, r() * 16 | 0, r() * 16 | 0, '#4f7a35'); };
  gens[B.LADDER] = (g) => { g.fillStyle = '#7a5a30'; g.fillRect(2, 0, 2, 16); g.fillRect(12, 0, 2, 16); [2, 6, 10, 14].forEach(y => g.fillRect(2, y, 12, 2)); };
  gens[B.VINE] = (g, r) => { for (let i = 0; i < 30; i++) px(g, r() * 16 | 0, r() * 16 | 0, col('#3f7d23', 0.8 + r() * 0.4)); };
  gens[B.MUSHROOM_RED] = (g) => { g.fillStyle = '#e8dcc0'; g.fillRect(7, 9, 2, 7); g.fillStyle = '#c42020'; g.fillRect(4, 5, 8, 4); };
  gens[B.MUSHROOM_BROWN] = (g) => { g.fillStyle = '#e8dcc0'; g.fillRect(7, 10, 2, 6); g.fillStyle = '#8a6a4a'; g.fillRect(4, 7, 8, 3); };
  gens[B.FERN] = tallgrass;
  gens[B.LILY] = (g) => { g.fillStyle = '#2a7a28'; g.fillRect(1, 6, 14, 5); };

  const tex = [], texDark = [], solid = [];
  Object.keys(gens).forEach(k => { tex[k] = make(1000 + (+k) * 77, gens[k]); });
  tex[B.LOG_DECO] = tex[B.LOG]; tex[B.LEAVES_DECO] = tex[B.LEAVES];
  for (let i = 0; i < 64; i++) solid[i] = (i >= 1 && i <= 29) || i === 43 || i === 44;

  // versione scurita per lo sfondo (muri dietro al giocatore)
  tex.forEach((t, i) => {
    if (!t) return;
    const c = canvas(S); const g = c.getContext('2d');
    g.drawImage(t, 0, 0);
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(0,0,0,0.42)'; g.fillRect(0, 0, S, S);
    texDark[i] = c;
  });

  // varianti di pietra per il logo
  const stoneVariants = [11, 22, 33, 44].map(s => make(s, stone));

  /* ---------- Oggetti (icone 16x16) ---------- */
  const items = {};
  items.pickaxe = fromMap([
    '................',
    '....DDDDDD......',
    '...DLLLLLLD.....',
    '....DDDDLLLD....',
    '.........DLLD...',
    '........HhDLD...',
    '.......HhH.DLD..',
    '......HhH...DLD.',
    '.....HhH.....DD.',
    '....HhH.........',
    '...HhH..........',
    '..HhH...........',
    '.HhH............',
    '.HH.............'
  ], { D: '#0e8f80', L: '#4fe8d0', H: '#3b2810', h: '#8a6233' }, 1);
  const gemMap = [
    '......gggg......',
    '.....gLLLLg.....',
    '....gLLGGGGg....',
    '...gLGGGGGGGg...',
    '..gLGGGGGGGGGg..',
    '..gGGGGGGGGGDg..',
    '..gGGGGGGGGDDg..',
    '...gGGGGGGDDg...',
    '....gGGGGDDg....',
    '.....gGGDDg.....',
    '......gggg......'
  ];
  items.emerald = fromMap(gemMap, { g: '#0a5c2a', G: '#17dd62', L: '#9bf7b8', D: '#0fa848' }, 2);
  items.diamond = fromMap(gemMap, { g: '#0b5d5b', G: '#4be3dc', L: '#c8fffb', D: '#1fa9a3' }, 2);
  const bookMap = [
    '...kkkkkkkkkk...',
    '..kBBBBBBBBBBk..',
    '..kBbbbbbbbbBk..',
    '..kBbYYYYYYbBk..',
    '..kBbbbbbbbbBk..',
    '..kBBBBBBBBBBk..',
    '..kBBBBBBBBBBk..',
    '..kBBBBBBBBBBk..',
    '..kBBBBBBBBBBk..',
    '..kWWWWWWWWWWk..',
    '..kWwWwWwWwWWk..',
    '...kkkkkkkkkk...'
  ];
  items.book = fromMap(bookMap, { k: '#2a1a0c', B: '#7a4a24', b: '#5c3518', Y: '#e8c547', W: '#f2efe4', w: '#c9c3b0' }, 2);
  items.ench_book = fromMap(bookMap, { k: '#25103a', B: '#7b3fb0', b: '#5a2a85', Y: '#ffd95e', W: '#f2efe4', w: '#c9c3b0' }, 2);
  items.compass = fromMap([
    '.....kkkkkk.....',
    '...kkSSSSSSkk...',
    '..kSSwwwwwwSSk..',
    '..kSwwwwwwRwSk..',
    '.kSwwwwwwRRwwSk.',
    '.kSwwwwwRRwwwSk.',
    '.kSwwwwRRwwwwSk.',
    '.kSwwwBBwwwwwSk.',
    '.kSwwBBwwwwwwSk.',
    '..kSwBwwwwwwSk..',
    '..kSSwwwwwwSSk..',
    '...kkSSSSSSkk...',
    '.....kkkkkk.....'
  ], { k: '#2b2b2b', S: '#8a8a8a', w: '#d8d8d8', R: '#d42a2a', B: '#444444' }, 2);
  items.coffee = fromMap([
    '.....s..s.......',
    '......s..s......',
    '.....s..s.......',
    '..kkkkkkkkk.....',
    '..kWcccccWkkk...',
    '..kWWWWWWWk.k...',
    '..kWWWWWWWk.k...',
    '..kWWWWWWWkkk...',
    '..kWWWWWWWk.....',
    '...kWWWWWk......',
    '....kkkkk.......'
  ], { s: '#e6e6e6', W: '#f4f4f4', c: '#5a3a1e', k: '#3a3a3a' }, 2);
  items.sapling = fromMap([
    '......gg........',
    '.....gGGg.gg....',
    '....gGGGGgGGg...',
    '...gGGgGGGGGGg..',
    '...gGGGGGGgGGg..',
    '....gGGGGGGGg...',
    '.....ggGtGgg....',
    '.......tt.......',
    '.......t........',
    '......tt........',
    '......t.........'
  ], { g: '#1f5a14', G: '#4caf2e', t: '#6b4a24' }, 3);
  items.crafting = tex[B.CRAFTING];
  items.grass_block = tex[B.GRASS];
  items.obsidian = tex[B.OBSIDIAN];
  items.glowstone = tex[B.GLOWSTONE];
  items.glass_pane = make(9, (g) => { g.fillStyle = 'rgba(70,70,70,0.85)'; g.fillRect(0, 0, S, S); });
  items.chest = tex[B.CHEST];

  // Cuore e caffè per la HUD (9x9)
  const heartRows = ['.kk...kk.', 'kRRk.kRRk', 'kRWRkRRRk', 'kRRRRRRRk', '.kRRRRRk.', '..kRRRk..', '...kRk...', '....k....'];
  function small(rows, pal) {
    const c = canvas(9); const g = c.getContext('2d');
    rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (pal[row[x]]) px(g, x, y, pal[row[x]]); });
    return c;
  }
  const hud = {
    heart: small(heartRows, { k: '#1a0000', R: '#e0201f', W: '#ffd0d0' }),
    coffee: small(['..s..s...', '.s..s....', 'kkkkkkk..', 'kcccccckk', 'kWWWWWk.k', 'kWWWWWkkk', 'kWWWWWk..', '.kWWWk...', '..kkk....'],
      { s: '#e0e0e0', k: '#2e2e2e', c: '#5a3a1e', W: '#efe6d8' })
  };

  /* ---------- Icone delle competenze ---------- */
  const FONT = {
    A: ['.#.', '#.#', '###', '#.#', '#.#'], T: ['###', '.#.', '.#.', '.#.', '.#.'], S: ['.##', '#..', '.#.', '..#', '##.'],
    J: ['..#', '..#', '..#', '#.#', '.#.'], 5: ['###', '#..', '##.', '..#', '##.'], 3: ['##.', '..#', '.#.', '..#', '##.'],
    B: ['##.', '#.#', '##.', '#.#', '##.'], '<': ['..#', '.#.', '#..', '.#.', '..#'], '>': ['#..', '.#.', '..#', '.#.', '#..'],
    G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'], N: ['##.', '#.#', '#.#', '#.#', '#.#'],
    P: ['##.', '#.#', '##.', '#..', '#..'], M: ['#.#', '###', '#.#', '#.#', '#.#'], _: ['...', '...', '...', '...', '###'],
    V: ['#.#', '#.#', '#.#', '#.#', '.#.'], O: ['.#.', '#.#', '#.#', '#.#', '.#.']
  };
  function skillIcon(spec) {
    const [shape, bgc, fgc, label] = spec;
    const c = canvas(S); const g = c.getContext('2d');
    if (shape === 'win') {
      g.fillStyle = bgc;
      [[2, 2], [9, 2], [2, 9], [9, 9]].forEach(([x, y]) => g.fillRect(x, y, 5, 5));
      g.fillStyle = col(bgc, 0.75);
      [[2, 6], [9, 6], [2, 13], [9, 13]].forEach(([x, y]) => g.fillRect(x, y, 5, 1));
      return c;
    }
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let inside = false;
      if (shape === 'shield') {
        if (y >= 1 && y <= 14) { const inset = y < 10 ? 0 : (y - 9) * 2 - 1; inside = x >= 2 + Math.max(0, inset) && x <= 13 - Math.max(0, inset); }
      } else if (shape === 'square') {
        inside = x >= 2 && x <= 13 && y >= 2 && y <= 13 && !((x === 2 || x === 13) && (y === 2 || y === 13));
      } else if (shape === 'circle') {
        const dx = x - 7.5, dy = y - 7.5; inside = dx * dx + dy * dy <= 42;
      }
      if (inside) px(g, x, y, shape === 'shield' && x >= 8 ? col(bgc, 0.82) : col(bgc, 1));
    }
    // bordo inferiore scuro
    const w = label.length * 4 - 1;
    const x0 = Math.floor((S - w) / 2), y0 = shape === 'shield' ? 4 : 6;
    for (let i = 0; i < label.length; i++) {
      const gl = FONT[label[i]]; if (!gl) continue;
      gl.forEach((row, yy) => { for (let xx = 0; xx < 3; xx++) if (row[xx] === '#') px(g, x0 + i * 4 + xx, y0 + yy, fgc); });
    }
    return c;
  }
  const allSkills = WD.data.skills.framework.items.concat(WD.data.skills.tools.items);
  allSkills.forEach(s => { items['sk_' + s.id] = skillIcon(s.icon); });

  /* ---------- Volti 8x8 ---------- */
  function face(rows, pal) {
    const c = canvas(8); const g = c.getContext('2d');
    rows.forEach((row, y) => { for (let x = 0; x < 8; x++) px(g, x, y, pal[row[x]]); });
    return c;
  }
  const faces = {
    daniele: face(['HHHHHHHH', 'HHHHHHHH', 'HSSSSSSH', 'SSSSSSSS', 'SWISSIWS', 'SSSssSSS', 'SSmmmmSS', 'SSSSSSSS'],
      { H: '#8a6a45', S: '#e0ac85', s: '#c99472', W: '#ffffff', I: '#4b6ea8', m: '#9c5b4a' }),
    guest: face(['HHHHHHHH', 'HHHHHHHH', 'HSSSSSSH', 'SSSSSSSS', 'SWISSIWS', 'SSSssSSS', 'SSSmmSSS', 'SSSSSSSS'],
      { H: '#3b2a1a', S: '#c58c69', s: '#ad7757', W: '#ffffff', I: '#3b5dc9', m: '#7a4535' })
  };

  /* ---------- Data URL per l'HTML ---------- */
  const urlCache = {};
  function url(name) {
    if (urlCache[name]) return urlCache[name];
    const c = items[name] || hud[name] || faces[name];
    if (!c) return '';
    urlCache[name] = c.toDataURL();
    return urlCache[name];
  }
  function uiTextures() {
    // texture pietra dei bottoni
    const btn = make(5, (g, r) => { noise(g, r, '#727272', 0.12); });
    // fondale in terra scurita dei menu
    const d = canvas(S); const dg = d.getContext('2d');
    dg.drawImage(tex[B.DIRT], 0, 0); dg.fillStyle = 'rgba(0,0,0,0.62)'; dg.fillRect(0, 0, S, S);
    const root = document.documentElement.style;
    root.setProperty('--btn-tex', `url(${btn.toDataURL()})`);
    root.setProperty('--dirt-tex', `url(${d.toDataURL()})`);
  }

  /* ---------- Texture pack: Faithful 32x (xMrVizzy & Vattic) - https://faithfulpack.net ---------- */
  // Le texture disegnate sopra restano come riserva se il pack non si carica.
  // Il pack è a 32x32: le tele vengono ridimensionate alla risoluzione delle immagini.
  const gui = {};
  const entity = { sign: null, ocelot: null, xp: null, sun: null, moon: null, beam: null, destroy: [] };
  function loadImg(src) {
    return new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  }
  function crop(im, sx, sy, w, h) {
    const c = canvas(w, h); const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(im, sx, sy, w, h, 0, 0, w, h);
    return c;
  }
  // colora le texture in scala di grigi (foglie, erba) come fa il gioco con i biomi
  function tinted(im, color) {
    const s = im.width;
    const c = crop(im, 0, 0, s, s); const g = c.getContext('2d');
    g.globalCompositeOperation = 'multiply'; g.fillStyle = color; g.fillRect(0, 0, s, s);
    g.globalCompositeOperation = 'destination-in'; g.drawImage(im, 0, 0, s, s, 0, 0, s, s);
    return c;
  }
  // copia il primo fotogramma quadrato di src sulla tela, adattandone la dimensione
  function put(cv, src, alpha) {
    const s = src.width;
    cv.width = s; cv.height = s;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.globalAlpha = alpha || 1;
    g.drawImage(src, 0, 0, s, s, 0, 0, s, s);
    g.globalAlpha = 1;
  }

  function loadPack() {
    const P = WD.packData;
    if (!P) return Promise.resolve(false);
    const names = Object.keys(P);
    return Promise.all(names.map(n => loadImg(P[n]))).then(list => {
      const im = {};
      names.forEach((n, i) => { if (list[i]) im[n] = list[i]; });
      const blocks = {
        GRASS: 'grass_block_side', DIRT: 'dirt', STONE: 'stone', COBBLE: 'cobblestone', BEDROCK: 'bedrock',
        LOG: 'oak_log', PLANKS: 'oak_planks', GLASS: 'glass', BOOKSHELF: 'bookshelf', CRAFTING: 'crafting_table_front',
        ENCHANT: 'enchanting_table_side', DIAMOND_BLOCK: 'diamond_block', GOLD_BLOCK: 'gold_block', EMERALD_BLOCK: 'emerald_block',
        COAL_ORE: 'coal_ore', IRON_ORE: 'iron_ore', GOLD_ORE: 'gold_ore', DIAMOND_ORE: 'diamond_ore', BRICK: 'bricks',
        WOOL_WHITE: 'white_wool', WOOL_RED: 'red_wool', OBSIDIAN: 'obsidian',
        POPPY: 'poppy', DANDELION: 'dandelion', TORCH: 'torch',
        GLOWSTONE: 'glowstone', WEB: 'web', EMERALD_ORE: 'emerald_ore', MOSSY: 'cobblestone_mossy',
        LAPIS_ORE: 'lapis_ore', REDSTONE_ORE: 'redstone_ore', LADDER: 'ladder',
        MUSHROOM_RED: 'mushroom_red', MUSHROOM_BROWN: 'mushroom_brown'
      };
      Object.keys(blocks).forEach(k => { if (im[blocks[k]]) put(tex[B[k]], im[blocks[k]]); });
      if (im.oak_leaves) put(tex[B.LEAVES], tinted(im.oak_leaves, '#62a83a'));
      if (im.grass) put(tex[B.TALLGRASS], tinted(im.grass, '#7cbd4a'));
      if (im.fern) put(tex[B.FERN], tinted(im.fern, '#5f9e3a'));
      if (im.vine) put(tex[B.VINE], tinted(im.vine, '#4a8f28'));
      if (im.waterlily) put(tex[B.LILY], tinted(im.waterlily, '#208030'));
      // crepe di rottura (10 fasi)
      entity.destroy = [];
      for (let i = 0; i < 10; i++) if (im['destroy_' + i]) entity.destroy.push(im['destroy_' + i]);
      if (im.water_still) put(tex[B.WATER], im.water_still, 0.85);
      if (im.beacon && im.glass) {
        const R = im.glass.width, cv = tex[B.BEACON];
        cv.width = cv.height = R;
        const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
        // come il modello del gioco: base di ossidiana, nucleo luminoso e guscio di vetro
        const q = R / 16;
        if (im.obsidian) g.drawImage(im.obsidian, 2 * q, 13 * q, 12 * q, 3 * q, 2 * q, 13 * q, 12 * q, 3 * q);
        g.drawImage(im.beacon, 3 * q, 2 * q, 10 * q, 11 * q);
        g.drawImage(im.glass, 0, 0, R, R);
      }
      // baule: ricomposto dalla texture del modello (coperchio, base e gancio)
      if (im.chest) {
        const k = im.chest.width / 64, cv = tex[B.CHEST];
        cv.width = cv.height = 16 * k;
        const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
        g.drawImage(im.chest, 42 * k, 14 * k, 14 * k, 5 * k, 0, 0, 16 * k, 5 * k);
        g.drawImage(im.chest, 42 * k, 33 * k, 14 * k, 10 * k, 0, 5 * k, 16 * k, 11 * k);
        g.drawImage(im.chest, 1 * k, 1 * k, 2 * k, 4 * k, 7 * k, 3 * k, 2 * k, 4 * k);
      }
      // entità (cartello, ocelot) disegnate dal motore di gioco
      entity.sign = im.sign || null;
      entity.ocelot = im.ocelot || null;
      entity.xp = im.xp_orb || null;
      entity.sun = im.sun || null;
      entity.moon = im.moon || null;
      entity.beam = im.beacon_beam || null;
      if (im.sign) { const k = im.sign.width / 64; gui.signBoard = crop(im.sign, 2 * k, 2 * k, 24 * k, 12 * k); }
      if (im.glass_gray) put(items.glass_pane, im.glass_gray);
      // varianti della pietra per il logo
      if (im.stone) stoneVariants.forEach(v => put(v, im.stone));
      // oggetti
      const it = { book: 'book', ench_book: 'enchanted_book', compass: 'compass', pickaxe: 'diamond_pickaxe', emerald: 'emerald', diamond: 'diamond', sapling: 'oak_sapling' };
      Object.keys(it).forEach(k => { if (im[it[k]]) put(items[k], im[it[k]]); });
      // HUD: cuore pieno sopra il contenitore (stessa disposizione di icons.png, scalata)
      if (im.icons) {
        const k = im.icons.width / 256, h = hud.heart;
        h.width = h.height = 9 * k;
        const g = h.getContext('2d'); g.imageSmoothingEnabled = false;
        g.drawImage(im.icons, 16 * k, 0, 9 * k, 9 * k, 0, 0, 9 * k, 9 * k);
        g.drawImage(im.icons, 52 * k, 0, 9 * k, 9 * k, 0, 0, 9 * k, 9 * k);
        gui.xpEmpty = crop(im.icons, 0, 64 * k, 182 * k, 5 * k);
        gui.xpFull = crop(im.icons, 0, 69 * k, 182 * k, 5 * k);
      }
      if (im.widgets) {
        const k = im.widgets.width / 256;
        gui.k = k;
        gui.hotbar = crop(im.widgets, 0, 0, 182 * k, 22 * k);
        gui.hotbarSel = crop(im.widgets, 0, 22 * k, 24 * k, 24 * k);
        gui.btnDisabled = crop(im.widgets, 0, 46 * k, 200 * k, 20 * k);
        gui.btn = crop(im.widgets, 0, 66 * k, 200 * k, 20 * k);
        gui.btnHover = crop(im.widgets, 0, 86 * k, 200 * k, 20 * k);
      }
      // ricalcola le versioni scure dello sfondo
      tex.forEach((t, i) => {
        if (!t || !texDark[i]) return;
        const d = texDark[i];
        d.width = t.width; d.height = t.height;
        const g = d.getContext('2d');
        g.drawImage(t, 0, 0);
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = 'rgba(0,0,0,0.42)'; g.fillRect(0, 0, d.width, d.height);
        g.globalCompositeOperation = 'source-over';
      });
      Object.keys(urlCache).forEach(k => delete urlCache[k]);
      WD.packLoaded = true;
      return true;
    });
  }

  function packUi() {
    if (!WD.packLoaded) return;
    const root = document.documentElement.style;
    const set = (k, c) => { if (c) root.setProperty(k, `url(${c.toDataURL()})`); };
    set('--pk-btn', gui.btn); set('--pk-btn-hover', gui.btnHover); set('--pk-btn-off', gui.btnDisabled);
    set('--pk-hotbar', gui.hotbar); set('--pk-hotbar-sel', gui.hotbarSel);
    set('--pk-sign', gui.signBoard);
    set('--pk-xp-empty', gui.xpEmpty); set('--pk-xp-full', gui.xpFull);
    root.setProperty('--pk-slice', String(3 * (gui.k || 1)));
    document.documentElement.classList.add('pack');
  }

  WD.tex = { B, tex, texDark, solid, items, hud, entity, faces, stoneVariants, url, uiTextures, loadPack, packUi, rng, canvas, S };
})();
