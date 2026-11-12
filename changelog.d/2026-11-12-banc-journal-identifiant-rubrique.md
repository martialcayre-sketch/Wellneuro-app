### Outillage : banc identifiant–rubrique du journal du plan, bloquant en CI (D-502 §4, 2026-11-12)

Outillage seul : ni code applicatif, ni migration, ni écriture en base.

- Nouveau banc `scripts/wn-plan-journal-rubriques.mjs` (bibliothèque `scripts/lib/plan-journal-rubriques.mjs`). Il
  refuse, dans `docs/claude/plan-journal/`, une ligne qui associe un identifiant de claim (`WN-CL-…` ou forme courte)
  et un nom de rubrique d'étiquetage (`D-325` §5). Deux formes sont refusées : un code de rubrique entre accents
  graves, ou un nom dans les quatre mots qui suivent « rubrique », « étiquet… », « sign… » ou « besoin ». Un nom seul
  ou un identifiant seul ne rougit pas, et la mention « rubrique occultée » passe.
- Les noms se lisent dans `web/src/lib/fiches-usage/vocabulaire.ts`, jamais recopiés. Le rapport est opaque : chemin
  et ligne seulement.
- Branchement : étape bloquante du job `verify`, à côté du garde du journal ; banc de tests ajouté à l'étape des bancs
  du journal ; les deux sont atteignables depuis `npm run check` (`plan-journal-check`, `bancs-outillage-check`).
- Balayage de l'arbre : une seule ligne a été trouvée avant le branchement. Elle a été occultée par `D-504` (#2040),
  et le banc entre vert.
