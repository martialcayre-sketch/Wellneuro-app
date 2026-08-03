# Brief compilé - Clôture certification questionnaires et intégration WellNeuro

_Rédigé le 2026-08-03 à partir du besoin utilisateur et de l'état réel du dépôt._

## Identité de campagne

- Dossier campagne : `docs/claude/campagnes/2026-08-03-cloture-certification-questionnaires-integration`
- Fichier final : `docs/claude/campagnes/2026-08-03-cloture-certification-questionnaires-integration/CAMPAGNE.md`
- Intention de départ : terminer le chantier laissé à `62/64` et brancher son résultat dans WellNeuro sans rouvrir de chantier clinique diffus.

## Sources compilées

- Demande utilisateur du 2026-08-03 : « terminer la certification de 62/64 questionnaires et son integration dans wellneuro ».
- `docs/claude/SESSION_LOG.md` : entrée du 2026-08-01 « Clôture montée certification 62/64 ».
- `docs/questionnaires-drive-mapping.md` : matrice historique code ↔ sources Drive.
- `docs/claude/corpus/instrument_registry.json` : source d'état actuelle des instruments.
- `docs/gouvernance-questionnaires-scoring.md` : garde-fous cliniques et validations minimales.
- `docs/claude/propositions/2026-07-25-certification-corpus-questionnaires/README.md` : trajectoire de certification et d'intégration (Mon Équilibre, orientation, synthèse).

## 1. Objectif

- Porter le chantier de certification à un état **64/64 clôturé**, avec décision explicite pour les deux instruments encore bloquants.
- Faire en sorte que WellNeuro consomme cet état de manière fiable : un questionnaire certifié, suspendu ou verrouillé doit produire le bon comportement dans le runtime.
- Préparer l'intégration applicative utile sans modifier la logique clinique ni ouvrir d'activation implicite.

## 2. État réel constaté

- La montée lots 1-4 a été déclarée close à `62/64` le 2026-08-01.
- La note de clôture précise : **60 `scoring_verifie` + 2 suspendus terminaux**.
- Les deux cas encore structurants sont :
  - `Q_PED_03` : `statutCertification: "suspendu"`.
  - `Q_GEO_04` : `statutCertification: "contenu_verrouille"`.
- L'orientation adaptative et les branchements Mon Équilibre existent surtout comme trajectoire cadrée ; le runtime courant repose encore sur des listes et recommandations statiques.

## 3. Contraintes non négociables

- Aucun secret en dur.
- Aucune donnée patient réelle.
- Aucun changement de scoring, seuil, interprétation ou logique clinique sans arbitrage explicite et trace documentaire.
- Aucune migration Prisma/SQL ni écriture Supabase sans demande explicite et confirmation distincte.
- Changements minimaux, une finalité par lot.
- Les textes visibles restent en français.

## 4. Décisions déjà actées à réutiliser

- `Q_PED_03` ne doit pas être rouvert en somme brute ; si usage il y a, il passe par un scoring dimensionnel complet avec échelles de validité.
- `Q_GEO_04` n'a pas été promu le 2026-08-01 car des bandes HAS 2011 restaient non sourcées ; le verrouillage n'est donc pas un retard arbitraire mais une conséquence documentaire.
- L'intégration orientation reste **fail-closed** : aucune suggestion ne doit sortir sans traçabilité claim par claim et sans filtre dur sur les statuts.
- L'objectif d'intégration n'est pas d'ouvrir plus de questionnaires, mais de refléter correctement leur statut dans le produit.

## 5. Problème à résoudre

- Le dépôt sait décrire l'état documentaire des instruments, mais la clôture `62/64` n'est pas encore convertie en campagne exécutable bornée pour finir le sujet.
- Le risque principal n'est pas technique ; il est de **mélanger** trois sujets différents :
  - clôturer deux dossiers de certification ;
  - exposer le statut de certification dans le runtime ;
  - activer des usages aval (Mon Équilibre, orientation, synthèse) sans garde suffisant.

## 6. Questions ouvertes à trancher pendant la campagne

- La cible de done est-elle `64/64 certifiés`, ou `64/64 arbitres et correctement branchés`, même si un instrument reste non administrable ?
- `Q_GEO_04` doit-il être réaligné pour réouverture, ou officiellement maintenu hors usage avec un verrou runtime explicite ?
- `Q_PED_03` doit-il rester suspendu tant qu'aucun besoin production ne justifie sa reconstruction dimensionnelle ?
- L'intégration Mon Équilibre se limite-t-elle au filtre des sources certifiées, ou inclut-elle un bump de version et de nouvelles couvertures ?
- L'intégration orientation s'arrête-t-elle au socle déterministe fail-closed, ou va-t-elle jusqu'au branchement UI et synthèse ?

## 7. Dépendances

- `docs/claude/corpus/instrument_registry.json` pour la vérité instrument par instrument.
- `docs/questionnaires-drive-mapping.md` pour l'historique Drive et les statuts déjà auditables.
- `web/src/lib/questions.ts` et ses surfaces de consommation pour tout branchement runtime futur.
- Les travaux cadrés autour de Mon Équilibre et orientation dans `docs/claude/propositions/2026-07-25-certification-corpus-questionnaires/README.md`.

## 8. Risques majeurs

- Déclarer `64/64` en confondant clôture documentaire et ouverture clinique.
- Réintroduire implicitement un questionnaire suspendu dans les parcours patient ou praticien.
- Coupler la fin de certification avec un trop grand lot d'intégration orientation/IA.
- Créer des divergences entre registre, matrice Drive, catalogue et runtime.

## 9. Découpage recommandé

- `LOT-00` : audit de clôture et source de vérité unique.
- `LOT-01` : arbitrage final `Q_GEO_04`.
- `LOT-02` : arbitrage final `Q_PED_03`.
- `LOT-03` : branchement runtime des statuts de certification.
- `LOT-04` : intégration WellNeuro aval bornée (Mon Équilibre, orientation, synthèse) en mode fail-closed.
- `LOT-05` : validation transverse, documentation finale et handoff.

## 10. Recommandation de pilotage

- Traiter d'abord les deux instruments restants.
- N'autoriser l'intégration runtime qu'une fois la table des statuts figée.
- Découpler strictement le socle de filtrage déterministe des usages IA ou UI qui en dépendent.

## Consigne finale

Passer en mode Plan avant toute modification de code.
