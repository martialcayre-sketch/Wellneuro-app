# Handoff — 2026-10-10 — BIO-INGEST : lot de clôture (LOT-12), campagne close

## Branche et état Git

`docs/bio-ingest-lot-cloture`, dans le worktree `.claude/worktrees/bio-ingest-cloture`,
tirée de `origin/main` puis avancée en avance rapide seule sur `c1c0757f`
(#1389, branche vide à ce moment-là). La copie principale portait la PR #1389
d'une autre session : elle n'a pas été touchée. Une PR, une finalité : clore
BIO-INGEST.

## Objectif

Solder ce que la contre-revue adverse laissait ouvert (B2, D4), réaligner les
fiches sur le code, verser le constat d'usage et clore la campagne.

## Décisions prises

- **B2** est inscrite sous sa forme exacte, avec quatre issues : clos à la
  relance, à l'écart, à l'échéance de purge, ou supprimé par un retrait
  (vérifié dans l'arbre). Voir `LOT-12-cloture.md` §1 et la fiche LOT-08.
- **D4** : vraie sur le modèle, le sous-traitant, le document entier et la
  purge à 30 jours. Elle était fausse par omission sur les sauvegardes. La
  rétention est établie : 12 mois au plus après la purge (politique publiée
  par Scalingo pour le plan Business ; la CLI concorde).
- Arbitrage du responsable : **déclarer dans ce lot**, et non en suite
  séparée. Il a validé le texte court, sans affirmation sur le chiffrement ni
  sur le lieu. Résultat : `donnees_confidentialite` **v14**, avec accusé
  (motif de la v10). Précision datée sous `D-258`, sans nouvelle D-xxx.
- État machine : `idle`. Le créneau primaire est libre ; son attribution
  revient au responsable. Les campagnes parallèles sont inchangées.

## Fichiers modifiés

- `web/src/lib/trust/contenus/registre.ts` (v14) et `registre.test.ts`
  (liste, version courante, banc mot pour mot de la v14)
- `docs/DOSSIER_RGPD.md` (rubrique 8), `docs/DECISIONS.md` (`D-258`, précision)
- `docs/claude/campagnes/2026-09-30-bio-ingest/` : `lots/LOT-12-cloture.md`
  (neuf), `CAMPAGNE.md`, fiches LOT-02, LOT-07, LOT-08,
  `REVUE_CODEX_ADVERSE_2026-10-10.md` §3
- `.wn/state.json`, `docs/claude/campagnes/ACTIVE_CAMPAIGN.md` (régénérée par
  `rendreVueCampagnesActives`), `docs/architecture/bioflow/BIOFLOW_ROADMAP.md`
- `changelog.d/2026-10-10-bio-ingest-cloture-campagne.md`,
  `docs/claude/SESSION_LOG.md`
- Hors dépôt : suivi BioFlow (i13, i18, i26 mis à jour ; i27 ajouté)

## Validations exécutées

- Bancs TRUST : 10 fichiers, 74 tests verts (empreinte de la v14 calculée par
  le banc).
- `npm run check:rapide` vert.
- `npm run check` et `npm run test:worktree -- --fast` : voir la PR.
- Production, en lecture seule par conteneur et en agrégats :
  - `one-off-820` : version du procédé ;
  - `one-off-8044` : constat d'usage ;
  - `backups` : liste des sauvegardes.

## Problèmes ouverts

- Après merge, constater le déploiement et l'empreinte de la v14 servie par
  l'image (`D-248`). Chaque patient repasse alors par « Avant de commencer ».
- Le constat d'usage pris plus tôt le même jour (mémoire, « 0 transmission
  patient ») est périmé : 3 transmissions patient le 2026-10-10.
- 3 imports en échec `document_illisible` le 2026-10-10 : constat, sans
  conclusion de parcours (`D-125`).
- Réserves inchangées : localisation de l'inférence et rétention chez
  Anthropic (rubrique 7) ; durée de la trace d'import (rubrique 8, échéance
  2026-10-21) ; M1 à M11 et M15 sans résultat.

## Prochaine action exacte

PR de ce lot. Attendre le CI avec `wn-attendre-ci`, lire les commentaires en
ligne, merger, puis constater le déploiement et l'empreinte `3b6bbc90…` de la
v14 dans l'image servie. Ensuite `/clear`.

## Interdits encore actifs

- Aucune reformulation de la v14 sans nouvelle validation du responsable : le
  banc la tient mot pour mot.
- Lecture de production par conteneur seulement, en agrégats, sans
  identifiant de dossier dans le dépôt.
- Pas de seconde passe Codex sans signal.
- Aucun `checkout`/`switch` dans la copie principale (autre session).
