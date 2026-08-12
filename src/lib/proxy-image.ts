/**
 * Returns a proxied image URL that routes through /api/image-proxy.
 * This lets the browser load images from hotlink-protected hosts like
 * Instagram without being blocked by CORS / referer checks.
 */
export function proxyImage(url: string | null | undefined): string {
  if (!url) return "";
  try {
    new URL(url); // validate
  } catch {
    return url;
  }
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}
