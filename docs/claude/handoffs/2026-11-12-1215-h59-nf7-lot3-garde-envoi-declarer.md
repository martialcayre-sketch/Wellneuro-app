# Handoff — 2026-11-12 — H59 (J2-base), NF-7 lot 3 : garde d'envoi, geste « Déclarer », envoi sous verrou, message P2-4

## Branche et état Git

- Worktree `.claude/worktrees/h59-nf7-lot3`, branche `feat/h59-nf7-lot3`,
  partie d'`origin/main` `fe308255`, puis rebasée sur `22812108` (#2016, docs
  seules, sans recoupement) sur arbitrage du responsable. Préalable : #2010
  mergée (`c8b6214d`).
- PR ordinaire (ni migration, ni authentification) : déclarée « prête @<sha> »
  à l'intégrateur, sans merger.

## Objectif

Lot 3 de NF-7 (D-303, amendée par D-493), sur demande explicite du
responsable : appliquer les trois arbitrages du 2026-11-12 (P2-1, P2-3, P2-4).
Sans migration. Tout reste derrière `WN_ENABLE_DECLARATION_SUICIDE_CAB`,
éteint. Drapeau éteint, le comportement reste strictement celui d'aujourd'hui,
et les bancs le prouvent chemin par chemin.

## Décisions prises

- Aucune D-xxx : D-303, D-493 et les arbitrages du 2026-11-12 font foi.
- **P2-1.** Prédicat unique `cabinetEnvoyable` (actif, `valide`, et drapeau
  allumé, déclaré), aligné sur le `where` d'`idsAssignablesPour`. Un publié
  non déclaré reste listé, mais :
  - il n'est plus assignable dans la bibliothèque ;
  - il apparaît « Indisponible » dans la file ;
  - il est écarté à l'envoi.

  L'écran affiche le motif et le geste « Déclarer » (action PATCH `declarer`).
  L'action n'existe que drapeau allumé ; éteint, elle répond « Action
  inconnue ». Elle n'agit que sur un `valide` non déclaré. L'écriture est
  gardée (`where` sur `actif`, `valide`, déclaration NULL et `updatedAt`
  relus), et `data` ne contient que la déclaration lue.
- **P2-3.** Drapeau allumé, l'envoi lit les lignes `cabinet_instruments` du
  brouillon sous `FOR SHARE`, en ordre fixe, dans sa transaction : verrou
  brouillon, puis patient, puis instruments.
  - Un instrument devenu inéligible est écarté et tracé
    (`ASSIGNATION.INSTRUMENT_INELIGIBLE.ECARTE`, nouveau code d'événement).
  - Si rien ne reste, la transaction lève, la réponse est 400 et le brouillon
    reste en l'état.
  - Une copie NULL ne peut plus être écrite.
- **P2-3 prolongé (revue `wn-reviewer`, P1).** Le gel du contenu comptait les
  envois hors verrou. Drapeau allumé, une modification des questions ou de la
  grille prend désormais un `FOR UPDATE`, recompte les envois sous ce verrou,
  puis écrit, le tout dans une même transaction.
- **P2-4.**
  - « Relire la grille » : le texte validé, mot pour mot.
  - « Déclarer » : la variante « envoi », validée par le responsable le même
    jour.
  - Autres textes de « Déclarer », validés tels quels : le titre, « Déclaration
    enregistrée. », « Cet instrument n’attend aucune déclaration. »,
    « L’instrument a été modifié entre-temps : rouvrez « Déclarer ». » et
    « Déclaration impossible. ».

  Tous sont consignés dans le journal H59.
- Copies NULL des envois faits drapeau éteint : constat par conteneur avant
  l'allumage (choix du responsable), rien dans ce lot.

## Fichiers modifiés

- `web/src/lib/securite/declarationSuicideCabinet.ts` : motif,
  `declarationRequiseAvantEnvoi`, `cabinetEnvoyable`.
- `web/src/lib/instruments.ts` : filtre d'`idsAssignablesPour`, drapeau
  allumé.
- `web/src/lib/bibliotheque.ts` : type `cabinet.declarationRequise`.
- `web/src/app/api/praticien/bibliotheque/route.ts` : `assignable` et
  `declarationRequise`.
- `web/src/app/api/praticien/file-envoi/route.ts` : `indisponible`.
- `web/src/app/api/praticien/file-envoi/envoyer/route.ts` : verrou, écart
  tracé, `RienDEnvoyable`.
- `web/src/app/api/praticien/instruments/route.ts` : DTO
  `declarationRequise`, action `declarer`, gel sous verrou.
- `web/src/lib/observability/eventCodes.ts` : un code.
- `web/src/components/BibliothequePanel.tsx` : motif, bouton et panneau
  « Déclarer », textes P2-4 par contexte.
- Bancs : `declarationSuicideCabinet.guard.test.ts` (trois occurrences, le
  `where` de « Déclarer » est figé), `instruments.test.ts`, les tests des
  routes `bibliotheque`, `file-envoi`, `file-envoi/envoyer` et `instruments`,
  `BibliothequePanel.test.tsx`.
- `docs/FEATURE_FLAGS.md`, `changelog.d/2026-11-12-h59-nf7-lot3-garde-envoi-declarer.md`,
  `docs/claude/plan-journal/H59/2026-11-12-02-nf7-lot3-garde-envoi-declarer.md`.

## Validations exécutées

- Vitest ciblé : 13 fichiers, 209 tests verts (avant le P1), puis les suites
  touchées vertes après le P1 et la variante P2-4.
- T1 (`check:rapide`) vert après la dernière édition de code.
- Revue `wn-reviewer` : verdict « go », aucun P0 ; 23 fichiers, 542 tests
  verts de son côté. Traitements :
  - P1 (gel hors verrou) : corrigé.
  - P2-1 (texte P2-4 dans « Déclarer ») : corrigé par la variante arbitrée.
  - P2-2 (route bibliothèque non couverte) : tests ajoutés.
  - P2-3 (SQL testé comme chaîne) : routé, voir « Problèmes ouverts ».
  - P2-4 (bouton « Déclarer » sans description liée) : écarté, c'est le
    schéma des autres boutons de la liste.
  - P2-5 (retrait avant transaction non tracé) : écarté, c'est le
    comportement existant d'un dépublié, et l'écran le signale avant.
- T3 (`npm run test:worktree`) vert après la dernière édition de code :
  séquence CI complète en 9 min 32 s, 366 E2E passés (Chromium et WebKit,
  build de production). Un premier T3, lancé avant le correctif P1, a été
  arrêté ; il n'a pas compté.

## Problèmes ouverts (tous à régler AVANT l'allumage, aucun avant le merge)

- **Lot à part D-277** (`20261111-2148-a`) : le drapeau ne s'allume pas avant.
- **Copies NULL.** Une assignation `CAB_` envoyée drapeau éteint n'aura jamais
  l'encart, même après « Déclarer oui » (0027-a, pas de repli). Avant
  l'allumage, compter par conteneur, en agrégat, les assignations `CAB_`
  ouvertes à copie NULL ; si le compte n'est pas nul, arbitrer à ce moment-là.
- **Verrous non éprouvés contre Postgres.** `FOR SHARE` de l'envoi et
  `FOR UPDATE` de la modification ne sont testés que comme chaînes SQL. À
  jouer sur une base locale (`wn-dev-db`) avant l'allumage : envoi concurrent
  d'une modification, d'une publication ou d'une déclaration.
- **Reprise avant un rallumage** : inchangée (`docs/FEATURE_FLAGS.md`). Le
  filtre de ce lot ne la remplace pas, car une déclaration périmée est non
  NULL.
- `demander_relecture` compte aussi les envois hors verrou. C'est sans effet
  sur l'encart, car un brouillon n'est pas envoyable et l'envoi l'écarte sous
  son verrou.
- Porte 24 (`20261109-1354-c`) et `20261111-2148-a` restent ouvertes, non
  tranchées.

## Prochaine action exacte

PR, CI (`node scripts/wn-attendre-ci.mjs <N>` en fond), revue CodeRabbit sur
la tête (sinon Copilot, PR-Agent ou `wn-reviewer`, selon D-468, D-393 et
D-448), un verdict par remarque, puis « prête @<sha> » à l'intégrateur.
Ensuite, hors de cette session :
1. lot à part D-277 ;
2. constat des copies NULL et essai des verrous sur base locale ;
3. allumage, geste du responsable ;
4. troisième migration, avec sa reprise avant son `ADD CONSTRAINT`.

## Interdits encore actifs

- Ni migration ni `schema.prisma` ; rien sous `web/src/lib/clinical/`.
- Texte de l'encart D-275 inchangé. Rien de D-277 sur un `CAB_` (D-493) : un
  banc le tient.
- Aucun texte, valeur, seuil, nom de drapeau ni D-xxx nouveau sans arbitrage.
- Ne pas reposer D-303, D-493, les réponses 0027-a à 0030-a, ni les
  arbitrages P2-1, P2-3 et P2-4 du 2026-11-12.
- Production en lecture seule, par conteneur, en agrégats.
