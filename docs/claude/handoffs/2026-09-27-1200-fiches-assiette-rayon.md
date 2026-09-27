# Handoff — 2026-09-27 — Fiche d'assiette, lot 6b : le rayon « Fiches conseils »

## 1. Branche et état Git

`wn-fiche-assiette-rayon`, worktree `.claude/worktrees/deploy-anti-recul-lot1`,
partie de `origin/main` à `188128a8` (#1236, lot 6a). Le lot 6a est constaté en
service : build terminé le 2026-09-27 à 08:38 UTC, plus rien en vol côté
déployeur.

## 2. Objectif

Lot 6 de `D-251`, seconde moitié : l'écran du rayon « Fiches conseils » de la
Bibliothèque, qui consomme les trois routes de 6a, et son E2E.

## 3. Décisions prises

- **Pas de drapeau.** Le rayon remplace la bannière « à venir » (§7 : le drapeau
  garde l'émission, pas la relecture). L'écran dit que valider n'envoie encore
  la fiche à aucun patient, **ce que le lot 8 devra réécrire**.
- **La relecture se fait dans la page, pas dans un tiroir.** `PanneauSuperpose`
  plafonne à `max-w-2xl`, trop étroit pour deux colonnes. La relecture remplace
  la liste, avec un retour.
- **La surface précède l'attestation (D-195 §2).**
  - La case de déclaration n'existe qu'une fois le détail chargé.
  - Elle retombe à chaque rechargement : après un acte, sur un refus qui
    recharge, ou sur un changement de version.
  - La valeur envoyée dérive de la case, jamais d'une constante.
- **Les gestes proposés suivent les transitions de `decision.ts`.**
  - Valider est fermé s'il y a des anomalies, un contenu illisible, ou une
    version plus récente déjà validée (anticipation de `version_depassee`).
  - Un état illisible ne propose aucun geste.
- **L'annonce de retrait** se calcule avec `derniereVersionValidee` (la même
  fonction que la liste) : « la vN redeviendra la version de référence »,
  « plus aucune version de référence », ou « la vN le reste ». La validation
  annonce aussi la version qu'elle remplace. Le message de succès nomme la
  référence d'après la version RELUE (un autre onglet a pu valider).
- **« Version de référence », pas « version servie »** (constat de la revue
  doctrine) : c'est la plus récente validée (§5), mais les contrôles seront
  rejoués au moment de remettre (§6). Une version validée qui ne passe plus
  les contrôles ne sera pas forcément servie ; l'écran ne le promet pas.
- **Les refus qui disent que l'affichage n'est plus l'état de la base
  rechargent la relecture** : empreinte ou état divergent, état illisible, déjà
  dans cet état, version dépassée, contrôle, version introuvable.
- **Marqueurs de page** : l'écran reconnaît la forme posée par l'outil
  (`<!-- page N (lecture X) -->`) et la nomme « Page N ». Toute autre ligne
  s'affiche telle quelle ; rien n'est retiré de la source.
- **`MOTIF_MAX` passe dans `etat.ts`**, module pur. `decision.ts` le réexporte,
  et l'écran borne le motif à la même valeur sans importer Prisma.
- **L'E2E sème un brouillon, jamais un acte (`DC-16`).**
  - Assiette végétale, sans réserve, contenu verbatim : aucune lecture du corpus.
  - Tables append-only : chaque run ajoute une version, le spec vise le numéro
    rendu. Un filet d'entrée retire par la vraie route ce qu'un run tué a
    laissé validé.

## 4. Fichiers modifiés

- Nouveaux :
  - `web/src/components/fiches-assiette/` : `RayonFichesConseilsPanel.tsx`,
    `RelectureFicheAssiette.tsx`, `libelles.ts`, et deux fichiers de tests ;
  - `web/src/app/api/praticien/fiches-assiette/actes/confirmations.guard.test.ts` ;
  - `web/e2e/bibliotheque-fiches-conseils.spec.ts`.
- Modifiés :
  - `web/src/components/BibliothequePanel.tsx` : le rayon est monté,
    « à venir » est retiré ;
  - `web/src/app/dashboard/bibliotheque/page.tsx` : commentaire ;
  - `web/src/lib/fiches-assiette/etat.ts` et `decision.ts` : `MOTIF_MAX` ;
  - `web/e2e/helpers/db.ts` : semis et lectures du banc ;
  - `web/e2e/dashboard-praticien.spec.ts` : commentaire.
- `changelog.d/2026-09-27-fiches-assiette-rayon.md`, `docs/claude/SESSION_LOG.md`,
  ce handoff.

## 5. Validations exécutées

- Vitest de l'écran et de la garde : 26 verts.
- Mutations jouées, dix-sept, toutes attrapées :
  - relecture en dur (la garde a été resserrée : la première forme laissait
    passer un ternaire `? true`) ;
  - jeton non renvoyé ;
  - pas de rechargement sur 409 ;
  - déclaration non remise à faux ;
  - validation sans déclaration ;
  - annonce de retrait fausse ;
  - motif vide accepté ;
  - illisible présenté « à valider » ;
  - version de référence ancienne oubliée ;
  - anomalies ignorées ;
  - réponse perdue sans rechargement ;
  - « Retour aux fiches » actif pendant l'envoi ;
  - historique actif pendant l'envoi ;
  - focus perdu à l'annulation ;
  - liste périmée affichée au retour ;
  - réserves d'un contenu illisible lues « absentes » ;
  - référence dite d'après l'annonce plutôt que d'après la version relue.
- Mutation E2E : les blocs de l'adaptation sans coupure des mots.
  - La première vérification de débordement ne la voyait pas : un mot long
    déborde de son paragraphe sans que la boîte bouge.
  - Elle mesure désormais aussi le texte qui sort de sa boîte, et la mutation
    est attrapée sur iPhone 13.
- T2 (premier passage) : 214 E2E verts et un rouge, le nouveau spec sur
  iPhone 13, sur un débordement horizontal de la page.
  - Le diagnostic nomme un tableau et un sélecteur d'`AssignationsPacksPanel`,
    antérieurs au lot.
  - La vérification est désormais bornée à la zone du rayon.
  - Le spec, rejoué seul sur les deux projets, est vert.
- T1 et T2 sur la version finale : verts. T2 : 613 fichiers Vitest (10 216
  tests), build de production, 215 E2E.
  - Un T1 intermédiaire a rougi sur un test d'outillage sans lien avec ce lot
    (`release-db-comportement`, bloqué environ 15 min puis tué). Rejoué seul :
    21 verts en 19 s ; T1 complet ensuite vert.
- **Revue adverse**, 4 angles prévus :
  - Concurrence et revue générale (`wn-reviewer`) : 9 constats, dont 1 P1 et
    8 P2, tous corrigés.
    - P1 : un fichier de test était indexé avant son correctif de type (index
      et arbre de travail désormais identiques).
    - P2 (concurrence) : navigation pendant un acte en vol, réponse perdue
      présentée comme « rien n'a été enregistré », focus perdu dans les gestes
      en deux temps.
    - P2 (générale) : mots longs non coupés sur mobile, garde contournable par
      un autre délimiteur d'URL ou par une case cochée d'office.
  - Doctrine, et sécurité avec l'E2E : coupés par la limite de session,
    rejoués par un agent `wn-reviewer`. Verdict GO, sans P0 ni P1, et
    4 constats P2 :
    - « servie » promis d'une version que le service pourra refuser, corrigé
      en « version de référence » ;
    - réserves d'un contenu illisible lues « portée par aucune précaution »,
      corrigé en « indéterminable » ;
    - ancienne liste affichée pendant qu'on la relit, corrigé ;
    - référence annoncée d'après un état périmé (autre onglet), corrigé par le
      message de succès relu. Le changement de rayon pendant un acte est
      accepté (§6).

## 6. Problèmes ouverts

- **`AssignationsPacksPanel` déborde horizontalement sur iPhone** (son tableau
  et son sélecteur). Défaut antérieur, hors lot, à router vers un lot UI de la
  Bibliothèque.
- **« Qui est le responsable »** : aujourd'hui, tout praticien authentifié.
- **Retrait de la version de référence** : la version validée précédente
  redevient la référence. L'écran l'annonce, mais le responsable peut vouloir
  la règle inverse.
- **Au service (lot 8)** : que faire d'une version de référence qui ne passe
  plus les contrôles ? Se replier sur la précédente validée, ou ne rien servir ?
  À trancher avant le lot 8.
- **La phrase « Valider une fiche ne l'envoie encore à aucun patient »** du
  rayon deviendra fausse au lot 8 : ce lot devra la réécrire, idéalement sous
  une garde qui la lie au drapeau.
- **Un acte en vol pendant un changement de rayon** : les boutons de rayon de
  `BibliothequePanel` ne sont pas fermés pendant l'envoi. La liste relue
  ensuite peut précéder le COMMIT ; un nouvel essai reçoit alors un 409 sans
  dommage. Risque accepté pour ce lot, avec un seul responsable.
- **Bornes d'âge (§6)** et **accord de dépôt des brouillons en production** :
  toujours ouverts. Tant qu'aucun brouillon n'est déposé, le rayon affiche
  « Aucune version » partout en production.

## 7. Prochaine action exacte

Merge de 6b et constat du déploiement. Ensuite, soit l'accord du responsable
pour déposer les brouillons en production et les relire dans le rayon, soit le
lot 7 (migration M2).

## 8. Interdits encore actifs

- Aucun texte de Fiche MY au dépôt, en PR ou au journal : bancs synthétiques.
- « Un merge à la fois » (D-248).
- Aucun dépôt en production sans l'accord du responsable.
