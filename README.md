# OVERDRIVE.EXE

Gioco web mobile (verticale) per promuovere l'EP **Overdrive** di Stephen Mars.
Un rhythm game a corsie, un livello per traccia. Il gioco si presenta come un "aggiornamento di sicurezza obbligatorio" del Ministero: installarlo è avviare il trojan. Il Ministro ha vietato il basso, il ballo e le riunioni; Mars, hacker esterno che non sopporta l'ingiustizia, si dichiara un **virus** (trojan con backdoor) e scardina il sistema del Ministero strato per strato, riaccendendo un quartiere per ogni traccia. Easter egg: la sua ragazza compare in boot, nei popup e nel finale buono. Il nome sta in `EGG.name` in `src/texts.js`.

Stack: [Phaser 3](https://phaser.io) + [Vite](https://vitejs.dev), JavaScript puro. Sprite e sfondi sono generati da codice; l'unico asset è la clip audio di ogni livello.

## Avvio

```bash
npm install
npm run dev       # server locale, apri l'indirizzo "Network" dal telefono (stessa wifi)
npm run build     # build di produzione in dist/
npm run preview   # prova la build
```

Serve Node 20.19 o superiore.

## Come si gioca

Le note escono dal soundsystem e scendono lungo tre corsie. Tocca la corsia quando la nota arriva sulla linea.

- **Telefono:** lo schermo è diviso in tre fasce verticali, una per corsia. Multi-touch attivo.
- **Desktop:** `A S D`, `J K L` oppure le frecce sinistra, giù, destra.
- **Note lunghe:** tieni premuto fino alla fine.
- Un errore "affoga" la traccia per un attimo (filtro passa-basso).
- **iPhone a schermo pieno:** Condividi > Aggiungi alla schermata Home. Aperto da lì il gioco non ha le barre di Safari.

| Scarto | Esito | Punti | Overdrive |
|---|---|---|---|
| fino a 55 ms | PERFETTO | 300 | +2,4 |
| fino a 100 ms | BUONO | 200 | +1,5 |
| fino a 150 ms | OK | 100 | +0,6 |
| oltre | MANCATO | 0 | -5 |

La combo alza il moltiplicatore (x2 a 10, x3 a 20, x4 a 30). La barra è l'**infezione**. Sopra il 60% ("soglia di rilevamento") MARS.EXE comincia a glitchare. Al 100% parte l'**accesso root** (modalità Overdrive): 16 battiti a colori invertiti e punti doppi, poi la barra torna al 55%.

I valori sono in cima a `src/scenes/Play.js` (`GRADES`, `MISS_OD`, `OD_MODE_BEATS`).

## Com'è fatto

```
src/
  main.js          avvio Phaser (attende i font pixel)
  config.js        dimensioni (adattive), colori, font, parametri di debug. Usa sempre px(n)
  texts.js         TUTTO il testo a schermo: storia, battute, etichette, verbale
  levels.js        i livelli: traccia, BPM, sezioni e pattern delle note
  rank.js          precisione e fascia di risultato (decide finale della storia e timbro)
  audio.js         riproduzione delle clip (fade, filtro) e sintetizzatore Web Audio
  fx.js            shader a tutto schermo (CRT, aberrazione, glitch, grana, inversione)
  ui.js            sfondo a retino, finestre Y2K, bolla di dialogo, scritte giganti
  sprites.js       GENERATO: Mars (7 espressioni), il Ministro (2), l'aiutante (4), QUIETE.SYS (2)
  campaign.js      EP: data, link, premio, analytics. QUI si cambiano data e link
  settings.js      impostazioni e progressi su questo telefono (effetti ridotti, calibrazione)
  progress.js      record e pacchetti dell'EP (uno per traccia finita)
  share.js         card 9:16 e condivisione
  leaderboard.js   client della classifica online
worker/            backend classifica (Cloudflare Worker), vedi worker/README.md
  charts/          GENERATO: tempi della clip e bozza delle note, una per traccia
  music/           le clip pubblicate (*.clip.mp3). Le tracce intere restano fuori da git
  scenes/
    Boot.js        schermata iniziale (il tocco sblocca l'audio)
    Story.js       la storia a pannelli, prima e dopo il livello
    Play.js        il gioco: autostrada, note, punteggio, HUD
    End.js         risultato: il verbale, pacchetti, ascolta, condividi, classifica
    Hub.js         mappa dei cinque strati del sistema
    Board.js       classifica e modulo per il premio
    Calibrate.js   calibrazione della latenza audio
tools/
  make_sprites.py    rigenera src/sprites.js (npm run sprites)
  analyze_track.py   taglia la clip e misura la griglia (npm run track)
```

Lo schermo: la larghezza logica è sempre 390, l'altezza logica (`LH`) si calcola all'avvio sulle proporzioni del telefono, così il gioco lo riempie tutto. La risoluzione segue la densità dello schermo fino a 3x.

Il clock di gioco è quello dell'audio (`AudioContext.currentTime`), corretto con la latenza di uscita dichiarata dal browser. Quando la scheda va in secondo piano l'audio si sospende e il gioco si ferma con lui.

## Scrivere un livello

Un livello in `src/levels.js` è una lista di battute. Ogni battuta ha una sezione (`intro`, `groove`, `break`, `build`, `drop`, `end`) e un pattern: una stringa di 16 passi per corsia.

```js
a: ['x.........x.....', '........x.......', '....h--.....h---'],
//   corsia 0           corsia 1            corsia 2
```

`x` è una nota, `h` l'inizio di una nota lunga, `-` la sua continuazione, `.` il vuoto.

Un livello senza `track` genera la musica dalle note stesse (è il caso del livello dimostrativo `?level=dub`).

## Aggiungere una traccia

1. Metti il file intero in `src/music/`. Resta sul tuo computer: `.gitignore` lo esclude.
2. In `tools/analyze_track.py` aggiungi la configurazione: BPM, secondi di inizio e fine, quante battute prima e dopo il drop.
3. `npm run track` (serve `pip install librosa soundfile`). Scrive:
   - `src/music/<id>.clip.mp3`: solo il pezzo che il gioco suona;
   - `src/charts/<id>.js`: i tempi della clip e una bozza di dove cadono i colpi.
4. In `src/levels.js` aggiungi il livello con `track` e `synth: false`, e scrivi i pattern a mano guardando la bozza e ascoltando.

La clip parte in fade in durante le battute senza note e chiude in fade out (`fadeIn`, `fadeOut` nel livello).

## Scrivere la storia

In `src/texts.js`, `TEXTS.story`. Un capitolo è una lista di pannelli:

```js
{ who: 'mars', expr: 'angry', text: 'Non erano favori. Erano diritti.' }
```

`who` è `mars`, `ministro` o `decree`. Espressioni di Mars: `neutral`, `sad`, `angry`, `shout`, `win`, `surprised`, `glitch`. Del Ministro: `calm`, `angry`. Dopo un livello parte il capitolo `<idLivello>_high`, `_mid` o `_low` secondo il risultato.

## Regole di scrittura e di design

- **In partita non si legge.** Solo parole giganti da 1-2 parole (`word` in `TEXTS.script`). Le frasi stanno nei pannelli della storia, massimo ~8 parole.
- Il primo livello ha un tutorial senza testo (anello e un TOCCA / TIENI sulle prime note), mostrato una volta sola.
- "Effetti ridotti" (schermata iniziale): niente inversione colori, niente lampi, niente scosse.

## Promozione dell'EP

Tutto sta in `src/campaign.js`: data (ora **7 febbraio 2027, indicativa**), link ascolto/pre-save/Instagram (vuoti = "link in arrivo"), premio per i primi 3.
Ogni traccia finita con risultato almeno "segnalato" dà un **pacchetto** (5 in tutto). A fine livello: ascolta, condividi (card 9:16), classifica.
Statistiche: costruisci con `VITE_PLAUSIBLE_DOMAIN=tuodominio` (Plausible) per contare partite, finali e click sui link.

## Classifica online

Backend in `worker/` (Cloudflare Worker + KV, gratis). Istruzioni in `worker/README.md`. Si attiva costruendo con `VITE_API_URL=<url del worker>`; senza, la classifica mostra solo il record locale. Il worker controlla solo che il punteggio sia plausibile: verifica a mano i vincitori prima di spedire il premio.

## Timing

Il clock è `AudioContext.currentTime` meno la latenza dichiarata dal browser, più la **calibrazione** (schermata iniziale > CALIBRA: tocca a tempo con i click; ±5 ms di rifinitura). Safari su iPhone dichiara male la latenza, quindi calibra al primo avvio, soprattutto con auricolari bluetooth. La griglia della traccia è stata verificata sul segnale: nessuna deriva (sotto i 5 ms sull'intera clip).

## Debug

Parametri nell'URL, combinabili:

| Parametro | Effetto |
|---|---|
| `?scene=play` / `end` / `story` / `hub` / `board` / `calibrate` | salta alla scena (su un browser normale l'audio parte solo dopo un tocco) |
| `?level=dub` | sceglie il livello per `?scene=play` |
| `?story=brazilian_high` | sceglie il capitolo per `?scene=story` |
| `?auto` | un bot suona tutte le note |
| `?seek=64` | parte dal battito indicato |
| `?offset=30` | compensazione extra della latenza, in ms |

Il gioco è esposto come `window.__overdrive`.

## Sprite di MARS.EXE

I personaggi sono definiti in `tools/make_sprites.py`: `build()` per Mars, `build_minister()` per il Ministro. Dopo le modifiche:

```bash
npm run sprites   # richiede python
```

## Da fare

- rivedere a orecchio le note di BRAZILIAN DUB
- prova di latenza su telefono e schermata di calibrazione
- livelli per le altre tracce (la mappa ha già i cinque strati)
- link ascolto/pre-save in `src/campaign.js` quando l'EP esce
- deploy del worker e premio reale (vedi `worker/README.md`)
- boss QUIETE.SYS giocabile (per ora compare solo nella storia)

## Deploy

Il workflow `.github/workflows/deploy.yml` pubblica su GitHub Pages a ogni push su `main`.
Basta attivare una volta **Settings > Pages > Source: GitHub Actions**.
