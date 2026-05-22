# CLAUDE.md — OOH MY AD ! Landing Page
## Adaptation identité graphique — Identité Visuelle 2
### Design by YYA Studio

---

## CONTEXTE

Tu travailles sur la landing page marketing de **OOH MY AD !**, une régie publicitaire
spécialisée dans la communication de proximité captive ("le média du dernier mètre").

La landing page existante utilise une charte dark avec accent jaune `#F5C400`.
Elle doit être **adaptée** pour appliquer la nouvelle identité graphique validée
(Identité Visuelle 2 — YYA Studio).

**Important :** C'est une ADAPTATION, pas une refonte. La structure des sections,
la logique des composants, les hooks et la logique métier existante ne changent pas.
Seuls les tokens visuels (couleurs, typographie, éléments graphiques) changent.

Stack : React + Vite + TypeScript + TailwindCSS + Framer Motion

---

## TOKENS DE LA NOUVELLE IDENTITÉ

### Palette — 3 couleurs exactes

```css
:root {
  --yellow:       #F4C400;   /* Jaune signal — couleur dominante et accent */
  --yellow-dark:  #D9AC00;   /* Hover, variante sombre */
  --black:        #111111;   /* Fond principal et typographie */
  --cream:        #EAE3D0;   /* Fond secondaire, sections alternées */
  --red-accent:   #D94F2D;   /* Uniquement dans les éléments décoratifs */

  --text-on-black:  #FFFFFF;
  --text-on-yellow: #111111;
  --text-on-cream:  #111111;
  --text-muted-dark:  rgba(255, 255, 255, 0.55);
  --text-muted-light: rgba(17, 17, 17, 0.55);
}
```

**RÈGLES COULEURS ABSOLUES :**
- Supprimer `#F5C400` → remplacer par `#F4C400`
- Supprimer `#0A0A0A` → remplacer par `#111111`
- Supprimer `#FAFAFA`, `#F5F0E8` → remplacer par `#EAE3D0`
- Supprimer tout rouge `#D92B2B` — le rouge `#D94F2D` n'est que décoratif
- Le jaune `#F4C400` est la seule couleur d'accent (CTA, highlights, éléments actifs)

---

### Typographie

GC Grind Extra Bold et BringBold Nineties sont des polices commerciales.
Utilise les alternatives Google Fonts les plus proches :

```css
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800;900&family=Barlow:wght@400;500;800;900&display=swap');
```

**Hiérarchie :**
```
Hero / H1    : Barlow Condensed 900, 80-120px, uppercase, letter-spacing -0.03em
H2 sections  : Barlow Condensed 800, 48-72px, uppercase, letter-spacing -0.01em
H3 / labels  : Barlow 900, 20-28px, uppercase, letter-spacing 0.05em
Body         : Barlow 400, 16-18px, line-height 1.6, text-align: justify
Caption      : Barlow 500, 12px, uppercase, letter-spacing 0.2em
KPI values   : Barlow Condensed 900, 64-96px, uppercase
```

Le corps de texte est **justifié** (`text-align: justify`) — style de l'identité.

---

### Éléments graphiques signature

#### 1. Pattern de points (motif signature de la marque)
Cercles jaune/rouge/noir sur fond crème — à utiliser en décoration.
Créer `src/components/ui/DotPattern.tsx` :

```tsx
export function DotPattern({ className }: { className?: string }) {
  const dots = [
    { cx: 10, cy: 20, r: 1.8, fill: '#F4C400' },
    { cx: 35, cy: 10, r: 1.2, fill: '#111111' },
    { cx: 55, cy: 25, r: 2.2, fill: '#D94F2D' },
    { cx: 75, cy: 12, r: 1.4, fill: '#F4C400' },
    { cx: 20, cy: 55, r: 1.6, fill: '#D94F2D' },
    { cx: 45, cy: 60, r: 1.0, fill: '#111111' },
    { cx: 65, cy: 50, r: 2.0, fill: '#F4C400' },
    { cx: 85, cy: 65, r: 1.3, fill: '#111111' },
    { cx: 30, cy: 80, r: 1.8, fill: '#F4C400' },
    { cx: 60, cy: 85, r: 1.1, fill: '#D94F2D' },
    { cx: 90, cy: 40, r: 1.6, fill: '#D94F2D' },
    { cx: 15, cy: 40, r: 0.9, fill: '#111111' },
    { cx: 50, cy: 40, r: 1.4, fill: '#F4C400' },
    { cx: 80, cy: 20, r: 1.0, fill: '#D94F2D' },
  ]
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      {dots.map((d, i) => <circle key={i} {...d} opacity={0.8} />)}
    </svg>
  )
}
```

Usage : `position: absolute`, pleine largeur/hauteur de section, `opacity-20 pointer-events-none`.

#### 2. Trait de pinceau brush stroke
Séparateur décoratif sous les titres H2 importants.
Créer `src/components/ui/BrushStroke.tsx` :

```tsx
export function BrushStroke({ color = '#111111', className }: {
  color?: string
  className?: string
}) {
  return (
    <svg viewBox="0 0 300 20" className={className} aria-hidden="true">
      <path
        d="M5,14 C40,4 80,18 130,10 C180,2 220,16 260,8 C280,4 295,12 298,9"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
        opacity="0.85"
      />
    </svg>
  )
}
```

#### 3. Découpe photo déchirée
Les photos ont un bord déchiré irrégulier (signature visuelle de la charte).

```css
.torn-edge {
  clip-path: polygon(
    0% 0%, 100% 0%, 100% 78%,
    95% 83%, 88% 76%, 80% 86%,
    70% 78%, 60% 88%, 50% 80%,
    40% 90%, 28% 81%, 18% 88%,
    8% 78%, 0% 85%
  );
}
```

#### 4. Grain subtil
```css
.grain::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: 0.02;
  pointer-events: none;
  z-index: 1;
}
```

---

## ALTERNANCE DES FONDS — RYTHME VISUEL

```
Hero           → Fond JAUNE  #F4C400  — texte #111111
TrustSection   → Fond NOIR   #111111  — texte #FFFFFF
ConceptSection → Fond CRÈME  #EAE3D0  — texte #111111
Familles       → Fond NOIR   #111111  — texte #FFFFFF
WhyUs          → Fond CRÈME  #EAE3D0  — texte #111111  (+ DotPattern)
Process        → Fond NOIR   #111111  — texte #FFFFFF
Contact        → Fond JAUNE  #F4C400  — texte #111111
Footer         → Fond NOIR   #111111  — texte #FFFFFF
```

---

## ADAPTATION SECTION PAR SECTION

### index.css
- Remplacer l'import Bebas Neue / Unbounded / Work Sans par Barlow + Barlow Condensed
- Ajouter `::selection { background: #F4C400; color: #111111; }`
- Ajouter scrollbar dark (voir tokens)
- Retirer les variables `--bg-dark`, `--accent` existantes et les remplacer par les nouvelles

### Navbar
- Fond `#111111`, transparent au top → `#111111` au scroll
- Logo : Barlow Condensed 900, `#F4C400`, uppercase
- Links : Barlow 500, `rgba(255,255,255,0.6)`, hover `#F4C400`
- CTA : fond `#F4C400`, texte `#111111`, Barlow 800, `border-radius: 0`

### HeroSection
**FOND JAUNE `#F4C400` — texte NOIR** (inverse de l'actuel)
- Titre "OOH MY AD !" : Barlow Condensed 900, 96px, `#111111`, uppercase
- Tagline sur bandeau noir : fond `#111111`, texte `#FFFFFF`, Barlow 500
- Photo hero : appliquer `.torn-edge`
- CTA : fond `#111111`, texte `#F4C400`, `border-radius: 0`
- Retirer les glows chromatiques et le grain sombre — fond est plein jaune

### TrustSection
- Fond `#111111`
- Label : Barlow 500, uppercase, `rgba(255,255,255,0.35)`
- Cards clients : fond `rgba(255,255,255,0.04)`, border `rgba(255,255,255,0.08)`

### ConceptSection
- Fond `#EAE3D0` (crème)
- Titre : Barlow Condensed 900, `#111111`
- Corps : Barlow 400, `#111111`, `text-align: justify`
- Tableau : borders `1px solid #111111`, pas de border-radius
- Lignes OOH MY AD : fond `#F4C400`, texte `#111111`
- Lignes classiques : `rgba(17,17,17,0.4)`, strikethrough

### FamillesSection
- Fond `#111111`
- Titre section : Barlow Condensed 900, `#F4C400`, uppercase, très grand
- Cards : fond `#1A1A1A`, border `rgba(255,255,255,0.08)`, `border-radius: 0`
- Titre card : Barlow Condensed 800, `#F4C400`
- CTA hover card : fond `#F4C400`, texte `#111111`
- Section Digital : fond `#EAE3D0`, texte `#111111`

### WhyUsSection (KPIs)
- Fond `#EAE3D0` avec `<DotPattern />` en `position: absolute opacity-20`
- KPI value : Barlow Condensed 900, 72px, `#111111`
- KPI label : Barlow 500, 12px, uppercase, `#111111`, letter-spacing 0.2em
- Feature cards : fond `#FFFFFF`, border `1px solid rgba(17,17,17,0.12)`, `border-radius: 0`
- `<BrushStroke />` sous le titre de section

### ProcessSection
- Fond `#111111`
- Numéros : Barlow Condensed 900, 48px, `#F4C400`
- Titre étape : Barlow Condensed 800, uppercase, `#FFFFFF`
- Description : Barlow 400, `rgba(255,255,255,0.55)`, justify

### ContactSection
**FOND JAUNE `#F4C400`**
- Titre : Barlow Condensed 900, `#111111`, uppercase
- Formulaire : fond `#111111`, inputs border `rgba(255,255,255,0.15)`
- Input focus : border `#F4C400`
- Submit : fond `#111111`, texte `#F4C400`, Barlow 800, `border-radius: 0`

### Footer
- Fond `#111111`
- Logo : Barlow Condensed 900, `#F4C400`
- Links : Barlow 400, `rgba(255,255,255,0.4)`, hover `#F4C400`

---

## DESIGN SYSTEM BOUTONS

```tsx
// Primaire (sur fond jaune) — noir avec hover transparent
className="bg-[#111111] text-[#F4C400] font-['Barlow'] font-extrabold
           text-[13px] uppercase tracking-[0.08em] px-8 py-4 rounded-none
           border-2 border-[#111111] transition-all
           hover:bg-transparent hover:text-[#111111]"

// Primaire (sur fond noir) — jaune avec hover transparent
className="bg-[#F4C400] text-[#111111] font-['Barlow'] font-extrabold
           text-[13px] uppercase tracking-[0.08em] px-8 py-4 rounded-none
           border-2 border-[#F4C400] transition-all
           hover:bg-transparent hover:text-[#F4C400]"

// Secondaire outline blanc
className="bg-transparent text-white font-['Barlow'] font-extrabold
           text-[13px] uppercase tracking-[0.08em] px-8 py-4 rounded-none
           border-2 border-white transition-all
           hover:bg-white hover:text-[#111111]"
```

**RÈGLE ABSOLUE : `border-radius: 0` partout** — boutons, cards, inputs, badges, modals.

---

## CE QU'IL FAUT SUPPRIMER / REMPLACER

| Avant | Après |
|-------|-------|
| `font-['Bebas_Neue']` | `font-['Barlow_Condensed']` |
| `font-['Unbounded']` | `font-['Barlow_Condensed']` |
| `#F5C400` | `#F4C400` |
| `#0A0A0A` | `#111111` |
| `#FAFAFA`, `#F5F0E8` | `#EAE3D0` |
| `rounded-xl`, `rounded-lg`, `rounded-md` | `rounded-none` |
| Glows violet/rose/orange | Supprimer |
| `backdrop-blur` sur hero | Supprimer |
| `dark:` prefixes Tailwind | Supprimer (alternance de fonds gère tout) |

---

## NOTES IMPORTANTES

- **Angles droits partout** — c'est le style graphique signature (affichage, imprimé)
- **Hero et Contact sur fond jaune** — pas seulement comme accent
- **Crème avec DotPattern** — WhyUs et Concept ont le motif décoratif
- **Corps justifié** — `text-align: justify` sur tous les paragraphes
- **`#D94F2D`** uniquement dans DotPattern, jamais dans l'interface
- Garder tous les hooks, logique métier, Framer Motion, `data-lenis-prevent`
- Garder la structure des composants — seuls les classes CSS changent
