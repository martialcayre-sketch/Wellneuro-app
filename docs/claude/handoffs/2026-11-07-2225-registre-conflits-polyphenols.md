# Handoff — 2026-11-07 — Registre des conflits : curation du dossier polyphénols et antioxydants (D-461)

## Branche et état Git

Branche `b-registre-conflits-polyphenols`, dans le worktree
`.claude/worktrees/b-fiche-usage-iode-selenium`, rebasée (arbitrage du
responsable) sur `origin/main` `70fd1db4` : le commit relu par Codex
`d5201ef2` devient `8a3c314f`, patch identique. Aucune migration, aucun
`schema.prisma`.

## Objectif

Curer au registre des conflits les huit conflits du dossier polyphénols et
antioxydants (publier ou écarter, D-457 §7, patron de D-452), contrôler les
conditions de retour des conflits déjà écartés, et poser le banc P2-1 de
#1920 (fiche sans analyte ⇒ jamais mesure standard).

## Décisions prises

- D-461 (réservée par `wn-reserver-decision`) : les huit conflits écartés,
  aucun publié (arbitrages du responsable du 2026-11-07). C5 : écart déclaré
  par la position signée P4 ; C7 : routé à F79 ; C8 : attribution de
  `WN-CL-0649-003` à vérifier.
- Listes de claims cités complétées : magnésium C4 (cinq), B9-B12 C2 (un).
- Contre-revue Codex (dépôt privé, `polyphenols-antioxydants/registre-conflits/`) :
  GO, 12/12, un P2 documentaire corrigé (TRAITEMENT-CODEX.md).
- Déclaration du responsable le 2026-11-07 à 22:13:15 UTC : écartés
  `9b3cf379…25ecb05` signés, registre `a0da49fd` inchangé ; recopiée en
  commentaire du registre.

## Fichiers modifiés

- `web/src/lib/clinical/conflitsSourcesV1.ts` et `conflitsSourcesV1.guard.test.ts`
- `web/src/lib/fiches-usage/ficheUsageBesoin2V1.test.ts`
- `docs/decisions/D-461.md`
- `changelog.d/2026-11-07-d461-conflits-polyphenols-ecartes.md`
- `docs/claude/plan-journal/F05/2026-11-07-03-conflits-polyphenols-ecartes.md`
- `docs/claude/plan-journal/F79/2026-11-07-03-conflit-du-marqueur-ecarte-au-registre.md`
- `docs/claude/PLAN_WELLNEURO.md` (§8, ligne des fiches d'usage du besoin 2)
- ce handoff

## Validations exécutées

- Production, par conteneur, en lecture seule (2026-11-07) : textes, versions
  et statuts des 46 claims des huit conflits ; 0 arbitrage de conflit.
- Contrôle exhaustif des retours (64 conflits, structure à 54 fiches) : aucun
  retour rempli.
- Bancs clinique, fiches d'usage, positions d'expert après le rebase : 1721
  verts. Codex : 87 tests et mutations rejoués.
- T1 complet et T3 : voir la PR.

## Problèmes ouverts

- Relecture de `WN-CL-0649-003` contre le passage original de l'Anses
  (retour de C8), avec `WN-CL-0649-005`.
- Question du marqueur de C7 : F79.
- Le contrôle des retours se rejoue à la curation du prochain dossier clos
  (le banc ne prouve pas l'exhaustivité des listes privées).

## Prochaine action exacte

PR « prête @sha » pour l'intégrateur ; après le merge, release-db approuvée
par le responsable, puis constat par conteneur de l'empreinte déployée
(`a0da49fd…502f06f`, inchangée).

## Interdits encore actifs

- Production en lecture seule, par conteneur `scalingo run -d`.
- Aucun texte clinique, libellé ou valeur dans le dépôt public (D-251 §4).
- Pas de pull, merge ou rebase sans arbitrage du responsable.
- Signature d'un contenu clinique : la porte 23 reste humaine.
