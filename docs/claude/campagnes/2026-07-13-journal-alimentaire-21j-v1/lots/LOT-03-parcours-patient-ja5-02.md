---
id: "LOT-03"
titre: "JA5-02 — Parcours patient Ma spirale alimentaire"
statut: "en cours — implémentation et validations"
gate: "levé — JA5-01 livré le 2026-07-17"
---

# LOT-03 (alias JA5-02) — Parcours patient

## Objet

Valider le parcours « Ma spirale alimentaire » dans un harnais local
navigable, avec les contrats JA5-01 et une fixture fictive. Le lot éprouve
la compréhension et la parité papier avant tout branchement patient réel.

## Périmètre

- Route `/dev/validation-ja` strictement limitée à `NODE_ENV=development`.
- Fixture déterministe Sophie Nicola, épisode fictif en régime `essai`.
- Action essayée et plan simple visibles ; question du jour facultative.
- Trace courte occasion → faisabilité → quatre issues, friction fermée et
  mot libre optionnel limité à 80 caractères.
- Canal explicite « Je n’ai pas pu cette semaine », distinct de l'absence
  neutre de trace.
- Plan minimal libre pour 1, 3 ou 7 jours, sans justification.
- Solution intra-épisode facultative, jamais promue en recommandation.
- Saisie praticien de la carte papier avec les mêmes champs et libellés,
  cible de saisie inférieure à 30 secondes.
- Carte A6 imprimable alignée sur les quatre issues et le registre de
  frictions JA5-01.
- Régime `silence` limité au message neutre existant, sans contrôle de
  saisie. Le calibrage reste à JA5-03.

## Données et architecture

Le harnais consomme directement `FoodObservationEpisode`, `DailyQuestion`,
`TrialTrace`, `MinimalPlanEvent` et `IntraEpisodeSolution`. Tous les
événements restent dans l'état React du composant et disparaissent au
rechargement. Aucun appel réseau, stockage navigateur, cookie, Prisma,
route métier ou donnée patient réelle.

## Interdits

- Aucun changement des types métier JA5-01, contrats C1/C2 ou routes
  publiques.
- Aucun score, moteur, rappel, notification, comparaison ou interprétation
  clinique.
- Aucune persistance, migration, activation patient ou accès Supabase.
- Aucun travail JA5-03, JA5-04 ou JA5-05 dans ce lot.

## Critères de done

- Tests composants : question facultative, dépendances et remises à zéro,
  quatre issues, friction et limite 80, plan 1/3/7, pause déclarée,
  solution locale, silence et mode papier.
- Test architectural garantissant l'absence de réseau et de stockage.
- Verrou développement testé ; vocabulaire écran/carte A6 vérifié.
- Vitest ciblé et global, type-check, lint, build, scoring-check, audit des
  campagnes, anti-secrets et `git diff --check` réussis.
- Revue indépendante effectuée avant passage du statut à `livré`.

## Résultats

À compléter après validation.

