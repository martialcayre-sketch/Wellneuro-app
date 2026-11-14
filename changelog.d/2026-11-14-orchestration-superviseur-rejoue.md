### Orchestration : instantané GitHub, superviseur rejoué et manifeste d'export (2026-11-14)

Lot `orchestration-4` (L2 du plan du super-orchestrateur, lot 2 de l'audit
externe : un superviseur en lecture seule, confronté à l'état réel avant
d'agir).

- **`scripts/wn-instantane-github.mjs`** rassemble, en lecture seule, ce que
  rendent les sondes en service. Pour chaque PR ouverte : la tête et son
  origine (dépôt de la branche ; auteur et vérification du commit, gardés
  mais pas encore jugés), les fichiers, la dernière exécution de chaque
  check, les déclarations « prête @<sha> » (auteur, association au dépôt,
  date, sha), l'empreinte du corps et les codes de `wn-revue-pr-agent` et
  `wn-sonde-release-db`. Pour les PR fermées récentes, l'état et le merge. Le
  fichier ne garde aucun titre, corps ni texte de commentaire, et son chemin
  est refusé dans tout arbre Git.
- **`scripts/wn-superviseur.mjs`** (moteur pur `scripts/lib/superviseur.mjs`)
  croise un export des registres et cet instantané, à une heure injectée. Il
  ajoute aux actions du contrôle des registres ce que GitHub permet
  d'établir : `merge_fait` manquant, déclaration périmée par une tête qui a
  avancé, merge à examiner ou en attente avec ses conditions manquantes,
  déclaration sans ligne au registre, lot à passer `fait`, question à clore,
  chevauchement. Un merge n'est dit examinable que si `verify` est conclu
  `success` sur la tête, la base est `main` et la déclaration vient d'un
  auteur qui a l'accès au dépôt. Une tête venue d'un fork, une déclaration
  d'un tiers ou un état de PR inconnu sont des anomalies. Chaque action dit
  ce qu'elle a vu et ce qu'il faut relire sur l'état réel avant d'agir. Le
  mode dégradé (instantané absent, hors contrat, périmé, partiel ou sans
  sondes ; export sans manifeste ou périmé) ne rend jamais `0`. Rien n'est
  écrit et aucun agent n'est lancé.
- **Manifeste d'export** (`manifeste.json`, lu par `wn-registres.mjs`) : la
  session y déclare, pour chaque collection, le nombre de lignes rendues et
  l'épuisement du curseur. Une page oubliée devient un écart (code `2`), de
  même qu'une heure d'export sans fuseau ; sans manifeste, la complétude est
  dite non attestée.
- Relecture adverse `wn-reviewer` avant le push : quatre faux verts fermés
  (CI partiel, état de PR illisible, déclaration d'un tiers, instantané vide
  à code 0), un banc par cas.
- Les deux bancs (42 tests, hermétiques) jouent dans `npm run check` et dans
  l'étape CI des gardes de merge. Consigne : `docs/ROLES_MACHINES.md`,
  « Le superviseur rejoué ».
