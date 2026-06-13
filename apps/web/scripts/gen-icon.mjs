// Renders the KnowHub logo (book-open-check on the brand gradient) into the PNG
// source images that @capacitor/assets needs, so the Android app icon matches
// the web logo. Run in CI before `npx @capacitor/assets generate`.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

mkdirSync("assets", { recursive: true });

const GRAD = `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8b5cf6"/>
      <stop offset="1" stop-color="#6d28d9"/>
    </linearGradient>
  </defs>`;

// lucide "book-open-check" paths (24x24 viewBox), drawn in white.
const glyph = (tx, ty, scale, stroke) => `
  <g transform="translate(${tx},${ty}) scale(${scale})" fill="none" stroke="#ffffff"
     stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 21V7"/>
    <path d="m16 12 2 2 4-4"/>
    <path d="M22 6V4a1 1 0 0 0-1-1h-5a4 4 0 0 0-4 4 4 4 0 0 0-4-4H3a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h6a3 3 0 0 1 3 3 3 3 0 0 1 3-3h6a1 1 0 0 0 1-1v-1.3"/>
  </g>`;

// Full icon (gradient background + glyph) — used for the legacy/round icon.
const iconOnly = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  ${GRAD}<rect width="1024" height="1024" rx="0" fill="url(#g)"/>
  ${glyph(192, 200, 26.6, 2)}
</svg>`;

// Adaptive background (solid gradient, full bleed).
const background = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  ${GRAD}<rect width="1024" height="1024" fill="url(#g)"/>
</svg>`;

// Adaptive foreground (glyph only, transparent, kept within the ~66% safe zone).
const foreground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  ${glyph(272, 290, 20, 2.2)}
</svg>`;

const png = (svg, file) =>
  sharp(Buffer.from(svg)).png().toFile(`assets/${file}`).then(() => console.log("wrote", file));

await Promise.all([
  png(iconOnly, "icon-only.png"),
  png(background, "icon-background.png"),
  png(foreground, "icon-foreground.png"),
]);
console.log("Icon sources generated in apps/web/assets/");
