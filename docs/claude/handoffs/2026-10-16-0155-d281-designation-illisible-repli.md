# Handoff — 2026-10-16 — D-281 §5 : désignation illisible au dépôt, repli sur le programme diffusé

## Branche et état Git

- Branche `fix/d281-designation-illisible-depot`, depuis `origin/main` 2086fa7b,
  worktree `d281-lot3-portail` (session concurrente, cycle en git/gh direct).
- Un commit de lot ; PR à ouvrir, CI par `wn-attendre-ci`, revue CodeRabbit sur
  la tête, merge, déploiement constaté.

## Objectif

Plan §8, ligne « D-281, désignation illisible au dépôt » ; file A, fiche t22.
Au dépôt d'un signalement d'effet indésirable, une lecture de la désignation
en échec (ou un programme diffusé dont l'intégrité ne se vérifie pas) faisait
enregistrer le signalement sans programme ni rattachement. Il ne recevait
aucun avis, ne bloquait rien, et sortait des compteurs au statut « traité ».

## Décisions prises

- Arbitrage du responsable du 2026-10-16, versé à D-281 §5 (`docs/DECISIONS.md`).
  Le repli : le programme diffusé est relu seul (`resolveProtocoleDiffuse`), et
  le signalement le vise SANS rattachement, comme le formulaire d'avant.
  Résultat : `recoitUnAvis` est vrai, le signalement attend l'avis. Il bloque
  la diffusion après M-1 et il est compté au panneau, au Fil et au prévol dès
  le déploiement. Le choix du patient n'est pas conservé.
- La seconde lecture échoue aussi : capture sans programme, comme avant. Le
  signalement n'est jamais perdu.
- Le même repli couvre `programmeDiffuse` → `null` quand la désignation est
  ouverte (non diffusé ou intégrité invalide). Sans programme diffusé, la
  seconde lecture rend `null` : le comportement ne change pas (§2).
- Écartés : refuser le dépôt ; un indicateur en base (migration).

## Fichiers modifiés

- `web/src/app/api/portail/trust/signalement/route.ts` et
  `route.designation.test.ts`
- `docs/DECISIONS.md` (D-281 §5), `docs/claude/PLAN_WELLNEURO.md` (§8 soldée,
  mise à jour F66), `changelog.d/2026-10-16-d281-designation-illisible-repli.md`

## Validations exécutées

- T1 (`check:rapide`) vert ; T2 (`test:worktree -- --fast`) vert en 5 min 47 s,
  avant le rebase sur #1492 (doc seule) et les tests ajoutés sur la revue.
- Revue `wn-reviewer` : Go, aucun P0/P1. Triggers vérifiés : l'écriture du
  repli et l'avis qui suit passent, dossier jamais enfermé.
- Tests ajoutés sur la revue : intégrité invalide pour les trois réponses,
  double échec, échec sans programme diffusé, chemin lisible sans repli.
  Assertion tautologique retirée. Suites ciblées et T1 complet rejoués avant
  commit.

## Problèmes ouverts

- Revue P2-1, routée au §8 : sur un programme visé illisible, le praticien ne
  peut répondre que « aucun élément en cause ». Faut-il un avis « impliqué,
  élément non identifiable » ? Migration ; à trancher avant M-1.
- Revue P2-2, routée au §8 : la lecture du programme dans le formulaire
  d'avant n'est pas protégée et peut rendre une erreur 500 (signalement non
  enregistré). Défaut antérieur.
- Hors périmètre, inchangé : l'écart de bornes entre le panneau TRUST (100) et
  le Fil et le prévol (sans borne), noté dans le handoff de #1487.

## Prochaine action exacte

Ouvrir la PR, attendre le CI (`node scripts/wn-attendre-ci.mjs <N>` en fond),
lire la revue CodeRabbit sur la tête, merger, constater le déploiement, puis
page de suivi de la file A : t22 → fait.

## Interdits encore actifs

- Aucune migration ni `schema.prisma` dans ce lot.
- Garde de diffusion inerte jusqu'à la signature (M-1, D-281 §6).
- Pas d'auto-merge sur une PR de lot ; un merge à la fois, déploiement constaté.
