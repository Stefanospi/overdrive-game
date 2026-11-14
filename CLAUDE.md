# OVERDRIVE.EXE: contesto del progetto

Gioco web mobile (verticale) per promuovere l'EP **Overdrive** di Stephen Mars (UK dub, jungle, DNB, techno; estetica rosso, Y2K, rivoluzione). L'EP ha 5-6 tracce, uscita prevista l'anno prossimo, nessuna data. I titoli delle tracce sono ancora provvisori.

Chi lavora qui: Stefano (Stephen Mars), full stack developer. Parlagli in italiano. Il gioco deve essere pronto da condividere via link, pensato soprattutto per il telefono.

## Concept

- Un **rhythm game a corsie (stile Guitar Hero verticale), un livello per traccia**, con una storia che li lega e una barra Overdrive. L'idea iniziale dei microgiochi slegati stile WarioWare è stata abbandonata.
- Guida e voce ricorrente: **MARS.EXE**, parodia dell'assistente stile Clippy basata sull'aspetto di Stefano (ricci neri, occhiali tondi, cerchietti, barba corta, bomber denim scuro con tre strisce grigie, camicia bianca, cravatta nera, pantaloni neri larghi, scarpe nere lucide).
- Arco narrativo: all'inizio è l'antivirus calmo e pedante; con l'Overdrive che sale glitcha e si contraddice; alla fine si scopre che **non era l'antivirus, era il virus** (la rivoluzione). La rivelazione sblocca il finale con i link all'EP.
- Tono: **ironico, serio, caotico**. Serietà deadpan applicata a cose assurde: errori burocratici ("Rivoluzione.exe ha smesso di rispondere"), un "Ministero del Basso" che manda avvisi, manifesti pseudo-politici. Battute brevi: una per livello più reazioni di 2-3 parole.
- Storia: **il Ministro** (Ministero del Basso) ha tolto ai cittadini diritti così scontati che nessuno li aveva mai scritti: il basso, ballare, riunirsi, alzare la voce (Decreto N.140). **Mars è il protagonista**: trasmette da una radio pirata e si nasconde nel sistema del Ministero fingendosi il suo antivirus, MARS.EXE. Ogni traccia riaccende un quartiere (cinque in tutto). La storia si racconta a pannelli (scena `Story`) prima e dopo il livello, con finale diverso secondo il risultato.
- Estetica: pixel art, rosso (#ff2a2a) su nero, finestre Y2K argentate, più l'immaginario underground UK: soundsystem, radio pirata, palazzoni, flyer rave fotocopiati (retino, fuori registro, scritte giganti a contorno), etichetta white label. Tutto passa da uno shader CRT. Palette stretta: nero, rosso, carta, argento. Il ciano compare solo come frangia dell'aberrazione.
- Rollout previsto: ogni singolo pubblicato sblocca un nuovo livello; il gioco può uscire prima come teaser con 1-2 livelli. A fine partita: card condivisibile 9:16 e, quando c'è, link a Spotify/Bandcamp.

## Stato

Fatto: Vite + Phaser 3, scene Boot / Story / Play / End. Motore a corsie con note singole e note lunghe. **Livello 1: BRAZILIAN DUB**, traccia vera (clip 0:27-1:08, 140 BPM, fade in e fade out), note scritte a mano sopra l'analisi del segnale. Capitolo 1 della storia (intro e tre finali). Shader CRT, soundsystem e palazzi che reagiscono all'audio, modalità Overdrive al 100%, verbale del Ministero come schermata finale. Sprite: Mars in 7 espressioni (neutral, glitch, surprised, win, sad, angry, shout), il Ministro in 2 (calm, angry). Schermo adattivo: altezza logica calcolata sul telefono, risoluzione fino a 3x. Deploy su GitHub Pages via workflow.

Non ancora fatto: verifica a orecchio delle note di BRAZILIAN DUB (sono state scritte senza poter ascoltare), prova di latenza su telefono, capitoli e livelli successivi, hub tra i livelli, calibrazione latenza, card condivisibile.

Tracce: i file completi stanno in `src/music/` e **non vanno mai pubblicati** (sono in `.gitignore`: l'EP non è uscito). Si pubblica solo la clip `*.clip.mp3` tagliata da `tools/analyze_track.py`.

Idee di variante per le altre tracce, sempre sullo stesso motore: JUNGLE raffiche sui colpi di breakbeat; DNB quarta corsia o swipe; TECHNO falsi colpi da ignorare sul 4/4; POP-UP finestre Y2K che coprono le note.

## Convenzioni di codice

- Dimensioni sempre con `px(n)` da `src/config.js`. La larghezza logica è 390; l'altezza logica `LH` dipende dal telefono (620-900): posiziona tutto rispetto a `LH`, mai a un'altezza fissa. Il fattore `K` (2 o 3) segue la densità dello schermo.
- Per una traccia nuova: aggiungi la configurazione in `tools/analyze_track.py`, lancia `npm run track` (serve `pip install librosa soundfile`), poi scrivi i pattern a mano in `src/levels.js` usando come guida la bozza in `src/charts/`.
- La storia sta in `TEXTS.story`: un capitolo è una lista di pannelli `{ who, expr, text }`. Il finale di un livello è il capitolo `<idLivello>_<high|mid|low>`.
- Tutto il testo a schermo sta solo in `src/texts.js` (battute, etichette, verbale); niente stringhe nel codice delle scene.
- I livelli stanno in `src/levels.js` come pattern di 16 passi per corsia (`x` nota, `h` + `-` nota lunga). `Play.js` è un'unica scena che suona qualsiasi livello: non creare una scena per traccia.
- Lo shader a tutto schermo è in `src/fx.js`; le scene lo pilotano scrivendo numeri sull'istanza (`ab`, `glitch`, `pump`, `invert`, `grain`).
- Gli elementi statici vanno cotti in una texture una volta sola (`drawBackdrop`, `textTexture`), non ridisegnati a ogni frame.
- `src/sprites.js` è **generato**: non modificarlo a mano. Si cambia `tools/make_sprites.py` (`build()` per Mars, `build_minister()` per il Ministro) e si lancia `npm run sprites`. Anche `src/charts/*.js` è generato.
- Il clock di gioco è `AudioContext.currentTime`: ogni logica di ritmo si aggancia a quello, non a `Date.now()` o ai frame.
- Il gioco è esposto come `window.__overdrive` per il debug da console. Parametri URL di debug: `?scene=play|end|story`, `?level=<id>`, `?story=<id>`, `?auto`, `?seek=<battiti>`, `?offset=<ms>`.
- Comandi: `npm run dev`, `npm run build`, `npm run preview`.
