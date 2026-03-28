/**
 * Formats a USD number compactly: $4.2M, $850K, $320
 */
export function formatUSD(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    const k = value / 1_000;
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

/**
 * Formats a percentage: 0.23 → "23%"
 */
export function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Formats a token count with commas: 14320 → "14,320"
 */
export function formatTokens(value: number): string {
  return value.toLocaleString();
}

/**
 * Extracts a YouTube video ID from a URL.
 */
export function youtubeVideoId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

/**
 * Returns the YouTube thumbnail URL for a video ID.
 */
export function youtubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
