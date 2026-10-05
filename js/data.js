/* Tutti i contenuti del portfolio (presi da wolskidev.site) */
window.WD = window.WD || {};

WD.data = {
  name: 'Daniele Wolski',
  nick: 'Daniele_Wolski',
  role: 'Front-End Web Developer',
  tagline: 'Sviluppatore Front-End con base tecnica in ambiente Angular.',
  location: 'Roma, Italia',
  email: 'danielewolski02@gmail.com',
  github: 'https://github.com/Danielewolski',
  linkedin: 'https://www.linkedin.com/in/daniele-wolski/',
  photo: 'img/foto.jpeg',
  // skin e mantello dell'account Minecraft "Woldanki" (usati dall'NPC Daniele)
  skin: 'img/woldanki.png',
  cape: 'img/woldanki-cape.png',
  // skin di Steve dal pack Faithful 32x (giocatore ospite, attivabile dalle Opzioni)
  guestSkin: 'img/steve-faithful.png',
  // jukebox: player ufficiale Bandcamp dell'album di C418 «Minecraft - Volume Alpha»
  music: {
    artist: 'C418', album: 'Minecraft - Volume Alpha', page: 'https://c418.bandcamp.com/album/minecraft-volume-alpha',
    embed: 'https://bandcamp.com/EmbeddedPlayer/album=1349219244/size=large/bgcol=333333/linkcol=0f91ff/artwork=small/transparent=true/'
  },
  yearsExp: '4+',

  about: [
    "Sono un Front-End Web Developer con una base tecnica focalizzata sull'ecosistema Angular. Attualmente lavoro in Laser Romae.",
    "Dopo il diploma di Perito Informatico (80/100) e una formazione come Microsoft Full-Stack Developer (durata 3 mesi), ho intrapreso il mio percorso professionale in Gruppo Sincrono, dove ho lavorato per 4 anni come Front-End Web Developer, evolvendo le mie competenze tecniche.",
    "Nel tempo libero mi diverto a creare piccoli script personalizzati con interfacce HTML/CSS/JS per automatizzare task quotidiane e migliorare la produttività. Quando non sono davanti a uno schermo, mi trovi in palestra!"
  ],

  // icon: shape, colore sfondo, colore testo, etichetta
  skills: {
    framework: {
      title: 'Framework, Sviluppo Web & Librerie',
      items: [
        { id: 'angular',    name: 'Angular',    icon: ['shield', '#dd0031', '#ffffff', 'A'] },
        { id: 'typescript', name: 'TypeScript', icon: ['square', '#3178c6', '#ffffff', 'TS'] },
        { id: 'javascript', name: 'JavaScript', icon: ['square', '#f7df1e', '#222222', 'JS'] },
        { id: 'html5',      name: 'HTML5',      icon: ['shield', '#e34f26', '#ffffff', '5'] },
        { id: 'css3',       name: 'CSS3',       icon: ['shield', '#1572b6', '#ffffff', '3'] },
        { id: 'scss',       name: 'SCSS',       icon: ['circle', '#cd6799', '#ffffff', 'S'] },
        { id: 'bootstrap',  name: 'Bootstrap',  icon: ['square', '#7952b3', '#ffffff', 'B'] }
      ]
    },
    tools: {
      title: 'Strumenti, Ambiente & Sistemi operativi',
      items: [
        { id: 'vscode',   name: 'VS Code',     icon: ['square', '#007acc', '#ffffff', '<>'] },
        { id: 'github',   name: 'GitHub',      icon: ['circle', '#24292e', '#ffffff', 'GH'] },
        { id: 'npm',      name: 'npm',         icon: ['square', '#cb3837', '#ffffff', 'NPM'] },
        { id: 'terminal', name: 'Terminal',    icon: ['square', '#1e1e1e', '#33ff55', '>_'] },
        { id: 'svn',      name: 'TortoiseSVN', icon: ['circle', '#2f8a3a', '#ffffff', 'SVN'] },
        { id: 'windows',  name: 'Windows',     icon: ['win', '#00a4ef', '#ffffff', ''] },
        { id: 'macos',    name: 'MacOS',       icon: ['square', '#c9c9c9', '#333333', 'OS'] }
      ]
    }
  },

  softSkills: [
    'Problem Solving & Pensiero analitico',
    'Lavoro in Team & Collaborazione',
    'Comunicazione efficace',
    'Apprendimento continuo',
    'Gestione del tempo',
    'Attenzione ai dettagli',
    'Adattabilità & Flessibilità'
  ],

  // In ordine cronologico (da sinistra a destra nel mondo)
  timeline: [
    {
      id: 'diploma', type: 'Formazione',
      title: 'Perito Informatico',
      company: 'Istituto tecnico industriale Michael Faraday',
      date: '2016 - 2021',
      desc: 'Diploma di perito informatico con focus su programmazione, basi di dati e sistemi informatici. Voto: 80/100.',
      tags: ['HTML5', 'CSS3', 'JavaScript', 'PHP', 'Java', 'C++', 'MySQL', 'Eclipse', 'Intellij IDEA'],
      adv: 'Diplomato!', icon: 'book'
    },
    {
      id: 'pcto', type: 'Formazione',
      title: 'Corso Sincrono (PCTO)',
      company: 'Gruppo Sincrono',
      date: '11/03/2018 - 15/03/2018',
      desc: 'Formazione intensiva dedicata allo sviluppo Front-End.',
      tags: ['HTML5', 'CSS3', 'JavaScript'],
      adv: 'Il primo seme', icon: 'sapling'
    },
    {
      id: 'microsoft', type: 'Formazione',
      title: 'Corso Microsoft Full-Stack Developer',
      company: 'Attestato',
      date: '20/09/2021 - 20/12/2021',
      desc: 'Percorso formativo focalizzato sullo sviluppo software Full-Stack.',
      tags: ['HTML5', 'CSS3', 'Angular', 'Bootstrap', 'C#', 'SQL', 'Microsoft Visual Studio'],
      adv: 'Full-Stack in 3 mesi', icon: 'ench_book'
    },
    {
      id: 'sincrono', type: 'Lavoro',
      title: 'Front-End Web Developer',
      company: 'Gruppo Sincrono',
      date: '2022 - Marzo 2026',
      desc: "Sviluppo e manutenzione di una piattaforma e-commerce con Angular. Implementazione di nuove funzionalità, ottimizzazione delle performance e collaborazione con il team backend per l'integrazione delle API.",
      tags: ['Angular', 'TypeScript', 'JavaScript', 'HTML5', 'CSS3', 'SCSS', 'Bootstrap', 'TortoiseSVN', 'Visual Studio Code', 'Windows', 'MacOS'],
      adv: 'Assunto!', icon: 'pickaxe'
    },
    {
      id: 'laser', type: 'Lavoro',
      title: 'Frontend Web Developer',
      company: 'Laser Romae',
      date: 'Marzo 2026 - Presente',
      desc: 'Frontend Web Developer in Laser Romae.',
      tags: [],
      adv: 'Nuova avventura', icon: 'diamond'
    }
  ],

  splashes: [
    'Ora con Angular!', '100% TypeScript!', '4+ anni di esperienza!', 'Fatto a Roma!',
    'Alimentato a caffè!', 'Anche in palestra!', 'Problem solving incluso!',
    'Diplomato con 80/100!', 'Front-End, ma con stile!', 'Pixel perfect!',
    'HTML5 + CSS3 + JS!', 'Responsive!', "console.log('Ciao!')",
    'Aperto a nuove opportunità!', 'npm install felicità', 'Compila al primo colpo!',
    'SCSS > CSS... a volte', 'Ctrl+S salva vite!', 'Senza punto e virgola? Mai!'
  ]
};
