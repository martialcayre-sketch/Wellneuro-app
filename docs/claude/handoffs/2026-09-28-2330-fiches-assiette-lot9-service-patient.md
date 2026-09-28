# Handoff — 2026-09-28 — Fiches d'assiette : le service patient des fiches remises (lot 9)

## 1. Branche et état Git

`feat/fiches-assiette-lot9-service`, worktree
`.claude/worktrees/deploy-anti-recul-lot1`, partie de `origin/main` à
`ec275e67` (#1246, clôture du lot 8). Pas de migration. Un merge à la fois.

## 2. Objectif

Lot 9 de `D-251` : servir au patient les fiches d'assiette qui lui ont été
remises, sous un drapeau de lecture neuf et fermé,
`WN_FICHES_ASSIETTE_LECTURE`. L'écran qui les affiche, la tâche du fil et la
lecture tracée sont le lot 10.

## 3. Décisions prises

Choix de mise en œuvre, consignés dans l'amendement de `D-251` du 2026-09-28
(nuit) et révisables par le responsable :

1. Une assiette portée par une action **ferme, suspendue ou différée** fait
   encore partie du protocole : pas de mention « ne fait plus partie de votre
   protocole actuel ». **Contre-indiquée ou non indiquée**, elle en sort, et la
   mention paraît (revue, P1). Sans protocole servi établi, la mention ne
   paraît pas.
2. Les contrôles de la version sont **rejoués au moment de servir** (§6). Une
   fiche qui ne les passe plus n'est pas servie, et c'est dit. Une panne
   pendant le rejeu retient cette fiche seule (revue, P2-1).
3. Le **motif d'un retrait n'est pas servi** au patient : c'est une note du
   cabinet.

Autres choix :
- **Drapeau d'abord, 503** : même idiome qu'`api/portail/comprehension`.
- **`authentifierPatientPortail`** : un patient sorti de suivi relit ce qui
  lui a été remis (précédent `api/portail/bilan`).
- **Libellé d'assiette** : celui du catalogue, jamais un texte IA, pour
  désigner une fiche retirée.

## 4. Fichiers modifiés

- `web/src/lib/fiches-assiette/drapeau.ts` : `lectureFichesOuverte()`.
- `web/src/lib/fiches-assiette/ficheServie.ts` (pur) :
  - `remisesEnCours`, `etatAvantControle`, `assiettesConseillees`,
    `placeDansLeProtocole`, `contenuPourLePatient` ;
  - les types `FicheRemiseServie` et `ContenuServi`, qu'importera l'écran du
    lot 10.
- `web/src/lib/fiches-assiette/servicePatient.ts` (serveur) :
  `fichesRemisesAuPatient`. Seul le texte des remises en cours non retirées
  est chargé.
- `web/src/app/api/portail/fiches-assiette/route.ts` : `GET`.
- Bancs : `ficheServie.test.ts` (21), `servicePatient.test.ts` (22),
  `fiches-assiette/route.test.ts` (11).
- `docs/FEATURE_FLAGS.md` : ligne `WN_FICHES_ASSIETTE_LECTURE`.
- `docs/DECISIONS.md` : amendement de `D-251` (nuit).
- `docs/claude/MATRICE_CONSOMMATION.md` : régénérée. Le service lit le
  catalogue d'assiettes (+1 consommateur indirect).
- Changelog, ce handoff, SESSION_LOG.

## 5. Validations exécutées

- **Bancs du lot : 54 tests verts**, plus les gardes des drapeaux et des
  remises.
- **Revue `wn-reviewer` : GO**, aucune fuite trouvée. Verdicts :
  - **P1-1, corrigé** : une assiette contre-indiquée ou non indiquée se lisait
    « actuelle », texte servi. Elle sort désormais du protocole.
  - **P2-1, corrigé** : une panne du rejeu faisait tomber toute la liste (500).
  - **P2-2, routé au lot 10** (voir § 6).
  - **P2-3, écarté avec motif** : « actuel » et « inconnu » ne portent tous
    deux aucune mention. Un patient sorti de suivi ne se voit donc rien
    affirmer.
  - **Tests manquants ajoutés** : chaque statut d'intervention, la panne d'une
    fiche, le brouillon introuvable, le retrait sans motif, le compte
    désactivé.
- **22 mutants joués en session** (script hors dépôt), tous tués. Les deux
  premiers survivants étaient deux faiblesses des bancs, renforcés :
  - `JSON.stringify` d'une `Error` rend `{}` ;
  - un ordre d'entrée coïncidait avec l'ordre trié.
- **Passage d'intégration sur base réelle migrée**, en session et annulé.
  Réels : les requêtes Prisma, la résolution du protocole servi, le trigger de
  M2 et la remise. Sept étapes :
  1. aucune remise ;
  2. v1 servie ;
  3. v2 seule servie ;
  4. v2 retirée, sans texte ni motif ;
  5. v1 remise à nouveau ;
  6. assiette sortie du protocole : `plus_actuel` ;
  7. version non approuvée : `inconnu`.
- T1 et T2 : voir la PR.

## 6. Problèmes ouverts

- **Le drapeau d'émission est posé, mais son constat par le comportement
  manque** : la section des fiches, vue en sous-vue Diffusion lors d'une
  session praticien.
- **La phase « Actions » est à cadrer avec le responsable** : voir le handoff
  du 2026-09-28 à 21 h 35.
- **Six fiches sur sept attendent la relecture du responsable.**
- **Le nettoyage des E2E** (`web/e2e/helpers/db.ts`) devra effacer
  approbations et remises dès qu'un E2E remettra des fiches.
- **Revue, P2-2, pour le lot 10.** La mention se calcule sur le brouillon
  approuvé, pas sur ce que la page protocole sert. Quand celle-ci répond
  « indisponible » (carte non rejouable, contrat refusé), la fiche peut dire
  « ne fait plus partie de votre protocole actuel » sans que le patient puisse
  le vérifier. Le lot 10 doit trancher : passer à `inconnu` dans ce cas, ou
  l'assumer par écrit.
- **Pour le lot 10 : l'écran n'affiche aucune phrase pour `actuel`.** Seul
  `plus_actuel` porte une mention.

## 7. Prochaine action exacte

Le lot 10, sous le même drapeau fermé :
- l'espace de lecture « Fiches remises par mon praticien » ;
- la tâche « à lire » au fil du jour ;
- l'espèce `fiche_assiette` dans `lecturesAttendues.ts` et
  `api/portail/lectures`, avec `idObjet` = l'identifiant de la remise ;
- le mode `?interrupteur=1` pour le lien du hub.

## 8. Interdits encore actifs

- « Un merge à la fois » (D-248).
- Aucun texte de Fiche MY au dépôt, en PR ou au journal.
- `WN_FICHES_ASSIETTE_LECTURE` reste fermé jusqu'aux conditions du §10 : sept
  fiches validées, espace de lecture constaté, document TRUST sur l'IA publié,
  contre-revue adverse.
