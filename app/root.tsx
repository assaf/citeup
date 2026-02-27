import {
  type HeadersFunction,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  redirect,
} from "react-router";
import { WaveLoading } from "respinner";
import {
  type UtmCookieData,
  sessionCookie,
  utmCookie,
} from "~/lib/cookies.server";
import prisma from "~/lib/prisma.server";
import type { Route } from "./+types/root";
import "./global.css";

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie");
  const token = await sessionCookie.parse(cookieHeader);

  if (token) {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (session) return { user: session.user };
  }

  // No valid session — capture UTM + referrer before redirecting
  const url = new URL(request.url);
  const PUBLIC_PATHS = ["/sign-in", "/sign-up", "/password-recovery"];
  if (
    PUBLIC_PATHS.some((p) => url.pathname === p) ||
    url.pathname.startsWith("/reset-password/") ||
    url.pathname.startsWith("/verify-email/")
  )
    return { user: null };

  const utmData: UtmCookieData = {
    referrer: request.headers.get("Referer") ?? null,
    utmSource: url.searchParams.get("utm_source"),
    utmMedium: url.searchParams.get("utm_medium"),
    utmCampaign: url.searchParams.get("utm_campaign"),
    utmTerm: url.searchParams.get("utm_term"),
    utmContent: url.searchParams.get("utm_content"),
  };

  return redirect("/sign-in", {
    headers: { "Set-Cookie": await utmCookie.serialize(utmData) },
  });
}

export function meta(): Route.MetaDescriptors {
  return [
    { title: "citeup — Monitor LLM citation visibility" },
    { description: "Monitor LLM citation visibility for your brand." },
    { keywords: "citeup, llm, visibility monitoring, citation tracking" },
  ];
}

export const headers: HeadersFunction = () => ({
  "Document-Policy": "js-profiling",
});

export const links: Route.LinksFunction = () => [
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
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
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
        {import.meta.env.MODE === "development" && (
          <pre className="w-full overflow-x-auto p-4">
            <code>{stack}</code>
          </pre>
        )}
      </h1>
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
