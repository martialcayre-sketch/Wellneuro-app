### Outillage : le journal du plan en fragments, outillage sans bascule (H90, PR 1) (2026-10-27)

- `scripts/wn-plan-bascule.mjs` sort les « Mise à jour » datées des fiches
  vers `docs/claude/plan-journal/<fiche>/`, un fragment par mise à jour, et
  pose une ligne de renvoi par fiche (D-371 §2). Il travaille à blanc par
  défaut et n'écrit que sur `--ecrire`, sans jamais écraser un fragment.
  Les lignes « Mise à jour » hors fiche restent en place, et une fiche
  irrégulière est écartée, intacte. La bascule n'est pas jouée dans ce lot.
- `scripts/wn-plan-fiche.mjs <Fnn|Hnn>` lit une fiche avec son journal.
- `scripts/wn-plan-journal-garde.mjs` avertit, sans jamais bloquer, d'un
  fragment modifié, renommé ou supprimé (D-371 §3).
- Trois bancs : aller-retour à l'octet près sur une copie du plan réel et sur
  des cas fabriqués, rien d'écrit sans le drapeau, lecture et garde. Ils sont
  câblés dans `npm run check` et dans le job `controles`.
