### Outillage : bascule du journal du plan jouée, règle d'écriture des mises à jour changée (H90, PR 2) (2026-10-28)

- Les « Mise à jour » datées des fiches de `docs/claude/PLAN_WELLNEURO.md`
  sortent dans `docs/claude/plan-journal/<fiche>/` : 254 fragments sur
  103 fiches, et une ligne de renvoi dans chaque fiche régulière (D-371 §2).
  Le plan passe de 546 184 à 394 850 octets, avec un aller-retour exact à
  l'octet près, d'abord en mémoire puis depuis le disque. Les quatre fiches
  écartées (F44, H26, H49, F79) restent en ligne, intactes.
- Nouvelle règle : une mise à jour de fiche s'écrit en fragment, jamais dans
  la fiche. Elle figure dans `.claude/rules/docs-changelog.md`, à l'étape 3
  de `/wn-finish`, dans le routage de `/wn-merge` et au point 3 de l'en-tête
  du plan. Un banc du plan réel rougit le CI si une mise à jour est écrite
  dans une fiche basculée, et la lecture refuse un fragment qui contient une
  ligne de titre.
- `node scripts/wn-plan-fiche.mjs <Fnn|Hnn>` lit une fiche avec son journal.
