---
id: "LOT-10"
statut: "à_faire"
dépend_de: "— (aucune)"
---

# LOT-10 — Les ancres cessent de dériver, et le classificateur E2E cesse de se taire

> Lot **créé le 2026-08-23** ([[D-098]]), à partir de deux défauts que la
> livraison du LOT-09 a produits ou révélés — pas de deux idées d'amélioration.

## But

À la fin de ce lot, **une citation de la doctrine reste lisible quand le
fichier cité bouge**, et un contrôle le vérifie sans faire d'arithmétique de
ligne. Et `wn-diagnostic-e2e.mjs` **parle** dans le cas qu'il existe pour
nommer, au lieu de se taire sur un prédicat que Playwright ne remplit pas
toujours.

## État de départ, mesuré le 2026-08-23

- **247 citations** `fichier:ligne` dans `docs/claude/doctrine/` et
  `docs/DECISIONS.md`. Le contrôle qu'on écrirait spontanément — fichier
  existe, ligne dans les bornes — rend **0 introuvable et 2 hors bornes**
  (`DECISIONS.md:4125`, `seed.ts:288` et `:270` sur un fichier de 251 lignes).
- **Ce contrôle-là n'aurait servi à rien** : les **huit** citations faussées
  par le LOT-09 étaient toutes **dans les bornes**. Il garde contre la
  suppression d'un fichier, jamais contre le mode de défaillance réel.
- Sur les **12 citations à verbatim accolé** (les seules vérifiables sans
  ambiguïté) : 8 justes, 2 faux positifs du détecteur de mesure (`D-097` cite
  avec `[…]` et du gras), **2 réellement mortes** —
  `drapeauxAnamnese.ts:28` cite « Difficultés à avaler » qui n'est plus nulle
  part dans ce fichier, et `orientationEngine.ts:769` cite `Q_GAS_01`, présent
  aux lignes 283, 479 et 966.
- `scripts/wn-diagnostic-e2e.mjs` exige **deux** prédicats : journal réseau
  vide **et** `page.goto` dans `error-context.md`. Au LOT-09, Playwright n'y
  avait écrit que le timeout de *teardown* : le script s'est tu alors que la
  trace portait le fait décisif (`0-trace.network` à 0 octet).

## Périmètre

1. **Convention d'ancre** dans `docs/claude/doctrine/` : une citation porte un
   **verbatim exact** ou un **nom de symbole**, le numéro de ligne devenant une
   commodité et non l'ancre. Écrite là où les conventions du corpus vivent, pas
   dans une note de lot.
2. **Un contrôle sans arithmétique de ligne** : le texte cité existe-t-il dans
   le fichier cité ? Décidable, sans faux positif, immunisé à la dérive.
   Périmètre : les citations conformes à la convention. **Pas de réécriture des
   247** — convention appliquée au neuf et à ce qu'un lot touche.
3. **Les deux citations mortes corrigées**, elles, tout de suite.
4. **Le classificateur** : `page.goto` cède la place à `timeout`. Le journal
   réseau vide reste le fait discriminant — un défaut applicatif émet des
   requêtes. Plus un cas de non-régression sur la forme rencontrée au LOT-09.

## Interdits

- **Aucune réécriture de masse des 247 citations** : le bénéfice ne paie pas la
  revue, et un diff de 247 lignes de doc noierait le contrôle qui l'accompagne.
- **Ne pas transformer le contrôle en garde bloquante sur l'existant** : les
  citations d'avant la convention sont **grandfathered**, et le disent.
- **Ne pas ajouter de `retries` Playwright** ni toucher au code de sortie du
  harnais : le classificateur *nomme* un rouge, il ne le blanchit pas
  (`wn-test-worktree.sh` sort en `1` quoi qu'il arrive, et c'est voulu).
- Aucune règle clinique, aucun seuil : ce lot est de l'outillage.

## Dépendances

Aucune, dans les deux sens.

## Étapes

1. Écrire la convention d'ancre à sa place canonique.
2. Poser le contrôle ; le voir **rouge** sur une citation dont le verbatim a
   été altéré, vert sur le corpus conforme.
3. Corriger les deux citations mortes et les deux hors bornes.
4. Relaxer le prédicat du classificateur ; cas de non-régression **construit
   sur l'artefact réel du LOT-09** (`error-context.md` sans `page.goto`,
   journal réseau vide) — pas sur un cas fabriqué.
5. T2 (le diff touche `scripts/`), revue `/code-review medium` — classe
   outillage, pas clinique.
6. Fragment `changelog.d/`.

## Tests

- Contrôle d'ancres : vu rouge sur un verbatim altéré, vert sur le corpus.
- Classificateur : le cas du LOT-09 doit être **classé**, là où il était tu.
- **Limite à écrire, pas à masquer** : le contrôle prouve que le texte cité
  existe dans le fichier cité, jamais qu'il s'y trouve à la ligne annoncée. Le
  numéro reste une commodité non gardée — c'est le choix du lot, pas un oubli.

## Critères de done

- [ ] Convention d'ancre écrite à sa place canonique.
- [ ] Contrôle sans arithmétique de ligne, vu rouge puis vert.
- [ ] Les 2 citations mortes et les 2 hors bornes corrigées.
- [ ] Classificateur relaxé, cas de non-régression sur l'artefact réel.
- [ ] Les 247 citations existantes **non réécrites**, et le contrôle le dit.
- [ ] T2 vert, `/code-review medium`, fragment `changelog.d/`.
