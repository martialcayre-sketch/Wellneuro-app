# Handoff — 2026-10-21 — File B : BP-13, code des données physiologiques et des traitements (D-335)

## Branche et état Git

- Branche `lot/bp13-code`, partie d'`origin/main` à bf6d2235 (merge de
  #1622, la migration), dans le worktree `bio-ingest-cloture` (session
  concurrente, cycle en git/gh direct).
- Mergées par cette session : #1614 (D-335), #1622 (migration).

## Objectif

BP-13 (fiche F07, LOT-13), PR 2 de deux ([[D-266]] §11) : le code
consommateur des tables `donnees_physiologiques` et `traitements_en_cours`,
sous `WN_PHYSIO_TRAITEMENTS` créé éteint, après la release-db constatée.

## Décisions prises

- Release-db 39654198602 : approuvée et déclenchée par le responsable ;
  conclusion `success`, sentinelle `WN_RELEASE_DB_OK id=39654198602-1`
  (one-off-5571), première ligne de `scalingo deployments` = bf6d2235 (tête
  de `main`) ; conteneur `one-off-483` en lecture seule : migration finie et
  non annulée, deux tables vides, RLS active sans politique,
  `id_traitement` text nullable, CHECK `une_piece` sur trois clés.
- Code : voir la section « PR 2 livrée » de la fiche LOT-13 — choix
  d'exécution à relire avant l'allumage (ce que voit le patient, la page
  « Ma fiche de renseignements », la saisie des dates, le mineur au
  cockpit, les sources nommées de la vigilance, `classeEtCode`).
- Les quatre P2 routés de la revue de la migration sont tenus (troisième
  clé décodée, normalisation Unicode, ordre des verrous, READ COMMITTED).

## Fichiers modifiés

Neufs : `web/src/lib/physio-traitements/` (drapeau, liste, dates, demande,
fils, lecture, écriture, garde, anamnèse, messages, tests, banc des
lecteurs) ; `web/src/components/physio-traitements/` (panneau du cockpit,
déclarations du patient, formulaire de traitement, champ de date, lien du
hub) ; routes `api/praticien/physio-traitements` et
`api/portail/physio-traitements` (+ tests) ; page
`portail/[token]/renseignements`. Modifiés : constats (`liste`, `aRelire`,
`demande`, `ecriture`, `lecture`, `messages`, route, panneau, tests) ;
`contexteClinique.ts` (+ test) ; `synthese/generation.ts` ;
`FichePatientPanel.tsx` ; page du dossier ; assistant du portail ; hub ;
banc de la garde d'âge. Docs : `FEATURE_FLAGS.md`, `PLAN_WELLNEURO.md`
(F07), `CAMPAGNE.md`, fiche LOT-13 (close), fragment changelog,
`SESSION_LOG.md`, ce handoff.

## Validations exécutées

- `tsc --noEmit` vert ; T1 rapide (lint sans avertissement neuf).
- Vitest ciblé vert : 23 fichiers, 199 tests (modules purs, deux routes,
  constats, vigilance, banc des lecteurs, garde d'âge).
- T2 (`test:worktree --fast`) : un premier passage rouge sur deux registres
  (gabarit de masquage de `portail/[token]/renseignements`, surface
  `components/physio-traitements` au banc anti-gamification), corrigés ;
  second passage vert en 7 min 25 s (E2E Chromium et WebKit compris).
- Revue `wn-reviewer` : go sous condition. P1-a corrigé (Entrée dans une
  ligne ne valide plus l'anamnèse ; une ligne ouverte bloque la validation
  de la section). P2-a corrigé (lecture des lignes hors du `try` de
  l'anamnèse, échec journalisé ; banc `vigilanceSynthese.guard`). P2-b
  corrigé (un statut menstruel resté en vigueur après un changement de sexe
  se retire, au cockpit et au portail). P2-c corrigé (U+0000 normalisé ;
  an 0000 refusé pour une mesure). P2-d routé : une ligne de vigilance de
  plus de 500 caractères rend le brouillon praticien impossible à
  enregistrer — risque déjà présent avec l'anamnèse, à traiter avant
  l'allumage. Après correctifs : tsc, 781 tests ciblés et lint verts ; T1
  complet (`npm run check`) vert ; T2 rejoué vert en 8 min 10 s.
- Revue CodeRabbit de #1631 (sept commentaires) : six corrigés — entrée
  du journal remise en fin de fichier ; conditions d'allumage complétées
  (`FEATURE_FLAGS.md`, plan F07) ; « ← Précédent » tenu par la même garde
  de ligne ouverte, message effacé à la fermeture de la ligne ; échec de
  relecture signalé au-dessus des données conservées ; blancs de largeur
  nulle U+200B à U+200D et U+2060 normalisés ; code d'événement propre
  `SYNTHESE_TRAITEMENTS_INDISPONIBLES`. Un écarté : le message d'un geste
  refusé s'affichait déjà. Après correctifs et fusion de `origin/main` :
  T1 rapide, Vitest des fichiers changés (3753 tests) et T2 verts.
- Second tour CodeRabbit (deux commentaires), corrigés : rappels de la
  fiche stabilisés (`useCallback`), sans quoi le nettoyage de
  `DeclarationsPatient` effaçait le blocage d'une ligne encore ouverte ;
  une lecture en échec de la partie ne la laisse plus vide en silence —
  message, « Réessayer », et la section ne se valide pas (les lignes
  remplacent les groupes de texte libre). Banc `DeclarationsPatient.test.tsx`.

## Problèmes ouverts

- Allumage ([[D-335]] §9) : décision qui fait lire les lignes (ou non) à la
  garde de [[D-101]] ; « Vos données personnelles » v20 et conditions v3
  publiées ; test d'intégration sur une vraie base (pose, remplacement,
  retrait, deux poses concurrentes).
- Le titre « Ma fiche de renseignements » (page et lien du hub) n'a pas été
  soumis comme libellé ; quelques textes d'écran (boutons « Enregistrer »,
  messages de refus) non plus, ni les messages du portail nés de la revue
  (« Cette partie de votre fiche n’a pas pu être chargée. », « Enregistrez
  ou annulez la ligne en cours avant de continuer. » et sa variante de
  lecture en échec).
- L'export du dossier (droit d'accès) ne porte pas encore ces lignes, et
  `export-dossier/sectionPerimetre.ts` ne les déclare pas « non incluses » :
  drapeau allumé, l'anamnèse ne porte plus les traitements. D-335 ne le
  cadre pas ; à décider avant l'allumage (ou avec BP-24).
- Le courrier au médecin reprend la ligne de vigilance (« Signal à
  discuter », `documents/depuisSynthese.ts`) : les noms des traitements en
  vigueur y parviendraient par elle, comme ceux de l'anamnèse aujourd'hui.
  D-335 §8 dit que le courrier ne lit pas les lignes : à confirmer.
- Retour arrière : éteindre le drapeau après un allumage rendrait les
  traitements déclarés en lignes invisibles à la vigilance (les anamnèses
  validées pendant l'allumage n'ont plus les groupes). À écrire dans la
  procédure d'extinction.
- P2-d (longueur d'un point de vigilance, borne de 500) : à traiter avant
  l'allumage.

## Prochaine action exacte

CI vert et revue CodeRabbit sur la tête, liste des runs `waiting`, merge
avec `--match-head-commit`. Puis BP-15 (LOT-15, F08), puis le brouillon de
la lettre cm (F52).

## Interdits encore actifs

`WN_DOCUMENT_MEDECIN_PATIENT` allumé, à ne pas éteindre ; ni pull, ni
rebase sans arbitrage (fusion de `origin/main` autorisée sans conflit pour
le lot) ; prod en lecture seule par conteneur `scalingo run -d` ; une
release-db à la fois ; aucune identité réelle, aucun texte clinique ni
libellé d'hypothèse au dépôt ; `signature(err)` seulement, jamais
`err.message` ; pas de merge sans revue CodeRabbit sur la tête ;
approbation et déclenchement de la release-db sont des gestes du
responsable.
