---
id: "2026-08-03-cloture-certification-questionnaires-integration"
titre: "Clôture certification questionnaires et intégration WellNeuro"
statut: "terminée"
créée_le: "2026-08-03"
mise_à_jour: "2026-08-03"
lot_courant: "aucun"
---

# Clôture certification questionnaires et intégration WellNeuro

> Campagne de cadrage exécutable issue du besoin utilisateur du 2026-08-03.
> Elle vise à transformer le palier `62/64` en trajectoire bornée jusqu'à un
> état `64/64 clôturé`, puis à intégrer ce résultat dans WellNeuro sans ouvrir
> implicitement des usages cliniques non autorisés.

## Objectif

Finir le chantier de certification des questionnaires en réglant les deux cas
restants (`Q_PED_03`, `Q_GEO_04`), puis faire consommer cet état par le produit
WellNeuro selon une logique stricte : certifié, suspendu ou verrouillé doivent
produire des comportements runtime distincts et cohérents.

## Résultat observable attendu

- Une table `64/64` stabilisée, avec divergences nommées et hiérarchisées entre
  registre, matrice et runtime.
- `Q_PED_03` et `Q_GEO_04` sortis de l'entre-deux documentaire de cette
  campagne.
- Les surfaces WellNeuro pertinentes refusent, masquent ou bornent les instruments non admissibles.
- Les mécanismes aval n'utilisent que les questionnaires explicitement autorisés.

## Contraintes non négociables

- Aucun secret en dur.
- Aucune donnée patient réelle.
- Aucune migration Prisma/SQL ni écriture Supabase sans confirmation distincte.
- Aucun changement de scoring, seuil, interprétation ou logique clinique sans arbitrage explicite et trace documentaire.
- Changements minimaux, un lot = une finalité.
- Politique fail-closed pour toute intégration aval.

## Décisions actées au départ

| # | Décision | Motif |
| --- | --- | --- |
| CQI-1 | La cible est `64/64 clôturé`, pas `64/64 activé` | Éviter de confondre certification documentaire et ouverture clinique |
| CQI-2 | Les deux dossiers actifs de clôture de cette campagne sont `Q_PED_03` et `Q_GEO_04` | `Q_FIB_03` et `Q_SOM_09` restent hors de ce duo actif malgré leur statut distinct au registre |
| CQI-3 | L'intégration runtime ne commence qu'après gel de la table des statuts | Éviter les divergences entre documentation et produit |
| CQI-4 | Les usages aval progressent par couches : filtre déterministe, puis exposition UI/IA | Réduire le risque de suggestion ou d'activation implicite |
| CQI-5 | Un instrument suspendu ou verrouillé reste non assignable tant qu'une décision contraire n'est pas explicitement tracée | Préserver la sécurité clinique et documentaire |

## Questions ouvertes

- `Q_GEO_04` doit-il être réaligné pour réouverture ou maintenu explicitement hors usage ?
- `Q_PED_03` doit-il rester suspendu faute de besoin production, ou être reconstruit en scoring dimensionnel complet ?
- L'intégration Mon Équilibre doit-elle se limiter au filtrage des sources certifiées, ou inclure une évolution de couverture/version ?
- L'intégration orientation et synthèse va-t-elle jusqu'au branchement UI, ou s'arrête-t-elle au socle déterministe dans cette campagne ?

## Dépendances

- `docs/claude/corpus/instrument_registry.json`
- `docs/questionnaires-drive-mapping.md`
- `docs/gouvernance-questionnaires-scoring.md`
- `web/src/lib/questions.ts`
- `docs/claude/propositions/2026-07-25-certification-corpus-questionnaires/README.md`

## Hors périmètre

- Refonte globale du catalogue questionnaires.
- Nouveau chantier clinique hors `Q_PED_03` et `Q_GEO_04`.
- Activation implicite d'orientation IA ou de suggestions patient sans garde signé.
- Migration de schéma ou réorganisation large non demandée.

## Lots

| Lot | Objet | Statut | Dépend de |
| --- | --- | --- | --- |
| LOT-00 | Audit de clôture `62/64`, source de vérité unique et carte des surfaces runtime | livré | — |
| LOT-01 | Arbitrage final et politique runtime de `Q_GEO_04` | livré | LOT-00 |
| LOT-02 | Arbitrage final et politique runtime de `Q_PED_03` | livré | LOT-00 |
| LOT-03 | Branchement runtime des statuts de certification | livré | LOT-01 + LOT-02 |
| LOT-04 | Intégration WellNeuro aval bornée : Mon Équilibre, orientation, synthèse | livré | LOT-03 |
| LOT-05 | Validation transverse, documentation finale et handoff | livré | LOT-04 |

## État après LOT-00

- Le `64/64` est désormais borné par un audit dédié : `AUDIT_64_64.md`.
- La campagne ne cherche plus à « finir deux questionnaires » sans distinguer
  leurs natures : `Q_GEO_04` relève d'un verrou de contenu, `Q_PED_03` d'une
  suspension clinique.
- Le prochain lot utile est `LOT-01`, parce que `Q_GEO_04` est le seul cas où
  le runtime et le registre coexistent déjà sous forme dissociée
  (passation praticien oui, assignation non, contenu encore verrouillé).

## État après LOT-01

- `Q_GEO_04` reste `contenu_verrouille` ; aucune pièce nouvelle n'a permis de
  lever les bandes `27-30`, `21-26`, `10-20`, `0-9` hors de ce plafond.
- Le split runtime est désormais acté comme volontaire : aperçu praticien oui,
  assignation non.
- Le prochain lot utile est `LOT-02`, centré sur `Q_PED_03`.

## État après LOT-02

- `Q_PED_03` reste `suspendu`.
- La somme brute `/324` reste stable comme comportement interne, mais n'est plus
  promue comme scoring `certifie`.
- Le prochain lot utile est `LOT-03`, qui pourra brancher explicitement les
  statuts de certification dans les surfaces runtime visées par la campagne.

## État après LOT-03

- Le rayon Bibliothèque affiche un statut de certification explicite pour les
  entrées du catalogue (plus de lecture implicite « badge présent/absent »).
- Les recommandations déterministes d'orientation sont filtrées en fail-closed
  sur l'administrabilité runtime : un questionnaire suspendu ou sans définition,
  et un pack à composition inconnue/non administrable, ne sont plus retenus.
- Le prochain lot utile est `LOT-04`, centré sur l'intégration aval bornée.

## État après LOT-04

- Mon Équilibre ignore désormais explicitement toute source suspendue
  (fail-closed), y compris en présence de passations historiques.
- La synthèse IA consomme uniquement des questionnaires administrables selon le
  runtime, avant appel du modèle.
- Le prochain lot utile est `LOT-05` (validation transverse et handoff).

## État après LOT-05

- Les validations transverses ont été rejouées sur le périmètre livré
  (`check`, `test:worktree -- --fast`, audit campagne).
- Le dossier documentaire est cohérent et relisible sans reprise orale,
  avec traçabilité des lots 03/04/05 en fragments `changelog.d/`.
- Aucun lot supplémentaire n'est requis pour cette campagne.

## Done de campagne

- [x] Les 64 questionnaires ont un statut final intelligible et exploitable.
- [x] `Q_PED_03` et `Q_GEO_04` ne sont plus des angles morts du runtime.
- [x] Les garde-fous empêchent toute assignation, suggestion ou exposition erronée d'un instrument bloqué.
- [x] Les intégrations aval consomment uniquement des instruments explicitement autorisés.
- [x] La documentation finale permet de reprendre ou relire la campagne sans contexte oral.

## Consigne finale

Passer en mode Plan avant toute modification de code.
