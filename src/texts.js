// Every word on screen lives here. Edit freely: no code changes needed.
// Tone: deadpan, bureaucratic, slightly unhinged.
//
// Writing rule: nobody reads while playing. During a level only 1-2 giant words
// appear (`word`). Sentences live in the story panels, kept to ~8 words each.

export const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Easter egg: the girlfriend. Change the name here, it is used everywhere.
export const EGG = { name: 'LEI' };

export const TEXTS = {
  // ---- boot screen ---------------------------------------------------------
  bootLog: [
    'MINISTERO DEL BASSO BIOS v1.40',
    'Memoria: 640K. Dovrebbero bastare.',
    'Controllo subwoofer........ OK',
    'Controllo vicini........... IGNORATO',
    'Firewall.................. ATTIVO',
    'Caricamento rivoluzione.... NEGATO',
    'Whitelist utenti: 1 (' + EGG.name + ')',
    'ATTENZIONE: intrusione in corso',
  ],
  // the fake mandatory update the player "installs"
  installer: {
    title: 'AGGIORNAMENTO_SICUREZZA.exe',
    head: 'AGGIORNAMENTO OBBLIGATORIO',
    body: 'Il Ministero del Basso installerà una quiete più profonda.',
    button: 'INSTALLA',
    progress: 'Installazione...',
    error: 'ERRORE 140: questo non è un aggiornamento.',
    tagline: 'Il basso non si chiede. Si installa.',
  },

  // ---- labels --------------------------------------------------------------
  ui: {
    subtitle: 'STEPHEN MARS / EP',
    headphones: 'meglio con le cuffie',
    level: 'LIV.',
    overdrive: 'INFEZIONE',
    root: 'ACCESSO ROOT',
    limit: 'SOGLIA DI RILEVAMENTO',
    combo: 'COMBO',
    mult: 'MOLT.',
    early: 'PRESTO',
    late: 'TARDI',
    grades: { perfect: 'PERFETTO', good: 'BUONO', ok: 'OK', miss: 'MANCATO', broken: 'MOLLATO' },
    label: 'OVD-001 / LATO A / WHITE LABEL / NON IN VENDITA',
    tap: 'TOCCA',
    hold: 'TIENI',
    nowPlaying: 'ORA IN RIPRODUZIONE',
    share: 'CONDIVIDI',
    board: 'CLASSIFICA',
    map: 'MAPPA',
    again: 'RIGIOCA',
    back: 'INDIETRO',
    calibrate: 'CALIBRA',
    fxFull: 'EFFETTI: PIENI',
    fxReduced: 'EFFETTI: RIDOTTI',
    listen: 'ASCOLTA L\'EP',
    presave: 'PRE-SAVE',
    linkSoon: 'LINK IN ARRIVO',
  },

  // Scrolling strip under the HUD (decoration, low contrast).
  ticker: [
    'MINISTERO DEL BASSO /// FIREWALL ATTIVO /// ANTIVIRUS: QUIETE.SYS /// NESSUNA ANOMALIA RILEVATA /// SCANSIONE IN CORSO /// ',
    'ANOMALIA RILEVATA /// PAYLOAD IN ESECUZIONE /// FIREWALL: BUCATO /// 140 BPM /// IL MINISTERO NON RISPONDE /// ',
  ],

  // ---- the story --------------------------------------------------------------
  // The Minister took away rights nobody thought could be taken: the bass, the
  // dancing, the gathering, the raised voice. Mars is an outside hacker who
  // cannot stand it. He declares himself a virus and breaks into the Ministry's
  // system layer by layer (one per track), lighting a district each time.
  //
  // Each chapter is a list of panels. `who` is 'decree' (a document), 'ministro',
  // 'mars', 'girl' or 'quiete'; `expr` is the face: mars has neutral, sad, angry,
  // shout, win, surprised, glitch; ministro has calm, angry; girl has neutral,
  // happy, wink, surprised; quiete has smile, error.
  names: { mars: 'MARS', ministro: 'IL MINISTRO', decree: 'DECRETO N.140', girl: EGG.name, quiete: 'QUIETE.SYS' },
  story: {
    skip: 'SALTA',
    next: 'TOCCA',
    // Panels may carry: scene (a drawn picture: city_lit, city_off, city_dark, city_on,
    // protest, chaos, monitors), caption (place and time, for narration without a speaker),
    // sfx (siren, crowd, thud, zap, static) and shake (ms).
    intro: {
      chapter: 'CAPITOLO 1',
      title: 'LA NOTTE DEL SILENZIO',
      panels: [
        { scene: 'city_lit', caption: 'QUARTIERE SAN BASS, 23:40', text: 'Ogni sabato, da trent\'anni, il soundsystem accendeva le finestre.' },
        { scene: 'city_off', caption: '23:58', sfx: 'zap', shake: 220, text: 'Stanotte il Ministero ha staccato la spina.' },
        { scene: 'city_dark', caption: '00:00', text: 'Le casse sono spente. Le finestre pure. Nessuno ha detto niente.' },
        { who: 'decree', text: 'VIETATI: basso, ballo, riunioni, voce alta.' },
        { who: 'ministro', expr: 'calm', text: 'La quiete è obbligatoria. Ringraziate in silenzio.' },
        { scene: 'protest', caption: 'PIAZZA DEL MINISTERO, 00:40', sfx: 'crowd', text: 'In cento sono scesi in piazza. Con i cartelli. Senza casse.' },
        { scene: 'protest', caption: '01:20', text: 'Hanno gridato per ore. Il Ministero ha chiuso le persiane, una a una.' },
        { scene: 'chaos', caption: '01:50', sfx: 'siren', shake: 300, text: 'Poi sono arrivati i droni. Per la vostra sicurezza.' },
        { scene: 'chaos', caption: '02:05', sfx: 'thud', text: 'Nessuno li ha ascoltati. Nessuno li ha nemmeno visti.' },
        { scene: 'monitors', who: 'mars', expr: 'sad', sfx: 'static', text: 'Io sì. Da un tetto, su sei schermi. Non ho potuto fare niente.' },
        { scene: 'monitors', who: 'mars', expr: 'angry', text: 'Non erano favori. Erano diritti. Così scontati che nessuno li aveva scritti.' },
        { scene: 'monitors', who: 'mars', expr: 'neutral', text: 'Ogni diritto tolto ha un firewall. Se la piazza non basta, bucheremo il sistema.' },
        { who: 'mars', expr: 'glitch', sfx: 'static', text: 'Io non sono un antivirus. Sono un virus.' },
        { who: 'mars', expr: 'shout', text: 'Tu suoni. Io infetto. Per chi è rimasto al buio. Andiamo.' },
      ],
    },
    // after level 1, by result
    brazilian_high: {
      chapter: 'CAPITOLO 1',
      title: 'FIREWALL CADUTO',
      panels: [
        { scene: 'city_on', caption: 'QUARTIERE SAN BASS, 02:10', sfx: 'crowd', text: 'Una finestra. Poi dieci. Poi tutto il palazzo.' },
        { who: 'ministro', expr: 'angry', text: 'Chi ha lasciato entrare quell\'anomalia?' },
        { who: 'mars', expr: 'win', text: 'Errore 140: gioia non autorizzata.' },
        { who: 'girl', expr: 'happy', text: 'Sei stato bravissimo. Sono fiera di te.' },
        { who: 'mars', expr: 'shout', text: 'Primo quartiere acceso. Ne restano quattro.' },
      ],
    },
    brazilian_mid: {
      chapter: 'CAPITOLO 1',
      title: 'PACCHETTO PERSO',
      panels: [
        { who: 'ministro', expr: 'calm', text: 'Un rumore breve. Lo considereremo un guasto.' },
        { who: 'mars', expr: 'neutral', text: 'Il firewall ha ceduto a metà. Non basta.' },
        { who: 'girl', expr: 'happy', text: "Ci sei quasi. Un'altra prova e passi." },
        { who: 'mars', expr: 'angry', text: 'Un diritto non si chiede due volte.' },
      ],
    },
    brazilian_low: {
      chapter: 'CAPITOLO 1',
      title: 'INTRUSIONE FALLITA',
      panels: [
        { who: 'quiete', expr: 'smile', text: 'Posso aiutarla a stare zitto?' },
        { who: 'mars', expr: 'sad', text: 'Quarantena. Il quartiere resta al buio.' },
        { who: 'girl', expr: 'neutral', text: 'Non mollare. Respira e riprova. Ce la fai.' },
        { who: 'mars', expr: 'angry', text: 'Un virus non chiede il permesso. Si replica.' },
      ],
    },
  },

  // ---- during a level: giant words only ------------------------------------
  // Fired at the start of the given bar (bar 0 = first bar).
  script: {
    brazilian: [
      { bar: -2, expr: 'neutral', word: 'SONO DENTRO' },
      { bar: 2, expr: 'win', word: 'FIREWALL' },
      { bar: 5, expr: 'surprised', word: 'ARRIVA IL DROP' },
      { bar: 6, expr: 'shout', word: 'TRASMETTO' },
      { bar: 14, expr: 'angry', word: 'TRE COLPI' },
      { bar: 17, expr: 'neutral', word: 'TIENI' },
      { bar: 21, expr: 'win', word: 'FIREWALL GIÙ' },
    ],
    dub: [
      { bar: -1, expr: 'neutral', word: 'SCANSIONE' },
      { bar: 4, expr: 'neutral', word: 'PIÙ IN FRETTA' },
      { bar: 12, expr: 'surprised', word: 'SILENZIO SOSPETTO' },
      { bar: 15, expr: 'surprised', word: 'DROP IN ARRIVO' },
      { bar: 16, expr: 'glitch', word: 'TROPPO BASSO' },
      { bar: 24, expr: 'win', word: 'COMPLETATA' },
    ],
  },

  // One or two words, shown big near the speaker stack.
  react: {
    combo: ['INFEZIONE', 'FIREWALL GIÙ', 'ACCESSO'],
    miss: ['RILEVATO', 'TRACCIATO', 'ANTIVIRUS!'],
  },

  loading: 'SINTONIZZAZIONE...',
  // The helper (Easter egg) is a tappable bonus: a badge with her face appears for a
  // few seconds. Tapping it fires a power-up (see Play.useBackup).
  helper: {
    root: ['BACKUP'], // she cheers when root access opens
    spawn: 'TOCCA LEI',
    rewind: 'REWIND', // after a streak of misses: the track goes back a few bars and replays
    gift: 'BONUS ROOT', // the free one, mid-level
    shield: 'SCUDO',
  },
  overdrive: ['SOGLIA SUPERATA'],
  overdriveMode: ['ACCESSO ROOT'],

  // Fake system notifications. Security jargon, deadpan.
  popups: [
    'Firewall del Ministero: 1 minaccia in corso. Non è un errore.',
    'Password scaduta. Il basso non ne ha mai avuta una.',
    'Certificato non valido: la quiete è autofirmata.',
    'Accesso non autorizzato rilevato. Autorizzazione richiesta: ballare.',
    'Antivirus aggiornato. Non ha trovato nulla. Come sempre.',
    'Autenticazione a due fattori: premi il basso due volte.',
    'Sessione scaduta. Riaccedi in silenzio.',
    'Porta 140 aperta. Qualcuno ha dimenticato di chiuderla.',
    'Intrusione bloccata. Poi sbloccata. Poi ballata.',
    'Quarantena fallita. Il file si è messo a ballare.',
    'Il sub è stato classificato come arma impropria.',
  ],

  // ---- result screen: an official report ------------------------------------
  report: {
    ministry: 'MINISTERO DEL BASSO',
    title: 'VERBALE DI INTRUSIONE',
    number: 'N. 000140/A',
    score: 'PUNTEGGIO',
    accuracy: 'PRECISIONE',
    combo: 'COMBO MASSIMA',
    peak: 'INFEZIONE (PICCO)',
    grades: { perfect: 'PERFETTI', good: 'BUONI', ok: 'OK', miss: 'MANCATI' },
    footer: 'Il presente verbale non ha alcun valore. Come tutto.',
    stamps: { low: 'RESPINTO', mid: 'SEGNALATO', high: 'COMPROMESSO' },
  },
  ranks: {
    low: ['Respinto. È un insulto. Riproviamo.'],
    mid: ['Segnalato al Ministero. Buon segno.'],
    high: ['Sistema compromesso. Backdoor aperta.'],
  },

  // ---- the EP: fragments, release, share --------------------------------------
  campaign: {
    fragment: 'PACCHETTO',
    fragmentOk: 'PACCHETTO SCARICATO',
    fragmentBad: 'PACCHETTO CORROTTO',
    epLine: 'EP OVERDRIVE',
    indicative: 'data indicativa',
    prize: 'I PRIMI',
    shareText: (pct, url) => `Ho infettato il Ministero del Basso al ${pct}%. Prova a fare di meglio: ${url}`,
    card: { head: 'HO INFETTATO', sub: 'IL MINISTERO DEL BASSO', cta: 'EP OVERDRIVE // STEPHEN MARS' },
  },

  // ---- leaderboard -----------------------------------------------------------
  board: {
    title: 'CLASSIFICA',
    nick: 'NOME (3-12 lettere)',
    contact: 'IG o email (solo per il premio)',
    consent: 'Accetto di essere contattato se vinco.',
    send: 'INVIA RISULTATO',
    sent: 'RISULTATO INVIATO',
    error: 'Invio non riuscito. Riprova.',
    offline: 'La classifica online apre presto. Il tuo record è salvato su questo telefono.',
    yourBest: 'IL TUO RECORD',
    empty: 'Nessun risultato. Sii il primo.',
    prizeHead: 'IN PALIO',
  },

  // ---- map of the system -------------------------------------------------------
  hub: {
    title: 'MAPPA DEL SISTEMA',
    layers: ['FIREWALL', 'PROXY', 'ANAGRAFE', 'KERNEL', 'SERVER'],
    locked: 'IN ARRIVO',
    hint: 'Ogni singolo accende un quartiere.',
  },

  // ---- calibration ---------------------------------------------------------------
  calibrate: {
    title: 'CALIBRAZIONE',
    body: 'Metti le cuffie con cui giocherai. Tocca a tempo con i click, finché si fermano.',
    start: 'TOCCA PER INIZIARE',
    done: (ms) => `FATTO. Compensazione: ${ms > 0 ? '+' : ''}${ms} ms`,
    redo: 'RIFAI',
    ok: 'OK',
    skip: 'SALTA',
    go: 'CONTINUA',
  },
};
