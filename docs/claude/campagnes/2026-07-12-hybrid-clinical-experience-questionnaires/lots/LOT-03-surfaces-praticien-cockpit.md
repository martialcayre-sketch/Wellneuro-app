---
id: "LOT-03-surfaces-praticien-cockpit"
titre: "Hiérarchie des surfaces praticien et cockpit patient"
statut: "à_faire"
dépend_de: ["LOT-02"]
---

# LOT-03 — Hiérarchie des surfaces praticien et cockpit patient

## But

Appliquer Hybrid Clinical aux surfaces praticien prioritaires et recentrer l'interface sur la prochaine décision utile.

## Périmètre

- dashboard ;
- annuaire patients ;
- fiche patient ;
- intégration de la synthèse IA dans le contexte patient ;
- progressive disclosure des détails techniques ;
- mode expert desktop lorsque pertinent.

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

## Interdits

- ne pas fusionner tous les métiers dans une page unique ;
- ne pas exposer `PostgreSQL`, `Prisma`, terminal ou détails techniques dans l'UI ;
- ne pas modifier les routes API ou le scoring sans nécessité démontrée ;
- ne pas ajouter de recommandation clinique automatique non validée ;
- ne pas rendre les métriques purement décoratives prioritaires.

## Dashboard cible

Répondre à :

1. que traiter aujourd'hui ?
2. quel patient nécessite une décision ?
3. quelle est la prochaine action utile ?

Composants :

- file de décisions ;
- métriques actionnables ;
- activité clinique récente ;
- raccourcis contextuels limités.

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

## Fiche patient cible

En-tête :

- identité ;
- statut de suivi ;
- dernière activité ;
- action principale ;
- actions secondaires.

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
5. détails par besoin ;
6. réponses sources et qualité.

## Étapes

1. Définir le contrat des files de décisions sans inventer de données.
2. Remplacer les métriques descriptives par des indicateurs actionnables lorsque l'API le permet.
3. Extraire les formulaires permanents de la page Patients vers dialogs/drawers/pages dédiées.
4. Créer le mode carte patient mobile.
5. Restructurer la fiche patient en sections/onglets sans perdre la traçabilité.
6. Ajouter des actions contextuelles vers assignation et synthèse.
7. Migrer `SynthesePanel` vers les tokens sémantiques.
8. Conserver validation humaine et prévisualisation avant envoi.
9. Tester les trois patients fictifs.

## Tests

- parcours dashboard -> patient -> synthèse ;
- file de décisions correcte et non trompeuse ;
- mobile sans tableaux horizontaux ;
- actions destructrices protégées ;
- demande de correction visible ;
- aucun détail technique dans les textes ;
- thèmes Jour/Nuit ;
- clavier et focus ;
- pas de régression E2E patient/praticien.

## Done

- [ ] Dashboard orienté décisions.
- [ ] Page Patients allégée.
- [ ] Fiche patient cockpit validée.
- [ ] Synthèse contextuelle et validation humaine préservée.
- [ ] Mobile utilisable.
- [ ] Aucune logique clinique modifiée silencieusement.
