export default function externalLink(url: string): string {
  try {
    const proper = new URL(url);
    proper.searchParams.delete("utm_source");
    proper.searchParams.delete("utm_medium");
    proper.searchParams.delete("utm_content");
    proper.searchParams.delete("utm_campaign");
    if (proper.hostname && proper.hostname !== "citeup.com")
      proper.searchParams.set("utm_source", "citeup.com");
    return proper.toString();
  } catch {
    return url;
  }
}
