# WOLSKIDEV — Portfolio in stile gioco a blocchi

Portfolio interattivo di **Daniele Wolski**, Frontend Web Developer.
Il sito si presenta come un videogioco a blocchi: dal menu principale si entra nel "server" e si esplora un mondo in cui ogni zona racconta una parte del portfolio.

🌐 **Online:** [wolskidev.site](https://wolskidev.site)

> Progetto non ufficiale. NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.

---

## Avvio in locale

Non serve installare niente né fare una build: basta aprire `index.html` nel browser (anche con doppio clic).
Serve la connessione a internet solo per i font (Google Fonts) e per il jukebox opzionale (Bandcamp); senza, il sito funziona comunque con font di sistema.

## Pubblicazione (GitHub Pages)

- Il sito è servito da **GitHub Pages** dal branch `main`, cartella principale (`/`).
- Il file **`CNAME`** contiene il dominio personalizzato `wolskidev.site`: **non va eliminato**, altrimenti GitHub Pages perde il dominio.
- Il file **`.nojekyll`** dice a GitHub Pages di pubblicare i file così come sono, senza elaborarli con Jekyll.
- Un dominio personalizzato può essere collegato a un solo repository alla volta.

---

## Cosa c'è nel sito

### Schermate
1. **Caricamento** "WOLSKIDEV STUDIOS".
2. **Menu principale**: logo a blocchi di pietra, frase gialla casuale (cliccabile), panorama animato.
   Pulsanti: *Giocatore singolo*, *Multigiocatore*, *Entra subito nel server*, *Opzioni*, *Esci dal gioco*.
3. **Giocatore singolo / Multigiocatore**: liste di mondi e server (il server "Nuove Opportunità" porta direttamente ai contatti; c'è anche la "Connessione diretta" con `wolskidev.site`).
4. **Opzioni**: musica (generativa / jukebox C418 / no), suoni, difficoltà (scherzosa), salto automatico, nuvole, skin dell'ospite (Steve / classica), lingua, **Riconoscimenti**.
5. **Mondo di gioco** con HUD: cuori, barra del caffè, barra e livello dell'esperienza, barra rapida, chat, titoli, notifiche dei progressi.

### Il mondo, da sinistra a destra
| Zona | Contenuto |
|---|---|
| **Spawn** | Cartello di benvenuto, ocelot da accarezzare |
| **Chi Sono** | Casa con il libro sul leggio (4 pagine: presentazione, chi sono, percorso, tempo libero) e il quadro con la foto |
| **Competenze** | Officina: competenze tecniche nelle cornici, banco da lavoro (inventario con tooltip "Usato in"), tavolo da incantesimi (soft skills) |
| **Esperienza** | Percorso cronologico con 5 tappe: Diploma, PCTO Sincrono, Corso Microsoft, Gruppo Sincrono, **Laser Romae** (lavoro attuale, con il faro) |
| **Contatti** | Bancarella con Daniele (skin *Woldanki* con mantello): scambi per Email, GitHub e LinkedIn |
| **Confini del mondo** | Cartello finale… e qualcos'altro (vedi Easter egg) |

### Comandi
| Azione | Tastiera / mouse | Touch |
|---|---|---|
| Camminare | A/D o ←/→ (Shift per correre) | ◀ ▶ |
| Saltare / salire le scale / nuotare | Spazio, W o ↑ | ▲ |
| Interagire | F, Invio o clic sinistro | F |
| Usare l'oggetto in mano | Tasto destro o F | F / tocco sullo slot |
| Barra rapida | 1-9 o rotella del mouse | tocco sullo slot |
| Inventario competenze | E | pulsante E |
| Chat | T o / | pulsante T |
| Pausa | Esc | pulsante ☰ |
| Debug | F3 | — |

**Navigatore:** con la **bussola** in mano (slot 1), tasto destro apre un menu tipo baule per teletrasportarsi in ogni zona e in ogni tappa dell'esperienza.

**Comandi chat:** `/help`, `/chisono`, `/competenze`, `/softskills`, `/esperienza`, `/contatti`, `/tp <spawn|about|skills|exp|contact>`, `/time set <day|night>`, `/gamemode <creative|survival>`, `/skin <steve|classica>`, `/email`, `/seed`, `/clear`.

### Progressi
Ogni zona sblocca un progresso con notifica. Le 5 tappe dell'esperienza fanno salire il livello. Ci sono anche **4 progressi segreti**.

<details>
<summary><b>Easter egg (spoiler)</b></summary>

Oltre il cartello «Confini del mondo» c'è il **baule del minatore** con un piccone di diamante.
Con il piccone in mano (slot 2) si tiene premuto il tasto sinistro (o il dito) su un blocco per scavarlo: crepe, frammenti, minerali con orb di esperienza. Le strutture del portfolio non si possono rompere.
Il **pozzo della miniera abbandonata**, bloccato da ragnatele, porta a una **caverna segreta** con laghetto (si nuota), pietra luminosa, torce, erba, felci, funghi, liane, minerali e il **baule del tesoro** con una lettera.
Se resti bloccato, la bussola riporta in superficie.
</details>

---

## Aggiornare i contenuti

Quasi tutto si modifica in **`js/data.js`**:
- `name`, `role`, `tagline`, `location`, `email`, `github`, `linkedin`
- `about` — i paragrafi del libro «Chi Sono»
- `skills` — competenze tecniche (nome e icona: forma, colore, testo)
- `softSkills` — soft skills del tavolo da incantesimi
- `timeline` — le tappe dell'esperienza (titolo, azienda, date, descrizione, tecnologie); le tecnologie alimentano anche i tooltip «Usato in»
- `splashes` — le frasi gialle del menu

**Aggiungere o togliere una tappa** dell'esperienza richiede anche, in `js/game.js`: la posizione in `MILESTONE_X`, l'altezza della freccia in `buildExperience`, il progresso `m_<id>` in `ADV`; e in `js/ui.js` lo slot nel navigatore.

**Skin:** sostituire `img/woldanki.png` (skin 64×64) e `img/woldanki-cape.png` (mantello).
**Foto:** `img/foto.jpeg`.

## Struttura

```
index.html            schermate (caricamento, menu, server, opzioni, riconoscimenti, gioco)
CNAME                 dominio personalizzato per GitHub Pages
.nojekyll             pubblicazione dei file così come sono
css/style.css         interfaccia (bottoni, HUD, finestre, responsive)
js/data.js            CONTENUTI del portfolio
js/pack-data.js       texture del pack Faithful 32x incorporate come data URL
js/textures.js        texture di riserva disegnate via codice + applicazione del pack
js/audio.js           suoni e musica generativa (Web Audio)
js/title.js           logo a blocchi e panorama del menu
js/game.js            mondo, fisica, scavo, progressi, comandi della chat, rendering
js/ui.js              HUD e finestre (libro, inventario, incantesimi, scambi, navigatore, bauli)
js/main.js            navigazione tra schermate, opzioni, input, loop
img/                  foto, skin e mantello di Woldanki, skin di Steve (Faithful)
```

### Note tecniche
- HTML, CSS e JavaScript puri, nessuna dipendenza né build. Rendering su `<canvas>` 2D in pixel art.
- Le texture sono incorporate come *data URL* così il sito funziona anche aperto da file (`file://`) senza problemi di sicurezza del canvas.
- Le opzioni del visitatore sono salvate nel suo browser (`localStorage`).
- Effetti sonori e musica generativa sono sintetizzati con Web Audio; il jukebox C418 è il player ufficiale di Bandcamp, caricato solo se scelto.
- Responsive: su telefono compaiono i comandi touch.

---

## Crediti e licenze

- **Ideato e sviluppato da** Daniele Wolski.
- **Texture:** «Faithful 32x» per Minecraft 1.12.2 (rv4), di **xMrVizzy & Vattic** (oggi Faithful Team) — <https://faithfulpack.net> — licenza: <https://faithfulpack.net/license>.
  Le texture usate sono incorporate in `js/pack-data.js`; alcune sono state ritagliate, ricomposte o ricolorate (foglie, erba, felci, liane, ninfee, faro, baule, orb dell'esperienza). La skin di Steve (`img/steve-faithful.png`) proviene dallo stesso pack.
- **Musica (jukebox opzionale):** **C418** — «Minecraft - Volume Alpha» © C418, tutti i diritti riservati — riprodotto tramite il player ufficiale di Bandcamp: <https://c418.bandcamp.com/album/minecraft-volume-alpha>. **I brani non sono inclusi in questo repository.**
- **Skin di Daniele:** skin e mantello dell'account Minecraft «Woldanki».
- **Font:** Press Start 2P e VT323 (Google Fonts, SIL Open Font License).
- **Citazione** nella lettera della caverna: autore sconosciuto.

NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.
