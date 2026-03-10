/**
 * Create a bot tracker instance.
 *
 * @param apiKey - The API key to use for authentication.
 * @param endpoint - The endpoint to use for tracking.
 * @returns A bot tracker instance.
 */
export function createBotTracker({
  apiKey,
  endpoint,
}: {
  apiKey: string;
  endpoint: string;
}): {
  /**
   * Track a bot visit given an HTTP request.
   */
  track: (request: Request) => void;
} {
  return {
    track(request) {
      fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          accept: request.headers.get("accept"),
          ip: request.headers.get("x-forwarded-for"),
          referer: request.headers.get("referer"),
          url: request.url.toString(),
          userAgent: request.headers.get("user-agent"),
        }),
      }).catch(() => {});
    },
  };
}
