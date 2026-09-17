# Handoff — 2026-09-17 — Le catalogue de conduites passe à trois lignes (D-227)

## 1. Branche et état Git

- Branche `wn-conduites-deux-lignes-2026-09-17`, partie de `origin/main` à
  `c6a38203` (#1181, migration `trace_formulation_choix` constatée).
- Worktree `phases-hash-2026-09-16`. `status --porcelain -uall` vide avant le lot.
- Le gel de `main` demandé pour la fenêtre `release-db` a été respecté : rien
  n'était prêt à merger pendant la fenêtre, et elle est refermée.

## 2. Objectif de la session

Attester les deux lignes de conduite que `D-224` avait retenues le matin, **après
avoir lu chaque claim sur pièce en production** — la consigne que `D-224` a
posée, et qui était la prochaine action écrite dans le handoff précédent.

## 3. Décisions prises

- **`D-227`** — les deux lignes sont attestées, sur un périmètre RE-SIGNÉ en
  entier : trois lignes, quatorze claims, une date et un sha qui REMPLACENT ceux
  du matin.
- **Six claims de plus** que la surface n'en proposait, trouvés en relisant les
  sources entières : `WN-CL-0315-004`, `WN-CL-0316-016`, `WN-CL-0316-029`,
  `WN-CL-0318-018`, `WN-CL-0318-023`, et `WN-CL-0320-002` qui entre là où il est
  juste après avoir été écarté de la ligne IRLS le matin.
- **La ligne dépression reçoit un `raccourciAssume`** que la surface ne prévoyait
  pas : bande du HAD → syndrome constaté, le pas que `D-224` avait fait déclarer
  à la ligne IRLS.
- **Tension `WN-CL-0315-004` / `WN-CL-0315-015` : pas de conflit** (arbitrage du
  praticien — cibles différentes). Aucune entrée au registre des conflits.
- **Deux arbitrages routés en file d'attente, non exécutés** : « relu par le
  praticien » devient un geste explicite ; la règle G6 doit distinguer une phrase
  recopiée d'une borne standard.

## 4. Ce que ce lot ferme, et ce qu'il n'atteint pas

- **Ferme** : les trois lignes du LOT-01 du catalogue de conduites. La surface de
  relecture du 2026-09-16 n'a plus de proposition en attente.
- **N'atteint pas** : aucun écran ne change. Le catalogue n'a toujours **aucun
  appelant de production** ; son consommateur est le LOT-04. Cette fonction se
  supprime si ce lot ne vient pas — elle ne se reconduit pas.
- **N'atteint pas** : la classe d'erreur « désignation incomplète ». Ni le sha,
  ni le contrat SQL, ni le CI ne voient ce qui MANQUE au périmètre relu. La
  parade reste humaine : relire la source entière, claim par claim.

## 5. Fichiers modifiés

- `web/src/lib/clinical/catalogueConduitesV1.ts` — deux lignes, métadonnée
  re-signée, sha littéral `36e7ec3a…`.
- `web/src/lib/clinical/catalogueConduitesV1.guard.test.ts` — bancs réécrits pour
  trois lignes ; **deux bancs neufs** : le filtre est PAR LIGNE (impossible à
  éprouver à une seule ligne), et retirer une ligne périme la signature.
  Commentaire périmé corrigé : le fichier EST enrôlé au banc du littéral.
- `web/src/lib/clinical/claimsEpinglesFraicheur.guard.test.ts` — l'arbitrage
  `conduites: false` passe de prévision à constat.
- `web/prisma/checks/rag_claim_fraicheur_tables_signees_v1.sql` et son
  `_negatif.sql` — douze paires de plus, prédicat recopié octet pour octet.
- `docs/DECISIONS.md`, `docs/FEATURE_FLAGS.md`, la surface de relecture,
  `FILE_ATTENTE.md`, un fragment `changelog.d/`.

## 6. Validations exécutées

- **Lecture de production, quatre one-off détachés, lecture seule** : colonnes de
  `rag_corpus_claims`, les six claims proposés, les 29 claims de `WN-SRC-0318`,
  puis les 20 + 29 claims de `WN-SRC-0315` / `WN-SRC-0316` plus `WN-CL-0320-002`.
  C'est cette dernière lecture — les sources ENTIÈRES — qui a rendu les six
  claims manquants.
- **T1 `npm run check`** : vert (404 tests, anti-secrets OK).
- **Bancs cliniques** `src/lib/clinical/` : 702 tests, 27 fichiers, verts.
- **T2 `npm run test:worktree -- --fast`** : **vert en 5 min 3 s**. 581 fichiers,
  9728 tests unitaires, 205 E2E (Chromium ET WebKit), **contrats SQL joués 31 s**
  — ils ne sont pas dans le saut `--fast`, donc le contrat de fraîcheur modifié a
  bien été exercé. Aucune signature `D-049` ce soir.
- **Contrôle G6 sur le diff**, joué à la main contre les douze textes lus en
  production : il a MORDU une fois (quatorze mots recopiés dans un commentaire),
  puis rendu zéro fragment de six mots ou plus après reformulation.

## 7. Problèmes ouverts

- **`D-049` reste ouverte, mais sa cause racine est mesurée** — amendement porté
  par une autre session le même soir (`eb24a572`, fusionné dans cette branche) :
  le correctif est identifié (WebKit 2352) et constaté ; `D-049` ne se ferme qu'à
  la montée. **T2 de ce lot n'a PAS rencontré la signature** — séquence rapide
  verte en 5 min 3 s, E2E Chromium et WebKit compris.
- **Dette `N11`** : `conflits_sources` n'a toujours pas de cas négatif au contrat
  de fraîcheur, comme `conduites` n'en avait pas avant `N10`. **C'est le lot
  suivant, décidé avec le responsable** — PR séparée, une seule finalité.
- **Deux arbitrages rendus, non exécutés** (§3) : « relu par le praticien » et la
  précision de G6. Les deux sont en file avec leur adresse.
- **Numéro de décision** : `D-227` est pris ici, à vérifier au merge — quatre
  collisions en deux nuits avec les sessions voisines.

## 8. Prochaine action exacte

1. Ouvrir la PR, **lire la revue Copilot et appliquer les corrections avant de
   merger** — `gh api --paginate --slurp repos/{owner}/{repo}/pulls/<N>/comments`
   dans un fichier, ET `gh pr view <N> --json reviews` pour lire `.reviews[].body`
   (un constat peut n'exister QUE là).
2. Puis le lot `N11` : le cas négatif de `conflits_sources`, sur le patron de
   `N10`, dans `rag_claim_fraicheur_tables_signees_v1_negatif.sql`.
3. Ensuite seulement, chantier 2 de S3 : le champ d'indication d'assiette et ses
   claims — **et lire chaque claim sur pièce, source ENTIÈRE, jamais depuis la
   surface**. C'est la leçon qui a rendu six claims ce soir.

## 9. Interdits encore actifs

- Aucune identité réelle au dépôt ; les dossiers de test se lisent par
  identifiant, jamais nommés, jamais visés par un seed ou un E2E.
- Aucun secret en dur ; production en **lecture seule** par conteneur détaché.
- Pas de migration Prisma ni de `schema.prisma` sans demande explicite.
- Aucun contenu clinique du corpus au dépôt tant que G6 est fermée — une ligne
  **désigne** ses claims, elle ne les recopie pas. La seule exception est le
  seuil arbitré en §3, et la précision de la règle est en file.
- Une signature clinique ne se pose jamais par l'outil : surface, demande,
  transcription.
- Force-push, production et arbitrages restent à demander. Autorisation Git
  courante jusqu'au **2026-09-24**.
