# Deploying the Take Extractor API to Railway

## What this is

A hosted version of the take-extraction pipeline. Instead of running a script
in Terminal, this runs as an always-on web service with one endpoint:

```
POST https://your-app.up.railway.app/extract
Headers: X-API-Key: <your secret>
Body: { "url": "https://www.instagram.com/reel/XXXXXXXXX/" }
```

It returns the same structured JSON the local script did.

## One-time setup

### 1. Push this folder to GitHub

Create a new repo (or a folder in an existing one) containing:
- `main.py`
- `requirements.txt`
- `Dockerfile`

```bash
cd take-extractor-api
git init
git add .
git commit -m "Take extractor API"
git remote add origin https://github.com/YOUR_USERNAME/take-extractor-api.git
git push -u origin main
```

### 2. Deploy to Railway

1. Go to railway.app, sign in with GitHub
2. "New Project" → "Deploy from GitHub repo" → select this repo
3. Railway will detect the `Dockerfile` automatically and build from it

### 3. Set environment variables

In the Railway project, go to Variables and add:

| Key | Value |
|---|---|
| `ANTHROPIC_API_KEY` | your Claude API key |
| `API_SECRET_KEY` | any random string you make up — this is the password your website will use to call the API. Generate one with `openssl rand -hex 32` in Terminal. |
| `WHISPER_MODEL` | `small` (optional — defaults to small if not set) |

### 4. Get your URL

Railway gives you a public URL like `https://take-extractor-api-production.up.railway.app`.
That's your endpoint. Test it:

```bash
curl -X POST https://your-app.up.railway.app/extract \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-here" \
  -d '{"url": "https://www.instagram.com/reel/DbqimgAOy6L/"}'
```

If that returns JSON with takes in it, the service is live.

## Cost notes

- Railway's Hobby plan (~$5/mo usage-based) covers this comfortably for occasional/personal use.
- The Whisper model loads once when the service starts (not per-request), so
  repeated calls are faster after the first one, but the service does need to
  "wake up" if it's been idle and Railway spins it down.
- If you want it always warm (no cold-start delay), Railway's paid tier keeps
  it running continuously — check current pricing on railway.app before
  committing.

## Next step: connect it to your website

Once this is live and tested via curl, the next piece is a page on
RateMySportsTake with a text box that POSTs to this endpoint and displays
the result — that's a separate small Next.js API route + page, happy to
build that next.
