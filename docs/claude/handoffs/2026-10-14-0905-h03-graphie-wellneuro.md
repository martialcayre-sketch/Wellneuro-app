# Handoff — 2026-10-14 — H03 : « Wellneuro » au menu du cockpit (R:Graphie)

## Branche et état Git

`feat/h03-graphie-wellneuro`, copie principale, partie de `origin/main`
`4b922a22` (#1424, S-4 déployée et constatée). Code UI seul : une ligne.
Aucune migration, aucun drapeau, aucune décision. PR ouverte avec ce
handoff ; se merge après #1425 (D-286), un merge à la fois.

## Objectif

Fiche H03 du plan unique (rang 0, file A) : le nom du cockpit s'écrit
« Wellneuro » au menu (arbitrage du responsable, 2026-10-12 ; seul le menu
change, le patient ne voit rien changer).

## Décisions prises

- Une seule ligne : le libellé du rail (`SidebarRail.tsx`). « Horizon 5.0 »
  en dessous n'est pas dans H03 ; les commentaires qui citent la maquette
  « WellNeuro 5.0 — La Spirale » sont le titre d'une pièce, laissés.
- Le plan fait fiche (séance du 2026-10-14) : pas de fiche de campagne,
  état du cycle inchangé.

## Fichiers modifiés

- `web/src/components/ui/SidebarRail.tsx` (une ligne).
- Neufs : `changelog.d/2026-10-14-h03-graphie-wellneuro.md`, ce handoff ;
  `docs/claude/SESSION_LOG.md` (une entrée en fin).

## Validations exécutées

- Banc du rail (`SidebarRail`) vert ; aucun banc ni E2E n'épinglait
  « WellNeuro » comme texte.
- T1 complet (`npm run check`) : voir la PR (sortie relue dans un fichier).
- T2 (`npm run test:worktree -- --fast`) : voir la PR ; sur macOS, aucune
  comparaison au pixel (baselines Linux seulement).
- Anti-secrets : dans T1.

## Problèmes ouverts

- Comparaison au pixel du CI (`visual.spec.ts`, tolérance 100 pixels) : les
  bases de la fiche capturent le rail avec le nom ; si elle rougit,
  régénérer par le workflow manuel `visual-baselines` et committer les bases
  dans ce lot.

## Prochaine action exacte

`node scripts/wn-attendre-ci.mjs <N>` ; commentaires en ligne lus ; merge
après #1425 et son déploiement constaté ; déploiement constaté ; puis le
geste « synthèse validée sans protocole » (règle de clôture de la minute
d'après, banc du module réécrit), puis S-3 (a, b, g).

## Interdits encore actifs

- Aucune autre retouche du rail (le retrait d'« Héritage 4.0 » est J1-base,
  H43, frontière commune des instantanés).
- Jamais d'auto-merge ; un merge à la fois ; déploiement constaté.
- Aucune identité réelle ; fixtures seules.
