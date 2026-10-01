// Genere app.html (coquille vide de l'app) a partir de index.html AVANT le
// build : servi pour toutes les routes autres que "/" (Vercel + service
// worker), pendant que index.html recoit la landing pre-rendue. Ainsi l'app
// terrain/admin n'affiche jamais la landing au demarrage.
import fs from 'node:fs'
fs.copyFileSync('index.html', 'app.html')
console.log('[make-app-html] app.html genere')
