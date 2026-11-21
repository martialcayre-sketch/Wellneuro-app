# Handoff — file D, lot `garde-cockpit-options-legere` : la garde du cockpit des options mémoïse son analyse (2026-11-17)

## 1. Branche et état Git

- Branche `chore/garde-cockpit-options-legere`, tirée d'`origin/main`, avancée par `--ff-only` jusqu'à 3dcd34ee (#2221), dans le worktree `.claude/worktrees/orch-ci`.
- Carnet : lot `garde-cockpit-options-legere` (file D, ordre 90), inscrit et pris le 2026-11-17 sur le signalement de l'intégrateur (`20261117-1306-integrateur-d-2219`).
- #2221 (`synthese-enregistrer-verrou`), de la même session, est mergée.
- Fichier de code touché : `web/src/lib/atelier-bibliotheque-options/cockpit.guard.test.ts`. C'est un banc : aucun code de production, aucune migration, rien de clinique.

## 2. Objectif

Supprimer l'instabilité de `cockpit.guard.test.ts`. Le contrôle de fusion de #2219 l'a refusée une fois (code 12), puis elle est passée au rejeu. C'est le même schéma qu'`anthropicFluxBorne` avant #2209.

## 3. Décisions prises

- **Cause mesurée.** La contre-épreuve « une lecture du dossier glissée sous les imports directs rougit » calcule environ dix-huit fermetures. Chacune ré-analyse tous les fichiers avec le compilateur TypeScript, alors qu'un essai ne change qu'un fichier. Ce test prenait environ 500 ms seul (498, 539 et 494 ms sur trois mesures), et le fichier environ 1,1 s.
- **Correctif : mémoïser plutôt qu'allonger le délai.** `importsResolus` et `accesNommes` sont mémoïsés dans `fermetureDuCockpit`.
  - La clé combine le contexte (`WeakMap`), le chemin et le texte : une source surchargée n'est jamais servie depuis la mémoire d'une autre.
  - Le contexte du test « client Prisma en lien » (racine temporaire) a sa propre mémoire.
- **Les assertions sont inchangées.** Le test prend désormais 95, 59 puis 56 ms, et le fichier environ 0,6 s.

## 4. Fichiers modifiés

- `web/src/lib/atelier-bibliotheque-options/cockpit.guard.test.ts`
- `changelog.d/2026-11-17-garde-cockpit-options-legere.md`
- ce handoff

## 5. Validations exécutées

- Banc : 8 tests sur 8, joués trois fois avant et trois fois après le correctif (durées au §3).
- T1 complet : code 0.

## 6. Problèmes ouverts

- D'autres gardes peuvent céder sous la charge du contrôle de fusion. Aucun relevé des tests les plus lents n'existe ; à inscrire si l'intégrateur en signale d'autres.
- Lots `pret` de la file D : `synthese-valider-annoter-conditionnels` (ordre 89), puis la suite de la partie 5 d'`autonomie-pieges-restes`.

## 7. Prochaine action exacte

1. Commit, push, PR (`--body-file`), `wn-attendre-ci` en fond, puis la preuve PR-Agent.
2. Verdicts, puis « prête @<sha> » sur la PR et au registre.

## 8. Interdits encore actifs

- Pas d'allongement du délai à la place de la cause, et pas de `retries`.
- Rien de `web/src/lib/clinical/`, aucune migration, pas de `prisma format`.
- Horodater en lisant l'heure système, jamais à l'estime.
