"use server";

export interface TweetData {
  rawText: string;
  authorName: string;
  twitterHandle: string;
  dateMade: string; // YYYY-MM-DD
  sourceUrl: string;
}

// ── Helper: clean HTML entities and strip tags ────────────────────────────────

function decodeEntities(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

// ── Strategy 1: fxtwitter API (full text, preserves line breaks) ──────────────

async function fetchViaFxTwitter(tweetId: string): Promise<TweetData | null> {
  try {
    const res = await fetch(`https://api.fxtwitter.com/status/${tweetId}`, {
      headers: { "User-Agent": "RateMySportsTake/1.0" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;

    const json = await res.json();
    const tweet = json?.tweet;
    if (!tweet?.text) return null;

    const rawText = tweet.text
      // Remove trailing "https://t.co/..." links at the end of tweets
      .replace(/\s*https:\/\/t\.co\/\S+$/g, "")
      .trim();

    const authorName: string = tweet.author?.name ?? "";
    const twitterHandle: string = tweet.author?.screen_name
      ? `@${tweet.author.screen_name}`
      : "";

    // created_timestamp is Unix seconds
    const dateMade = tweet.created_timestamp
      ? new Date(tweet.created_timestamp * 1000).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    return { rawText, authorName, twitterHandle, dateMade, sourceUrl: "" };
  } catch {
    return null;
  }
}

// ── Strategy 2: oEmbed (fallback — may truncate very long tweets) ─────────────

async function fetchViaOembed(url: string, tweetId: string): Promise<TweetData | null> {
  try {
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`;
    const res = await fetch(oembedUrl);
    if (!res.ok) return null;

    const data = await res.json();

    const handleMatch = (data.author_url as string).match(/(?:twitter\.com|x\.com)\/(@?\w+)/);
    const twitterHandle = handleMatch ? `@${handleMatch[1].replace("@", "")}` : "";

    // Extract tweet text from the <p> block
    const textMatch = (data.html as string).match(/<p[^>]*>(.*?)<\/p>/s);
    const rawText = textMatch
      ? decodeEntities(
          textMatch[1]
            // Convert <br> to newline BEFORE stripping tags
            .replace(/<br\s*\/?>/gi, "\n")
            // Remove links entirely
            .replace(/<a[^>]*>.*?<\/a>/gs, "")
            // Strip remaining tags
            .replace(/<[^>]+>/g, "")
        ).trim()
      : "";

    // Snowflake → date
    const snowflakeMs = Number(BigInt(tweetId) >> 22n) + 1288834974657;
    const dateMade = new Date(snowflakeMs).toISOString().split("T")[0];

    return {
      rawText,
      authorName: data.author_name,
      twitterHandle,
      dateMade,
      sourceUrl: url,
    };
  } catch {
    return null;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function fetchTweetData(url: string): Promise<TweetData> {
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  if (!match) throw new Error("Invalid X.com tweet URL");

  const tweetId = match[1];

  // Try fxtwitter first — returns full untruncated text with newlines preserved
  const fx = await fetchViaFxTwitter(tweetId);
  if (fx) {
    return { ...fx, sourceUrl: url };
  }

  // Fall back to oEmbed
  const oembed = await fetchViaOembed(url, tweetId);
  if (oembed) return oembed;

  throw new Error("Could not fetch tweet — it may be private or deleted.");
}
