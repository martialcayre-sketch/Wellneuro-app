# Handoff — 2026-11-16 — besoin 5 : D-529 acceptée, section du guide réécrite (D-312 §3, H15), lot de la file B

## Branche et état Git

- Branche `worktree-b-besoin5-decision-guide`, tirée d'`origin/main` 6a32a9d5 (#2167), avancée sans commit propre par
  `--ff-only` sur 35846ccd ; poussée en `docs/besoin5-decision-guide` (#2171, e34f44d8), puis `origin/main` fusionnée
  par commit de fusion, sur arbitrage du responsable (D-518 §2). Worktree `.claude/worktrees/b-besoin5-decision-guide`, créé pour ce lot.
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
- Motif de la part (§6.3) : aucune note écrite par le responsable ; le motif d'exemple de l'option A est repris, puis
  confirmé par lui en acceptant `D-529`.
- `wn-reviewer` (P0, diff local) : GO avec corrections. P2-2 (renvoi à D-438 §1 et §2) et P2-3 (phrase sur la
  convergence) sont corrigés. P1-1 et P2-1 sont levés par l'acceptation ; la re-signature de P10 et P25 reste due avant
  « prête ».
- Contre-revue Codex P0 (`D-505`) sur e34f44d8 : un constat P1 (forme opaque). Corrigé pour les paraphrases du §1 et du
  §3.2 ; écarté pour les poids de produit, déjà publics. Rendu et verdict en commentaire de #2171.
- `main` a avancé au-delà de la tête poussée : `origin/main` est fusionnée dans la branche (commit de fusion, sans rebase
  ni force-push), sur arbitrage du responsable (D-518 §2) ; une seconde fois après #2170, sur un second accord.
- PR-Agent sur a691af18 : un paragraphe dupliqué au §7 de `D-529`, corrigé ; titre et corps de la PR alignés sur
  « acceptée » ; « positions signées » du plan écarté avec motif (« prête » attend le constat de la re-signature).
- **`D-529` acceptée** par le responsable le 2026-11-16 (« J'accepte, motif tel quel »), après la contre-revue Codex.
  Rang du journal H15 : `03` du 2026-11-16 (`01` et `02` déjà sur `main`).

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
- `npm run check:rapide` (16 étapes vertes, 3 sautées) et `npm run check` (T1 complet, anti-secrets compris) : verts
  avant le premier push ; rejoués avant le second (résultat dans la PR).
- `wn-reviewer` (P0, avant le push) : GO avec corrections ; faits de code vérifiés, bancs du journal et des décisions
  verts (103 sur 103).
- Contre-revue Codex P0 (`D-505`) sur e34f44d8 : code 0, conforme ; rendu déposé sur la PR.
- Pas de T2 : documentation seule.

## Problèmes ouverts

- Re-signature de P10 et de P25 au dossier privé, par le responsable ; constat de la session avant « prête ».
- Pièces attendues du responsable : une source sur l'insomnie chronique (PDF de 0575), textes intégraux du PSQI et de
  l'Epworth, publication primaire du MFI-20, validations du MFI et du questionnaire de Horne, licence et version
  française de l'instrument de mobilité.
- J3-12f (file A) : deux lectures du PSQI et de l'Epworth à l'écran, liste des claims de provenance seule en constante,
  banc « aucune ligne neuve » ; rattachement de `R-SOM-01` et absences en convergence (`D-529` §7).

## Prochaine action exacte

PR #2171 : CI (`wn-attendre-ci.mjs`, seul `0` vaut) ; PR-Agent prouvée, sinon `wn-reviewer` (`D-448`) ; un verdict par
remarque ; constat de la re-signature de P10 et P25 au dossier privé ; boîte B relue ; « prête @<sha> » sur la PR et au
registre ; la ligne du carnet reçoit `pr`. Au merge : questions `20261116-1310-b` à `1312-b` à close.

## Interdits encore actifs

- Aucun code, aucune migration, aucune écriture en base dans ce lot.
- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique au dépôt, ni dans les tests, ni
  dans les messages de commit (`D-251` §4, `D-325` §5).
- Aucune signature ni acceptation à la place du responsable ; pas de merge (intégrateur).
