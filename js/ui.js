/* HUD e finestre di gioco (libro, inventario, incantesimi, scambi...) */
(function () {
  'use strict';
  const WD = window.WD;
  const D = WD.data;
  const $ = s => document.querySelector(s);

  const COLORS = { 0: '#000000', 1: '#0000aa', 2: '#00aa00', 3: '#00aaaa', 4: '#aa0000', 5: '#aa00aa', 6: '#ffaa00', 7: '#aaaaaa', 8: '#555555', 9: '#5555ff', a: '#55ff55', b: '#55ffff', c: '#ff5555', d: '#ff55ff', e: '#ffff55', f: '#ffffff' };
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  // converte i codici colore "§x" in HTML
  function fmt(text) {
    const parts = String(text).split('§');
    let out = esc(parts[0]);
    for (let i = 1; i < parts.length; i++) {
      const code = parts[i][0], rest = parts[i].slice(1);
      out += COLORS[code] ? `<span style="color:${COLORS[code]}">${esc(rest)}</span>` : esc(parts[i]);
    }
    return out;
  }

  /* ---------- HUD ---------- */
  function chat(text) {
    const log = $('#chatLog');
    const line = document.createElement('div');
    line.className = 'chat-line';
    line.innerHTML = fmt(text);
    log.appendChild(line);
    while (log.children.length > 60) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
    setTimeout(() => line.classList.add('fade'), 10000);
  }
  function clearChat() { $('#chatLog').innerHTML = ''; }

  function toast(adv) {
    WD.audio.play('toast');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<img src="${WD.tex.url(adv.icon)}" alt=""><div><div class="t1">Progresso raggiunto!</div><div class="t2">${esc(adv.name)}</div></div>`;
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), 5200);
  }

  let titleTimer;
  function title(main, sub) {
    const el = $('#titleText');
    el.querySelector('.t-main').textContent = main;
    el.querySelector('.t-sub').textContent = sub || '';
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(titleTimer);
    titleTimer = setTimeout(() => el.classList.remove('show'), 3000);
  }

  function prompt(label) {
    const el = $('#prompt');
    if (!label) { el.classList.add('hidden'); return; }
    el.innerHTML = `<span class="key">F</span>${esc(label)}`;
    el.classList.remove('hidden');
  }

  function xp(level, frac) {
    $('#xpFill').style.width = Math.round(frac * 100) + '%';
    const l = $('#xpLevel');
    l.textContent = level;
    l.style.visibility = level > 0 ? 'visible' : 'hidden';
  }

  function hearts() {
    const h = $('#hearts'); h.innerHTML = '';
    for (let i = 0; i < 10; i++) { const im = document.createElement('img'); im.src = WD.tex.url('heart'); im.alt = ''; h.appendChild(im); }
  }
  function coffee(n) {
    const c = $('#coffee'); c.innerHTML = '';
    for (let i = 0; i < 10; i++) {
      const im = document.createElement('img'); im.src = WD.tex.url('coffee'); im.alt = '';
      if (i >= n) im.className = 'empty';
      c.appendChild(im);
    }
    c.title = `Livello caffè: ${n}/10`;
  }

  /* ---------- Hotbar ---------- */
  // come nei server: la bussola apre il navigatore, il caffè ricarica la barra
  const HOTBAR = [
    { icon: 'compass', name: '§aNavigatore §7(tasto destro)', use: 'nav', tip: ['§aNavigatore', '§7Tasto destro (o F) per scegliere', '§7dove teletrasportarti'] },
    null, null, null, null, null, null, null,
    { icon: 'coffee', name: '§fTazza di caffè §7(tasto destro)', use: 'coffee', tip: ['§fTazza di caffè', '§7Ripristina il livello di caffè'] }
  ];
  let selected = 0, nameTimer;
  function buildHotbar() {
    const hb = $('#hotbar'); hb.innerHTML = '';
    HOTBAR.forEach((it, i) => {
      const s = document.createElement('div');
      s.className = 'hb-slot' + (i === selected ? ' sel' : '');
      s.innerHTML = `<span class="num">${i + 1}</span>` + (it ? `<img src="${WD.tex.url(it.icon)}" alt="${esc(it.name)}">` : '');
      s.addEventListener('click', () => clickSlot(i));
      hb.appendChild(s);
    });
  }
  function select(i) {
    selected = (i + 9) % 9;
    document.querySelectorAll('.hb-slot').forEach((s, k) => s.classList.toggle('sel', k === selected));
    const it = HOTBAR[selected];
    const n = $('#itemName');
    n.innerHTML = it ? fmt(it.name) : '';
    n.classList.add('show');
    clearTimeout(nameTimer);
    nameTimer = setTimeout(() => n.classList.remove('show'), 1800);
  }
  // clic sulla hotbar: seleziona; un secondo clic (o un tocco) usa l'oggetto
  function clickSlot(i) {
    if (isBlocking()) return;
    const was = selected === i;
    select(i);
    if (was || matchMedia('(pointer:coarse)').matches) useHeld();
  }
  // "tasto destro" con l'oggetto in mano
  function useHeld() {
    if (isBlocking()) return;
    const it = HOTBAR[selected];
    if (!it) return;
    if (it.use === 'coffee') WD.game.drinkCoffee();
    else if (it.use === 'nav') navigator();
    else if (it.use === 'mine') chat('§7Tieni premuto il tasto sinistro (o il dito) su un blocco per scavare.');
  }

  /* ---------- Bauli (GUI tipo baule con oggetti cliccabili) ---------- */
  function chestGui(title, slots, cls) {
    let cells = '';
    for (let i = 0; i < 27; i++) {
      const it = slots[i];
      const lines = it ? [it.name].concat(it.lore || []) : null;
      cells += it
        ? `<div class="slot${it.onClick ? ' nav-item' : ''}" data-i="${i}" data-tip="${esc(JSON.stringify(lines))}"><img src="${WD.tex.url(it.icon)}" alt="">${it.count ? `<b class="cnt">${it.count}</b>` : ''}</div>`
        : '<div class="slot"></div>';
    }
    const hb = HOTBAR.map(h => h ? slotHTML(h.icon, h.tip) : '<div class="slot"></div>').join('');
    const el = open(`<h3>${esc(title)}</h3><div class="slots">${cells}</div>
      <div class="inv-label">Inventario</div><div class="slots">${hb}</div>`, cls || 'panel-nav');
    bindTips(el);
    el.querySelectorAll('[data-i]').forEach(sl => {
      const it = slots[+sl.dataset.i];
      if (it.onClick) sl.addEventListener('click', () => it.onClick(sl));
    });
    return el;
  }
  // baule del minatore: il piccone si prende cliccandolo
  let pickTaken = false;
  function mineChest() {
    WD.audio.play('click');
    const slots = {};
    if (!pickTaken) {
      slots[13] = {
        icon: 'pickaxe', name: '§bPiccone di diamante', lore: ['§7Qualcuno l\'ha lasciato qui...', '', '§eClicca per prenderlo'],
        onClick: () => {
          pickTaken = true;
          setSlot(1, { icon: 'pickaxe', name: '§bPiccone di diamante', use: 'mine', tip: ['§bPiccone di diamante', '§7Tieni premuto il tasto sinistro', '§7(o il dito) su un blocco per scavare'] });
          select(1);
          closeGui();
          WD.audio.play('pop');
          WD.game.givePick();
          chat('§7Hai preso il §bPiccone di diamante§7! Tienilo in mano (tasto §f2§7) e tieni premuto su un blocco per scavare.');
          chat('§8Si dice che sotto la miniera ci sia qualcosa di speciale...');
        }
      };
    }
    chestGui('Baule del minatore', slots);
  }
  // baule del tesoro nella caverna
  function treasure() {
    WD.audio.play('levelup');
    const slots = {
      10: { icon: 'diamond', name: '§bDiamanti', count: 64, lore: ['§7Per chi scava a fondo'] },
      12: { icon: 'emerald', name: '§aSmeraldi', count: 32, lore: ['§7Buoni per uno scambio con Daniele'] },
      13: { icon: 'book', name: '§eLettera', lore: ['§7Clicca per leggerla'], onClick: letter },
      14: { icon: 'coffee', name: '§fCaffè del minatore', lore: ['§7Ricarica al 100%'], onClick: () => { closeGui(); WD.game.drinkCoffee(); } },
      16: { icon: 'ench_book', name: '§dLibro incantato', lore: ['§7Curiosità V', '§7Esplorazione III'] }
    };
    chestGui('Tesoro nascosto', slots);
  }
  function letter() {
    WD.audio.play('page');
    open(`<div class="book-page letter">
      <p>“Twenty years from now you will be more disappointed by the things that you didn't do than by the ones you did do. So throw off the bowlines. Sail away from the safe harbor. Catch the trade winds in your sails. Explore. Dream. Discover.”</p>
      <p class="letter-sign">— Unknown</p></div>`, 'panel-book');
  }
  function setSlot(i, it) { HOTBAR[i] = it; buildHotbar(); }
  function heldIcon() { const it = HOTBAR[selected]; return it ? it.icon : null; }
  function heldUse() { const it = HOTBAR[selected]; return it ? it.use : null; }


  /* ---------- Navigatore (GUI tipo baule, come nei server) ---------- */
  function navigator() {
    WD.audio.play('click');
    const NAV = {
      4: { icon: 'compass', name: '§eNavigatore', lore: ['§7Scegli dove teletrasportarti'] },
      10: { icon: 'grass_block', name: '§aSpawn', lore: ['§7Il punto di partenza'], tp: 'spawn' },
      11: { icon: 'book', name: '§aChi Sono', lore: ['§7La casa con il libro', '§7e il quadro di Daniele'], tp: 'about' },
      12: { icon: 'crafting', name: '§aCompetenze', lore: ['§7Competenze tecniche', '§7e soft skills'], tp: 'skills' },
      14: { icon: 'pickaxe', name: '§bEsperienza', lore: ['§7Il percorso dal 2016 a oggi'], tp: 'exp' },
      15: { icon: 'emerald', name: '§aContatti', lore: ['§7Fai uno scambio con Daniele'], tp: 'contact' },
      16: { icon: 'obsidian', name: '§5Confini del mondo', lore: ['§7...per ora!'], tp: 'end' }
    };
    // le tappe dell'esperienza, in ordine cronologico
    [20, 21, 22, 23, 24].forEach((slot, i) => {
      const m = D.timeline[i];
      NAV[slot] = { icon: m.icon, name: '§e' + m.title, lore: ['§7' + m.company, '§8' + m.date], tp: 'm' + i };
    });
    let cells = '';
    for (let i = 0; i < 27; i++) {
      const it = NAV[i];
      const lines = it ? [it.name].concat(it.lore, it.tp ? ['', '§eClicca per teletrasportarti'] : []) : [' '];
      const tp = it && it.tp ? ` data-tp="${it.tp}"` : '';
      cells += `<div class="slot${tp ? ' nav-item' : ''}" data-tip="${esc(JSON.stringify(lines))}"${tp}><img src="${WD.tex.url(it ? it.icon : 'glass_pane')}" alt=""></div>`;
    }
    const hb = HOTBAR.map(h => h ? slotHTML(h.icon, h.tip) : '<div class="slot"></div>').join('');
    const el = open(`<h3>Navigatore</h3><div class="slots nav-grid">${cells}</div>
      <div class="inv-label">Inventario</div><div class="slots">${hb}</div>`, 'panel-nav');
    bindTips(el);
    el.querySelectorAll('[data-tp]').forEach(sl => sl.addEventListener('click', () => {
      const name = JSON.parse(sl.dataset.tip)[0];
      closeGui();
      WD.game.teleport(sl.dataset.tp);
      chat('§7Teletrasportato a ' + name);
    }));
  }

  /* ---------- Finestre ---------- */
  let gui = null, onClose = null;
  function isBlocking() { return !!gui || chatOpen || WD.game.state.paused; }
  function open(html, cls, close) {
    closeGui(true);
    const layer = $('#gui');
    layer.innerHTML = `<div class="panel ${cls || ''}" role="dialog">${html}<button class="x-btn" aria-label="Chiudi">✕</button></div>`;
    layer.classList.remove('hidden');
    gui = layer.firstElementChild;
    onClose = close || null;
    gui.querySelector('.x-btn').addEventListener('click', () => { WD.audio.play('click'); closeGui(); });
    WD.game.input.left = WD.game.input.right = WD.game.input.jump = false;
    return gui;
  }
  function closeGui(silent) {
    hideTip();
    if (!gui) return false;
    $('#gui').classList.add('hidden');
    $('#gui').innerHTML = '';
    gui = null;
    if (onClose && !silent) onClose();
    onClose = null;
    return true;
  }
  $('#gui').addEventListener('click', e => { if (e.target.id === 'gui') closeGui(); });

  function sign(lines) {
    WD.audio.play('page');
    open(`<div class="sign-board">${lines.map(l => `<div>${esc(l)}</div>`).join('')}</div>`, 'panel-sign');
  }

  function book(startPage) {
    const pages = [
      `<img class="book-photo" src="${D.photo}" alt="Daniele Wolski sul ring">
       <h3 class="book-h">${esc(D.name)}</h3>
       <p class="book-role">${esc(D.role)}</p>
       <p>${esc(D.tagline)}</p>
       <p class="book-meta">📍 ${esc(D.location)}<br>⭐ ${esc(D.yearsExp)} anni di esperienza</p>`,
      `<h3 class="book-h">Chi sono</h3><p>${esc(D.about[0])}</p>`,
      `<h3 class="book-h">Il percorso</h3><p>${esc(D.about[1])}</p>`,
      `<h3 class="book-h">Tempo libero</h3><p>${esc(D.about[2])}</p><img class="book-photo wide" src="${D.photo}" alt="In palestra, sul ring">`
    ];
    let p = Math.min(startPage || 0, pages.length - 1);
    const el = open(`<div class="book-page"></div>
      <div class="book-nav"><button class="arrow prev" aria-label="Pagina precedente">◀</button><span class="page-num"></span><button class="arrow next" aria-label="Pagina successiva">▶</button></div>`, 'panel-book');
    const render = () => {
      el.querySelector('.book-page').innerHTML = pages[p];
      el.querySelector('.page-num').textContent = `Pagina ${p + 1} di ${pages.length}`;
      el.querySelector('.prev').style.visibility = p > 0 ? 'visible' : 'hidden';
      el.querySelector('.next').style.visibility = p < pages.length - 1 ? 'visible' : 'hidden';
    };
    el.querySelector('.prev').addEventListener('click', () => { if (p > 0) { p--; WD.audio.play('page'); render(); } });
    el.querySelector('.next').addEventListener('click', () => { if (p < pages.length - 1) { p++; WD.audio.play('page'); render(); } });
    el.bookNav = d => { const np = p + d; if (np >= 0 && np < pages.length) { p = np; WD.audio.play('page'); render(); } };
    render();
  }

  // dove compare ogni competenza nel percorso
  function usedIn(name) {
    const alias = { 'VS Code': 'Visual Studio Code' };
    return D.timeline.filter(m => m.tags.includes(name) || m.tags.includes(alias[name])).map(m => m.company === 'Attestato' ? 'Corso Microsoft' : m.title === 'Perito Informatico' ? 'Diploma' : m.title.startsWith('Corso Sincrono') ? 'PCTO Sincrono' : m.company);
  }
  function skillTip(s, cat) {
    const where = usedIn(s.name);
    return [`§f${s.name}`, `§7${cat}`].concat(where.length ? ['', '§9Usato in:'].concat([...new Set(where)].map(w => '§9 ' + w)) : []);
  }

  function slotHTML(icon, tipLines, extra) {
    return `<div class="slot${extra ? ' ' + extra : ''}" data-tip="${esc(JSON.stringify(tipLines))}">${icon ? `<img src="${WD.tex.url(icon)}" alt="">` : ''}</div>`;
  }
  function row(itemsHTML) {
    let h = itemsHTML.join('');
    for (let i = itemsHTML.length; i < 9; i++) h += '<div class="slot"></div>';
    return `<div class="slots">${h}</div>`;
  }

  function inventory() {
    WD.audio.play('click');
    const fw = D.skills.framework, tl = D.skills.tools;
    const fwRow = fw.items.map(s => slotHTML('sk_' + s.id, skillTip(s, fw.title)));
    const tlRow = tl.items.map(s => slotHTML('sk_' + s.id, skillTip(s, tl.title)));
    const hb = HOTBAR.map(h => h ? slotHTML(h.icon, h.tip) : '<div class="slot"></div>');
    const el = open(`
      <h3>Inventario · Competenze tecniche</h3>
      <div class="inv-top">
        <div class="inv-player"><canvas width="64" height="96" id="invPlayer"></canvas></div>
        <div class="inv-info"><p>Passa il mouse (o tocca) un oggetto per i dettagli.</p>${slotHTML('ench_book', ['§bSoft Skills', '§7Libro incantato'].concat(D.softSkills.map(s => '§7' + s)), 'glint')}</div>
      </div>
      <div class="inv-label">${esc(fw.title)}</div>${row(fwRow)}
      <div class="inv-label">${esc(tl.title)}</div>${row(tlRow)}
      <div class="inv-gap"></div>${row(hb)}
      `, 'panel-inv');
    drawInvPlayer(el.querySelector('#invPlayer'));
    bindTips(el);
  }
  function drawInvPlayer(c) {
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    if (WD.opts.steve && WD.game.steve.ok) { WD.game.drawSkin(g, 32, 96, 3, 0, false, WD.game.steve); return; }
    const u = 3, cx = 32, fy = 96;
    g.fillStyle = '#2e3a5c'; g.fillRect(cx - 4 * u, fy - 12 * u, 8 * u, 12 * u);
    g.fillStyle = '#2a2a2a'; g.fillRect(cx - 4 * u, fy - 2 * u, 8 * u, 2 * u);
    g.fillStyle = '#3c8527'; g.fillRect(cx - 4 * u, fy - 24 * u, 8 * u, 12 * u);
    g.fillStyle = '#2c6a1c'; g.fillRect(cx - 8 * u, fy - 24 * u, 4 * u, 12 * u); g.fillRect(cx + 4 * u, fy - 24 * u, 4 * u, 12 * u);
    g.fillStyle = '#c58c69'; g.fillRect(cx - 8 * u, fy - 15 * u, 4 * u, 3 * u); g.fillRect(cx + 4 * u, fy - 15 * u, 4 * u, 3 * u);
    g.drawImage(WD.tex.faces.guest, cx - 4 * u, fy - 32 * u, 8 * u, 8 * u);
  }

  function enchant() {
    WD.audio.play('click');
    const runes = Array.from('ᔑʖᓵ↸ᒷ⎓⊣⍑╎⋮ꖌꖎᒲリ!¡ᑑ∷ᓭℸ⚍⍊∴/|⨅');
    const rune = n => { let s = ''; for (let i = 0; i < n; i++) s += runes[Math.random() * runes.length | 0]; return s; };
    const roman = ['I', 'II', 'III', 'IV', 'V'];
    const el = open(`
      <h3>Tavolo da incantesimi · Soft skills</h3>
      <div class="ench-wrap">
        <div class="ench-left">${slotHTML('ench_book', ['§bLibro delle soft skills'], 'glint')}<div class="ench-lapis">${D.softSkills.length}</div></div>
        <div class="ench-list">
          ${D.softSkills.map((s, i) => `<div class="ench-row" style="animation-delay:${i * 0.08}s"><span class="runes">${rune(10)}</span><span class="ench-name">${esc(s)} ${roman[4]}</span><span class="ench-lvl">${i + 1}</span></div>`).join('')}
        </div>
      </div>
      <p class="ench-note">Livello massimo raggiunto in tutti gli incantesimi.</p>`, 'panel-ench');
    bindTips(el);
  }

  function milestone(m) {
    WD.audio.play('click');
    open(`
      <div class="ms-head"><img src="${WD.tex.url(m.icon)}" alt=""><div><div class="ms-type">${esc(m.type)} · ${esc(m.date)}</div><h3>${esc(m.title)}</h3><div class="ms-company">${esc(m.company)}</div></div></div>
      <p class="ms-desc">${esc(m.desc)}</p>
      ${m.tags.length ? `<div class="inv-label">Tecnologie</div>
      <div class="tags">${m.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}`, 'panel-ms');
  }

  function trade() {
    WD.audio.play('hmm');
    const trades = [
      { give: 'emerald', getIcon: 'book', title: 'Email', sub: D.email, href: 'mailto:' + D.email },
      { give: 'emerald', getIcon: 'sk_github', title: 'GitHub', sub: 'github.com/Danielewolski', href: D.github },
      { give: 'diamond', getIcon: 'ench_book', title: 'LinkedIn', sub: 'linkedin.com/in/daniele-wolski', href: D.linkedin }
    ];
    const el = open(`
      <div class="trade-head">
        <div class="trade-skins"><canvas width="40" height="72" class="sk-front"></canvas><canvas width="40" height="72" class="sk-back"></canvas></div>
        <h3>Scambi · ${esc(D.nick)} <span class="lvl">Front-End Web Developer</span></h3>
      </div>
      <p class="trade-intro">«Sono sempre interessato a nuove opportunità e collaborazioni. Non esitare a contattarmi!»</p>
      <div class="trades">
        ${trades.map(t => `<a class="trade" href="${esc(t.href)}" ${t.href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>
          <span class="slot sm"><img src="${WD.tex.url(t.give)}" alt=""><b class="cnt">1</b></span>
          <span class="trade-arrow">➜</span>
          <span class="slot sm"><img src="${WD.tex.url(t.getIcon)}" alt=""></span>
          <span class="trade-txt"><b>${esc(t.title)}</b><small>${esc(t.sub)}</small></span>
        </a>`).join('')}
      </div>
      <p class="trade-loc">📍 ${esc(D.location)}</p>`, 'panel-trade');
    [['.sk-front', false], ['.sk-back', true]].forEach(([sel, back]) => {
      const c = el.querySelector(sel);
      WD.game.drawSkin(c.getContext("2d"), 20, 68, 2, 0, back);
    });
    el.querySelectorAll('.trade').forEach(a => a.addEventListener('click', () => {
      WD.audio.play('levelup');
      WD.ui.chat(`§e<${D.nick}>§f Affare fatto! A presto 😉`);
    }));
  }

  function advancements() {
    const A = WD.game.ADV, got = WD.game.state.adv;
    const keys = Object.keys(A);
    open(`<h3>Progressi · ${keys.filter(k => got[k]).length}/${keys.length}</h3>
      <div class="adv-grid">${keys.map(k => `<div class="adv ${got[k] ? 'got' : ''}"><img src="${WD.tex.url(A[k].icon)}" alt=""><div><b>${got[k] ? esc(A[k].name) : '???'}</b><small>${A[k].hidden && !got[k] ? 'Progresso segreto' : esc(A[k].desc)}</small></div></div>`).join('')}</div>`, 'panel-adv');
  }

  /* ---------- Tooltip ---------- */
  const tip = $('#tooltip');
  function showTip(lines, x, y) {
    tip.innerHTML = lines.map((l, i) => `<div class="${i === 0 ? 'tt-name' : ''}">${l ? fmt(l) : '&nbsp;'}</div>`).join('');
    tip.classList.remove('hidden');
    const r = tip.getBoundingClientRect();
    let tx = x + 14, ty = y - 10;
    if (tx + r.width > window.innerWidth - 4) tx = x - r.width - 14;
    if (ty + r.height > window.innerHeight - 4) ty = window.innerHeight - r.height - 4;
    tip.style.left = Math.max(4, tx) + 'px'; tip.style.top = Math.max(4, ty) + 'px';
  }
  function hideTip() { tip.classList.add('hidden'); }
  function bindTips(root) {
    root.querySelectorAll('[data-tip]').forEach(s => {
      const lines = JSON.parse(s.dataset.tip);
      s.addEventListener('mousemove', e => showTip(lines, e.clientX, e.clientY));
      s.addEventListener('mouseleave', hideTip);
      s.addEventListener('click', e => {
        e.stopPropagation();
        const r = s.getBoundingClientRect();
        showTip(lines, r.right, r.top);
        WD.audio.play('click');
      });
    });
  }

  /* ---------- Chat ---------- */
  let chatOpen = false;
  function openChat(prefix) {
    chatOpen = true;
    $('#chat').classList.add('open');
    $('#chatForm').classList.remove('hidden');
    const inp = $('#chatInput');
    inp.value = prefix || '';
    WD.game.input.left = WD.game.input.right = WD.game.input.jump = false;
    setTimeout(() => inp.focus(), 0);
  }
  function closeChat() {
    chatOpen = false;
    $('#chat').classList.remove('open');
    $('#chatForm').classList.add('hidden');
    $('#chatInput').blur();
  }
  $('#chatForm').addEventListener('submit', e => {
    e.preventDefault();
    const v = $('#chatInput').value.trim();
    closeChat();
    if (!v) return;
    if (v.startsWith('/')) { WD.ui.chat('§7' + v); WD.game.command(v); }
    else WD.game.chatMessage(v);
  });

  WD.ui = {
    fmt, chat, clearChat, toast, title, prompt, xp, hearts, coffee, buildHotbar, select, clickSlot, useHeld, navigator, mineChest, treasure, setSlot, heldIcon, heldUse,
    sign, book, inventory, enchant, milestone, trade, advancements,
    open, closeGui, isBlocking, openChat, closeChat,
    get chatOpen() { return chatOpen; },
    get gui() { return gui; },
    get selected() { return selected; }
  };
})();
