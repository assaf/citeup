/**
 * Exports icon.svg to PNG sizes and favicon.ico.
 * Run with: pnpm tsx scripts/export-icons.ts
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const svgContent = readFileSync(resolve("public/icon.svg"), "utf-8");
const svgBase64 = Buffer.from(svgContent).toString("base64");

const browser = await chromium.launch();
const page = await browser.newPage();

async function renderPng(size: number, background: string): Promise<Buffer> {
  const padding = Math.round(size * 0.15);
  const iconSize = size - padding * 2;
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`
    <html><body style="margin:0;background:${background}">
      <div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;${background !== "transparent" ? `background:${background};border-radius:${Math.round(size * 0.2)}px` : ""}">
        <img src="data:image/svg+xml;base64,${svgBase64}" width="${iconSize}" height="${iconSize}"/>
      </div>
    </body></html>
  `);
  return page.screenshot({ omitBackground: background === "transparent" });
}

// PNG exports
const pngSizes = [
  { name: "apple-touch-icon.png", size: 180, background: "#ffffff" },
  { name: "icon-192.png", size: 192, background: "transparent" },
  { name: "icon-512.png", size: 512, background: "transparent" },
];

for (const { name, size, background } of pngSizes) {
  const png = await renderPng(size, background);
  const outPath = resolve("public", name);
  writeFileSync(outPath, png);
  console.info("Wrote %s (%dx%d)", outPath, size, size);
}

// favicon.ico — ICO container with embedded PNGs at 16, 32, 48px
const icoSizes = [16, 32, 48];
const pngs = await Promise.all(icoSizes.map((s) => renderPng(s, "transparent")));

function buildIco(images: Buffer[]): Buffer {
  const count = images.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = count * dirEntrySize;
  let offset = headerSize + dirSize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);     // reserved
  header.writeUInt16LE(1, 2);     // type: 1 = ICO
  header.writeUInt16LE(count, 4); // number of images

  const dirs = images.map((png, i) => {
    const size = icoSizes[i];
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(size === 256 ? 0 : size, 0); // width
    entry.writeUInt8(size === 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2);                        // color count
    entry.writeUInt8(0, 3);                        // reserved
    entry.writeUInt16LE(1, 4);                     // planes
    entry.writeUInt16LE(32, 6);                    // bit count
    entry.writeUInt32LE(png.length, 8);            // bytes in resource
    entry.writeUInt32LE(offset, 12);               // offset
    offset += png.length;
    return entry;
  });

  return Buffer.concat([header, ...dirs, ...images]);
}

const ico = buildIco(pngs);
writeFileSync(resolve("public/favicon.ico"), ico);
console.info("Wrote public/favicon.ico (16, 32, 48px)");

// OG image — 1200×630, horizontal layout
const fontPath = resolve("public/fonts/Archivo-VariableFont_wdth,wght.ttf");
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(`
  <html><head><style>
    @font-face {
      font-family: 'Archivo';
      src: url('file://${fontPath}') format('truetype');
      font-weight: 100 900;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1200px; height: 630px; background: #111111;
      display: flex; align-items: center; justify-content: center;
    }
    .wrap { display: flex; align-items: center; gap: 72px; padding: 0 100px; }
    .wordmark {
      font-family: 'Archivo', sans-serif; font-weight: 800;
      font-size: 108px; color: #ffffff; letter-spacing: -4px; line-height: 1;
    }
    .tagline {
      font-family: 'Archivo', sans-serif; font-weight: 400;
      font-size: 26px; color: #6b7280; margin-top: 16px;
    }
  </style></head><body>
    <div class="wrap">
      <img src="data:image/svg+xml;base64,${svgBase64}" width="200" height="200"/>
      <div>
        <div class="wordmark">CiteUp</div>
        <div class="tagline">Monitor LLM citation visibility</div>
      </div>
    </div>
  </body></html>
`);
const ogPng = await page.screenshot({ omitBackground: false });
writeFileSync(resolve("public/og-image.png"), ogPng);
console.info("Wrote public/og-image.png (1200x630)");

await browser.close();
