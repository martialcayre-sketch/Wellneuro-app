# 2026-08-05 13:30 — LOT-01 : vue de vérité générée depuis le code

Campagne `2026-08-05-cloture-des-dettes-wellneuro-5-0`, lot LOT-01.
Branche `worktree-lot01-vue-verite`. Statut : **code prêt, une réserve nommée
pour la suite**.

## Où en est le lot

`.wn/state.json` mentait sur trois points : `git.branch` pointait un worktree
mort depuis des semaines, `git.dirty` était figé, `validation.last_checked_at`
datait de deux semaines. `scripts/wn-etat-reel.mjs` observe six dimensions du
dépôt, les compare à `.wn/state.json`, et signale les écarts — il n'écrit jamais
rien. `node scripts/wn-cycle.mjs --appliquer`, déjà existant, reste le seul
réparateur.

T1 (182/182) et T2 verts, à l'exception d'un flaky pré-existant sans lien avec ce
lot (`portail-lien-magique.spec.ts:48`, comparaison de latence sensible à la
charge locale, déjà documenté comme vert en CI).

## Deux choses apprises en écrivant ce lot, à ne pas reproduire

### 1. `--appliquer` ne se joue jamais en cours de lot

`wn-cycle.mjs` traite `branche === 'main'` comme sa propre phase (`hors-lot`) :
il est conçu pour être rejoué **depuis `main`**, après merge. Le lancer depuis
une branche de travail écrit le nom de *cette* branche dans `git.branch` — qui
redevient morte au premier squash-merge (doctrine de ce dépôt : merge + suppression
de branche en un geste). C'est très probablement l'origine du bug que ce lot
ferme : quelqu'un a lancé `--appliquer` en cours de lot, jamais rejoué depuis
`main` après coup.

**Geste qui reste à faire** : après le merge de cette PR, depuis `main` :

```bash
node scripts/wn-cycle.mjs --appliquer
```

Sans lui, `.wn/state.json` reste avec `git.branch: "worktree-signature-table-orientation"`
indéfiniment. C'est écrit en tête de `next_action`.

### 2. Un pointeur de campagne oublié à chaque clôture de lot

`active_campaign`/`active_lot` de `.wn/state.json` étaient `null`/`idle` alors
qu'une campagne tourne. La commande sanctionnée
(`node scripts/wn-campaign.mjs activate <id>`) dérive `active_lot` depuis
`lot_courant` du front matter de `CAMPAGNE.md` — resté sur `LOT-00` après son
merge. **La clôture d'un lot doit avancer ce pointeur** ; ce n'était fait nulle
part dans le rituel de clôture existant. Corrigé pour ce lot (`CAMPAGNE.md`
avancé à `LOT-01`) ; à répéter à la clôture de LOT-01 lui-même.

## Ce que la revue adversariale a trouvé — trois bloquants, tous fermés et re-vérifiés

1. **Faux « 0 écart » en code 0 selon le cwd.** Le script résolvait sa racine
   par `process.cwd()` ; lancé depuis `web/` — le cwd par défaut de toute
   session sur ce dépôt (`cd web && npm run dev`) — `.wn/` n'existait plus,
   et le rapport se taisait sur tout. Grave : `LOT-07-cloture.md` fait de
   « aucun écart signalé » un critère de clôture de **campagne**. Corrigé par
   dérivation depuis `import.meta.url`, même pattern que `wn-cycle.mjs`.
   Reproduit et confirmé indépendamment avant et après correction.
2. **Mauvais registre de certification.** Le script lisait
   `source_registry.json` (507 sources bibliographiques) en affirmant à tort
   que le bon chemin n'existait pas. Le vrai registre,
   `docs/claude/corpus/instrument_registry.json` (65 questionnaires), est
   désigné source de vérité par `AUDIT_64_64.md`.
3. **Le banc ne tournait dans aucun palier.** Absent de `bancs-outillage-check`
   (`web/package.json`) et du CI — ses deux gardes de sûreté (aucune écriture,
   aucune connexion base) étaient inertes.

Quatre correctifs additionnels : flags dits « actifs » sans lecture d'aucune
valeur d'environnement (`WN_ENABLE_ORIENTATION_NNPP2` était déclaré actif alors
qu'il est fail-closed en production) ; une note opérationnelle perdue pendant le
trim de `next_action`, restaurée dans `web/e2e/README.md` ; le geste post-merge
absent de `next_action` ; la garde textuelle du banc élargie (`writeMachineState`
était importable sans être détecté).

## Ce qui reste ouvert

- **`comparerEtat` ne confronte que 3 des 6 dimensions collectées.** PR
  ouvertes, worktrees et parcours patient sont rapportés mais jamais comparés à
  `parallel_campaigns` ni à rien. Au moment de la revue, `ACTIVE_CAMPAIGN.md`
  affirmait « aucune campagne parallèle » alors que plusieurs worktrees actifs
  et PR ouvertes en attestaient le contraire — l'outil ne pouvait pas le voir.
- **`validation.last_checked_at` reste signalé périmé sans qu'aucun outil ne le
  rafraîchisse.** Ni `--appliquer` ni `activate` ne touchent ce champ. LOT-07
  exige « zéro écart » pour clôturer la campagne — ce champ restera faux tant
  qu'aucun outil n'apprend à l'écrire après un palier.
- **`branche_campagne` de `CAMPAGNE.md`** déclare toujours un modèle de branche
  d'intégration (`campaign/.../integration`) que ni LOT-00 ni ce lot n'ont suivi
  — les deux ont mergé direct sur `main`. Signalé, non résolu : cosmétique selon
  la revue (aucun script ne consomme ce champ pour décider quoi que ce soit).

## Après le merge

1. `node scripts/wn-cycle.mjs --appliquer` depuis `main`.
2. Vérifier `.wn/state.json` : `git.branch` doit désormais dire `main`,
   `dirty: false`.
