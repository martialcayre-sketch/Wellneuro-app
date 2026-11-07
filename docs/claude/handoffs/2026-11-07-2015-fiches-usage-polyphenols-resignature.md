# Handoff — 2026-11-07 — Fiches d'usage : re-signature polyphénols et antioxydants (D-457)

## Branche et état Git

Branche `b-fiche-usage-polyphenols-antioxydants`, dans le worktree
`.claude/worktrees/b-fiche-usage-iode-selenium`, rebasée (arbitrage du
responsable) sur `origin/main` `c0ee6856`. Aucune migration, aucun
`schema.prisma`.

## Objectif

Re-signer la structure des fiches d'usage du besoin 2 pour le dossier
polyphénols et antioxydants clos (une fiche par position signée, au modèle de
D-446), et le registre des conflits que cet ajout touche.

## Décisions prises

- D-457 : cinquante-quatre fiches (`FU_POLY_AOX_P1` à `P8`), 599 claims
  épinglés ; sept fiches sans analyte, en exploration fonctionnelle (règle
  nouvelle, D-457 §3) ; une fiche en usage non étayé, statut non validé.
- Trois arbitrages du responsable du 2026-11-07, sur l'option recommandée
  (D-457 §4).
- Contre-revue Codex de la surface (dépôt privé) : NO-GO sur l'empreinte
  provisoire, 1 P1 et 2 P2, tous corrigés avant la déclaration.
- Déclaration du responsable le 2026-11-07 à 20:05:11 UTC, recopiée :
  structure `58adcff6…`, registre `a0da49fd…`.
- Registre des conflits : une liste curée reçoit une fiche (D-452 §2) ;
  aucun texte, aucun déclenchement ne change.

## Fichiers modifiés

- `web/src/lib/fiches-usage/ficheUsageBesoin2V1.ts` et son banc
- `web/src/lib/clinical/conflitsSourcesV1.ts`
- `web/prisma/checks/rag_claim_fraicheur_tables_signees_v1.sql` et
  `…_negatif.sql` (132 paires)
- `docs/decisions/D-457.md`
- `changelog.d/2026-11-07-d457-resignature-polyphenols-antioxydants.md`
- `docs/claude/plan-journal/F05/2026-11-07-01-resignature-polyphenols-antioxydants.md`
- `docs/claude/PLAN_WELLNEURO.md` (§8, ligne des fiches d'usage du besoin 2)
- `docs/FEATURE_FLAGS.md` (verrous de signature)
- ce handoff

## Validations exécutées

- Production, par conteneur, en lecture seule (2026-11-07) : les 134 claims
  du dossier `VALIDE`, actifs, non remplacés, adossés, compartiment actif,
  v1.0, au besoin 2 ; 0 arbitrage de conflit, 0 version de texte, 0 libellé
  de fiche.
- Bancs fiches d'usage, clinique, positions d'expert, bio-parcours : 1815
  verts après la recopie.
- T1 complet et T3 : voir la PR.

## Problèmes ouverts

- Curation des conflits du dossier au registre (publier ou écarter, D-439
  §4) et contrôle exhaustif des retours des conflits écartés : lot suivant.
- Analyte vitamine E au catalogue : décision propre, décidée.
- Relecture des claims du dossier encore en attente : lot dédié.

## Prochaine action exacte

PR « prête @sha » pour l'intégrateur ; après le merge, release-db approuvée
par le responsable, puis constat par conteneur des deux empreintes
déployées.

## Interdits encore actifs

- Production en lecture seule, par conteneur `scalingo run -d`.
- Aucun texte clinique, libellé ou valeur dans le dépôt public (D-251 §4).
- Pas de pull, merge ou rebase sans arbitrage du responsable.
- Signature d'un contenu clinique : la porte 23 reste humaine.
