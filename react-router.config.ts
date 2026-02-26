import type { Config } from "@react-router/dev/config";
import { sentryOnBuildEnd } from "@sentry/react-router";
import { vercelPreset } from "@vercel/react-router/vite";

export default {
  buildEnd: ({ viteConfig, reactRouterConfig, buildManifest }) =>
    sentryOnBuildEnd({ viteConfig, reactRouterConfig, buildManifest }),
  future: {},
  prerender: async () => [],
  presets: [vercelPreset()],
  ssr: true,
} satisfies Config;
