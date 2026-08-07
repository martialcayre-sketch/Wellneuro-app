---
id: "LOT-07"
titre: "Clôture — déclarer 5.0, ou dire ce qui manque"
statut: "livré"
dépend_de: "LOT-00 à LOT-06"
---

# LOT-07 — Clôture : déclarer Wellneuro 5.0, ou nommer ce qui manque

## But

Rendre un verdict, pas une impression. Soit les six dettes sont fermées et 5.0 est
déclarable, soit il reste quelque chose — et ce quelque chose est nommé, daté,
avec son propriétaire.

Une campagne de clôture qui se termine par « globalement bon » n'a rien clos.

## Résultat observable

Un document `DECLARATION_5_0.md` qui, pour chacune des huit dettes de l'audit
d'entrée, dit : **fermée** (avec la preuve), **arbitrée et reportée** (avec la
date de revue), ou **ouverte** (avec le lot suivant qui la porte).

> **Correction de cadrage (2026-08-08).** Le « But » ci-dessus parlait de *six*
> dettes, ce « Résultat observable » de *huit*. Ce sont **huit** — c'est la
> numérotation de `sources/brief-dettes.md`, et la déclaration la suit.

Et deux faits vérifiables, indépendants de tout jugement :

- aucune PR ouverte non justifiée — #435 et #372 sont soldées ;
- `node scripts/wn-etat-reel.mjs` ne signale aucun écart avec `.wn/state.json`.

## Périmètre

- Rassembler les résultats des lots 00 à 06.
- Écrire la déclaration, dette par dette.
- Solder les PR ouvertes.
- Collationner `changelog.d/`.
- `/wn-finish` puis `/wn-handoff write` — **sur la branche vivante**, avant la PR
  de campagne, jamais après le merge.

## Hors périmètre

- Toute nouvelle correction : ce qui est trouvé ici devient un lot, pas un patch.
- Lever G-TRUST-04.
- Déclarer close une dette dont la preuve manque — c'est exactement ce que ce lot
  existe pour empêcher.

## Fichiers probables

- `docs/claude/campagnes/2026-08-05-cloture-des-dettes-wellneuro-5-0/DECLARATION_5_0.md`
- `CAMPAGNE.md` (statuts de lots)
- `docs/claude/handoffs/2026-MM-JJ-HHMM-cloture-dettes-5-0.md`
- `changelog.d/`

## Interdits

- Pas de déclaration « fermée » sans artefact vérifiable en face.
- Pas de secret ni de donnée patient réelle.
- Pas d'édition manuelle de `ACTIVE_CAMPAIGN.md` (vue générée).
- Pas de merge de la PR de campagne sans lecture du code de sortie de
  `node scripts/wn-attendre-ci.mjs` — `0` est le seul code qui autorise à annoncer
  la PR prête.

## Étapes

- [x] Rassembler les résultats des sept lots précédents.
- [x] Écrire `DECLARATION_5_0.md`, dette par dette, preuve par preuve.
- [x] Vérifier qu'aucune PR n'est ouverte sans justification.
- [x] Rejouer `wn-etat-reel.mjs` : zéro écart.
- [x] T3 complet.
- [x] Clôture écrite sur la branche vivante.

## Tests

- T3 `npm run test:worktree` complet.
- `bash scripts/check_no_secrets.sh` sur le dépôt entier.
- `node scripts/wn-cycle.mjs` : la phase doit être cohérente avec la clôture.

## Critères de done

- [x] `DECLARATION_5_0.md` couvre les huit dettes, sans case vide.
- [x] Chaque « fermée » a sa preuve ; chaque « ouverte » a ce qui la porte — une
      campagne à cadrer, faute de pouvoir poser un lot dans celle qu'on ferme.
- [x] #435 et #372 soldées.
- [x] `wn-etat-reel.mjs` : zéro écart — **et la déclaration écrit ce que ce zéro
      ne couvre pas.**
- [x] Handoff produit sur la branche vivante.

## Résultats

Livré le 2026-08-08. T3 complet vert : séquence CI entière en 2 min 08,
122 tests E2E passés, 2 ignorés, Chromium + WebKit.

**Le verdict : Wellneuro 5.0 n'est pas déclarable en bloc.** Trois dettes
fermées (consommation, moteurs de scoring, chemin d'écriture en base), une
arbitrée et reportée au 2026-10-21 (HDS), **quatre ouvertes**.

**Ce que ce lot a servi à empêcher.** Quatre des huit verdicts diffèrent de ce
que le lot concerné écrivait de lui-même — et aucun de ces écarts n'aurait été vu
en recopiant les sections `## Résultats` :

- **LOT-01 déclare comparer trois dimensions sur six.** Le script n'en compare
  plus qu'**une** : `git.branch` et `git.dirty` ont été retirées le 2026-08-07,
  la prose du lot n'a pas suivi. Et le lot courant n'est comparé par rien — vérifié
  en direct, `.wn/state.json` portait `LOT-06` quand `CAMPAGNE.md` disait LOT-07,
  sans que l'outil le voie.
- **LOT-04 coche « une date de retrait existe ».** Il n'en existe aucune : la date
  inscrite au code est celle de la décision. La redirection est par ailleurs dans
  `next.config.mjs`, pas dans la page, qui rend toujours l'ancien parcours entier.
- **LOT-02 annonce le repli legacy journalisé.** Le cas qui compte était déjà en
  `warn` avant le lot ; ce qu'il a ajouté couvre deux cas bénins dont il mesure
  ensuite zéro occurrence.
- **LOT-03 est juste dans le code** mais deux commentaires de
  `web/src/lib/clinical/` déclarent toujours ses trois moteurs « ouverts ».

**La règle qui en sort.** Une section `## Résultats` est une déclaration de son
auteur, pas une preuve. Vérifier veut dire exécuter le script, lire le code,
compter le registre — et le coût de ce lot tient presque entier dans ce geste.

**Une PR a bougé pendant la rédaction** : #618 était un brouillon `BLOCKED` au
cadrage, elle était mergée à la clôture. La déclaration le dit, et pose que
« aucune PR ouverte » est un instantané daté, jamais une propriété.
