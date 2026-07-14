# Validation finale — QX LOT-04

## Périmètre

Cette validation couvre le renderer `micro_batch` de `Q_NEU_03`, le brouillon
local V1, la reprise, le résumé et la transmission. Elle ne modifie ni le
catalogue clinique, ni le payload, ni le scoring, ni la persistance serveur.

## Matrice exigences → preuves

| Exigence | Preuve | Résultat |
|---|---|---|
| Neuf micro-lots, 25 identifiants ordonnés, sans omission ni doublon | `questionnaire-display.test.ts` | Conforme |
| `micro_batch` activé uniquement pour `Q_NEU_03` | `questionnaire-display.test.ts` | Conforme |
| Tous les autres questionnaires utilisent le renderer standard | registre UX + tests du résolveur et du composant | Conforme |
| Payload POST limité au contrat historique et réponses numériques | `GenericQuestionnaire.test.tsx` | Conforme |
| Sous-scores et total inchangés | fixture `Q_NEU_03` : A=16, B=8, total=24 | Conforme |
| Brouillon V1 et fallback historique | `questionnaire-draft.test.ts` | Conforme |
| Reprise sans saut d'une partie incomplète | `GenericQuestionnaire.test.tsx` | Conforme |
| Résumé ordonné et correction ciblée | `GenericQuestionnaire.test.tsx` | Conforme |
| Erreur réseau sans perte puis nouvelle tentative | `GenericQuestionnaire.test.tsx` | Conforme |
| Session portail restaurée et questionnaires A puis B sans nouveau gate | `portail-parcours.spec.ts` | Preuve de base : PR #55, run CI `29327376064` vert ; à reconfirmer sur la CI LOT-04 |
| Inventaire des 63 questionnaires reproductible | sortie de `qx-questionnaire-inventory.mjs` comparée au document versionné | Conforme |
| Desktop, 375 px, zoom 200 %, clavier et lecteur d'écran | contrôle manuel | À consigner avant clôture |

## Invariants cliniques et contractuels

- `questions.ts`, les textes, l'ordre, les options, les valeurs et les seuils
  restent inchangés.
- Le payload reste `{ idAssignation, idPatient, email, idQuestionnaire,
  answers }` et ne transporte aucun état UX.
- Le scoring reste indexé par identifiant de question et valeur, jamais par
  position visuelle.
- `shuffle_nominal` reste une spécification non exécutée.
- Aucun changement Prisma, Supabase, API ou persistance n'est introduit.

## Validations techniques

- Tests ciblés QX : 21/21.
- Suite Vitest : 130/130.
- Certification scoring : 63 questionnaires et fixtures certifiées conformes.
- Inventaire : 63/63, sortie du générateur identique au document versionné.
- Type-check : conforme après génération locale du client Prisma, sans migration.
- Lint : conforme, avec deux avertissements `react-hooks/exhaustive-deps`
  préexistants dans `GenericQuestionnaire.tsx`.
- Build production : conforme avec les variables CI fictives et
  `NODE_ENV=production`.
- Anti-secrets et `git diff --check` : conformes.
- Audit de campagne : conforme ; deux avertissements historiques de lot LOT-00
  dupliqué dans une autre campagne restent hors périmètre.
- CI PostgreSQL et Playwright dédiée à LOT-04 : à exécuter sur la PR.

## Décision

Le GO final exige encore la CI PostgreSQL/Playwright dédiée, le contrôle
manuel consigné et une revue indépendante sans constat bloquant.

## Contrôle manuel à consigner

- [ ] Desktop : parcours complet, reprise, résumé, correction et nouvelle tentative.
- [ ] Largeur 375 px : aucune cible tronquée ni aucun débordement horizontal.
- [ ] Zoom 200 % : contenu et navigation restent utilisables sans débordement.
- [ ] Clavier seul : ordre naturel, radios utilisables et focus visible/replacé.
- [ ] Lecteur d'écran : titres, groupes radio, progression, erreurs et dialogue annoncés.
- [ ] Portail : questionnaire A puis B et retour au hub sans nouvelle saisie d'email.
