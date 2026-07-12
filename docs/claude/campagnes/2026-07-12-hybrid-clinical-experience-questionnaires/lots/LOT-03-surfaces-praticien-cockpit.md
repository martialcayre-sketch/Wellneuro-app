---
id: "LOT-03-surfaces-praticien-cockpit"
titre: "Surfaces praticien, mode consultation et expérience clinique avancée"
statut: "à_faire"
dépend_de: ["LOT-02"]
---

# LOT-03 — Surfaces praticien, mode consultation et expérience clinique avancée

## But

Appliquer Hybrid Clinical aux surfaces praticien prioritaires, recentrer l'interface sur la prochaine décision utile et prototyper les capacités P1 de la vague 2 sans créer de modèle clinique parallèle.

## Périmètre

- dashboard ;
- annuaire patients ;
- fiche patient ;
- intégration de la synthèse IA dans le contexte patient ;
- progressive disclosure des détails techniques ;
- mode expert desktop lorsque pertinent ;
- mode consultation sans distraction ;
- double niveau de lecture ;
- timeline clinique ;
- carte de décision clinique ;
- comparateur avant / maintenant ;
- prévisualisation de la vue patient ;
- états vides actionnables et prévention des erreurs ;
- prototype du constructeur 21 jours uniquement si compatible avec C1.

## Fichiers probables

- `web/src/app/dashboard/page.tsx`
- `web/src/components/MetricsSection.tsx`
- `web/src/components/PatientsATraiter.tsx`
- `web/src/app/dashboard/patients/page.tsx`
- `web/src/components/PatientsPanel.tsx`
- `web/src/components/ui/PatientRow.tsx`
- `web/src/components/FichePatientPanel.tsx`
- `web/src/components/SynthesePanel.tsx`
- nouveaux composants `PageHeader`, `ActionCard`, `DecisionQueue`, `PatientCard`, `ClinicalTimeline`
- nouveaux composants potentiels `ConsultationMode`, `ClinicalDecisionCard`, `BeforeAfterComparison`, `PatientPreview`
- documents et contrats C1 relatifs à la décision clinique et aux phases de 21 jours.

## Interdits

- ne pas fusionner tous les métiers dans une page unique ;
- ne pas exposer `PostgreSQL`, `Prisma`, terminal ou détails techniques dans l'UI ;
- ne pas modifier les routes API ou le scoring sans nécessité démontrée ;
- ne pas ajouter de recommandation clinique automatique non validée ;
- ne pas rendre les métriques purement décoratives prioritaires ;
- ne pas dupliquer les données ou contrats de C1 ;
- ne pas inventer d'événements pour alimenter une timeline ;
- ne pas comparer des scores ou mesures non comparables ;
- ne pas exposer au patient notes internes, hypothèses non validées ou données réservées au praticien ;
- ne pas introduire de captation audio, transcription ou assistant flottant omniprésent ;
- ne pas livrer un builder 21 jours incomplet contournant les validations cliniques.

## Dashboard cible

Répondre à :

1. que traiter aujourd'hui ?
2. quel patient nécessite une décision ?
3. quelle est la prochaine action utile ?

Composants :

- file de décisions ;
- métriques actionnables ;
- activité clinique récente ;
- vues opérationnelles fixes utiles ;
- raccourcis contextuels limités ;
- états vides expliquant la prochaine action.

## Annuaire cible

Séparer :

- annuaire ;
- création patient ;
- assignation ;
- gestion des packs ;
- activité.

Desktop : cartes ou tableau expert. Mobile : cartes obligatoires.

Colonnes utiles du tableau expert :

- patient ;
- statut du parcours ;
- dernière activité ;
- prochaine action ;
- priorité ;
- menu actions.

Vues fixes possibles :

- à traiter aujourd'hui ;
- questionnaires terminés ;
- synthèses à valider ;
- demandes de correction ;
- protocoles à échéance ;
- absence d'activité prolongée.

## Fiche patient cible

En-tête :

- identité ;
- statut de suivi ;
- dernière activité ;
- action principale ;
- actions secondaires ;
- entrée explicite dans le mode consultation.

Navigation interne :

- vue clinique ;
- questionnaires ;
- équilibre ;
- biologie ;
- protocoles ;
- documents ;
- historique.

Progressivité :

1. signal principal ;
2. prochaine décision ;
3. vigilances ;
4. priorités ;
5. changements depuis la dernière consultation ;
6. détails par besoin ;
7. réponses sources et qualité.

## Mode consultation

Le mode consultation réutilise les mêmes données et composants, dans une composition focalisée :

- en-tête patient persistant ;
- motif et attentes ;
- signal principal ;
- vigilances ;
- questionnaires ou changements récents ;
- notes ;
- prochaine décision ;
- actions pour préparer la suite ou clôturer.

Règles :

- activation et sortie explicites ;
- aucune navigation indispensable masquée définitivement ;
- pas de second état de dossier ;
- sauvegarde des notes clarifiée ;
- utilisable sur tablette ;
- aucun enregistrement audio implicite.

Le lot doit au minimum produire un prototype interactif validé. L'intégration métier complète dépend des données réellement disponibles.

## Double niveau de lecture

### Niveau 1 — immédiat

- information prioritaire ;
- changement notable ;
- décision attendue ;
- donnée manquante ou vigilance.

### Niveau 2 — expert

- scores et sous-scores ;
- réponses sources ;
- règles de calcul ;
- qualité des données ;
- sources ;
- historique détaillé.

Les détails experts ne doivent pas être chargés ou ouverts par défaut sans nécessité.

## Timeline clinique

La timeline peut regrouper :

- consultations ;
- questionnaires ;
- synthèses ;
- prescriptions et résultats biologiques ;
- protocoles et phases ;
- documents ;
- corrections ;
- changements significatifs.

Chaque entrée indique :

- date ou période ;
- type : événement, décision ou résultat ;
- statut ;
- source ;
- action contextuelle éventuelle.

Les événements secondaires peuvent être regroupés. Les filtres ne doivent pas dépendre du hover.

## Carte de décision clinique

Contrat conceptuel :

- décision ou priorité proposée ;
- justification ;
- données contributives ;
- niveau de confiance ;
- limites ;
- données manquantes ;
- origine : règle, IA, praticien ;
- actions disponibles.

Actions typiques : `Valider`, `Modifier`, `Reporter`, `Écarter`.

La carte ne doit pas exécuter une prescription ou un envoi sans étape humaine explicite.

## Comparateur avant / maintenant

Pour un pilote compatible :

- mesure initiale et actuelle ;
- dates ;
- unité ou échelle ;
- conditions de comparabilité ;
- évolution ;
- amélioration, stabilité ou dégradation avec libellé textuel ;
- commentaire ou limite.

Si les mesures ne sont pas comparables, afficher explicitement l'impossibilité de comparaison au lieu de calculer une évolution.

## Prévisualisation patient

Depuis une synthèse, un protocole ou un document :

- bouton `Voir ce que recevra le patient` ;
- rendu fidèle aux composants patient ;
- test mobile ;
- frontière stricte entre contenu partageable et données internes ;
- indication claire qu'il s'agit d'une prévisualisation.

La vue patient ne doit pas être reconstruite indépendamment au risque de divergence.

## Constructeur visuel 21 jours

À arbitrer avec C1 :

- cartes d'intervention ;
- objectif, moment, fréquence, durée, priorité, vigilance ;
- statuts proposé, validé, envoyé ;
- déplacement par drag-and-drop uniquement avec alternatives boutons/clavier ;
- prévisualisation patient.

Si les contrats C1 ne sont pas stabilisés ou si une évolution métier profonde est nécessaire, produire un prototype et un handoff vers une campagne dédiée.

## Prévention des erreurs

- distinguer `Enregistrer`, `Valider` et `Envoyer` ;
- brouillon explicite ;
- confirmation contextualisée ;
- historique ou trace de validation ;
- possibilité d'annulation immédiate lorsqu'elle est sûre ;
- aucune suppression directe dans une ligne dense ;
- données manquantes signalées avant validation.

## Étapes

1. Définir le contrat des files de décisions sans inventer de données.
2. Remplacer les métriques descriptives par des indicateurs actionnables lorsque l'API le permet.
3. Extraire les formulaires permanents de la page Patients vers dialogs/drawers/pages dédiées.
4. Créer le mode carte patient mobile.
5. Restructurer la fiche patient en sections/onglets sans perdre la traçabilité.
6. Ajouter les deux niveaux de lecture.
7. Prototyper mode consultation, carte de décision et timeline.
8. Ajouter des actions contextuelles vers assignation et synthèse.
9. Migrer `SynthesePanel` vers les tokens sémantiques.
10. Conserver validation humaine et prévisualisation avant envoi.
11. Prototyper un comparateur sur des mesures réellement comparables.
12. Implémenter ou prototyper la prévisualisation patient avec contrat de données.
13. Arbitrer le builder 21 jours avec C1.
14. Tester les trois patients fictifs.

## Tests

- parcours dashboard -> patient -> synthèse ;
- file de décisions correcte et non trompeuse ;
- mobile sans tableaux horizontaux ;
- actions destructrices protégées ;
- demande de correction visible ;
- aucun détail technique dans les textes ;
- thèmes Jour/Nuit ;
- clavier et focus ;
- pas de régression E2E patient/praticien ;
- mode consultation : entrée, sortie, tablette, sauvegarde ;
- timeline : dates, types et absence d'événement inventé ;
- carte de décision : origine, limites et validation humaine ;
- comparateur : dates, unité, comparabilité et cas non comparable ;
- prévisualisation : absence de données internes ;
- états vides et erreurs actionnables.

## Done

- [ ] Dashboard orienté décisions.
- [ ] Page Patients allégée.
- [ ] Fiche patient cockpit validée.
- [ ] Double niveau de lecture disponible.
- [ ] Mode consultation prototypé et arbitré.
- [ ] Timeline clinique prototypée avec données réelles disponibles.
- [ ] Carte de décision conforme aux contrats C1 ou explicitement provisoire.
- [ ] Comparateur pilote sûr ou différé avec justification.
- [ ] Prévisualisation patient validée ou contrat prêt.
- [ ] Builder 21 jours intégré ou confié à une campagne dédiée.
- [ ] Synthèse contextuelle et validation humaine préservée.
- [ ] Mobile utilisable.
- [ ] Aucune logique clinique modifiée silencieusement.
