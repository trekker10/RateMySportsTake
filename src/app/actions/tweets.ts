"use server";

export interface TweetData {
  rawText: string;
  authorName: string;
  twitterHandle: string;
  dateMade: string; // YYYY-MM-DD
  sourceUrl: string;
}

export async function fetchTweetData(url: string): Promise<TweetData> {
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  if (!match) throw new Error("Invalid X.com tweet URL");

  const tweetId = match[1];

  const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true`;
  const response = await fetch(oembedUrl);
  if (!response.ok) throw new Error("Could not fetch tweet — it may be private or deleted");

  const data = await response.json();

  // Pull handle out of author_url (https://twitter.com/handle)
  const handleMatch = (data.author_url as string).match(/(?:twitter\.com|x\.com)\/(@?\w+)/);
  const twitterHandle = handleMatch ? `@${handleMatch[1].replace("@", "")}` : "";

  // Extract tweet text from oEmbed HTML, strip links and tags
  const textMatch = (data.html as string).match(/<p[^>]*>(.*?)<\/p>/s);
  const rawText = textMatch
    ? textMatch[1]
        .replace(/<a[^>]*>.*?<\/a>/gs, "")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim()
    : "";

  // Derive date from the Twitter snowflake ID (no extra API call needed)
  const snowflakeMs = Number(BigInt(tweetId) >> 22n) + 1288834974657;
  const dateMade = new Date(snowflakeMs).toISOString().split("T")[0];

  return {
    rawText,
    authorName: data.author_name,
    twitterHandle,
    dateMade,
    sourceUrl: url,
  };
}
