import { Link, NavLink } from "react-router";
import CiteUpIcon from "./CiteUpLogo";

const links = [
  {
    title: "Product",
    links: [
      { to: "/benefits", label: "Benefits" },
      { to: "/pricing", label: "Pricing" },
      { to: "/faq", label: "FAQ" },
      { to: "/states", label: "US States" },
    ],
  },
  {
    title: "Resources",
    links: [
      { to: "/about", label: "About" },
      { to: "/blog", label: "Blog" },
      { to: "mailto:hello@citeup.com", label: "Contact" },
      { to: "/glossary", label: "Glossary" },
      { to: "/news", label: "News" },
      { to: "/for-ai-assistants", label: "For AI Assistants" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/terms", label: "Terms of Service" },
    ],
  },
];

export default function PageFooter() {
  return (
    <footer className="flex flex-col gap-8 border-black border-t-2 bg-[hsl(60,100%,99%)] px-6 py-12 sm:flex-row sm:justify-between print:hidden">
      <aside className="flex flex-col gap-4 text-black">
        <CiteUpIcon />
        <div className="flex flex-col gap-2">
          <p className="font-medium">
            Monitor AI citation visibility for your brand. Built for small
            businesses and seasonal sellers. AI powered.
          </p>
          <p className="font-medium text-sm">
            © {new Date().getFullYear()} citeup.com. All rights reserved.
          </p>
        </div>
        <SocialLinks />
      </aside>

      <div className="mx-auto grid w-full grid-cols-3 gap-4 md:max-w-1/2">
        {links.map((column) => (
          <nav key={column.title} className="flex flex-col gap-2">
            <h3 className="flex flex-col gap-4 font-bold text-black">
              {column.title}
            </h3>
            {column.links.map((link) => (
              <NavLink
                aria-label={`Go to ${link.label} page`}
                className="font-medium text-black text-sm transition-colors hover:text-[hsl(37,92%,65%)]"
                key={link.to}
                to={link.to}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        ))}
      </div>
    </footer>
  );
}

function SocialLinks() {
  return (
    <div className="flex items-center gap-2">
      <Link
        to="https://www.linkedin.com/company/citeup/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-medium text-black text-sm transition-colors hover:text-[hsl(37,92%,65%)]"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="mercado-match"
          width="24"
          height="24"
          focusable="false"
        >
          <title>LinkedIn</title>
          <path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z" />
        </svg>
        LinkedIn
      </Link>
    </div>
  );
}
