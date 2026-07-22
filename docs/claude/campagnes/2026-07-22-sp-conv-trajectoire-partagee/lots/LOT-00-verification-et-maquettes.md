---
id: "LOT-00"
titre: "Vérification registre ↔ état réel, annotations, maquettes de campagne"
statut: "livré — 2026-07-22, PR de lot (annotations + rectification README + 3 maquettes) ; constats revérifiés sur main post-merge #280"
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

- [x] Revérifier sur `main` à jour les six constats « Pourquoi cette
      campagne » du CAMPAGNE.md (le dépôt bouge vite : V13/V14 sont
      arrivés le jour même de l'audit).
- [x] Poser les trois annotations documentaires (quatre fichiers, les deux
      documents du gate étant annotés).
- [x] Produire les trois maquettes contre
      `maquette-artifact-reference.html` (DA, tokens §10, 44 px).
- [x] Relire le diff.

## Tests

Aucun (documentaire). `bash scripts/check_no_secrets.sh --staged`.

## Critères de done

Les quatre résultats observables sont constatables ; aucune modification
hors `docs/`.

## Résultats

Livré le 2026-07-22, dans la même session que le cadrage :

- **Constats revérifiés** sur `main` post-merge de #280 : les six ancrages
  du CAMPAGNE.md tiennent (phase `'decision'` en dur, Spirale `aria-hidden`,
  Trajectoire sans filtre, étapes 5/6 jamais actives, « En baisse » +
  barres, tiroir 40 px).
- **Annotations posées** : encart de rectification daté en tête de
  `docs/ai/AUDIT_UX_CONVERGENCE_SPIRALE_5-0.md` ; mention « Résolue par G2
  le 2026-07-19 » en tête de `BRAINSTORM_GATE_MULTI_CYCLES.md` **et**
  `ARBITRAGES_GATE_MULTI_CYCLES.md` ; ligne C2B de `campagnes/README.md`
  rectifiée (gate levé, plus « différé »).
- **Trois maquettes livrées** dans `maquettes/`, rendues et vérifiées au
  navigateur : `bandeau-cockpit-adaptatif.html` (D5 + D10, chrome une
  ligne, cockpit espace restant), `parcours-patient-synchronise.html`
  (D2 + D7 + D11, trois états du journey, a11y annoncée),
  `mon-equilibre-qualitatif.html` (D7, avant/après, distinction constats
  calculés / recommandation validée).
- Écart au périmètre prévu : néant ; la vérification du registre n'a révélé
  aucun autre document périmé que la ligne C2B déjà identifiée.
