---
paths:
  - "docs/**"
  - "changelog.d/**"
  - "CHANGELOG.md"
  - "*.md"
---

# Documentation, changelog, handoffs

- Distinguer état courant (`docs/claude/PROJET_CONTEXTE.md`), procédure,
  planification (`docs/roadmap.md` et roadmaps actives) et historique
  (`CHANGELOG.md`). Vérifier toute affirmation technique contre le dépôt réel.
- **Changelog par fragments** : ne pas éditer le haut de `CHANGELOG.md` ;
  poser `changelog.d/AAAA-MM-JJ-slug.md` (le bloc `###` qui irait sous
  `## Non publié`). Détail : `changelog.d/README.md`.
  **À la RACINE du dépôt, jamais sous `web/`** — le CLI ne collate que celui-là,
  et `web/changelog.d/` avait accumulé 17 fragments perdus avant que la
  sentinelle de `scripts/changelog-collate.test.mjs` ne ferme la porte.
- **Handoff par fragments** : `/wn-handoff write` pose
  `docs/claude/handoffs/AAAA-MM-JJ-HHMM-slug.md` ; le handoff courant est le
  dernier au tri. Jamais de créneau unique réécrit par deux branches.
  Convention : `docs/claude/handoffs/README.md`.
  **Huit rubriques, et aucune n'est optionnelle** : branche et état Git ;
  objectif ; décisions prises ; fichiers modifiés ; **validations exécutées** ;
  **problèmes ouverts** ; prochaine action exacte ; **interdits encore actifs**.
  Elles sont listées dans `/wn-handoff` — mais ce skill porte
  `disable-model-invocation`, donc un handoff **écrit à la main** n'en hérite
  pas : les trois en gras sont précisément celles qui manquaient aux deux
  handoffs du 2026-09-16, et une revue l'a relevé (`D-214`). Un handoff qui
  s'arrête à la prochaine action laisse la session suivante sans ce qui a été
  vérifié, ni ce qui reste ouvert.
- **La clôture passe avant la PR** : `/wn-finish` puis `/wn-handoff write`
  s'écrivent sur la branche vivante et partent dans la PR du lot. Le merge
  étant un squash, ce qui s'écrit ensuite coûte une seconde PR de doc. Fenêtre
  fermée → écrire depuis `main`, jamais en rebranchant sur la branche
  squashée.
- `docs/claude/SESSION_LOG.md` est append-only.
- Ne pas supprimer, déplacer, fusionner ou archiver un document sans
  confirmation distincte ; préférer un lien vers la source canonique à une
  duplication.
