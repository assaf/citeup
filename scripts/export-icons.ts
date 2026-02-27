/**
 * Exports icon.svg to PNG sizes needed for app icons.
 * Run with: pnpm tsx scripts/export-icons.ts
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const svgContent = readFileSync(resolve("public/icon.svg"), "utf-8");

const sizes = [
  { name: "apple-touch-icon.png", size: 180, background: "#ffffff" },
  { name: "icon-192.png", size: 192, background: "transparent" },
  { name: "icon-512.png", size: 512, background: "transparent" },
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const { name, size, background } of sizes) {
  const padding = Math.round(size * 0.15);
  const iconSize = size - padding * 2;

  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`
    <html>
      <body style="margin:0;background:${background}">
        <div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;${background !== "transparent" ? `background:${background};border-radius:${Math.round(size * 0.2)}px` : ""}">
          <img src="data:image/svg+xml;base64,${Buffer.from(svgContent).toString("base64")}" width="${iconSize}" height="${iconSize}"/>
        </div>
      </body>
    </html>
  `);

  const png = await page.screenshot({ omitBackground: background === "transparent" });
  const outPath = resolve("public", name);
  writeFileSync(outPath, png);
  console.info("Wrote %s (%dx%d)", outPath, size, size);
}

await browser.close();
