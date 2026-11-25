### Orchestration : la PR d'une passe cloud sort du brouillon avant « prête » (D-540, amendement du 2026-11-25)

Trois PR de passes cloud (#2342, #2345, #2355) ont été déclarées « prête »
alors qu'elles étaient encore en brouillon. L'intégrateur ne sert pas un
brouillon, et une sortie du brouillon après « prête » fait réécrire par
CodeRabbit son avis, ce qui suspend le merge (D-546).

- **D-540 amendée** : la PR d'une passe sort du brouillon aussitôt ouverte,
  avant le CI et la revue, jamais après « prête ».
- **Consigne de passe** (`docs/claude/templates/ORCHESTRATEUR_PASSE.md` §4) :
  la règle, et la vérification `.draft == false` avant « prête ».
- Les trois PR ont été sorties du brouillon puis redéclarées « prête » sur
  leur tête inchangée, CI et PR-Agent rejoués à `0`.
