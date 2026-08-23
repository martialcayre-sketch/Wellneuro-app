---
id: "LOT-05"
titre: "Jalons — l'évaluation ancrée à la version de l'objectif"
statut: "à_faire"
dépend_de: "LOT-04"
---

# LOT-05 — Jalons : l'évaluation avec le patient

## But

Aux jalons J21/J42/J90, inviter le patient (portail, pull) à dire **où il en
est par rapport à son objectif** — réponse en mots, plus une EVA restituée
**brute** (sans seuil, sans bande, sans agrégation), ancrée à la version
exacte de l'objectif.

**Classe P0 (portail/patient) : revue `wn-reviewer` + passe Codex avant PR.**

## Résultat observable

- Sur le portail, quand un jalon est atteint (fenêtre `JOURS_JALON` +
  `TOLERANCE_JOURS_JALON` existantes) et qu'un objectif ratifié ou amendé
  existe : une question d'étape s'affiche — texte libre + EVA facultative.
- La réponse est un événement append-only référençant `idObjectif` (version
  exacte) et le jalon ; deux dates (événement/enregistrement).
- Au cockpit, la trajectoire de l'objectif affiche les réponses d'étape —
  comme un récit, jamais une courbe avec seuils, jamais une moyenne.
- Si un instrument publié (Goal Attainment Scaling) doit un jour structurer
  cette mesure : **décision de provenance dédiée, hors de ce lot** — ce lot
  ne pose aucun barème.

## Périmètre

- Table d'événement (si le LOT-00/LOT-01 ne l'a pas déjà prévue :
  **avenant de migration à confirmation obligatoire**, même régime que le
  LOT-01).
- `web/src/app/api/portail/` (route dédiée ou extension dossier — arbitrage
  en ouverture de lot).
- `web/src/components/patient-companion/` (question d'étape).
- Cockpit : affichage dans la trajectoire.

## Hors périmètre

- Tout rappel/relance automatique (le portail reste en pull).
- Tout calcul sur l'EVA (`DC-19`/`DC-20` — aucun seuil, aucune bande).
- Toute modification du calcul des jalons (`equilibre/constants.ts` se lit,
  ne se modifie pas).

## Fichiers probables

- `web/src/lib/equilibre/constants.ts` (lecture seule — `JOURS_JALON`,
  `TOLERANCE_JOURS_JALON`)
- routes et composants du périmètre

## Interdits

- Pas de note, score dérivé, taux d'atteinte ni classement d'objectifs.
- L'absence de réponse à un jalon n'est jamais rendue comme un manquement
  (`DC-24` — silence ≠ réponse ; libellés non-jugeants).
- Jamais journaliser le texte patient.

## Étapes

- [ ] Arbitrer la forme (route dédiée vs extension) et, si table neuve,
      obtenir la **confirmation migration**.
- [ ] Événement + route (auth, drapeau, version exacte, bornes).
- [ ] UI portail + rendu cockpit (récit, EVA brute).
- [ ] Gardes vues rouges (append-only, aucun calcul sur EVA).
- [ ] T1 ; T2 ; revue `wn-reviewer` ; **passe Codex** (P0) ; T3 si
      migration.

## Tests

- Fenêtre de jalon respectée (dans/hors tolérance) ; ancrage à la version ;
  append-only ; EVA hors bornes refusée par motif ; aucun agrégat exposé.

## Critères de done

- Parcours d'étape complet derrière drapeau ; récit visible au cockpit ;
  revues P0 tracées ; T2/T3 verts.

## Résultats

À compléter à la clôture.
