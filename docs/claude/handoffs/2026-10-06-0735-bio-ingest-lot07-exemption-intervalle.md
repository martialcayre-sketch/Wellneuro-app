# Handoff — 2026-10-06 — BIO-INGEST LOT-07, lot de suite : exemption de l'intervalle

## Branche et état Git

`feat/bio-ingest-lot07-exemption-intervalle`, depuis `main` 84cfda84. Aucune
migration, aucun changement de schéma.

## Objectif

Exempter l'intervalle imprimé de la sentinelle BP-01, comme la marque
(arbitrage du responsable du 2026-10-06, `D-267` §6).

## Décisions prises

- `D-267` §6 : précision datée du 2026-10-06, sans nouveau numéro (même forme
  que la précision de §5).
- Intervalle rendu dans `<span data-fait-laboratoire="intervalle">`, texte brut
  seul ; libellé « intervalle » hors de l'élément ; rendu inchangé.
- `assertSentinelleBiologie` exempte les deux sélecteurs exacts, et eux seuls ;
  enfant ou attribut autre que le marqueur ⇒ rouge ; tout autre
  `data-fait-laboratoire` reste lu.
- Exemples de §6 en mots seuls (aucun nombre de seuil dans la décision).

## Fichiers modifiés

`docs/DECISIONS.md`, `FaitsDuLaboratoire.tsx`, `e2e/helpers/sentinelle.ts`,
`sentinelle-marquage.spec.ts`, `EstimeMesurePanel.test.tsx`,
`ImportCompteRenduPanel.test.tsx`, fiche LOT-07, fragment changelog, ce handoff.

## Validations exécutées

- Vitest ciblé : 74 verts ; T1 rapide vert ; T2 `--fast` : voir PR.
- `wn-reviewer` : GO, ni P0 ni P1. P2 corrigés : motif du rejet vérifié
  (marqueur inconnu), classe neutre pour isoler le contrôle d'attributs,
  contrôle mort `\bélevée?\b` remplacé par une frontière `\p{L}`.

## Problèmes ouverts

- Risque accepté (P2-e) : l'exemption couvre jusqu'à 300 caractères extraits
  par le modèle, anxiogène compris ; seuls la consigne §4 et la relecture
  (LOT-09) y répondent.
- `assertSentinelleBiologie` n'a encore aucun appelant sur un écran réel
  (première surface patient : BP-16).

## Prochaine action exacte

1. PR, CI (`wn-attendre-ci.mjs`), commentaires de revue lus.
2. Passe Codex : décision du responsable (`D-267` §9 visait migration et code
   du LOT-07) — pas de merge sans son verdict.
3. Merge, constat du déploiement ; puis LOT-09.

## Interdits encore actifs

- Rien sur `ResultatBiologique` ; aucun intervalle recalculé, comparé ni
  citable ; aucune couleur, aucun tri, aucun statut tiré des faits.
- Aucune autre exemption de la sentinelle sans décision.
