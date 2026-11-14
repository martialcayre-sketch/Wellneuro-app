# Handoff — 2026-11-14 — BP-17, PR 7 : la liste des options du besoin 2 transcrite, non signée (D-521)

## Branche et état Git

- Branche `feat/bp17-pr7-contenus`, worktree `bp17-garde`, créée depuis
  `origin/main` (`1eafae00`).
- Le lot `bp17-pr7-contenus` est inscrit au carnet (file C, ordre 70). Il a
  été rangé `bloque`, faute de liste, puis repris après l'adoption.
- PR **P0** : module clinique signé de la campagne BIO-PARCOURS.
  `wn-reviewer` passe avant le push, la passe Codex (D-505) après lui, et
  T3 est exigé.
- **Release-db au merge**. `bibliothequeBesoin2V1.ts` et
  `web/prisma/checks/rag_claim_fraicheur_tables_signees_v1.sql` sont des
  chemins déclencheurs : le merge lance le run. Celui-ci attend
  l'intégrateur tant que l'environnement garde ses relecteurs (D-520 §6).
  Ni migration ni `schema.prisma`.
- Avancée en `--ff-only` sur `711cd281` (#2123, doc F05 sans recoupement)
  avant la première édition qui l'exigeait (D-518 §1).
- `#2113` (garde-cockpit-fermeture) est mergée (`d57c22e2`).

## Objectif

PR 7 du découpage de D-480 : transcrire en identifiants et renvois la liste
des options du besoin 2 que fournit le responsable. La structure reste non
signée. Les textes à l'atelier et la signature restent au responsable.

## Décisions prises

- **Réattribution** (`20261114-1425-c`, répondue dans la session) : la
  transcription passe à la file C, pour cette PR seulement.
- **Adoption** (réponse « adoptée pour transcription » dans la session) :
  la proposition v1 avait été rédigée par une session, à la demande du
  responsable. Elle est hors du dépôt, sous `~/.wellneuro/corpus/bp17-pr7/`.
  Le responsable l'adopte comme sa liste à transcrire. Ce n'est ni une
  validation clinique, ni une signature.
- **[[D-521]]**, rédigée par l'assistant :
  - elle consigne l'adoption, la transcription et dix réserves à lever
    avant la signature ;
  - ses réserves sont écrites par option et par mécanisme, sans rattacher
    un claim à sa rubrique (D-325 §5, D-251 §4) ;
  - le détail reste dans la note privée ;
  - elle amende D-480 §7 pour la seule PR 7, avec un renvoi « Amendé pour
    la PR 7 par » dans D-480.
- **Question clinique `20261114-1435-c`** (fraîcheur des claims d'appui
  d'une position source de dose) : ouverte. La recommandation est de la
  trancher avant la signature. Aucune position n'est citée.
- **Le banc** (`bibliothequeBesoin2V1.test.ts`) épingle la nouvelle
  empreinte, les seize identifiants, la répartition par hypothèse, la
  population adulte seule, 84 claims, aucune position, trois sources de
  dose et aucun critère d'arrêt documenté. Il n'associe aucun claim nommé
  à une rubrique.

## Fichiers modifiés

- `web/src/lib/bibliotheque-options/bibliothequeBesoin2V1.ts` (seize
  options, commentaires de tête et de métadonnées)
- `web/src/lib/bibliotheque-options/bibliothequeBesoin2V1.test.ts`
- `web/src/lib/atelier-bibliotheque-options/lecture.test.ts`
- `web/prisma/checks/rag_claim_fraicheur_tables_signees_v1.sql` (87 paires)
- `web/prisma/checks/rag_claim_fraicheur_tables_signees_v1_negatif.sql`
  (prédicat recopié, 87 paires de fixtures, cas `N16` et `N17`)
- `web/src/lib/atelier-bibliotheque-options/cockpit.test.ts` (titre)
- `scripts/wn-matrice-consommation.mjs` (libellé) et
  `docs/claude/MATRICE_CONSOMMATION.md` (régénérée)
- `docs/decisions/D-521.md` (nouvelle), `docs/decisions/D-480.md` (renvoi)
- `changelog.d/2026-11-14-bp17-pr7-transcription-options.md`
- `docs/claude/plan-journal/F11/2026-11-14-04-transcription-options-besoin2.md`
- ce handoff

## Validations exécutées

- **YAML et JSON** de la proposition : identiques, par un script local.
  Le littéral TS a été généré depuis le YAML.
- **Bancs** de la bibliothèque, de l'atelier, de ses composants, du contrat
  de fraîcheur et des positions : 222 verts, 13 sautés (bancs sur base
  réelle).
- **Garde du journal** (`wn-plan-journal-rubriques`) : verte après la
  réécriture du fragment.
- **Négatif SQL** joué sur la base locale du worktree (`wn-dev-db.sh
  --migrate`) : vert. Deux copies mutées, hors du dépôt, le font rougir :
  - prescriptif non exigé sur la ligne de dose : rouge en `N16` ;
  - ligne de `bibliotheque_options` retirée : rouge en `N17`.
- **T1 complet** : vert.
- **Premier T3** : 7 rouges hors lot, sous une charge de 23
  (`ProtocolMiniBuilder` et les bornes de performance de `masquage`). Les
  mêmes rouges figuraient déjà au handoff de la PR 6. Rejoués seuls :
  272 verts. Le segment E2E n'a pas tourné : T3 est à rejouer en entier.
- **`wn-reviewer`** (P0) : GO, sans P0 ni P1.
  - P2-1 (D-521 laissait deviner la nature de certaines options) : corrigé.
  - P2-2 (aucun cas négatif sur les deux tables neuves) : corrigé par
    `N16` et `N17`.
  - P3-1 (libellé de la matrice) et P3-2 (titre de test) : corrigés.
  - P3-3 (comptes de D-521, chapeau du §3, amendement de D-480 §7) :
    corrigé.
  - P3-5 (constat de la release-db) : corrigé ci-dessous.
  - P3-4 (journal d'en-tête du contrat) : écarté. `fiches_usage` et
    `portes_biologiques` n'y ont pas d'entrée non plus, la trace de
    vérification est privée à la session de rédaction, et le préflight de
    la release-db rejoue les 87 paires.
- **Codex** : voir la PR.

## Problèmes ouverts

- **Les dix réserves de D-521 §3** se lèvent avant la signature.
- **La question clinique `20261114-1435-c`** est ouverte.
- **La release-db** lancée au merge : l'intégrateur l'approuve pendant la
  période transitoire (D-520 §6). Le constat se lit dans le run : préflight
  de fraîcheur vert et sentinelle `WN_RELEASE_DB_OK id=<run>`. La structure
  n'est pas en base : il n'y a pas d'empreinte à lire par conteneur.
- **Les textes à l'atelier** : saisis par le responsable. Tout texte
  devient « à relire » si la structure est retouchée.

## Prochaine action exacte

1. Lancer T3, puis `wn-reviewer` sur le diff local, et corriger.
2. Pousser et ouvrir la PR. Lancer la passe Codex sur le diff poussé
   (`wn-codex-avis.mjs`), puis `wn-attendre-ci` et `wn-revue-pr-agent`.
3. Déclarer « prête @<sha> » à l'intégrateur. Il passe la sonde
   release-db, et fait le constat après approbation.

## Interdits encore actifs

- Aucune option, dose, durée, précaution ni contre-indication rédigée ou
  complétée par une session. La structure se retouche seulement sur une
  liste adoptée par le responsable.
- Aucune signature cochée par l'outil. Aucun texte clinique au dépôt, aucun
  claim rattaché à une rubrique dans la prose.
- Ni migration ni `schema.prisma`. Le drapeau du cockpit reste éteint.
- Aucun lecteur de `creePar` ni de `validePar` (D-459 §7).
- Ne pas reposer D-480, D-514, le découpage ni les arbitrages BP-17.
