---
id: "LOT-01"
titre: "Saisie groupée praticien"
statut: "à_faire"
dépend_de: "LOT-00"
---

# LOT-01 — Saisie groupée praticien

## But

Saisir un bilan complet en une validation : date/heure de prélèvement commune, plusieurs analytes, unités lues du catalogue (A1).

## Résultat observable

Depuis le cockpit, un praticien saisit N valeurs et les enregistre en un geste. Si une ligne est invalide, **rien n'est écrit**, le refus nomme la ligne fautive et la saisie reste en place (A3).

## Périmètre

Route batch transactionnelle (préflight de toutes les lignes, puis `$transaction`), formulaire multi-lignes réutilisant les gardes, la validation, la détection de doublon et la lecture d'unité existantes.

## Hors périmètre

Staging, documents, IA, portail patient. Aucune colonne nouvelle.

## Fichiers probables

- `web/src/app/api/praticien/biologie/resultats/route.ts` (+ `route.test.ts`)
- `web/src/lib/biology-library/resultats.ts`, `gardeResultats.ts`, `featureFlag.ts`
- `web/src/components/patient-cockpit/EstimeMesurePanel.tsx`

## Interdits

- Pas de secret, pas de donnée patient réelle (fixtures : Sophie Nicola, Jennifer Martin, Michel Dogné).
- Aucune écriture dans `resultats_biologiques` sans validation humaine explicite.
- Aucune qualification clinique d'une valeur (basse, haute, pathologique), aucune recommandation.
- Aucune conversion d'unité (`D-157`), aucun choix final d'analyte par LLM.
- Pas de migration hors d'un lot marqué « confirmation obligatoire » (`D-087`).
- Pas de refactor hors lot.

## Dépendances

LOT-00

## Étapes

- [ ] Mode Plan : route batch dédiée ou extension du POST, réutilisation de `validerSaisieResultat`.
- [ ] Implémenter le préflight complet puis l'écriture transactionnelle.
- [ ] Formulaire multi-lignes, textes en français.
- [ ] Validations T1, T2.
- [ ] Constat d'usage au conteneur après déploiement (`D-125`).

## Tests

Route : tout-ou-rien (9 valides + 1 invalide ⇒ 0 ligne), doublon 409, unité serveur, correction `import_labo` refusée, gardes fail-closed. Tests de mutation sur le préflight. E2E sur fixture réservée ; accessibilité du formulaire.

## Critères de done

Saisie groupée en production derrière `WN_CB_RESULTS_ENABLED`, T2 vert, aucune migration.

## Résultats

À compléter à la clôture.
