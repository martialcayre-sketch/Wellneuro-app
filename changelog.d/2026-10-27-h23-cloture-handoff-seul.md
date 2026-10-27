### Outillage : H23 amendée, le contrôle de clôture n'exige plus que le fragment de handoff créé par la PR (D-372 ; 2026-10-27)

- `scripts/wn-controle-cloture.mjs` : `verdictCloture` ne juge plus que les
  fichiers créés par la PR ; l'entrée `SESSION_LOG.md` n'est plus exigée. Le
  contrôle reste bloquant pour une PR qui touche du code, la dispense des PR
  documentaires est inchangée. Étape CI renommée « Contrôle de clôture
  (fragment de handoff) » ; contrôle CodeRabbit « Clôture de la PR » aligné.
- `scripts/wn-cycle.mjs` : la clôture d'un lot se réduit au fragment de
  handoff (`cloture: { handoff }`).
- `scripts/wn-context-pack.mjs` : le bloc « Dernier handoff » remplace la queue
  du journal — dernier fragment créé par la branche, à défaut le dernier au
  tri ; sa rubrique « Prochaine action exacte », bornée.
- Skills `wn`, `wn-finish`, `wn-lot`, `wn-pr`, `wn-merge`, `wn-handoff`,
  `wn-docs`, `wn-hygiene`, agent `wn-fable`, prompt `wn-finish`, `CLAUDE.md`
  § Début de session, règles `docs-changelog.md` et `pr-revue-et-release-db.md`,
  README des handoffs : le journal s'écrit sur demande, le handoff courant est
  le dernier de la branche.
- Bancs : une PR de code sans handoff créé est refusée (script réel) ; une
  entrée SESSION_LOG seule ne clôt rien ; le handoff créé par la branche prime
  sur le dernier au tri. Compaction du journal toujours gelée. Aucune
  décision nouvelle, aucune migration, aucun chemin clinique.
