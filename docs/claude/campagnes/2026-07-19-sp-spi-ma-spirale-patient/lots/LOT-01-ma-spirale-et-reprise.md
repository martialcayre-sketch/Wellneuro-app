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
- **Aucune migration dans la PR d'écran.** Le retour du pack est persisté (voir
  ci-dessous), mais sa migration est livrée **avant**, dans sa propre PR : une
  PR de migration doit rester relisible pour ce qu'elle est. Aucune autre
  écriture Supabase dans le lot.
- **Aucun score chiffré, aucune gamification, aucun pronostic** côté patient.
- Pas de refactor hors lot.

## Le chemin retour du pack — arbitré le 2026-07-21

La campagne pose que le pack est **proposé et refusable**. Le lot le posait
aussi qu'il n'écrit rien. Les deux ensemble ne tiennent pas : un refus qu'on ne
persiste pas revient à chaque visite, et une proposition qui revient à chaque
visite **est** une relance — précisément ce que la campagne s'interdit
(« aucune pression, pas de relance culpabilisante »).

**Décision : le refus est persisté.** Un refus éphémère (session, cookie) aurait
suffi à la démonstration, mais pas à la promesse : il ne survit ni à la
déconnexion ni au changement d'appareil, et le praticien ne voit rien de ce que
le patient a décliné.

Conséquences, dans cet ordre :

1. **Une PR de migration seule**, portant l'objet « proposition de pack » et sa
   réponse (proposée / acceptée / déclinée, horodatée). Passe par le
   garde-fou d'écriture : migration committée → PR relue → merge → build Vercel.
2. **Puis la PR d'écran**, qui lit et écrit cet objet sans toucher au schéma.

Ce que la persistance ne change pas : le pack reste **proposé**, jamais
auto-assigné ; un refus reste **sans conséquence** pour le patient ; aucun
compte à rebours, aucune relance ne se déduit d'un refus enregistré. La donnée
sert à **ne pas redemander**, pas à insister.

## Étapes

- [x] Livrer la **migration seule** de l'objet « proposition de pack » (PR à part) — #209.
- [x] Rédiger les textes en français, ton non culpabilisant, relus mot à mot.
- [x] Monter l'accueil et la reprise à partir des composants existants — livré
      par #198 (« Mon parcours »), qui résorbe E11 par la même occasion.
- [x] Implémenter la proposition de pack : refusable, le refus est enregistré et
      **n'a pas d'autre effet** — ni assignation, ni envoi, ni relance.
- [x] Vérifier les invariants patient par test (unitaires, route, composant).
- [x] **E2E du refus** — livré le 2026-07-22 (#224).
- [x] Exécuter les validations, relire le diff, documenter.

### L'E2E du refus — livré (2026-07-22, #224)

Le parcours de bout en bout est désormais couvert
(`e2e/portail-pack-reevaluation.spec.ts`). L'obstacle initial n'était pas le banc
mais le **choix du patient** : `PAT_SEED_03` (Michel) est partagé avec
`portail-parcours` et `portail-lien-magique`, qui tournent en parallèle sur la
même base éphémère — le mettre en reprise les aurait cassés. `PAT_SEED_02`
(Jennifer Martin) est seedée et utilisée par aucun autre spec : le helper
`preparerReprisePourTest` la met dans l'état d'un retour après longue absence
(jeton, réponses antidatées, accusé TRUST déjà donné) sans gêner personne.

Le test prouve les trois invariants : la proposition s'affiche avec ses deux
réponses au même niveau et aucun chiffre ; le refus s'enregistre et affiche son
accusé ; **au rechargement la question ne se repose pas**. Vert sur Chromium et
iPhone 13.

Le lot est complet : domaine (`packReevaluation.test.ts`), route
(`pack-reevaluation/route.test.ts`), composant, et ce parcours navigateur.

## Tests

- Unitaires : composition du récit, cas « aucune activité », cas « reprise ».
- Garde-fou : aucun score chiffré, aucune donnée praticien dans la réponse
  patient ; le pack proposé ne crée aucune assignation ; un refus enregistré ne
  déclenche ni envoi ni relance.
- E2E : parcours patient complet, y compris le refus du pack — et le retour sur
  l'écran après refus, qui ne redemande pas.
- Accessibilité : contraste AA, cibles ≥ 44 px, focus visible, aucune fonction
  critique au seul survol.

## Critères de done

- Le patient comprend où il en est sans qu'aucun chiffre ne le note.
- La reprise propose et n'impose pas.
- Anti-secrets, type-check, lint, Vitest, `test:worktree` verts.

## Résultats

À compléter à la clôture.
