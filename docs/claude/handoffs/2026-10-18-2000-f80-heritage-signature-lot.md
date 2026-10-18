# Handoff — F80 : héritage de l'acte du groupe, signature NABM en lot (D-326)

## Branche et état Git

`lot/f80-heritage-signature-lot`, partie d'`origin/main` (77aff719), fusionnée
avec `origin/main` (74cdfd82) par délégation du responsable. Worktree
`.claude/worktrees/file-d1-suite`, session concurrente (cycle en `git`/`gh`
direct). PR à ouvrir sur `main`, sans migration.

## Objectif

Après la signature des neuf compositions de F80 : faire jouer le regroupement,
le remplacement et l'héritage sans que le responsable signe une à une trente-
neuf correspondances, et sans rien signer à sa place.

## Décisions prises

- D-326 (arbitrages du 2026-10-18) : « les deux » ; §1 un constituant d'un
  groupe signé tient l'acte du groupe (sans ligne NABM) ; §2 signature en lot
  des candidats préparés, tout ou rien, au nom de la session ; §3 l'acte d'une
  analyse groupée se signe « acte isolé ». Les quatre actes signés « groupe
  imposé » (1104, 1609, 1610, 0996) : le responsable les re-signe lui-même.
- Refusé : signer à la place du responsable — une signature NABM atteste la
  relecture de l'acte ; la délégation du 2026-10-16 couvre GitHub et
  release-db, pas les signatures (D-325 §5 non plus).
- Constat de production (lecture seule, conteneur) : 9 compositions, 1
  signataire, aucune retirée ; 9 correspondances signées au total.

## Fichiers modifiés

- `web/src/lib/biology-library/remboursable.ts` : champ `parGroupes`.
- `web/src/lib/biology-library/compositionsProposition.ts` :
  `avecActesDesGroupes`, appelé en tête de `remboursementsAvecCompositions`.
- `web/src/lib/biology-library/correspondancesNabm.ts` :
  `actesTenusDesGroupes`, `tenusDuGroupe` des candidats, `signerSousVerrou`
  (corps de la signature unitaire extrait, inchangé), `listerCorrespondancesALot`,
  `signerCorrespondancesLot`, `LOT_NABM_MAX`.
- `web/src/lib/biology-library/correspondancesNabmMessages.ts` (neuf) : les
  refus, sortis de la route (une route n'exporte que ses verbes).
- Route `web/src/app/api/praticien/biologie/nabm/correspondances/lot` (GET,
  POST) ; route unitaire : import des messages.
- `web/src/components/biologie/SignatureNabmLotPanel.tsx` (neuf),
  `RayonBiologiePanel.tsx` (bouton et tiroir), `CorrespondancesNabmSection.tsx`
  (aide « acte isolé », actes tenus du groupe, `DetailActe` et `ChoixNature`
  exportés), `FicheAnalytePanel.tsx` (mention du groupe).
- Tests : `compositionsProposition`, `propositionService`, `correspondancesNabm`,
  route du lot, `SignatureNabmLotPanel`, `CorrespondancesNabmSection`,
  `RayonBiologiePanel`.
- Docs : D-326, fragment `changelog.d/2026-10-18-d326-heritage-groupe-signature-lot.md`,
  fiche F80, matrice de consommation régénérée, SESSION_LOG.

## Validations exécutées

- Vitest ciblés verts (héritage, service, routes, composants).
- Contre-épreuves par mutation, toutes rouges : héritage désactivé (6 bancs),
  filtre « tenu du groupe » retiré (fiche et lot), tri des verrous retiré,
  cochage d'un « à juger » ; après la revue, une à une sur le lot : constat,
  « déjà en base », masque du groupe.
- Revue `wn-reviewer` (P1) : go sous réserve, trois points corrigés dans le
  lot — banc du lot rendu mesurant (actes présents au mock), masque « tenu du
  groupe » aligné sur la condition de l'héritage (`tenusEffectifs`), deux cas
  sur vraie base au banc `banc-nabm-gestes-prisma` (lot accepté au COMMIT,
  lot refusé sans rien écrire) ; nits : message du refus adapté au lot, liste
  relue après un refus, ligne mal formée nommée vide. D-326 §1 et §2 précisés
  (questions de la revue).
- T1 complet vert ; T3 : voir la PR.

## Problèmes ouverts

- Un constat « aucun acte » posé sur un constituant contredit sa composition
  signée : le constituant garde son état (fail closed) et rien ne le signale.
- Un candidat déjà en base comme proposition non signée n'entre pas dans le
  lot (seul « absente » se signe en lot) : il reste à signer sur sa fiche.
- La section « Composition » ne recharge pas le catalogue après une signature
  (préexistant, F80 PR 2) : la liste du rayon se met à jour au rechargement.

## Prochaine action exacte

PR, CI (`wn-attendre-ci`), revue `wn-reviewer` et CodeRabbit sur la tête,
merge, déploiement constaté. Puis, geste du responsable : sur les fiches NFS,
ionogramme, ionogramme complet et profil lipidique, retirer la signature et
signer en « acte isolé » ; ensuite « Signer en lot les correspondances
préparées » dans le rayon. Constat par conteneur après.

## Interdits encore actifs

Aucune signature, constat ou composition écrits par l'assistant, par script
ou par migration ; aucune règle d'indication ni bilan gelé modifiés ; aucune
identité réelle ; aucun lien d'artefact dans le dépôt ; jamais de pull, merge
ni rebase automatique hors délégation ; jamais `prisma format`.
