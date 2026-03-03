import { Output, generateText } from "ai";
import { invariant } from "es-toolkit";
import { z } from "zod";
import prisma from "~/lib/prisma.server";
import { haiku } from "./anthropic";
import defaultQueryCategories from "./defaultQueryCategories";

export default async function generateSiteQueries(
  content: string,
): Promise<{ group: string; query: string }[]> {
  const { output } = await generateText({
    model: haiku,
    output: Output.array({
      element: z.object({
        group: z.string(),
        query: z.string(),
      }),
    }),
    messages: [
      {
        role: "system" as const,
        content: `You generate search queries a user might type into an AI platform (ChatGPT, Perplexity, Claude, Gemini) that should ideally return a citation to the given website.

Return exactly 9 queries: 3 per category.

Categories:
${defaultQueryCategories.map((c) => `- ${c.group}: ${c.intent}`).join("\n")}

Rules:
- Queries must sound like real user questions, not marketing copy.
- Each query should be specific enough to trigger a citation for this site.
- Vary the phrasing; do not repeat the same question structure.`,
      },
      {
        role: "user" as const,
        content: `Website content:\n\n${content}`,
      },
    ],
  });
  return output;
}

if (import.meta.main) {
  const site = await prisma.site.findFirstOrThrow({
    where: { domain: "rentail.space" },
  });
  invariant(site.content, "Site content is not set");
  const queries = await generateSiteQueries(site.content);
  console.log(JSON.stringify(queries, null, 2));
}
