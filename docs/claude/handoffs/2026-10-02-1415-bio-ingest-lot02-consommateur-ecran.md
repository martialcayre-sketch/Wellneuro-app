# Handoff — BIO-INGEST LOT-02, PR 2a (serveur) et 2b (écran)

Date : 2026-10-02 · Campagne `2026-09-30-bio-ingest` · Lot LOT-02 ([[D-256]] A2/A3/A4/A5)

## Branche et état Git

- PR 1 (migration du staging) : #1280, `0f388a9b`. `release-db` approuvé (run 36974556114), constat fait par conteneur.
- PR 2a (serveur) : #1281 mergée (`aa95f5a8`), **déployée sur Scalingo** (12:03, succès). Aucune migration.
- PR 2b (écran) : branche `feat/bio-ingest-lot02-ecran`, partie de `origin/main` à `aa95f5a8`. Diff indexé, PR à ouvrir après un T2 vert.
- Drapeau `WN_BIO_INGEST_ENABLED` : **éteint partout**.

## Objectif

Brancher le staging : dépôt d'un PDF, extraction par Anthropic, décisions du praticien, retrait. Rien n'entre dans `resultats_biologiques` sans la validation d'une ligne.

## Décisions prises (2026-10-02, par le responsable)

- **Resolver :**
  - catalogue + synonymes rédigés par Claude, **livré non signé** : tout sort `inconnu` jusqu'à la signature, acte praticien distinct ;
  - libellés génériques retirés (« Cuivre », « Glutathion », « Zonuline », « BDNF »).
- **Valeur et date** pré-remplies et corrigeables. Une ligne **lue** non quantitative reste refusée.
- **Modèle** : `claude-sonnet-5-5`, modifiable par `WN_BIO_INGEST_MODEL`.
- **Unités** : `u` vaut `µ` devant mol, g ou L ; aucune autre équivalence (D-157).
- **Seule l'extraction courante** (la plus récente non échouée) se décide.
- **Retrait** d'un dépôt permis sur un dossier clos, tant qu'aucune ligne n'est validée.
- **Heure** exigée quand elle n'a pas été lue (minuit à Paris), avec signalement des mesures du même jour. Faite **côté écran seulement**.
- **Routeur Scalingo** : « mesurer, puis décider ».
  - Mesure : 36 s pour 3 pages et 75 lignes, au-delà des 30 s du routeur.
  - Décision : réponse 202, suite dans `after()`, relecture par l'écran toutes les 3 s.
- **Conservation** (rubrique 8) : **purge du PDF après décision**. Pas encore en œuvre.

## Fichiers (2b)

- Route : `web/src/app/api/praticien/biologie/import/extraction/route.ts` (202 + `after()`) et son test.
- Orchestration, `lib/biology-library/import/lancerExtraction.ts` :
  - découpée en `ouvrirExtraction` et `poursuivreExtraction` ;
  - terminaisons gardées par `statut = en_cours` (une suite tardive ne réécrit pas un import clos : `import_clos`).
- Lecture, `lecture.ts` : `perime` calculé par l'horloge du serveur.
- Écran : `components/patient-cockpit/ImportCompteRenduPanel.tsx` et son test.
  - Monté dans `EstimeMesurePanel`, derrière `useBioIngestEnabled()`.
  - Le drapeau vient de `CbFeatureProvider` (`bioIngestEnabled`), alimenté par `dashboard/patients/[idPatient]/page.tsx`.
- Documentation :
  - fiche LOT-02 ;
  - `docs/FEATURE_FLAGS.md` (la purge devient une condition de pose) ;
  - `changelog.d/2026-10-02-bio-ingest-lot02-ecran.md`.

## Validations

- **2a** :
  - T1 complet vert ;
  - T2 vert (sur `c2751880`, puis avant `d9bd99e8` et `e89f2922`) ;
  - CI vert ;
  - `wn-reviewer` (NO-GO, puis tout corrigé) et Copilot (3 corrigés, 1 routé), réponses en ligne postées ;
  - chaîne réelle jouée sur la base de dev en Europe/Paris, fixture Sophie Nicola.
- **2b** :
  - T1 complet vert ;
  - tests du panneau verts sous TZ Europe/Paris, UTC et America/Martinique ;
  - `wn-reviewer` GO, six P2 corrigés : heure de Paris, réponse périmée ignorée, péremption jugée par le serveur, relecture qui survit à un échec, terminaison gardée, accessibilité ;
  - T2 lancé après les corrections.

## Problèmes ouverts (fiche LOT-02)

1. **Purge du PDF après décision** :
   - migration : `contenu` nullable, déclencheur de figement à revoir ;
   - `release-db` humain ;
   - nouvelle version du document patient (la v11 dit « conservé dans votre dossier ») ;
   - à faire **avant la pose du drapeau**, ou à déclarer tel quel.
2. **Signature du resolver** : acte praticien, avec sa D-xxx et l'enrôlement dans `shaPerimetreLitteral.guard`.
3. **Constater sur Scalingo** qu'une suite `after()` de ~36 s aboutit en `extrait`. Rien d'autre que le test (`after` remplacé par un double) ne l'atteste.
4. **À arbitrer** : le serveur doit-il aussi exiger l'heure ? Aujourd'hui, il accepte un minuit de Paris renvoyé tel quel.
5. **Extrapolation à surveiller** : 200 lignes ≈ 95 s, sous le délai d'appel de 120 s.
6. LOT-03 : images (limite d'environ 5 Mo chez le fournisseur).

## Prochaine action exacte

1. Lire `scratchpad/t2f.log`. S'il est vert :
   - committer la 2b ;
   - ouvrir la PR (`--body-file`) ;
   - lancer `node scripts/wn-attendre-ci.mjs <N>` en arrière-plan ;
   - lire les commentaires en ligne (un verdict chacun) ;
   - merger (squash), puis constater le déploiement Scalingo.
2. Puis `/clear`. La session suivante cadre la migration de purge (mode Plan, migration seule, `release-db`).

## Interdits actifs

- Pas de migration ni de `schema.prisma` sans demande explicite. Jamais `prisma format`.
- Production : lecture par conteneur seulement. `release-db` et `enforce_admins` restent des gestes humains.
- **Aucune écriture dans `resultats_biologiques` sans validation humaine.**
- Aucune conversion d'unité, aucun choix final d'analyte par le LLM, aucune qualification de valeur (DC-27).
- Aucun masquage promis : le compte rendu part entier.
- Fixtures seulement : Sophie Nicola, Jennifer Martin, Michel Dogné. Aucun seed ni E2E sur un dossier réel.
- Ne pas poser le drapeau avant les conditions du §2 ter et de `docs/FEATURE_FLAGS.md`.
- Ne pas sonder le CI.
