# Handoff — 2026-11-14 — file C, lot `garde-cockpit-fermeture` : le banc du cockpit étendu à la fermeture des imports

## Branche et état Git

- Branche `feat/garde-cockpit-fermeture`, worktree `bp17-garde`, créée
  depuis `origin/main` (`3f7f5d0f`, #2112).
- C'est une PR ordinaire, à déclarer « prête @<sha> » pour l'intégrateur
  (D-373, D-454). Elle ne touche ni migration ni `schema.prisma`.
- Aucun fichier n'est sous un chemin déclencheur de `release-db`
  (`.github/workflows/release-db.yml`, `paths:`). Le lot ne touche que
  `atelier-bibliotheque-options/` et des fragments : pas de release-db au
  merge.
- Au registre : `merge_fait` de #2111 (`20261114-1241-integrateur-c`) passé à
  `traite`. Au carnet : lot `garde-cockpit-fermeture` pris.

## Objectif

P3-a de `wn-reviewer` sur #2106 : `cockpit.guard.test.ts` ne contrôlait
qu'un niveau d'imports. Il fallait l'étendre à la fermeture résolue, ou
démontrer que `ecritures.guard` le couvre.

## Décisions prises

Ce sont des choix de forme, dans le cadre du lot. Rien de clinique.

- **Le banc est étendu, `ecritures.guard` ne couvre pas ce point.** Preuve
  par mutation sur `main@3f7f5d0f` : avec `prisma.patient.findUnique` dans
  `lecture.ts`, les deux bancs restaient verts (8 sur 8).
  - `ecritures.guard` voit qui insère, réécrit ou lit les deux tables de la
    bibliothèque, et qui importe sa lecture.
  - Il ne voit ni un autre modèle lu par `lecture.ts`, ni un import ajouté à
    `structure.ts`.
- **Fermeture des imports de valeur**, sur le patron
  d'`outillageBancs.guard`. Un `import type` n'est pas suivi : il ne charge
  rien (limite déclarée).
- **Les bornes** : `web/src/lib/prisma.ts` et `web/src/generated/prisma/`
  sont atteints sans être suivis, puisqu'ils nomment tous les modèles par
  construction. Le banc relève l'arête `importeur -> borne {noms importés}`.
  La seule arête admise est `lecture.ts -> prisma.ts {prisma}`.
- **Les accès aux modèles** sont jugés en position d'accès : propriété, clé
  constante, déstructuration. Les accesseurs sont lus dans `schema.prisma`.
  Seuls `bibliothequeOptionTexte` et `bibliothequeOptionTexteActe` sont
  admis.
- **Les accès extérieurs** reprennent la forme d'`aucuneLectureDeDossier` :
  identifiant ou chaîne, en fail-closed. Seul admis : `process.env` en
  valeur par défaut, dans `drapeau.ts`.
- **Le client en lien** est ramené par `dansLeDepot`, une copie locale de la
  fonction d'`outillageBancs.guard`. Aucun banc existant n'est touché.
- **Listes neuves, propres à ce banc** : fermeture admise (douze fichiers),
  modules extérieurs (`crypto`), modèles admis et accès admis. Aucune liste
  d'un autre banc n'est modifiée, `LECTEURS_ADMIS` compris.

## Fichiers modifiés

- `web/src/lib/atelier-bibliotheque-options/cockpit.guard.test.ts`
- `changelog.d/2026-11-14-garde-cockpit-fermeture.md`
- `docs/claude/plan-journal/F11/2026-11-14-03-garde-cockpit-fermeture.md`
- ce handoff

## Validations exécutées

- **Mutations réelles**, jouées puis retirées (copies restaurées,
  `git status` vérifié) :
  - `prisma.patient.findUnique` dans `lecture.ts`, et un import de
    `@/lib/postgres` dans `structure.ts` : rouge, et les fichiers sont
    nommés (`lecture.ts:patient`, `postgres.ts` dans la fermeture) ;
  - `dansLeDepot` neutralisé : la contre-épreuve du client en lien rougit.
- **Contrôle de fusion simulé** : avec `web/src/generated/prisma` posé en
  lien hors du dépôt, `cockpit.guard` et `ecritures.guard` restent verts
  (12 sur 12). La copie a été restaurée ensuite.
- **Bancs** : `cockpit.guard` à 8 sur 8.
- **T1** (`npm run check:rapide`) vert.
- **Revue `wn-reviewer`** (P1, garde) : GO, ni P1 ni P2. Quatre P3.
  - **P3-1, corrigé** : un contrôle positif du client. L'identifiant
    `prisma` n'apparaît qu'importé, ou comme objet d'un accès direct à un
    modèle admis. Un alias, `Object.values(prisma)` ou une clé variable
    rougissent. Les clés `as const`, `satisfies`, `!` et les gabarits à
    parties constantes sont déballés.
  - **P3-2, corrigé** : les noms importés du client sont figés
    (`lecture.ts -> prisma.ts {prisma}`). Les exports de `prisma.ts`, fichier
    partagé, ne sont pas figés.
  - **P3-3, corrigé** : au drapeau, seul `process.env` en valeur par défaut
    d'un paramètre est admis. `self` rejoint les accès extérieurs.
  - **P3-4, écarté avec motif** : les faux positifs futurs (un nom de modèle
    générique en propriété, `'global'` en chaîne) sont fermés par défaut, et
    la relecture tranche.
  - Les trois détecteurs neufs, neutralisés un par un, font rougir leur
    contre-épreuve. La copie a été restaurée.

## Problèmes ouverts

- **Limites déclarées** : une clé composée d'une variable (`prisma[k]`)
  n'est pas lue, et un `import type` n'est pas suivi. La fermeture est figée
  par liste exacte : un fichier qui y entre se relit.

## Prochaine action exacte

1. Ouvrir la PR, puis lancer `wn-attendre-ci` et `wn-revue-pr-agent` (repli :
   `wn-reviewer`, D-448).
2. Déclarer « prête @<sha> » : commentaire de PR, ligne `prete` au registre
   (boîte `integrateur`), et `pr` dans la ligne du carnet.
3. Le lot suivant de la file C : il n'y en a pas de `pret`. La PR 7
   (contenus) attend le responsable et la file B.

## Interdits encore actifs

- N'élargir aucun des périmètres balayés par les autres bancs, ni aucune
  liste admise. `LECTEURS_ADMIS` n'est pas touché.
- Ni migration ni `schema.prisma`. Aucun contenu clinique.
- Ne pas reposer D-480, D-514, le découpage ni les arbitrages BP-17.
  `20261114-1116-c` est close.
