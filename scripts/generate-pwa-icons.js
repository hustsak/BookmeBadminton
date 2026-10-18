const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

async function generateIcons() {
  const iconsDir = path.join(__dirname, "..", "public", "icons");
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const logoPath = path.join(__dirname, "..", "public", "logo.png");

  // 1. Standard 192x192
  await sharp(logoPath)
    .resize(192, 192, { fit: "contain", background: { r: 247, g: 248, b: 244, alpha: 1 } })
    .png()
    .toFile(path.join(iconsDir, "icon-192x192.png"));
  console.log("Generated icon-192x192.png");

  // 2. Standard 512x512
  await sharp(logoPath)
    .resize(512, 512, { fit: "contain", background: { r: 247, g: 248, b: 244, alpha: 1 } })
    .png()
    .toFile(path.join(iconsDir, "icon-512x512.png"));
  console.log("Generated icon-512x512.png");

  // 3. Apple Touch Icon 180x180
  await sharp(logoPath)
    .resize(160, 160, { fit: "contain" })
    .extend({
      top: 10,
      bottom: 10,
      left: 10,
      right: 10,
      background: { r: 23, g: 32, b: 28, alpha: 1 },
    })
    .png()
    .toFile(path.join(iconsDir, "apple-touch-icon.png"));
  console.log("Generated apple-touch-icon.png");

  // 4. Maskable 192x192 (safe zone padding with dark background #17201c)
  await sharp(logoPath)
    .resize(150, 150, { fit: "contain" })
    .extend({
      top: 21,
      bottom: 21,
      left: 21,
      right: 21,
      background: { r: 23, g: 32, b: 28, alpha: 1 },
    })
    .png()
    .toFile(path.join(iconsDir, "icon-maskable-192x192.png"));
  console.log("Generated icon-maskable-192x192.png");

  // 5. Maskable 512x512 (safe zone padding with dark background #17201c)
  await sharp(logoPath)
    .resize(400, 400, { fit: "contain" })
    .extend({
      top: 56,
      bottom: 56,
      left: 56,
      right: 56,
      background: { r: 23, g: 32, b: 28, alpha: 1 },
    })
    .png()
    .toFile(path.join(iconsDir, "icon-maskable-512x512.png"));
  console.log("Generated icon-maskable-512x512.png");

  // 6. Badge 72x72
  await sharp(logoPath)
    .resize(72, 72, { fit: "contain", background: { r: 23, g: 32, b: 28, alpha: 0 } })
    .png()
    .toFile(path.join(iconsDir, "badge-72x72.png"));
  console.log("Generated badge-72x72.png");

  console.log("All PWA icons generated successfully!");
}

generateIcons().catch((err) => {
  console.error("Failed to generate icons:", err);
  process.exit(1);
});
