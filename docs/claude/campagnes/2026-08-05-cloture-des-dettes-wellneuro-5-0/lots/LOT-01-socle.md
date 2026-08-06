---
id: "LOT-01"
titre: "Vue de vérité générée — état réel du dépôt"
statut: "livré (#575, 2026-08-05) — comparaison des 3 dimensions restantes en réserve"
dépend_de: "aucun"
---

# LOT-01 — Vue de vérité générée depuis le code

## But

Remplacer l'état maintenu à la main par un état **dérivé**. Aujourd'hui
`.wn/state.json` porte `git.branch = "worktree-signature-table-orientation"`
(worktree mort), `dirty: true`, une validation datée du 2026-07-23, et un
`next_action` de plusieurs milliers de caractères où décisions closes et actions
en vol sont mêlées. Le dépôt sait protéger ses fichiers ; il ne sait pas dire ce
qui est vrai.

C'est le lot qui conditionne les autres : sans lui, chaque lot suivant rouvre le
débat sur l'état réel au lieu de le lire.

## Résultat observable

`node scripts/wn-etat-reel.mjs` produit, sans intervention humaine :

| Dimension | Source lue |
|---|---|
| Flags référencés | `WN_*` dans `web/src` (référence dans le code seulement — aucune valeur d'environnement lue, jamais présentée comme « active ») |
| Migrations | noms de dossiers sous `web/prisma/migrations/` (disque seul — **jamais** de connexion base ; `verifieEnBase: null` + la requête `CLAUDE.md` à rejouer en session via MCP Supabase) |
| Certification | `docs/claude/corpus/instrument_registry.json` (65 instruments, source de vérité désignée par `AUDIT_64_64.md`) |
| PR ouvertes | `gh pr list` |
| Branches et worktrees | `git worktree list`, `git branch -r` |
| Parcours patient | routes présentes sous `web/src/app` |

La sortie est comparée à `.wn/state.json` ; un écart est **signalé**, jamais
corrigé en silence.

## Périmètre

- Écrire le script de génération.
- Découper `next_action` : ce qui est clos part dans l'historique, ce qui est en
  vol reste, avec une date.
- Purger les entrées `git` mortes de `.wn/state.json`.
  > Reporté au geste post-merge (`node scripts/wn-cycle.mjs --appliquer`, joué
  > depuis `main`), pas fait dans ce lot : le lancer en cours de lot réécrirait
  > `git.branch` avec le nom de CETTE branche, qui redeviendra morte après le
  > squash-merge — exactement le défaut qu'il vient de corriger, recréé par le
  > geste censé le réparer. Piège documenté dans
  > `docs/claude/PROJET_CONTEXTE.md`.
- Documenter la frontière : ce que le script génère / ce qui reste humain
  (arbitrages, décisions cliniques).

## Hors périmètre

- Toute écriture en base.
- Refonte du format `.wn/state.json` (`schema_version` reste 2).
- Réécriture des handoffs passés — ils sont datés, donc justes à leur date.

## Fichiers probables

- `scripts/wn-etat-reel.mjs` (nouveau)
- `.wn/state.json`, `.wn/schemas/`
- `docs/claude/PROJET_CONTEXTE.md`
- `changelog.d/2026-08-05-vue-de-verite-generee.md`

## Interdits

- Aucune écriture Supabase — lectures `execute_sql` seules.
- Pas de secret en dur (jeton GitHub par variable d'environnement).
- Ne pas éditer `docs/claude/campagnes/ACTIVE_CAMPAIGN.md` à la main.
- Pas de refactor hors lot.

## Étapes

- [x] Inventorier les sources de vérité et leur coût de lecture.
- [x] Écrire le script, sortie JSON + rendu lisible.
- [x] Comparer à `.wn/state.json` et lister les écarts constatés ce jour.
- [x] Nettoyer `next_action` (entrées `git` : voir note de périmètre ci-dessus).
- [x] T1 puis T2.

## Tests

- Test unitaire du script sur un état figé (fixtures), pas sur la production.
- Vérifier que le script **échoue proprement** sans accès réseau, plutôt que de
  rendre un état partiel présenté comme complet.

## Critères de done

- [x] Le script tourne et rend un état non vide, **indépendamment du cwd d'appel**
      (régression trouvée et fermée en revue — voir Résultats).
- [x] Les écarts du 2026-08-05 sont listés : `git.branch` mort, `git.dirty`
      périmé, `validation.last_checked_at` périmé (13 jours).
- [ ] `.wn/state.json` ne contient plus de branche de worktree morte.
  > Non coché à dessein : reporté au geste post-merge (`--appliquer` depuis
  > `main`), même raison que la note du Périmètre ci-dessus — le jouer en cours
  > de lot recréerait le défaut qu'il corrige. Rappel posé en tête de
  > `next_action`.
- [x] La frontière généré / humain est écrite (`docs/claude/PROJET_CONTEXTE.md`).

## Résultats

**Livré, code prêt.** `scripts/wn-etat-reel.mjs` observe six dimensions et
compare trois d'entre elles à `.wn/state.json` (`git.branch`, `git.dirty`,
`validation.last_checked_at`) ; les trois autres (PR ouvertes, worktrees,
parcours patient) sont rapportées mais pas encore confrontées à quoi que ce
soit — réserve ouverte, voir plus bas. N'écrit jamais de fichier, n'ouvre
jamais de connexion base : les migrations sont lues sur disque, avec
`verifieEnBase: null` et la requête `CLAUDE.md` à rejouer en session.

**Revue adversariale (`wn-reviewer`) : NO-GO puis correctifs vérifiés.** Trois
bloquants, tous reproduits indépendamment avant et après correction :

1. Le script rendait un **faux « 0 écart » en code 0** quand il était lancé
   depuis `web/` — le cwd par défaut de toute session sur ce dépôt — parce
   qu'il résolvait sa racine par `process.cwd()`. Corrigé par dérivation depuis
   `import.meta.url` (même pattern que `wn-cycle.mjs`). Grave parce que ce lot
   est cité comme critère de clôture de campagne dans `LOT-07-cloture.md` :
   une session qui l'aurait lancé depuis `web/` aurait clôturé sur un mensonge
   produit par l'outil censé dire le vrai.
2. Le champ « certification » lisait `docs/claude/corpus/source_registry.json`
   (507 sources bibliographiques) au lieu de `instrument_registry.json`
   (65 questionnaires, désigné source de vérité par `AUDIT_64_64.md`) — avec un
   commentaire affirmant à tort que le bon chemin n'existait pas.
3. Le banc (`wn-etat-reel.test.mjs`) ne tournait dans aucun palier — absent de
   `bancs-outillage-check` (`web/package.json`) et du CI — donc ses deux gardes
   de sûreté (aucune écriture, aucune connexion base) étaient inertes.

Quatre correctifs supplémentaires dans la même passe : les flags dits
« actifs » sans qu'aucune valeur d'environnement ne soit lue (renommé
`referencesDansLeCode` / `valeurEnvironnement: null`, motif élargi de
`WN_ENABLE_` à `WN_[A-Z0-9_]+`, 2 → 20 flags trouvés) ; une note opérationnelle
(« purger `web/.next` si `fiche-trajectoire:12` timeout ») disparue du dépôt
pendant le trim de `next_action`, restaurée dans `web/e2e/README.md` ; le geste
post-merge écrit en tête de `next_action` plutôt que nulle part ; la garde
textuelle du banc élargie à `writeMachineState`/`psql`/`supabase`, qu'un import
futur aurait pu ajouter sans être détecté.

**Découverte de conception, au-delà du périmètre initial.**
`node scripts/wn-cycle.mjs --appliquer` traite `branche === 'main'` comme sa
propre phase (`hors-lot`) : il est conçu pour être rejoué **depuis `main`**.
Lancé en cours de lot, il écrit le nom de la branche courante dans
`git.branch` — qui redevient morte au premier squash-merge, recréant
exactement le défaut qu'il corrige. C'est vraisemblablement l'origine du bug
initial. Documenté dans `docs/claude/PROJET_CONTEXTE.md`, rappelé en tête de
`next_action`.

**Second débordement, découvert en exécutant.** `active_campaign`/`active_lot`
étaient aussi faux (`null`/`idle`). La commande existante
`node scripts/wn-campaign.mjs activate <id>` dérive `active_lot` depuis
`lot_courant` du front matter de `CAMPAGNE.md` — resté sur `LOT-00` après son
merge. La clôture d'un lot doit donc avancer ce pointeur ; ça n'avait pas été
fait. Corrigé ici (`CAMPAGNE.md` : `statut`, `lot_courant`, `branche_lot_courant`,
`cible_pr_lot`, table des lots).

**Réserve ouverte, nommée par la revue, non fermée dans ce lot** :
`comparerEtat` ne confronte que 3 des 6 dimensions collectées. Les 3 autres
(PR ouvertes, worktrees, parcours patient) sont rapportées mais jamais
comparées à `parallel_campaigns` ni à rien d'autre — `ACTIVE_CAMPAIGN.md`
affirmait « aucune campagne parallèle » alors que plusieurs worktrees actifs
et PR ouvertes en attestaient le contraire au moment de la revue, sans que
l'outil puisse le voir. À reprendre dans un lot ultérieur.

**Validation.** T2 vert (`npm run test:worktree -- --fast`, 5 min, séquence
complète y compris E2E), à l'exception de 2 échecs
`portail-lien-magique.spec.ts:48` (comparaison de latence entre email connu et
inconnu, sensible à la charge locale) — flaky pré-existant, déjà documenté dans
`next_action` (« vert en CI »), sans lien avec ce lot (aucun fichier
`web/src/app/**/portail/lien/**` touché). T1 (`npm run check`, 182/182)
également vert après correctifs.
