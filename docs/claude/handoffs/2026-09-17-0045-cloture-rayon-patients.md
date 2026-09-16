# Handoff — 2026-09-17 — Clôture de la campagne « Le rayon Patients »

## Branche et état Git

`wn-rayon-patients-lot07-2026-09-17`, partie de `origin/main` à `2c684acd`.
Campagne **terminée** ; le créneau primaire est **libre**, et son attribution est
un geste du responsable — ne pas l'ouvrir de sa propre initiative.

Sept PR mergées : **#1150** (cadrage), **#1152** (le rayon dans le rail),
**#1155** (fiche signalétique et anamnèse relisibles), **#1156** (migration
seule), **#1163** (l'accusé câblé), **#1166** (la fiche administrative s'écrit),
**#1170** (le cockpit porte le dossier). Le LOT-07 est la huitième.

## Objectif

Rendre au praticien le dossier de son patient : identité complète et
corrigeable, gestes qui pèsent sur l'accès et la fin de parcours, et ce que le
patient a écrit lui-même à l'ouverture de son espace. La phase « 1. Patient » du
cockpit affichait **deux lignes** ; la gestion des dossiers vivait sur une page
d'héritage 4.0.

## Décisions prises

- **D-219** — la gestion du dossier quitte l'héritage 4.0 : un rayon Patients,
  et un cockpit qui porte son dossier.
- **D-220** — le NIR déclaré entre au dossier, en clair, et sa clé se vérifie
  côté application.

Numéros pris **au merge**, jamais réservés d'avance.

## Fichiers modifiés (LOT-07)

- `web/src/app/api/praticien/changementEmailChaine.guard.test.ts` — **neuf**.
- `docs/DECISIONS.md` — D-219 et D-220.
- `docs/claude/campagnes/2026-09-16-rayon-patients/` — CAMPAGNE.md clos, huit
  lots marqués avec leur PR réelle.
- `docs/checklist_tests_end_to_end.md` — la recette manuelle pointait des écrans
  déménagés.
- `.wn/state.json` + `ACTIVE_CAMPAIGN.md` — campagne close, tête de `next_action`
  neuve, vue dérivée resynchronisée par `wn-cycle.mjs --appliquer`.
- `changelog.d/` — fragment de clôture.

## Validations exécutées

- **T1** `npm run check` — exit 0.
- **T2** `npm run test:worktree -- --fast` — **rouge sur la seule signature
  `D-049`** (iPhone 13 / WebKit, `portail-dossier-deux-voix`, navigation expirée
  **sans qu'aucune requête de page soit émise**), trois runs de suite, jamais en
  CI ; bancs unitaires verts.
- `node --test scripts/wn-coherence-etat.test.mjs` — **29/29**.
- Contre-revue adverse menée **avant** la clôture, pas après.
- **Constat en production** par one-off détaché, comptages seuls — la ligne de
  base est prise, et elle a établi un fait que le cadrage supposait.

## Problèmes ouverts

1. **La ligne de base EST prise ; la reprise reste due.** Lecture au conteneur du
   2026-09-17, comptages seuls : **29 dossiers, 36 consultations, 22 fiches
   signalétiques, 21 anamnèses** — et **0 adresse, 0 NIR, 0 médecin traitant**.
   Les 22 et 21 établissent que le manque n'était pas théorique ; les trois zéros
   mesurent l'instant d'avant, le code consommateur n'étant pas encore en ligne.
   La requête est conservée telle quelle
   (`campagnes/2026-09-16-rayon-patients/CONSTAT_LIGNE_DE_BASE.sql`) : la
   rejouer **à l'identique** est la seule façon d'en tirer un constat (`D-112`).
2. **`D-049` reste ouverte** — cause racine non trouvée, trois occurrences cette
   nuit sur la même spec.
3. **Deux chantiers nommés, non ouverts** : le raccord du médecin traitant au
   rayon Correspondance ; la qualification du NIR au titre de l'article 9,
   écrite comme **due** au dossier RGPD.
4. **Une normalisation CRLF a gonflé le diff de la PR #1166** de 348 à 1 722
   lignes (`api/praticien/patients/route.ts`). Sans conséquence sur le dépôt —
   `.gitattributes` déclare `eol=lf`, le fichier est désormais conforme — mais
   la revue a été noyée. Note mémoire renforcée.

## Prochaine action exacte

**Aucune, côté campagne.** Le créneau primaire est libre et son attribution
appartient au responsable. Si une session reprend : lire la tête de
`next_action`, qui porte le bilan complet.

La seule chose à faire **quand le déploiement sera constaté et qu'un praticien
sera passé sur la fiche** : rejouer `CONSTAT_LIGNE_DE_BASE.sql` **à l'identique**
et comparer aux sept nombres du 2026-09-17.

## Interdits encore actifs

- **Ne jamais désigner un dossier réel par son nom ou son e-mail dans le dépôt**,
  ni le viser par un seed ou un E2E.
- **Écriture en production uniquement par migration relue puis `release-db`
  approuvée** (`D-087`). La migration de cette campagne est appliquée ; il n'en
  reste aucune en attente.
- **Ne pas poser la qualification du NIR dans le code.**
- **Ne pas ouvrir de campagne de sa propre initiative** : le créneau primaire est
  un geste du responsable.
- **`npx prisma format` reste interdit** — il réaligne une centaine de lignes
  étrangères au diff, à commencer par le bloc `Patient`.
