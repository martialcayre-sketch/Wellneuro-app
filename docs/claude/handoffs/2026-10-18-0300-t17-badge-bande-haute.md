# Handoff — 2026-10-18 — t17 : badge de la bande de gravité la plus haute

## Branche et état Git

- Branche `t17-badge-bande-haute`, depuis `origin/main` 586db8fc, worktree
  `d281-lot3-portail` (session concurrente, cycle en git/gh direct ; file A
  en autonomie, délégation du 2026-10-18).
- Aucune migration, `schema.prisma` inchangé.

## Objectif

Plan §8, dette t17 (ticket #1368) : la bande `dark` d'un sous-score, la plus
haute de l'échelle (`miniSynthese.ts`), s'affichait en gris neutre, moins
marquée que `danger`.

## Décisions prises

- Aucune décision neuve : présentation seule.
- Nouvelle variante `critical` du badge, fond plein `bg-status-danger` et
  texte blanc (6,5:1).
- Les deux copies de la correspondance (fiche, « Mode de vie ») deviennent
  une seule, `varianteInterpretation`, dans `components/ui/Badge.tsx`.
  `info` reste neutre, hors du périmètre du ticket.

## Fichiers modifiés

- `web/src/components/ui/Badge.tsx` (+ `Badge.test.tsx`, neuf) ;
  `web/src/components/FichePatientPanel.tsx` ;
  `web/src/components/patient-cockpit/ModeDeViePanel.tsx`.
- `docs/claude/PLAN_WELLNEURO.md` (§8 soldé) ;
  `changelog.d/2026-10-18-t17-badge-bande-haute.md`.

## Validations exécutées

- tsc vert ; bancs de la fiche, de « Mode de vie » et du badge verts.
- T1 complet vert ; T2 (`--fast`) vert : Vitest 13 445 verts et 4 sautés, E2E 276 verts et 6 sautés.

## Problèmes ouverts

- Aucun.

## Prochaine action exacte

PR, CI, revue CodeRabbit sur le sha de tête, merge. Page de la file A : t17
passe à fait.

## Interdits encore actifs

- Aucune migration ni `schema.prisma` sans accord du responsable.
- Aucune règle clinique ni seuil touchés.
