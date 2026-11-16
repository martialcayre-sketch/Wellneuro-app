# Handoff — 2026-11-16 — besoin 5 : D-529 proposée, section du guide réécrite (D-312 §3, H15), lot de la file B

## Branche et état Git

- Branche `worktree-b-besoin5-decision-guide`, tirée d'`origin/main` 6a32a9d5 (#2167), avancée sans commit propre par
  `--ff-only` sur e6412209 (#2162). Worktree `.claude/worktrees/b-besoin5-decision-guide`, créé pour ce lot.
- Session concurrente (file B) : `git` et `gh` en direct, pas de `/wn-*`.

## Objectif

Lot `besoin5-decision-guide` du carnet (file B, ordre 71). Réécrire la section du besoin 5 du guide sur les vingt-cinq
positions signées, sous forme opaque, par une décision au gabarit de `D-526` ; J3-12f l'appliquera. Documentation seule.

## Décisions prises

- Boîte B relue au démarrage : aucun message à la file B. Lot passé à `pris` au carnet.
- Numéro `D-529` réservé par `wn-reserver-decision.mjs` (`refs/tags/reserve/D-529`).
- Inventaire du code : deux lignes lisent la bande du PSQI (`R-SOM-01`, `BIO-SOM-01`), alors que P25 signée l'excluait ;
  sept lignes rattachées au besoin partent du questionnaire de mode de vie ou d'une déclaration. Aucune ligne ne lit
  l'Epworth, la fatigue générale du MFI-20, l'indice de l'agenda ni le sous-score d'activité physique.
- Trois questions cliniques versées à la liste commune (`20261116-1310-b` à `1312-b`), avis de Codex à l'aveugle joint
  (`D-505`, A, A, A, confiance moyenne), tranchées par le responsable le 2026-11-16 : A, A, A, avec Codex et la
  recommandation de la session. Lignes passées à `repondue`.
- Sur la réponse à `1310-b`, P10 et P25 sont amendées au dossier privé (onglet « Positions v0.2 », rev 31), cases
  décochées : **à re-signer** par le responsable. Note d'amendement en tête de l'onglet.
- Motif de la part (§6.3) : aucune note écrite par le responsable ; le motif d'exemple de l'option A est repris, marqué
  « à confirmer à l'acceptation ».
- Statut de `D-529` : **proposé**. Rang du journal H15 : `03` du 2026-11-16 (`01` et `02` déjà sur `main`).

## Fichiers modifiés

- `docs/decisions/D-529.md` (nouveau) ;
- `docs/claude/GUIDE_12_BESOINS_NEURONUTRITION.md` : section du besoin 5 ;
- `docs/claude/PLAN_WELLNEURO.md` : les deux lignes J3-12f et la ligne « dossiers des autres besoins » ;
- `docs/claude/plan-journal/H15/2026-11-16-03-besoin-5-decision-guide.md` (nouveau) ;
- `changelog.d/2026-11-16-besoin-5-decision-guide.md` (nouveau) ; ce handoff.
- Hors dépôt : le dossier privé du besoin 5 (P10, P25, note d'amendement) ; la liste commune et le carnet (page de la
  file D).

## Validations exécutées

- Avis Codex à l'aveugle sur les trois questions : code 0, conformes (paquets dans le scratchpad de session, empreintes
  sur les lignes de la liste commune).
- T1 rapide, T1 complet et revue `wn-reviewer` (P0, avant le push) : résultats dans la PR.
- Contre-revue Codex P0 (`D-505`) sur le diff poussé : rendu déposé sur la PR.
- Pas de T2 : documentation seule.

## Problèmes ouverts

- Acceptation de `D-529` par le responsable, avec confirmation ou réécriture du motif du §6.3.
- Re-signature de P10 et de P25 au dossier privé.
- Pièces attendues du responsable : une source sur l'insomnie chronique (PDF de 0575), textes intégraux du PSQI et de
  l'Epworth, publication primaire du MFI-20, validations du MFI et du questionnaire de Horne, licence et version
  française de l'instrument de mobilité.
- J3-12f (file A) : deux lectures du PSQI et de l'Epworth à l'écran, liste des claims de provenance seule en constante,
  banc « aucune ligne neuve » ; rattachement de `R-SOM-01` et absences en convergence (`D-529` §7).

## Prochaine action exacte

PR de documentation ; CI (`wn-attendre-ci.mjs`, seul `0` vaut) ; PR-Agent prouvée, sinon `wn-reviewer` (`D-448`) ; un
verdict par remarque ; boîte B relue ; « prête @<sha> » sur la PR et au registre ; la ligne du carnet reçoit `pr`.
Avant « prête » : acceptation de `D-529` et re-signature de P10 et P25 par le responsable, comme pour `D-526`
(constat P1-1 de `wn-reviewer`) ; passer alors le statut à « accepté » dans la décision, le fragment de changelog et le
fragment du journal.

## Interdits encore actifs

- Aucun code, aucune migration, aucune écriture en base dans ce lot.
- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique au dépôt, ni dans les tests, ni
  dans les messages de commit (`D-251` §4, `D-325` §5).
- Aucune signature ni acceptation à la place du responsable ; pas de merge (intégrateur).
