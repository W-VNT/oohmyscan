# CLAUDE.md — OOH MY AD ! Landing Page
## Refonte identité graphique — Piste 1 "Déclencheur d'émotions"
# Intégration landing page

---

## CONTEXTE

Tu travailles sur la landing page marketing de **OOH MY AD !**, une régie publicitaire
spécialisée dans la communication de proximité captive ("le média du dernier mètre").

La landing page existante utilise une charte dark/jaune (#F5C400). Elle doit être
**entièrement refontue** pour appliquer la nouvelle identité graphique validée par
la graphiste (Piste 1 — "Déclencheur d'émotions").

Stack : React + Vite + TypeScript + TailwindCSS + Framer Motion

---

## NOUVELLE IDENTITÉ GRAPHIQUE — TOKENS EXACTS

### Couleurs

```css
:root {
  /* Fond principal */
  --bg-primary: #0A0A0A;        /* Noir profond */
  --bg-secondary: #111111;      /* Noir secondaire pour les cartes */

  /* Accent UNIQUE — jaune citron vif */
  --accent: #F3F441;            /* Jaune citron Justine Babut — couleur signature */
  --accent-hover: #EAEB2E;      /* Version légèrement plus sombre au hover */

  /* Texte */
  --text-primary: #FFFFFF;      /* Blanc pur pour les titres */
  --text-secondary: rgba(255, 255, 255, 0.55); /* Corps de texte */
  --text-muted: rgba(255, 255, 255, 0.30);     /* Labels, captions */

  /* Grain & texture */
  --grain-opacity: 0.04;        /* Superposition grain sur les fonds */

  /* Glows chromatiques (backgrounds décoratifs) */
  --glow-pink: rgba(220, 60, 120, 0.25);
  --glow-violet: rgba(100, 40, 180, 0.20);
  --glow-orange: rgba(220, 120, 40, 0.18);
}
```

**RÈGLE ABSOLUE :** Le jaune `#F3F441` est la **seule** couleur d'accent.
Supprimer tout usage de l'ancien jaune `#F5C400`, du rouge `#D92B2B`,
du terracotta ou de toute autre couleur d'accent de l'ancienne charte.

---

### Typographie

```
Police display / titres : "Unbounded" (Google Fonts)
  — font-weight: 700 ou 900
  — text-transform: uppercase
  — letter-spacing: -0.02em à 0.02em selon taille
  — C'est une police arrondie, géométrique, ultra-bold
  — Installer via : @import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@700;900&display=swap')

Police corps : "DM Sans" (Google Fonts)  
  — font-weight: 400 ou 500
  — Pour les paragraphes, labels, UI
  — Installer via : @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&display=swap')
```

**Hiérarchie typographique :**
```
Hero title    : Unbounded 900, 72-96px, uppercase, tracking -0.02em, couleur #F3F441
H2 sections   : Unbounded 700, 48-64px, uppercase, tracking -0.01em, couleur #FFFFFF
H3 / labels   : Unbounded 700, 20-24px, uppercase, tracking 0.05em, couleur #F3F441
Body          : DM Sans 400, 16-18px, line-height 1.65, couleur rgba(255,255,255,0.55)
Caption/label : DM Sans 500, 11-12px, uppercase, tracking 0.25em, couleur rgba(255,255,255,0.30)
KPI value     : Unbounded 900, 48-72px, couleur #FFFFFF
KPI label     : DM Sans 500, 12px, uppercase, tracking 0.2em, couleur #F3F441
```

---

### Éléments graphiques signature

#### 1. Trait courbe jaune (SVG décoratif)
Présent en haut à gauche de certaines sections. C'est une courbe SVG
en `stroke` jaune `#F3F441`, `stroke-width` 2-3px, `fill: none`.
Forme : une boucle/nœud fluide, style ribbon. Exemple de path approximatif :
```svg
<svg viewBox="0 0 300 300" class="absolute top-0 left-0 w-64 h-64 pointer-events-none">
  <path
    d="M 20 280 C 20 150, 180 200, 160 100 C 140 20, 40 40, 80 120 C 110 180, 220 160, 200 80"
    stroke="#F3F441"
    stroke-width="2.5"
    fill="none"
    stroke-linecap="round"
  />
</svg>
```
À placer en `position: absolute`, `pointer-events: none`, `opacity: 0.9`.

#### 2. Effet grain / noise
Superposer une texture grain SVG sur les sections hero et les fonds sombres :
```css
.grain::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
  opacity: 0.04;
  pointer-events: none;
  z-index: 1;
}
```

#### 3. Glows chromatiques (fonds de sections)
Des blobs colorés flous en `position: absolute` dans les sections hero :
```tsx
// Blob violet haut-droite
<div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px] opacity-25"
     style={{ background: 'radial-gradient(circle, #6428B4, transparent)' }} />

// Blob rose centre-gauche  
<div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full blur-[100px] opacity-20"
     style={{ background: 'radial-gradient(circle, #DC3C78, transparent)' }} />

// Blob orange bas-gauche
<div className="absolute bottom-0 left-0 w-72 h-72 rounded-full blur-[90px] opacity-18"
     style={{ background: 'radial-gradient(circle, #DC7828, transparent)' }} />
```

#### 4. Bandeau tagline noir
Pour la tagline "LE MÉDIA DU DERNIER MÈTRE" :
```tsx
<div className="inline-block bg-black px-6 py-2 mt-4">
  <span className="font-['DM_Sans'] font-medium text-xs tracking-[0.3em] uppercase text-white">
    Le média du dernier mètre
  </span>
</div>
```

---

## SECTIONS DE LA LANDING PAGE

### Structure générale (ordre des sections)
1. Navbar
2. Hero
3. TrustSection (logos clients)
4. ConceptSection (tableau comparatif)
5. FamillesSection (5 familles de supports)
6. DigitalSection
7. ProcessSection
8. WhyUsSection (KPIs)
9. ContactSection
10. Footer

---

### Navbar
- Fond : `#0A0A0A` avec `backdrop-blur` quand scrollé
- Logo : "OOH MY AD !" en Unbounded 700, couleur `#F3F441`
- Links : DM Sans 500, couleur `rgba(255,255,255,0.55)`, hover `#F3F441`
- CTA button : fond `#F3F441`, texte `#0A0A0A`, Unbounded 700, `font-size: 13px`
- Border bottom quand scrollé : `1px solid rgba(255,255,255,0.06)`

---

### Hero Section
Référence visuelle : page 3 du PDF (femme avec baguette, "OOH MY AD !" en très grand)

```
Layout :
- Fond : #0A0A0A + grain + 3 blobs chromatiques (violet, rose, orange)
- Trait courbe SVG jaune en haut-à-gauche (décoratif)
- Titre "OOH MY AD !" : Unbounded 900, 80-96px, #F3F441, uppercase
- Sous-titre court : DM Sans 400, 18px, rgba(255,255,255,0.55)
- Bandeau tagline noir : "LE MÉDIA DU DERNIER MÈTRE"
- Photo hero : intégrée avec mix-blend-mode ou opacity réduite en background
- CTA principal : fond #F3F441, texte #0A0A0A, Unbounded 700
- CTA secondaire : border 1px solid rgba(255,255,255,0.2), texte blanc
```

---

### KPIs / Stats (WhyUsSection)
Référence visuelle : page 4 du PDF (+15M clients/jour, +36K communes, +1.8M commerces)

```
- Fond : #0A0A0A + grain léger
- Titre : Unbounded 700, uppercase, #FFFFFF, très grand
- 3 cards KPI :
    Valeur : Unbounded 900, 64px, #FFFFFF (ex: "+15M")
    Label  : DM Sans 500, 12px, uppercase, tracking 0.2em, #F3F441
- Pas de bordures de carte — juste du spacing et le texte
- CountUp animation au scroll (react-countup)
```

---

### Section Familles de supports
```
- Grille 2×2 pour les 4 familles physiques
- Cards avec fond légèrement plus clair (#111111)
- Titre famille : Unbounded 700, #F3F441, uppercase
- Description : DM Sans 400, rgba(255,255,255,0.55)
- Image au hover : scale légère + glow jaune subtil
- Section Digital en bas : fond encore plus sombre avec accent vert ou conserver #F3F441
```

---

### Boutons — design système

```tsx
// Bouton primaire
<button className="
  bg-[#F3F441] text-[#0A0A0A]
  font-['Unbounded'] font-bold text-[13px] uppercase tracking-[0.06em]
  px-7 py-3.5 rounded-none  /* PAS de border-radius — angles droits */
  transition-all duration-200
  hover:bg-[#EAEB2E] hover:shadow-[0_0_32px_rgba(243,244,65,0.25)]
">
  Lancer une campagne
</button>

// Bouton secondaire
<button className="
  border border-[rgba(255,255,255,0.2)] text-white
  font-['DM_Sans'] font-medium text-[14px]
  px-7 py-3.5 rounded-none
  transition-all duration-200
  hover:border-[#F3F441] hover:text-[#F3F441]
">
  En savoir plus
</button>
```

**RÈGLE :** Les boutons principaux ont **0 border-radius** — angles droits.
C'est cohérent avec l'esprit imprimé/affichage de la marque.

---

### Animations (Framer Motion)

```tsx
// Entrée standard pour les sections
const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }
  }
}

// Stagger pour les grilles de cards
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 }
  }
}

// Hero title — entrée dramatique
const heroTitle = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] }
  }
}
```

---

### Suppression de l'ancienne charte

Lors de la refonte, **supprimer / remplacer** systématiquement :
- Toute référence à `#F5C400` (ancien jaune) → remplacer par `#F3F441`
- Toute référence à `#D92B2B` (rouge) → supprimer ou remplacer par `#F3F441` si accentuation
- `font-['Bebas_Neue']` → remplacer par `font-['Unbounded']`
- `bg-[#FAFAFA]` ou `bg-[#F5F0E8]` → supprimer (tout reste sombre)
- `dark:` prefixes Tailwind → inutiles, tout est dark-only désormais
- Borders colorées existantes → remplacer par `border-[rgba(255,255,255,0.06)]`

---

### CSS global à ajouter dans index.css

```css
/* Import fonts */
@import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@700;900&family=DM+Sans:wght@400;500&display=swap');

/* Unbounded disponible partout */
.font-display {
  font-family: 'Unbounded', sans-serif;
}

/* Sélection texte en jaune */
::selection {
  background: #F3F441;
  color: #0A0A0A;
}

/* Scrollbar dark */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #0A0A0A; }
::-webkit-scrollbar-thumb { background: rgba(243, 244, 65, 0.3); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #F3F441; }

/* Focus ring en jaune */
:focus-visible {
  outline: 2px solid #F3F441;
  outline-offset: 2px;
}
```

---

## ORDRE D'EXÉCUTION RECOMMANDÉ

1. `index.css` — ajouter les fonts Unbounded + DM Sans, supprimer Bebas Neue
2. Mettre à jour les variables CSS globales (couleurs)
3. `Navbar.tsx` — appliquer nouvelle typo et couleur accent
4. `HeroSection.tsx` — refonte complète avec glows, grain, trait SVG, nouvelle typo
5. `WhyUsSection.tsx` — KPIs style PDF page 4
6. `TrustSection.tsx` — adapter couleurs
7. `ConceptSection.tsx` — adapter couleurs
8. `FamillesSection.tsx` + modals — adapter couleurs et typo
9. `ProcessSection.tsx` — adapter
10. `ContactSection.tsx` — adapter, CTA jaune angles droits
11. `Footer.tsx` — adapter

---

## RÉFÉRENCES VISUELLES CLÉS DU PDF

- **Page 3** : Le traitement du nom "OOH MY AD !" en très grand jaune sur photo
  → Inspiration pour le Hero
- **Page 4** : KPIs +15M / +36K / +1.8M sur fond noir avec glow orange/marron
  → Inspiration pour WhyUsSection
- **Toutes les pages de transition** : Fond grain + glows chromatiques + trait courbe jaune
  → Décors des sections de séparation

---

## NOTES IMPORTANTES

- Le site est **dark-only** — pas de mode clair, pas de toggle
- La couleur jaune `#F3F441` est **chaude et légèrement saturée** — pas du jaune pur `#FFFF00`
- Le grain ne doit pas être lourd — subtil (opacity 0.03-0.05)
- Les glows doivent rester discrets — ils créent de l'atmosphère, pas un effet disco
- Les angles droits sur les boutons sont **intentionnels** — ne pas ajouter de border-radius
- Garder `data-lenis-prevent` sur les modals/drawers existants
- Garder tous les hooks et logiques métier existants (useContactForm, useScrollLock, etc.)
  — seul le visuel change, pas la logique
