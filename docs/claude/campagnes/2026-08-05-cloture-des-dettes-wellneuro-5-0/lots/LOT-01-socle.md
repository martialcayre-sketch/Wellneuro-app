---
id: "LOT-01"
titre: "Vue de vérité générée — état réel du dépôt"
statut: "à_faire"
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
| Flags actifs | `WN_ENABLE_*` dans `web/src` + valeurs de production |
| Migrations | `_prisma_migrations` agrégé par nom (MCP Supabase, lecture seule) |
| Certification | registre des questionnaires |
| PR ouvertes | API GitHub |
| Branches et worktrees | `git worktree list`, `git branch -r` |
| Parcours patient | routes présentes sous `web/src/app` |

La sortie est comparée à `.wn/state.json` ; un écart est **signalé**, jamais
corrigé en silence.

## Périmètre

- Écrire le script de génération.
- Découper `next_action` : ce qui est clos part dans l'historique, ce qui est en
  vol reste, avec une date.
- Purger les entrées `git` mortes de `.wn/state.json`.
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

- [ ] Inventorier les sources de vérité et leur coût de lecture.
- [ ] Écrire le script, sortie JSON + rendu lisible.
- [ ] Comparer à `.wn/state.json` et lister les écarts constatés ce jour.
- [ ] Nettoyer `next_action` et les entrées `git` mortes.
- [ ] T1 puis T2.

## Tests

- Test unitaire du script sur un état figé (fixtures), pas sur la production.
- Vérifier que le script **échoue proprement** sans accès réseau, plutôt que de
  rendre un état partiel présenté comme complet.

## Critères de done

- [ ] Le script tourne et rend un état non vide.
- [ ] Les écarts du 2026-08-05 sont listés et soldés.
- [ ] `.wn/state.json` ne contient plus de branche de worktree morte.
- [ ] La frontière généré / humain est écrite.

## Résultats

À compléter à la clôture.
