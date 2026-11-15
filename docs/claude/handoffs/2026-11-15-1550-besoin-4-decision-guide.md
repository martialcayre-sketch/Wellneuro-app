# Handoff — 2026-11-15 — besoin 4 : D-526 acceptée, section du guide réécrite (D-312 §3, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin4-decision-guide-reprise`, tirée d'`origin/main` cc8f5b52 (#2146), puis avancée sans commit propre
  par `--ff-only` sur 424f736b (#2156). Aucun fichier en commun avec les merges intervenus pendant le lot.
  Worktree `.claude/worktrees/b-besoin4-decision-guide`, créé pour la reprise.
- Session concurrente (file B) : `git` et `gh` en direct, pas de `/wn-*`.
- L'ancien worktree `file-d1-suite` (branche locale `docs/besoin4-decision-guide`, jamais poussée) n'a pas été modifié :
  son diff indexé, laissé là, a été repris par copie des cinq fichiers.

## Objectif

Lot `besoin4-decision-guide` du carnet (file B, ordre 68). Réécrire la section du besoin 4 du guide sur les
vingt-quatre positions signées, sous forme opaque, par `D-526` ; J3-12f l'appliquera. Documentation seule.

## Décisions prises

- **Reprise** sur désignation du responsable (« reprise file B ») : le lot était `pris` sans nouvelles depuis 09:00 UTC,
  avec un travail indexé jamais commité. Ligne du carnet reprise par `update` avec `if_version` (reprises 1). La session
  « File B » a été sonnée par `SendMessage`.
- **`D-526` acceptée telle quelle par le responsable le 2026-11-15** (« j'accepte d526 tel quelle »). Une première réponse,
  un avis collé qui proposait une formule d'acceptation, n'a pas été prise pour une acceptation. Le statut passe de
  « proposé » à « accepté » dans la décision, le fragment de changelog et le fragment du journal.
- Rang du journal H15 : `03`, parce que `2026-11-15-01` et `-02` (besoin 5) sont déjà sur `main`. Le fragment de
  changelog renvoie à ce rang.
- Plan : la ligne « dossiers des autres besoins » est fusionnée avec celle de `main`, avec le renvoi à `D-526` inséré
  après la contre-revue du besoin 4 ; les deux lignes J3-12f renvoient à `D-526`.
- Numéro `D-526` déjà réservé (`refs/tags/reserve/D-526`) par la session précédente.

## Fichiers modifiés

- `docs/decisions/D-526.md` (nouveau) ;
- `docs/claude/GUIDE_12_BESOINS_NEURONUTRITION.md` : section du besoin 4 ;
- `docs/claude/PLAN_WELLNEURO.md` : la ligne J3-12f du §5, celle du rang 2, et la ligne « dossiers des autres besoins » ;
- `docs/claude/plan-journal/H15/2026-11-15-03-besoin-4-decision-guide.md` (nouveau) ;
- `changelog.d/2026-11-15-besoin-4-decision-guide.md` (nouveau) ; ce handoff.
- Hors dépôt : le carnet (page de la file D).

## Validations exécutées

- `npm run check:rapide` : 16 étapes vertes, 3 sautées (après `npm ci` et `prisma generate` dans le worktree neuf).
- `npm run check` (T1 complet) : vert, anti-secrets compris.
- Pas de T2 : documentation seule.
- Contre-revues de Codex : faites par la session précédente (deux passes sur les positions, une sur `D-526`, sept
  constats corrigés) ; pas de nouvelle passe sans signal.

## Problèmes ouverts

- Application par J3-12f (file A) : bandes transcrites, convention des valeurs frontières, liste des claims de
  provenance seule en constante, banc des biomarqueurs de perméabilité (`D-526` §5).
- Restent au dossier privé : l'usage logiciel de l'instrument d'intéroception, les droits de trois sources, l'absence du
  questionnaire d'hyperexcitabilité dans la convergence, l'écart du registre des instruments sur les bandes du TFD.
- La fiche d'usage « fibres, prébiotiques, probiotiques » peut reprendre à F05.
- L'ancien worktree `file-d1-suite` garde le diff indexé : à nettoyer par le responsable ou par sa session, pas ici.

## Prochaine action exacte

PR de documentation, déclarée « prête @<sha> » à l'intégrateur (commentaire de PR + ligne `prete` au registre) ; la
ligne du carnet reçoit `pr`. Puis lot `pret` suivant de la file B (aucun au carnet à 14:40 UTC).

## Interdits encore actifs

- Aucun code, aucune migration, aucune écriture en base dans ce lot.
- Aucun texte de claim, aucune valeur, aucun rubricage au dépôt (`D-251` §4).
- Ne pas toucher au worktree `file-d1-suite` ni à sa branche.
