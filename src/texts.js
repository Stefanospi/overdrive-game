// Every word on screen lives here. Edit freely: no code changes needed.
// Tone: deadpan, bureaucratic, slightly unhinged.

export const pick = (list) => list[Math.floor(Math.random() * list.length)];

export const TEXTS = {
  // ---- boot screen ---------------------------------------------------------
  bootLog: [
    'MINISTERO DEL BASSO BIOS v1.40',
    'Memoria: 640K. Dovrebbero bastare.',
    'Controllo subwoofer........ OK',
    'Controllo vicini........... IGNORATO',
    'Caricamento rivoluzione.... NEGATO',
    'Avvio MARS.EXE',
  ],
  boot: ['Benvenuto. Sono MARS.EXE, il tuo antivirus. Non toccare niente.'],

  // ---- labels --------------------------------------------------------------
  ui: {
    subtitle: 'STEPHEN MARS / EP',
    start: 'TOCCA PER AVVIARE',
    headphones: 'meglio con le cuffie',
    level: 'LIV.',
    overdrive: 'OVERDRIVE',
    limit: 'LIMITE LEGALE',
    combo: 'COMBO',
    mult: 'MOLT.',
    early: 'PRESTO',
    late: 'TARDI',
    grades: { perfect: 'PERFETTO', good: 'BUONO', ok: 'OK', miss: 'MANCATO', broken: 'MOLLATO' },
    label: 'OVD-001 / LATO A / WHITE LABEL / NON IN VENDITA',
    again: 'TOCCA PER RIGIOCARE',
    soon: 'EP IN ARRIVO',
    soonSub: 'link e ascolto: presto qui',
  },

  // Scrolling strip under the HUD. The second one takes over past the legal limit.
  ticker: [
    'MINISTERO DEL BASSO /// SCANSIONE IN CORSO /// MANTENERE LA CALMA /// IL VOLUME È UN PRIVILEGIO /// NON BALLARE VICINO AL MONITOR /// ',
    'RIVOLUZIONE.EXE IN ESECUZIONE /// TRASMISSIONE NON AUTORIZZATA /// 140 BPM /// IL BASSO È UN DIRITTO /// IL MINISTERO NON RISPONDE /// ',
  ],

  // ---- the story --------------------------------------------------------------
  // The Minister took away rights nobody thought could be taken: the bass, the
  // dancing, the gathering, the raised voice. Mars takes them back, one district
  // per track, hiding inside the Ministry's own system as its antivirus.
  //
  // Each chapter is a list of panels. `who` is 'decree' (a document), 'ministro'
  // or 'mars'; `expr` is the face: mars has neutral, sad, angry, shout, win,
  // surprised, glitch; ministro has calm, angry.
  names: { mars: 'MARS', ministro: 'IL MINISTRO', decree: 'DECRETO N.140' },
  story: {
    skip: 'SALTA',
    next: 'TOCCA',
    intro: {
      chapter: 'CAPITOLO 1',
      title: 'IL DECRETO',
      panels: [
        { who: 'decree', text: 'Da oggi sono vietati: il basso sotto i 100 Hz, ballare, riunirsi in più di tre, alzare la voce.' },
        { who: 'ministro', expr: 'calm', text: 'È per la vostra quiete. La quiete è obbligatoria. Ringraziate in silenzio.' },
        { who: 'mars', expr: 'sad', text: 'Hanno spento il soundsystem del quartiere. Era lì da prima di me.' },
        { who: 'mars', expr: 'sad', text: 'Nessuno ha protestato. Protestare è al comma 4.' },
        { who: 'mars', expr: 'angry', text: 'Non erano favori. Erano diritti. Così scontati che nessuno li aveva mai scritti.' },
        { who: 'mars', expr: 'neutral', text: "Ho un trasmettitore, un tetto e un dub. E un travestimento: per il Ministero sono l'antivirus MARS.EXE." },
        { who: 'mars', expr: 'shout', text: 'Tu suoni, io trasmetto. Ogni nota che prendi riaccende una finestra. Andiamo.' },
      ],
    },
    // after level 1, by result
    brazilian_high: {
      chapter: 'CAPITOLO 1',
      title: 'QUARTIERE RIACCESO',
      panels: [
        { who: 'ministro', expr: 'angry', text: 'Chi ha riacceso quelle casse? Voglio un nome. Voglio un modulo con sopra un nome.' },
        { who: 'mars', expr: 'win', text: "L'antivirus non ha rilevato nulla. L'antivirus sono io." },
        { who: 'mars', expr: 'shout', text: 'Un quartiere balla di nuovo. Ne restano quattro. Il prossimo pezzo è in arrivo.' },
      ],
    },
    brazilian_mid: {
      chapter: 'CAPITOLO 1',
      title: 'SEGNALE RICEVUTO',
      panels: [
        { who: 'ministro', expr: 'calm', text: 'Rilevato un rumore non autorizzato. Breve. Lo considereremo un guasto.' },
        { who: 'mars', expr: 'neutral', text: "Qualcuno l'ha sentito. Qualche finestra si è accesa. Non basta ancora." },
        { who: 'mars', expr: 'angry', text: 'Riproviamo più forte. Un diritto non si chiede due volte: si riprende.' },
      ],
    },
    brazilian_low: {
      chapter: 'CAPITOLO 1',
      title: 'LA QUIETE REGGE',
      panels: [
        { who: 'ministro', expr: 'calm', text: 'Segnale debole. Nessuno ha ballato. La quiete regge. Come previsto dal modulo.' },
        { who: 'mars', expr: 'sad', text: 'Il quartiere è rimasto al buio. Stanotte ha vinto il silenzio.' },
        { who: 'mars', expr: 'angry', text: 'Stanotte. Riproviamo. Un diritto non si chiede due volte: si riprende.' },
      ],
    },
  },

  // ---- MARS.EXE during a level ---------------------------------------------
  // Scripted lines, fired at the start of the given bar (bar 0 = first bar).
  script: {
    brazilian: [
      { bar: -2, expr: 'neutral', line: "Sono dentro. Per loro sono l'antivirus. Tu tocca le note sulla linea." },
      { bar: 2, expr: 'win', line: 'Ogni nota riaccende una finestra. Guarda i palazzi.' },
      { bar: 5, expr: 'surprised', line: 'Arriva il drop. Vietato dal Decreto 140, comma basso.' },
      { bar: 6, expr: 'shout', line: 'TRASMISSIONE PIRATA IN CORSO. Quelle lunghe: tieni premuto.' },
      { bar: 14, expr: 'angry', line: 'Ora in tre colpi. Come si faceva in piazza.' },
      { bar: 17, expr: 'neutral', line: 'Tieni. Tieni. Tieni.' },
      { bar: 21, expr: 'win', line: 'Quartiere raggiunto. Stacco prima che ci trovino.' },
    ],
    dub: [
      { bar: -1, expr: 'neutral', line: 'Scansione manuale. Tocca le minacce quando arrivano sulla linea.' },
      { bar: 2, expr: 'neutral', line: 'Quelle lunghe: tieni premuto. Il basso non suona da solo.' },
      { bar: 4, expr: 'neutral', line: 'Ora più in fretta. Il Ministero osserva.' },
      { bar: 12, expr: 'surprised', line: 'Silenzio sospetto. Tieni il basso, tocca il resto.' },
      { bar: 15, expr: 'surprised', line: 'Rilevo un drop in arrivo. Sconsigliato.' },
      { bar: 16, expr: 'glitch', line: 'TROPPO BASSO. TROPPO BASSO. Continua.' },
      { bar: 24, expr: 'win', line: 'Scansione completata. Più o meno.' },
    ],
  },

  // Short reactions, 2-3 words.
  react: {
    combo: ['Ci sentono. Continua.', 'Altre finestre accese.', 'Il Ministero prende nota.', 'Così. Più forte.'],
    miss: ['Segnale perso.', 'Ci stanno coprendo.', 'Non mollare adesso.', 'Riprendi il tempo.'],
  },

  loading: 'SINTONIZZAZIONE...',
  overdrive: ['Limite legale superato. Rivoluzione.exe ha smesso di rispondere. Io no.'],
  overdriveMode: ['TUTTO IL QUARTIERE IN ASCOLTO. Punti doppi. Non sono stato io.'],

  popups: [
    'Il Ministero del Basso ti informa: stai andando bene. Smettila.',
    'Aggiornamento disponibile. Non per te.',
    'Hai 1 nuovo avviso. È uguale al precedente.',
    'Il sub è stato classificato come arma impropria.',
  ],

  // ---- result screen: an official report ------------------------------------
  report: {
    ministry: 'MINISTERO DEL BASSO',
    title: 'VERBALE DI SCANSIONE',
    number: 'N. 000140/A',
    score: 'PUNTEGGIO',
    accuracy: 'PRECISIONE',
    combo: 'COMBO MASSIMA',
    peak: 'OVERDRIVE (PICCO)',
    grades: { perfect: 'PERFETTI', good: 'BUONI', ok: 'OK', miss: 'MANCATI' },
    footer: 'Il presente verbale non ha alcun valore. Come tutto.',
    stamps: { low: 'ASSOLTO', mid: 'SEGNALATO', high: 'COMPROMESSO' },
  },
  ranks: {
    low: ['Assolto. È un insulto. Riproviamo.', 'Nessuna minaccia rilevata. Purtroppo.'],
    mid: ['Segnalato al Ministero del Basso. È un buon segno.', 'Quasi una rivoluzione. Quasi.'],
    high: ['Sistema compromesso. Ottimo lavoro.', 'Un quartiere su cinque. Si comincia così.'],
  },
};
