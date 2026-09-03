// Regenerates public/ PWA icon PNGs from the source SVGs in this folder.
// Run with: node assets-source/pwa-icons/generate.mjs
import sharp from 'sharp'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(here, '../../public')
const ANY_SRC = path.join(here, 'icon-any.svg')
const MASKABLE_SRC = path.join(here, 'icon-maskable.svg')

async function make(src, size, outName) {
  await sharp(src, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(path.join(OUT, outName))
  console.log('wrote', outName)
}

async function main() {
  await make(ANY_SRC, 192, 'pwa-192x192.png')
  await make(ANY_SRC, 512, 'pwa-512x512.png')
  await make(MASKABLE_SRC, 512, 'pwa-maskable-512x512.png')
  await make(ANY_SRC, 180, 'apple-touch-icon.png')
  await make(ANY_SRC, 32, 'favicon-32x32.png')
  await make(ANY_SRC, 16, 'favicon-16x16.png')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
