# AI Mood Journal

Write how you feel → AI detects the emotion → get a short motivational
message → entry is saved → see your mood trend as a chart.

- **Frontend**: React + Vite
- **AI**: OpenAI `gpt-4o-mini`, called from a serverless function so the
  key never touches the browser
- **Storage**: browser `localStorage`, saved as JSON (per-device, no
  database needed for this scope)
- **Chart**: Recharts

## 1. Run it locally

```bash
npm install
npm i -g vercel        # only once, gives you `vercel dev` which runs both
                        # the Vite frontend and the /api function together
cp .env.example .env
# edit .env and paste your real OpenAI key
vercel dev
```

Open the URL it prints (usually `http://localhost:3000`).

> If you don't want to install the Vercel CLI locally, `npm run dev` also
> works, but the `/api/analyze` route won't respond until you deploy —
> Vite alone doesn't run serverless functions.

## 2. Get an OpenAI API key

1. Go to https://platform.openai.com/api-keys
2. Create a key, copy it
3. Put it in `.env` as `OPENAI_API_KEY=sk-...`

(Swap in Gemini instead: edit `api/analyze.js`, point the `fetch` at
Google's `generativelanguage.googleapis.com` endpoint and adjust the
request/response shape — the rest of the app doesn't need to change.)

## 3. Deploy to a public URL (Vercel — free tier is enough)

```bash
npm i -g vercel      # if you skipped it above
vercel login
vercel                # first deploy, follow the prompts (link/create project)
vercel env add OPENAI_API_KEY   # paste your key when prompted, choose "Production"
vercel --prod          # deploy the live version
```

Vercel prints your public URL, something like:

```
https://ai-mood-journal-yourname.vercel.app
```

That's your shareable link.

### Or deploy without the CLI (just as fast)
1. Push this folder to a new GitHub repo
2. Go to https://vercel.com/new, import the repo
3. In the "Environment Variables" step, add `OPENAI_API_KEY`
4. Click Deploy

## Notes on scope

- `localStorage` means each visitor's journal lives only on their own
  browser/device — no accounts, no shared database. That matches "SQLite
  or JSON" from the brief in the simplest way. If you later want entries
  synced across devices, swap `localStorage` calls in `src/App.jsx` for
  calls to a real database (e.g. Vercel Postgres, Supabase) — the rest of
  the UI doesn't need to change.
- Never put an API key directly in frontend code — it would be visible to
  anyone who opens dev tools and gets abused within hours. Always route
  AI calls through a server/serverless function, which is what
  `api/analyze.js` does here.
