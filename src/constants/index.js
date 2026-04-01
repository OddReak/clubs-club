// ── Content types ─────────────────────────────────────────────
export const CONTENT_TYPES = [
  { id: 'games',  label: 'Jeux',    icon: '🎮' },
  { id: 'music',  label: 'Musique', icon: '🎵' },
  { id: 'cinema', label: 'Cinéma',  icon: '🎬' },
  { id: 'books',  label: 'Livres',  icon: '📚' },
];

export const CONTENT_LABELS = {
  games:  { s: 'jeu',   p: 'jeux'   },
  music:  { s: 'album', p: 'albums' },
  cinema: { s: 'film',  p: 'films'  },
  books:  { s: 'livre', p: 'livres' },
};

// ── Club types ────────────────────────────────────────────────
export const CLUB_TYPES = ['Jeux vidéo', 'Musique', 'Cinéma', 'Lecture'];

export const CLUB_TO_CONTENT = {
  'Jeux vidéo': 'games',
  'Musique':    'music',
  'Cinéma':     'cinema',
  'Lecture':    'books',
};

export const CONTENT_TO_CLUB_TYPE = {
  games:  'Jeux vidéo',
  music:  'Musique',
  cinema: 'Cinéma',
  books:  'Lecture',
};

export const CLUB_PLAY_VERB = {
  'Jeux vidéo': 'jouer',
  'Musique':    'écouter',
  'Cinéma':     'regarder',
  'Lecture':    'lire',
};

// ── Library statuses ──────────────────────────────────────────
export const LIBRARY_CATS = {
  games:  [
    { key:'all',       label:'Tout'       },
    { key:'owned',     label:'Possédé'    },
    { key:'playing',   label:'En cours'   },
    { key:'completed', label:'Terminé'    },
    { key:'wishlist',  label:'Wishlist'   },
  ],
  music:  [
    { key:'all',        label:'Tout'       },
    { key:'owned',      label:'Possédé'    },
    { key:'to_listen',  label:'À écouter'  },
    { key:'listened',   label:'Écouté'     },
    { key:'wishlist',   label:'Wishlist'   },
  ],
  cinema: [
    { key:'all',       label:'Tout'        },
    { key:'owned',     label:'Possédé'     },
    { key:'to_watch',  label:'À regarder'  },
    { key:'watched',   label:'Vu'          },
    { key:'wishlist',  label:'Wishlist'    },
  ],
  books:  [
    { key:'all',       label:'Tout'        },
    { key:'owned',     label:'Possédé'     },
    { key:'reading',   label:'En cours'    },
    { key:'read',      label:'Lu'          },
    { key:'wishlist',  label:'Wishlist'    },
  ],
};

export const PROFILE_TABS = {
  games:  [
    { key:'collection', label:'Collection' },
    { key:'playing',    label:'En cours'   },
    { key:'completed',  label:'Terminé'    },
    { key:'stats',      label:'Stats'      },
  ],
  music:  [
    { key:'collection', label:'Collection' },
    { key:'to_listen',  label:'À écouter'  },
    { key:'listened',   label:'Écouté'     },
    { key:'stats',      label:'Stats'      },
  ],
  cinema: [
    { key:'to_watch',   label:'À regarder' },
    { key:'watched',    label:'Vu'         },
    { key:'stats',      label:'Stats'      },
  ],
  books:  [
    { key:'collection', label:'Collection' },
    { key:'reading',    label:'En cours'   },
    { key:'read',       label:'Lu'         },
    { key:'stats',      label:'Stats'      },
  ],
};

export const TAB_STATUSES = {
  collection: ['wishlist','owned'],
  playing:    ['playing'],
  completed:  ['completed'],
  to_listen:  ['to_listen'],
  listened:   ['listened'],
  to_watch:   ['to_watch'],
  watched:    ['watched'],
  reading:    ['reading'],
  read:       ['read'],
};

export const COMPLETED_STATUS = {
  games:'completed', music:'listened', cinema:'watched', books:'read',
};

export const REVIEWABLE_STATUSES = new Set([
  'playing','completed','listened','watched','reading','read',
]);

// ── Themes ────────────────────────────────────────────────────
export const DARK_THEMES = [
  { id:'dark-forest',   label:'Forest',   accent:'#7ec87e' },
  { id:'dark-amber',    label:'Amber',    accent:'#e8a838' },
  { id:'dark-volcanic', label:'Volcanic', accent:'#d45f3c' },
  { id:'dark-teal',     label:'Teal',     accent:'#3ecfbf' },
  { id:'dark-gold',     label:'Gold',     accent:'#d4af37' },
];

export const LIGHT_THEMES = [
  { id:'light-mint',      label:'Mint',      accent:'#2e8b57' },
  { id:'light-linen',     label:'Linen',     accent:'#c0612b' },
  { id:'light-sand',      label:'Sand',      accent:'#b07040' },
  { id:'light-parchment', label:'Parchment', accent:'#8b6914' },
];

export const DEFAULT_THEME = {
  dark: 'dark-forest', light: 'light-mint', mode: 'dark', syncWithSystem: false,
};

// ── Nav items ─────────────────────────────────────────────────
export const NAV_IDS = ['home', 'search', 'clubs', 'profile'];

// ── Months ────────────────────────────────────────────────────
export const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];

// ── Daily quotes ──────────────────────────────────────────────
export const DAILY_QUOTES = [
  '"Un jeu est une série de décisions intéressantes." — Sid Meier',
  '"La musique donne une âme à nos cœurs." — Platon',
  '"Le cinéma, c\'est l\'écriture moderne dont l\'encre est la lumière." — J. Cocteau',
  '"Un lecteur vit mille vies avant de mourir." — George R.R. Martin',
  '"Jouer, c\'est être libre." — Friedrich Schiller',
];
