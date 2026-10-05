/* Logo a blocchi "WOLSKIDEV" e panorama animato della schermata principale */
(function () {
  'use strict';
  const WD = window.WD;
  const { B, tex, stoneVariants, rng, canvas } = WD.tex;

  /* ---------- Logo ---------- */
  const GLYPHS = {
    W: ['#...#', '#...#', '#.#.#', '#.#.#', '.#.#.'],
    O: ['####', '#..#', '#..#', '#..#', '####'],
    L: ['#...', '#...', '#...', '#...', '####'],
    S: ['####', '#...', '####', '...#', '####'],
    K: ['#..#', '#.#.', '##..', '#.#.', '#..#'],
    I: ['###', '.#.', '.#.', '.#.', '###'],
    D: ['###.', '#..#', '#..#', '#..#', '###.'],
    E: ['####', '#...', '###.', '#...', '####'],
    V: ['#...#', '#...#', '#...#', '.#.#.', '..#..']
  };

  function drawLogo(cv, word) {
    const glyphs = word.split('').map(ch => GLYPHS[ch]);
    let cols = 0;
    glyphs.forEach((g, i) => { cols += g[0].length + (i ? 1 : 0); });
    const maxW = Math.min(window.innerWidth * 0.92, 860);
    const b = Math.max(5, Math.floor(maxW / (cols + 0.8)));
    const ex = Math.max(2, Math.round(b * 0.42));
    const dpr = window.devicePixelRatio || 1;
    const w = cols * b + ex + 6, h = 5 * b + ex + 6;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, w, h);

    const cells = [];
    let ox = 0;
    glyphs.forEach(gl => {
      gl.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (row[x] === '#') cells.push([ox + x, y]); });
      ox += gl[0].length + 1;
    });
    const o = 3;
    // contorno nero
    g.fillStyle = '#000';
    for (let k = 0; k <= ex; k++) cells.forEach(([x, y]) => g.fillRect(o + x * b + k - 2, o + y * b + k - 2, b + 4, b + 4));
    // estrusione 3D
    for (let k = ex; k >= 1; k--) {
      g.fillStyle = k === ex ? '#1c1c1c' : (k % 3 === 0 ? '#3a3a3a' : '#444');
      cells.forEach(([x, y]) => g.fillRect(o + x * b + k, o + y * b + k, b, b));
    }
    // facce frontali in pietra
    cells.forEach(([x, y], i) => {
      const X = o + x * b, Y = o + y * b;
      g.drawImage(stoneVariants[(x * 7 + y * 13) % stoneVariants.length], X, Y, b, b);
      const t = Math.max(1, Math.round(b / 12));
      g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(X, Y, b, t); g.fillRect(X, Y, t, b);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(X, Y + b - t, b, t); g.fillRect(X + b - t, Y, t, b);
    });
    // luce dall'alto
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(255,255,255,0.12)'); grad.addColorStop(1, 'rgba(0,0,0,0.18)');
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
  }

  /* ---------- Panorama ---------- */
  const PW = 128, PH = 36, WATER = 24;
  let pano = null, scroll = 0, clouds = [];

  function buildPanorama() {
    const r = rng(77);
    const c = canvas(PW * 16, PH * 16);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    const TAU = Math.PI * 2;
    const hgt = [];
    for (let x = 0; x < PW; x++) {
      const t = x / PW;
      hgt[x] = Math.round(21 + 3 * Math.sin(TAU * t * 3) + 2 * Math.sin(TAU * t * 7 + 1) + 1.2 * Math.sin(TAU * t * 13 + 2));
    }
    const put = (id, x, y) => { if (tex[id]) g.drawImage(tex[id], x * 16, y * 16, 16, 16); };
    for (let x = 0; x < PW; x++) {
      const h = hgt[x];
      for (let y = h; y < PH; y++) {
        let id = y === h ? (h >= WATER ? B.DIRT : B.GRASS) : y < h + 3 ? B.DIRT : B.STONE;
        if (id === B.STONE && r() < 0.04) id = B.COAL_ORE;
        put(id, x, y);
      }
      for (let y = WATER; y < h; y++) put(B.WATER, x, y);
    }
    // alberi
    for (let x = 3; x < PW - 3; x += 5 + (r() * 6 | 0)) {
      const h = hgt[x];
      if (h >= WATER) continue;
      const th = 4 + (r() * 2 | 0);
      for (let k = 1; k <= th; k++) put(B.LOG, x, h - k);
      const top = h - th;
      for (let dy = -2; dy <= 1; dy++) {
        const rad = dy <= -2 ? 1 : 2;
        for (let dx = -rad; dx <= rad; dx++) {
          if (dx === 0 && dy >= 0) continue;
          if (Math.abs(dx) === 2 && (dy === -1 || dy === 1) && r() < 0.5) continue;
          put(B.LEAVES, x + dx, top + dy);
        }
      }
    }
    // fiori
    for (let x = 0; x < PW; x++) {
      if (hgt[x] < WATER && r() < 0.25) put([B.TALLGRASS, B.POPPY, B.DANDELION][r() * 3 | 0], x, hgt[x] - 1);
    }
    pano = c;
    clouds = [];
    for (let i = 0; i < 9; i++) clouds.push({ x: r() * 2000, y: 20 + r() * 140, w: 80 + r() * 160, h: 18 + r() * 14 });
  }

  function renderPanorama(cv, dt) {
    if (!pano) buildPanorama();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.round(cv.clientWidth * dpr), ch = Math.round(cv.clientHeight * dpr);
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const sky = g.createLinearGradient(0, 0, 0, ch);
    sky.addColorStop(0, '#6b9cf5'); sky.addColorStop(0.6, '#a9c9ff'); sky.addColorStop(1, '#c9dcff');
    g.fillStyle = sky; g.fillRect(0, 0, cw, ch);

    const scale = Math.max(1, ch / (PH * 16));
    const pw = Math.round(pano.width * scale), ph = Math.round(pano.height * scale);
    scroll = (scroll + dt * 14 * scale) % pw;

    // nuvole
    g.fillStyle = 'rgba(255,255,255,0.85)';
    clouds.forEach(c => {
      c.x -= dt * 6;
      const wrapW = 2000 * scale;
      const x = ((c.x * scale - scroll * 0.4) % wrapW + wrapW) % wrapW - 200 * scale;
      g.fillRect(Math.round(x), Math.round(c.y * scale), Math.round(c.w * scale), Math.round(c.h * scale));
    });

    const y = ch - ph + Math.round(ph * 0.12);
    const x0 = -Math.round(scroll);
    for (let x = x0; x < cw; x += pw) g.drawImage(pano, x, y, pw, ph);
  }

  WD.title = { drawLogo, renderPanorama, panoramaCanvas: () => { if (!pano) buildPanorama(); return pano; } };
})();
