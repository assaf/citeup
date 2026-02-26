import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  name: "citeup",
  crons: [],
  github: { enabled: false },
  public: false,
};
