import sharp from 'sharp'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '../public')

const sizes = [192, 512]

async function generate(svgFile, suffix) {
  const svg = readFileSync(resolve(publicDir, svgFile))
  for (const size of sizes) {
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(resolve(publicDir, `icons/icon-${size}${suffix}.png`))
    console.log(`Generated icons/icon-${size}${suffix}.png`)
  }
}

await generate('logo.svg', '')
await generate('logo-maskable.svg', '-maskable')

// Also generate apple-touch-icon (180x180)
const svg = readFileSync(resolve(publicDir, 'logo.svg'))
await sharp(svg).resize(180, 180).png().toFile(resolve(publicDir, 'apple-touch-icon.png'))
console.log('Generated apple-touch-icon.png')
