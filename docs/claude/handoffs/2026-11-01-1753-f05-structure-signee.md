# Handoff — 2026-11-01 — F05 (BP-12a) : structure des fiches d'usage du besoin 2, écrite et signée

## Branche et état Git

`f05-structure`, worktree `.claude/worktrees/f05-structure`, poussée ;
contient `origin/main` dcef9059 par deux fusions (arbitrage du responsable :
fusion, jamais rebase ni push forcé ; sans redemander si `git merge-tree`
est propre). Numéro D-401 réservé. Aucune migration, aucun `schema.prisma`.

## Objectif

Écrire la structure des quatre fiches d'usage du besoin 2 (fer, vitamine D,
zinc, magnésium érythrocytaire) et la faire signer par le responsable dans
le lot, avant le merge (porte 23, D-314 §10).

## Décisions prises

- D-401 : trente fiches, une par position d'expert signée ; une question,
  cinq populations, aucune hypothèse ; 277 claims épinglés (relus VALIDE
  v1.0 en production, par conteneur) ; douze arbitrages du responsable
  (LOT-12, arbitrages 29 à 40), tous sur l'option recommandée.
- Axes de D-266 §3 pré-remplis par une règle écrite, présentés sur une
  surface de relecture privée ; aucune case corrigée.
- Signature : déclaration du responsable rendue en session après lecture
  de la surface, consignée sur la surface avant la frappe ; date
  `2026-11-01T16:25:47.000Z` et empreinte `f34eda4d…ba1d4` recopiées
  (D-195 §1-3).
- Contre-revue Codex (douze affirmations à réfuter, sur 0242e1a7) :
  - P1 corrigé : cas négatif `N12` pour `fiches_usage`, prouvé par
    mutation sur Postgres local (exemption de la table → `N12` rouge) ;
  - A12 écarté : la ligne de session est l'attribution de chaque commit,
    pas un lien d'artefact ;
  - A6 écarté : limite préexistante du validateur ; l'empreinte fige les
    rubriques de la structure signée ;
  - A7 et A8 résistent sur pièces (inventaire ; relecture praticien prévue
    verrou éteint) — formulation des affirmations trop large.

## Fichiers modifiés

- `web/src/lib/fiches-usage/ficheUsageBesoin2V1.ts` et son test.
- `web/prisma/checks/rag_claim_fraicheur_tables_signees_v1.sql` et
  `_negatif.sql` (277 paires, `N12`) ;
  `web/src/lib/clinical/claimsEpinglesFraicheur.guard.test.ts`.
- `docs/DECISIONS.md` (D-401) ; `docs/FEATURE_FLAGS.md` (verrou) ;
  `docs/claude/PLAN_WELLNEURO.md` (§8, une dette) ; fiche LOT-12 ;
  `changelog.d/2026-11-01-d401-structure-fiches-usage.md` ;
  `plan-journal/F05/2026-11-01-02-structure-ecrite.md` ; ce handoff.

## Validations exécutées

- T1 complet vert ; vitest des consommateurs du verrou (610 tests) vert.
- Négatif SQL joué sur Postgres local : sain vert, mutant rouge sur `N12`.
- T3 : voir la PR.

## Problèmes ouverts

- Dette routée au plan §8 : `portes_biologiques` et
  `indications_assiettes` sans cas négatif propre.
- Fer P7 et P8, vocabulaire d'hypothèses : à la re-signature suivante
  (B9/B12).
- Textes des fiches : à écrire et valider par acte, dans leur lot.

## Prochaine action exacte

Revue de la PR sur la tête, puis « prête @<sha> ». Après le merge, la
release-db est retenue jusqu'à l'approbation du responsable (D-389 §5,
D-044) : son préflight rejoue le contrat de fraîcheur avec les 277 paires
contre la production ; la suivre jusqu'au constat.

## Interdits encore actifs

- Aucune retouche de la structure signée sans nouvelle signature ; aucun
  texte clinique, valeur ni borne de la main de l'assistant.
- Dépôt public : identifiants et mécanismes seulement, aucun lien
  d'artefact ni identité.
- Ni migration ni `schema.prisma` ; production en lecture seule par
  conteneur.
