# OVERDRIVE.EXE leaderboard (Cloudflare Worker)

The free tier is plenty for a promo game.

1. `cd worker && npx wrangler login`
2. `npx wrangler kv namespace create BOARD`, paste the id in `wrangler.toml`
3. Set `ALLOWED_ORIGIN` to the game's origin (e.g. `https://USER.github.io`)
4. `npx wrangler deploy`, it prints the Worker URL
5. Build the game with `VITE_API_URL=https://overdrive-board.<you>.workers.dev npm run build`
   (for GitHub Pages, add it as a repository variable and pass it in the workflow)

## Prize winners
Contacts are stored, only with the player's consent, in the KV key `contacts`:
`npx wrangler kv key get --binding=BOARD contacts`.
The server only checks that a score is plausible. Verify the top players by hand
before sending a prize.

Keep `LEVELS` in `index.js` in sync with the note count of each level in `src/levels.js`.
