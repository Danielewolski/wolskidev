/* Flusso delle schermate, opzioni, input e loop principale */
(function () {
  'use strict';
  const WD = window.WD;
  const D = WD.data;
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  /* ---------- Opzioni (salvate nel browser) ---------- */
  const DEFAULTS = { music: true, musicMode: 'gen', sound: true, difficulty: 0, autojump: true, clouds: true, steve: true };
  WD.opts = Object.assign({}, DEFAULTS);
  try { Object.assign(WD.opts, JSON.parse(localStorage.getItem('wd-opts') || '{}')); } catch (e) { /* storage non disponibile */ }
  // musicMode: 'gen' (musica generativa), 'c418' (jukebox Bandcamp), 'off'; 'music' indica solo quella generativa
  WD.opts.music = WD.opts.musicMode === 'gen';
  function saveOpts() { try { localStorage.setItem('wd-opts', JSON.stringify(WD.opts)); } catch (e) { /* ignora */ } }

  const DIFF = [
    ['Pacifica', 'Nessun bug ostile in vista.'],
    ['Facile', 'Qualche bug, risolto prima di pranzo.'],
    ['Normale', 'Bug in produzione di venerdì pomeriggio.'],
    ['Difficile', 'Supporto a Internet Explorer 6. Buona fortuna.']
  ];
  const onOff = v => v ? 'SÌ' : 'NO';
  const MUSIC = { gen: 'Generativa', c418: 'C418 (jukebox)', off: 'NO' };
  function renderOpts() {
    $('[data-opt="music"]').textContent = `Musica: ${MUSIC[WD.opts.musicMode]}`;
    $('[data-opt="steve"]').textContent = `Skin ospite: ${WD.opts.steve ? 'Steve' : 'Classica'}`;
    $('[data-opt="sound"]').textContent = `Suoni: ${onOff(WD.opts.sound)}`;
    $('[data-opt="difficulty"]').textContent = `Difficoltà: ${DIFF[WD.opts.difficulty][0]}`;
    $('[data-opt="autojump"]').textContent = `Salto automatico: ${onOff(WD.opts.autojump)}`;
    $('[data-opt="clouds"]').textContent = `Nuvole: ${WD.opts.clouds ? 'Fantastiche' : 'Disattivate'}`;
    $('[data-opt="lang"]').textContent = 'Lingua: Italiano';
  }
  $$('[data-opt]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.opt, hint = $('#optHint');
    if (k === 'difficulty') { WD.opts.difficulty = (WD.opts.difficulty + 1) % DIFF.length; hint.textContent = DIFF[WD.opts.difficulty][1]; }
    else if (k === 'music') {
      const order = ['gen', 'c418', 'off'];
      WD.opts.musicMode = order[(order.indexOf(WD.opts.musicMode) + 1) % order.length];
      WD.opts.music = WD.opts.musicMode === 'gen';
      WD.opts.music ? WD.audio.startMusic() : WD.audio.stopMusic();
      jukebox(WD.opts.musicMode === 'c418', true);
      hint.textContent = WD.opts.musicMode === 'c418' ? 'Premi ▶ nel jukebox in basso a destra per ascoltare C418 (streaming da Bandcamp).' : '';
    }
    else if (k === 'lang') { hint.textContent = "Al momento è disponibile solo l'italiano 🇮🇹"; }
    else {
      WD.opts[k] = !WD.opts[k];
      hint.textContent = '';
    }
    saveOpts(); renderOpts();
  }));

  /* ---------- Jukebox (player ufficiale Bandcamp, caricato solo se scelto) ---------- */
  const jb = $('#jukebox');
  function jukebox(on, open) {
    const frame = jb.querySelector('.jb-frame');
    if (!on) { jb.classList.add('hidden'); jb.classList.remove('open'); frame.innerHTML = ''; return; }
    jb.classList.remove('hidden');
    if (!frame.firstChild) {
      const f = document.createElement('iframe');
      f.src = D.music.embed; f.title = `${D.music.artist} - ${D.music.album}`; f.setAttribute('seamless', '');
      frame.appendChild(f);
    }
    if (open !== undefined) jb.classList.toggle('open', open);
  }
  $('#jbToggle').addEventListener('click', () => jb.classList.toggle('open'));

  /* ---------- Schermate ---------- */
  let current = 'loading', optionsReturn = 'title';
  function show(name) {
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
    current = name;
    if (name === 'title') { newSplash(); WD.title.drawLogo($('#logo'), 'WOLSKIDEV'); }
    if (name === 'game') $('#jukebox').classList.remove('open');
    if (name === 'options') { $('#optHint').textContent = ''; renderOpts(); }
    const first = document.querySelector(`#screen-${name} .mc-btn:not([disabled])`);
    if (first && matchMedia('(pointer:fine)').matches) first.focus({ preventScroll: true });
  }

  function newSplash() {
    const s = D.splashes;
    $('#splash').textContent = s[Math.random() * s.length | 0];
  }
  $('#splash').addEventListener('click', () => { WD.audio.play('click'); newSplash(); });

  document.addEventListener('click', e => {
    WD.audio.unlock();
    WD.audio.startMusic();
    const go = e.target.closest('[data-go]');
    if (go) {
      WD.audio.play('click');
      if (go.dataset.go === 'options') optionsReturn = 'title';
      show(go.dataset.go);
      return;
    }
    const act = e.target.closest('[data-action]');
    if (act) { WD.audio.play('click'); action(act.dataset.action); }
  });

  function action(a) {
    switch (a) {
      case 'quick': join('main'); break;
      case 'join-world': join('world'); break;
      case 'join-server': join($('#serverList .selected').dataset.server); break;
      case 'direct': $('#directError').textContent = ''; show('direct'); setTimeout(() => $('#directInput').select(), 50); break;
      case 'refresh': refreshPing(); break;
      case 'options-done': show(optionsReturn); if (optionsReturn === 'game') openPause(); break;
      case 'quit-yes': goodbye(); break;
      case 'resume': closePause(); break;
      case 'advancements': closePause(); WD.ui.advancements(); break;
      case 'help': closePause(); WD.ui.openChat('/help'); break;
      case 'pause-options': optionsReturn = 'game'; $('#pause').classList.add('hidden'); show('options'); break;
      case 'night': WD.game.state.night = !WD.game.state.night; closePause(); break;
      case 'save-quit': closePause(); WD.game.stop(); show('title'); break;
    }
  }

  // lista server
  $$('#serverList .list-item').forEach(it => {
    it.addEventListener('click', () => { $$('#serverList .list-item').forEach(x => x.classList.remove('selected')); it.classList.add('selected'); });
    it.addEventListener('dblclick', () => join(it.dataset.server));
  });
  $('[data-join="world"]').addEventListener('dblclick', () => join('world'));
  $$('[data-fmt]').forEach(el => { el.innerHTML = WD.ui.fmt(el.dataset.fmt); });
  function refreshPing() {
    const p = $('[data-server="main"] .ping');
    p.classList.add('scanning');
    setTimeout(() => p.classList.remove('scanning'), 1200);
  }

  $('#directForm').addEventListener('submit', e => {
    e.preventDefault();
    const v = $('#directInput').value.trim().toLowerCase();
    if (/wolski/.test(v) || v === 'localhost' || v === '127.0.0.1') { WD.audio.play('click'); join('main'); }
    else { WD.audio.play('error'); $('#directError').textContent = `Impossibile connettersi a "${v || '?'}": server sconosciuto. Prova con wolskidev.site`; }
  });

  /* ---------- Ingresso nel mondo ---------- */
  function join(kind) {
    show('connecting');
    const steps = kind === 'world'
      ? [['Caricamento del mondo...', ''], ['Preparazione dello spawn...', '42%'], ['Preparazione dello spawn...', '100%']]
      : [['Connessione al server...', 'wolskidev.site'], ['Accesso in corso...', ''], ['Caricamento del terreno...', '']];
    steps.forEach(([t, s], i) => setTimeout(() => { $('#connText').textContent = t; $('#connSub').textContent = s; }, i * 600));
    setTimeout(() => {
      show('game');
      WD.game.start(kind === 'contact' ? 'contact' : kind);
    }, steps.length * 600 + 200);
  }

  function goodbye() {
    show('goodbye');
    $('#byeTitle').textContent = 'Salvataggio del mondo...';
    $('#byeBody').classList.add('hidden');
    setTimeout(() => {
      $('#byeTitle').textContent = 'Mondo salvato!';
      $('#byeBody').classList.remove('hidden');
    }, 1300);
  }
  const bm = $('#byeMail'); bm.href = 'mailto:' + D.email; bm.textContent = D.email;

  /* ---------- Pausa ---------- */
  function openPause() {
    WD.game.state.paused = true;
    $('#titleText').classList.remove('show');
    $('#pause').classList.remove('hidden');
    const b = $('#pause .mc-btn'); if (b && matchMedia('(pointer:fine)').matches) b.focus();
  }
  function closePause() { WD.game.state.paused = false; $('#pause').classList.add('hidden'); }
  $('#btnPause').addEventListener('click', e => { e.stopPropagation(); WD.audio.play('click'); openPause(); });
  $('#btnChat').addEventListener('click', e => { e.stopPropagation(); WD.ui.openChat(''); });
  $('#btnInv').addEventListener('click', e => { e.stopPropagation(); WD.ui.inventory(); WD.game.grant('skills'); });
  $('#prompt').addEventListener('click', () => WD.game.interact());

  /* ---------- Input ---------- */
  const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'jump', KeyW: 'jump', ArrowUp: 'jump', ArrowDown: 'down', KeyS: 'down', ShiftLeft: 'sprint', ShiftRight: 'sprint' };
  window.addEventListener('keydown', e => {
    WD.audio.unlock();
    if (current !== 'game') {
      if (e.key === 'Escape' && current !== 'title' && current !== 'loading') { WD.audio.play('click'); show(current === 'direct' ? 'multiplayer' : current === 'options' ? optionsReturn : 'title'); if (current === 'game') openPause(); }
      return;
    }
    const ui = WD.ui, st = WD.game.state;
    if (ui.chatOpen) { if (e.key === 'Escape') { e.preventDefault(); ui.closeChat(); } return; }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (ui.gui) ui.closeGui();
      else if (st.paused) closePause();
      else openPause();
      return;
    }
    if (ui.gui) {
      if (e.code === 'KeyE' || e.code === 'KeyF') ui.closeGui();
      if (ui.gui && ui.gui.bookNav) { if (e.key === 'ArrowRight') ui.gui.bookNav(1); if (e.key === 'ArrowLeft') ui.gui.bookNav(-1); }
      return;
    }
    if (st.paused) return;
    if (e.code === 'F3') { e.preventDefault(); st.debug = !st.debug; $('#debug').classList.toggle('hidden', !st.debug); return; }
    if (e.code === 'KeyT') { e.preventDefault(); ui.openChat(''); return; }
    if (e.key === '/') { e.preventDefault(); ui.openChat('/'); return; }
    if (e.code === 'KeyE') { ui.inventory(); WD.game.grant('skills'); return; }
    if (e.code === 'KeyF' || e.code === 'Enter') { if (!WD.game.interact()) ui.useHeld(); return; }
    if (/^Digit[1-9]$/.test(e.code)) { ui.select(+e.code.slice(5) - 1); return; }
    const k = KEYMAP[e.code];
    if (k) { e.preventDefault(); WD.game.input[k] = true; }
  });
  window.addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) WD.game.input[k] = false; });
  window.addEventListener('blur', () => { Object.keys(WD.game.input).forEach(k => { WD.game.input[k] = false; }); });
  $('#world').addEventListener('wheel', e => { if (!WD.ui.isBlocking()) WD.ui.select(WD.ui.selected + (e.deltaY > 0 ? 1 : -1)); }, { passive: true });
  // clic sinistro / dito: scava (con il piccone in mano) oppure interagisci;
  // tasto destro: interagisci o usa l'oggetto in mano (bussola, caffè)
  const world = $('#world');
  const canvasPt = e => { const r = world.getBoundingClientRect(), k = world.width / r.width; return [(e.clientX - r.left) * k, (e.clientY - r.top) * k]; };
  world.addEventListener('pointerdown', e => {
    WD.audio.unlock();
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (WD.ui.isBlocking()) return;
    const [x, y] = canvasPt(e);
    if (WD.game.pointer('down', x, y)) { try { world.setPointerCapture(e.pointerId); } catch (err) { /* ignora */ } return; }
    WD.game.interact();
  });
  world.addEventListener('pointermove', e => { const [x, y] = canvasPt(e); WD.game.pointer('move', x, y); });
  ['pointerup', 'pointercancel'].forEach(t => world.addEventListener(t, () => WD.game.pointer('up')));
  $('#world').addEventListener('contextmenu', e => {
    e.preventDefault();
    if (!WD.ui.isBlocking() && !WD.game.interact()) WD.ui.useHeld();
  });

  // controlli touch
  $$('.tc').forEach(b => {
    const k = b.dataset.key;
    const down = e => {
      e.preventDefault(); WD.audio.unlock();
      if (k === 'use') { if (!WD.ui.isBlocking() && !WD.game.interact()) WD.ui.useHeld(); return; }
      WD.game.input[k] = true; b.classList.add('on');
    };
    const up = e => { e.preventDefault(); if (k !== 'use') WD.game.input[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
  });

  /* ---------- Loop ---------- */
  let last = performance.now(), fpsAcc = 0, fpsN = 0, dbgT = 0;
  function frame(now) {
    const dt = Math.min(1 / 30, (now - last) / 1000);
    last = now;
    if (current === 'title') WD.title.renderPanorama($('#panorama'), dt);
    else if (current === 'game' && WD.game.state.running) {
      WD.game.update(dt);
      WD.game.render();
      fpsAcc += dt; fpsN++;
      if (fpsAcc > 0.5) { WD.game.state.fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
      dbgT += dt;
      if (WD.game.state.debug && dbgT > 0.2) { dbgT = 0; $('#debug').innerHTML = WD.game.debugInfo().map(l => `<div>${l}</div>`).join(''); }
    }
    requestAnimationFrame(frame);
  }

  /* ---------- Avvio ---------- */
  function drawIcons() {
    // icona del mondo: ritaglio del panorama
    const pano = WD.title.panoramaCanvas();
    const wi = $('#worldIcon').getContext('2d'); wi.imageSmoothingEnabled = false;
    wi.drawImage(pano, 30 * 16, 14 * 16, 160, 160, 0, 0, 64, 64);
    // icona server: la testa di Daniele
    const si = $('#serverIcon').getContext('2d'); si.imageSmoothingEnabled = false;
    si.drawImage(WD.tex.faces.daniele, 0, 0, 64, 64);
    // appena carica, la testa della skin Woldanki sostituisce quella disegnata
    WD.skinReady.then(s => {
      if (!s.ok) return;
      si.clearRect(0, 0, 64, 64);
      si.drawImage(s.img, 8, 8, 8, 8, 0, 0, 64, 64);
      si.drawImage(s.img, 40, 8, 8, 8, 0, 0, 64, 64);
    });
    const s2 = $('#server2Icon').getContext('2d'); s2.imageSmoothingEnabled = false;
    s2.drawImage(WD.tex.items.emerald, 0, 0, 64, 64);
    const d = new Date();
    $('#worldDate').textContent = `Portfolio (${d.toLocaleDateString('it-IT')} ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })})`;
  }

  function boot() {
    WD.tex.uiTextures();
    WD.tex.packUi();
    if (WD.opts.musicMode === 'c418') jukebox(true, false);
    WD.ui.hearts(); WD.ui.coffee(10); WD.ui.buildHotbar(); WD.ui.xp(0, 0);
    WD.game.init($('#world'));
    drawIcons();
    const msgs = ['Generazione del mondo...', 'Posizionamento dei blocchi...', 'Compilazione di Angular...', 'Preparazione del caffè...', 'Quasi pronto!'];
    let p = 0;
    const tick = setInterval(() => {
      p += 20;
      $('#loadingFill').style.width = p + '%';
      $('#loadingText').textContent = msgs[Math.min(msgs.length - 1, p / 20 - 1)];
      if (p >= 100) {
        clearInterval(tick);
        setTimeout(() => show('title'), 350);
      }
    }, 280);
    window.addEventListener('resize', () => { if (current === 'title') WD.title.drawLogo($('#logo'), 'WOLSKIDEV'); });
    requestAnimationFrame(frame);
  }

  const fontsReady = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]) : Promise.resolve();
  fontsReady.then(() => WD.tex.loadPack()).then(boot, boot);
})();
