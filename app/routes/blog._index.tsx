import BlogPostsGrid from "~/components/ui/BlogPostsGrid";
import type { BlogPost } from "~/lib/blogPosts.server";
import { recentBlogPosts } from "~/lib/blogPosts.server";
import type { Route } from "./+types/blog._index";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "Blog | CiteUp" },
    {
      name: "description",
      content:
        "Insights and guides on LLM citation visibility, AI search optimization, and monitoring your brand's presence in AI-generated responses.",
    },
  ];
}

export async function loader() {
  const posts = await recentBlogPosts();
  return { posts };
}

export default function Blog({
  loaderData,
}: {
  loaderData: { posts: BlogPost[] };
}) {
  return (
    <main
      className="flex min-h-screen flex-col bg-[hsl(60,100%,99%)]"
      aria-label="Blog"
    >
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Server-generated structured data
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "CiteUp Blog",
            description:
              "Insights and guides on LLM citation visibility and AI search optimization",
            url: "https://citeup.com/blog",
            mainEntity: {
              "@type": "ItemList",
              itemListElement: loaderData.posts.map((post, index) => ({
                "@type": "ListItem",
                position: index + 1,
                item: {
                  "@type": "BlogPosting",
                  "@id": `https://citeup.com/blog/${post.slug}`,
                  headline: post.title,
                  description: post.summary,
                  datePublished: post.published,
                  url: `https://citeup.com/blog/${post.slug}`,
                  image: post.image
                    ? `https://citeup.com/blog/${post.image}`
                    : undefined,
                  author: {
                    "@type": "Organization",
                    name: "CiteUp",
                    url: "https://citeup.com",
                  },
                },
              })),
            },
          }),
        }}
      />

      <section className="bg-[hsl(60,100%,99%)] px-4 py-20 md:py-32">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="mb-6 font-bold text-5xl text-black leading-tight md:text-6xl">
            Blog
          </h1>
          <p className="font-medium text-black text-xl leading-relaxed md:text-2xl">
            Insights on LLM citation visibility and AI search optimization
          </p>
        </div>
      </section>

      <BlogPostsGrid
        className="bg-[hsl(60,100%,99%)]"
        posts={loaderData.posts}
      />
    </main>
  );
}
