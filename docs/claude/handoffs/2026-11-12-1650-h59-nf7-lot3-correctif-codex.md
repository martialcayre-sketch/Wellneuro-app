# Handoff — 2026-11-12 — H59 (J2-base), NF-7 lot 3 : correctif de la passe Codex (P1-1)

Complète `2026-11-12-1215-h59-nf7-lot3-garde-envoi-declarer.md`, qui reste
valable pour tout le reste du lot.

## Branche et état Git

- Worktree `.claude/worktrees/h59-nf7-lot3`, branche `feat/h59-nf7-lot3`,
  rebasée sur `origin/main` `07644dfc` sur arbitrage du responsable. Aucun
  fichier commun avec les quatre commits repris (#2019, #2020, #2022, #2024).
- PR #2021 ouverte. L'ancienne tête `46372d46` a été bloquée par la passe Codex ;
  la nouvelle tête est à redéclarer « prête ».

## Objectif

Corriger le P1-1 de la passe Codex manuelle du responsable, sans élargir le lot.

## Décisions prises

- Aucune D-xxx. Le correctif applique la correction minimale proposée par
  Codex : drapeau allumé, une édition des métadonnées seules (titre, domaine,
  description) n'écrit plus `definitionJson` ni `scoringJson`. Drapeau éteint,
  l'écriture d'avant.

## Fichiers modifiés

- `web/src/app/api/praticien/instruments/route.ts` : `data` de l'édition.
- `web/src/app/api/praticien/instruments/route.test.ts` : banc de
  l'entrelacement (drapeau allumé, ligne en mémoire partagée) et banc drapeau
  éteint.
- `changelog.d/2026-11-12-h59-nf7-lot3-garde-envoi-declarer.md` (une phrase),
  `docs/claude/plan-journal/H59/2026-11-12-03-nf7-lot3-correctif-codex-metadonnees.md`.

## Validations exécutées

- Le banc de l'entrelacement rougit sur la route de `46372d46`, puis passe avec
  le correctif (62 tests du fichier verts).
- T1 (`check:rapide`) vert après l'édition du code.
- T3 : voir le commentaire de redéclaration sur la PR.

## Problèmes ouverts

Ceux du handoff de 12 h 15, inchangés :
- lot à part D-277 (`20261111-2148-a`) ;
- constat des copies NULL ;
- verrous à éprouver contre Postgres ;
- reprise avant un rallumage ;
- porte 24.

S'y ajoute un risque résiduel, sans effet sur l'encart. Une édition de contenu
qui ne fournit que la définition réécrit la grille lue avant son verrou, et
inversement. Une grille modifiée en concurrence peut donc être perdue.
L'instrument repasse toutefois en brouillon, déclaration effacée : il n'est
pas envoyable avant une relecture et une nouvelle déclaration.

## Prochaine action exacte

T3, push, CI en fond, passe Codex du responsable sur la nouvelle tête, puis
« prête @<sha> » à l'intégrateur.

## Interdits encore actifs

Ceux du handoff de 12 h 15 :
- ni migration ni `schema.prisma`, rien sous `web/src/lib/clinical/` ;
- texte de l'encart D-275 inchangé, rien de D-277 sur un `CAB_` ;
- aucun texte, seuil ni D-xxx nouveau sans arbitrage ;
- ne pas reposer D-303, D-493, 0027-a à 0030-a, P2-1, P2-3 ni P2-4 ;
- production en lecture seule, par conteneur, en agrégats.
