# OVERDRIVE.EXE: appunti per le prossime modifiche

Aggiornato dopo i test di gioco di Stefano. Il contesto generale sta in `CLAUDE.md`; qui ci sono le decisioni recenti e cosa resta da fare.

## Stato dei livelli (test di Stefano)

- **Livello 2 ACID: perfetto, non toccarlo.** È il riferimento di difficoltà e di stile per gli altri.
  Struttura: kick 4/4 in corsia 0, basso acid sul levare in corsia 1, synth in corsia 2 (stab sugli step 7 e 15, e 1 e 9 nelle battute dure). Nessuna nota sullo stesso step. Pattern `a b c d f` in `src/levels.js`.
- **Livello 1 BRAZILIAN DUB: rifatto (da riprovare).** Segnalato come "molto più complicato e un po' fuori tempo coi bottoni".
  Analisi sul segnale (`src/music/brazilian-dub.clip.mp3`):
  - La griglia della clip è a posto: gli onset cadono entro ±4 ms dai sedicesimi. Il "fuori tempo" non veniva dalla clip ma dalla scelta delle note.
  - Cause trovate: 105 note (contro le 151 di ACID, ma molto più sparse e sincopate); stab del synth sugli step 2, 6, 8 a 2 step di distanza e **in contemporanea a una nota lunga** (si tiene la corsia 2 e si tocca la 1); calci in corsia 0 sugli step 3, 10, 12 dove nel segnale non c'è un kick netto (suonavano a caso).
  - Correzioni: 72 note; mai un tap mentre una nota lunga è premuta (la nota lunga è il ritmo); solo gli stab forti; in corsia 0 resta qualche colpo del sub (step 3, 10); minimo 2 step tra due tap.
  - Se ancora scomodo: togliere i tap dopo le note lunghe nelle battute m2/m8, o accorciare le note lunghe. Se fuori tempo in modo costante su un telefono è la latenza: rifare la calibrazione (non il livello).
- **Livello 3 TOP ONE (boss): l'idea va bene (confermata da Stefano), ora è una vera boss fight.** In scena ci sono il Ministro e QUIETE.SYS con sprite di battaglia (attacco quando sbagli, colpito quando prendi la nota, KO a segmento vuoto) e numeri di danno; più lunga è la combo, più danno fai (da x0,9 a x2 a combo 40). Da provare su telefono: bilanciamento del danno e leggibilità degli sprite.
- Versione precedente della nota: Battaglia con barra della salute (3 segmenti, danno per nota colpita), censura sulle corsie, root forzato in fase 3. La mappa note è ancora una bozza non ascoltata. Vedi sotto: il finale va reso molto più spettacolare.

## Lingue

IT/EN (`src/texts.it.js`, `src/texts.en.js`, scelta in `Lang` prima del caricamento). Ogni chiave nuova va in tutte e due; `npm run check:story` controlla entrambe.

## FATTO (branch `feature/boss-spectacle`): boss spettacolo + ESEGUI + schermata EP

Stadi A-G fatti, dettagli in `CLAUDE.md` (sezione "Boss spettacolo"). Numeri in `src/bossTuning.js`.
Esiti con il bot: perfetto = high (0% rimasto), `?boss=good` = high (1,6%), `?boss=bad` = low (67%).

Da provare su telefono: leggibilità delle note sopra il colosso (`giantAlpha`, `roadAlpha`), bilanciamento (`base`, `guardMax`, `stunDmg`), attesa su ESEGUI (loop del riser: si sente un click?), apertura del link da ASCOLTA.

Non fatto (stadio H): terminale che prende il controllo, barra OVERDRIVE.EXP al 99%, lista tracce come pacchetti, contatore utenti. La sezione sotto resta come piano per quello.

## Piano originale del finale (in parte fatto, vedi sopra)

Obiettivo: dopo la boss fight il giocatore deve vivere un momento "wow" che finisce in modo naturale sul pulsante dell'EP (Spotify/Bandcamp, `EP.links` in `src/campaign.js`). Oggi il boss finisce nei pannelli di storia e poi nel verbale normale: troppo piatto. I finali di storia dicono già "Premi ESEGUI", ma il pulsante non esiste.

### Idea base: schermata PAYLOAD (a tutto schermo, dopo il boss e il capitolo finale)
1. **Terminale che prende il controllo**: righe che scorrono veloci (root@ministero, `chmod +x overdrive.exp`, "backdoor aperta per tutti"), glitch/CRT al massimo, suono di battitura.
2. **Barra OVERDRIVE.EXP** che si carica a scatti sul ritmo della traccia (TOP ONE che continua a suonare, non il silenzio), fermandosi al 99% con un finto errore ironico ("Errore 140: gioia non autorizzata") prima di esplodere.
3. **Pulsante ESEGUI gigante** che pulsa a tempo, con aberrazione cromatica. Un solo tocco = apre il link dell'EP (`openLink` con utm) e fa partire l'esplosione finale. Se il link non c'è ancora: "ESEGUI" porta al pre-save / "LINK IN ARRIVO".
4. **La città si riaccende**: panoramica dall'alto dei tre quartieri (Firewall, Proxy, Server) che si illuminano uno alla volta, finestre rosse, soundsystem che pompa a tempo. Riusare `storyScenes.js` (`city_on`) e la musica.
5. **Copertina dell'EP che si compone a pezzi** disegnati da Gabriel (un pezzo per capitolo completato, il terzo è l'ultimo): la copertina non esiste ancora, serve quando c'è. Fino ad allora, segnaposto in stile flyer rave fotocopiato.
6. **Lista tracce dell'EP come "pacchetti scaricati"** (i 3 pacchetti del giocatore + i restanti "in arrivo"), poi pulsanti ASCOLTA, CONDIVIDI (card 9:16 già pronta in `share.js`), CLASSIFICA.

### Altre idee per far salire lo spettacolo
- Durante la boss fight: barra della salute più scenica (il Ministro che si "sbriciola" a pixel a ogni fase), il KO a rallentatore con inversione colori e il drop della traccia che esplode, "ROOT TOTALE" in lettere a contorno gigante stile flyer.
- Il Ministro e QUIETE.SYS che si fondono (sprite fuso) in fase 3; decreti come note speciali da NON toccare, o da tagliare con un doppio tocco.
- Cameo di tutta la OVERDRIVE CREW nell'ultima scena: Adriana (backup) e Gabriel (timbro finale sul Decreto N.139), poi Mars che lancia il payload.
- Esito diverso nel payload secondo il risultato (`server_high|mid|low`): high = città intera, mid = parziale, low = "il timbro regge" ma il link resta comunque.
- Effetto "backdoor aperta per tutti": contatore finto di utenti che entrano (numeri che salgono), da collegare alla classifica reale se c'è il worker.
- Suono: stinger di sistema che si rompe, riser sul caricamento della barra, silenzio di un battito prima di ESEGUI.

### Vincoli da rispettare
- Il gioco è il mezzo di promozione: il pulsante verso l'EP deve essere il punto focale, grande, raggiungibile col pollice, mai nascosto dietro più di un tocco.
- Rispettare "effetti ridotti" (`reducedFx()`): niente lampi/inversioni a raffica se attivo.
- Poche parole (regola "nessuno legge"): max ~8 parole per pannello, parole giganti da 1-2 parole. Testi in IT e EN.
- Elementi statici cotti in texture, dimensioni con `px()`, posizioni relative a `LH`.
- Le tracce complete non vanno mai pubblicate (solo le clip `*.clip.mp3`).

## Altro ancora aperto
- Ascoltare e rifinire le mappe note di TOP ONE (boss) e rivedere BRAZILIAN dopo le correzioni.
- Prova di latenza su telefono vero; deploy del worker della classifica; link reali dell'EP in `src/campaign.js`; data di uscita reale.
- Livelli per le altre tracce dell'EP (JUNGLE, DNB, TECHNO) con le varianti già elencate in `CLAUDE.md`.
- Copertina dell'EP di Gabriel (e sprite/grafica che ne dipendono).
