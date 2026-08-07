# Handoff — 2026-08-07 — Clôture de session : le « main divergent » n'existait pas

## Branche et état Git

- Écrit depuis `origin/main` (`19d50ba`), après suppression de la branche de
  travail — sa PR (#613) était mergée et son contenu vérifié identique à `main`.
- Journal seul. Aucun code, aucune configuration.

## Ce qui a été livré dans la journée

| PR | Objet |
|---|---|
| #607 | Clôture opposable (`/wn-pr`, `/wn-merge`), sync `origin` dans `wn-cycle`, `.wn/state.json` atomique, retrait des skills `wn-r0..r6` |
| #609 | `CLAUDE.md` 26 722 → 19 586 o (−26,7 %) ; gouvernance PR/merge sortie dans `docs/claude/REGLES_PR_MERGE.md` |
| #610 | Handoff de clôture ; diagnostic du `verify` fantôme |
| #612 | Le pointage ne stocke plus ce qui se recalcule (bloc `git` retiré, `next_action` fusionnable, écriture unifiée) |
| #613 | Tri éditorial de `next_action` (−37 %), frontière rapporter/réparer écrite |

## La découverte qui clôt le dossier « main divergent »

Signalé toute la journée comme un arbitrage humain en attente, le « `main` local
ahead 50 / behind 51 » **n'est pas une divergence**. Établi sur pièces :

- Les 50 commits « en avance » sont **50 sur 50 des squash de PR** (#459 → #518),
  aucun ne porte de travail local — vérifié par motif `(#NNN)` sur chaque sujet.
- Le sommet, `2ddeb52`, est le squash de la **PR #518, mergée le 2026-08-01 à
  22:04** (lecture GitHub). Ce contenu est sur `main` depuis une semaine.
- Le clone est **superficiel** : `git rev-parse --is-shallow-repository` → `true`,
  `.git/shallow` porte 2 points de troncature. Les deux histoires étant coupées
  à des endroits différents, git **ne peut pas** calculer de base commune — d'où
  le « no merge base », les 65 671 suppressions apparentes du diff, et le
  compte ahead/behind trompeur.

**Conclusion : rien à arbitrer, aucun travail en danger.** Le `main` local est
simplement gelé au 2026-08-02.

## Le défaut que cela révèle dans le garde du LOT-B

L'avertissement de synchronisation ajouté par #607 compare `main` à
`origin/main` sans vérifier si le clone est superficiel. Sur ce conteneur — et
sur tout clone superficiel — il **criera à la divergence quel que soit l'état
réel**. Un garde qui crie toujours cesse d'être lu.

Correctif à porter par un lot nommé : lire `git rev-parse --is-shallow-repository`
et, si `true`, rendre « écart non calculable (clone superficiel) » au lieu d'un
compte ahead/behind. Non fait ici : hors du périmètre d'une clôture.

## Problèmes ouverts

- Le garde de sync ci-dessus.
- `wn-attendre-ci.mjs` ne propose pas de remède pour « aucun run créé ».
- Le découpage de `next_action` devra se refaire quand il aura regrossi : c'est
  un geste récurrent, pas un correctif définitif.
- **En attente d'arbitrage praticien** : PR #372 (finir ou fermer) ; campagnes
  `2026-07-11-complements-clean-label-v1` et `2026-07-13-journal-alimentaire-21j-v1`
  (figées, périmètres repris ailleurs) ; `boucle-clinique-producteur` (vivante
  seulement dans un worktree non mergé).

## Prochaine action exacte

Ouvrir la PR de cette clôture, lire `verify`, merger — en attendant la fin de la
revue Copilot, qui a rendu trois remarques fondées aujourd'hui.

## Interdits encore actifs

- Ne pas réintroduire de champ recalculable dans `.wn/state.json`.
- Ne pas réécrire une entrée datée de `SESSION_LOG.md` : le journal est
  append-only, une correction se pose dans l'entrée suivante.
