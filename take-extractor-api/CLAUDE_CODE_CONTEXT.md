# Take Extractor API — Context for Claude Code

## What this is

A hosted service that takes an Instagram video URL and returns structured
fantasy football takes (player, stance, reasoning) extracted from the audio.
Pipeline: yt-dlp (download) → ffmpeg (extract audio) → Whisper (transcribe)
→ Claude API (structure into JSON).

Originally built and tested as a local CLI script (`extract_take.py`,
now living separately at `~/Documents/Take Extractor/` — not part of this repo),
then rebuilt as a FastAPI service so it can run as an always-on hosted API
instead of requiring Terminal access each time.

## Where it lives

- **Code:** `take-extractor-api/` folder inside this repo (`RateMySportsTake`)
  - `main.py` — FastAPI app, single `/extract` POST endpoint
  - `requirements.txt` — Python deps (fastapi, uvicorn, yt-dlp, openai-whisper, anthropic)
  - `Dockerfile` — installs ffmpeg (required, not in Python base image) and runs uvicorn
  - `DEPLOY.md` — original deployment instructions
- **Hosting:** Railway, connected directly to this GitHub repo
  - Root directory is set to `take-extractor-api` in Railway's service Settings →
    Source, so Railway only builds this folder and ignores the rest of the
    Next.js site
  - Project name on Railway: `exemplary-perfection`

## Current status (as of this session)

- ✅ Deployed successfully and running (`ACTIVE` / `Online` in Railway)
- ✅ Environment variables set in Railway: `ANTHROPIC_API_KEY`, `API_SECRET_KEY`, `WHISPER_MODEL=tiny`
- ⚠️ Had to switch Whisper model from `small` → `tiny` because the `small`
  model (461MB) exceeded Railway's default memory allocation and the
  container was repeatedly OOM-killed ("Killed" in logs) right after loading
  the model. `tiny` fixed it. If transcription accuracy needs improving later,
  the fix is either bumping Railway's memory allocation (Settings → Scale)
  and reverting to `small`/`medium`, not just changing the env var blindly.
- ✅ Public domain generated via Railway Settings → Networking → Generate Domain:
  `https://ratemysportstake-production.up.railway.app`
- ✅ Tested end-to-end via curl against the live public URL — confirmed
  working. Sent a real Instagram reel URL, got back correctly structured
  JSON (video_summary, takes array with player/position/stance/confidence/
  reasoning/quote_paraphrase, full transcript, source_url). Output quality
  matched the earlier local-script test on the same video. The service is
  fully functional end-to-end: download → transcribe → structure → respond.

### Example working request

```bash
curl -X POST https://ratemysportstake-production.up.railway.app/extract \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <value from Railway Variables tab>" \
  -d '{"url": "https://www.instagram.com/reel/DbqimgAOy6L/"}'
```

Response time was a few minutes (video download + tiny-model transcription
+ Claude call). This is expected and not something to "fix" — it's inherent
to the pipeline, not a bug.

## API contract

```
POST /extract
Headers:
  Content-Type: application/json
  X-API-Key: <API_SECRET_KEY value from Railway>
Body:
  { "url": "https://www.instagram.com/reel/XXXXXXXXX/" }

Response: JSON with shape
  {
    "video_summary": "...",
    "takes": [
      {
        "player": "...",
        "position": "...",
        "stance": "buy | sell | hold | avoid | breakout | bust | start | sit | other",
        "confidence": "strong | moderate | hedged",
        "reasoning": "...",
        "quote_paraphrase": "..."
      }
    ],
    "transcript": "...",
    "source_url": "..."
  }
```

## Known open items / next steps

Deployment is done and confirmed working (see above). Remaining work:

1. **Next up:** Build the front-end piece — a page on RateMySportsTake
   (admin-only) with a text input for the URL, a submit button, and a
   results view that calls this API. Not started yet. This is the main
   thing to pick up now.
2. Once the results view works, wire the extracted takes to write into
   Supabase (likely the existing takes table or a new `extracted_takes`
   table) instead of just displaying raw JSON.
3. Reasonable question for later: whether `take-extractor-api` should
   actually live in the `sports-take-pipeline` repo instead, since that repo
   already holds other Python scripts (`auto_grader.py`, `daily_ingest.py`).
   Not moved yet — flagged as a possible reorg, not urgent.

## Notes on repo structure gotcha

There are two local folders on this machine both named `RateMySportsTake`:
- `~/RateMySportsTake` — the correct one, connected to
  `github.com/trekker10/RateMySportsTake.git`, actively used
- `~/Desktop/RateMySportsTake` — an older/stale copy, also has its own
  `.git`, but last touched in June. Do not confuse the two — always confirm
  with `git remote -v` if unsure which copy is being worked in.

There is also a separate sibling repo `~/sports-take-pipeline`, connected to
`github.com/trekker10/sports-take-pipeline.git`, containing unrelated Python
scripts (ADP CSVs, `auto_grader.py`, `daily_ingest.py`, etc.) — not part of
this take-extractor work but worth knowing it exists as a separate project.
