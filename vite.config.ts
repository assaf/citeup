import { reactRouter } from "@react-router/dev/vite";
import { sentryReactRouter } from "@sentry/react-router";
import tailwindcss from "@tailwindcss/vite";
import { type UserConfig, defineConfig, mergeConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(async (config) =>
  mergeConfig(config, {
    build: {
      sourcemap: true,
    },
    plugins: [
      tailwindcss(),
      reactRouter(),
      tsconfigPaths(),
      sentryReactRouter(
        {
          authToken: process.env.SENTRY_AUTH_TOKEN,
          org: "labnotes",
          project: "citeup",
          telemetry: false,
        },
        config,
      ),
    ],
    optimizeDeps: {
      include: ["react", "react-dom"],
    },
    ssr: {
      noExternal: [],
    },
    server: {
      allowedHosts: [".ngrok-free.app"],
    },
  } satisfies UserConfig),
);
