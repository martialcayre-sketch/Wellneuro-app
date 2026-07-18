---
id: "LOT-08"
titre: "Ancrage T0 par épisode (prérequis comparateur)"
statut: "à_faire"
dépend_de: "LOT-07"
volet: "C2B"
---

# LOT-08 — Ancrage T0 par épisode

> Compilé le 2026-07-18 depuis l'arbitrage C2B (registre **A8-1**).
> **Migration-free.** Condition du comparateur multi-épisodes (LOT-09).

## But

Ancrer les jalons de mesure J21/J42/J90 au **T0 de chaque `AssessmentEpisode`**
(côté praticien), tout en conservant le **T0 global** pour la fiche patient « Mon
équilibre ». `resoudreLectureJalon` fonctionne tel quel dès qu'on lui passe le T0
d'épisode — aucun changement de moteur.

## Résultat observable

Côté praticien, pour un patient à plusieurs épisodes, chaque épisode expose ses
lectures de jalons calculées **relativement à son propre T0** (et non au T0 global).
La fiche patient « Mon équilibre » reste strictement inchangée (T0 global).

## Périmètre

- Résoudre le T0 d'un épisode depuis `assessment_episodes` : **`confirmed_at` du
  milestone `T0`** retenu par défaut (à confirmer vs `targetAt` en exécution).
- Fenêtrer les `questionnaire_reponses` rattachées à la fenêtre de l'épisode, puis
  appeler `resoudreLectureJalon(dateT0Episode, jalon, lectures)`.
- Conserver `resoudreDateT0` (T0 global, 1re réponse) pour `api/patient/equilibre`
  et la fiche « Mon équilibre » — aucune modification de ce chemin.
- Exposer, côté praticien, la lecture par épisode (préparation LOT-09).

## Hors périmètre

- Le composant comparateur côte à côte (→ LOT-09).
- Toute modification de la fiche patient « Mon équilibre ».
- Réimplémentation de `momentum.ts` / `depuisPrisma.ts`.
- Migration Prisma / écriture Supabase (les épisodes existent déjà, C2A).

## Interdits

- Interface 100 % en français ; aucun secret en dur ; données patient fictives
  seulement (Sophie Nicola, Jennifer Martin, Michel Dogné).
- Aucune migration Prisma/SQL ni écriture Supabase.
- Aucune modification des seuils/pondérations/règles cliniques ; `versionScore`
  intact.
- Changements minimaux ; ne pas toucher le chemin T0 global.

## Étapes

- [ ] Trancher la source du T0 d'épisode (`confirmedAt` par défaut vs `targetAt`).
- [ ] Implémenter le fenêtrage réponses → épisode.
- [ ] Calculer les lectures de jalons par épisode via `resoudreLectureJalon`.
- [ ] Vérifier la non-régression stricte de « Mon équilibre » (T0 global).

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check`
- Vitest : un patient à ≥ 2 épisodes → jalons ancrés au T0 de chaque épisode ;
  « Mon équilibre » patient inchangé (T0 global).
- Smoke praticien (patients fictifs).

## Critères de done

- [ ] Les jalons praticien sont corrects par épisode (pas de mélange inter-cycles).
- [ ] La fiche patient « Mon équilibre » est bit-à-bit inchangée.
- [ ] Aucune migration ; `versionScore` inchangé.

## Risques / points de vigilance

- Réponses non rattachables à une fenêtre d'épisode → jalon « non mesuré » explicite
  (A8-2), jamais un 0.
- Frontière : cette lecture par épisode alimente le comparateur (LOT-09) mais ne
  compare rien elle-même.
