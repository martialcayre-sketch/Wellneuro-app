---
id: "LOT-07"
titre: "BP-07 — Dossier de preuve remis à Curation signée"
statut: "en_cours (ouvert le 2026-10-14 ; dossier remis, signatures du responsable attendues au rang 2)"
dépend_de: "LOT-00"
---

# LOT-07 (BP-07) — Dossier de preuve remis à Curation signée

## But

Rassembler, pour le premier parcours (« exploration du besoin 2 »), les
claims du corpus rubrique par rubrique, et les remettre au responsable pour
signature claim par claim. BP-07 fixe le rythme du chemin critique de l'étage
outil : BP-12a l'attend (cadrage v3, §5.3).

## Résultat observable

Un dossier de preuve hors dépôt (document privé du responsable), qui porte
pour chaque rubrique les claims cités par identifiant, leur population et un
verdict proposé ; les conflits déclarés ; les claims douteux relus ; les
brouillons de dose, de durée et de précaution, chacun confronté à son passage
source ; les positions d'expert à rédiger là où rien ne chiffre ; les
exclusions `DC-43` à curer. Au dépôt : cette fiche, en identifiants seulement.

## Périmètre

- Rubriques de la chaîne d'usage (cadrage v3, « Unités ») : indication,
  lecture, options, précautions, suivi, plus les sorties d'adressage.
- Lecture du corpus en production, par conteneur, sans écriture.
- Brouillons extraits par l'IA (`DC-16`) : chaque nombre retrouvé mot pour
  mot dans son passage avant d'être présenté.
- Revue des deux claims douteux nommés par le cadrage.

## Hors périmètre

- Toute écriture en base. Les brouillons retenus entrent « en attente » par
  la voie d'ingestion existante, en un envoi approuvé par le responsable
  APRÈS sa lecture (arbitrage du 2026-10-14), puis se signent dans l'atelier
  du corpus (M-5, rang 2).
- La structure signée des fiches d'usage et le vocabulaire d'hypothèses
  (BP-12a), l'arbitrage persisté des conflits et les positions d'expert
  versionnées (BP-12b).
- Code, migration, drapeau.

## Fichiers probables

- Cette fiche ; `CAMPAGNE.md` ; `.wn/state.json` et sa vue générée.

## Interdits

- Aucun texte de claim, aucune paraphrase clinique, aucun seuil ni aucune
  dose au dépôt (dépôt public, `D-251` §4) : identifiants et mécanismes
  seulement.
- Aucune écriture en production depuis ce lot.
- Pas de secret, pas de donnée patient réelle.

## Dépendances

LOT-00 (BP-00). Lettre a mergée (`D-287`, porte 2).

## Étapes

- [x] Lire les claims du corpus dans le champ de la question, en production (lecture seule).
- [x] Les ranger par rubrique, avec population et verdict proposé.
- [x] Confronter chaque nombre cité à son passage source.
- [x] Extraire les brouillons de dose, durée et précaution absents des claims.
- [x] Déclarer les conflits ; relire les deux claims douteux.
- [x] Lister les positions d'expert et les exclusions `DC-43` à curer.
- [x] Remettre le dossier au responsable.
- [x] Verdicts du responsable posés au dossier (2026-10-14).
- [x] Brouillons retenus déposés « en attente » (envoi approuvé le 2026-10-14).
- [x] Brouillons signés dans l'atelier du corpus (2026-10-14, constaté).
- [x] Sources externes WN-SRC-0508 à 0510 : notices au registre, extraits ciblés ingérés (lot `LOT_016_2026-10-14`) sur approbation de l'envoi (2026-10-14, constaté).
- [ ] Les 17 claims « à relire » et WN-CL-0031-025 tranchés.
- [x] Positions d'expert P1 à P8 rédigées et signées (versionnées en BP-12b) — v0.2 signée le 2026-10-14.

## Tests

Aucun code. Contre-revue P0 du dossier (plan, fiche F02). T1 complet avant la
PR (audit des campagnes).

## Critères de done

Dossier remis ; signatures du responsable posées ; aucun texte clinique au
dépôt.

## Résultats

Forme opaque (`D-251` §4 ; cadrage v3 §6.1) : rubriques, populations,
conditions, adressage et sources externes vivent au dossier privé du
responsable, jamais ici.

- **Dossier remis** le 2026-10-14, hors dépôt. Corpus lu en production par
  conteneur, sans écriture : 267 claims actifs dans le champ de la question,
  tous `VALIDE` ; 92 cités au dossier (66 au premier envoi, 26 après la
  contre-revue), dont 84 à signer ligne à ligne.
- **Identifiants cités** (101, v1.0, sans rubrique, brouillons compris) :
  WN-CL-0003-007, WN-CL-0031-025, WN-CL-0031-052, WN-CL-0032-016,
  WN-CL-0044-002, WN-CL-0044-003, WN-CL-0054-005, WN-CL-0054-018,
  WN-CL-0061-005, WN-CL-0061-006, WN-CL-0061-007, WN-CL-0061-008,
  WN-CL-0061-009, WN-CL-0061-010, WN-CL-0061-011, WN-CL-0061-013,
  WN-CL-0061-015, WN-CL-0061-016, WN-CL-0061-017, WN-CL-0061-018,
  WN-CL-0061-033, WN-CL-0061-034, WN-CL-0061-035, WN-CL-0062-021,
  WN-CL-0062-027, WN-CL-0062-042, WN-CL-0063-007, WN-CL-0063-012,
  WN-CL-0065-011, WN-CL-0077-007, WN-CL-0110-004, WN-CL-0112-012,
  WN-CL-0125-033, WN-CL-0154-051, WN-CL-0166-041, WN-CL-0169-021,
  WN-CL-0189-059, WN-CL-0189-060, WN-CL-0228-013, WN-CL-0229-012,
  WN-CL-0230-012, WN-CL-0235-011, WN-CL-0235-012, WN-CL-0240-005,
  WN-CL-0240-012, WN-CL-0241-001, WN-CL-0241-002, WN-CL-0241-003,
  WN-CL-0241-004, WN-CL-0241-005, WN-CL-0241-006, WN-CL-0241-007,
  WN-CL-0241-008, WN-CL-0241-009, WN-CL-0241-010, WN-CL-0241-011,
  WN-CL-0241-012, WN-CL-0241-013, WN-CL-0241-014, WN-CL-0241-015,
  WN-CL-0241-016, WN-CL-0241-017, WN-CL-0241-018, WN-CL-0241-019,
  WN-CL-0241-020, WN-CL-0241-021, WN-CL-0241-022, WN-CL-0241-023,
  WN-CL-0241-024, WN-CL-0241-025, WN-CL-0241-026, WN-CL-0266-062,
  WN-CL-0266-063, WN-CL-0282-013, WN-CL-0312-012, WN-CL-0312-018,
  WN-CL-0315-011, WN-CL-0315-018, WN-CL-0318-020, WN-CL-0318-021,
  WN-CL-0323-031, WN-CL-0326-009, WN-CL-0329-001, WN-CL-0330-031,
  WN-CL-0333-031, WN-CL-0335-010, WN-CL-0336-023, WN-CL-0340-001,
  WN-CL-0342-010, WN-CL-0350-025, WN-CL-0358-017, WN-CL-0358-022,
  WN-CL-0359-031, WN-CL-0359-039, WN-CL-0359-043, WN-CL-0361-009,
  WN-CL-0361-013, WN-CL-0361-017, WN-CL-0368-016, WN-CL-0374-010,
  WN-CL-0388-018.
- **Brouillons** : neuf, WN-CL-0241-021 à -026 et WN-CL-0061-033 à -035,
  extraits par l'IA des passages WN-CH-0241-003, WN-CH-0061-002 et
  WN-CH-0061-003 ; chaque nombre retrouvé dans le corps du passage
  (métadonnées exclues). Déposés « en attente » le 2026-10-14 sur
  approbation du responsable, par la route d'ingestion existante depuis un
  conteneur (réponse 200, vérification interne 9/9) ; signés par le
  responsable le même jour dans l'atelier du corpus ; constatés `VALIDE` par
  lecture (métadonnées `lot` = BP-07, `brouillon` = B1 à B9).
- **Verdicts du responsable** (2026-10-14) : 70 à signer, 17 à relire,
  1 rejeté, 1 sans verdict.
- **Conflits** : six déclarés au dossier, un de sécurité (C4), tranché par le
  responsable le 2026-10-14. Sa règle reste au dossier privé ; elle demeure
  fermée tant que la position P8 n'est pas signée, et se porte par la
  décision de premier usage prescriptif (BP-17), pas par ce lot.
- **Positions d'expert** : P1 à P8, v0.2 signée par le responsable le
  2026-10-14, au dossier privé (texte, seuils et délais hors dépôt). La v0.1,
  brouillon externe, a été signée comme base de rédaction ; la v0.2 porte ses
  arbitrages. Elles s'appuient sur les claims signés du corpus, dont la
  précaution WN-CL-0508-001 (déposée et signée le 2026-10-14) ; WN-CL-0061-011
  a été remis en attente puis rejeté le même jour par le responsable dans
  l'atelier. Versionnement en BP-12b.
- **Contre-revue P0** (`wn-reviewer`, onze affirmations à réfuter) : neuf
  confirmées, deux réfutées et corrigées au dossier (des claims omis ; une
  précaution déclarée absente alors que le corpus la porte). Vérification des
  nombres rejouée sans filtre : aucun écart. Diff du dépôt : GO.
- **Revue Copilot** (#1432) : la première version de cette fiche rangeait les
  identifiants par rubrique et le handoff exposait une condition ; réécrits en
  forme opaque, historique de la branche réécrit.
- **Registre des sources** : WN-SRC-0241, WN-SRC-0062 et WN-SRC-0358 sont en
  quarantaine (audit du 2026-07-12, relecture scientifique et sécurité
  exigée) alors que leurs claims sont `VALIDE` ; aucune source citée n'a de
  relecture clinique au registre. La signature de BP-07 tient lieu de cette
  relecture pour les claims signés ; le registre n'est pas modifié ici.
- **Sources externes** (arbitrage du 2026-10-14) : trois notices au registre,
  WN-SRC-0508 à 0510 (corpus `SOURCES_EXTERNES`, titre seul). Seuls des
  extraits ciblés, mot pour mot, entrent au corpus : WN-CH-0508-001 à -004,
  WN-CH-0509-001 à -004 et WN-CH-0510-001 à -003, ingérés le 2026-10-14 en un
  lot sur approbation du responsable (réponse 200, test de récupération 11/11),
  constatés actifs en base, empreintes conformes à l'envoi.
  Une quatrième source, WN-SRC-0511 (règlement (UE) n° 432/2012, annexe : fer),
  entre le même jour (passage WN-CH-0511-001, lot `LOT_017_2026-10-14`,
  constaté) ; WN-CL-0359-031 est rejeté par le responsable et un claim fidèle
  au texte, WN-CL-0511-001, est rédigé.
