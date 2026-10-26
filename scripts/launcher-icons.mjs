// Renders the launcher icons that the PWA asset generator doesn't cover well. Run via `npm run icons`
// (after pwa-assets-generator, whose maskable/apple icons this overwrites):
//  - Android themed icon: one-colour silhouette (icon-monochrome.svg)
//  - Full-bleed maskable + iOS home-screen icon (icon-maskable.svg), so launchers that apply
//    their own shape never show a white frame around the blue square.
import sharp from 'sharp';

const jobs = [
  ['public/icon-monochrome.svg', 192, 'public/monochrome-icon-192x192.png'],
  ['public/icon-monochrome.svg', 512, 'public/monochrome-icon-512x512.png'],
  ['public/icon-maskable.svg', 512, 'public/maskable-icon-512x512.png'],
  ['public/icon-maskable.svg', 180, 'public/apple-touch-icon-180x180.png'],
];

for (const [src, size, out] of jobs) {
  await sharp(src, { density: 300 }).resize(size, size).png().toFile(out);
  console.log(out);
}
