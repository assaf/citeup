import { Temporal } from "@js-temporal/polyfill";
import { invariant } from "es-toolkit";
import { readFileSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path, { basename, join } from "node:path";
import removeMd from "remove-markdown";
import parseFrontMatter from "~/lib/parseFrontMatter";
import truncateWords from "~/lib/truncateWords";

const dirname = path.resolve("./app/data/blog");

export type BlogPost = {
  alt: string;
  body: string;
  image: string;
  published: Date;
  slug: string;
  summary: string;
  title: string;
};

export async function recentBlogPosts(): Promise<BlogPost[]> {
  const filenames = readdirSync(dirname);
  const now = new Date();
  const morning = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 8),
  );
  return filenames
    .filter((filename) => filename.endsWith(".md"))
    .map((filename) => {
      const published = getPublishedDateTime(filename);
      const content = readFileSync(path.resolve(dirname, filename), "utf8");
      const { attributes, body } = parseFrontMatter<{
        alt: string;
        image: string;
        summary: string;
        title: string;
      }>(content);
      const slug = basename(filename, ".md");
      return {
        ...attributes,
        body,
        published,
        slug,
      };
    })
    .filter(({ published }) => published <= morning)
    .sort((a, b) => b.published.getTime() - a.published.getTime());
}

export async function loadBlogPost(slug?: string): Promise<BlogPost> {
  invariant(slug, "Slug is required");
  const filename = join(dirname, `${slug}.md`);
  const post = await readFile(filename, "utf8");
  const published = getPublishedDateTime(filename);
  const { attributes, body } = parseFrontMatter<{
    title: string;
    alt: string;
    image: string;
    summary: string;
  }>(post);
  const summary = attributes.summary || truncateWords(removeMd(body), 20);
  return { ...attributes, body, published, slug, summary };
}

function getPublishedDateTime(filename: string): Date {
  const date = basename(filename).match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? "";
  const published = Temporal.PlainDateTime.from(
    `${date}T08:00:00`,
  ).toZonedDateTime("America/Los_Angeles");
  return new Date(published.epochMilliseconds);
}
