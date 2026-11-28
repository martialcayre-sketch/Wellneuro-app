# Handoff — 2026-11-28 — Candidats pour la hiérarchie des besoins (lot besoins-recherche-hierarchie, file D)

## 1. Branche et état Git

- Branche `claude/clever-mayer-8j2nkt` (passe cloud `20261128-1409-orch`),
  repartie d'`origin/main` (`1940fdb`).
- Un commit de documentation.

## 2. Objectif

Écrire `docs/claude/besoins/candidats/HIERARCHIE.md`, en deux volets.
(A) La provenance d'un ordre d'intervention entre les quatre classes, et
d'un seuil de déficit de classe. (B) La provenance d'une pondération du
total par strates : parts, atténuation par la base, repère de cabinet.
Pour chaque famille, les candidats résolus ou un « non trouvé » documenté.

## 3. Décisions prises

- Les deux volets sont livrés dans cette passe : la seconde passe prévue
  par la fiche n'est pas nécessaire.
- Recherche menée en session principale, sans agent délégué. Chaque source
  gardée a son PMID résolu et son emplacement lu : résumé, ou section PMC.
- Quatre références méthodologiques hors PubMed sont inscrites comme
  « pistes non lues » (DOI résolu, texte inaccessible depuis le réseau
  cloud), et non comme sources. Parmi elles, la méthode de comptage à double
  seuil, qui est la forme publiée la plus proche d'un « seuil de déficit ».

## 4. Fichiers modifiés

- `docs/claude/besoins/candidats/HIERARCHIE.md` (nouveau)
- `changelog.d/2026-11-28-besoins-recherche-hierarchie.md`, ce handoff

## 5. Validations exécutées

- Les 29 PMID se résolvent (esummary) ; le couple PMID-DOI et l'année
  concordent avec PubMed. 28 DOI se résolvent (doi.org, 302) ; celui de
  PMID 41333604 rend 404, la source est gardée par son PMID et son texte
  PMC.
- Les quatre DOI des pistes non lues se résolvent (302), et leurs
  métadonnées Crossref ont été lues.
- Vérifié à la relecture : aucune valeur chiffrée issue d'une source n'est
  recopiée (ni poids, ni bandes, ni effets) et aucun titre n'est reproduit.
- `npm run check` (T1 complet) : voir la PR (résultat relevé avant le
  commit).

## 6. Problèmes ouverts

- Les quatre pistes non lues (DOI 10.1007/s11205-017-1832-9,
  10.1007/s11205-015-0998-2, 10.1016/j.jpubeco.2010.11.006 et
  10.1080/07474938.2012.690641) se lisent au Mac, ou leurs textes sont versés
  au dossier privé.
- PMID 37516163 est un essai qui compare les deux ordres (sommeil puis
  humeur, et l'inverse). Son résultat n'est pas publié : il reste à
  surveiller.
- Retenir une source, ou constater l'absence de source pour les questions
  `20261127-2047-b`, `-2130-b`, `-2140-b` et `-2150-b`, reste le geste du
  responsable. Ce document ne décide rien.

## 7. Prochaine action exacte

1. CI et PR-Agent de la PR de ce lot à 0, PR hors brouillon, puis
   « prête @<sha> » et ligne `prete` à la boîte `integrateur`.
2. Au merge, passer le lot `besoins-recherche-hierarchie` à `fait`, avec
   son champ `pr`.

## 8. Interdits encore actifs

- Aucune référence de mémoire, aucune valeur chiffrée recopiée, aucun poids,
  seuil ou part proposé, aucune règle. Pas de code, pas d'ingestion, et
  aucune modification du guide ni de D-547.
- Ne pas merger : l'intégrateur merge. Ne pas sortir une PR du brouillon
  après « prête ».
- Aucune adresse de page privée dans le dépôt ; ne jamais supprimer une
  ligne des registres.
