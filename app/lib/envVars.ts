import dotenv from "dotenv";
import env from "env-var";

dotenv.configDotenv({ quiet: true });

const envVars = {
  ANTHROPIC_API_KEY: env.get("ANTHROPIC_API_KEY").required(false).asString(),
  OPENAI_API_KEY: env.get("OPENAI_API_KEY").required(false).asString(),
  PERPLEXITY_API_KEY: env.get("PERPLEXITY_API_KEY").required(false).asString(),
  GOOGLE_GENERATIVE_AI_API_KEY: env
    .get("GOOGLE_GENERATIVE_AI_API_KEY")
    .required(false)
    .asString(),
  DATABASE_URL: env.get("DATABASE_URL").required().asUrlString(),
  SESSION_SECRET: env.get("SESSION_SECRET").required().asString(),
  RESEND_API_KEY: env.get("RESEND_API_KEY").required().asString(),
  APP_URL: env.get("APP_URL").required().asUrlString(),
  EMAIL_FROM: env.get("EMAIL_FROM").required().asString(),
};

export default envVars;
