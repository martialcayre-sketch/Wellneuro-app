# Handoff — 2026-08-18 — LOT-06 livré, drapeau posé ET porté par un build

- **État** : `main` à `c0b3eb7b`. Cinq PR mergées (#703 → #707), deux releases
  DB approuvées, production relue en MCP après chacune.
- **Décisions** : `D-071` (branchement) et `D-072` (soldes des dettes).

## Ce qui est en production

`deriverStatutsBiologie` a un appelant, servi par
`/api/praticien/biologie/proposition` derrière `WN_CB_PROPOSITION` — **posée le
2026-08-18**. Le catalogue (`D-068`) et les quinze règles signées (`D-069`) ne
sont plus dormants. Zéro table de `public` sans RLS.

## Le piège qui a failli passer inaperçu — à connaître avant tout allumage

**Poser la variable ne suffit pas : il faut un build qui la porte.** Vercel fige
les variables dans le déploiement ; `web/vercel.json` porte
`"ignoreCommand": "git diff --quiet HEAD^ HEAD -- ."`, qui SAUTE la construction
quand le dernier commit ne touche rien sous `web/`.

Le drapeau a été posé juste après le merge de #707 — purement outillage
(`scripts/`, `.claude/`, `changelog.d/`). Les deux déploiements production
suivants, dont un redéploiement manuel, ont été **annulés en trois secondes**
par cette règle (`errorLink` → *ignored-build-step*). La production a continué
de servir le build de #706, **antérieur à la variable** : le drapeau existait
dans le panneau et n'était porté par rien.

C'est la classe de `D-064` et `D-070` sous une forme neuve — un état déduit au
lieu d'être lu. La différence : il était vérifiable, et il a été vérifié.

**Remède appliqué** : `vercel redeploy` du déploiement de #706, dont le commit
touche `web/` — l'`ignoreCommand` y passe. Build `dpl_A8y6TawV`, READY, aliasé
`app.wellneuro.fr`, postérieur à la variable. `.env.local` sauvegardé avant la
manœuvre et vérifié identique après (le piège de `vercel link` reste réel, il
ne s'est simplement pas produit ici).

## Ce que la vérification NE dit pas

`vercel env ls` donne le NOM et la date d'une variable, jamais sa VALEUR —
`vercel env pull` écraserait `.env.local`, écarté. Si la variable vaut autre
chose que la chaîne exacte `true`, le verrou reste fermé, par conception. La
preuve terminale est visuelle : ouvrir un dossier et voir le panneau
« Biologie — proposition de bilan ».

## Restent des LOTS, pas des dettes

Appariement analyte ↔ NABM (0 ligne) et liens biomarqueur ↔ besoin (0 ligne) :
le schéma les exige manuels et signés, claim par claim. Tant qu'ils sont vides,
tous les remboursements sortent `non_evalue` — l'écran l'écrit, et « non
évalué » ne veut pas dire « non remboursé ».

## Ouvert

- Aucun banc E2E ne couvre la navigation d'un dossier à l'autre (`D-072` §4
  repose sur la sémantique de React).
- La matrice de consommation ne modélise pas la frontière HTTP : une source
  consommée uniquement par une route paraîtra plus dormante qu'elle ne l'est.
