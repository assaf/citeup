import { Link } from "react-router";
import remarkGfm from "remark-gfm";
import { Streamdown } from "streamdown";
import privacy from "~/data/privacy.md?raw";
import type { Route } from "./+types/route";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "Privacy Policy | CiteUp" },
    { name: "description", content: "Read the CiteUp Privacy Policy." },
  ];
}

export default function PrivacyPolicy() {
  return (
    <article className="container mx-auto my-10 max-w-4xl space-y-8 p-5">
      <Streamdown
        className="prose prose-lg mx-auto"
        mode="static"
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ children, href }) =>
            href ? <Link to={href}>{children}</Link> : children,
        }}
      >
        {privacy}
      </Streamdown>
    </article>
  );
}
