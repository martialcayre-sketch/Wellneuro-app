---
id: "LOT-02"
titre: "Cockpit — lecture"
statut: "terminé"
dépend_de: "LOT-01"
---

# LOT-02 — Cockpit — lecture

## But

Construire la lecture praticien du cockpit depuis les API publiques de Mon
équilibre, sans réimplémenter les calculs.

## Résultat observable

La fiche affiche PatientHeader, radar retenu, 12 besoins, preuves A/B/C/D,
cinq objets cliniques et momentum comparable.

## Périmètre

- composants de lecture du cockpit ;
- second niveau pour sources, limites et détails ;
- états non mesuré, chargement, vide et erreur.

## Hors périmètre

- décision et protocole ;
- recalcul de Mon équilibre ;
- exposition patient des notes internes.

## Fichiers probables

- `web/src/lib/equilibre/`
- fiche patient praticien
- mécanisme `TwoLevelReading` fourni par HC-F

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase sans confirmation distincte.
- Pas de refactor hors lot.

## Étapes

- [x] Vérifier les hypothèses.
- [x] Implémenter le changement minimal.
- [x] Exécuter les validations.
- [x] Relire le diff.
- [x] Documenter les résultats.

## Tests

Tests unitaires des adaptateurs, tests composants et E2E praticien ciblé.

## Critères de done

- score identique avant/après adaptation ;
- provenance et limites visibles ;
- aucun calcul dupliqué ;
- navigation clavier et contraste conformes.

## Résultats

La campagne compilée et `docs/claude/ARCHITECTURE_CLINIQUE_3_2.md` ont
prévalu sur le texte historique « cockpit — lecture ». LOT-02 livre un socle
TypeScript pur de revue clinique prudente ; l'interface cockpit reste hors
périmètre.

### Livrables

- contrat versionné `ClinicalReview`, lié au snapshot et protégé par un hash
  canonique indépendant de la locale ;
- constats typés pour données manquantes, discordances praticien-only,
  sécurité et abstention ;
- projection des seules absences structurelles du snapshot avec statut
  `à_documenter`, sans zéro, criticité ou conclusion automatique ;
- provenance strictement bornée aux réponses, besoins et objets présents dans
  le snapshot ;
- règles candidates transportées mais inactives ; toute règle déclarée
  validée exige une validation praticien contrôlée à l'exécution ;
- abstention `not_evaluated` par défaut, jamais transformée implicitement en
  `not_required`.

### Validations

- Vitest ciblé `clinical-engine` + `equilibre` : 9 fichiers, 63 tests verts ;
- `npm run type-check` : OK ;
- `npm run lint` : OK ;
- `npm run scoring-check` : 63 questionnaires certifiés, OK ;
- `bash scripts/check_no_secrets.sh` : OK ;
- `git diff --check` : OK ;
- revue indépendante `wn-review` : GO.

Aucune interface, route API, migration Prisma/SQL, écriture Supabase, donnée
patient réelle, règle, formule ou seuil clinique n'a été ajouté ou modifié.
