// Everything about the EP promotion lives here: release date, links, prize,
// analytics. Edit this file when dates and links are decided.

export const EP = {
  artist: 'STEPHEN MARS',
  title: 'OVERDRIVE',
  // Indicative until the release is confirmed.
  date: '2027-02-07',
  dateLabel: '7 FEB 2027',
  indicative: true,
  // Fill these in when the EP is out. Empty ones show as "in arrivo".
  links: {
    listen: '', // Spotify / Bandcamp / smart link
    presave: '', // pre-save page
    instagram: '',
  },
  // Top of the leaderboard wins something. Text shown on the board and result screen.
  prize: {
    top: 3,
    text: 'PREMIO DA ANNUNCIARE',
    closes: 'FINO ALL\'USCITA',
  },
  // Public URL of the game, for the share card.
  siteUrl: 'overdrive.game',
};

// Leaderboard backend (see worker/README.md). Empty = local only.
export const API_URL = import.meta.env.VITE_API_URL || '';

// Analytics: Plausible, loaded only if VITE_PLAUSIBLE_DOMAIN is set at build time.
export function initAnalytics() {
  const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
  if (!domain || document.querySelector('script[data-domain]')) return;
  const s = document.createElement('script');
  s.defer = true;
  s.dataset.domain = domain;
  s.src = 'https://plausible.io/js/script.js';
  document.head.appendChild(s);
  window.plausible =
    window.plausible ||
    function () {
      (window.plausible.q = window.plausible.q || []).push(arguments);
    };
}

export function track(name, props) {
  try {
    if (window.plausible) window.plausible(name, props ? { props } : undefined);
  } catch (e) {
    /* analytics must never break the game */
  }
}

// Outbound link with campaign tags, so streams can be traced back to the game.
export function openLink(url, name) {
  if (!url) return false;
  track('link_click', { name });
  const sep = url.includes('?') ? '&' : '?';
  window.open(`${url}${sep}utm_source=overdrive-game&utm_medium=game`, '_blank', 'noopener');
  return true;
}
