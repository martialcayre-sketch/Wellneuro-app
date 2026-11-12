---
id: "LOT-05"
titre: "BP-05 — Contexte de prélèvement typé (absorbe BP-06)"
statut: "en_cours (2026-11-12) — D-497 et déclaration RGPD mergées (#2013) ; migration seule (table `contextes_prelevement`) écrite sur confirmation distincte du responsable, en PR ; code consommateur après constat par conteneur"
dépend_de: "LOT-00, LOT-03"
---

# LOT-05 (BP-05) — Contexte de prélèvement typé

> **Fiche proposée le 2026-11-12**, sur demande explicite du responsable
> (fiche F20). Quatre arbitrages rendus le même jour, consignés par
> [[D-497]]. Dépôt public : cette fiche ne porte aucune donnée de dossier.

## But

Recueillir, pour chaque résultat de biologie, les circonstances de son
prélèvement que DC-46 exige, sous une forme typée où « inconnu » est écrit
et vaut par défaut. Aujourd'hui rien ne les porte : la série par analyte
(BP-03) pose toujours le motif `contexte_non_renseigne`. BP-27 et la part B
de H95 attendent ce contexte.

## Résultat observable

À la saisie d'un bilan et à la validation d'un import, le praticien remplit
une fois le contexte du prélèvement, prérempli à « inconnu ». Sur la série
d'un analyte, chaque point dit son contexte, ou « contexte de prélèvement
non recueilli » s'il est antérieur au lot. Jamais « complet », jamais
« conforme ».

## Socle établi (ne se rediscute pas)

- DC-46 exigible, dette constatée, porteur BP-05 ([[D-266]] §9) ; la
  décision de forme est celle du lot ([[D-497]]).
- Une migration et son code, en deux PR ([[D-266]] §11) ; release-db une à
  la fois ([[D-248]]).
- Aucun texte libre ; « inconnu » toujours explicite (cadrage v1 §4).
- Rien côté patient ([[D-294]] §5). Aucun drapeau neuf (cadrage v3, ligne
  BP-05) : `isCbResultsEnabled`, et `isBioIngestEnabled` pour l'import.

## Ce que le code fait aujourd'hui (lu le 2026-11-12)

- `ResultatBiologique` : `preleveLe`, `saisiLe`, `source`, `unite`,
  chaîne `supersedesResultatId` ; aucune colonne de contexte.
- Import : `ImportBiologique.laboratoireLu` et `commentairesLus`,
  `LigneBiologiqueCandidate.heureLue` et `commentaireLu` — le contexte
  éventuel n'existe qu'en texte de commentaire.
- `biology_preanalytics.type_condition` : vocabulaire fermé, consigne par
  analyte, lu par aucun code applicatif.
- `serieParAnalyte.ts` : `contexte_non_renseigne` poussé toujours ;
  `EstimeMesurePanel.tsx` l'affiche.
- BP-13 ([[D-335]]) : sexe déclaré, statut menstruel, grossesse,
  allaitement au dossier, datés de leur déclaration.

## Arbitrages (rendus par le responsable le 2026-11-12)

| question | réponse |
|---|---|
| `20261112-1030-b` — champs | Huit champs, laboratoire inchangé (huit éléments, dont sept champs stockés : le moment est lu à l'import, `1031-b`) |
| `20261112-1031-b` — moment, cycle, délai | Des faits, pas des catégories |
| `20261112-1032-b` — rattachement (migration) | Par ligne racine, saisi en bloc |
| `20261112-1033-b` — grossesse et cycle face à BP-13 | Champ propre au prélèvement |

Détail des formes, du rattachement et du contrat : [[D-497]] §2 à §6.

## Périmètre — trois PR

1. **Décision** : [[D-497]], cette fiche, `docs/DOSSIER_RGPD.md`
   (rubriques 2 ter, 5, 8), texte patient proposé
   (`docs/claude/propositions/2026-11-12-bp05-texte-patient/`), campagne,
   journal de F20, fragment.
2. **Migration seule**, sur confirmation distincte : la table, son bloc
   `schema.prisma`, le contrat SQL négatif par forme et sa ligne de CI, la
   ligne d'effacement ; `wn-reviewer` (P0), contre-audit Codex manuel ; T3.
   Merge, release-db approuvée, sentinelle liée au run, constat par
   conteneur.
3. **Code**, après le constat : bloc de contexte à la saisie et à la
   validation d'import ; affichage des deux absences ; motifs de la série
   ([[D-497]] §5) ; effacement testé ; version suivante de « Vos données
   personnelles » publiée dans le même déploiement. Release-db de
   déploiement si `web/src/lib/clinical/**` est touché ([[D-044]] §3).

## Hors périmètre

- Quels champs une fiche d'usage exige pour un marqueur : BP-27.
- Toute comparaison à une consigne de `biology_preanalytics`.
- Le contexte dans l'export du dossier (qui ne porte aucun résultat de
  biologie) et dans la synthèse (part B de H95).
- Une liste fermée de laboratoires ; des phases du cycle ; des plages
  horaires.

## Interdits

- Aucune borne, aucun seuil, aucune catégorie sans provenance ; aucun
  verdict de conformité.
- Pas de migration ni de `schema.prisma` sans la confirmation distincte du
  responsable ; jamais `npx prisma format`.
- Aucun seed ni E2E sur un dossier réel ; fixtures Sophie Nicola, Jennifer
  Martin, Michel Dogné seules (`D-125`).

## Critères de done

- Contrat négatif par forme vert en CI ; table née vide, RLS sans
  politique ; ligne d'effacement présente.
- « Inconnu » par défaut à chaque champ ; « non recueilli » distinct
  d'« inconnu » à l'écran.
- Migration constatée par conteneur ; code déployé ; texte patient publié.
- Tolérance de `effacement.ts` à la table absente (arbitrage du 2026-11-12,
  PR 2 #2018) retirée par la PR 3, avec son cas de banc ; ramassage E2E des
  résultats en une seule transaction (contextes, puis résultats).

## Dépendances

- Amont : BP-00 (terminé le 2026-10-04), BP-03 (terminé le 2026-10-17).
- Aval : part B de H95 (rang 6), puis H96 et H97 ; BP-27.
