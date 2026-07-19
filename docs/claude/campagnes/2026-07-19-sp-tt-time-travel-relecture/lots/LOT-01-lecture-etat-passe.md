---
id: "LOT-01"
titre: "Lecture d'un état passé (paramètre asOf)"
statut: "à_faire"
dépend_de: "aucun"
---

# LOT-01 — Lecture d'un état passé (paramètre `asOf`)

> Compilé le 2026-07-19. **Migration-free** : la lecture du passé est un
> **recalcul**, jamais un snapshot persisté.

## But

Permettre au praticien de recharger la fiche telle qu'elle était à une date
passée, pour comprendre ce qu'il savait au moment où il a décidé.

## Résultat observable

Depuis la fiche patient, le praticien choisit un repère daté connu et la fiche
se recharge dans cet état, sous un **bandeau permanent et non ambigu**
« vous lisez l'état du {date} ». Un geste unique ramène au présent. En mode
passé, aucune action d'écriture n'est possible.

## Périmètre

- Paramètre `asOf` (ISO) sur les lectures praticien concernées, **borné aux
  dates de jalons connues** du patient — pas de date libre.
- Réemploi de `construireReponsesParQuestionnaire(reponses, dateLimite)`
  (`web/src/lib/equilibre/depuisPrisma.ts:38-57`), qui sait déjà tronquer.
- Bandeau d'état passé, retour au présent, désactivation des actions d'écriture.

## Hors périmètre

- La **note de relecture** et sa table (**LOT-02**, gate migration G3).
- Toute persistance de snapshot / `ClinicalSnapshot` / `DecisionCard` — refus
  doctrinal (`web/prisma/schema.prisma:676-677`).
- Le comparateur multi-épisodes (**C2B**), la diffusion.
- Toute lecture du passé côté patient.

## Fichiers probables

- `web/src/app/api/praticien/cockpit/route.ts`,
  `web/src/app/api/praticien/trajectoire/route.ts` (paramètre `asOf`).
- `web/src/components/FichePatientPanel.tsx` (bandeau, sélection, verrouillage).
- `web/src/lib/equilibre/depuisPrisma.ts` (aucune modification attendue).

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ni d'écriture Supabase.
- Pas de refactor hors lot.

## Étapes

- [ ] Définir les bornes autorisées de `asOf` et le comportement hors bornes.
- [ ] Étendre les routes de lecture + tests (dont date invalide, date future).
- [ ] Monter le bandeau et le verrouillage des écritures.
- [ ] Vérifier qu'aucune donnée postérieure à `asOf` ne fuit dans la réponse.
- [ ] Exécuter les validations, relire le diff, documenter.

## Tests

- Unitaires : troncature effective, date hors bornes rejetée, date absente =
  comportement actuel inchangé.
- Garde-fou : aucune écriture possible en mode passé.
- E2E : bascule passé → présent, bandeau visible, actions désactivées.

## Critères de done

- L'état d'une date passée est lisible sans ambiguïté sur la date lue.
- Le comportement par défaut (sans `asOf`) est **strictement inchangé**.
- Anti-secrets, type-check, lint, Vitest, `test:worktree` verts.

## Résultats

À compléter à la clôture.
