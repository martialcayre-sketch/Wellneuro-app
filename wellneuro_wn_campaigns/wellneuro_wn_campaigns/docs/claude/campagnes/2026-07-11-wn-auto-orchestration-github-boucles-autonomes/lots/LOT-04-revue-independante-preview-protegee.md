---
id: "LOT-04"
titre: "revue-independante-preview-protegee"
statut: "terminé"
dépend_de: "LOT-03"
---

# LOT-04 — Revue indépendante et preview protégée

## But

Imposer une revue par un agent distinct et un gate de preview avant toute fusion sensible.

## Résultat observable

Une double validation claire : revue IA indépendante puis approbation humaine sur preview protégée.

## Périmètre

- revue du diff ;
- critères de sécurité/données/clinique ;
- preview Vercel protégée ;
- go/no-go.

## Hors périmètre

- déploiement en production ;
- validation silencieuse ;
- fusion automatique des tâches sensibles.

## Fichiers probables

- `.claude/agents/wn-reviewer.md`
- `docs/claude/campagnes/README.md`
- `.github/workflows/ci.yml`
- `REVUE_PREVIEW_LOT04.md`

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de déploiement automatique.
- Pas d’écriture Supabase.

## Étapes

- [x] Définir les critères de revue.
- [x] Définir les preuves requises.
- [x] Définir le gate de preview.
- [x] Définir les conditions de go/no-go.

## Tests

- Revue indépendante simulée.
- Vérification qu’aucune fusion sensible n’est automatique.

## Critères de done

- La revue est séparée de l’implémentation.
- La preview protège les changements sensibles.
- La validation humaine reste obligatoire.

## Résultats

- Lot clôturé le 2026-07-11.
- Contrat de revue indépendante et preview protégé produit dans `REVUE_PREVIEW_LOT04.md`.
- Critères de revue, preuves et règles go/no-go explicités.
- Séparation preview/release actée: gate release traité au LOT-05.
