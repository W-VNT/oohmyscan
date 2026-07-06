# Setup PDF gen côté serveur (Vercel Serverless Function)

## Contexte

La génération PDF (`@react-pdf/renderer`) est passée du client au serveur
pour éviter les crashs "Mémoire insuffisante" sur téléphones bas de gamme
des opérateurs. Voir commits `perf(memory):` et `feat(pdf):`.

## Env vars à configurer sur Vercel

Deux variables à ajouter dans **Vercel → Settings → Environment Variables**
(Production + Preview + Development) :

### `VITE_SUPABASE_URL`
Déjà configurée pour le front (elle est aussi lisible côté serveur).
Aucune action.

### `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **À AJOUTER**

- Nom : `SUPABASE_SERVICE_ROLE_KEY`
- Valeur : la clé `service_role` du projet Supabase
- Récupérer sur : Supabase Dashboard → Project Settings → API → `service_role` (secret)
- Environnements : **Production + Preview** (pas Development si tu ne
  déploies pas les preview branches)

**⚠️ Ne jamais commit cette clé dans le repo.** Elle bypasse RLS.

## Test post-deploy

1. Push le commit qui contient `api/generate-contract-pdf.tsx`
2. Attends le deploy Vercel (~2 min)
3. Sur un opérateur PWA (mobile) :
   - Finir un flow install (lieu + scan + signatures)
   - Cliquer "Signer et enregistrer"
   - Vérifier que le contrat PDF apparaît sur la fiche panneau
4. Sur Vercel → Deployments → dernier deploy → Functions :
   - Vérifier que `/api/generate-contract-pdf` apparaît
   - Voir les logs si soucis

## Fallback en cas de panne serveur

Si le serveur Vercel est down mais Supabase OK :
- Online direct : `handleFinalSave` lève une erreur, l'utilisateur voit un
  toast d'erreur, le flow reste bloqué à l'étape signature.
- Offline queue : `install-replay` échoue et re-tente au prochain cycle
  (max 5 tentatives, backoff).

Pour débloquer manuellement en cas d'incident : rollback vers le commit
d'avant (rendu client-side). L'ancien code est dans l'historique git.

## Architecture

```
Client (mobile) ────POST /api/generate-contract-pdf────► Vercel Function (Node.js)
                    { type, fileName, props }             │
                                                          ├─► render PDF (@react-pdf)
                                                          └─► upload Storage (bucket panel-photos)
                    ◄──── { pdfPath, size } ────────────
```

- Bundle client : **-400 KB** (plus d'import @react-pdf/renderer côté client)
- RAM client : **-30 à 50 MB** au moment du save
- Latence ajoutée : ~500ms (network + gen serveur) — imperceptible
