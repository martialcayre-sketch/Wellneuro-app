---
id: "LOT-00"
titre: "Vérification registre ↔ état réel, annotations, maquettes de campagne"
statut: "à_faire"
dépend_de: "—"
---

# LOT-00 — Vérification registre ↔ état réel, annotations, maquettes de campagne

## But

Ouvrir la campagne sur un état documentaire honnête (règle A3 : « toute
compilation commence par une vérification du registre contre l'état réel »),
purger les écarts fantômes hérités de l'audit du 2026-07-22, et produire les
maquettes propres de la campagne (rectification du 2026-07-19 : la maquette
de référence ne fournit que l'ossature).

## Résultat observable

- L'audit `docs/ai/AUDIT_UX_CONVERGENCE_SPIRALE_5-0.md` porte un encart de
  rectification daté (time-travel livré par SP-TT ; gate G2 levé le
  2026-07-19 ; métriques supprimées par V14 ; référentiel 44 px ;
  `PatientButton`/`danger-text` disparus).
- La proposition `2026-07-18-gate-modele-multi-cycles/` porte en tête la
  mention « résolue par G2 le 2026-07-19 (migration
  `c2b_cycle_identity_v1`) — conservée comme trace du raisonnement ».
- La ligne C2B de `campagnes/README.md` (« gate modèle multi-cycles
  différé », périmée) est rectifiée.
- Trois maquettes de campagne existent dans le dossier de campagne :
  bandeau cockpit (position d'épisode + chip delta + « Phase due »), états
  synchronisés du parcours patient (6 étapes, formulations D7), « Mon
  équilibre » qualitatif (sans barres proportionnelles).

## Périmètre

Documentaire seul : `docs/ai/`, `docs/claude/propositions/` (annotations en
tête, jamais de réécriture), `docs/claude/campagnes/README.md`, maquettes
HTML statiques dans `docs/claude/campagnes/2026-07-22-sp-conv-trajectoire-partagee/maquettes/`.

## Hors périmètre

Tout code applicatif ; `REGISTRE_FRONTIERES.md` (amendé par les lots qui
actent, pas par la vérification) ; `.wn/state.json`.

## Fichiers probables

- `docs/ai/AUDIT_UX_CONVERGENCE_SPIRALE_5-0.md` (encart en tête)
- `docs/claude/propositions/2026-07-18-gate-modele-multi-cycles/BRAINSTORM_GATE_MULTI_CYCLES.md` (mention en tête)
- `docs/claude/campagnes/README.md` (ligne C2B)
- `docs/claude/campagnes/2026-07-22-sp-conv-trajectoire-partagee/maquettes/*.html` (créés)

## Interdits

- Pas de secret.
- Pas de donnée patient réelle (Sophie Nicola, Jennifer Martin, Michel Dogné seuls).
- Pas de migration ou écriture Supabase.
- Pas de réécriture de documents historiques — annotations datées en tête
  uniquement.

## Étapes

- [ ] Revérifier sur `main` à jour les six constats « Pourquoi cette
      campagne » du CAMPAGNE.md (le dépôt bouge vite : V13/V14 sont
      arrivés le jour même de l'audit).
- [ ] Poser les trois annotations documentaires.
- [ ] Produire les trois maquettes contre
      `maquette-artifact-reference.html` (DA, tokens §10, 44 px).
- [ ] Relire le diff.

## Tests

Aucun (documentaire). `bash scripts/check_no_secrets.sh --staged`.

## Critères de done

Les quatre résultats observables sont constatables ; aucune modification
hors `docs/`.

## Résultats

À compléter à la clôture.
