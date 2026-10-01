---
id: "LOT-01"
titre: "Saisie groupée praticien"
statut: "terminé"
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

- [x] Mode Plan : route bilan DÉDIÉE (`resultats/bilan`), la route unitaire et sa correction inchangées.
- [x] Implémenter le préflight complet puis l'écriture transactionnelle.
- [x] Formulaire multi-lignes, textes en français — il REMPLACE la saisie unitaire (arbitrage du 2026-10-01).
- [x] Validations T1, T2.
- [ ] Constat d'usage au conteneur après déploiement (`D-125`) — reporté hors lot, voir Résultats.

## Tests

Route : tout-ou-rien (9 valides + 1 invalide ⇒ 0 ligne), doublon 409, unité serveur, correction `import_labo` refusée, gardes fail-closed. Tests de mutation sur le préflight. E2E sur fixture réservée ; accessibilité du formulaire.

## Critères de done

Saisie groupée en production derrière `WN_CB_RESULTS_ENABLED`, T2 vert, aucune migration.

## Résultats

Livré le 2026-10-01 sur `feat/bio-ingest-lot01-saisie-groupee`.

- **Route** `POST /api/praticien/biologie/resultats/bilan` : date commune, N lignes, préflight
  complet (forme, analyte absent/inconnu/inactif, analyte en double, doublon en base sur la clé
  de l'unicité partielle), TOUS les refus rendus avec leur index, puis un seul `$transaction`
  (forme tableau). Un `P2002` de course annule le bilan entier. Une ligne qui porte
  `supersedesResultatId` est refusée : un bilan ne corrige rien (`D-124`). Unité, source et
  auteur posés serveur. Borne technique : 100 lignes.
- **Cockpit** : `SaisieBilan` remplace `SaisieMesure` dans `EstimeMesurePanel` ; refus sous la
  ligne fautive (`aria-invalid`, `aria-describedby`), alerte globale, rien n'est vidé.
- **Extraction sans changement de comportement** : `saisieMessages.ts` (messages, `signature`),
  `validerDatePrelevement`. Le banc de la route unitaire est resté vert sans modification.
- **Validations** : T1 vert ; banc de la route bilan, 16 mutations manuelles du préflight,
  toutes détectées ; T2 vert (225 E2E, biologie verte sur Chromium et iPhone 13) ;
  `/code-review medium` sans finding.
- **Reste, hors lot** : le constat d'usage au conteneur (`D-125`, par identifiant) après
  déploiement — combien de lignes `resultats_biologiques`, de combien de bilans. La ligne de
  base est 0 ligne sur 28 dossiers actifs (2026-09-30).
