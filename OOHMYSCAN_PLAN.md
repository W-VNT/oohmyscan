# OOHMYSCAN — Billboard Tracking PWA
## Claude Code Master Plan

> **Objectif** : Application PWA de gestion et tracking des panneaux d'affichage OOH (Out-Of-Home), permettant l'inventaire terrain via QR Code, la géolocalisation, et le suivi des campagnes.

---

## 1. SETUP INITIAL — GIT + VERCEL + SUPABASE

> **À exécuter dans l'ordre avant d'écrire la moindre ligne de code.**

---

### 1.1 GitHub — Création du repo

```bash
# 1. Créer le repo sur GitHub (via UI ou CLI)
gh repo create oohmyscan --private --description "PWA tracking panneaux OOH"

# 2. Init projet local
pnpm create vite@latest oohmyscan -- --template react-ts
cd oohmyscan
git init
git remote add origin git@github.com:TON_USERNAME/oohmyscan.git

# 3. .gitignore — s'assurer que ces lignes sont présentes
echo ".env.local" >> .gitignore
echo ".env" >> .gitignore

# 4. Premier commit
git add .
git commit -m "chore: init project"
git push -u origin main
```

**Branches à créer :**
```bash
git checkout -b develop        # branche de dev principale
git push origin develop
```

Convention de commits : `feat:`, `fix:`, `chore:`, `refactor:`

---

### 1.2 Supabase — Création du projet

```
1. Aller sur https://supabase.com → "New project"
2. Organisation : OOHMYAD (ou créer)
3. Nom du projet : oohmyscan
4. Mot de passe DB : générer un mot de passe fort (le sauvegarder)
5. Région : West EU (Ireland) — le plus proche de la France
6. Plan : Free tier pour commencer
```

**Récupérer les credentials :**
```
Settings → API :
- Project URL      → VITE_SUPABASE_URL
- anon public key  → VITE_SUPABASE_ANON_KEY
```

**Créer les Storage Buckets :**
```
Storage → New bucket :
- Nom : panel-photos
- Public : OUI (pour affichage des images dans l'app)
- Taille max fichier : 10MB
```

**Exécuter les migrations SQL :**
```
SQL Editor → New query → coller le contenu de supabase/migrations/001_initial_schema.sql → Run
```

**Activer l'Auth Email :**
```
Authentication → Providers → Email : activé
Authentication → Settings :
  - Désactiver "Confirm email" (simplification en dev)
  - Site URL : https://oohmyscan.vercel.app
  - Redirect URLs : http://localhost:5173 ET https://oohmyscan.vercel.app
```

**Créer les comptes utilisateurs initiaux :**
```
Authentication → Users → "Invite user" :
  - admin@oohmyad.com       → rôle admin
  - operateur@oohmyad.com   → rôle operator

Puis dans SQL Editor, insérer les profils :
INSERT INTO profiles (id, full_name, role)
VALUES
  ('<uuid_admin>', 'Admin OOHMYAD', 'admin'),
  ('<uuid_operator>', 'Poseur Test', 'operator');
```

---

### 1.3 Vercel — Déploiement continu

```
1. Aller sur https://vercel.com → "Add New Project"
2. Importer le repo GitHub : oohmyscan
3. Framework Preset : Vite (détecté automatiquement)
4. Build settings :
   - Build Command   : pnpm build
   - Output Dir      : dist
   - Install Command : pnpm install
5. Cliquer "Deploy"
```

**Variables d'environnement dans Vercel :**
```
Settings → Environment Variables → ajouter :

VITE_SUPABASE_URL         = https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY    = eyJ...
VITE_MAPBOX_TOKEN         = pk.eyJ...
VITE_APP_URL              = https://oohmyscan.vercel.app

Appliquer à : Production + Preview + Development
```

**Config domaine personnalisé (optionnel) :**
```
Settings → Domains → ajouter : scan.oohmyad.com
→ Configurer le CNAME chez le registrar DNS
```

**Déploiement automatique :**
```
Push sur main    → déploiement Production automatique
Push sur develop → déploiement Preview automatique (URL unique par PR)
```

---

### 1.4 Fichier `.env.local` (local uniquement, jamais committé)

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_MAPBOX_TOKEN=pk.eyJ...
VITE_APP_URL=http://localhost:5173
```

---

### 1.5 Checklist avant de coder

- [ ] Repo GitHub créé, `main` + `develop` poussés
- [ ] Supabase : projet créé, migrations SQL exécutées, bucket `panel-photos` créé
- [ ] Supabase Auth : comptes admin + operator créés et insérés dans `profiles`
- [ ] Vercel : projet connecté, variables d'env renseignées, premier déploiement vert ✅
- [ ] `.env.local` présent en local, `.gitignore` vérifié
- [ ] `pnpm dev` tourne sans erreur en local

---

## 3. STACK TECHNIQUE

### Frontend
| Outil | Version | Rôle |
|---|---|---|
| React | 18+ | UI Framework |
| Vite | 5+ | Bundler + Dev Server |
| vite-plugin-pwa | latest | PWA (manifest + service worker) |
| TailwindCSS | 3+ | Styling utilitaire |
| shadcn/ui | latest | Composants UI (Dialog, Toast, Badge…) |
| React Router DOM | 6+ | Routing SPA |
| TanStack Query | 5+ | Data fetching + cache + mutations |
| React Hook Form + Zod | latest | Formulaires + validation |
| Zustand | latest | State global léger (user session, UI state) |

### Backend / Infrastructure
| Outil | Rôle |
|---|---|
| **Supabase** | PostgreSQL + Auth + Storage (photos) + Realtime |
| Supabase JS Client | SDK frontend |
| Supabase Storage | Stockage photos (panneaux + campagnes) |
| Supabase Row Level Security | Permissions poseur vs admin |

### Fonctionnalités spécifiques
| Outil | Rôle |
|---|---|
| `@zxing/browser` | Scan QR Code via caméra mobile |
| `qrcode` (npm) | Génération QR Code côté admin |
| `mapbox-gl` | Carte interactive géolocalisée |
| `react-map-gl` | Wrapper React pour Mapbox |
| `browser-image-compression` | Compression photos avant upload |

### Tooling
```
Node.js 20+
pnpm (package manager recommandé)
TypeScript (strict mode)
ESLint + Prettier
```

---

## 2. ARCHITECTURE DU PROJET

```
oohmyad-app/
├── public/
│   ├── manifest.json           # PWA manifest
│   └── icons/                  # App icons (192, 512px)
├── src/
│   ├── main.tsx
│   ├── App.tsx                 # Router principal
│   ├── lib/
│   │   ├── supabase.ts         # Client Supabase (singleton)
│   │   ├── utils.ts            # Helpers communs
│   │   └── constants.ts        # Enums, config
│   ├── types/
│   │   └── index.ts            # Types TypeScript globaux
│   ├── hooks/
│   │   ├── useAuth.ts          # Session utilisateur
│   │   ├── usePanels.ts        # CRUD panneaux
│   │   ├── useCampaigns.ts     # CRUD campagnes
│   │   ├── useQRScanner.ts     # Logique scan QR
│   │   └── useGeolocation.ts   # GPS natif browser
│   ├── store/
│   │   └── app.store.ts        # Zustand store (ui state)
│   ├── components/
│   │   ├── ui/                 # shadcn/ui overrides
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx   # Layout avec nav bottom (mobile)
│   │   │   ├── AdminLayout.tsx # Layout sidebar (desktop admin)
│   │   │   └── BottomNav.tsx   # Navigation mobile poseur
│   │   ├── panels/
│   │   │   ├── PanelCard.tsx
│   │   │   ├── PanelForm.tsx   # Création / édition panneau
│   │   │   ├── PanelStatus.tsx # Badge statut (actif/vacant/manquant)
│   │   │   └── PanelGallery.tsx
│   │   ├── campaigns/
│   │   │   ├── CampaignCard.tsx
│   │   │   ├── CampaignForm.tsx
│   │   │   └── CampaignAssignModal.tsx
│   │   ├── map/
│   │   │   ├── PanelsMap.tsx   # Carte Mapbox avec tous les panneaux
│   │   │   ├── PanelMarker.tsx # Marqueur coloré par statut
│   │   │   └── MapFilters.tsx  # Filtres sur la carte
│   │   ├── qr/
│   │   │   ├── QRScanner.tsx   # Composant scan caméra
│   │   │   └── QRCode.tsx      # Affichage + téléchargement QR
│   │   └── shared/
│   │       ├── PhotoCapture.tsx # Prise de photo / upload
│   │       ├── StatusBadge.tsx
│   │       └── LoadingScreen.tsx
│   ├── pages/
│   │   ├── auth/
│   │   │   └── LoginPage.tsx
│   │   ├── operator/           # Vues poseurs (mobile-first)
│   │   │   ├── ScanPage.tsx    # Point d'entrée : scan QR
│   │   │   ├── RegisterPanelPage.tsx   # Enregistrer nouveau panneau
│   │   │   └── AssignCampaignPage.tsx  # Assigner campagne à panneau
│   │   └── admin/              # Vues admin (desktop-first)
│   │       ├── DashboardPage.tsx
│   │       ├── MapPage.tsx
│   │       ├── PanelsPage.tsx         # Inventaire complet
│   │       ├── PanelDetailPage.tsx    # Fiche panneau
│   │       ├── CampaignsPage.tsx
│   │       ├── CampaignDetailPage.tsx
│   │       └── ReportsPage.tsx        # Statistiques / taux d'occupation
└── supabase/
    ├── migrations/
    │   └── 001_initial_schema.sql
    └── seed.sql
```

---

## 3. SCHÉMA BASE DE DONNÉES (Supabase / PostgreSQL)

```sql
-- Utilisateurs (géré par Supabase Auth + table profile)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operator')),
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Panneaux d'affichage
CREATE TABLE panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_code TEXT UNIQUE NOT NULL,     -- UUID encodé dans le QR
  reference TEXT UNIQUE NOT NULL,   -- Code lisible ex: "PAR-001"
  name TEXT,                        -- Nom / description du panneau
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  address TEXT,                     -- Adresse géocodée (optionnel)
  city TEXT,
  format TEXT,                      -- 4x3, Abribus, Bâche...
  type TEXT,                        -- Mural, Totem, Bâche, Digital...
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'vacant', 'missing', 'maintenance')),
  notes TEXT,
  installed_at TIMESTAMPTZ,
  installed_by UUID REFERENCES profiles(id),
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photos des panneaux (inventaire + vérifications annuelles)
CREATE TABLE panel_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id UUID NOT NULL REFERENCES panels(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,       -- Chemin Supabase Storage
  photo_type TEXT NOT NULL CHECK (photo_type IN ('installation', 'check', 'campaign', 'damage')),
  taken_by UUID REFERENCES profiles(id),
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Campagnes publicitaires
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assignation campagne <-> panneau (historique complet)
CREATE TABLE panel_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  panel_id UUID NOT NULL REFERENCES panels(id),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id),
  unassigned_at TIMESTAMPTZ,        -- NULL = toujours actif
  validation_photo_path TEXT,       -- Photo de pose de l'affiche
  validated_at TIMESTAMPTZ,
  notes TEXT
);

-- Index utiles
CREATE INDEX ON panels(status);
CREATE INDEX ON panels(city);
CREATE INDEX ON panel_campaigns(panel_id);
CREATE INDEX ON panel_campaigns(campaign_id);
CREATE INDEX ON panel_campaigns(unassigned_at) WHERE unassigned_at IS NULL;

-- Row Level Security
ALTER TABLE panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Poseurs : lecture seule sur panneaux + campagnes, écriture sur photos/assignations
CREATE POLICY "Operators can read panels" ON panels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operators can insert photos" ON panel_photos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Operators can assign campaigns" ON panel_campaigns FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Operators can update panels on scan" ON panels FOR UPDATE TO authenticated 
  USING (true) WITH CHECK (true);

-- Admins : accès complet (via role dans profiles)
CREATE POLICY "Admins full access panels" ON panels FOR ALL TO authenticated
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');
```

---

## 4. FLUX MÉTIER DÉTAILLÉS

### FLUX 1 — Enregistrement d'un nouveau panneau (Poseur)

```
1. Poseur arrive sur le terrain avec le QR Code pré-imprimé
2. Ouvre l'app → page Scan
3. Scanne le QR Code → l'app lit l'UUID du panneau
4. L'app vérifie en DB : panneau déjà enregistré ?
   ├─ NON → Redirige vers /operator/register/:panelId
   └─ OUI → Redirige vers fiche panneau existant
5. Page d'enregistrement :
   - GPS auto-capturé (useGeolocation)
   - Photo obligatoire (PhotoCapture → compression → Supabase Storage)
   - Champs : type de panneau, format, commentaire
   - Bouton "Valider l'installation"
6. Supabase INSERT panels + INSERT panel_photos (type: 'installation')
7. Toast succès → retour Scan
```

### FLUX 2 — Assignation d'une campagne (Poseur)

```
1. Poseur scanne le QR Code du panneau
2. L'app charge la fiche du panneau (statut, campagne en cours)
3. Affiche : infos panneau + campagne active (si existante)
4. Bouton "Assigner une campagne"
5. Modal : liste des campagnes actives (status = 'active')
6. Poseur sélectionne la campagne
7. Photo de validation obligatoire (preuve de pose de l'affiche)
8. Bouton "Confirmer la pose"
9. Supabase :
   - INSERT panel_campaigns (avec validation_photo_path)
   - UPDATE panels SET status = 'active', last_checked_at = NOW()
10. Toast succès + notification admin (optionnel via Supabase Realtime)
```

### FLUX 3 — Vérification annuelle (Poseur)

```
1. Poseur scanne le QR d'un panneau existant
2. Fiche panneau : dernière vérification, photos historiques
3. Bouton "Vérifier l'état"
4. Photo obligatoire
5. Champ : état observé (bon / dégradé / manquant)
6. Si "manquant" → UPDATE panels SET status = 'missing'
7. INSERT panel_photos (type: 'check')
```

### FLUX 4 — Vue Admin Dashboard

```
Métriques en temps réel :
- Nombre total de panneaux
- Panneaux actifs / vacants / manquants / maintenance
- Taux d'occupation global = actifs / total
- Campagnes en cours
- Activité récente (derniers scans)

Carte interactive :
- Tous les panneaux géolocalisés
- Couleur par statut (vert=actif, gris=vacant, orange=maintenance, rouge=manquant)
- Clic sur marqueur → popup avec infos + lien fiche
- Filtres : par ville, par statut, par campagne
```

---

## 5. PAGES & COMPOSANTS — SPÉCIFICATIONS

### `ScanPage` (Opérateur — mobile)
- Plein écran, fond noir, viewfinder caméra centré
- `@zxing/browser` : `BrowserQRCodeReader` en continu
- Détection → vibration haptic (`navigator.vibrate`) + son
- Gestion erreur caméra (permissions refusées)
- Fallback : saisie manuelle de la référence panneau

### `RegisterPanelPage` (Opérateur — mobile)
- GPS auto au chargement (`navigator.geolocation.getCurrentPosition`)
- Composant `PhotoCapture` : accès caméra natif (`input type=file capture=environment`)
- Compression avant upload : `browser-image-compression` (max 1MB)
- Upload vers `supabase.storage.from('panel-photos')`
- Form validation Zod : lat/lng requis, photo requise, type requis

### `AssignCampaignPage` (Opérateur — mobile)
- Affiche infos du panneau scanné (référence, adresse, photo)
- Liste scrollable des campagnes actives
- Sélection → photo de validation → confirmation
- Indicateur de progression (3 étapes visuelles)

### `MapPage` (Admin — desktop + mobile)
- `react-map-gl` avec style Mapbox `mapbox://styles/mapbox/dark-v11`
- Cluster de marqueurs si zoom < 12
- Marqueurs colorés par statut
- Sidebar panneau au clic
- Filtres : ville, statut, campagne (URL params pour partage de vue)
- Bouton "Centrer sur mes panneaux"

### `PanelDetailPage` (Admin)
- Header : référence, statut badge, bouton éditer
- Section : localisation (mini-map statique)
- Section : QR Code (affichage + téléchargement PNG)
- Section : campagne en cours
- Section : historique campagnes (timeline)
- Section : galerie photos (chronologique)
- Section : vérifications (dernière date, prochain check)

### `ReportsPage` (Admin)
- Graphique : taux d'occupation par mois (recharts BarChart)
- Graphique : répartition par statut (PieChart)
- Tableau : panneaux avec le plus de campagnes
- Tableau : panneaux manquants depuis X jours
- Export CSV des données

---

## 6. SYSTÈME QR CODE

### Génération (Admin)
```typescript
// Chaque panneau a un UUID unique stocké en DB
// Le QR encode simplement : "oohmyad://panel/{uuid}"
// ou une URL deep-link : "https://app.oohmyscan.com/scan?id={uuid}"

import QRCode from 'qrcode'

const generateQR = async (panelId: string): Promise<string> => {
  const url = `https://app.oohmyscan.com/scan?id=${panelId}`
  return await QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' }
  })
}
```

### Scan (Opérateur)
```typescript
import { BrowserQRCodeReader } from '@zxing/browser'

const reader = new BrowserQRCodeReader()
const result = await reader.decodeFromVideoDevice(undefined, videoElement, callback)
// Extraire l'UUID du panneau depuis l'URL décodée
```

### Workflow QR
1. Admin crée un panneau "pré-enregistré" (juste un UUID + référence)
2. Admin génère et imprime le QR Code
3. QR Code est collé physiquement sur le panneau
4. Poseur scanne sur le terrain → complète l'enregistrement

---

## 7. CONFIGURATION PWA

### `vite.config.ts`
```typescript
import { VitePWA } from 'vite-plugin-pwa'

VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'OOHMYSCAN',
    short_name: 'OOHMYSCAN',
    theme_color: '#0A0A0A',
    background_color: '#0A0A0A',
    display: 'standalone',
    orientation: 'portrait',
    start_url: '/',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
    ]
  },
  workbox: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\.mapbox\.com\/.*/,
        handler: 'CacheFirst',
        options: { cacheName: 'mapbox-cache' }
      }
    ]
  }
})
```

---

## 8. ROUTING

```typescript
// App.tsx — Routes protégées par rôle

<Routes>
  {/* Public */}
  <Route path="/login" element={<LoginPage />} />
  
  {/* Opérateur (mobile-first) */}
  <Route element={<ProtectedRoute role="operator" />}>
    <Route path="/" element={<ScanPage />} />
    <Route path="/scan" element={<ScanPage />} />
    <Route path="/register/:panelId" element={<RegisterPanelPage />} />
    <Route path="/assign/:panelId" element={<AssignCampaignPage />} />
    <Route path="/check/:panelId" element={<CheckPanelPage />} />
  </Route>
  
  {/* Admin */}
  <Route element={<ProtectedRoute role="admin" />}>
    <Route path="/admin" element={<AdminLayout />}>
      <Route index element={<DashboardPage />} />
      <Route path="map" element={<MapPage />} />
      <Route path="panels" element={<PanelsPage />} />
      <Route path="panels/:id" element={<PanelDetailPage />} />
      <Route path="campaigns" element={<CampaignsPage />} />
      <Route path="campaigns/:id" element={<CampaignDetailPage />} />
      <Route path="reports" element={<ReportsPage />} />
    </Route>
  </Route>
</Routes>
```

---

## 9. VARIABLES D'ENVIRONNEMENT

```env
# .env.local
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_MAPBOX_TOKEN=pk.eyJ...
VITE_APP_URL=https://app.oohmyscan.com
```

---

## 10. ORDRE D'IMPLÉMENTATION (phases)

### Phase 1 — Fondations (Jour 1-2)
- [ ] Init projet Vite + React + TypeScript + Tailwind + shadcn
- [ ] Config Supabase (projet, migrations SQL, Storage buckets)
- [ ] Auth (login email/password, gestion rôles, ProtectedRoute)
- [ ] Layout de base (AppLayout mobile + AdminLayout)

### Phase 2 — Flux terrain (Jour 3-5)
- [ ] Composant QRScanner (`@zxing/browser`)
- [ ] ScanPage avec redirection intelligente
- [ ] Composant PhotoCapture + upload Supabase Storage
- [ ] Hook useGeolocation
- [ ] RegisterPanelPage (formulaire complet)
- [ ] AssignCampaignPage

### Phase 3 — Admin core (Jour 6-9)
- [ ] DashboardPage (métriques temps réel)
- [ ] PanelsPage (liste + filtres + recherche)
- [ ] PanelDetailPage (fiche complète + QR + galerie)
- [ ] CampaignsPage + CampaignDetailPage
- [ ] Génération QR Code (admin)

### Phase 4 — Carte interactive (Jour 10-12)
- [ ] MapPage avec Mapbox
- [ ] Marqueurs colorés par statut + clustering
- [ ] Filtres carte (URL params)
- [ ] Popup panneau au clic

### Phase 5 — Reports & polish (Jour 13-15)
- [ ] ReportsPage (graphiques recharts)
- [ ] Export CSV
- [ ] Config PWA (manifest, icônes, service worker)
- [ ] Tests mobile (iOS Safari + Android Chrome)
- [ ] Optimisations performance (lazy loading routes)

---

## 11. POINTS D'ATTENTION

### Caméra sur iOS Safari
- `input[type=file][capture=environment]` est plus fiable que WebRTC sur iOS pour la photo
- Pour le scan QR, tester `@zxing/browser` sur iOS — fallback possible vers `jsQR` si problème

### Storage photos
- Nommage : `panels/{panel_id}/{timestamp}_{type}.jpg`
- Bucket `panel-photos` : public en lecture (pour affichage), authentifié en écriture
- Compression client-side obligatoire (photos mobiles = 8-15MB sinon)

### Mapbox
- Token Mapbox en variable d'env (ne pas commit)
- Free tier : 50 000 loads/mois (largement suffisant pour commencer)
- Alternative gratuite si besoin : Maplibre GL JS + tuiles OpenStreetMap

### Sécurité
- Row Level Security Supabase : poseurs ne voient que leurs propres scans en écriture
- Admins gèrent les comptes opérateurs (pas d'inscription publique)
- Photos dans Storage : paths privés sauf URL signées

---

## 12. KPIs DISPONIBLES (données générées automatiquement)

| KPI | Calcul |
|---|---|
| Taux d'occupation global | `COUNT(actifs) / COUNT(total) * 100` |
| Taux d'occupation par ville | idem filtré par `city` |
| Durée moyenne par campagne | `AVG(unassigned_at - assigned_at)` |
| Panneaux jamais vérifiés depuis N jours | `WHERE last_checked_at < NOW() - interval 'N days'` |
| Historique complet par panneau | JOIN `panel_campaigns` + `panel_photos` |
| Panneaux disparus | `WHERE status = 'missing'` |
| Activité opérateur | COUNT des actions par `assigned_by` |

---

## 13. ÉVOLUTIONS FUTURES (V2)

- **Notifications push** : rappel vérification annuelle (Supabase Edge Functions + Web Push)
- **Mode hors ligne** : sync différée avec Workbox + IndexedDB
- **Export PDF** : rapport par campagne avec photos (react-pdf)
- **Multi-tenant** : plusieurs agences sur la même plateforme
- **Géocodage inverse** : conversion GPS → adresse auto (Mapbox Geocoding API)
- **Alertes** : panneau manquant → email/SMS automatique
- **App clients** : portail lecture seule pour que les clients suivent leurs campagnes
- **Site vitrine OOHMYAD** : landing page marketing (phase 2 du projet)
