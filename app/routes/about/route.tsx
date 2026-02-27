import type { Route } from "./+types/route";
import AboutCTA from "./AboutCTA";
import AboutHeader from "./AboutHeader";
import AboutStory from "./AboutStory";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "About | CiteUp" },
    {
      name: "description",
      content:
        "CiteUp monitors LLM citation visibility so brands know exactly when and where AI platforms cite them.",
    },
  ];
}

export default function About() {
  return (
    <main
      className="flex min-h-screen flex-col bg-[hsl(60,100%,99%)]"
      aria-label="About page"
    >
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Server-generated structured data
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schemaData()),
        }}
      />

      <div className="container mx-auto my-10 space-y-8 p-5">
        <AboutHeader />
        <AboutStory />
      </div>
      <AboutCTA />
    </main>
  );
}

function schemaData() {
  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About CiteUp",
    description:
      "Learn about CiteUp, the platform that monitors LLM citation visibility for brands and content creators.",
    url: "https://citeup.vercel.app/about",
    mainEntity: {
      "@type": "Organization",
      "@id": "https://citeup.vercel.app#organization",
      name: "CiteUp",
      description:
        "Platform for monitoring LLM citation visibility across AI platforms",
      url: "https://citeup.vercel.app",
      foundingDate: "2026",
      founder: {
        "@type": "Person",
        name: "Assaf Arkin",
        jobTitle: "CEO",
      },
      email: "hello@citeup.com",
      sameAs: ["https://github.com/assaf/citeup"],
      knowsAbout: [
        "LLM Citation Visibility",
        "AI Search Optimization",
        "Generative Engine Optimization",
        "Brand Monitoring",
        "AI Platform Analytics",
      ],
    },
  };
}
