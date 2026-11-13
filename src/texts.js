// All the words MARS.EXE says live here. Edit freely: no code changes needed.
// Tone: deadpan, bureaucratic, slightly unhinged.

export const pick = (list) => list[Math.floor(Math.random() * list.length)];

export const TEXTS = {
  boot: ['Benvenuto. Sono MARS.EXE, il tuo antivirus. Non toccare niente.'],
  tutorial: ['Tieni premuto. Rilascia sul drop. Non è difficile. (È difficile.)'],

  perfect: ["Bravo. Non l'avrei detto.", 'Perfetto. Sospetto.', 'Preciso. Quasi inquietante.'],
  good: ['Accettabile. Il Ministero approva.', 'Bene. Quasi.'],
  ok: ['Ci siamo. A grandi linee.', 'Scarso, ma presente.'],
  miss: ['Questo non era nel manuale. Nemmeno nel mio.', 'Errore. Non il mio.'],
  early: ['Troppo presto. La rivoluzione ha i suoi tempi.', 'Hai rilasciato prima del drop. Coraggioso.'],
  late: ['Troppo tardi. Il drop non ti ha aspettato.', 'Il drop è passato. Lo abbiamo salutato da parte tua.'],

  overdrive: ['Rivoluzione.exe ha smesso di rispondere. Io no.'],

  popups: [
    'Il Ministero del Basso ti informa: stai andando bene. Smettila.',
    'Aggiornamento disponibile. Non per te.',
    'Hai 1 nuovo avviso. È uguale al precedente.',
    'Il sub è stato classificato come arma impropria.',
  ],

  ranks: {
    low: ['Il sistema è al sicuro. Purtroppo.', 'Nessuna minaccia rilevata. Nessuna anche in te.'],
    mid: ['Segnalato al Ministero del Basso. È un buon segno.', 'Quasi una rivoluzione. Quasi.'],
    high: ['Sistema compromesso. Ottimo lavoro.', 'Ti devo una rivelazione. Più avanti.'],
  },
};
