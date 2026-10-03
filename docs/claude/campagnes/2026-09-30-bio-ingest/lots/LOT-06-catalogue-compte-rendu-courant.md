---
id: "LOT-06"
titre: "Catalogue étendu aux analyses d'un compte rendu courant"
statut: "à_faire"
dépend_de: "LOT-02"
---

# LOT-06 — Catalogue étendu aux analyses d'un compte rendu courant

## But

Donner un analyte du catalogue aux mesures qu'un compte rendu de laboratoire courant imprime et que le
catalogue ignore, pour qu'elles puissent être validées depuis l'import (demande du responsable,
2026-10-03, après la première extraction de production — compte rendu Biogroup).

## Résultat observable

Sur un compte rendu courant, les lignes de NFS détaillée, d'ionogramme, de créatinine, de bilan hépatique
et de lipides détaillés se rattachent à un analyte et se valident.

## Périmètre

Migration additive de `biology_analytes` (et du vocabulaire d'unités si nécessaire) ; libellés du
resolver, re-signé ; notations équivalentes éventuelles, une paire par arbitrage.

## Hors périmètre

Toute indication, plage ou seuil (D-059 : jamais en colonne de catalogue) ; toute conversion d'unité
(D-157) ; le moteur clinique, qui ne lit pas les résultats (D-122).

## Fichiers probables

- `web/prisma/migrations/` (migration seule, puis `release-db`)
- `web/src/lib/biology-library/import/resolverLibellesV1.ts`

## Interdits

- Pas de secret, pas de donnée patient réelle (fixtures : Sophie Nicola, Jennifer Martin, Michel Dogné).
- Aucune valeur de référence ni qualification d'une valeur.
- Pas de migration sans confirmation explicite (`D-087`) ; `release-db` humain.

## Dépendances

LOT-02

## Étapes

- [x] Cadrage en mode Plan ([[D-261]], 2026-10-03) : 36 analytes, une unité SI chacun ; seule
  « mL/min/1,73 m² » entre au vocabulaire ; quatre notations équivalentes (G/L, T/L, U/L, fl) ; les
  quatre composites restent pour les panels.
- [ ] PR migration seule (`20261003150000_catalogue_biologie_compte_rendu_courant`), `release-db`,
  constat.
- [ ] PR resolver (libellés lus, re-signature).

## Tests

Contrat SQL du vocabulaire d'unités ; banc du resolver ; concordance des unités.

## Critères de done

Migration appliquée et constatée ; le compte rendu de `PAT030` relu : ses lignes courantes se rattachent.

## Résultats

À compléter à la clôture.
