/* Suoni sintetizzati con Web Audio: nessun file audio esterno */
(function () {
  'use strict';
  const WD = window.WD = window.WD || {};
  let ctx = null, master = null, musicGain = null, musicTimer = null;
  const PENTA = [0, 2, 4, 7, 9];

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.32; musicGain.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function tone(freq, dur, opts) {
    if (!ensure()) return;
    const o = opts || {};
    const t0 = ctx.currentTime + (o.when || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t0 + dur);
    const v = o.vol === undefined ? 0.08 : o.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(o.dest || master);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, freq) {
    if (!ensure()) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 800;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master);
    src.start();
  }

  const sfx = {
    click() { tone(1150, 0.05, { type: 'triangle', vol: 0.12 }); tone(620, 0.06, { type: 'square', vol: 0.03, when: 0.01 }); },
    pop() { const f = 600 + Math.random() * 500; tone(f, 0.12, { type: 'sine', vol: 0.12, slide: f * 1.8 }); },
    levelup() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, { type: 'triangle', vol: 0.09, when: i * 0.08 })); },
    toast() { tone(784, 0.25, { type: 'sine', vol: 0.1 }); tone(1175, 0.4, { type: 'sine', vol: 0.08, when: 0.12 }); },
    step() { noise(0.07, 0.05, 500); },
    tp() { tone(200, 0.4, { type: 'sawtooth', vol: 0.04, slide: 900 }); noise(0.3, 0.05, 2000); },
    gulp() { [300, 240, 300].forEach((f, i) => tone(f, 0.09, { type: 'sine', vol: 0.12, when: i * 0.12, slide: f * 0.7 })); },
    meow() { tone(700, 0.35, { type: 'triangle', vol: 0.08, slide: 1100 }); tone(1100, 0.25, { type: 'triangle', vol: 0.06, when: 0.25, slide: 650 }); },
    hmm() { tone(180, 0.18, { type: 'square', vol: 0.05, slide: 230 }); tone(230, 0.2, { type: 'square', vol: 0.05, when: 0.16, slide: 170 }); },
    page() { noise(0.12, 0.08, 3000); },
    dig() { noise(0.07, 0.09, 700 + Math.random() * 400); },
    brk() { noise(0.2, 0.16, 1100); tone(120, 0.12, { type: 'triangle', vol: 0.05 }); },
    splash() { noise(0.35, 0.08, 2500); },
    error() { tone(160, 0.2, { type: 'square', vol: 0.06 }); }
  };

  function play(name) {
    if (!WD.opts || !WD.opts.sound) return;
    try { sfx[name] && sfx[name](); } catch (e) { /* audio non disponibile */ }
  }

  // musica ambientale generativa e tranquilla
  function musicNote() {
    if (!ctx) return;
    const root = 261.63;
    const n = PENTA[Math.random() * PENTA.length | 0] + 12 * ((Math.random() * 3 | 0) - 1);
    const f = root * Math.pow(2, n / 12);
    tone(f, 3.2, { type: 'sine', vol: 0.12, attack: 0.04, dest: musicGain });
    tone(f * 2, 2.0, { type: 'triangle', vol: 0.025, attack: 0.04, dest: musicGain });
    if (Math.random() < 0.3) tone(f * 1.5, 3.5, { type: 'sine', vol: 0.06, when: 0.2, attack: 0.1, dest: musicGain });
  }
  function scheduleMusic() {
    clearTimeout(musicTimer);
    if (!WD.opts || !WD.opts.music || !ctx) return;
    musicNote();
    const phrase = Math.random() < 0.2 ? 4000 + Math.random() * 5000 : 600 + Math.random() * 1400;
    musicTimer = setTimeout(scheduleMusic, phrase);
  }
  function startMusic() { if (WD.opts && WD.opts.music && ensure()) { if (!musicTimer) scheduleMusic(); } }
  function stopMusic() { clearTimeout(musicTimer); musicTimer = null; }

  WD.audio = { play, startMusic, stopMusic, unlock: ensure };
})();
