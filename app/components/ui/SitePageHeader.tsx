import { Link } from "react-router";

interface Props {
  site: { id: string; domain: string };
  title: string;
  children?: React.ReactNode;
}

export default function SitePageHeader({ site, title, children }: Props) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p>
          <Link
            className="block max-w-md truncate font-mono text-foreground/60 hover:underline"
            to={`/site/${site.id}`}
            title={site.domain}
          >
            {site.domain}
          </Link>
        </p>
        <h1 className="font-heading text-3xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}
