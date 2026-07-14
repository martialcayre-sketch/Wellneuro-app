---
id: "2026-07-12-qx-experience-questionnaires"
titre: "QX — Expérience questionnaires patient"
statut: "en_cours"
créée_le: "2026-07-12"
mise_à_jour: "2026-07-14"
lot_courant: "LOT-04"
branche_campagne: "campaign/qx-experience-questionnaires/integration"
branche_lot_courant: "campaign/qx-experience-questionnaires/lot-04"
cible_pr_lot: "campaign/qx-experience-questionnaires/integration"
cible_pr_campagne: "main"
---

# QX — Expérience questionnaires patient

> Campagne issue de la scission de la PR #31 (registre A2/A3). Sources de
> référence (non dupliquées, à lire en place) :
> `…hybrid-clinical-experience-questionnaires/sources/02_STANDARD_UX_QUESTIONNAIRES_PATIENT.md`
> et `sources/03_GARDE_FOUS_PSYCHOMETRIQUES.md`.

## Objectif

Rendre les questionnaires moins lourds, moins monotones et adaptés aux
formats longs, **sans altérer le texte, le sens, le codage ou la validité des
instruments**. Innovation d'affichage uniquement.

## Décisions actées

- **Pilotes bornés aux familles auditées et alignées** : ALI_01, ALI_03,
  NEU_03, MOD_02 (même règle que le pilote OCR). L'extension à d'autres
  questionnaires est conditionnée à l'avancement du chantier de
  certification (NEU_02/06/08, CAN/CAR/PNE/TAB, GEO_03) — aucun profil de
  rendu appliqué à un instrument dont la fidélité à la source n'est pas
  certifiée.
- Politique psychométrique `strict` **par défaut** en cas d'incertitude ;
  quatre niveaux : `strict`, `layout_only`, `nominal_shuffle_allowed`,
  `internal_flexible`.
- Le scoring s'appuie sur `id`/`v`, jamais sur la position visuelle. Payload
  avant/après refonte strictement identique.
- **Randomisation : spécification uniquement en V1.** Le contrat
  `OptionOrderPolicy` est livré (`fixed` par défaut, `shuffle_nominal`
  versionné, options épinglées), **aucune implémentation de mélange** tant
  qu'un questionnaire interne n'en exprime pas le besoin réel. La matrice de
  la source 03 (aucune exception ordinale/Oui-Non en V1) fait foi.
- CAT / adaptatif réel exclu (nécessiterait une banque d'items calibrée et
  une campagne psychométrique distincte).
- Échelles validées : texte, ordre, ancrages, temporalité, groupement,
  nombre d'items, types de réponse, valeurs, seuils et interprétation
  **fixes** sauf autorisation documentée dans `CHANGELOG.md`.

## Contraintes non négociables

Invariants du registre §1. Aucune modification de `questions.ts` autre que
l'ajout de métadonnées d'affichage (`DisplayPolicy`). Aucune migration : la
politique et l'état de brouillon restent locaux ou dans les structures
existantes.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Inventaire des 63 questionnaires, politiques strictes et cadrage des pilotes | terminé | HC-F LOT-05 terminé |
| LOT-01 | Registre d'affichage et contrats purs, sans branchement UI | terminé | LOT-00 |
| LOT-02 | Profils de rendu sur pilotes : `focus`, `micro_batch`, `guided_sections`, `compact_repeated_scale` ; saisie conditionnelle ; adaptation mobile (jamais de tableau horizontal par défaut) | terminé | LOT-01 + HC-F LOT-04 |
| LOT-03 | Reprise, sauvegarde et résumé : état de brouillon explicite, résumé avant transmission, distinction conservation locale / synchronisation / transmission | terminé | LOT-02 |
| LOT-04 | Validation psychométrique et handoff : payload identique avant/après vérifié par tests, scoring inchangé (assertions), documentation de l'inventaire, critères d'extension aux familles non pilotes | à_faire | LOT-03 |

## Hors périmètre

Implémentation du mélange d'options ; modification de contenu, cotation ou
interprétation ; OCR papier (campagne différée dédiée, mêmes pilotes) ;
formulaire d'anamnèse interne complexe si absent des pilotes.

## Definition of Done

- [ ] Au moins trois profils de rendu en service sur les pilotes autorisés.
- [ ] Payload et scoring identiques avant/après, prouvés par tests.
- [ ] Politique psychométrique documentée pour 100 % du catalogue (même
      provisoire).
- [ ] `OptionOrderPolicy` spécifié, non implémenté, décision tracée.
- [ ] Parcours mobile, clavier et lecteur d'écran documentés sur un pilote.
