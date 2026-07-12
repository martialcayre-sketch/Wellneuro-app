---
id: "LOT-07-validation-gouvernance-handoff"
titre: "Validation transverse, documentation canonique et handoff futur"
statut: "à_faire"
dépend_de: ["LOT-02", "LOT-03", "LOT-04", "LOT-05", "LOT-06"]
---

# LOT-07 — Validation transverse, documentation canonique et handoff futur

## But

Valider la cohérence globale, fermer la campagne proprement et rendre Hybrid Clinical obligatoire pour les futures implantations.

## Périmètre

- tests transverses ;
- captures comparatives ;
- audit accessibilité ;
- vérification des questionnaires pilotes ;
- documentation canonique ;
- matrice de migration ;
- dette résiduelle ;
- règles de gouvernance futures ;
- handoff vers les campagnes produit suivantes.

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
- ne pas étendre le périmètre à un nouveau module.

## Matrice de validation

### Visuel

- Jour praticien ;
- Nuit praticien ;
- Auto système clair/sombre ;
- patient clair sur système clair/sombre ;
- desktop/tablette/mobile ;
- alignements du rail ;
- icônes ;
- densité ;
- états vides/chargement/erreur.

### Interaction

- souris ;
- tactile ;
- clavier ;
- lecteur d'écran ;
- zoom 200 % ;
- reduced motion ;
- session expirée ;
- réseau instable ;
- reprise brouillon.

### Clinique et scoring

- payload identique ;
- score identique ;
- sous-scores identiques ;
- interprétation identique ;
- ordre fixe respecté ;
- randomisation opt-in stable ;
- demande de correction et déverrouillage ;
- lecture seule.

## Étapes

1. Exécuter les validations techniques standard.
2. Exécuter l'ensemble des tests E2E concernés.
3. Produire les captures aux largeurs de référence.
4. Réaliser un audit visuel avec mesures d'alignement.
5. Vérifier les trois patients fictifs uniquement.
6. Rejouer les questionnaires pilotes avec jeux de réponses de référence.
7. Documenter les écarts entre prototype, spécification et implémentation.
8. Mettre à jour le design system canonique.
9. Mettre à jour la checklist E2E.
10. Produire la matrice des pages et questionnaires migrés.
11. Définir la règle pour toute nouvelle page/questionnaire.
12. Émettre un verdict GO / GO avec dettes / NO-GO.
13. Mettre à jour le journal de session.

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
- `DETTE_UX_RESIDUELLE.md` ;
- `HANDOFF_FUTURES_IMPLANTATIONS.md` ;
- captures et résultats de tests.

## Done

- [ ] Toutes les validations réellement exécutées sont consignées.
- [ ] Les écarts non testables sont explicitement signalés.
- [ ] Documentation canonique à jour.
- [ ] Garde-fous futurs intégrés.
- [ ] Matrice psychométrique disponible.
- [ ] Migration progressive documentée.
- [ ] Verdict final émis.
- [ ] Campagne marquée terminée uniquement après validation explicite.
