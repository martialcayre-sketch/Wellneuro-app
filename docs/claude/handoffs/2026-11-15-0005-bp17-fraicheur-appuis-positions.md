# Handoff — 2026-11-15 — BP-17 : la fraîcheur des claims d'appui des positions citées (D-525)

## Branche et état Git

- Branche `feat/bp17-fraicheur-appuis-positions`, worktree `bp17-garde`,
  créée depuis `origin/main` (`304e5709`). Avancée deux fois en
  `--ff-only` avant une édition (D-518 §1) : sur `6c46405a` (#2134, doc),
  puis sur `0045026a` (D-524, sans recoupement avec ce lot).
- Lot `bp17-fraicheur-appuis-positions` du carnet (file C, ordre 80), pris
  par la file C, worktree `bp17-garde`.
- PR **P0** : clinique, et contrat de production lu en préflight de
  release-db. `wn-reviewer` passe avant le push, la passe Codex (D-505)
  après lui, et T3 est exigé.
- **Release-db au merge** : `web/prisma/checks/positions_citees_tables_signees_v1.sql`
  est un chemin déclencheur. Ni migration ni `schema.prisma`.

## Objectif

Trancher, puis contrôler, la fraîcheur des claims d'appui d'une position
d'expert citée par une table signée. C'est la question `20261114-1435-c`
(« trancher avant la signature »), à régler avant la signature de la
bibliothèque des options du besoin 2.

## Décisions prises

- **Sous-question `20261114-2214-c`** (nature clinique). Codex a d'abord
  été consulté à l'aveugle : il retient « A2 ; B1 », avec une confiance
  moyenne. Le responsable a ensuite répondu « A2 ; B1 ». Il a adopté
  « bornes comprises » un avis collé, qui n'avait pas été donné à
  l'aveugle. La ligne est à `repondue`, avec `decision: D-525`.
- **[[D-525]]**, rédigée par l'assistant, amende [[D-480]] §5.3 :
  - chaque claim d'appui doit tenir trois propriétés, sur sa paire exacte :
    présent, `VALIDE`, actif, non remplacé ;
  - la règle vaut dans toute rubrique, la dose comprise ;
  - `prescriptif` n'est pas exigé d'un appui.
- **Deux bornes** :
  - la position porte elle-même la dose et ses conditions. C'est une
    condition de signature : le contrat ne la contrôle pas ;
  - la signature d'une position n'autorise aucune prescription.
- **La réserve 9 de [[D-521]] §3** : sa question est tranchée. La relecture
  d'une position qui entrerait dans la liste demeure.
- **Le renvoi** est posé dans D-480 §5.3. D-521 n'est pas retouchée : la
  ligne « Répond » de D-525 suffit, et l'interdit de reposer D-521 tient.

## Fichiers modifiés

- `web/prisma/checks/positions_citees_tables_signees_v1.sql` : prédicat
  étendu, en-tête et message mis à jour.
- `web/prisma/checks/positions_citees_tables_signees_v1_negatif.sql` :
  - prédicat recopié à l'octet ;
  - six claims de fixture `WN-CL-9999-00x` et huit positions neuves ;
  - neuf cas neufs.
- `web/src/lib/positions-expert/positionsCitees.guard.test.ts` : trois
  tests neufs.
- `.github/workflows/ci.yml` : le commentaire de l'étape du négatif, seul.
- `docs/decisions/D-525.md` (nouvelle) et `docs/decisions/D-480.md`
  (renvoi).
- `changelog.d/2026-11-14-d525-fraicheur-appuis-positions.md`.
- `docs/claude/plan-journal/F11/2026-11-14-05-fraicheur-appuis-positions.md`.
- Ce handoff.

## Validations exécutées

- **Négatif** joué sur la base locale du worktree (`wn-dev-db.sh
  --migrate`) : vert.
- **Contrat positif** joué sur la même base, liste vide : vert. Une copie
  hors du dépôt, avec une position inconnue dans la liste, lève `WN001`.
- **Neuf copies mutées** du négatif, hors du dépôt. Huit le font rougir :
  - la branche des appuis vidée ;
  - `prescriptif` exigé ;
  - la jointure sur l'identifiant seul ;
  - le retrait de `superseded_at`, de `active` ou de `statut` ;
  - un `JOIN` interne vers le corpus ;
  - les appuis lus sur la version courante.

  La neuvième, le retrait de `c.claim_id IS NULL`, est équivalente : un
  appui absent a un `statut` NULL. `wn-reviewer` confirme ce jugement.
- **Banc `positionsCitees.guard`** : 15 verts.
- **T1 rapide** : vert.
- **Premier T3** : 12 rouges hors du lot, sous charge. Ce sont des délais
  et des bornes de performance :
  - `ProtocolMiniBuilder` (6) ;
  - `masquage` (3) ;
  - `GenericQuestionnaire` (2) ;
  - la garde `replisAssietteV1` (30 s).

  Rejoués seuls : 326 verts. Le segment E2E n'avait pas tourné.
- **Second T3**, sur l'arbre final : voir la PR.
- **`wn-reviewer`** (P0) : GO, sans P0 ni P1.
  - P2, l'adossement d'un appui à un extrait source, que `validite.ts`
    exige d'un claim valide : routé. Le contrat de fraîcheur des claims ne
    le juge pas non plus, et l'élargir demande une décision. Le routage est
    écrit dans D-525 §3 et dans le journal de F11.
  - P3, la lecture sur la version épinglée non prouvée : corrigé par le
    cas 15 et le mutant `m9`.
  - P3, aucune fixture `EN_ATTENTE_VALIDATION` : corrigé.
  - P3, le commentaire du CI : corrigé.
  - P3, « propose » au lieu de « lance » dans le changelog : corrigé.
  - P3, le renvoi absent de D-521 : écarté. D-525 porte la ligne
    « Répond », et D-521 n'est pas à reposer.
  - P3, le `v` facultatif des versions : écarté. L'égalité des chaînes
    échoue fermé, comme au contrat de fraîcheur. À relire quand une
    position entrera dans la liste.
- **Codex** : voir la PR.

## Problèmes ouverts

- **L'adossement des claims à un extrait source** n'est jugé ni par ce
  contrat ni par celui de fraîcheur. C'est une décision distincte, hors de
  ce lot.
- **La liste des positions citées est vide.** Une position qui y entre se
  relit en production, par conteneur, avec ses appuis.
- **La release-db lancée au merge.** Le constat se lit dans le run :
  préflight des positions vert et sentinelle `WN_RELEASE_DB_OK id=<run>`.
  L'intégrateur approuve tant que l'environnement garde ses relecteurs
  (D-520 §6).
- **La signature de la bibliothèque du besoin 2** vient après ce merge. Elle
  appartient au responsable, avec les dix réserves de D-521 §3 et les
  textes à l'atelier.

## Prochaine action exacte

1. Lire le second T3. Si un banc rougit hors du lot, le rejouer seul et le
   dire en exception.
2. Lancer T1 complet, committer, pousser et ouvrir la PR.
3. Lancer la passe Codex sur le diff poussé (`wn-codex-avis.mjs --mode
   revue`), et déposer un verdict pour chaque constat.
4. Lancer `wn-attendre-ci` en fond, puis `wn-revue-pr-agent` → 0, avec un
   verdict pour chaque remarque.
5. Relire la boîte C et la ligne du carnet, puis déclarer « prête @<sha> »
   à l'intégrateur. Il n'y a plus de lot `pret` dans la file C : les gestes
   restants sont au responsable.

## Interdits encore actifs

- Aucune option ni aucun renvoi retouché dans `bibliothequeBesoin2V1.ts`,
  et aucune signature cochée par l'outil.
- Ni migration ni `schema.prisma`.
- Dépôt public : aucun claim rattaché à une rubrique dans la prose, aucune
  nature d'option, rien de la note privée.
- Ne pas reposer D-480, D-514, D-521, D-525, le découpage ni les arbitrages
  BP-17.
