# Brief compilé — Certification questionnaires, consolidation 62/64

_Compilé le 2026-08-02 à partir de l'audit du dépôt et des branches._

## Objectif

Consolider l'historique de développement et de certification des questionnaires
sur `campagne/certification-questionnaires-consolidation`, sans réimporter ce
qui est déjà sur `main` et sans modifier la logique clinique.

## Constat vérifié

- `docs/questionnaires-drive-mapping.md` recense 64 questionnaires.
- Le dossier `docs/claude/propositions/2026-07-29-certification-montee/`
  documente un `verdictScoring` renseigné sur 62 entrées sur 64.
- Les deux exceptions sont `Q_PED_02`, débaptisé en raison de la licence et de
  l'identité de la source Conners enseignant, et `Q_PED_03`, suspendu jusqu'à
  disponibilité d'un scoring dimensionnel et de tables normatives opposables.
- Les deux questionnaires existent déjà dans
  `web/src/lib/questionnaires/pediatrie.ts`.
- Trente-six branches non mergées satisfont le périmètre reproductible de
  LOT-00 : 15 sont déjà intégrées ou obsolètes et 21 restent à comparer.

## Découpage recommandé

1. Inventorier et classer les 36 branches.
2. Relire les 21 branches dont un apport unique reste possible.
3. Consolider l'état 62/64 dans les sources canoniques sans changer le scoring.
4. Valider, produire le handoff et proposer le nettoyage séparément.

## Garde-fous

- Pas de fusion ou cherry-pick en bloc.
- Pas de suppression de branche dans les lots.
- Toute modification clinique ou de scoring déclenche un arrêt, une source
  explicite et un plan séparé soumis au palier T3.
- Aucun besoin de migration, d'authentification ou de Supabase n'est identifié.
