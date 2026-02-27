import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Route } from "./+types/blog.$slug[.]png";

export async function loader({ params }: Route.LoaderArgs) {
  try {
    const { slug } = params;
    const { buffer } = await readFile(
      resolve("./app/data/blog", `${slug}.png`),
    );
    return new Response(buffer as BodyInit, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": "image/jpeg",
      },
    });
  } catch {
    throw new Response("Not Found", { status: 404 });
  }
}
