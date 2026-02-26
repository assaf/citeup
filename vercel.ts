import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  crons: [],
  github: { enabled: false },
  public: false,
};
