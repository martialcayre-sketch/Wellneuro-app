---
id: "2026-08-10-chaine-t0-operationnelle-de-la-donnee-valide-a-la-revision-par-biologie"
titre: "Chaîne T0 opérationnelle — de la donnée valide à la révision par biologie"
statut: "en_cours"
créée_le: "2026-08-10"
mise_à_jour: "2026-08-13"
lot_courant: "LOT-08"
branche_campagne: "campaign/2026-08-10-chaine-t0-operationnelle-de-la-donnee-valide-a-la-revision-par-biologie/integration"
branche_lot_courant: "claude/lot-08-campagne-t0-5bwfzu"
cible_pr_lot: "campaign/2026-08-10-chaine-t0-operationnelle-de-la-donnee-valide-a-la-revision-par-biologie/integration"
cible_pr_campagne: "main"
---

# Chaîne T0 opérationnelle — de la donnée valide à la révision par biologie

## Objectif

Rendre opérationnelle toute la chaîne d'intervention et de suivi issue de T0 :
des données validées (statut par passation) à un T0 conditionné, des candidats
d'intervention déterministes à un protocole structuré pouvant proposer des
compléments **sur claims valides avant le retour de biologie**, puis la boucle
biologie → confirmation/infirmation → **révision de protocole** re-validée, et
les jalons de suivi J21/J42/J90 enfin atteignables. Issu de l'audit golden case
de référence du 2026-08-10 (voir `sources/`).

## Résultat observable

Sur la fixture golden case anonymisée : un praticien confirme un T0 gaté par une
checklist ; le cockpit propose des candidats justifiés par claims (plainte
patient visible en tête) ; le protocole porte une intention de complément
`conditionnelle_biologie` sourcée C4 ; l'arbitrage biologique (sans valeurs)
déclenche une révision qui résout l'intention et repasse par revue + approbation
avant diffusion ; le jalon J21 se confirme depuis l'UI et produit un momentum
par domaine. Les tests de régression « donnée invalidée », « signal non
confirmé » et « discordance stress » sont en CI.

## Contraintes non négociables

- Aucun secret en dur.
- Tous les textes UI en français.
- Aucun patient réel — fixtures limitées à Sophie Nicola, Jennifer Martin et
  Michel Dogné ; aucune identité ni donnée clinique réelle dans le dépôt.
- Aucune migration Prisma/SQL ou écriture Supabase sans confirmation distincte —
  chaque migration voyage dans sa PR, ou code derrière drapeau éteint
  (workflow release-db).
- Aucune supplémentation déclenchée par un score fonctionnel seul (DNST inclus) ;
  intentions de complément uniquement par référence catalogue C4/C5
  (`ruleId`/`ruleVersion`/`ingredientId`/justification), jamais en texte libre.
- La couche déterministe décide ; le LLM formule ; le praticien valide — les
  trois portes existantes (sélection `practitioner`, revue, approbation de
  diffusion caduque) sont intouchables.
- Les vigilances déterministes ne sont pas censurables par une sortie LLM.
- Append-only : correction = nouvelle version, jamais réécriture.
- Toute nouvelle table fille de `patients` entre dans la transaction
  d'effacement IDP2 (`web/src/lib/patient/effacement.ts`).
- Aucune valeur biologique patient en base (verrou HDS maintenu — l'arbitrage
  consigne un verdict, jamais des valeurs).

## Décisions prises

- T0 = point de décision : conditions dures (premier rideau valide + anamnèse +
  synthèse validée), conditions souples contournables avec justification
  tracée ; biologie/agendas/journal explicitement non requis (phase 1 post-T0).
- Compléments proposables avant biologie sur claims valides (règle C4 validée,
  grade de preuve, sécurité catalogue, déclencheur clinique) ; statut
  `conditionnelle_biologie` + `waitFor` ; la biologie confirme ou infirme.
- Arbitrage biologique sans valeurs (verdict + note), révision de protocole en
  nouvelle version, re-validation praticien par caducité d'approbation existante.
- T1/T2 = T0 de cycles suivants (re-ancrage) — déblocage multi-cycle en backlog,
  pas dans cette campagne ; J21/J42/J90 restent les jalons intra-cycle.
- Nouveaux types d'action de protocole : `observation` et `medical_referral`.
- Patrons réutilisés partout : table versionnée + claims + signature + SHA
  (orientation) pour contradictions, stop rules, candidats et biologie.

## Questions ouvertes

- Peuplement du catalogue biologie : liste définitive des analytes niveau 1 et
  des conditions des panels cœliaque/hormonal (validation praticien du contenu
  clinique requise au LOT-06).
- Formulation patient exacte d'une intention « en attente de confirmation par
  votre bilan » (non anxiogène, à valider).
- Seuils des bandes de bruit du momentum par domaine (arbitrage praticien).
- Règles C4 réellement disponibles et validées au moment du LOT-05 (le lot
  s'appuie sur l'atelier règles existant, il n'en crée pas le contenu).
- Borne d'ancienneté de l'exclusion `dejaRepondu` : une passation `VALID` et
  mesurée de 2024 exclut sa cible aujourd'hui. La fenêtre de fraîcheur a été
  écartée au LOT-03 faute de chiffre fondé (`DC-19`, `DC-20`) — arbitrage
  praticien, et non un choix technique. Sans lot d'accueil tant qu'aucun
  chiffre n'est fondé.

## Dépendances

- LOT-00 → LOT-01 → LOT-02 → LOT-04 → LOT-08 → LOT-05 → LOT-06 → LOT-07 (chemin
  critique) ; LOT-03 parallélisable dès LOT-01.
- LOT-08 dépend du LOT-03 et s'intercale **avant** le LOT-05 : les deux
  étendent `verifierRestitutionOrientation`, et le faire deux fois de suite sur
  le même garde coûte une reprise. Parallélisable avec le LOT-04.
- LOT-00 et LOT-06 portent une migration : PR séparée, confirmation obligatoire,
  release-db avant activation du code dépendant (ou drapeau éteint).
- Le contenu clinique (claims, règles C4, catalogue biologie) relève de
  l'atelier corpus/règles — les lots branchent, ils ne créent pas de savoir
  clinique.

## Artefacts de préparation

- BRIEF_COMPILED.md : synthèse structurée des sources.
- CAMPAIGN_DRAFT.md : canevas de préparation.
- sources/01-conclusions-audit.md : conclusions d'architecture de l'audit.
- sources/02-spec-lots-parcours-t0.md : spécification détaillée des chantiers
  (périmètres, critères d'acceptation) — référence de chaque lot.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Validité des données cliniques — statut par passation, filtre unifié (migration) | terminé | — |
| LOT-01 | Garde-fous de synthèse et moteur de contradictions — prompt v20, schéma strict, C-STR seule (D-042), contrat de fraîcheur des claims, marquage de la passation courante | terminé (vigilances de synthèse renvoyées, 2026-08-12) | LOT-00 |
| LOT-02 | Préconditions de confirmation T0 — checklist dure/souple, justification tracée | terminé | LOT-00 |
| LOT-03 | Règles d'arrêt et extinction d'orientation — stop rules, `dejaRepondu` excluant, SCOFF | terminé (étapes 1-3, 2026-08-12 ; SCOFF différé) | LOT-01 |
| LOT-04 | Candidats d'intervention déterministes — chaîne C1 rebranchée, canal plainte patient, recalcul serveur | terminé (2026-08-13, table non signée) | LOT-02 |
| LOT-05 | Protocole structuré — phases, statuts d'intervention, compléments sur claims avant biologie | à_faire | LOT-04 |
| LOT-06 | Biologie opérante — catalogue niveau 1, moteur de statuts, courrier médecin, arbitrage sans valeurs, révision de protocole (migration) | à_faire | LOT-05 |
| LOT-07 | Suivi longitudinal — UI jalons J21/J42/J90, re-passation ciblée, momentum par domaine | à_faire | LOT-05 |
| LOT-08 | Extinction opérante — comptes de recueil `group_majority`, contradiction bloquante (D-053 §5), garde de restitution ; **à exécuter avant le LOT-05** | terminé | LOT-03 |

## Backlog ultérieur (hors campagne, nommé pour ne pas se perdre)

- Multi-cycle : T1/T2 comme T0 de cycles suivants (levée du verrou d'unicité).
- Hypothèses cliniques persistées (`ClinicalHypothesis`) et evidence graph.
- Information gain et charge patient chiffrée au catalogue.
- Saisie et stockage des valeurs biologiques (décision HDS préalable).
- Extension journal alimentaire : faim/satiété, digestion, quantités visuelles,
  clôture patient.
- Agenda sommeil : jours contraints/libres déclarés, midpoint restitué, social
  jet lag.
- Régénération des synthèses historiques contenant des données invalidées.
- **Correction et ré-ouverture d'un T0** — le T0 reste irrévocable (identifiant
  déterministe + `upsert update:{}`) : un T0 confirmé par contournement le
  reste. Lot propre, classe Prisma/Auth, hors de cette campagne — la campagne
  ouvre la porte T0, elle ne la rouvre pas.

## Done de campagne

- [ ] Tous les lots requis sont terminés.
- [ ] Le scénario bout-en-bout du « Résultat observable » passe sur la fixture.
- [ ] Les tests de régression 56/57/58 (invalidation, mélatonine, stress) sont
      en CI et verts.
- [ ] Les migrations sont passées par release-db avec approbation.
- [ ] La documentation canonique est à jour (PROJET_CONTEXTE, changelog.d).
- [ ] Le handoff final est produit.
