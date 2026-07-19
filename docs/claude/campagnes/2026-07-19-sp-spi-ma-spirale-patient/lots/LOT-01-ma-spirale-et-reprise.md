---
id: "LOT-01"
titre: "« Ma spirale », reprise en douceur et pack proposé"
statut: "à_faire"
dépend_de: "IDP / LOT-01"
---

# LOT-01 — « Ma spirale », reprise en douceur et pack proposé

> Compilé le 2026-07-19. Dépend d'**IDP / LOT-01** : la reprise à plusieurs mois n'a
> de sens qu'avec une identité durable — cette campagne refuse de la faire
> reposer sur un lien permanent.

## But

Donner au patient un point d'arrivée qui **raconte son parcours** plutôt qu'une
liste de questionnaires, et lui offrir une reprise sans pression après une
absence.

## Résultat observable

Le patient arrive sur « Ma spirale » : où il en est, ce qu'il a fait, ce qui
vient. S'il revient après une longue absence, il lit « voici où vous vous étiez
arrêté » et se voit **proposer** un pack de réévaluation qu'il peut décliner
sans conséquence. Aucun chiffre de score n'apparaît nulle part.

## Périmètre

- Accueil patient trajectoire, réemployant les composants livrés en Vague 1.
- Écran de reprise en douceur.
- Proposition de pack de réévaluation pré-composé — **jamais auto-assigné**.

## Hors périmètre

- L'authentification (**IDP**).
- La météo d'adhésion, **praticien seul** (**SP-MET**).
- Toute donnée réservée au praticien : discordances, objets cliniques, momentum
  chiffré, versions de scoring.
- L'assignation elle-même, qui reste un geste praticien.

## Fichiers probables

- `web/src/app/portail/[token]/…` (accueil et reprise).
- `web/src/components/patient/…` — réemploi de `PatientJourneyProgress`,
  `ReadingComfortControl`, `MonEquilibreAccueil.tsx`, `components/patient/ui/*`.
- `web/src/lib/fil/cartes.ts` — le signal de reprise praticien réserve déjà
  cette campagne (`:160-163`).

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ni d'écriture Supabase.
- **Aucun score chiffré, aucune gamification, aucun pronostic** côté patient.
- Pas de refactor hors lot.

## Étapes

- [ ] Rédiger les textes en français, ton non culpabilisant, relus mot à mot.
- [ ] Monter l'accueil et la reprise à partir des composants existants.
- [ ] Implémenter la proposition de pack (refusable, sans effet de bord).
- [ ] Vérifier les invariants patient par test.
- [ ] Exécuter les validations, relire le diff, documenter.

## Tests

- Unitaires : composition du récit, cas « aucune activité », cas « reprise ».
- Garde-fou : aucun score chiffré, aucune donnée praticien dans la réponse
  patient ; le pack proposé ne crée aucune assignation.
- E2E : parcours patient complet, y compris le refus du pack.
- Accessibilité : contraste AA, cibles ≥ 44 px, focus visible, aucune fonction
  critique au seul survol.

## Critères de done

- Le patient comprend où il en est sans qu'aucun chiffre ne le note.
- La reprise propose et n'impose pas.
- Anti-secrets, type-check, lint, Vitest, `test:worktree` verts.

## Résultats

À compléter à la clôture.
