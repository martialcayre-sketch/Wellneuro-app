# Design system D1 — Wellneuro NNPP2

Référence des tokens et composants livrés par la série D1
(`docs/claude/ROADMAP_AGENT_PLAN.md`, section 3). Complète
`docs/claude/PROJET_CONTEXTE.md` (qui fait foi sur l'état technique
courant) — ce document se concentre sur le design system lui-même.

Identité visuelle : **deep teal + champagne gold**, premium clinique,
scientifique mais accessible. Deux thèmes fixes selon le rôle (pas de
préférence utilisateur togglable) : sombre pour le praticien, clair
pour le patient. Mobile first.

## 1. Tokens (`web/tailwind.config.ts` + `web/src/app/globals.css`)

### Palette de marque

| Token CSS | Valeur | Usage |
|---|---|---|
| `--teal-950` | `#0b2027` | Fond praticien (sombre) |
| `--teal-900` | `#102e33` | Surface praticien (cartes) |
| `--teal-700` | `#1f5e5b` | Couleur primaire (les deux thèmes) |
| `--teal-500` | `#2f8481` | Nuance teal intermédiaire |
| `--teal-200` | `#a8bfc2` | Texte atténué praticien |
| `--gold-600` | `#b8923e` | Accent patient (clair) |
| `--gold-500` | `#c9a24b` | Accent praticien (sombre) |
| `--gold-300` | `#e3cd8f` | Nuance or claire |
| `--cream-100` | `#fbf9f5` | Fond patient (clair) |
| `--cream-50` | `#f4efe6` | Texte praticien (sombre) |

### Tokens sémantiques (consommés via classes Tailwind)

`background`, `foreground`, `surface`/`surface-foreground`,
`muted`/`muted-foreground`, `border`, `primary`/`primary-foreground`,
`accent`/`accent-foreground` — définis par thème (voir section 2),
utilisables directement : `bg-background`, `text-foreground`,
`bg-surface`, `border-border`, `bg-primary text-primary-foreground`, etc.

**Important — collision évitée avec les tokens historiques** : les
variables CSS `--primary`/`--accent` existaient depuis le Lot 0 et sont
encore consommées en dur (`style={{ color: 'var(--primary)' }}`) par
`SynthesePanel.tsx` (non migré, hors périmètre D1 à ce jour). Les
nouveaux tokens sémantiques utilisent donc un espace de noms distinct
(`--color-primary`, `--color-accent`, etc.) pour ne jamais re-teinter
ces usages historiques par erreur. Ne pas fusionner ces deux espaces de
noms sans avoir migré tous les consommateurs historiques.

### Typographie

- `font-sans` (Inter, `--font-inter`) : texte courant.
- `font-display` (Lora, `--font-display`) : titres.

Chargées dans `web/src/app/layout.tsx` (racine), disponibles partout.

### Radius

`rounded-sm` / `rounded` (`DEFAULT`) / `rounded-lg` → `--radius-sm`
(0.5rem) / `--radius` (0.75rem) / `--radius-lg` (1rem).

## 2. Thèmes

Activés via l'attribut `data-theme` posé sur un conteneur racine — pas
de contexte JS, pas de `next-themes`, pas de toggle (interdit D1) : le
thème est fixe selon le rôle, pas une préférence utilisateur.

| Thème | Sélecteur | Où il est posé |
|---|---|---|
| **Patient** (clair, défaut) | `:root`, `[data-theme="patient"]` | Défaut implicite — `web/src/app/patient/**` n'a pas encore besoin de le poser explicitement |
| **Praticien** (sombre) | `[data-theme="praticien"]` | `web/src/app/dashboard/layout.tsx` (conteneur racine du shell), `web/src/app/login/page.tsx` (les deux états, chargement et principal) |

Contrastes vérifiés (WCAG, ratio de luminance relative) :

| Paire | Thème | Ratio | Seuil AA |
|---|---|---|---|
| `foreground` / `background` | praticien | ~14.6:1 | ✅ (texte normal 4.5:1) |
| `foreground` / `background` | patient | ~12.9:1 | ✅ |
| `muted-foreground` / `background` | praticien | ~8.7:1 | ✅ |
| `accent` (texte) / `surface` | praticien | ~6-7:1 | ✅ |
| `accent` (texte) / `surface` | patient | ~4.65:1 | ✅ (limite) |
| `primary` (texte) / `surface` ou `background` | praticien | ~1.9-2.3:1 | ❌ — **ne jamais utiliser `text-primary` comme texte sur fond sombre** ; `primary` n'est conçu que pour un fond de bouton (`bg-primary` + `text-primary-foreground`) |

## 3. Composants (`web/src/components/ui/`)

### Badge

```tsx
<Badge variant="neutral | success | warning | danger">Texte</Badge>
```

Variantes câblées sur les tokens (`neutral` = `bg-muted text-muted-foreground`,
les autres sur des couleurs Tailwind standard auto-contenues). Utilisé
par `NavBar` (tag « Espace praticien »), `PatientsPanel` (`StatusBadge`,
statut actif).

### MetricCard / MetricCardSkeleton

```tsx
<MetricCard label="Patients" value={12} sub="7 jours" />
<MetricCardSkeleton />
```

Utilisé par `MetricsSection`.

### PatientRow

```tsx
<PatientRow
  patient={{ idPatient, prenom, nom, email, telephone, actif: 'OUI' | 'NON' }}
  onEdit={...} onToggleResultats={...} resultatsOuverts={boolean}
  onDelete={...} confirmationSuppression={boolean}
  onDemanderSuppression={...} onAnnulerSuppression={...}
  suppressionEnCours={boolean}
/>
```

`<tr>` autonome (à utiliser dans un `<table>`), état piloté entièrement
par le parent (`PatientsPanel`) via props/callbacks — pas de logique
interne. Liens d'action en `text-muted-foreground`/`text-accent`
(actif)/`text-red-400` (suppression), calibrés pour rester AA sur fond
sombre (seul contexte d'usage réel à ce jour).

### Composants de score (Recharts, D1-2b)

Librairie retenue le 2026-07-04 : **Recharts** (voir
`ROADMAP_AGENT_PLAN.md`, section 3). Toutes les couleurs sont passées
via les tokens CSS (`fill="var(--color-primary)"`, etc.) — fonctionne
directement dans les attributs SVG, aucune résolution JS nécessaire.

```tsx
<ScoreGauge value={72} max={100} label="Mon équilibre" zoneLabel="Bon niveau" />

<ScoreRadar data={[{ axe: 'Sommeil', value: 72 }, ...]} max={100} />

<ScoreBarChart data={[{ label: 'Sophie Nicola', value: 72 }, ...]} max={100} />

<ScoreSparkline data={[{ value: 40 }, { value: 52 }, ...]} />

<ScoreThreshold value={55} max={100} zoneLabel="Attention" variant="warning" />
```

**Garde-fou d'accessibilité (obligatoire pour tout usage futur)** : un
seuil ou une zone clinique ne doit jamais être signalé par la seule
couleur. `ScoreThreshold` et `ScoreGauge` affichent toujours la valeur
numérique et/ou un libellé de zone en texte à côté de la couleur —
respecter ce principe dans toute nouvelle variante.

Ces 5 composants ne sont pas encore branchés dans une page réelle (pas
de score calculé en production à ce stade — l'indicateur "Mon équilibre"
est prévu en E2 du séquencement produit, cf. `docs/claude/MON_EQUILIBRE_CONTEXTE.md`) :
lot purement additif, vérifié uniquement via une page de démo locale (non
committée) dans les deux thèmes.

## 4. État d'intégration réelle (pages migrées)

| Page / composant | Thème appliqué | Lot |
|---|---|---|
| `web/src/components/NavBar.tsx` | praticien (sombre) | D1-3 |
| `web/src/app/dashboard/layout.tsx` | praticien (sombre) | D1-3 |
| `web/src/app/login/page.tsx` | praticien (sombre) | D1-3 |
| `web/src/app/dashboard/page.tsx` (titre + feuille de route) | praticien (sombre) | D1-3 (élargi après détection d'un défaut de contraste) |
| `web/src/components/MetricsSection.tsx` | praticien (sombre) | D1-4 |
| `web/src/components/PatientsPanel.tsx` | praticien (sombre) | D1-5 |
| `web/src/app/dashboard/patients/page.tsx`, `.../synthese/page.tsx` (titres) | praticien (sombre) | D1-5 (même correctif de contraste que D1-3) |
| `web/src/components/SynthesePanel.tsx` | **non migré** | Aucun lot D1 ne le couvre à ce jour |
| `web/src/app/patient/**` | patient (clair, implicite) | Aucun changement requis (thème par défaut) |

### Shell praticien C0-UX / LOT-02

Le shell praticien réorganisé dans `web/src/components/NavBar.tsx` et
`web/src/app/dashboard/layout.tsx` réutilise uniquement les tokens D1
existants et leurs combinaisons de surface:

- `bg-background` pour le conteneur racine du thème praticien;
- `bg-surface` et `bg-surface/95` pour l'enveloppe du header et les cartes du rail;
- `border-border` pour les séparateurs et contours;
- `bg-primary/10`, `text-primary` et `text-primary-foreground` pour les repères actifs;
- `text-muted-foreground` pour les libellés secondaires;
- `Badge` pour les états, les repères de build et les raccourcis non cliniques.

Le lot actuel reste volontairement sans nouvelle primitive UI: la navigation
desktop/tablette repose sur le header de commande, le rail gauche compact et des
liens `Link` standards, afin de conserver une base simple pour le futur lot mobile.

### Navigation mobile C0-UX / LOT-03

`web/src/components/ui/MobileBottomNav.tsx` (barre basse + bottom sheet « Plus »,
visible uniquement `<768px`) réutilise exclusivement les tokens déjà listés
ci-dessus: `bg-surface/95` et le halo `backdrop-blur` du header pour la barre,
`bg-surface-elevated` pour le panneau de la sheet (même traitement que le
panneau ☰ tablette et le menu profil), `bg-primary`/`text-primary-foreground`
pour l'état actif, `text-muted-foreground` pour l'inactif, et
`focus-visible:ring-focus-ring` sur chaque élément interactif. Aucun nouveau
token n'a été nécessaire. Le panneau ☰ tablette existant (768–1024px) n'a pas
été retouché par ce lot.

## 5. Interdits D1 (rappel)

Pas de theme-provider/contexte JS, pas de `next-themes`, pas de toggle
utilisateur, pas de Storybook, pas d'abstraction Radix massive, pas de
refonte de la logique métier (`PatientsPanel`, routes API, scoring,
auth/session). Voir `ROADMAP_AGENT_PLAN.md` section 3 pour la liste
complète et les garde-fous transverses (accessibilité, definition of
done par lot).

## 6. Réconciliation tokens UX 3.0 (LOT-01, campagne C0-UX)

Comparaison des tokens sémantiques proposés en §11.1 de
`docs/claude/campagnes/2026-07-11-refonte-ux-shell-3-0/sources/UX_WELLNEURO_3_0.md` avec les
tokens réellement livrés par D1. Règle appliquée : réutiliser le nom D1 existant quand un
équivalent fonctionnel existe déjà, ajout **additif** uniquement pour les écarts réels, jamais de
renommage ni de suppression d'un token existant.

| Proposé (§11.1) | Existant D1 | Décision |
|---|---|---|
| `surface-app` | `background` | Conservé tel quel — pas d'ajout. |
| `surface-panel` | `surface` | Conservé tel quel — pas d'ajout. |
| `surface-elevated` | aucun | **Ajouté** : `--color-surface-elevated` / `bg-surface-elevated`. En thème patient, identique au blanc de `surface` (l'élévation y est portée par l'ombre/la bordure, pas la couleur) ; en thème praticien, plus clair que `surface` (`--teal-900`). |
| `surface-patient` | aucun | **Non ajouté** — redondant avec l'architecture par thème (`[data-theme="patient"]` joue déjà ce rôle via `surface`). Un token dédié dupliquerait la logique de thème existante. |
| `text-primary` | `foreground` | Conservé tel quel — pas d'ajout. |
| `text-secondary` | aucun exact | **Non ajouté** dans ce lot, faute de consommateur identifié (D1 n'a qu'un seul niveau de texte atténué, `muted-foreground`). À réévaluer si LOT-02/03 de C0-UX en démontre un besoin réel. |
| `text-muted` | `muted-foreground` | Conservé tel quel — pas d'ajout. |
| `accent-primary` | `color-primary` | Conservé tel quel — pas d'ajout. |
| `accent-secondary` | `color-accent` | Conservé tel quel — pas d'ajout. |
| `status-success` / `-warning` / `-danger` / `-info` | aucun (Badge utilise des couleurs Tailwind auto-contenues) | **Ajoutés** : `--color-status-success/warning/danger/info` / `text-status-*`, `bg-status-*`, calibrés AA par thème. Non câblés dans `Badge.tsx` dans ce lot (hors périmètre LOT-01). |
| `border-subtle` | `border` | Conservé tel quel — pas d'ajout. |
| `focus-ring` | aucun | **Ajouté** : `--color-focus-ring` / `ring-focus`, `text-focus-ring`… (`--teal-700` en thème patient, `--gold-500` en thème praticien) — nécessaire aux garde-fous accessibilité (focus clavier) de C0-UX. |

Garde-fou vérifié : `--primary`/`--accent` historiques (consommés en dur par `SynthesePanel.tsx`,
non migré) ne sont pas affectés par cet ajout — espace de noms `--color-*` toujours distinct.

## 7. Traçabilité

| Lot | PR |
|---|---|
| D1-0 | (docs, sans PR dédiée — commit direct) |
| D1-1 | #4 |
| D1-2a | #5 |
| D1-3 | #6 |
| D1-4 | #7 |
| D1-5 | #8 |
| D1-2b | #9 |
| D1-6 | (ce document) |
