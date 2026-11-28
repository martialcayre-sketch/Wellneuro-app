### L'intégrateur rejoue lui-même la preuve de revue avant de merger (2026-11-28)

`scripts/wn-integrer.mjs` mergeait sur la parole de la déclaration « prête »
sans relancer les preuves qu'elle cite (reste des parties 13-14
d'`autonomie-pieges-restes`, forme arbitrée le 2026-11-27). Avant le
déploiement, dans tous les modes (`--sans-merge` et `--filet` compris), il
lance `wn-attendre-ci <N> --sha <sha>` puis `wn-revue-pr-agent <N>`. Si
PR-Agent ne rend pas 0, le merge n'est admis que si la déclaration servie
— elle seule, d'origine déjà vérifiée — cite « D-448 » et « wn-reviewer GO
@<sha> » sur un préfixe d'au moins sept caractères du sha à merger. Sinon,
refus par un code neuf, 27 (24 reste évité). `docs/ROLES_MACHINES.md` et
`docs/claude/REGLES_PR_MERGE.md` le disent. Banc
`scripts/wn-integrer.test.mjs` : 16 cas neufs (repli lu, CI rouge, PR-Agent
rouge sans repli, repli hors déclaration, repli servi, sans-merge et filet),
rouges sous quatre mutations.
