# Handoff — 2026-08-07 07:45 — LOT-03 packs : garde du pack de base

Campagne `2026-08-06-packs-personnalises`, LOT-03. Branche
`worktree-lot-03-packs-portes`. D-031 déjà mergée sur `main` (PR #602).

## Où en est le lot

**Code livré, geste production dû.** Les cinq gestes sont écrits, T1 et T3 verts,
revue adversariale passée après deux correctifs bloquants.

Ce qui reste, et qui n'appartient pas à l'assistant : **six désactivations par
l'UI praticien**, après déploiement du garde. Puis relire « exactement un pack
actif », et vérifier `pack-reevaluation`.

## Ce qu'il faut savoir avant de toucher à ce lot

**Le garde se lit sur l'état résultant, pas sur le payload.** Ne pas le
« simplifier » en contrôle champ par champ : deux des cinq chemins de casse n'ont
aucun champ fautif pris isolément — `PATCH { parDefaut: true, actif: false }` en un
appel, et `PATCH { parDefaut: true }` sur un pack déjà inactif, qui ne mentionne
même pas `actif`. Le test 5 est le discriminant ; il rougit si le prédicat lit le
payload. Le commentaire au-dessus du helper le dit, le lire avant de refactorer.

**Le garde des instruments suspendus ne porte que sur les qids ajoutés.** La
première rédaction refusait sur l'ensemble fourni, et elle mordait en production :
l'écran d'édition renvoie toujours l'état stocké, un instrument suspendu n'a pas de
case à décocher, et le pack de base contient `Q_ALI_09`. Tout renommage aurait rendu
409 en demandant un geste impossible. Le test 16 envoie le payload **réel** de
l'écran — sa version initiale, sans `qids`, passait au vert sur le code fautif.

**Trois tests de ce lot n'étaient pas falsifiables à leur première écriture.** Le
repli de casse (une seule fixture dans la casse de la constante matchait toujours),
le cas `pack-reevaluation` (le double de `findMany` ne rejouait pas le filtre
`actif`), et le cas 16 ci-dessus. Sur ce lot, écrire le test ne suffit pas : il faut
muter et regarder rougir.

## Pièges rencontrés, à ne pas repayer

- **Ne jamais restaurer un fichier du lot par `git checkout --`** pendant une
  vérification par mutation : le travail du lot n'est pas committé, `checkout`
  restaure HEAD et rend la mutation permanente. Restaurer par édition inverse,
  vérifiée au checksum. (Instruction fautive donnée à un agent, refusée par lui.)
- **Le scratchpad est partagé entre agents parallèles.** Deux agents y ont écrit un
  fichier de sauvegarde du même nom ; la restauration a écrasé un fichier avec le
  contenu d'un autre. Préfixer, ou ne pas passer par là.

## Dettes datées, hors périmètre

- Aucune réactivation depuis l'UI : après le geste, une désactivation par erreur n'a
  pas de retour. Le banc `PacksPanel.test.tsx` l'épingle explicitement.
- `questionnaire_packs.actif` n'est relu par personne ; après le retrait, 7 lignes
  sur 8 le porteront à `false`. Le retrait ne crée pas le défaut, il peuple sa
  condition de déclenchement.
- `prisma/seed.ts` ne répare pas un pack de base cassé (`upsert` avec `update: {}` :
  no-op silencieux qui affiche pourtant « Pack par défaut créé »).
- `schema.prisma:155-156` cite le pack en capitales — la casse qui a tué le repli.
  Non corrigé : ce fichier ne se touche pas sans demande explicite.
- Suture `suggestedPackSelection` laissée inerte.

## Lectures production du 2026-08-07

7 packs actifs ; « Base de consultation » (`PACK_-bG21yeIvVYRhrdlYuWIMnFz`) seul
`par_defaut`, contient `Q_ALI_09` (suspendu). `consultations.id_pack_assigne` : 15
sur le pack de base, 10 à `null` — aucune sur un pack à retirer.
`pack_propositions` : vide. Ces deux dernières annulent les risques cliniques que
D-030 laissait ouverts sur `pack-reevaluation`.
