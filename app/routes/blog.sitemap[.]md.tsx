import { recentBlogPosts } from "~/lib/blogPosts.server";

export async function loader() {
  const blogPosts = await recentBlogPosts();
  const markdown = `
# CiteUp Blog Sitemap

This is a sitemap of all blog posts in markdown format for AI agents. It is used to help AI agents index the blog posts.

---

${blogPosts
  .map(
    (blogPost) =>
      `- [${blogPost.title}](https://citeup.com/blog/${blogPost.slug}) - ${blogPost.published.toString().slice(0, 10)}`,
  )
  .join("\n")}

---

## Related Sitemaps

- [For AI Assistants](/for-ai-assistants.md)
  `.trim();
  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown",
      Link: `<https://citeup.vercel.app/blog>; rel="alternate"; type="text/html"`,
    },
  });
}
