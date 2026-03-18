# OOHMYADMIN — Plan Back-Office Complet
## Claude Code Master Plan

> Back-office desktop pour la gestion complète d'une activité OOH (Out-Of-Home).
> Même repo que l'app terrain OOHMYSCAN, routing `/admin/*`, même Supabase.

---

## Décisions actées

| Sujet | Décision |
|-------|----------|
| Architecture | Même repo, même Supabase, routing `/admin/*` |
| Cible | Desktop-first, pas de PWA |
| Thème UI | **Light professionnel** — design générique propre (pas de charte client) |
| Stack | React 19 + Tailwind v4 + shadcn/ui + TanStack Query v5 + Zustand |
| Rôles | 2 rôles : `admin` / `operator` |
| Export PDF | **@react-pdf/renderer** (composants React → PDF propre) |
| TVA | **Multi-taux par ligne** (20%, 10%, 0%) — récap légal par taux sur PDF |
| Lignes devis/factures | **Prédéfinies + texte libre** (catalogue de prestations + saisie manuelle) |
| Formats panneaux | **Dynamiques** — admin crée ses formats (table `panel_formats`) |
| QR Export | **Avery L7163** (99,1 × 38,1 mm — 14 étiquettes / A4) |
| Campagne terminée | Panneaux repassent en `vacant` **automatiquement** |
| Proof of Posting | **Full drag & drop** des blocs (texte, photos, carte, tableau) |
| Notifications V1 | **Aucune** — alertes statiques dans le dashboard uniquement |
| Facturation | Devis → Facture, forfait par campagne |
| Relance | Template email pré-rempli (mailto:), pas d'envoi automatique |
| Numérotation | Devis `D-2026-001`, Factures `F-2026-001` (incrémental depuis `company_settings`) |
| Company settings | Placeholders au départ — admin remplit via page Paramètres |

---

## 1. NOUVELLES TABLES SUPABASE

### `panel_formats` (nouveau — formats dynamiques)
```sql
CREATE TABLE panel_formats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,        -- Ex: '4x3', 'Abribus', 'Bâche', 'Mupi'
  width_cm INT,                     -- Largeur en cm (optionnel)
  height_cm INT,                    -- Hauteur en cm (optionnel)
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed de base
INSERT INTO panel_formats (name) VALUES
  ('4x3'), ('Abribus'), ('Bâche'), ('Mupi'), ('Totem'), ('Digital');
```

### `clients`
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  siret TEXT,
  tva_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `campaigns` — colonnes ajoutées
```sql
ALTER TABLE campaigns
  ADD COLUMN client_id UUID REFERENCES clients(id),
  ADD COLUMN budget DECIMAL(10,2),
  ADD COLUMN target_panel_count INT,
  ADD COLUMN notes TEXT;

-- Migration : créer clients depuis les valeurs texte existantes
-- puis UPDATE campaigns SET client_id = ... WHERE client = ...
-- puis DROP COLUMN client;
```

### `campaign_visuals`
```sql
CREATE TABLE campaign_visuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  panel_format_id UUID REFERENCES panel_formats(id),  -- FK dynamique
  storage_path TEXT NOT NULL,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `service_catalog` (nouveau — prestations prédéfinies)
```sql
CREATE TABLE service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,               -- Ex: 'Pose d'affiche', 'Création visuelle'
  default_unit_price DECIMAL(10,2),
  default_tva_rate DECIMAL(5,2) DEFAULT 20.00,
  unit TEXT DEFAULT 'unité',       -- unité, heure, forfait, m²...
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed de base
INSERT INTO service_catalog (name, default_unit_price, default_tva_rate, unit) VALUES
  ('Pose d''affiche', 0, 20.00, 'unité'),
  ('Dépose affiche', 0, 20.00, 'unité'),
  ('Création visuelle', 0, 20.00, 'forfait'),
  ('Tirage impression', 0, 20.00, 'm²'),
  ('Location emplacement', 0, 20.00, 'mois'),
  ('Frais de déplacement', 0, 20.00, 'forfait');
```

### `quotes` (devis)
```sql
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT UNIQUE NOT NULL,   -- Ex: D-2026-001
  client_id UUID NOT NULL REFERENCES clients(id),
  campaign_id UUID REFERENCES campaigns(id),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'converted')),
  total_ht DECIMAL(10,2) DEFAULT 0,
  total_ttc DECIMAL(10,2) DEFAULT 0,
  valid_until DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `quote_lines` — TVA par ligne
```sql
CREATE TABLE quote_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  service_catalog_id UUID REFERENCES service_catalog(id),  -- Nullable si texte libre
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit TEXT DEFAULT 'unité',
  unit_price DECIMAL(10,2) DEFAULT 0,
  tva_rate DECIMAL(5,2) DEFAULT 20.00,   -- TVA PAR LIGNE (20, 10, 0)
  total_ht DECIMAL(10,2) DEFAULT 0,      -- quantity × unit_price
  sort_order INT DEFAULT 0
);
```

### `invoices` (factures)
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,   -- Ex: F-2026-001
  quote_id UUID REFERENCES quotes(id),   -- Nullable — devis converti
  client_id UUID NOT NULL REFERENCES clients(id),
  campaign_id UUID REFERENCES campaigns(id),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  total_ht DECIMAL(10,2) DEFAULT 0,
  total_ttc DECIMAL(10,2) DEFAULT 0,
  issued_at DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_at DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `invoice_lines` — TVA par ligne
```sql
CREATE TABLE invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  service_catalog_id UUID REFERENCES service_catalog(id),
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit TEXT DEFAULT 'unité',
  unit_price DECIMAL(10,2) DEFAULT 0,
  tva_rate DECIMAL(5,2) DEFAULT 20.00,   -- TVA PAR LIGNE
  total_ht DECIMAL(10,2) DEFAULT 0,
  sort_order INT DEFAULT 0
);
```

### `qr_stock`
```sql
CREATE TABLE qr_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- = futur panel ID
  qr_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'printed', 'assigned')),
  batch_name TEXT,                          -- Ex: "Lot Mars 2026"
  assigned_panel_id UUID REFERENCES panels(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `company_settings` (singleton)
```sql
CREATE TABLE company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT DEFAULT 'OOHMYAD',
  address TEXT,
  city TEXT,
  postal_code TEXT,
  siret TEXT,
  tva_number TEXT,
  logo_path TEXT,
  email TEXT,
  phone TEXT,
  iban TEXT,
  bic TEXT,
  quote_prefix TEXT DEFAULT 'D',
  invoice_prefix TEXT DEFAULT 'F',
  next_quote_number INT DEFAULT 1,
  next_invoice_number INT DEFAULT 1,
  legal_mentions TEXT DEFAULT 'TVA non applicable, article 293 B du CGI'
);

-- Insérer le singleton
INSERT INTO company_settings DEFAULT VALUES;
```

### Trigger — campagne terminée → panneaux vacant
```sql
CREATE OR REPLACE FUNCTION auto_vacate_panels_on_campaign_end()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Désassigner les panel_campaigns actifs
    UPDATE panel_campaigns
    SET unassigned_at = NOW()
    WHERE campaign_id = NEW.id AND unassigned_at IS NULL;

    -- Repasser les panneaux en vacant
    UPDATE panels
    SET status = 'vacant'
    WHERE id IN (
      SELECT panel_id FROM panel_campaigns
      WHERE campaign_id = NEW.id
    )
    AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_campaign_completed
  AFTER UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION auto_vacate_panels_on_campaign_end();
```

### RLS Policies (nouvelles tables)
```sql
-- Toutes les tables business : accès complet admin uniquement
-- Opérateurs : lecture seule sur clients, campagnes, service_catalog, panel_formats

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_visuals ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Admin : accès total
CREATE POLICY "Admin full access" ON clients FOR ALL USING (is_admin());
CREATE POLICY "Admin full access" ON quotes FOR ALL USING (is_admin());
CREATE POLICY "Admin full access" ON quote_lines FOR ALL USING (is_admin());
CREATE POLICY "Admin full access" ON invoices FOR ALL USING (is_admin());
CREATE POLICY "Admin full access" ON invoice_lines FOR ALL USING (is_admin());
CREATE POLICY "Admin full access" ON qr_stock FOR ALL USING (is_admin());
CREATE POLICY "Admin full access" ON company_settings FOR ALL USING (is_admin());
CREATE POLICY "Admin full access" ON service_catalog FOR ALL USING (is_admin());
CREATE POLICY "Admin full access" ON panel_formats FOR ALL USING (is_admin());
CREATE POLICY "Admin full access" ON campaign_visuals FOR ALL USING (is_admin());

-- Opérateurs : lecture sur les référentiels nécessaires au terrain
CREATE POLICY "Operators read panel_formats" ON panel_formats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operators read campaign_visuals" ON campaign_visuals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operators read service_catalog" ON service_catalog FOR SELECT USING (is_admin() = false);
```

### Storage Buckets (nouveau)
```
campaign-visuals  → privé (signed URLs) — visuels campagnes
company-assets    → privé — logo société
```

---

## 2. ARCHITECTURE FICHIERS (delta vs OOHMYSCAN)

```
src/
├── pages/
│   └── admin/
│       ├── DashboardPage.tsx
│       ├── MapPage.tsx
│       ├── panels/
│       │   ├── PanelsPage.tsx
│       │   └── PanelDetailPage.tsx
│       ├── campaigns/
│       │   ├── CampaignsPage.tsx
│       │   └── CampaignDetailPage.tsx
│       ├── clients/
│       │   ├── ClientsPage.tsx
│       │   └── ClientDetailPage.tsx
│       ├── quotes/
│       │   ├── QuotesPage.tsx
│       │   └── QuoteDetailPage.tsx
│       ├── invoices/
│       │   ├── InvoicesPage.tsx
│       │   └── InvoiceDetailPage.tsx
│       ├── qr/
│       │   └── QRStockPage.tsx
│       ├── users/
│       │   └── UsersPage.tsx
│       ├── reports/
│       │   ├── ReportsPage.tsx
│       │   └── ProofOfPostingEditor.tsx
│       └── settings/
│           └── SettingsPage.tsx
├── components/
│   └── admin/
│       ├── layout/
│       │   ├── AdminLayout.tsx        -- Sidebar + header
│       │   └── AdminSidebar.tsx       -- Navigation complète
│       ├── billing/
│       │   ├── LineEditor.tsx         -- Éditeur lignes devis/facture
│       │   ├── LineCatalogPicker.tsx  -- Sélecteur prestation prédéfinie
│       │   ├── TvaRecap.tsx           -- Récap HT par taux TVA
│       │   ├── DocumentHeader.tsx     -- En-tête PDF (logo, infos société)
│       │   └── StatusWorkflow.tsx     -- Stepper statut devis/facture
│       ├── proof/
│       │   ├── ProofCanvas.tsx        -- Zone drag & drop des blocs
│       │   ├── ProofBlockText.tsx
│       │   ├── ProofBlockPhotos.tsx
│       │   ├── ProofBlockMap.tsx
│       │   └── ProofBlockTable.tsx
│       └── qr/
│           ├── QRBatchGenerator.tsx
│           └── QRAveryExport.tsx      -- Export PDF format Avery L7163
├── hooks/
│   └── admin/
│       ├── useClients.ts
│       ├── useQuotes.ts
│       ├── useInvoices.ts
│       ├── useQRStock.ts
│       ├── useCompanySettings.ts
│       ├── useServiceCatalog.ts
│       └── usePanelFormats.ts
├── lib/
│   ├── pdf/
│   │   ├── QuotePDF.tsx               -- Template devis @react-pdf/renderer
│   │   ├── InvoicePDF.tsx             -- Template facture @react-pdf/renderer
│   │   └── pdf-helpers.ts             -- Calculs TVA multi-taux, formatage
│   └── avery.ts                       -- Calculs gabarit Avery L7163
└── types/
    └── admin.types.ts                 -- Types billing, proof of posting, etc.
```

---

## 3. LOGIQUE TVA MULTI-TAUX

> Chaque ligne a son propre taux. Le PDF regroupe par taux (norme légale française).

```typescript
// lib/pdf/pdf-helpers.ts

type TvaGroup = { rate: number; baseHT: number; montantTVA: number }

export function computeTvaGroups(lines: QuoteLine[]): TvaGroup[] {
  const groups = new Map<number, number>()

  lines.forEach(line => {
    const ht = line.quantity * line.unit_price
    groups.set(line.tva_rate, (groups.get(line.tva_rate) ?? 0) + ht)
  })

  return Array.from(groups.entries())
    .sort(([a], [b]) => b - a)   // 20% → 10% → 0%
    .map(([rate, baseHT]) => ({
      rate,
      baseHT,
      montantTVA: rate === 0 ? 0 : baseHT * (rate / 100)
    }))
}

export function computeTotals(lines: QuoteLine[]) {
  const groups = computeTvaGroups(lines)
  const totalHT = groups.reduce((sum, g) => sum + g.baseHT, 0)
  const totalTVA = groups.reduce((sum, g) => sum + g.montantTVA, 0)
  return { totalHT, totalTVA, totalTTC: totalHT + totalTVA, groups }
}
```

### Template PDF facture (`InvoicePDF.tsx`)
Structure requise (norme française) :
```
[Logo société]           [Infos société : nom, adresse, SIRET, TVA]
FACTURE N° F-2026-001    Date d'émission : XX/XX/XXXX
                         Date d'échéance : XX/XX/XXXX

Facturer à :
[Nom client, adresse, SIRET/TVA]

┌─────────────────────────────────────────────────────────┐
│ Description │ Qté │ Unité │ P.U. HT │ TVA % │ Total HT │
├─────────────────────────────────────────────────────────┤
│ ...         │     │       │         │       │          │
└─────────────────────────────────────────────────────────┘

Récapitulatif TVA :
┌──────────────┬──────────┬────────────┬───────────┐
│ Taux TVA     │ Base HT  │ Montant TVA│ Total TTC │
├──────────────┼──────────┼────────────┼───────────┤
│ 20,00 %      │ X XXX,XX │    XXX,XX  │ X XXX,XX  │
│ 10,00 %      │   XXX,XX │     XX,XX  │   XXX,XX  │
│ 0,00 % (exo) │   XXX,XX │      0,00  │   XXX,XX  │
├──────────────┼──────────┼────────────┼───────────┤
│ TOTAL        │ X XXX,XX │    XXX,XX  │ X XXX,XX  │
└──────────────┴──────────┴────────────┴───────────┘

Règlement par virement : IBAN | BIC
[Mentions légales]
```

---

## 4. EXPORT QR — AVERY L7163

```typescript
// lib/avery.ts

export const AVERY_L7163 = {
  pageWidth: 210,        // A4 mm
  pageHeight: 297,       // A4 mm
  labelWidth: 99.1,
  labelHeight: 38.1,
  cols: 2,
  rows: 7,               // 14 étiquettes / page
  marginTop: 10.7,
  marginLeft: 4.67,
  gutterH: 2.54,         // espace horizontal entre colonnes
  gutterV: 0,            // pas d'espace vertical
}

// Chaque étiquette contient :
// - QR Code (centré, 30x30mm)
// - Référence panneau (texte sous le QR, 8pt)
// - Nom du lot (texte en haut, 6pt gris)
```

---

## 5. ÉDITEUR PROOF OF POSTING (drag & drop)

### Stack
- `@dnd-kit/core` + `@dnd-kit/sortable` — drag & drop des blocs
- `@react-pdf/renderer` — export PDF final
- State local Zustand slice `proofStore` — composition en cours

### Types de blocs
```typescript
type ProofBlock =
  | { type: 'text';   id: string; content: string }
  | { type: 'photos'; id: string; photoIds: string[]; columns: 2 | 3 | 4 }
  | { type: 'map';    id: string; zoom: number; center: [number, number] }
  | { type: 'table';  id: string; rows: { panel: string; date: string; operator: string }[] }
  | { type: 'header'; id: string }   // Auto-rempli : client, campagne, dates, nb panneaux
```

### Flux éditeur
```
1. Admin ouvre /admin/reports/:campaignId
2. En-tête auto-rempli (client, dates, panneaux posés)
3. Blocs par défaut : Header + Table panneaux + Grille photos (toutes les photos de validation)
4. Admin peut :
   - Réordonner les blocs (drag & drop vertical)
   - Ajouter un bloc texte / photos / carte / tableau
   - Supprimer / éditer chaque bloc
   - Sélectionner les photos à inclure (parmi toutes les photos terrain de la campagne)
5. Preview temps réel (rendu @react-pdf via PDFViewer)
6. Export PDF → téléchargement
```

---

## 6. SIDEBAR NAVIGATION

```
╔══════════════════╗
║  OOHMYSCAN       ║  (logo + nom)
╠══════════════════╣
║ 📊 Dashboard     ║
║ 🗺️  Carte         ║
╠══════════════════╣
║ 📋 Panneaux      ║
║ 📢 Campagnes     ║
║ 👥 Clients       ║
╠══════════════════╣
║ 📄 Devis         ║
║ 💰 Factures      ║
╠══════════════════╣
║ 🏷️  QR Codes      ║
║ 👤 Utilisateurs  ║
║ 📈 Rapports      ║
╠══════════════════╣
║ ⚙️  Paramètres    ║
╚══════════════════╝
```

---

## 7. DÉTAIL DES 17 ROUTES

### `/admin` — Dashboard
- KPIs : panneaux total, taux d'occupation, campagnes actives, CA facturé YTD
- **Alertes statiques** (pas de temps réel V1) :
  - Factures `overdue` (due_date < today ET status = 'sent')
  - Devis expirés (valid_until < today ET status = 'sent')
  - Panneaux `missing`
- Activité récente (derniers scans opérateurs via `panel_campaigns`)
- Graphiques : taux d'occupation par mois (recharts), répartition statuts (PieChart)

### `/admin/map` — Carte
- Mapbox style `mapbox-streets-v12` (light) — cohérent avec thème light
- Marqueurs colorés par statut
- Filtres : statut, ville, **format** (depuis `panel_formats`), type, campagne

### `/admin/panels` — Liste panneaux
- Table paginée serveur (`.range()` Supabase)
- Colonnes triables : référence, ville, format, statut, dernière vérif
- Filtres : statut, ville, format (dropdown dynamique depuis `panel_formats`), type

### `/admin/panels/:id` — Détail panneau
- Édition complète incluant **format** (select dynamique `panel_formats`)
- Mini-carte Mapbox statique
- Galerie photos avec viewer lightbox + suppression
- Historique campagnes

### `/admin/campaigns` — Liste campagnes
- Filtres : statut, client, dates
- Badge progression : X panneaux posés / Y prévus

### `/admin/campaigns/:id` — Détail campagne
- Client lié (select `clients`, pas texte libre)
- Upload visuels par format (select `panel_formats`)
- Barre progression posé/prévu
- Workflow : `draft → active → completed → invoiced`
- **Au passage en `completed`** → trigger Supabase passe panneaux en `vacant`

### `/admin/clients` — Liste + `/admin/clients/:id` — Détail
- Onglets : Campagnes / Devis / Factures liés
- Stats CA total, nb campagnes

### `/admin/quotes` — Liste + `/admin/quotes/:id` — Devis
- Éditeur de lignes : sélecteur catalogue (`service_catalog`) OU texte libre
- TVA par ligne (select 20% / 10% / 0%)
- Calcul auto HT / TVA groupée / TTC (temps réel)
- Workflow : `draft → sent → accepted/rejected → converted`
- Conversion → crée automatiquement une `invoice` avec les mêmes lignes
- Aperçu PDF + Téléchargement

### `/admin/invoices` — Liste + `/admin/invoices/:id` — Facture
- Alertes visuelles `overdue` (badge rouge)
- Relance mail : bouton `mailto:` pré-rempli (objet + corps avec N° facture, montant, IBAN)
- Export PDF avec logo, mentions légales, IBAN/BIC
- Suivi : `draft → sent → overdue (auto) → paid`

### `/admin/qr` — Stock QR
- Génération en masse : saisir nombre + nom du lot → INSERT N UUIDs dans `qr_stock`
- Table : référence, lot, statut, panneau assigné (si applicable)
- **Export PDF Avery L7163** : sélectionner les QR à imprimer → PDF avec grille 14/page
- Export ZIP PNG (QR individuels via `qrcode` npm)

### `/admin/users` — Utilisateurs
- Liste profils (admin + opérateurs)
- Invitation email (Supabase `inviteUserByEmail`)
- Désactivation (UPDATE profiles SET is_active = false, pas de suppression)
- Stats par opérateur : installations, photos, campagnes posées, dernière activité

### `/admin/reports` — Rapports
- Stats globales filtrées par période
- Par client, par ville, par opérateur

### `/admin/reports/:campaignId` — Proof of Posting
- Éditeur drag & drop (voir Section 5)
- Export PDF

### `/admin/settings` — Paramètres
- Infos société (CRUD `company_settings` singleton)
- Upload logo → Supabase Storage `company-assets`
- Gestion `service_catalog` (CRUD prestations prédéfinies)
- Gestion `panel_formats` (CRUD formats dynamiques)
- Préfixes et numérotation devis/factures

---

## 8. NUMÉROTATION AUTOMATIQUE

```typescript
// Fonction Supabase SQL (atomic, évite les doublons en concurrence)

CREATE OR REPLACE FUNCTION get_next_quote_number()
RETURNS TEXT AS $$
DECLARE
  settings company_settings%ROWTYPE;
  num TEXT;
BEGIN
  SELECT * INTO settings FROM company_settings LIMIT 1 FOR UPDATE;
  num := settings.quote_prefix || '-' ||
         EXTRACT(YEAR FROM NOW())::TEXT || '-' ||
         LPAD(settings.next_quote_number::TEXT, 3, '0');
  UPDATE company_settings SET next_quote_number = next_quote_number + 1;
  RETURN num;
END;
$$ LANGUAGE plpgsql;

-- Idem pour get_next_invoice_number()
```

---

## 9. DÉPENDANCES NOUVELLES

```bash
pnpm add @react-pdf/renderer        # Export PDF factures/devis/rapports
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities  # Drag & drop proof
pnpm add jszip                      # Export ZIP QR codes PNG
pnpm add file-saver                 # Téléchargement fichiers générés
pnpm add @types/file-saver -D

# Déjà installé (vérifier)
# qrcode — génération QR
# recharts — graphiques dashboard
# mapbox-gl + react-map-gl — carte
```

---

## 10. PHASES D'IMPLÉMENTATION

### Phase 1 — Fondations admin (Jours 1-3)
- [ ] Migrations SQL : toutes les nouvelles tables + trigger campagne terminée
- [ ] RLS policies nouvelles tables + helper `is_admin()`
- [ ] Storage buckets `campaign-visuals` + `company-assets`
- [ ] `AdminLayout` refondu : sidebar complète, header, routing `/admin/*`
- [ ] Page `Paramètres` : `company_settings` CRUD + upload logo
- [ ] Page `Paramètres` : gestion `panel_formats` + `service_catalog`
- [ ] Dashboard refondu : KPIs + alertes statiques + graphiques

### Phase 2 — Clients + Panneaux (Jours 4-6)
- [ ] CRUD `Clients` (liste + création + édition + détail avec onglets)
- [ ] `Panneaux` : table paginée serveur + tri + filtres avancés + format dynamique
- [ ] `Panneau détail` : édition complète + galerie photos + historique campagnes
- [ ] `Carte` : filtres avancés (format dynamique depuis `panel_formats`)
- [ ] Carte : style light Mapbox (cohérent avec thème admin)

### Phase 3 — Campagnes (Jours 7-9)
- [ ] Campagnes liées aux clients (migration champ texte → FK)
- [ ] Upload visuels par format de panneau
- [ ] Assignation/désassignation panneaux
- [ ] Barre progression posé/prévu
- [ ] Workflow statut complet + trigger `completed → vacant`
- [ ] Impact app terrain : opérateur voit le visuel selon le format du panneau scanné

### Phase 4 — QR Codes + Utilisateurs (Jours 10-11)
- [ ] Génération en masse de QR codes
- [ ] Table de stock avec filtres lot/statut
- [ ] **Export PDF Avery L7163** (gabarit exact 99,1×38,1mm, 14/page)
- [ ] Export ZIP PNG individuels
- [ ] Gestion utilisateurs : liste, invitation, désactivation, stats opérateur

### Phase 5 — Devis & Factures (Jours 12-15)
- [ ] CRUD Devis : lignes avec catalogue + texte libre + TVA par ligne
- [ ] Calcul auto temps réel HT / TVA groupée / TTC
- [ ] Workflow devis complet + numérotation automatique atomique
- [ ] Template PDF devis (`@react-pdf/renderer`) avec récap TVA multi-taux
- [ ] Conversion devis → facture (copie lignes)
- [ ] CRUD Factures + workflow + numérotation automatique
- [ ] Template PDF facture avec logo, IBAN, mentions légales, récap TVA
- [ ] Relance mail `mailto:` pré-rempli
- [ ] Alertes `overdue` (dashboard + liste factures)

### Phase 6 — Rapports & Proof of Posting (Jours 16-19)
- [ ] Page rapports stats globaux (par période, client, ville, opérateur)
- [ ] Export CSV données
- [ ] Éditeur Proof of Posting : blocs drag & drop (`@dnd-kit`)
- [ ] Bloc header auto-rempli depuis campagne
- [ ] Bloc photos : sélecteur parmi photos terrain de la campagne
- [ ] Bloc carte : mini-map Mapbox avec panneaux de la campagne
- [ ] Bloc tableau : liste panneaux posés (référence, date, opérateur)
- [ ] Preview PDF temps réel (`PDFViewer`)
- [ ] Export PDF final

---

## 11. NOTES TECHNIQUES CRITIQUES

### @react-pdf/renderer
- Ne supporte **pas** les composants React classiques — tout doit être `<View>`, `<Text>`, `<Image>`
- Les polices système ne sont pas disponibles — enregistrer une police custom ou utiliser Helvetica/Times
- `PDFViewer` pour la preview in-app, `PDFDownloadLink` pour le téléchargement
- Les images Supabase Storage nécessitent des **signed URLs** (bucket privé)

### Avery L7163 — précisions
- Marges Avery officielles : top 10,7mm / left 4,67mm
- Gouttière horizontale entre les 2 colonnes : 2,54mm
- Gouttière verticale : 0mm (les étiquettes se touchent verticalement)
- Utiliser `jspdf` pour le positionnement précis plutôt que `@react-pdf` (plus de contrôle sur les mm)

### Pagination serveur Supabase
```typescript
const PAGE_SIZE = 25
const { data, count } = await supabase
  .from('panels')
  .select('*', { count: 'exact' })
  .order(sortColumn, { ascending })
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
```

### Migration client texte → FK
```sql
-- 1. Créer les clients depuis les valeurs uniques
INSERT INTO clients (company_name)
SELECT DISTINCT client FROM campaigns WHERE client IS NOT NULL;

-- 2. Mettre à jour la FK
UPDATE campaigns c
SET client_id = cl.id
FROM clients cl
WHERE cl.company_name = c.client;

-- 3. Supprimer l'ancienne colonne
ALTER TABLE campaigns DROP COLUMN client;
```

### Thème Light — palette UI
```css
/* Couleurs cibles pour un admin professionnel */
--background: #F8F9FA;
--surface:     #FFFFFF;
--border:      #E2E8F0;
--text-primary: #0F172A;
--text-muted:   #64748B;
--accent:       #2563EB;   /* Bleu professionnel */
--success:      #16A34A;
--warning:      #D97706;
--danger:       #DC2626;
```
