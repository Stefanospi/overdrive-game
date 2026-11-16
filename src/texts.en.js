// ENGLISH texts. Same shape as texts.it.js: when you add a key there, add it here too.
// Tone: deadpan, bureaucratic, slightly unhinged.
//
// Writing rule: nobody reads while playing. During a level only 1-2 giant words
// appear (`word`). Sentences live in the story panels, kept to ~8 words each.

import { EGG, FORGER, CREW } from './names.js';

export default {
  // ---- boot screen ---------------------------------------------------------
  bootLog: [
    'MINISTRY OF BASS BIOS v1.40',
    'Memory: 640K. Should be enough.',
    'Checking subwoofer......... OK',
    'Checking neighbours........ IGNORED',
    'Firewall................... ACTIVE',
    'Loading revolution......... DENIED',
    'User whitelist: 1 (' + EGG.name + ')',
    'Crew: ' + CREW + ' (listening)',
    'WARNING: intrusion in progress',
  ],
  // the fake mandatory update the player "installs"
  installer: {
    title: 'SECURITY_UPDATE.exe',
    head: 'MANDATORY UPDATE',
    body: 'The Ministry of Bass will install a deeper quiet.',
    button: 'INSTALL',
    progress: 'Installing...',
    error: 'ERROR 140: this is not an update.',
    tagline: 'Bass is not requested. It is installed.',
  },

  // ---- labels --------------------------------------------------------------
  ui: {
    subtitle: 'STEPHEN MARS / EP',
    headphones: 'best with headphones',
    level: 'LVL.',
    overdrive: 'INFECTION',
    root: 'ROOT ACCESS',
    limit: 'DETECTION THRESHOLD',
    combo: 'COMBO',
    mult: 'MULT.',
    early: 'EARLY',
    late: 'LATE',
    grades: { perfect: 'PERFECT', good: 'GOOD', ok: 'OK', miss: 'MISS', broken: 'DROPPED' },
    label: 'OVD-001 / SIDE A / WHITE LABEL / NOT FOR SALE',
    tap: 'TAP',
    hold: 'HOLD',
    nowPlaying: 'NOW PLAYING',
    share: 'SHARE',
    board: 'LEADERBOARD',
    map: 'MAP',
    again: 'RETRY',
    next: 'NEXT >',
    back: 'BACK',
    calibrate: 'CALIBRATE',
    fxFull: 'EFFECTS: FULL',
    fxReduced: 'EFFECTS: REDUCED',
    listen: 'LISTEN TO THE EP',
    presave: 'PRE-SAVE',
    linkSoon: 'LINK COMING SOON',
    langSwitch: 'ITALIANO', // shown on the title screen: switches to the other language
    enter: 'ENTER',
    toInfect: 'TO INFECT',
    cleared: 'OK',
  },

  // Scrolling strip under the HUD (decoration, low contrast).
  ticker: [
    'MINISTRY OF BASS /// FIREWALL ACTIVE /// ANTIVIRUS: QUIETE.SYS /// NO ANOMALY DETECTED /// SCAN IN PROGRESS /// ',
    'ANOMALY DETECTED /// PAYLOAD EXECUTING /// FIREWALL: BREACHED /// 140 BPM /// THE MINISTRY IS NOT RESPONDING /// ',
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
  names: { mars: 'MARS', ministro: 'THE MINISTER', decree: 'DECREE NO.140', girl: EGG.name, grafico: FORGER.name, quiete: 'QUIETE.SYS' },
  story: {
    skip: 'SKIP',
    next: 'TAP',
    // Panels may carry: scene (a drawn picture: city_lit, city_off, city_dark, city_on,
    // protest, chaos, monitors), caption (place and time, for narration without a speaker),
    // sfx (siren, crowd, thud, zap, static) and shake (ms).
    intro: {
      chapter: 'CHAPTER 1',
      title: 'THE NIGHT OF SILENCE',
      panels: [
        { scene: 'city_lit', caption: 'SAN BASS DISTRICT, 23:40', text: 'Every Saturday, the soundsystem lit the windows.' },
        { scene: 'city_off', caption: '23:58', sfx: 'zap', shake: 220, text: 'Tonight the Ministry pulled the plug.' },
        { scene: 'city_dark', caption: '00:00', text: 'The speakers are off. So are the windows.' },
        { scene: 'city_dark', text: 'Nobody said anything.' },
        { who: 'decree', text: 'BANNED: bass, dancing, gatherings, raised voices.' },
        { who: 'ministro', expr: 'calm', text: 'Quiet is mandatory. Please give thanks silently.' },
        { scene: 'protest', caption: 'MINISTRY SQUARE, 00:40', sfx: 'crowd', text: 'A hundred of them took to the square.' },
        { scene: 'protest', text: 'With signs. Without speakers.' },
        { scene: 'protest', caption: '01:20', text: 'They shouted for hours.' },
        { scene: 'protest', text: 'The Ministry closed the shutters.' },
        { scene: 'chaos', caption: '01:50', sfx: 'siren', shake: 300, text: 'Then the drones arrived.' },
        { scene: 'chaos', text: 'For your safety.' },
        { scene: 'chaos', caption: '02:05', sfx: 'thud', text: 'Nobody listened. Nobody saw them.' },
        { scene: 'monitors', who: 'mars', expr: 'sad', sfx: 'static', text: 'I did. From a rooftop, on six screens.' },
        { scene: 'monitors', who: 'mars', expr: 'sad', text: "I couldn't do anything." },
        { scene: 'monitors', who: 'mars', expr: 'angry', text: 'They were not favours. They were rights.' },
        { scene: 'monitors', who: 'mars', expr: 'angry', text: 'So obvious nobody ever wrote them down.' },
        { scene: 'monitors', who: 'mars', expr: 'neutral', text: 'Every right taken has a firewall.' },
        { scene: 'monitors', who: 'mars', expr: 'neutral', text: "If the square fails, we breach the system." },
        { who: 'mars', expr: 'glitch', sfx: 'static', text: "I'm not an antivirus. I'm a virus." },
        { who: 'mars', expr: 'shout', text: 'You play. I infect.' },
        { who: 'mars', expr: 'shout', text: 'For those left in the dark.' },
        { who: 'mars', expr: 'shout', text: "Let's go." },
      ],
    },
    // after level 1, by result. Rules: tools/check_story.mjs (npm run check:story).
    brazilian_high: {
      chapter: 'CHAPTER 1',
      title: 'FIREWALL DOWN',
      panels: [
        { scene: 'city_on', caption: 'SAN BASS DISTRICT, 02:10', sfx: 'crowd', text: 'One window. Then ten. Then the whole block.' },
        { who: 'ministro', expr: 'angry', text: 'Decree No.201: the anomaly is banned. Thank you.' },
        { who: 'mars', expr: 'win', text: 'Error 140: unauthorized joy.' },
        { who: 'girl', expr: 'happy', text: 'Firewall down. Channel stable.' },
        { who: 'mars', expr: 'neutral', text: "They can't patch a frequency." },
        { caption: 'NOTIFICATION // PRIVATE CHANNEL', text: 'New contact: GABRIEL.EXE. Attached: forms.' },
        { caption: 'STATUS', text: 'District 1 lit.' },
      ],
    },
    brazilian_mid: {
      chapter: 'CHAPTER 1',
      title: 'LOST PACKET',
      panels: [
        { who: 'ministro', expr: 'calm', text: 'Decree No.202: noise is a malfunction.' },
        { who: 'mars', expr: 'neutral', text: 'The firewall gave way halfway. Not enough.' },
        { who: 'girl', expr: 'happy', text: 'Status: firewall at 50%. Try again.' },
        { who: 'mars', expr: 'angry', text: "A right isn't asked for twice." },
        { caption: 'STATUS', text: 'District 1 unstable.' },
      ],
    },
    brazilian_low: {
      chapter: 'CHAPTER 1',
      title: 'INTRUSION FAILED',
      panels: [
        { who: 'quiete', expr: 'smile', text: 'May I help you stay quiet?' },
        { who: 'mars', expr: 'sad', text: 'Quarantine. The district stays dark.' },
        { who: 'girl', expr: 'neutral', text: 'Channel stable. Retry whenever you like.' },
        { caption: 'STATUS', text: 'District 1 dark.' },
      ],
    },
    // ---- chapter 2: PROXY, track ACID. Gabriel joins; he forges the identity ----------
    acid_intro: {
      chapter: 'CHAPTER 2',
      title: 'FALSE IDENTITY',
      panels: [
        { scene: 'monitors', caption: 'PROXY, 03:10', who: 'mars', expr: 'surprised', sfx: 'static', text: 'The Proxy has traced me.' },
        { who: 'mars', expr: 'surprised', text: 'They have my address.' },
        { who: 'quiete', expr: 'smile', text: 'Unidentified user. Please identify yourself.' },
        { who: 'girl', expr: 'surprised', text: 'Status: channel closing. We need an identity.' },
        { who: 'grafico', expr: 'neutral', text: "I'll handle it. I forge everything. Even stamps." },
        { who: 'mars', expr: 'neutral', text: 'And who are you?' },
        { who: 'grafico', expr: 'wink', text: 'Gabriel. Covers and documents. All in order.' },
        { caption: 'OVERDRIVE CREW // PRIVATE CHANNEL // 3 MEMBERS', text: 'The crew is complete. For now.' },
        { who: 'girl', expr: 'happy', text: 'Channel open. If you fall, I rewind you.' },
        { who: 'grafico', expr: 'happy', text: 'Clean face incoming. You play, I stamp.' },
        { who: 'grafico', expr: 'neutral', text: "Preparing Decree No.139. Backdated." },
        { who: 'mars', expr: 'shout', text: "Proxy. OVERDRIVE CREW's turn. Let's go." },
      ],
    },
    acid_high: {
      chapter: 'CHAPTER 2',
      title: 'PROXY BREACHED',
      panels: [
        { scene: 'city_on', caption: 'PROXY DISTRICT, 03:40', sfx: 'crowd', text: 'The windows relight. One after another.' },
        { who: 'ministro', expr: 'angry', text: 'Decree No.211: the user does not exist. Thanks.' },
        { who: 'grafico', expr: 'happy', text: 'Authentic stamp. Form 139 filed.' },
        { who: 'girl', expr: 'happy', text: "Channel secure. We're all inside." },
        { who: 'mars', expr: 'win', text: 'Fake stamp. Real district.' },
        { who: 'quiete', expr: 'smile', text: 'Your request is in progress. Please wait.' },
        { caption: 'STATUS', text: 'District 2 lit.' },
      ],
    },
    acid_mid: {
      chapter: 'CHAPTER 2',
      title: 'HALF A STAMP',
      panels: [
        { who: 'ministro', expr: 'calm', text: 'Decree No.150: anomalous user. We will verify.' },
        { who: 'grafico', expr: 'surprised', text: 'Half a stamp. We need another round.' },
        { who: 'girl', expr: 'happy', text: "Status: identity at 50%. I'm here." },
        { who: 'mars', expr: 'angry', text: "A real identity isn't forged. It's retaken." },
        { caption: 'STATUS', text: 'District 2 unstable.' },
      ],
    },
    acid_low: {
      chapter: 'CHAPTER 2',
      title: 'IDENTITY REJECTED',
      panels: [
        { who: 'quiete', expr: 'smile', text: 'Identity rejected. May I offer you silence?' },
        { who: 'ministro', expr: 'calm', text: 'Decree No.212: the heartbeat is suspicious.' },
        { who: 'mars', expr: 'sad', text: 'Traced. But not stopped.' },
        { caption: 'STATUS', text: 'District 2 dark.' },
      ],
    },
    // ---- chapter 3: SERVER, boss fight vs QUIETE.SYS and the Minister ----------------
    // Every ending closes on a Mars line that leads to the payload screen (the EP link);
    // the 3-word status sits just before it. TODO: payload screen (OVERDRIVE.EXP bar + EXECUTE).
    server_intro: {
      chapter: 'CHAPTER 3',
      title: 'ROOT',
      panels: [
        { scene: 'monitors', caption: 'SERVER, 04:00', text: 'Final level. The Ministry sleeps here.' },
        { who: 'girl', expr: 'neutral', text: 'Channel stable. Backup ready.' },
        { who: 'grafico', expr: 'neutral', text: 'Decree 139 printed. Missing the stamp.' },
        { who: 'quiete', expr: 'smile', text: 'May I help you stay quiet?' },
        { who: 'ministro', expr: 'calm', text: "You're late. Silence is approved." },
        { who: 'quiete', expr: 'smile', text: 'Detected: one error. Removing it.' },
        { who: 'mars', expr: 'angry', text: "I'm not an error. I'm a virus." },
        { who: 'ministro', expr: 'angry', text: 'Decree No.300: disturbing the Minister is banned.' },
        { who: 'grafico', expr: 'wink', text: 'I forge everything. Even his signature.' },
        { who: 'grafico', expr: 'happy', text: '139 comes before 140. Backdated.' },
        { who: 'girl', expr: 'neutral', text: 'Mars. Three phases. Then everything relights.' },
        { who: 'mars', expr: 'shout', text: "You play. I infect. Let's go." },
      ],
    },
    server_high: {
      chapter: 'CHAPTER 3',
      title: 'THE WHOLE CITY',
      panels: [
        { scene: 'monitors', caption: 'SERVER, 04:35', text: 'Root obtained. The Minister is not responding.' },
        { who: 'ministro', expr: 'angry', text: 'Decree 139? It does not exist.' },
        { who: 'grafico', expr: 'happy', text: "It exists. It's backdated. Perfect stamp." },
        { who: 'quiete', expr: 'smile', text: 'Update available: Bass 2.0.' },
        { who: 'girl', expr: 'happy', text: 'Restore point loaded. Whole city.' },
        { scene: 'city_on', caption: 'CITY, 04:40', sfx: 'crowd', text: 'The soundsystem relights the windows.' },
        { caption: 'STATUS', text: 'Whitelist users: all.' },
        { who: 'mars', expr: 'win', text: 'Payload delivered. The bass is free.' },
      ],
    },
    server_mid: {
      chapter: 'CHAPTER 3',
      title: 'PARTIAL ACCESS',
      panels: [
        { scene: 'monitors', caption: 'SERVER, 04:35', text: 'Partial access. The Minister stammers.' },
        { who: 'ministro', expr: 'calm', text: 'Decree 139 is valid. By mistake.' },
        { who: 'girl', expr: 'happy', text: 'City restored. Almost all of it.' },
        { caption: 'STATUS', text: 'Whitelist users: many.' },
        { who: 'mars', expr: 'neutral', text: 'The bass coughs. But it plays.' },
      ],
    },
    server_low: {
      chapter: 'CHAPTER 3',
      title: 'THE STAMP HOLDS',
      panels: [
        { scene: 'monitors', caption: 'SERVER, 04:35', text: 'Detected. But the stamp holds.' },
        { who: 'quiete', expr: 'error', text: "Error 404: can't silence you." },
        { caption: 'STATUS', text: 'Whitelist users: few.' },
        { who: 'mars', expr: 'neutral', text: 'The link stays. The bass returns.' },
      ],
    },
  },

  // ---- during a level: giant words only ------------------------------------
  // Fired at the start of the given bar (bar 0 = first bar).
  script: {
    brazilian: [
      { bar: -2, expr: 'neutral', word: "I'M IN" },
      { bar: 2, expr: 'win', word: 'FIREWALL' },
      { bar: 5, expr: 'surprised', word: 'DROP INCOMING' },
      { bar: 6, expr: 'shout', word: 'TRANSMITTING' },
      { bar: 14, expr: 'angry', word: 'THREE HITS' },
      { bar: 17, expr: 'neutral', word: 'HOLD' },
      { bar: 21, expr: 'win', word: 'FIREWALL DOWN' },
    ],
    acid: [
      { bar: -2, expr: 'neutral', word: 'TRACED' },
      { bar: 2, expr: 'neutral', word: 'PROXY' },
      { bar: 5, expr: 'surprised', word: 'DROP INCOMING' },
      { bar: 6, expr: 'shout', word: 'FAKE ID' },
      { bar: 12, expr: 'angry', word: "DON'T STOP" },
      { bar: 18, expr: 'neutral', word: 'MASK HOLDS' },
      { bar: 26, expr: 'win', word: 'PROXY DOWN' },
    ],
    // boss: the word of phase 1. The other phases and the events are in `boss.words`.
    server: [
      { bar: 0, expr: 'neutral', word: 'CENSORSHIP' },
    ],
    dub: [
      { bar: -1, expr: 'neutral', word: 'SCANNING' },
      { bar: 4, expr: 'neutral', word: 'FASTER' },
      { bar: 12, expr: 'surprised', word: 'SUSPICIOUS SILENCE' },
      { bar: 15, expr: 'surprised', word: 'DROP INCOMING' },
      { bar: 16, expr: 'glitch', word: 'BASS OVERLOAD' },
      { bar: 24, expr: 'win', word: 'COMPLETE' },
    ],
  },

  // One or two words, shown big near the speaker stack.
  react: {
    combo: ['INFECTION', 'FIREWALL DOWN', 'ACCESS'],
    miss: ['DETECTED', 'TRACED', 'ANTIVIRUS!'],
  },

  loading: 'TUNING IN...',
  // The helper (Easter egg) is a tappable bonus: a badge with her face appears for a
  // few seconds. Tapping it fires a power-up (see Play.useBackup).
  helper: {
    root: ['BACKUP'], // she cheers when root access opens
    spawn: 'TAP ADRIANA',
    rewind: 'REWIND', // after a streak of misses: the track goes back a few bars and replays
    gift: 'BONUS ROOT', // the free one, mid-level
    shield: 'SHIELD',
  },
  // Gabriel's power (chapter 2): a forged ID. Tappable badge, points x2 for 16 beats.
  forger: {
    spawn: 'TAP GABRIEL',
    forge: 'FAKE ID',
    double: 'POINTS x2',
  },
  // The boss fight (chapter 3): a health bar for the Ministry, one name per phase.
  boss: {
    hp: 'INTEGRITY',
    phases: ['QUIETE.SYS', 'THE MINISTER', 'QUIETE+MINISTER'],
    censored: 'CENSORED',
    hit: ['HIT', 'DAMAGE', 'CRITICAL'],
    phaseDown: ['QUIETE.SYS DOWN', 'MINISTER DOWN', 'FUSION DOWN'],
    ko: 'TOTAL ROOT',
    // giant words tied to events (max 2 words)
    words: { riff: 'RIFF', drop: 'DROP', root: 'ROOT', stun: 'BREAK', backup: 'BACKUP', stamp: 'STAMP', phase: ['', 'DECREE', 'FUSION'], exec: 'EXECUTE', loading: 'LOADING', tap: 'TAP', ko: 'KO' },
    // the EP screen after ESEGUI
    ep: { title: 'OVERDRIVE EP', cover: 'COVER COMING SOON', next: 'CONTINUE' },
  },
  overdrive: ['THRESHOLD EXCEEDED'],
  overdriveMode: ['ROOT ACCESS'],

  // Fake system notifications. Security jargon, deadpan.
  popups: [
    'Ministry firewall: 1 threat in progress. This is not a bug.',
    'Password expired. Bass never had one.',
    'Invalid certificate: the quiet is self-signed.',
    'Unauthorized access detected. Authorization required: dance.',
    'Antivirus updated. Found nothing. As always.',
    'Two-factor authentication: press the bass twice.',
    'Session expired. Log back in silently.',
    'Port 140 open. Someone forgot to close it.',
    'Intrusion blocked. Then unblocked. Then danced.',
    'Quarantine failed. The file started dancing.',
    'The sub has been classified as an improper weapon.',
  ],

  // ---- result screen: an official report ------------------------------------
  report: {
    ministry: 'MINISTRY OF BASS',
    title: 'INTRUSION REPORT',
    number: 'NO. 000140/A',
    score: 'SCORE',
    accuracy: 'ACCURACY',
    combo: 'MAX COMBO',
    peak: 'INFECTION (PEAK)',
    grades: { perfect: 'PERFECT', good: 'GOOD', ok: 'OK', miss: 'MISSED' },
    footer: 'This report has no value whatsoever. Like everything.',
    stamps: { low: 'REJECTED', mid: 'FLAGGED', high: 'COMPROMISED' },
  },
  ranks: {
    low: ['Rejected. That is an insult. Again.'],
    mid: ['Reported to the Ministry. Good sign.'],
    high: ['System compromised. Backdoor open.'],
  },

  // ---- the EP: fragments, release, share --------------------------------------
  campaign: {
    fragment: 'PACKET',
    fragmentOk: 'PACKET DOWNLOADED',
    fragmentBad: 'PACKET CORRUPTED',
    epLine: 'OVERDRIVE EP',
    indicative: 'tentative date',
    prize: 'TOP',
    prizeText: 'PRIZE TO BE ANNOUNCED',
    release: 'OUT',
    shareText: (pct, url) => `I infected the Ministry of Bass at ${pct}%. Try to do better: ${url}`,
    card: { head: 'I INFECTED', sub: 'THE MINISTRY OF BASS', cta: 'OVERDRIVE EP // STEPHEN MARS' },
  },

  // ---- leaderboard -----------------------------------------------------------
  board: {
    title: 'LEADERBOARD',
    nick: 'NAME (3-12 letters)',
    contact: 'IG or email (prize only)',
    consent: 'I agree to be contacted if I win.',
    send: 'SUBMIT RESULT',
    sent: 'RESULT SUBMITTED',
    error: 'Submission failed. Try again.',
    offline: 'The online leaderboard opens soon. Your record is saved on this phone.',
    slow: 'Wait a minute and try again.',
    yourBest: 'YOUR BEST',
    empty: 'No results yet. Be the first.',
    prizeHead: 'UP FOR GRABS',
  },

  // ---- map of the system -------------------------------------------------------
  hub: {
    title: 'SYSTEM MAP',
    layers: ['FIREWALL', 'PROXY', 'SERVER'],
    locked: 'COMING SOON',
    hint: 'Every single lights up a district.',
  },

  // ---- how to play (first launch, and from the title screen) ---------------------
  howto: {
    link: 'HOW TO PLAY',
    next: 'NEXT',
    skip: 'SKIP',
    play: 'PLAY',
    cards: [
      { title: 'TAP IN TIME', body: 'Notes fall down 3 lanes. Tap the lane when they reach the line.' },
      { title: 'HOLD', body: 'Long notes are held down. Let go when they end.' },
      { title: 'GOAL', body: 'Every hit in time infects the system. Fill the bar up to ROOT ACCESS. Three levels, then the boss.' },
      { title: 'THE CREW', body: 'When a box shows up at the bottom, tap it: it helps you. Adriana on the left, Gabriel on the right.' },
    ],
  },

  // ---- calibration ---------------------------------------------------------------
  calibrate: {
    title: 'CALIBRATION',
    body: 'Put on the headphones you will play with. Tap along with the clicks until they stop.',
    start: 'TAP TO START',
    done: (ms) => `DONE. Compensation: ${ms > 0 ? '+' : ''}${ms} ms`,
    tooFew: 'TOO FEW TAPS. TRY AGAIN.',
    redo: 'REDO',
    ok: 'OK',
    skip: 'SKIP',
    go: 'CONTINUE',
  },
};
