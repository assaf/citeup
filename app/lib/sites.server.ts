import dns from "node:dns";

export function extractDomain(url: string): string | null {
  try {
    const href = url.startsWith("http") ? url : `https://${url}`;
    const { hostname } = new URL(href);
    if (!hostname || hostname === "localhost") return null;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return null;
    return hostname;
  } catch {
    return null;
  }
}

export async function verifyDomain(domain: string): Promise<boolean> {
  try {
    await Promise.race([
      Promise.any([
        dns.promises.resolve(domain, "A"),
        dns.promises.resolve(domain, "CNAME"),
      ]),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 5_000),
      ),
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function fetchPageContent(domain: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(`https://${domain}/`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const html = await response.text();
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return text.slice(0, 5_000);
  } catch {
    return null;
  }
}
