### Corpus : la marque « exclu de la recherche », migration seule (D-490, F05, 2026-11-11)

Question `20261104-2225-b` de la liste commune : la validation d'un claim et sa visibilité en recherche deviennent
distinctes. Cette PR est la migration seule ; le geste de l'atelier suit dans une seconde PR, après la release-db et
son constat par conteneur.

- `rag_corpus_claims.exclu_recherche` (booléen, faux par défaut) : toutes les lignes naissent non exclues, la
  recherche rend donc exactement ce qu'elle rendait.
- Type d'acte `exclusion_recherche` au journal des actes de revue : un claim par acte, un sens (`exclure` ou
  `retablir`), un motif non blanc ; ni décision ni pièce de tirage.
- `match_wellneuro_rag_claims` est redéfinie à signature égale, avec un sixième prédicat, de recherche et non de
  validité. `validite.ts` et les citations explicites ne changent pas (D-140 §7 précisé).
- Contrat `rag_claim_exclusion_recherche_v1_negatif.sql` en CI : un claim exclu ne remonte pas, son jumeau non exclu
  remonte, et toute forme incomplète de l'acte est refusée. Le contrat a été vu rouge sous quatre mutations : le
  prédicat retiré de la fonction, `btrim` à un argument, l'ensemble des blancs réduit, et le tirage admis.
- `schema.prisma` est inchangé : les deux tables sont externes.
