---
id: "LOT-07-validation-gouvernance-handoff"
titre: "Validation transverse, lexique, gouvernance et handoff futur"
statut: "à_faire"
dépend_de: ["LOT-02", "LOT-03", "LOT-04", "LOT-05", "LOT-06"]
---

# LOT-07 — Validation transverse, lexique, gouvernance et handoff futur

## But

Valider la cohérence globale, fermer la campagne proprement et rendre Hybrid Clinical ainsi que les garde-fous de la vague 2 obligatoires pour les futures implantations.

## Périmètre

- tests transverses ;
- captures comparatives ;
- audit accessibilité ;
- vérification des questionnaires pilotes ;
- validation des prototypes P1 ;
- documentation canonique ;
- lexique UX praticien/patient ;
- matrice de migration ;
- matrice de maturité des innovations ;
- dette résiduelle ;
- règles de gouvernance futures ;
- handoff vers C1 et les campagnes produit suivantes.

## Fichiers probables

- `docs/design-system-d1.md` ou successeur canonique
- `docs/checklist_tests_end_to_end.md`
- `docs/claude/PROJET_CONTEXTE.md` si l'état courant change réellement
- `CHANGELOG.md` si le mode d'administration visible évolue
- `docs/claude/SESSION_LOG.md`
- documents de campagne et matrices produites
- tests Playwright/Vitest

## Interdits

- ne pas maquiller un test non exécuté comme réussi ;
- ne pas fermer avec des divergences documentaires connues non signalées ;
- ne pas activer toutes les politiques de randomisation à la clôture ;
- ne pas supprimer le renderer historique sans stratégie de retour ;
- ne pas lancer une migration de données ;
- ne pas étendre le périmètre à un nouveau module ;
- ne pas déclarer une innovation `livrée` si elle est seulement prototypée ;
- ne pas fermer la campagne sans arbitrer les capacités différées ;
- ne pas intégrer le constructeur 21 jours sans contrat C1 compatible.

## Matrice de validation

### Visuel

- Jour praticien ;
- Nuit praticien ;
- Auto système clair/sombre ;
- patient clair sur système clair/sombre ;
- desktop/tablette/mobile ;
- alignements du rail ;
- icônes ;
- densité contextuelle ;
- états vides/chargement/erreur ;
- mode consultation ;
- prévisualisation patient.

### Interaction

- souris ;
- tactile ;
- clavier ;
- lecteur d'écran ;
- zoom 200 % ;
- reduced motion ;
- session expirée ;
- réseau instable ;
- reprise brouillon ;
- entrée/sortie du mode consultation ;
- alternative au drag-and-drop si présent ;
- fermeture palette/dialog/drawer et retour du focus.

### Clinique et scoring

- payload identique ;
- score identique ;
- sous-scores identiques ;
- interprétation identique ;
- ordre fixe respecté ;
- randomisation opt-in stable ;
- demande de correction et déverrouillage ;
- lecture seule ;
- origine et limites des cartes de décision ;
- validation humaine préservée ;
- aucun événement inventé dans la timeline ;
- comparabilité avant/maintenant ;
- aucune donnée interne dans la prévisualisation patient.

### Confiance patient

- résumé de session fondé sur des faits ;
- distinction conservation locale / synchronisation / transmission ;
- messages réseau et erreurs compréhensibles ;
- confort de lecture ;
- prochaine action explicite ;
- thème clair fixe.

## Étapes

1. Exécuter les validations techniques standard.
2. Exécuter l'ensemble des tests E2E concernés.
3. Produire les captures aux largeurs de référence.
4. Réaliser un audit visuel avec mesures d'alignement.
5. Vérifier les trois patients fictifs uniquement.
6. Rejouer les questionnaires pilotes avec jeux de réponses de référence.
7. Valider le niveau de maturité réel de chaque innovation P1/P2.
8. Vérifier timeline, carte de décision, comparateur et prévisualisation.
9. Vérifier les états réseau, sauvegarde et reprise patient.
10. Documenter les écarts entre prototype, spécification et implémentation.
11. Mettre à jour le design system canonique.
12. Produire le lexique UX praticien/patient.
13. Mettre à jour la checklist E2E.
14. Produire la matrice des pages et questionnaires migrés.
15. Produire la matrice des innovations `livrée/prototype_validé/spécifiée/différée`.
16. Définir la règle pour toute nouvelle page/questionnaire/innovation.
17. Arbitrer l'articulation avec C1 et le constructeur 21 jours.
18. Émettre un verdict GO / GO avec dettes / NO-GO.
19. Mettre à jour le journal de session.

## Commandes minimales

```bash
bash scripts/check_no_secrets.sh
cd web
npm run type-check
npm run lint
npm run test
npm run test:e2e
```

## Livrables

- `VALIDATION_FINALE.md` ;
- `MATRICE_MIGRATION_UX.md` ;
- `MATRICE_QUESTIONNAIRES_PSYCHOMETRIE.md` ;
- `MATRICE_INNOVATIONS_VAGUE_2.md` ;
- `LEXIQUE_UX_WELLNEURO.md` ;
- `DETTE_UX_RESIDUELLE.md` ;
- `HANDOFF_FUTURES_IMPLANTATIONS.md` ;
- éventuel `HANDOFF_CONSTRUCTEUR_21_JOURS.md` ;
- captures et résultats de tests.

## Contenu minimal du lexique

- termes praticien autorisés ;
- termes patient autorisés ;
- traductions des statuts techniques ;
- vocabulaire sauvegarde/synchronisation/transmission ;
- brouillon/validation/envoi ;
- messages d'erreur ;
- confirmations ;
- formulations à éviter.

## Handoff futur

Le handoff doit indiquer :

- composants obligatoires ;
- contrats de données ;
- capacités réellement livrées ;
- prototypes validés restant à connecter ;
- capacités différées et prérequis ;
- dépendances avec C1 ;
- campagne suivante recommandée ;
- stratégie d'extension aux modules biologie, protocoles, compléments et documents.

## Done

- [ ] Toutes les validations réellement exécutées sont consignées.
- [ ] Les écarts non testables sont explicitement signalés.
- [ ] Documentation canonique à jour.
- [ ] Garde-fous futurs intégrés.
- [ ] Matrice psychométrique disponible.
- [ ] Matrice de maturité des innovations disponible.
- [ ] Lexique UX livré.
- [ ] Prototypes P1 correctement qualifiés.
- [ ] Articulation C1/constructeur 21 jours documentée.
- [ ] Migration progressive documentée.
- [ ] Verdict final émis.
- [ ] Campagne marquée terminée uniquement après validation explicite.
