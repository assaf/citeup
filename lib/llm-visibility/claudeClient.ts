import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { invariant } from "es-toolkit";
import envVars from "~/lib/envVars";
import type { QueryFn } from "./llmVisibility";

const MODEL_ID = "claude-haiku-4-5-20251001";

export default async function queryClaude(query: string): ReturnType<QueryFn> {
  invariant(envVars.ANTHROPIC_API_KEY, "ANTHROPIC_API_KEY is not set");
  const { sources, text } = await generateText({
    model: anthropic(MODEL_ID),
    providerOptions: {
      anthropic: {
        apiKey: envVars.ANTHROPIC_API_KEY,
      },
    },
    prompt: [
      {
        role: "system",
        content: `
You are Claude with web search capabilities. When answering questions, search
the web for current information and cite your sources using numbered citations
like [1], [2], etc. Always include a 'Sources:' section at the end with numbered
references.`,
      },
      {
        role: "user",
        content: [{ text: query, type: "text" }],
      },
    ],
    maxOutputTokens: 2000,
    tools: {
      web_search: anthropic.tools.webSearch_20250305({}),
    },
    toolChoice: { type: "tool", toolName: "web_search" },
  });
  const citations = sources
    .filter((source) => source.sourceType === "url")
    .map((source) => source.url);
  return { citations, extraQueries: [], text };
}
