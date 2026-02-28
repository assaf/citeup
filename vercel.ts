import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  crons: [{ path: "/api/cron/citation-runs", schedule: "0 6 * * *" }],
  github: { enabled: false },
  public: false,
};
