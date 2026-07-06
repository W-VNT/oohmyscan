/**
 * Build script pour les Vercel Serverless Functions.
 *
 * Bundle chaque fichier source de /api-src/ en un fichier .js autonome
 * dans /api/. Format CJS, tous les deps npm inlines. Vercel deploy
 * ensuite le .js pre-bundle tel quel (aucune compilation supplementaire
 * necessaire, aucun probleme ESM/CJS).
 *
 * Raison : Vercel refuse de charger nos fichiers TS/TSX en ESM meme
 * avec /api/package.json (voir historique commits 41cd6e5, e76c754,
 * 41b8342). L'approche pre-bundle contourne totalement le probleme.
 */
import { build } from 'esbuild'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const SRC_DIR = 'api-src'
const OUT_DIR = 'api'

const files = readdirSync(SRC_DIR).filter((f) => /\.(t|j)sx?$/.test(f))

console.log(`[build-api] Bundling ${files.length} file(s) from ${SRC_DIR}/ to ${OUT_DIR}/`)

await Promise.all(
  files.map(async (file) => {
    const outfile = join(OUT_DIR, file.replace(/\.tsx?$/, '.js'))
    await build({
      entryPoints: [join(SRC_DIR, file)],
      outfile,
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: 'node20',
      // @vercel/node est fourni par le runtime, ne pas bundler
      external: ['@vercel/node'],
      logLevel: 'info',
      // Minify off pour un stack trace lisible en cas d'erreur runtime
      minify: false,
      // sourceMap externe pour debug
      sourcemap: 'external',
      // JSX auto via react-jsx : esbuild resout react/jsx-runtime dans le bundle
      jsx: 'automatic',
    })
    console.log(`[build-api] ✓ ${outfile}`)
  }),
)

console.log('[build-api] Done')
