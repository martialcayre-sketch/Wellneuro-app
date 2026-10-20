# Handoff — ACT-4 préparé : les textes du dépôt validés, drapeau éteint

## Branche et état Git

`lot/act4-preparation` (worktree `act4-preparation`), partie de `origin/main` 9085ca13. Une PR, sans migration ni `schema.prisma`.

## Objectif

Préparer ACT-4 (place 4, H77) sans l'activer : faire valider les textes qui restaient (libellés de l'écran de dépôt, bloc « Ce que vous trouvez ici » de « Mes échanges », « Vos données personnelles ») et reprendre deux observations de production.

## Décisions prises

- Quatre arbitrages du responsable du 2026-10-20, tous sur la proposition (D-330, amendement ; `docs/claude/propositions/2026-10-20-act4-textes/README.md`) :
  1. libellés de l'écran validés, refus du plafond des non-consultés rendu neutre ;
  2. bloc « Ce que vous trouvez ici » qui nomme les documents déposés, fin « qui le concerne », servi drapeau ouvert seulement ; ligne « Transmis · Document déposé » validée ;
  3. « Vos données personnelles » v19 = collecte + lecture datée, une seule version, publiée à l'ouverture d'ACT-4 avec les conditions v2 et leur e-mail (D-292 §5) ;
  4. constat d'ACT-3 sans code : le responsable ouvre « Mes échanges » sur un dossier de test, comparaison par lecture en conteneur.
- La v19 n'entre pas au registre dans cette PR. Le registre TRUST est lu côté client (`TransmissionCompteRendu`, `ConditionsUtilisation`) et ne peut pas suivre une variable serveur. La publication sera une PR propre, mergée à l'ouverture.
- Le bloc de « Mes échanges » est choisi par la page (serveur, `depotDocumentsOuvert()`), passé au journal en `depotOuvert`.

## Fichiers modifiés

- `web/src/lib/collecte/documentsDeposes.ts` (refus neutre) ; `web/src/components/patient/collecte/textesDepot.ts` (commentaire : validés) ; `DepotDocuments.test.tsx`.
- `web/src/components/patient/mes-echanges/textesMesEchanges.ts` (`BLOCS_MES_ECHANGES_DEPOT_OUVERT`), `MesEchangesJournal.tsx` et son test ; `web/src/app/portail/[token]/echanges/page.tsx` et son test.
- `docs/claude/propositions/2026-10-20-act4-textes/README.md` (neuf), `docs/DECISIONS.md` (D-330, amendement), `docs/FEATURE_FLAGS.md`, `docs/claude/PLAN_WELLNEURO.md` (H77), `changelog.d/2026-10-20-act4-textes-depot.md`, `docs/claude/SESSION_LOG.md`.

## Validations exécutées

- Vitest ciblé (page et journal de « Mes échanges », écran et route de dépôt) : 43/43.
- T1 (`check:rapide`) vert, après `prisma generate` dans le worktree neuf.
- T2 `--fast` : résultat dans la PR.
- Production lue par conteneur le 2026-10-20 à 07 h 51 UTC, agrégats : lectures `protocole` 1, datées 0 ; `bilan` 18, datée 1 (2026-10-19) ; `fiche_assiette` 2/0 ; `synthese` 8/0 ; documents déposés 0. Journaux Scalingo du 13 au 20 octobre : aucune ligne d'accès HTTP (le routeur ne journalise pas), aucune ligne de la route `echanges`.

## Problèmes ouverts

- Partie B de la proposition, à valider avant la PR de publication : correction de la phrase sur la lecture datée (l'énumération oublie « Ce que j'ai compris de vous »), résumés de la v19 et des conditions v2, e-mail `conditions_utilisation` v2.
- Constat d'ACT-3 (porte 18) : attend que le responsable ouvre « Mes échanges » sur un dossier de test.
- J2-conf (F45) : `at` et `as` restent ; préalable d'ACT-4.
- Le même refus « Trois documents attendent déjà… » reste au compte rendu biologique (`transmissionStatut.ts`), hors arbitrage.
- D/38 du plan : le renvoi de G-11 vers « Vos données personnelles » est devenu une partie des conditions ; inchangé (texte validé).

## Prochaine action exacte

Ouvrir la PR, attendre le CI (`wn-attendre-ci`) et la revue CodeRabbit de la tête, trancher chaque commentaire, merger, constater le déploiement (1re ligne Scalingo = tête de `main`). Puis soumettre la partie B.

## Interdits encore actifs

- Aucune fenêtre, aucun seuil, aucune règle clinique changés (J7/J14/J21 à ±3 jours restent tels quels).
- Aucune migration ni `schema.prisma` sans accord du responsable.
- Fixtures neutres seulement.
- `WN_PORTAIL_DEPOT_DOCUMENTS` reste éteint jusqu'à ACT-4.
- Production lue par conteneur et par identifiant seulement ; agrégats seuls dans les fichiers durables.
