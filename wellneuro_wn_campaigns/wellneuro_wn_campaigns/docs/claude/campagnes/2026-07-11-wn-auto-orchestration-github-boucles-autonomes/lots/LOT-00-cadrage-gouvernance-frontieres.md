---
id: "LOT-00"
titre: "cadrage-gouvernance-frontieres"
statut: "terminé"
dépend_de: "aucun"
---

# LOT-00 — Cadrage gouvernance et frontières

## But

Définir l’autonomie permise, les interdits et les seuils d’arrêt avant toute implémentation.

## Résultat observable

Une matrice vert/orange/rouge et des règles d’arrêt explicites, validées en lecture seule.

## Périmètre

- autonomie sûre des tâches de documentation, tests, petits correctifs et orchestration ;
- frontières explicites sur clinique, migrations, auth, données et prod ;
- critères de refus automatique pour les opérations rouges.

## Hors périmètre

- créer des workflows GitHub ;
- modifier le code applicatif ;
- toucher aux secrets ou à la production.

## Fichiers probables

- `BRIEF_COMPILED.md`
- `CAMPAGNE.md`
- `MATRICE_RISQUE_LOT00.md`
- `README_AUTOMATISATION_CLAUDE_CODE.md`

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration Prisma/SQL.
- Pas d’écriture Supabase.
- Pas de changement clinique ou d’authentification.

## Étapes

- [x] Formaliser la matrice de risque.
- [x] Définir les limites d’autonomie.
- [x] Lister les opérations rouges.
- [x] Valider les critères d’arrêt.

## Tests

- Relecture documentaire.
- Vérification de cohérence avec les règles projet.

## Critères de done

- Les frontières rouge/orange/vert sont explicites.
- Les interdits sont listés sans ambiguïté.
- Le lot suivant peut s’appuyer dessus sans interprétation.

## Résultats

- Lot clôturé le 2026-07-11.
- Matrice canonique produite dans `MATRICE_RISQUE_LOT00.md`.
- Frontières d'autonomie validées : vert autonome, orange autonome borné avec validation, rouge planification seule.
- Critères d'arrêt explicités : bascule immédiate en `needs-human` sur tout signal rouge.
