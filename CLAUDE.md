# OVERDRIVE.EXE: contesto del progetto

Gioco web mobile (verticale) per promuovere l'EP **Overdrive** di Stephen Mars (UK dub, jungle, DNB, techno; estetica rosso, Y2K, rivoluzione). L'EP ha 5-6 tracce, uscita prevista l'anno prossimo, nessuna data. I titoli delle tracce sono ancora provvisori.

Chi lavora qui: Stefano (Stephen Mars), full stack developer. Parlagli in italiano. Il gioco deve essere pronto da condividere via link, pensato soprattutto per il telefono.

## Concept

- Una serie di **microgiochi da 20-30 secondi, uno per traccia** (stile WarioWare), con una barra Overdrive condivisa.
- Guida e voce ricorrente: **MARS.EXE**, parodia dell'assistente stile Clippy basata sull'aspetto di Stefano (ricci neri, occhiali tondi, cerchietti, barba corta, bomber denim scuro con tre strisce grigie, camicia bianca, cravatta nera, pantaloni neri larghi, scarpe nere lucide).
- Arco narrativo: all'inizio è l'antivirus calmo e pedante; con l'Overdrive che sale glitcha e si contraddice; alla fine si scopre che **non era l'antivirus, era il virus** (la rivoluzione). La rivelazione sblocca il finale con i link all'EP.
- Tono: **ironico, serio, caotico**. Serietà deadpan applicata a cose assurde: errori burocratici ("Rivoluzione.exe ha smesso di rispondere"), un "Ministero del Basso" che manda avvisi, manifesti pseudo-politici. Battute brevi: una per livello più reazioni di 2-3 parole.
- Estetica: pixel art, rosso (#ff2a2a) su nero, finestre Y2K argentate, scanline.
- Rollout previsto: ogni singolo pubblicato sblocca un nuovo microgioco; il gioco può uscire prima come teaser con 1-2 livelli. A fine partita: card condivisibile 9:16 e, quando c'è, link a Spotify/Bandcamp.

## Stato

Fatto: scheletro Vite + Phaser 3, scene Boot / Dub / End, microgioco 1 (DUB: tieni premuto, rilascia sul drop) con beat sintetico Web Audio, sprite di MARS.EXE in 4 espressioni, testi in `src/texts.js`, deploy su GitHub Pages via workflow.

Non ancora fatto: provato su telefono vero (feeling del ritmo, latenza audio), tracce vere, altri microgiochi, card condivisibile, calibrazione latenza.

Idee di microgioco per le altre tracce: JUNGLE tap a raffica sui colpi di breakbeat; DNB swipe sinistra/destra per schivare; TECHNO tap solo sul 4/4 ignorando i falsi colpi; POP-UP chiudi finestre Y2K a tempo.

## Convenzioni di codice

- Dimensioni sempre con `px(n)` da `src/config.js` (il canvas è a 2x per restare nitido).
- Le battute stanno solo in `src/texts.js`; niente testo di dialogo nel codice delle scene.
- `src/sprites.js` è **generato**: non modificarlo a mano. Si cambia `tools/make_sprites.py` (funzione `build()`) e si lancia `npm run sprites`.
- Il clock di gioco è `AudioContext.currentTime`: ogni logica di ritmo si aggancia a quello, non a `Date.now()` o ai frame.
- Il gioco è esposto come `window.__overdrive` per il debug da console.
- Comandi: `npm run dev`, `npm run build`, `npm run preview`.
