### Bibliothèque des compléments et signature d'une règle : un claim non admissible écarte la règle (D-492, t76, 2026-11-11)

Dette t76 (§8), inscrite par t74. Cadrage validé le 2026-11-11. Aucune migration, aucune re-signature, aucune
`release-db` : aucun fichier du lot n'est sous les chemins de `release-db.yml`. Production : 0 règle dans
`clinical_rules`, effet nul au déploiement.

- La Bibliothèque filtrée par intention écarte, avant la sentinelle et toute projection, les règles dont le claim
  fondateur n'est pas valide au corpus ET non supplanté (`claimsAdmissiblesAuCatalogue`, D-479 §2). Elles ne fondent
  plus ni grade, ni forme préférée, ni référence, ni cumul, ni le compteur. La réponse les nomme (`reglesEcartees`,
  contrat `c4-catalogue-v5`), même sans fiche. Une panne du corpus reste une erreur technique.
- Le rayon affiche « 1 règle écartée : … » ou « {N} règles écartées : … À réviser dans l’atelier des règles. », avec
  le claim de chaque règle, ou « Aucun claim fondateur renseigné ».
- Justifications : « aucune règle admissible » remplace « aucune règle validée » pour le grade ; une intention sans
  règle admissible dit « Aucune règle admissible pour l’intention sélectionnée : cumuls et seuils non évalués. »
- La validation d'un brouillon relit, avant la transaction, le claim enregistré sur la règle. Si ce claim n'est pas
  admissible : refus 422 `claim_non_valide`, au message de D-479 §4. Aucune substitution de version.
- `rag/claims/validite.ts` : en-tête corrigé, `claimValideAuCorpus` retirée (aucun appelant en production).
- §8 du plan : t76 soldée.
