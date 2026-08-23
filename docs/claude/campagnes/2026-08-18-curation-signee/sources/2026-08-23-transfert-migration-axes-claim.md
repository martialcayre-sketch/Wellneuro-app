# Transfert entrant — la migration des trois axes doctrinaux du claim

> Source ajoutée le **2026-08-23** par arbitrage du responsable ([[D-096]]).
> Ce périmètre venait du LOT-02 de la campagne « Doctrine exécutable » ; il
> lui a été **retiré** parce qu'aucun de ses lots ne le consomme. Le seul
> bénéficiaire est cette campagne-ci. À intégrer au cadrage de Curation
> signée, quand il aura lieu.

## Ce qui est transféré

Une migration sur `rag_corpus_claims`, ajoutant **trois axes doctrinaux**,
tous **nullables**, aucun avec un défaut porteur de sens clinique :

| Axe | Règle | Vocabulaire |
|---|---|---|
| Catégorie | `DC-07` | `A` descriptif · `B` associatif · `C` orientation · `D` intervention · `E` sécurité |
| Niveau d'exécution | `DC-13` | `AUTO` · `AUTO_WITH_EXPLANATION` · `SUGGEST_ONLY` · `PRACTITIONER_REQUIRED` · `PROHIBITED_AUTOMATION` |
| Nature du seuil | `DC-20` | `clinical` · `instrument` · `data_quality` · `technical` · `regulatory` |

## Pourquoi ici, et pas ailleurs

Ces colonnes n'ont **aucun consommateur applicatif**, ni aujourd'hui ni dans
les sept lots restants de « Doctrine exécutable ». Leur unique usage est
d'offrir un endroit où **écrire** la catégorie, le niveau d'exécution et la
nature du seuil d'un claim — c'est-à-dire le geste de curation que cette
campagne porte, à cadence praticien. Une migration sans consommateur, posée
par une campagne qui ne s'en sert pas, aurait été une colonne orpheline de
plus.

L'argument d'origine de l'audit (« si la migration n'est pas posée tôt, chaque
lot invente son équivalent local ») avait un sens quand les LOT-04, LOT-05 et
LOT-06 de la chaîne T0 étaient à écrire. Ces lots sont livrés depuis le
2026-08-18 : le risque de fragmentation qu'elle prévenait n'existe plus.

## Ce que le cadrage devra reprendre tel quel

- **Confirmation obligatoire** : la migration ne s'écrit qu'après accord
  explicite dans la conversation, **seule dans sa PR**, `release-db` entre
  elle et tout code qui la consommerait, application **constatée par
  conteneur** Scalingo ([[D-087]], [[D-092]]).
- `rag_corpus_claims` est une table **SQL-brut hors `schema.prisma`**
  (`prisma.config.ts`, `tables.external`) : le SQL s'écrit à la main, pas par
  `prisma migrate dev`. Chaque vocabulaire arrive avec sa contrainte `CHECK`,
  sur le patron de `rag_corpus_claims_typologie`.
- **Un fichier posé dans `web/prisma/checks/` ne tourne nulle part** tant
  qu'une étape CI ne le nomme (leçon [[D-042]]). Contrat **et** négatif, tous
  deux nommés.
- **Aucun backfill, aucun `DEFAULT` clinique.** Mesure de production du
  2026-08-23 (conteneur `one-off-8873`, lecture seule) : **8 224 claims, tous
  au statut `VALIDE`**, `metadata` ne portant que `section`, `source_chunk`,
  `page`, `usage`. Remplir un axe doctrinal sur 8 224 lignes par migration
  fabriquerait des déclarations que personne n'a prononcées (`DC-17`,
  `DC-19`) — c'est précisément le geste de curation, claim par claim, signé.
- **Ne toucher ni `statut`, ni `validateur`, ni `valide_at`.** Aucun claim
  certifié n'est rejugé par cette migration, et la voie de récupération
  `match_wellneuro_rag_claims` continue de servir les 8 224 à l'identique.

## Ce que le transfert ne change pas

- `typologie_lecture` reste un axe de **lecture**
  (`déclaré/observé/vécu/interprété`, `CHECK rag_corpus_claims_typologie`),
  sans rapport avec la taxonomie `A-E` : celle-ci est un axe **nouveau**, pas
  un enrichissement d'un axe existant.
- **La population ne fait pas partie du transfert.** [[D-095]] a arrêté
  qu'elle appartient à l'**intervention** (`DC-11`), pas au claim — modèle
  « général déclaré + exclusions déclarées », porté par le LOT-05 de
  « Doctrine exécutable ». Ne pas la réintroduire ici.
- Les porteurs de `DC-07`, `DC-13` et `DC-20` dans
  `CONSTITUTION_CLINIQUE.md` désignent désormais **cette campagne**.
