import Phaser from 'phaser';
import { W, LH, px, COLORS, FONT_PS, FONT_VT } from '../config.js';
import { FIRST_LEVEL, LEVELS } from '../levels.js';
import { drawBackdrop, drawLabelStrip, button } from '../ui.js';
import { attachFx } from '../fx.js';
import { TEXTS } from '../texts.js';
import { EP } from '../campaign.js';
import { settings } from '../settings.js';
import { bestOf } from '../progress.js';
import { fetchBoard, submitScore, online } from '../leaderboard.js';

// Leaderboard. After a run it also shows a small form (name, optional contact for the
// prize) as a real HTML overlay, so the phone keyboard and autofill just work.
export class Board extends Phaser.Scene {
  constructor() {
    super('Board');
  }

  init(data) {
    this.from = (data && data.from) || 'Boot';
    this.result = data && data.result && !data.result.auto ? data.result : null;
    this.levelId = (this.result && this.result.level) || FIRST_LEVEL;
  }

  create() {
    drawBackdrop(this);
    this.fx = attachFx(this);
    drawLabelStrip(this, TEXTS.ui.label);
    this.cameras.main.fadeIn(250);
    const B = TEXTS.board;
    const ps = (n, color = '#ffffff') => ({ fontFamily: FONT_PS, fontSize: px(n) + 'px', color });
    const vt = (n, color = '#c0c0c0') => ({ fontFamily: FONT_VT, fontSize: px(n) + 'px', color });

    this.add.text(W / 2, px(30), `${B.title} // ${LEVELS[this.levelId].title}`, ps(11)).setOrigin(0.5);

    // prize banner
    const g = this.add.graphics();
    g.fillStyle(COLORS.redDark, 1).fillRect(px(16), px(54), W - px(32), px(46));
    g.lineStyle(px(2), 0x000000, 1).strokeRect(px(16), px(54), W - px(32), px(46));
    this.add.text(W / 2, px(63), `${B.prizeHead} (TOP ${EP.prize.top})`, ps(7)).setOrigin(0.5, 0);
    this.add.text(W / 2, px(78), TEXTS.campaign.prizeText, vt(22, '#ffffff')).setOrigin(0.5, 0);

    this.rowsTop = 112;
    this.list = this.add.container(0, 0);
    this.msg = this.add.text(W / 2, px(this.rowsTop + 10), online() ? '...' : B.offline, {
      ...vt(21),
      align: 'center',
      wordWrap: { width: px(320) },
    }).setOrigin(0.5, 0);

    const mine = bestOf(this.levelId);
    this.add
      .text(W / 2, px(LH - 128 - (this.result ? 150 : 0)), `${B.yourBest}: ${mine ? String(mine.score).padStart(7, '0') : '-'}`, vt(22, '#ff7a7a'))
      .setOrigin(0.5);

    if (online()) fetchBoard(this.levelId).then((rows) => this.showRows(rows));
    if (this.result && online()) this.buildForm();
    button(this, W / 2, px(LH - 52), px(150), px(30), TEXTS.ui.back, () => this.leave(), { size: 8, depth: 6 });
    this.events.once('shutdown', () => this.removeForm());
  }

  showRows(rows) {
    if (!this.sys.isActive()) return;
    const B = TEXTS.board;
    if (!rows) {
      this.msg.setText(B.offline);
      return;
    }
    if (!rows.length) {
      this.msg.setText(B.empty);
      return;
    }
    this.msg.setVisible(false);
    const me = (settings.get('nick', '') || '').toLowerCase();
    const maxRows = Math.max(5, Math.floor((LH - this.rowsTop - 150 - (this.result ? 150 : 0)) / 24));
    rows.slice(0, maxRows).forEach((r, i) => {
      const y = px(this.rowsTop + i * 24);
      const color = r.nick.toLowerCase() === me ? '#ff2a2a' : i < EP.prize.top ? '#ffffff' : '#c0c0c0';
      const st = { fontFamily: FONT_VT, fontSize: px(22) + 'px', color };
      this.list.add(this.add.text(px(24), y, String(i + 1).padStart(2, '0'), st));
      this.list.add(this.add.text(px(62), y, r.nick, st));
      this.list.add(this.add.text(W - px(24), y, String(r.score).padStart(7, '0'), st).setOrigin(1, 0));
    });
  }

  buildForm() {
    const B = TEXTS.board;
    const box = document.createElement('div');
    box.id = 'board-form';
    box.style.cssText =
      'position:fixed;left:50%;transform:translateX(-50%);bottom:84px;width:min(360px,92vw);padding:10px;background:#0b0507;border:2px solid #ff2a2a;color:#f4f1ea;font:20px VT323,monospace;z-index:20;';
    const field = 'width:100%;box-sizing:border-box;margin:4px 0;padding:6px;background:#15121a;border:1px solid #c0c0c0;color:#fff;font:20px VT323,monospace;';
    box.innerHTML =
      `<input id="bf-nick" maxlength="12" placeholder="${B.nick}" autocomplete="nickname" style="${field}">` +
      `<input id="bf-contact" maxlength="80" placeholder="${B.contact}" autocomplete="email" style="${field}">` +
      `<label style="display:flex;gap:8px;align-items:center;font-size:18px;margin:4px 0"><input id="bf-consent" type="checkbox"> ${B.consent}</label>` +
      `<button id="bf-send" style="width:100%;padding:8px;background:#ff2a2a;color:#fff;border:2px solid #000;font:12px 'Press Start 2P',monospace;cursor:pointer">${B.send}</button>` +
      `<div id="bf-msg" style="min-height:22px;margin-top:4px;color:#ff7a7a"></div>`;
    document.body.appendChild(box);
    this.form = box;
    const nick = box.querySelector('#bf-nick');
    nick.value = settings.get('nick', '');
    box.querySelector('#bf-contact').value = settings.get('contact', '');
    const msg = box.querySelector('#bf-msg');
    box.querySelector('#bf-send').addEventListener('click', async () => {
      const n = nick.value.replace(/[^A-Za-z0-9 _.-]/g, '').trim();
      if (n.length < 3) {
        msg.textContent = B.nick;
        return;
      }
      const contact = box.querySelector('#bf-contact').value.trim();
      settings.set('nick', n);
      settings.set('contact', contact);
      msg.textContent = '...';
      const r = await submitScore(this.result, { nick: n, contact, consent: box.querySelector('#bf-consent').checked });
      if (r.ok) {
        msg.textContent = `${B.sent}${r.rank ? ' - #' + r.rank : ''}`;
        box.querySelector('#bf-send').disabled = true;
        fetchBoard(this.levelId).then((rows) => {
          this.list.removeAll(true);
          this.showRows(rows);
        });
      } else {
        msg.textContent = r.reason === 'slow' ? B.slow : B.error;
      }
    });
  }

  removeForm() {
    if (this.form) this.form.remove();
    this.form = null;
  }

  leave() {
    this.removeForm();
    this.cameras.main.fadeOut(220);
    this.time.delayedCall(230, () => this.scene.start(this.from === 'End' ? 'Hub' : 'Boot'));
  }

  update() {
    if (this.fx) {
      this.fx.glitch = 0;
      this.fx.ab = 0.3;
      this.fx.pump = 0;
      this.fx.invert = 0;
      this.fx.grain = 0.05;
    }
  }
}
