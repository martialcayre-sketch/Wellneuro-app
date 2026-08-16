# LOT-06 — signature des quatre tables cliniques (D-061), et ce qu'elle a découvert

- **Branche** : `claude/lot-08-campagne-t0-5bwfzu`, PR #687 (draft), depuis
  `origin/main` frais (`71179fa`). CI vert, Vercel déployé.
- **Nature** : PR clinique à fort risque, avec **deux passages en force
  assumés**. Ne pas merger sans revue `wn-reviewer` et T3 joué sur le Mac.

## Ce qui est fait

Quatre tables signées au 2026-08-15 (ISO canonique) : arrêt et contradictions
**conjointement** (l'ordre a un sens clinique, `D-053` §5), priorités et
biologie **en passage en force**. `ORIENTATION_METADATA` était déjà signée
depuis le 2026-08-06 — une affirmation contraire propagée dans #685 et au §F.2
du catalogue est corrigée ici.

Sept sentinelles inversées plutôt que supprimées ; la machinerie de banc
(`chaineC1Fixture`, `chaineC1.test.ts`) corrigée, car elle capturait l'état
non signé en dur sous le nom d'« état livré ». `npm run check` vert,
41 fichiers.

## À reprendre en priorité — et la première est due au merge

1. **Procédure d'abstention dans le périmètre signé** (`D-061` dette a).
   Urgence réelle : les priorités sont la SEULE table **sans drapeau
   d'exploitation**, si bien que le merge allume le verdict d'abstention
   immédiatement, alors qu'aucune ligne signée ne le décrit (`DC-17`,
   `DC-26`).
   *Forme repérée* : la procédure vit dans `chaineC1.ts:evaluerAbstention`,
   compacte — trois issues, deux motifs de `required`. La sortir en données
   (`ABSTENTION_PROCEDURE_V1`) dans `priorityRulesV1.ts` et **étendre
   `PRIORITY_RULES_SHA256` pour la couvrir** suffit structurellement.
   *Fork à trancher avant de coder* : sa provenance. Ses deux motifs dérivent
   de la doctrine (`DC-12`, `DC-23` pour la sécurité ; `DC-24`, `DC-25` pour le
   canal non mesurable), non de claims du corpus. Faut-il l'adosser à des
   claims `VALIDE` — qui n'existent pas et seraient à écrire — ou au registre
   des décisions ? `DC-26` dit « le registre », sans trancher lequel.
2. **Renforcer le verrou biologie** avant toute première règle (`D-061`
   dette b) : `deriverStatutsBiologie` ne teste que le booléen, patron
   `tablePrioritesSignee` à reprendre (date + SHA + claims). Tant que la table
   est vide, la signature est observablement inerte — la fenêtre est ouverte
   jusqu'à la première règle.
3. **T3 et revue `wn-reviewer`** hors conteneur distant (`D-061` dette c).

## Injouable ici, à savoir

`npm run test:worktree` échoue à sa première étape : `wn-test-worktree.sh`
installe les navigateurs Playwright en dur (lignes 207-217) et
`cdn.playwright.dev` est refusé par l'allowlist du proxy. Aucun test de T2/T3
n'a tourné dans ce conteneur. `gh` est également absent :
`wn-attendre-ci.mjs` y est inutilisable, le suivi CI passe par les outils MCP
GitHub (`actions_list` avec `head_sha` ET `perPage=1`, sinon la sortie sature
le contexte ; l'API GitHub directe est bloquée par le proxy).
