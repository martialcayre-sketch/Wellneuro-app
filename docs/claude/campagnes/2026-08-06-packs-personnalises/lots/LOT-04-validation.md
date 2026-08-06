---
id: "LOT-04"
titre: "Clôture — E2E, changelog, vérification prod, reprise des dettes"
statut: "à_faire"
dépend_de: "LOT-03"
---

# LOT-04 — Clôture de campagne

## But

Rendre un verdict sur pièces : les quatre faits du « Résultat observable » de
`CAMPAGNE.md` sont vérifiés, le parcours complet est couvert par E2E, et
l'activité primaire redevient la campagne dettes 5.0 (LOT-06), conformément à
l'arbitrage du 2026-08-06.

## Résultat observable

- Les quatre faits de campagne vérifiés, chacun avec sa preuve (lecture SQL,
  banc, E2E, log).
- Fragment `changelog.d/` de clôture posé (celui du LOT-02 couvre la partie
  clinique).
- Handoff de campagne écrit (`docs/claude/handoffs/`), **avant** la PR de
  clôture, jamais après le merge.
- État machine basculé : dettes 5.0 primaire (LOT-06), campagne packs close.

## Périmètre

- T3 complet (`npm run test:worktree`) avec le parcours
  orientation → file d'envoi → envoi → déduplication.
- Vérifications production par lecture seule.
- `docs/claude/campagnes/2026-08-06-packs-personnalises/` : statuts finaux.
- `node scripts/wn-campaign.mjs activate 2026-08-05-cloture-des-dettes-wellneuro-5-0 --lot LOT-06`
  puis `sync`, et `wn-cycle.mjs --appliquer` depuis `main` après merge.

## Hors périmètre

- Tout nouveau développement — un manque découvert ici devient un lot nommé,
  pas une extension de ce lot.

## Fichiers probables

- `web/e2e/` (parcours praticien orientation → file)
- `changelog.d/`, `docs/claude/handoffs/`
- `.wn/state.json`, `docs/claude/campagnes/ACTIVE_CAMPAIGN.md` (via scripts)

## Interdits

- Pas de secret.
- Pas de donnée patient réelle.
- Pas de migration ou écriture Supabase.
- Pas de refactor hors lot.

## Étapes

- [ ] Rejouer T3 et lire le résultat depuis le fichier de sortie.
- [ ] Vérifier les quatre faits de campagne, preuve par preuve.
- [ ] Statuts de lots et de campagne mis à jour (« clos »).
- [ ] Handoff écrit sur la branche vivante, puis PR de clôture.
- [ ] Après merge : bascule d'activité vers dettes LOT-06 et resynchronisation
      de l'état machine depuis `main`.

## Tests

- T3 complet (E2E inclus — une suite Vitest verte ne prouve rien sur les
  parcours) ; **seul le CI rend verdict si une session voisine tourne**.

## Critères de done

- CI vert lu ; campagne close ; dettes 5.0 redevenue primaire ; aucun écart
  `wn-etat-reel.mjs` sur les dimensions comparées.

## Résultats

À compléter à la clôture.
