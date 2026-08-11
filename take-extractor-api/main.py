"""
main.py — Take Extractor API

A small FastAPI service that wraps the extract_take pipeline so it can run
as a hosted service (Railway/Render) instead of a local script.

Endpoints:
    POST /extract   { "url": "https://www.instagram.com/reel/..." }
                     -> returns structured fantasy football takes as JSON

    GET  /health     -> simple liveness check

Auth:
    Requires header: X-API-Key: <your secret>
    Set the expected value via the API_SECRET_KEY environment variable.
    This prevents randoms from finding your Railway URL and racking up
    Whisper/Claude usage on your dime.
"""

import os
import subprocess
import sys
import tempfile
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import anthropic
import whisper

# ---------- Config ----------
WHISPER_MODEL_NAME = os.environ.get("WHISPER_MODEL", "small")
CLAUDE_MODEL = "claude-sonnet-4-6"
API_SECRET_KEY = os.environ.get("API_SECRET_KEY")  # required in production
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

# Allow your site to call this from the browser. Add more origins as needed.
ALLOWED_ORIGINS = [
    "https://ratemysportstake.com",
    "https://www.ratemysportstake.com",
    "http://localhost:3000",  # local dev
]

app = FastAPI(title="Take Extractor API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# Load Whisper once at startup, not per-request — this is the expensive part.
print(f"Loading Whisper model ({WHISPER_MODEL_NAME})...")
whisper_model = whisper.load_model(WHISPER_MODEL_NAME)
print("Whisper model loaded.")

claude_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None


class ExtractRequest(BaseModel):
    url: str


def check_auth(x_api_key: str | None):
    if not API_SECRET_KEY:
        # No key configured — refuse to run wide open in production.
        raise HTTPException(500, "Server misconfigured: API_SECRET_KEY not set")
    if x_api_key != API_SECRET_KEY:
        raise HTTPException(401, "Invalid or missing API key")


def download_audio(url: str, workdir: Path) -> tuple[Path, str | None]:
    """Download audio directly from the URL using yt-dlp's built-in extractor.

    This avoids codec issues (VP9 video-only streams, etc.) by skipping
    video download entirely and letting yt-dlp + ffmpeg handle the
    audio-only pipeline in one step.
    """
    # Use %(ext)s so yt-dlp controls the extension after --extract-audio conversion
    out_template = str(workdir / "audio.%(ext)s")
    result = subprocess.run(
        [
            "yt-dlp",
            "-o", out_template,
            "-f", "bestaudio/best",
            "--extract-audio",
            "--audio-format", "mp3",
            "--audio-quality", "2",
            "--print", "%(upload_date)s",
            url,
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"yt-dlp audio download failed: {result.stderr[-1000:]}")

    # Parse upload date from stdout (format: YYYYMMDD)
    upload_date: str | None = None
    try:
        raw = result.stdout.strip()
        if raw and raw != "NA" and len(raw) == 8:
            upload_date = f"{raw[:4]}-{raw[4:6]}-{raw[6:8]}"
    except Exception:
        upload_date = None

    # Find whatever audio file yt-dlp wrote (audio.mp3, audio.m4a, etc.)
    candidates = list(workdir.iterdir())
    if not candidates:
        raise RuntimeError(f"Audio download succeeded but no audio file was found. stderr: {result.stderr[-500:]}")
    return candidates[0], upload_date


def transcribe_audio(audio_path: Path) -> str:
    result = whisper_model.transcribe(str(audio_path))
    return result["text"].strip()


def extract_fantasy_takes(transcript: str) -> dict:
    import json

    system_prompt = """You are analyzing a transcript of a fantasy football content creator \
talking about players. Extract every distinct take (opinion) they express.

Return ONLY valid JSON (no markdown fences, no preamble) matching this shape:
{
  "video_summary": "1-2 sentence summary of what the video is about",
  "takes": [
    {
      "player": "player name as mentioned",
      "position": "position if mentioned or inferable, else null",
      "stance": "buy | sell | hold | avoid | breakout | bust | start | sit | other",
      "confidence": "how confidently they state it, e.g. 'strong', 'moderate', 'hedged'",
      "reasoning": "brief paraphrase of why, in your own words",
      "quote_paraphrase": "a short paraphrase of the key line (do not quote verbatim)",
      "rating": 3
    }
  ]
}

The rating field is an integer 1-5 reflecting the analyst's ADP-relative conviction:
5 = Way in — would draft above current ADP (strong Buy / Breakout)
4 = Likes them — good value at current ADP (Buy)
3 = Neutral — neither avoid nor seek out
2 = Not in — slightly overrated at current ADP (Avoid)
1 = Won't draft — significant fade (Avoid / Bust)
Infer this from their language and enthusiasm, not just the stance label.

If the transcript is unclear, garbled, or not actually about fantasy football, \
still return valid JSON with an empty takes array and note that in video_summary."""

    message = claude_client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=2000,
        system=system_prompt,
        messages=[{"role": "user", "content": f"Transcript:\n\n{transcript}"}],
    )

    raw = message.content[0].text.strip()
    raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(raw)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/extract")
def extract(req: ExtractRequest, x_api_key: str | None = Header(default=None)):
    check_auth(x_api_key)

    if not claude_client:
        raise HTTPException(500, "Server misconfigured: ANTHROPIC_API_KEY not set")

    with tempfile.TemporaryDirectory() as tmp:
        workdir = Path(tmp)
        try:
            audio_path, upload_date = download_audio(req.url, workdir)
            transcript = transcribe_audio(audio_path)
            result = extract_fantasy_takes(transcript)
        except Exception as e:
            raise HTTPException(500, str(e))

    result["transcript"] = transcript
    result["source_url"] = req.url
    result["upload_date"] = upload_date
    return result
