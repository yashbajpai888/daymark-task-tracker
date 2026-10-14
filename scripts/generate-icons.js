const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const iconsDir = path.join(__dirname, "..", "public", "icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Base SVG representing Daymark's brand identity: Vibrant Blue with clean white mark
const baseSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="112" fill="#2563EB"/>
  <rect x="176" y="176" width="160" height="160" rx="36" fill="#FFFFFF"/>
  <circle cx="356" cy="156" r="28" fill="#60A5FA"/>
</svg>
`;

// Maskable icon requires safe area margin (80% inner size)
const maskableSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#2563EB"/>
  <rect x="180" y="180" width="152" height="152" rx="32" fill="#FFFFFF"/>
  <circle cx="340" cy="172" r="24" fill="#93C5FD"/>
</svg>
`;

// Monochrome badge for Android notification status bar
const badgeSvg = `
<svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="72" height="72" rx="16" fill="#FFFFFF"/>
  <rect x="24" y="24" width="24" height="24" rx="5" fill="#000000"/>
</svg>
`;

async function generate() {
  fs.writeFileSync(path.join(iconsDir, "icon.svg"), baseSvg.trim());

  await sharp(Buffer.from(baseSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, "icon-512.png"));

  await sharp(Buffer.from(baseSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(iconsDir, "icon-192.png"));

  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(iconsDir, "maskable-icon-512.png"));

  await sharp(Buffer.from(badgeSvg))
    .resize(72, 72)
    .png()
    .toFile(path.join(iconsDir, "badge-72.png"));

  console.log("Icons generated successfully in public/icons/");
}

generate().catch(console.error);
