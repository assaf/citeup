import {
  type HeadersFunction,
  Outlet,
  isRouteErrorResponse,
} from "react-router";
import { WaveLoading } from "respinner";
import { getCurrentUser } from "~/lib/auth.server";
import { trackBotVisit } from "~/lib/botTracking.server";
import type { Route } from "./+types/root";
import PageLayout from "./components/layout/PageLayout";
import "./global.css";

export async function loader({ request }: Route.LoaderArgs) {
  trackBotVisit(request);
  const baseUrl = new URL(request.url).origin;
  const user = await getCurrentUser(request);
  return { user, baseUrl };
}

export function meta({ data }: Route.MetaArgs): Route.MetaDescriptors {
  const ogImage = data ? `${data.baseUrl}/og-image.png` : "/og-image.png";
  return [
    { title: "CiteUp — Monitor LLM citation visibility" },
    {
      name: "description",
      content: "Monitor LLM citation visibility for your brand.",
    },
    { property: "og:title", content: "CiteUp" },
    {
      property: "og:description",
      content: "Monitor LLM citation visibility for your brand.",
    },
    { property: "og:image", content: ogImage },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "CiteUp" },
    {
      name: "twitter:description",
      content: "Monitor LLM citation visibility for your brand.",
    },
    { name: "twitter:image", content: ogImage },
    { name: "robots", content: "index, follow" },
  ];
}

export const headers: HeadersFunction = () => ({
  "Document-Policy": "js-profiling",
});

export const links: Route.LinksFunction = () => [
  {
    rel: "alternate",
    type: "application/atom+xml",
    title: "The CiteUp Blog",
    href: "https://citeup.com/blog/feed",
  },
  {
    rel: "sitemap",
    type: "application/xml",
    href: "https://citeup.com/sitemap.xml",
  },
  { rel: "icon", href: "/icon-192.png", type: "image/png", sizes: "192x192" },
  { rel: "icon", href: "/icon-512.png", type: "image/png", sizes: "512x512" },
  { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return <PageLayout>{children}</PageLayout>;
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="prose prose-lg mx-auto py-32">
      <h1 className="mx-auto flex flex-row justify-center gap-2 text-4xl">
        <span className="font-bold text-red-500">{message}</span>
        <span className="text-gray-500">{details}</span>
      </h1>
      {import.meta.env.MODE === "development" && stack && (
        <pre className="w-full overflow-x-auto p-4">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}

export function HydrateFallback() {
  return (
    <Layout>
      <main className="prose prose-lg mx-auto flex flex-col items-center justify-center gap-4">
        <WaveLoading color="#111111" count={2} />
        <p className="text-gray-500 text-sm">Loading, please wait...</p>
      </main>
    </Layout>
  );
}
