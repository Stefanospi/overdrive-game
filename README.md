# OVERDRIVE.EXE

Gioco web mobile (verticale) per promuovere l'EP **Overdrive** di Stephen Mars.
Una serie di microgiochi, uno per traccia, guidati da **MARS.EXE**: un antivirus che a un certo punto si scopre essere il virus.

Stack: [Phaser 3](https://phaser.io) + [Vite](https://vitejs.dev), JavaScript puro, nessun asset binario (gli sprite sono generati da codice).

## Avvio

```bash
npm install
npm run dev       # server locale, apri l'indirizzo "Network" dal telefono (stessa wifi)
npm run build     # build di produzione in dist/
npm run preview   # prova la build
```

Su desktop si gioca con mouse o **barra spaziatrice**. Su telefono: tieni premuto lo schermo.

## Com'è fatto

```
src/
  main.js          avvio Phaser (attende i font pixel)
  config.js        dimensioni, colori, font. Usa sempre px(n) per le misure
  texts.js         TUTTE le battute di MARS.EXE (modificabili senza toccare il codice)
  audio.js         mini sintetizzatore Web Audio: beat provvisorio + sub che suoni tenendo premuto
  ui.js            sfondo, scanline, finestre Y2K, bolla di dialogo
  sprites.js       GENERATO: i 4 sprite di MARS.EXE (neutral, glitch, surprised, win)
  scenes/
    Boot.js        schermata iniziale (il tocco sblocca l'audio)
    Dub.js         microgioco 1: tieni premuto, rilascia sul drop
    End.js         risultato
tools/
  make_sprites.py  rigenera src/sprites.js (npm run sprites)
```

## Microgioco 1: DUB

Un anello si chiude sul bersaglio rosso nell'arco di 8 battute a 140 BPM. Tieni premuto (il sub sale di tono) e **rilascia esattamente sul drop**.

| Scarto dal drop | Esito | Overdrive |
|---|---|---|
| fino a 70 ms | PERFETTO | +22 |
| fino a 140 ms | BUONO | +14 |
| fino a 250 ms | OK | +7 |
| oltre | TROPPO PRESTO / TARDI / MANCATO | -12 |

Il clock di gioco è quello dell'audio (`AudioContext.currentTime`), così ritmo e input restano sincronizzati. Con l'overdrive sopra il 60% MARS.EXE passa all'espressione glitch.

Parametri in cima a `src/scenes/Dub.js` (`BPM`, `ROUNDS`, finestre di tolleranza in `GRADES`).

## Come inserire le tracce vere

Oggi il beat è sintetico (`audio.js`). Per usare uno snippet dell'EP:
1. Metti l'mp3/ogg in `public/audio/` (30 secondi bastano).
2. Caricalo in Phaser (`this.load.audio` in una scena di preload) oppure con `fetch` + `decodeAudioData` e fallo partire in `Dub.create()` al posto di `A.scheduleCycle(...)`.
3. Allinea `BPM`, `CYCLE` e la posizione del drop a quelli della traccia.

## Sprite di MARS.EXE

I personaggi sono definiti in `tools/make_sprites.py` (funzione `build()`): capelli, occhiali, outfit, espressioni. Dopo le modifiche:

```bash
npm run sprites   # richiede python3
```

## Da fare

- microgiochi per le altre tracce (jungle, DNB, techno, ...)
- tracce vere al posto del beat sintetico
- card condivisibile 9:16 a fine partita
- link a Spotify/Bandcamp quando l'EP esce
- calibrazione della latenza audio per i telefoni più lenti

## Deploy

Il workflow `.github/workflows/deploy.yml` pubblica su GitHub Pages a ogni push su `main`.
Basta attivare una volta **Settings > Pages > Source: GitHub Actions**.
