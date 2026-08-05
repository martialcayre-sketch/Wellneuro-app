# Handoff — 2026-08-04 — Signature de la table d'orientation (LOT-08)

Écrit sur la branche vivante, avant le merge. Premier handoff de cette session sous
la convention instituée par #564 — `HANDOFF_CURRENT.md` a disparu pendant ce lot,
et la correction que j'y avais portée est partie avec, à juste titre.

## Git

- Worktree `.claude/worktrees/signature-table-orientation`, branche
  `worktree-signature-table-orientation`, partie de `main` à `d9aac3b1` (après #565).
- **PR #566**, campagne `2026-08-03-packs-moteur-d-intervention-et-corpus-consommable`,
  LOT-08. `main` a bougé une fois pendant le lot (#564) : merge résolu, collision de
  numéro de décision incluse.

## Ce qui est en place

- `ORIENTATION_METADATA` **signée** : `validationExterne: true`, `2026-08-04`,
  **23 claims** relus en base avant signature.
- Moteur `psqi` : `missing`/`repondus` sur ses **18 items cotés**, bande retirée sur
  recueil partiel, note composée avec celle de l'instrument.
- `orientationService` : **recalcul depuis `rawAnswers`**, quatre motifs de mise à
  `null`, la ligne restant dans la liste pour préserver `dejaRepondu`.
- `VERSION_SCORE_EQUILIBRE` : **v10/v11**.
- Huit bancs neufs, dont le `sha256` épinglé sur un littéral.
- Deux campagnes closes ; sept critères sur huit cochés avec leur preuve.

## Les cinq choses à savoir avant de toucher à ce code

1. **Le score est figé à la soumission, et l'orientation ne le lit plus.** C'est
   `D-019`. Toute garde de scoring future s'applique d'office au passé par ce
   chemin — mais **seulement pour l'orientation**. La fiche, la synthèse et le PDF
   continuent de lire l'instantané, et les deux arrivent au modèle dans le même
   message.
2. **Le sha épinglé n'est pas lié à `dateValidation`.** Mettre le littéral à jour
   sans re-signer redonne du vert. Le commentaire l'interdit, le code ne le sait
   pas. Le loger **dans** `ORIENTATION_METADATA` rendrait le geste visible.
3. **`WN_ENABLE_ORIENTATION_NNPP2` est désormais le seul verrou.** Jusqu'à ce lot sa
   valeur était sans effet, `tableSignee()` étant faux partout. Vérifier les trois
   scopes Vercel et les postes **avant** de considérer la route fermée.
4. **Le bump de version coupe l'historique de momentum.** Un T0 en v9 ne se
   soustrait plus à un T1 en v11 ; l'agrégat cabinet est masqué jusqu'à deux cycles.
   Coût assumé, déjà payé à v3 → v4.
5. **Deux séries `v11` coexistent** — consigne de synthèse et score d'équilibre. Un
   `v11` nu ne désigne plus rien. Même piège que le préfixe `R` des campagnes.

## Ce qui reste ouvert

- `tfd` (`Q_GAS_01`, cible de `R-GAS-01`) **non gardé** contre le recueil partiel :
  il ne publie aucun compte à la racine. Même classe sur `sum_decimal`,
  `count_threshold` et `ecab`, qu'aucune règle publiée ne vise.
- La garde `scores.error` de `orientationService` est **défensive et non prouvée** —
  la retirer laisse le banc vert. Écrit dans le code plutôt que supposé.
- Le huitième critère de campagne, non coché : la route ne sert pas encore.

## Prochaine action exacte

Poser `WN_ENABLE_ORIENTATION_NNPP2=1` en production Vercel — après avoir vérifié sa
valeur dans les trois scopes. Geste d'exploitation, hors campagne. Rien d'autre ne
bloque.
