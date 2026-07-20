---
id: "LOT-01"
titre: "Lecture d'un état passé (paramètre asOf)"
statut: "livré"
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

Livré le 2026-07-20, sans migration.

Écart assumé par rapport au périmètre compilé : les bornes de `asOf` ne sont pas
« les dates de jalons » mais **tous les repères réels du patient** — épisodes
confirmés *et* réponses reçues, exposés par `GET /api/praticien/reperes`. Motif :
`assessment_episodes` est vide en production, une borne limitée aux jalons aurait
rendu la fonction inutilisable le jour de sa livraison. L'intention est tenue —
la date reste bornée à des événements réels, jamais libre.

Le verrouillage des écritures est porté par le **serveur** (`POST` refuse tout
`asOf`, avant même de lire), et non par la désactivation des actions dans
l'écran : la garantie ne dépend donc pas de l'interface. Le montage dans le
cockpit lui-même reste à faire — la lecture passée est exposée sur la page
Consultation copilote, surface déjà entièrement en lecture seule.
