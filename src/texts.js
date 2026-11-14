// Every word on screen lives here. Edit freely: no code changes needed.
// Tone: deadpan, bureaucratic, slightly unhinged.
//
// Writing rule: nobody reads while playing. During a level only 1-2 giant words
// appear (`word`). Sentences live in the story panels, kept to ~8 words each.

export const pick = (list) => list[Math.floor(Math.random() * list.length)];

// OVERDRIVE CREW. Mars (Stefano) is the virus; the other members are named here and used
// everywhere. EGG is Adriana (the backup, formerly the Easter egg), FORGER is Gabriel
// (the forger, who also draws the cover). New members: add an entry and a sprite.
export const EGG = { name: 'ADRIANA.EXE' };
export const FORGER = { name: 'GABRIEL.EXE' };
export const CREW = 'OVERDRIVE CREW';

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
    'Squadra: ' + CREW + ' (in ascolto)',
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
    next: 'AVANTI >',
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
  // happy, wink, surprised; grafico has neutral, happy, wink, surprised; quiete has smile, error.
  names: { mars: 'MARS', ministro: 'IL MINISTRO', decree: 'DECRETO N.140', girl: EGG.name, grafico: FORGER.name, quiete: 'QUIETE.SYS' },
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
        { scene: 'city_lit', caption: 'QUARTIERE SAN BASS, 23:40', text: 'Ogni sabato, il soundsystem accendeva le finestre.' },
        { scene: 'city_off', caption: '23:58', sfx: 'zap', shake: 220, text: 'Stanotte il Ministero ha staccato la spina.' },
        { scene: 'city_dark', caption: '00:00', text: 'Le casse sono spente. Le finestre pure.' },
        { scene: 'city_dark', text: 'Nessuno ha detto niente.' },
        { who: 'decree', text: 'VIETATI: basso, ballo, riunioni, voce alta.' },
        { who: 'ministro', expr: 'calm', text: 'La quiete è obbligatoria. Ringraziate in silenzio.' },
        { scene: 'protest', caption: 'PIAZZA DEL MINISTERO, 00:40', sfx: 'crowd', text: 'In cento sono scesi in piazza.' },
        { scene: 'protest', text: 'Con i cartelli. Senza casse.' },
        { scene: 'protest', caption: '01:20', text: 'Hanno gridato per ore.' },
        { scene: 'protest', text: 'Il Ministero ha chiuso le persiane.' },
        { scene: 'chaos', caption: '01:50', sfx: 'siren', shake: 300, text: 'Poi sono arrivati i droni.' },
        { scene: 'chaos', text: 'Per la vostra sicurezza.' },
        { scene: 'chaos', caption: '02:05', sfx: 'thud', text: 'Nessuno li ha ascoltati. Nessuno li ha visti.' },
        { scene: 'monitors', who: 'mars', expr: 'sad', sfx: 'static', text: 'Io sì. Da un tetto, su sei schermi.' },
        { scene: 'monitors', who: 'mars', expr: 'sad', text: 'Non ho potuto fare niente.' },
        { scene: 'monitors', who: 'mars', expr: 'angry', text: 'Non erano favori. Erano diritti.' },
        { scene: 'monitors', who: 'mars', expr: 'angry', text: 'Così scontati che nessuno li aveva scritti.' },
        { scene: 'monitors', who: 'mars', expr: 'neutral', text: 'Ogni diritto tolto ha un firewall.' },
        { scene: 'monitors', who: 'mars', expr: 'neutral', text: 'Se la piazza non basta, bucheremo il sistema.' },
        { who: 'mars', expr: 'glitch', sfx: 'static', text: 'Io non sono un antivirus. Sono un virus.' },
        { who: 'mars', expr: 'shout', text: 'Tu suoni. Io infetto.' },
        { who: 'mars', expr: 'shout', text: 'Per chi è rimasto al buio.' },
        { who: 'mars', expr: 'shout', text: 'Andiamo.' },
      ],
    },
    // after level 1, by result. Rules: tools/check_story.mjs (npm run check:story).
    brazilian_high: {
      chapter: 'CAPITOLO 1',
      title: 'FIREWALL CADUTO',
      panels: [
        { scene: 'city_on', caption: 'QUARTIERE SAN BASS, 02:10', sfx: 'crowd', text: 'Una finestra. Poi dieci. Poi il palazzo.' },
        { who: 'ministro', expr: 'angry', text: "Decreto N.201: l'anomalia è vietata. Grazie." },
        { who: 'mars', expr: 'win', text: 'Errore 140: gioia non autorizzata.' },
        { who: 'girl', expr: 'happy', text: 'Firewall giù. Canale stabile.' },
        { who: 'mars', expr: 'neutral', text: 'Non possono patchare una frequenza.' },
        { caption: 'NOTIFICA // CANALE PRIVATO', text: 'Nuovo contatto: GABRIEL.EXE. Allega: moduli.' },
        { caption: 'STATO', text: 'Quartiere 1 acceso.' },
      ],
    },
    brazilian_mid: {
      chapter: 'CAPITOLO 1',
      title: 'PACCHETTO PERSO',
      panels: [
        { who: 'ministro', expr: 'calm', text: 'Decreto N.202: il rumore è un guasto.' },
        { who: 'mars', expr: 'neutral', text: 'Il firewall ha ceduto a metà. Non basta.' },
        { who: 'girl', expr: 'happy', text: 'Stato: firewall al 50%. Riprova.' },
        { who: 'mars', expr: 'angry', text: 'Un diritto non si chiede due volte.' },
        { caption: 'STATO', text: 'Quartiere 1 instabile.' },
      ],
    },
    brazilian_low: {
      chapter: 'CAPITOLO 1',
      title: 'INTRUSIONE FALLITA',
      panels: [
        { who: 'quiete', expr: 'smile', text: 'Posso aiutarla a stare zitto?' },
        { who: 'mars', expr: 'sad', text: 'Quarantena. Il quartiere resta al buio.' },
        { who: 'girl', expr: 'neutral', text: 'Canale stabile. Riprova quando vuoi.' },
        { caption: 'STATO', text: 'Quartiere 1 spento.' },
      ],
    },
    // ---- chapter 2: PROXY, track ACID. Gabriel joins; he forges the identity ----------
    acid_intro: {
      chapter: 'CAPITOLO 2',
      title: 'IDENTITÀ FALSA',
      panels: [
        { scene: 'monitors', caption: 'PROXY, 03:10', who: 'mars', expr: 'surprised', sfx: 'static', text: 'Il Proxy mi ha tracciato.' },
        { who: 'mars', expr: 'surprised', text: 'Hanno il mio indirizzo.' },
        { who: 'quiete', expr: 'smile', text: 'Utente non identificato. Si identifichi, prego.' },
        { who: 'girl', expr: 'surprised', text: "Stato: canale in chiusura. Serve un'identità." },
        { who: 'grafico', expr: 'neutral', text: 'Ci penso io. Falsifico tutto. Anche i timbri.' },
        { who: 'mars', expr: 'neutral', text: 'E tu chi saresti?' },
        { who: 'grafico', expr: 'wink', text: 'Gabriel. Copertine e documenti. Tutto in regola.' },
        { caption: 'OVERDRIVE CREW // CANALE PRIVATO // 3 MEMBRI', text: 'La squadra è al completo. Per ora.' },
        { who: 'girl', expr: 'happy', text: 'Canale aperto. Se cadi, ti riavvolgo.' },
        { who: 'grafico', expr: 'happy', text: 'Volto pulito in arrivo. Tu suoni, io timbro.' },
        { who: 'grafico', expr: 'neutral', text: 'Preparo il Decreto N.139. Retrodatato.' },
        { who: 'mars', expr: 'shout', text: 'Proxy. Tocca alla OVERDRIVE CREW. Andiamo.' },
      ],
    },
    acid_high: {
      chapter: 'CAPITOLO 2',
      title: 'PROXY BUCATO',
      panels: [
        { scene: 'city_on', caption: 'QUARTIERE PROXY, 03:40', sfx: 'crowd', text: "Le finestre si riaccendono. Una dopo l'altra." },
        { who: 'ministro', expr: 'angry', text: "Decreto N.211: l'utente non esiste. Grazie." },
        { who: 'grafico', expr: 'happy', text: 'Timbro autentico. Modulo 139 archiviato.' },
        { who: 'girl', expr: 'happy', text: 'Canale sicuro. Siamo tutti dentro.' },
        { who: 'mars', expr: 'win', text: 'Falso il timbro. Vero il quartiere.' },
        { who: 'quiete', expr: 'smile', text: 'La sua pratica è in corso. Attenda.' },
        { caption: 'STATO', text: 'Quartiere 2 acceso.' },
      ],
    },
    acid_mid: {
      chapter: 'CAPITOLO 2',
      title: 'TIMBRO A METÀ',
      panels: [
        { who: 'ministro', expr: 'calm', text: 'Decreto N.150: utente anomalo. Verificheremo.' },
        { who: 'grafico', expr: 'surprised', text: 'Timbro a metà. Serve un altro giro.' },
        { who: 'girl', expr: 'happy', text: 'Stato: identità al 50%. Io sono qui.' },
        { who: 'mars', expr: 'angry', text: "Un'identità vera non si falsifica. Si riprende." },
        { caption: 'STATO', text: 'Quartiere 2 instabile.' },
      ],
    },
    acid_low: {
      chapter: 'CAPITOLO 2',
      title: 'IDENTITÀ RESPINTA',
      panels: [
        { who: 'quiete', expr: 'smile', text: 'Identità respinta. Posso offrirle il silenzio?' },
        { who: 'ministro', expr: 'calm', text: 'Decreto N.212: il battito è sospetto.' },
        { who: 'mars', expr: 'sad', text: 'Tracciato. Ma non fermato.' },
        { caption: 'STATO', text: 'Quartiere 2 spento.' },
      ],
    },
    // ---- chapter 3: SERVER, boss fight vs QUIETE.SYS and the Minister ----------------
    // Every ending closes on a Mars line that leads to the payload screen (the EP link);
    // the 3-word status sits just before it. TODO: payload screen (OVERDRIVE.EXP bar + ESEGUI).
    server_intro: {
      chapter: 'CAPITOLO 3',
      title: 'ROOT',
      panels: [
        { scene: 'monitors', caption: 'SERVER, 04:00', text: 'Ultimo livello. Qui dorme il Ministero.' },
        { who: 'girl', expr: 'neutral', text: 'Canale stabile. Backup pronto.' },
        { who: 'grafico', expr: 'neutral', text: 'Decreto 139 stampato. Manca il timbro.' },
        { who: 'quiete', expr: 'smile', text: 'Posso aiutarla a stare zitto?' },
        { who: 'ministro', expr: 'calm', text: 'Siete in ritardo. Il silenzio è approvato.' },
        { who: 'quiete', expr: 'smile', text: 'Rilevato: un errore. Procedo a rimuoverlo.' },
        { who: 'mars', expr: 'angry', text: 'Non sono un errore. Sono un virus.' },
        { who: 'ministro', expr: 'angry', text: 'Decreto N.300: vietato disturbare il Ministro.' },
        { who: 'grafico', expr: 'wink', text: 'Falsifico tutto. Anche la sua firma.' },
        { who: 'grafico', expr: 'happy', text: 'Il 139 viene prima del 140. Retrodatato.' },
        { who: 'girl', expr: 'neutral', text: 'Mars. Tre fasi. Poi si riaccende tutto.' },
        { who: 'mars', expr: 'shout', text: 'Tu suoni. Io infetto. Andiamo.' },
      ],
    },
    server_high: {
      chapter: 'CAPITOLO 3',
      title: 'CITTÀ INTERA',
      panels: [
        { scene: 'monitors', caption: 'SERVER, 04:35', text: 'Root ottenuto. Il Ministro non risponde.' },
        { who: 'ministro', expr: 'angry', text: 'Decreto 139? Non esiste.' },
        { who: 'grafico', expr: 'happy', text: 'Esiste. È retrodatato. Timbro perfetto.' },
        { who: 'quiete', expr: 'smile', text: 'Aggiornamento disponibile: Basso 2.0.' },
        { who: 'girl', expr: 'happy', text: 'Restore point caricato. Città intera.' },
        { scene: 'city_on', caption: 'CITTÀ, 04:40', sfx: 'crowd', text: 'Il soundsystem riaccende le finestre.' },
        { caption: 'STATO', text: 'Whitelist utenti: tutti.' },
        { who: 'mars', expr: 'win', text: 'Payload consegnato. Premi ESEGUI.' },
      ],
    },
    server_mid: {
      chapter: 'CAPITOLO 3',
      title: 'ACCESSO PARZIALE',
      panels: [
        { scene: 'monitors', caption: 'SERVER, 04:35', text: 'Accesso parziale. Il Ministro balbetta.' },
        { who: 'ministro', expr: 'calm', text: 'Decreto 139 valido. Per errore.' },
        { who: 'girl', expr: 'happy', text: 'Città ripristinata. Quasi tutta.' },
        { caption: 'STATO', text: 'Whitelist utenti: molti.' },
        { who: 'mars', expr: 'neutral', text: 'Il basso tossisce. Ma suona. ESEGUI.' },
      ],
    },
    server_low: {
      chapter: 'CAPITOLO 3',
      title: 'IL TIMBRO REGGE',
      panels: [
        { scene: 'monitors', caption: 'SERVER, 04:35', text: 'Rilevati. Ma il timbro regge.' },
        { who: 'quiete', expr: 'error', text: 'Errore 404: non riesco a zittirvi.' },
        { caption: 'STATO', text: 'Whitelist utenti: pochi.' },
        { who: 'mars', expr: 'neutral', text: 'Bastano. Il link resta. ESEGUI.' },
      ],
    },
  },

  // ---- during a level: giant words only ------------------------------------
  // Fired at the start of the given bar (bar 0 = first bar).
  script: {
    brazilian: [
      { bar: -2, expr: 'neutral', word: 'SONO DENTRO' },
      { bar: 2, expr: 'win', word: 'FIREWALL' },
      { bar: 5, expr: 'surprised', word: 'ARRIVA DROP' },
      { bar: 6, expr: 'shout', word: 'TRASMETTO' },
      { bar: 14, expr: 'angry', word: 'TRE COLPI' },
      { bar: 17, expr: 'neutral', word: 'TIENI' },
      { bar: 21, expr: 'win', word: 'FIREWALL GIÙ' },
    ],
    acid: [
      { bar: -2, expr: 'neutral', word: 'TRACCIATO' },
      { bar: 2, expr: 'neutral', word: 'PROXY' },
      { bar: 5, expr: 'surprised', word: 'ARRIVA DROP' },
      { bar: 6, expr: 'shout', word: 'IDENTITÀ FALSA' },
      { bar: 12, expr: 'angry', word: 'NON FERMARTI' },
      { bar: 18, expr: 'neutral', word: 'MASCHERA TIENE' },
      { bar: 26, expr: 'win', word: 'PROXY GIÙ' },
    ],
    // boss: one giant word at the start of each phase (bars 1, 7 and 13 of the clip)
    server: [
      { bar: 0, expr: 'neutral', word: 'CENSURA' },
      { bar: 6, expr: 'angry', word: 'DECRETO' },
      { bar: 12, expr: 'shout', word: 'ROOT' },
      { bar: 21, expr: 'win', word: 'PAYLOAD' },
    ],
    dub: [
      { bar: -1, expr: 'neutral', word: 'SCANSIONE' },
      { bar: 4, expr: 'neutral', word: 'PIÙ VELOCE' },
      { bar: 12, expr: 'surprised', word: 'SILENZIO SOSPETTO' },
      { bar: 15, expr: 'surprised', word: 'ARRIVA DROP' },
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
    spawn: 'TOCCA ADRIANA',
    rewind: 'REWIND', // after a streak of misses: the track goes back a few bars and replays
    gift: 'BONUS ROOT', // the free one, mid-level
    shield: 'SCUDO',
  },
  // Gabriel's power (chapter 2): a forged ID. Tappable badge, points x2 for 16 beats.
  forger: {
    spawn: 'TOCCA GABRIEL',
    forge: 'ID FALSA',
    double: 'PUNTI x2',
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
    layers: ['FIREWALL', 'PROXY', 'SERVER'],
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
