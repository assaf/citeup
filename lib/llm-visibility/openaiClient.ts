import { openai } from "@ai-sdk/openai";
import type { LanguageModelV3Source } from "@ai-sdk/provider";
import { generateText } from "ai";
import envVars from "~/lib/envVars";
import type { QueryFn } from "./llmVisibility";

const MODEL_ID = "gpt-5-chat-latest";

export default async function openaiClient(query: string): ReturnType<QueryFn> {
  const { sources, text } = await generateText({
    maxOutputTokens: 2000,
    model: openai(MODEL_ID),
    providerOptions: {
      openai: {
        apiKey: envVars.OPENAI_API_KEY,
      },
    },
    prompt: [
      {
        role: "system",
        content: `
You are ChatGPT with web search capabilities. When answering questions, search
the web for current information and cite your sources using numbered citations
like [1], [2], etc. Always include a 'Sources:' section at the end with numbered
references.`,
      },
      {
        role: "user",
        content: [{ text: query, type: "text" }],
      },
    ],
    tools: {
      web_search: openai.tools.webSearch({
        externalWebAccess: true,
        searchContextSize: "high",
      }),
    },
    toolChoice: { type: "tool", toolName: "web_search" },
  });
  const citations = (sources as LanguageModelV3Source[])
    .filter((s) => s.sourceType === "url")
    .map((s) => s.url);
  return { citations, extraQueries: [], text };
}
