export async function loader() {
  return new Response(
    JSON.stringify([
      {
        google_prefetch_proxy_eap: { fraction: 1.0 },
        user_agent: "prefetch-proxy",
      },
    ]),
    { headers: { "Content-Type": "application/trafficadvice+json" } },
  );
}
