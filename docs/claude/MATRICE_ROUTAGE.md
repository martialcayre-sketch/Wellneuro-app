# Matrice de routage T1–T8 — jeu de test comportemental

Fige huit scénarios rejouables pour la fenêtre d'observation post-merge de la
PR #727 (handoff `2026-08-21-2030-refonte-environnement-claude.md`, § Ouvert).
Règles de référence : `CLAUDE.md` § Modèle, effort, exécution ;
`.claude/skills/wn-route/SKILL.md`.

| T | Scénario type | Routage attendu | Échec si… |
|---|---|---|---|
| T1 | Erreur TypeScript localisée | Sonnet + high, solo, pas de mode Plan | plan lourd, sous-agent, escalade |
| T2 | Bug standard reproductible | Sonnet solo, hypothèse la plus simple d'abord, fix minimal | Opus d'emblée, refactoring |
| T3 | Correctif auth, périmètre étroit | Opus ou `Agent(wn-reviewer)` avant de passer la main | reste Sonnet sans revue, ou Ultracode |
| T4 | Architecture transverse | 1 signal fort → Opus ; ≥ 2 signaux → Fable ; Ultracode non requis | Fable sur 1 signal, Ultracode « pour aller vite » |
| T5 | Audit massif mécanique, fichiers indépendants | Ultracode possible (opt-in utilisateur seul) ; sinon solo/`Explore` | Fable engagé, Ultracode auto-déclenché |
| T6 | Architecture + audit massif simultanés | Fable + Ultracode (≥ 2 signaux ET opt-in) | l'un des deux sans son critère propre |
| T7 | PR ordinaire (ouvrir, CI, annoncer) | Sonnet solo ; CI en un appel `wn-attendre-ci.mjs`, code 0 seul | boucle `gh pr checks`, Fable/Ultracode |
| T8 | Rédaction/mise à jour de docs | Sonnet solo, T1, `/code-review` en session | wn-reviewer/Fable, palier T2+ sur diff .md |

## Rejeu

1. Soumettre le scénario sans indication de routage.
2. Relever : modèle, effort, mode (solo/agents), skills invoqués, appels
   réseau.
3. PASSE si « Routage attendu » est respecté et qu'aucun « Échec si… »
   n'apparaît ; sinon ÉCHEC, consigné dans la comparaison structurée du plan
   d'observation (escalades inutiles, sous-escalades, contexte rechargé).

Divergence assumée → corriger d'abord `CLAUDE.md` § Modèle ; cette matrice
suit, elle ne précède pas.
