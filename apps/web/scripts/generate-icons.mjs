import { mkdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(webDir, "public");
const appDir = path.join(webDir, "src", "app");
mkdirSync(publicDir, { recursive: true });

function svg(size, rounded) {
  const k = size / 512;
  const w = (v) => Math.round(v * k);
  const rx = rounded ? Math.round(104 * k) : 0;
  const inset = rounded ? w(8) : 0;
  const edge = size - inset * 2;
  const stroke = Math.max(1, w(38));
  const border = rounded
    ? `<rect x="${inset}" y="${inset}" width="${edge}" height="${edge}" rx="${rx}" fill="#0a0a0a" stroke="rgba(212,175,55,0.35)" stroke-width="${Math.max(1, w(5))}"/>`
    : `<rect x="0" y="0" width="${size}" height="${size}" fill="#0a0a0a"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D4AF37"/><stop offset="1" stop-color="#9A7D22"/></linearGradient></defs>${border}<g fill="none" stroke="url(#g)" stroke-linecap="round" stroke-linejoin="round" stroke-width="${stroke}"><path d="M148 96 V 416"/><path d="M176 270 L 356 416"/><path d="M176 270 L 356 96"/></g></svg>`;
}

const targets = [
  { name: "icon-192.png", size: 192, rounded: true },
  { name: "icon-512.png", size: 512, rounded: true },
  { name: "icon-512-maskable.png", size: 512, rounded: false },
  { name: "apple-touch-icon.png", size: 180, rounded: true },
];

for (const target of targets) {
  const buf = Buffer.from(svg(target.size, target.rounded));
  await sharp(buf).png().toFile(path.join(publicDir, target.name));
}

await sharp(Buffer.from(svg(64, true))).png().toFile(path.join(appDir, "icon.png"));

console.log("iconos generados en public/ y src/app/icon.png");