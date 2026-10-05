---
paths:
  - "docs/**"
  - "changelog.d/**"
  - "CHANGELOG.md"
  - "*.md"
  - ".wn/state.json"
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
  Elles sont listées dans `/wn-handoff` — que le modèle peut invoquer depuis
  le 2026-09-30 ; un handoff **écrit à la main**
  n'en hérite pas. Les trois en gras sont celles qu'une revue a trouvées manquantes le
  2026-09-16, sur le handoff qu'elle examinait (`D-214`) ; elles y ont été
  ajoutées dans la même PR. Elles manquent **toujours** à celui du même jour à
  21 h 54, non réécrit — un handoff passé ne se réinterprète pas. Un handoff qui
  s'arrête à la prochaine action laisse la session suivante sans ce qui a été
  vérifié, ni ce qui reste ouvert.
- **La clôture passe avant la PR** : `/wn-finish` puis `/wn-handoff write`
  s'écrivent sur la branche vivante et partent dans la PR du lot. Le merge
  étant un squash, ce qui s'écrit ensuite coûte une seconde PR de doc. Fenêtre
  fermée → écrire depuis `main`, jamais en rebranchant sur la branche
  squashée.
- `docs/claude/SESSION_LOG.md` est append-only.
- **Identifiant de dossier sans métrique** (arbitrage du 2026-10-05) : dans
  un fichier durable (`.wn/state.json`, handoff, `SESSION_LOG`, fiche, `D-xxx`),
  un identifiant de dossier réel ne s'accompagne jamais de mesures qui en
  décrivent le contenu (nombre de lignes, valeurs, constats). Écrire « un
  dossier de test » et des agrégats. L'historique déjà versé ne se réécrit
  pas ; les fixtures de code ne sont pas visées.
- Ne pas supprimer, déplacer, fusionner ou archiver un document sans
  confirmation distincte ; préférer un lien vers la source canonique à une
  duplication.
