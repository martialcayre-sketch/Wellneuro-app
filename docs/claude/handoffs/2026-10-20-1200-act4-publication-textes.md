# Handoff — ACT-4 : la publication des textes, prête et non mergée

## Branche et état Git

`lot/act4-publication` (worktree `act4-preparation`), partie de `origin/main` 81b906e2 (#1598 mergée et déployée). PR en **brouillon**, à merger seulement à l'ouverture d'ACT-4. Sans migration ni `schema.prisma`.

## Objectif

Porter au registre les textes validés le 2026-10-20 (parties A3 et B de `docs/claude/propositions/2026-10-20-act4-textes/README.md`), pour que l'ouverture d'ACT-4 ne demande plus qu'un merge, un drapeau et l'envoi de l'e-mail.

## Décisions prises

- Partie B validée par le responsable. Une cinquième question (B5) : la phrase du filet, en partie 5 des conditions, nomme « le compte rendu de vos analyses biologiques ». Le dépôt de documents reste sans accusé (arbitrage 2 de G-11). D-330, amendement complété.
- `donnees_confidentialite@v19` : accusé exigé, comme de la v16 à la v18. Seule la version courante en réclame un, et l'accueil en trois textes des dossiers mineurs ou sans date de naissance le lit encore.
- `conditions_utilisation@v2` : parties 1, 2 et 4 de la v1, partie 3 = v19, partie 5 de la v1 avec la seule phrase B5 ; titre et résumé inchangés.
- Gabarit `conditions_utilisation@2` : `getGabarit` rend la version la plus haute, il part dès que la v2 est en vigueur.
- La PR ne se merge pas avant l'ouverture. Dès son déploiement, la v2 est courante : le filet du dépôt du compte rendu exige son accusé, l'accueil d'un nouveau patient majeur la présente, et la liste d'envoi du cockpit se remplit.

## Fichiers modifiés

- `web/src/lib/trust/contenus/registre.ts` (v19, `PARTIES_REPRISES_CONDITIONS_V2`, conditions v2) et `registre.test.ts` (liste, bancs de la v19 et de la partie 5 lus dans la proposition).
- `web/src/lib/correspondance/registreGabarits.ts` (gabarit v2) et son test (texte lu dans la proposition, validations datées).
- `web/src/app/api/praticien/conditions-utilisation/route.test.ts` (sujet de l'aperçu).
- `docs/claude/propositions/2026-10-20-act4-textes/README.md` (B validée, B5), `docs/DECISIONS.md`, `docs/FEATURE_FLAGS.md`, `docs/claude/PLAN_WELLNEURO.md`, `changelog.d/2026-10-20-act4-publication-textes.md`, `docs/claude/SESSION_LOG.md`.

## Validations exécutées

- Vitest des suites liées (TRUST, correspondance, routes trust et conditions, écrans patient trust et biologie, pages du portail) : 545/545.
- T1 et T2 `--fast` : résultats dans la PR.

## Problèmes ouverts

- `publieLe` vaut 2026-10-20 : le dater du jour du merge (hors empreinte, une ligne par version).
- Une PR qui attend porte une entrée SESSION_LOG : fusionner main dans la branche avant le merge (conflit attendu, en ajout seul). Si une autre version de `donnees_confidentialite` ou d'un des quatre textes arrive entre-temps, refaire la v19 ou l'assemblage des conditions par-dessus.
- Préalables de l'ouverture : constat d'ACT-3 (le responsable ouvre « Mes échanges » sur un dossier de test) ; J2-conf (`at`, `as`).
- `docs/DOSSIER_RGPD.md` (ligne de `DocumentDeposePatient`) dit encore « aucun code ne les écrit encore » : à mettre à jour à l'ouverture, avec l'information patient (v19).

## Prochaine action exacte

À l'ouverture d'ACT-4 : fusionner main dans `lot/act4-publication`, dater `publieLe`, CI vert et revue CodeRabbit de la tête, merge, déploiement constaté. Poser ensuite `WN_PORTAIL_DEPOT_DOCUMENTS=true`, puis le responsable envoie l'e-mail des conditions v2 depuis le cockpit. Enfin, constat sur un premier vrai dossier.

## Interdits encore actifs

- Aucune fenêtre, aucun seuil, aucune règle clinique changés (J7/J14/J21 à ±3 jours restent tels quels).
- Aucune migration ni `schema.prisma` sans accord du responsable.
- Fixtures neutres seulement.
- `WN_PORTAIL_DEPOT_DOCUMENTS` éteint jusqu'à ACT-4 ; cette PR non mergée avant.
- Production lue par conteneur et par identifiant seulement ; agrégats seuls dans les fichiers durables.
